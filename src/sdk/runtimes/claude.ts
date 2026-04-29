/**
 * Claude runtime adapter.
 *
 * This module is the only place where Warden's runtime layer should know about
 * the Claude Agent SDK or Anthropic Messages API. It translates Warden's
 * generic runtime requests into Claude calls, keeps Claude-specific tool policy
 * and process options local, emits Claude/OpenTelemetry spans, and normalizes
 * Claude result messages into the shared runtime result.
 *
 * Important invariants:
 * - Claude receives read-only tools for hunk analysis.
 * - SDK errors remain classifiable by downstream retry/auth logic.
 * - Runtime results always contain valid `UsageStats`.
 * - Claude-specific result subtypes normalize to Warden-owned statuses.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { query, type SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import { Sentry } from '../../sentry.js';
import { callHaiku, callHaikuWithTools } from '../haiku.js';
import { emptyUsage, extractUsage } from '../usage.js';
import type {
  AuxiliaryRunRequest,
  AuxiliaryRunResult,
  AuxiliaryTool,
  Runtime,
  SkillRunRequest,
  SkillRunResponse,
  SkillRunResult,
  SkillRunStatus,
} from './types.js';

/** Buffered data for a single SDK turn, flushed into gen_ai.chat child spans. */
interface TurnData {
  toolUses: { id: string; name: string }[];
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  model: string;
}

interface ClaudeProviderOptions {
  pathToClaudeCodeExecutable?: string;
}

function getClaudeProviderOptions(providerOptions: unknown): ClaudeProviderOptions {
  if (!providerOptions || typeof providerOptions !== 'object') {
    return {};
  }

  const { pathToClaudeCodeExecutable } = providerOptions as { pathToClaudeCodeExecutable?: unknown };
  return {
    pathToClaudeCodeExecutable: typeof pathToClaudeCodeExecutable === 'string'
      ? pathToClaudeCodeExecutable
      : undefined,
  };
}

function missingApiKeyResult<T>(): AuxiliaryRunResult<T> {
  return {
    success: false,
    error: 'Anthropic API key required for Claude auxiliary runtime',
    usage: emptyUsage(),
  };
}

function toAnthropicTool(tool: AuxiliaryTool): Anthropic.Tool {
  return {
    name: tool.name,
    description: tool.description ?? '',
    input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
  };
}

function singleResponseModel(modelUsage: SDKResultMessage['modelUsage'] | undefined): string | undefined {
  const models = Object.keys(modelUsage ?? {});
  return models.length === 1 ? models[0] : undefined;
}

function statusFromClaudeSubtype(subtype: SDKResultMessage['subtype']): SkillRunStatus {
  switch (subtype) {
    case 'success':
      return 'success';
    case 'error_max_turns':
      return 'turn_limit';
    case 'error_max_budget_usd':
      return 'budget_limit';
    case 'error_max_structured_output_retries':
      return 'structured_output_error';
    case 'error_during_execution':
      return 'provider_error';
    default:
      return 'provider_error';
  }
}

function normalizeResult(result: SDKResultMessage): SkillRunResult {
  const errors = 'errors' in result ? result.errors : [];
  return {
    status: statusFromClaudeSubtype(result.subtype),
    text: result.subtype === 'success' ? result.result : '',
    errors,
    usage: extractUsage(result),
    responseId: result.uuid,
    responseModel: singleResponseModel(result.modelUsage),
    sessionId: result.session_id,
    durationMs: result.duration_ms,
    durationApiMs: result.duration_api_ms,
    numTurns: result.num_turns,
  };
}

function appendClaudeStderr(error: unknown, stderr: string): unknown {
  const originalMessage = error instanceof Error ? error.message : String(error);
  const message = `${originalMessage}\nClaude Code stderr: ${stderr}`;

  if (error instanceof Error) {
    try {
      error.message = message;
      (error as Error & { claudeStderr?: string }).claudeStderr = stderr;
      return error;
    } catch {
      const enhancedError = new Error(message);
      enhancedError.cause = error;
      return enhancedError;
    }
  }

  return new Error(message);
}

