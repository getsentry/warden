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
 * - Claude receives only read-only tools for hunk analysis.
 * - Mutating tools are available only to trusted internal writer tasks that
 *   opt in at the runtime request boundary.
 * - SDK errors remain classifiable by downstream retry/auth logic.
 * - Runtime results always contain valid `UsageStats`.
 * - Claude-specific result subtypes normalize to Warden-owned statuses.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { query, type EffortLevel, type SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import type { ToolConfig, ToolName } from '../../config/schema.js';
import { Sentry } from '../../sentry.js';
import { callHaiku, callHaikuWithTools } from '../haiku.js';
import {
  setGenAiInputMessagesAttr,
  setGenAiOutputMessagesAttr,
  setGenAiSystemInstructionsAttr,
  setGenAiUsageAttrs,
} from '../otel.js';
import { apiUsageToStats } from '../pricing.js';
import { aggregateUsage, emptyUsage, estimateTokens, extractUsage } from '../usage.js';
import type {
  AuxiliaryRunRequest,
  AuxiliaryRunResult,
  AuxiliaryTask,
  AuxiliaryTool,
  Runtime,
  SynthesisTask,
  SynthesisRunRequest,
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
  cacheWrite5m: number;
  cacheWrite1h: number;
  webSearchRequests: number;
  model: string;
}

interface ClaudeProviderOptions {
  pathToClaudeCodeExecutable?: string;
}

const DEFAULT_READ_ONLY_TOOLS: ToolName[] = ['Read', 'Grep', 'Glob'];
const READ_ONLY_TOOLS: ToolName[] = ['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch'];
const MUTATING_TOOLS = ['Write', 'Edit', 'Bash'] as const;
const CLAUDE_AGENT_TOOLS = ['Task', 'TodoWrite'] as const;

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

function reasoningOptions(reasoningEffort: SkillRunRequest['options']['reasoningEffort']): {
  thinking?: { type: 'adaptive' } | { type: 'disabled' };
  effort?: EffortLevel;
} {
  if (!reasoningEffort) {
    return {};
  }
  if (reasoningEffort === 'off') {
    return { thinking: { type: 'disabled' } };
  }
  return { thinking: { type: 'adaptive' }, effort: reasoningEffort };
}

function missingApiKeyResult<T>(kind: 'auxiliary' | 'synthesis'): AuxiliaryRunResult<T> {
  return {
    success: false,
    error: `Anthropic API key required for Claude ${kind} runtime`,
    usage: emptyUsage(),
  };
}

function resolveClaudeSkillTools(
  tools: ToolConfig | undefined,
  allowMutatingTools = false,
): {
  allowedTools: string[];
  disallowedTools: string[];
} {
  const denied = new Set(tools?.denied ?? []);
  const requested = tools?.allowed ?? DEFAULT_READ_ONLY_TOOLS;
  const availableTools = allowMutatingTools
    ? [...READ_ONLY_TOOLS, ...MUTATING_TOOLS]
    : READ_ONLY_TOOLS;
  const allowedTools = availableTools.filter((tool) => requested.includes(tool) && !denied.has(tool));
  const disallowedAvailableTools = availableTools.filter((tool) => !allowedTools.includes(tool));
  const disallowedMutatingTools = allowMutatingTools ? [] : [...MUTATING_TOOLS];

  return {
    allowedTools,
    disallowedTools: [...disallowedMutatingTools, ...disallowedAvailableTools, ...CLAUDE_AGENT_TOOLS],
  };
}

async function runStructured<T>(
  request: {
    kind: 'auxiliary' | 'synthesis';
    task?: AuxiliaryTask | SynthesisTask;
    agentName?: string;
    apiKey?: string;
    prompt: string;
    schema: SynthesisRunRequest<T>['schema'];
    model?: string;
    maxTokens?: number;
    timeout?: number;
    maxRetries?: number;
    tools?: AuxiliaryTool[];
    executeTool?: (name: string, input: Record<string, unknown>) => Promise<string>;
    maxIterations?: number;
  }
): Promise<AuxiliaryRunResult<T>> {
  if (!request.apiKey) {
    return missingApiKeyResult(request.kind);
  }

  if (request.tools) {
    return callHaikuWithTools({
      apiKey: request.apiKey,
      prompt: request.prompt,
      schema: request.schema,
      tools: request.tools.map(toAnthropicTool),
      executeTool: request.executeTool ?? (async () => ''),
      agentName: request.agentName,
      task: request.task,
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
    agentName: request.agentName,
    task: request.task,
    model: request.model,
    maxTokens: request.maxTokens,
    timeout: request.timeout,
    maxRetries: request.maxRetries,
  });
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

function turnUsageToStats(turn: TurnData) {
  return apiUsageToStats(turn.model, {
    input_tokens: turn.inputTokens,
    output_tokens: turn.outputTokens,
    cache_read_input_tokens: turn.cacheRead,
    cache_creation_input_tokens: turn.cacheWrite,
    cache_creation: {
      ephemeral_5m_input_tokens: turn.cacheWrite5m,
      ephemeral_1h_input_tokens: turn.cacheWrite1h,
    },
    server_tool_use: {
      web_search_requests: turn.webSearchRequests,
    },
  });
}

function reconcileStreamedUsage(args: {
  result: SDKResultMessage;
  streamedUsage?: ReturnType<typeof turnUsageToStats>;
  responseModel?: string;
}): ReturnType<typeof turnUsageToStats> | undefined {
  const { result, streamedUsage, responseModel } = args;
  if (!streamedUsage) {
    return undefined;
  }

  const resultUsage = extractUsage(result);
  const resultTextTokens = result.subtype === 'success'
    ? estimateTokens(result.result.length)
    : 0;
  const outputTokens = Math.max(
    streamedUsage.outputTokens,
    resultUsage.outputTokens,
    resultTextTokens,
  );
  const missingOutputTokens = outputTokens - streamedUsage.outputTokens;
  if (missingOutputTokens <= 0 || !responseModel) {
    return streamedUsage;
  }

  return aggregateUsage([
    streamedUsage,
    apiUsageToStats(responseModel, {
      input_tokens: 0,
      output_tokens: missingOutputTokens,
    }),
  ]);
}

function normalizeResult(
  result: SDKResultMessage,
  usage?: ReturnType<typeof turnUsageToStats>,
  responseModel?: string,
): SkillRunResult {
  const errors = 'errors' in result ? result.errors : [];
  return {
    status: statusFromClaudeSubtype(result.subtype),
    text: result.subtype === 'success' ? result.result : '',
    errors,
    usage: usage ?? extractUsage(result),
    responseId: result.uuid,
    responseModel: responseModel ?? singleResponseModel(result.modelUsage),
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
    const {
      systemPrompt,
      userPrompt,
      repoPath,
      options,
      skillName,
      providerOptions,
      tools,
      allowMutatingTools,
    } = request;
    const { maxTurns = 50, model, reasoningEffort, abortController } = options;
    const { pathToClaudeCodeExecutable } = getClaudeProviderOptions(providerOptions);
    const skillTools = resolveClaudeSkillTools(tools, allowMutatingTools);
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
        setGenAiSystemInstructionsAttr(span, systemPrompt);
        setGenAiInputMessagesAttr(span, [{ role: 'user', content: userPrompt }]);

        const stderrChunks: string[] = [];

        const stream = query({
          prompt: userPrompt,
          options: {
            maxTurns,
            cwd: repoPath,
            systemPrompt,
            // Hunk analysis is read-only; trusted internal writer tasks may opt
            // into mutating tools explicitly at the runtime request boundary.
            allowedTools: skillTools.allowedTools,
            disallowedTools: skillTools.disallowedTools,
            permissionMode: 'bypassPermissions',
            // Prevent SDK from writing session .jsonl files and polluting Claude Code's session index.
            persistSession: false,
            model,
            ...reasoningOptions(reasoningEffort),
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
        const turnUsages: ReturnType<typeof turnUsageToStats>[] = [];
        const responseModels = new Set<string>();
        const pendingToolProgress = new Map<string, number>();

        function flushPendingTurn(): void {
          if (!pendingTurn) return;
          turnCount++;
          const turn = pendingTurn;
          const toolProgress = new Map(pendingToolProgress);
          pendingTurn = null;
          pendingToolProgress.clear();
          turnUsages.push(turnUsageToStats(turn));
          responseModels.add(turn.model);

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
                },
              },
              () => {
                for (const toolUse of turn.toolUses) {
                  const elapsed = toolProgress.get(toolUse.id);
                  const attributes = {
                    'gen_ai.operation.name': 'execute_tool',
                    'gen_ai.agent.name': skillName,
                    'gen_ai.tool.name': toolUse.name,
                  };

                  if (elapsed !== undefined) {
                    const endTime = Date.now() / 1000;
                    const parentSpan = Sentry.getActiveSpan();
                    const span = Sentry.startInactiveSpan({
                      op: 'gen_ai.execute_tool',
                      name: toolUse.name,
                      ...(parentSpan && { parentSpan }),
                      startTime: Math.max(0, endTime - elapsed),
                      attributes,
                    });
                    span.end(endTime);
                  } else {
                    Sentry.startSpan(
                      {
                        op: 'gen_ai.execute_tool',
                        name: toolUse.name,
                        attributes,
                      },
                      () => undefined
                    );
                  }
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
              const cacheWrite5m = msg.usage?.cache_creation?.ephemeral_5m_input_tokens ?? 0;
              const cacheWrite1h = msg.usage?.cache_creation?.ephemeral_1h_input_tokens ?? 0;
              const toolUses = msg.content
                .filter((block): block is typeof block & { type: 'tool_use' } => block.type === 'tool_use')
                .map(({ id, name }) => ({ id, name }));
              pendingTurn = {
                toolUses,
                inputTokens: msg.usage?.input_tokens ?? 0,
                outputTokens: msg.usage?.output_tokens ?? 0,
                cacheRead: msg.usage?.cache_read_input_tokens ?? 0,
                cacheWrite: Math.max(msg.usage?.cache_creation_input_tokens ?? 0, cacheWrite5m + cacheWrite1h),
                cacheWrite5m,
                cacheWrite1h,
                webSearchRequests: msg.usage?.server_tool_use?.web_search_requests ?? 0,
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
            const cacheWrite5m = usage.cache_creation?.ephemeral_5m_input_tokens ?? 0;
            const cacheWrite1h = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
            const cacheWrite = Math.max(usage.cache_creation_input_tokens ?? 0, cacheWrite5m + cacheWrite1h);
            const totalInputTokens = inputTokens + cacheRead + cacheWrite;
            setGenAiUsageAttrs(span, {
              inputTokens: totalInputTokens,
              outputTokens,
              cacheReadInputTokens: cacheRead,
              cacheCreationInputTokens: cacheWrite,
              cacheCreation5mInputTokens: cacheWrite5m,
              cacheCreation1hInputTokens: cacheWrite1h,
              webSearchRequests: usage.server_tool_use?.web_search_requests ?? 0,
              costUSD: resultMessage.total_cost_usd ?? 0,
            });
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
            setGenAiOutputMessagesAttr(span, resultMessage.result);
          } else if (resultMessage.subtype !== 'success') {
            span.setAttribute('error.type', resultMessage.subtype);
          }

          const optionalAttrs: Record<string, string | number | undefined> = {
            'gen_ai.conversation.id': resultMessage.session_id,
            'warden.sdk.duration_ms': resultMessage.duration_ms,
            'warden.sdk.duration_api_ms': resultMessage.duration_api_ms,
            'warden.sdk.num_turns': resultMessage.num_turns,
          };
          for (const [key, value] of Object.entries(optionalAttrs)) {
            if (value !== undefined) {
              span.setAttribute(key, value);
            }
          }
        }

        const stderr = stderrChunks.join('').trim() || undefined;
        const streamedUsage = turnUsages.length > 0 ? aggregateUsage(turnUsages) : undefined;
        const responseModel = responseModels.size === 1 ? [...responseModels][0] : undefined;
        return {
          result: resultMessage
            ? normalizeResult(
              resultMessage,
              reconcileStreamedUsage({
                result: resultMessage,
                streamedUsage,
                responseModel,
              }),
              responseModel,
            )
            : undefined,
          authError,
          stderr,
        };
      },
    );
  },

  async runAuxiliary<T>(request: AuxiliaryRunRequest<T>): Promise<AuxiliaryRunResult<T>> {
    return runStructured({ kind: 'auxiliary', ...request });
  },

  async runSynthesis<T>(request: SynthesisRunRequest<T>): Promise<AuxiliaryRunResult<T>> {
    return runStructured({ kind: 'synthesis', ...request });
  },
};