export const claudeRuntime: Runtime = {
  name: 'claude',

  async runSkill(request: SkillRunRequest): Promise<SkillRunResponse> {
    const { systemPrompt, userPrompt, repoPath, options, skillName, providerOptions } = request;
    const { maxTurns = 50, model, abortController } = options;
    const { pathToClaudeCodeExecutable } = getClaudeProviderOptions(providerOptions);
    const modelId = model ?? 'unknown';

    return Sentry.startSpan(
      {
        op: 'gen_ai.invoke_agent',
        name: `invoke_agent ${skillName}`,
        attributes: {
          'gen_ai.operation.name': 'invoke_agent',
          'gen_ai.provider.name': 'anthropic',
          'gen_ai.agent.name': skillName,
          'gen_ai.request.model': modelId,
          'warden.request.max_turns': maxTurns,
        },
      },
      async (span) => {
        span.setAttribute('gen_ai.request.messages', JSON.stringify([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ]));

        const stderrChunks: string[] = [];

        const stream = query({
          prompt: userPrompt,
          options: {
            maxTurns,
            cwd: repoPath,
            systemPrompt,
            // Only allow read-only tools - context is already provided in the prompt.
            allowedTools: ['Read', 'Grep', 'Glob'],
            // Explicitly block modification/side-effect tools as defense-in-depth.
            disallowedTools: ['Write', 'Edit', 'Bash', 'WebFetch', 'WebSearch', 'Task', 'TodoWrite'],
            permissionMode: 'bypassPermissions',
            // Prevent SDK from writing session .jsonl files and polluting Claude Code's session index.
            persistSession: false,
            model,
            abortController,
            pathToClaudeCodeExecutable,
            stderr: (data: string) => {
              stderrChunks.push(data);
            },
          },
        });

        let resultMessage: SDKResultMessage | undefined;
        let authError: string | undefined;

        // Per-turn tracing: buffer assistant messages and tool progress to create
        // child spans (gen_ai.chat + gen_ai.execute_tool) under the invoke_agent span.
        let turnCount = 0;
        let pendingTurn: TurnData | null = null;
        const pendingToolProgress = new Map<string, number>();

        function flushPendingTurn(): void {
          if (!pendingTurn) return;
          turnCount++;
          const turn = pendingTurn;
          const toolProgress = new Map(pendingToolProgress);
          pendingTurn = null;
          pendingToolProgress.clear();

          try {
            const totalInput = turn.inputTokens + turn.cacheRead + turn.cacheWrite;

            Sentry.startSpan(
              {
                op: 'gen_ai.chat',
                name: `chat ${skillName} turn ${turnCount}`,
                attributes: {
                  'gen_ai.operation.name': 'chat',
                  'gen_ai.provider.name': 'anthropic',
                  'gen_ai.agent.name': skillName,
                  'gen_ai.request.model': modelId,
                  'gen_ai.response.model': turn.model,
                  'gen_ai.usage.input_tokens': totalInput,
                  'gen_ai.usage.output_tokens': turn.outputTokens,
                  'gen_ai.usage.input_tokens.cached': turn.cacheRead,
                  'gen_ai.usage.input_tokens.cache_write': turn.cacheWrite,
                  'gen_ai.usage.total_tokens': totalInput + turn.outputTokens,
                  'gen_ai.tool_use.count': turn.toolUses.length,
                },
              },
              () => {
                for (const toolUse of turn.toolUses) {
                  const elapsed = toolProgress.get(toolUse.id);
                  Sentry.startSpan(
                    {
                      op: 'gen_ai.execute_tool',
                      name: toolUse.name,
                      attributes: {
                        'gen_ai.tool.name': toolUse.name,
                        ...(elapsed !== undefined && { 'tool.elapsed_seconds': elapsed }),
                      },
                    },
                    () => { /* point-in-time span */ }
                  );
                }
              }
            );
          } catch {
            // Telemetry should never break the workflow.
          }
        }

        try {
          for await (const message of stream) {
            if (message.type === 'assistant') {
              flushPendingTurn();
              const msg = message.message;
              const toolUses = msg.content
                .filter((block): block is typeof block & { type: 'tool_use' } => block.type === 'tool_use')
                .map(({ id, name }) => ({ id, name }));
              pendingTurn = {
                toolUses,
                inputTokens: msg.usage?.input_tokens ?? 0,
                outputTokens: msg.usage?.output_tokens ?? 0,
                cacheRead: msg.usage?.cache_read_input_tokens ?? 0,
                cacheWrite: msg.usage?.cache_creation_input_tokens ?? 0,
                model: msg.model,
              };
            } else if (message.type === 'tool_progress') {
              pendingToolProgress.set(message.tool_use_id, message.elapsed_time_seconds);
            } else if (message.type === 'result') {
              flushPendingTurn();
              resultMessage = message;
            } else if (message.type === 'auth_status' && message.error) {
              authError = message.error;
            }
          }
        } catch (error) {
          const stderr = stderrChunks.join('').trim();
          if (stderr) {
            throw appendClaudeStderr(error, stderr);
          }
          throw error;
        } finally {
          flushPendingTurn();
        }

        if (resultMessage) {
          const usage = resultMessage.usage;
          if (usage) {
            const inputTokens = usage.input_tokens ?? 0;
            const outputTokens = usage.output_tokens ?? 0;
            const cacheRead = usage.cache_read_input_tokens ?? 0;
            const cacheWrite = usage.cache_creation_input_tokens ?? 0;
            const totalInputTokens = inputTokens + cacheRead + cacheWrite;
            span.setAttribute('gen_ai.usage.input_tokens', totalInputTokens);
            span.setAttribute('gen_ai.usage.output_tokens', outputTokens);
            span.setAttribute('gen_ai.usage.input_tokens.cached', cacheRead);
            span.setAttribute('gen_ai.usage.input_tokens.cache_write', cacheWrite);
            span.setAttribute('gen_ai.usage.total_tokens', totalInputTokens + outputTokens);
          }
          if (resultMessage.total_cost_usd !== undefined) {
            span.setAttribute('gen_ai.cost.total_tokens', resultMessage.total_cost_usd);
          }
          if (resultMessage.uuid) {
            span.setAttribute('gen_ai.response.id', resultMessage.uuid);
          }
          if (resultMessage.modelUsage) {
            const responseModel = singleResponseModel(resultMessage.modelUsage);
            if (responseModel) {
              span.setAttribute('gen_ai.response.model', responseModel);
            }
          }

          if (resultMessage.subtype === 'success' && resultMessage.result) {
            span.setAttribute('gen_ai.response.text', JSON.stringify([resultMessage.result]));
          }

          const optionalAttrs: Record<string, string | number | undefined> = {
            'gen_ai.conversation.id': resultMessage.session_id,
            'sdk.duration_ms': resultMessage.duration_ms,
            'sdk.duration_api_ms': resultMessage.duration_api_ms,
            'sdk.num_turns': resultMessage.num_turns,
          };
          for (const [key, value] of Object.entries(optionalAttrs)) {
            if (value !== undefined) {
              span.setAttribute(key, value);
            }
          }
        }

        const stderr = stderrChunks.join('').trim() || undefined;
        return {
          result: resultMessage ? normalizeResult(resultMessage) : undefined,
          authError,
          stderr,
        };
      },
    );
  },

  async runAuxiliary<T>(request: AuxiliaryRunRequest<T>): Promise<AuxiliaryRunResult<T>> {
    if (!request.apiKey) {
      return missingApiKeyResult();
    }

    if (request.tools) {
      return callHaikuWithTools({
        apiKey: request.apiKey,
        prompt: request.prompt,
        schema: request.schema,
        tools: request.tools.map(toAnthropicTool),
        executeTool: request.executeTool,
        model: request.model,
        maxTokens: request.maxTokens,
        maxIterations: request.maxIterations,
        timeout: request.timeout,
        maxRetries: request.maxRetries,
      });
    }

    return callHaiku({
      apiKey: request.apiKey,
      prompt: request.prompt,
      schema: request.schema,
      model: request.model,
      maxTokens: request.maxTokens,
      timeout: request.timeout,
      maxRetries: request.maxRetries,
    });
  },
};
