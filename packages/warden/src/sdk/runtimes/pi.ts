/**
 * Pi runtime adapter.
 *
 * This keeps Pi-specific session setup, model selection, tool mapping, auth
 * handling, telemetry, and usage normalization behind Warden's runtime
 * contract. Warden still owns prompt construction, finding extraction,
 * verification, deduplication, and reporting.
 */
import {
  AuthStorage,
  DefaultResourceLoader,
  ModelRegistry,
  SessionManager,
  SettingsManager,
  createAgentSession,
  defineTool,
  getAgentDir,
  type AgentSession,
  type AgentSessionEvent,
  type ToolDefinition,
} from '@earendil-works/pi-coding-agent';
import {
  Type,
  type AssistantMessage,
  type Api,
  type Model,
  type TSchema,
  type TextContent,
  type ToolResultMessage,
  type Usage,
} from '@earendil-works/pi-ai';
import type { Span } from '@sentry/node';
import { z } from 'zod';
import type { Effort, ToolConfig, ToolName } from '../../config/schema.js';
import { Sentry } from '../../sentry.js';
import { recordTracedSpan, startInactiveTracedSpan, startTracedSpan, type TraceRecorder } from '../../sentry-trace.js';
import type { UsageStats } from '../../types/index.js';
import { bridgeWardenProviderApiKeyEnv } from '../../utils/index.js';
import { extractJson } from '../haiku.js';
import { isAuthenticationErrorMessage, sanitizeErrorMessage } from '../errors.js';
import {
  type GenAiMessage,
  genAiSpanName,
  genAiToolCallAttributes,
  genAiProviderName,
  genAiUsageAttributes,
  setGenAiInputMessagesAttr,
  setGenAiOutputMessagesAttr,
  setGenAiOutputMessagesAttrFromMessages,
  setGenAiSystemInstructionsAttr,
  setGenAiUsageAttrs,
} from '../otel.js';
import { aggregateUsage, emptyUsage } from '../usage.js';
import { InvalidPiModelSelectorError, isPiModelSelector } from './model-selectors.js';
import type {
  AuxiliaryRunRequest,
  AuxiliaryRunResult,
  AuxiliaryTask,
  AuxiliaryTool,
  Runtime,
  SkillRunRequest,
  SkillRunResponse,
  SkillRunResult,
  SkillRunStatus,
  SynthesisRunRequest,
  SynthesisTask,
} from './types.js';

const READ_ONLY_TOOLS: ToolName[] = ['Read', 'Grep', 'Glob'];
const MUTATING_TOOLS: ToolName[] = ['Write', 'Edit', 'Bash'];
const UNSUPPORTED_TOOLS: ToolName[] = ['WebFetch', 'WebSearch'];
const DEFAULT_PI_PROVIDER_MAX_RETRIES = 2;
const PI_TOOL_NAMES: Record<Exclude<ToolName, 'WebFetch' | 'WebSearch'>, string[]> = {
  Read: ['read'],
  Write: ['write'],
  Edit: ['edit'],
  Bash: ['bash'],
  Glob: ['find', 'ls'],
  Grep: ['grep'],
};

interface PiModelSelector {
  provider: string;
  modelId: string;
}

interface PiPromptResult {
  lastAssistant?: AssistantMessage;
  assistantMessages: AssistantMessage[];
  usage: UsageStats;
  sessionId?: string;
  durationMs: number;
  numTurns: number;
  hitMaxTurns: boolean;
  warnings: string[];
}

interface PiPromptOptions {
  cwd: string;
  systemPrompt: string;
  userPrompt: string;
  agentName?: string;
  model?: string;
  legacyAnthropicApiKey?: string;
  toolNames: string[];
  customTools?: ToolDefinition[];
  maxTurns?: number;
  effort?: Effort;
  maxRetries?: number;
  timeout?: number;
  abortController?: AbortController;
  toolDescriptions?: Record<string, string>;
  /** Parent `invoke_agent` span for model-call and tool-execution child spans. */
  parentSpan?: Span;
  /** Recorder used to persist runtime child spans in structured traces. */
  traceRecorder?: TraceRecorder;
}

function errorMessage(error: unknown): string {
  return sanitizeErrorMessage(error instanceof Error ? error.message : String(error));
}

function parseModelSelector(model: string): PiModelSelector {
  if (!isPiModelSelector(model)) {
    throw new InvalidPiModelSelectorError({ option: 'model', model });
  }
  const slashIndex = model.indexOf('/');

  return {
    provider: model.slice(0, slashIndex),
    modelId: model.slice(slashIndex + 1),
  };
}

function legacyApiKeyProvider(model: string | undefined): string | undefined {
  if (!model) {
    return 'anthropic';
  }

  const selector = parseModelSelector(model);
  return selector.provider === 'anthropic' ? 'anthropic' : undefined;
}

function createAuthStorage(model: string | undefined, legacyAnthropicApiKey: string | undefined): AuthStorage {
  const authStorage = AuthStorage.create();
  const provider = legacyApiKeyProvider(model);
  if (legacyAnthropicApiKey && provider) {
    authStorage.setRuntimeApiKey(provider, legacyAnthropicApiKey);
  }
  return authStorage;
}

function resolvePiModel(
  model: string | undefined,
  registry: ModelRegistry,
): Model<Api> | undefined {
  if (!model) {
    return undefined;
  }

  const { provider, modelId } = parseModelSelector(model);
  const resolved = registry.find(provider, modelId);
  if (!resolved) {
    throw new Error(
      `Pi model not found: ${model}. Use provider/model, for example openai/gpt-5.5.`
    );
  }
  return resolved;
}

function resolvePiSkillTools(
  tools: ToolConfig | undefined,
  allowMutatingTools = false,
): { toolNames: string[]; warnings: string[] } {
  const denied = new Set(tools?.denied ?? []);
  const requested = tools?.allowed ?? READ_ONLY_TOOLS;
  const availableTools = allowMutatingTools
    ? [...READ_ONLY_TOOLS, ...MUTATING_TOOLS]
    : READ_ONLY_TOOLS;
  const toolNames: string[] = [];
  const warnings: string[] = [];

  for (const tool of requested) {
    if (denied.has(tool)) {
      continue;
    }
    if (UNSUPPORTED_TOOLS.includes(tool)) {
      warnings.push(`Pi runtime ignored unsupported tool: ${tool}`);
      continue;
    }
    if (!allowMutatingTools && MUTATING_TOOLS.includes(tool)) {
      warnings.push(`Pi runtime ignored mutating tool without allowMutatingTools: ${tool}`);
      continue;
    }
    if (!availableTools.includes(tool)) {
      continue;
    }

    for (const name of PI_TOOL_NAMES[tool as Exclude<ToolName, 'WebFetch' | 'WebSearch'>]) {
      if (!toolNames.includes(name)) {
        toolNames.push(name);
      }
    }
  }

  return { toolNames, warnings };
}

function isAssistantMessage(message: unknown): message is AssistantMessage {
  return Boolean(
    message
    && typeof message === 'object'
    && (message as { role?: unknown }).role === 'assistant'
  );
}

function textFromAssistant(message: AssistantMessage): string {
  return message.content
    .filter((content): content is TextContent => content.type === 'text')
    .map((content) => content.text)
    .join('');
}

function piUsageToStats(usage: Usage): UsageStats {
  const cacheRead = usage.cacheRead;
  const cacheWrite = usage.cacheWrite;
  return {
    inputTokens: usage.input + cacheRead + cacheWrite,
    outputTokens: usage.output,
    cacheReadInputTokens: cacheRead,
    cacheCreationInputTokens: cacheWrite,
    cacheCreation5mInputTokens: cacheWrite,
    cacheCreation1hInputTokens: 0,
    webSearchRequests: 0,
    costUSD: usage.cost.total,
  };
}

function aggregatePiUsage(messages: AssistantMessage[]): UsageStats {
  return aggregateUsage(messages.map((message) => piUsageToStats(message.usage)));
}

function statusFromPiMessage(message: AssistantMessage, hitMaxTurns: boolean): SkillRunStatus {
  if (hitMaxTurns) {
    return 'turn_limit';
  }

  switch (message.stopReason) {
    case 'stop':
      return 'success';
    case 'length':
    case 'toolUse':
      return 'provider_error';
    case 'error':
      return message.errorMessage && isAuthenticationErrorMessage(message.errorMessage)
        ? 'auth_error'
        : 'provider_error';
    case 'aborted':
      return 'aborted';
    default:
      return 'provider_error';
  }
}

function normalizePiResult(run: PiPromptResult): SkillRunResult | undefined {
  const message = run.lastAssistant;
  if (!message) {
    return undefined;
  }

  const errors = message.errorMessage ? [message.errorMessage] : [];
  return {
    status: statusFromPiMessage(message, run.hitMaxTurns),
    text: textFromAssistant(message),
    errors,
    usage: run.usage,
    responseProvider: message.provider,
    responseId: message.responseId,
    responseModel: message.responseModel ?? message.model,
    sessionId: run.sessionId,
    durationMs: run.durationMs,
    numTurns: run.numTurns,
  };
}

function buildSettingsManager(timeout: number | undefined, maxRetries: number | undefined): SettingsManager {
  const providerMaxRetries = maxRetries ?? DEFAULT_PI_PROVIDER_MAX_RETRIES;
  return SettingsManager.inMemory({
    compaction: { enabled: false },
    retry: {
      enabled: providerMaxRetries > 0,
      provider: {
        ...(timeout !== undefined ? { timeoutMs: timeout } : {}),
        maxRetries: providerMaxRetries,
      },
    },
  });
}

type PiToolSpan = ReturnType<typeof startInactiveTracedSpan>;

function setSpanAttributes(span: PiToolSpan, attributes: Record<string, string | number | boolean | string[] | undefined>): void {
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) {
      span.setAttribute(key, value);
    }
  }
}

async function promptWithTimeout(
  session: AgentSession,
  userPrompt: string,
  timeout: number | undefined,
): Promise<void> {
  const prompt = session.prompt(userPrompt, { expandPromptTemplates: false });
  if (timeout === undefined) {
    await prompt;
    return;
  }

  let timeoutId: NodeJS.Timeout | undefined;
  let timedOut = false;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      reject(new Error(`Pi runtime timed out after ${timeout}ms`));
    }, timeout);
  });

  try {
    await Promise.race([prompt, timeoutPromise]);
  } catch (error) {
    if (timedOut) {
      await session.abort();
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function runPiPrompt(options: PiPromptOptions): Promise<PiPromptResult> {
  const warnings: string[] = [];
  bridgeWardenProviderApiKeyEnv();
  const authStorage = createAuthStorage(options.model, options.legacyAnthropicApiKey);
  const modelRegistry = ModelRegistry.create(authStorage);
  const model = resolvePiModel(options.model, modelRegistry);
  const settingsManager = buildSettingsManager(options.timeout, options.maxRetries);
  const agentDir = getAgentDir();
  const resourceLoader = new DefaultResourceLoader({
    cwd: options.cwd,
    agentDir,
    settingsManager,
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
    systemPrompt: options.systemPrompt,
  });
  await resourceLoader.reload();

  let session: AgentSession | undefined;
  const assistantMessages: AssistantMessage[] = [];
  let agentEndMessages: unknown[] | undefined;
  let lastAssistant: AssistantMessage | undefined;
  let numTurns = 0;
  let hitMaxTurns = false;
  const startedAt = Date.now();
  const activeToolSpans = new Map<string, PiToolSpan>();
  const conversationMessages: GenAiMessage[] = [{ role: 'user', content: options.userPrompt }];

  const buildToolAttributes = (args: {
    toolName: string;
    toolCallId?: string;
    input?: unknown;
    result?: unknown;
    isError?: boolean;
  }): Record<string, string | number | boolean | string[] | undefined> =>
    genAiToolCallAttributes({
      agentName: options.agentName,
      toolName: args.toolName,
      toolDescription: options.toolDescriptions?.[args.toolName],
      toolCallId: args.toolCallId,
      toolType: 'function',
      arguments: args.input,
      result: args.result,
      isError: args.isError,
    });

  function startToolSpan(event: { toolCallId: string; toolName: string; args: unknown }): void {
    try {
      const parentSpan = options.parentSpan ?? Sentry.getActiveSpan();
      const span = startInactiveTracedSpan({
        op: 'gen_ai.execute_tool',
        name: `execute_tool ${event.toolName}`,
        ...(parentSpan && { parentSpan }),
        attributes: buildToolAttributes({
          toolName: event.toolName,
          toolCallId: event.toolCallId,
          input: event.args,
        }),
      });
      activeToolSpans.set(event.toolCallId, span);
    } catch {
      // Telemetry should never break the workflow.
    }
  }

  function finishToolSpan(event: {
    toolCallId: string;
    toolName: string;
    result: unknown;
    isError: boolean;
  }): void {
    try {
      const parentSpan = options.parentSpan ?? Sentry.getActiveSpan();
      const span = activeToolSpans.get(event.toolCallId) ?? startInactiveTracedSpan({
        op: 'gen_ai.execute_tool',
        name: `execute_tool ${event.toolName}`,
        ...(parentSpan && { parentSpan }),
      });
      activeToolSpans.delete(event.toolCallId);
      setSpanAttributes(span, buildToolAttributes({
        toolName: event.toolName,
        toolCallId: event.toolCallId,
        result: event.result,
        isError: event.isError,
      }));
      if (event.isError) {
        span.setAttribute('error.type', 'tool_error');
      }
      span.end();
      recordTracedSpan(span, options.traceRecorder);
    } catch {
      // Telemetry should never break the workflow.
    }
  }

  function finishOpenToolSpans(errorType: string): void {
    for (const span of activeToolSpans.values()) {
      try {
        span.setAttribute('error.type', errorType);
        span.end();
        recordTracedSpan(span, options.traceRecorder);
      } catch {
        // Telemetry should never break the workflow.
      }
    }
    activeToolSpans.clear();
  }

  function recordTurnSpan(
    message: AssistantMessage,
    toolResults: ToolResultMessage[] | undefined,
  ): void {
    const outputMessage: GenAiMessage = {
      role: message.role,
      content: message.content,
      finishReason: message.stopReason,
    };
    const followUpMessages = toolResults ?? [];
    const requestModel = options.model ?? message.model ?? message.responseModel;

    try {
      const usageAttrs = genAiUsageAttributes(piUsageToStats(message.usage));
      startTracedSpan(
        {
          op: 'gen_ai.chat',
          name: genAiSpanName('chat', requestModel),
          ...(options.parentSpan ? { parentSpan: options.parentSpan } : {}),
          attributes: {
            'gen_ai.operation.name': 'chat',
            'gen_ai.provider.name': message.provider ?? genAiProviderName('pi', options.model),
            ...(options.agentName ? { 'gen_ai.agent.name': options.agentName } : {}),
            ...(requestModel ? { 'gen_ai.request.model': requestModel } : {}),
            'gen_ai.response.model': message.responseModel ?? message.model,
            ...usageAttrs,
          },
        },
        (span) => {
          setGenAiInputMessagesAttr(span, conversationMessages);
          setGenAiOutputMessagesAttrFromMessages(span, [outputMessage]);
        },
        options.traceRecorder,
      );
    } catch {
      // Telemetry should never break the workflow.
    }

    conversationMessages.push(outputMessage, ...followUpMessages);
  }

  try {
    const result = await createAgentSession({
      cwd: options.cwd,
      agentDir,
      authStorage,
      modelRegistry,
      model,
      thinkingLevel: options.effort,
      tools: options.toolNames,
      noTools: options.toolNames.length === 0 ? 'all' : undefined,
      customTools: options.customTools,
      resourceLoader,
      sessionManager: SessionManager.inMemory(options.cwd),
      settingsManager,
    });
    session = result.session;
    if (result.modelFallbackMessage) {
      warnings.push(result.modelFallbackMessage);
    }

    const unsubscribe = session.subscribe((event: AgentSessionEvent) => {
      if (event.type === 'message_end' && isAssistantMessage(event.message)) {
        if (
          hitMaxTurns
          && lastAssistant?.stopReason === 'toolUse'
          && event.message.stopReason === 'aborted'
        ) {
          return;
        }
        assistantMessages.push(event.message);
        lastAssistant = event.message;
      } else if (event.type === 'agent_end') {
        agentEndMessages = [...event.messages];
      } else if (event.type === 'tool_execution_start') {
        startToolSpan(event);
      } else if (event.type === 'tool_execution_end') {
        finishToolSpan(event);
      } else if (event.type === 'turn_end') {
        if (isAssistantMessage(event.message)) {
          recordTurnSpan(event.message, event.toolResults);
        }
        numTurns++;
        if (
          options.maxTurns !== undefined
          && numTurns >= options.maxTurns
          && isAssistantMessage(event.message)
          && event.message.stopReason === 'toolUse'
        ) {
          hitMaxTurns = true;
          lastAssistant = event.message;
          void session?.abort();
        }
      }
    });

    const abortSignal = options.abortController?.signal;
    const onAbort = (): void => {
      void session?.abort();
    };
    abortSignal?.addEventListener('abort', onAbort, { once: true });

    try {
      if (abortSignal?.aborted) {
        await session.abort();
      } else {
        await promptWithTimeout(session, options.userPrompt, options.timeout);
      }
    } finally {
      abortSignal?.removeEventListener('abort', onAbort);
      unsubscribe();
    }
  } finally {
    finishOpenToolSpans('aborted');
    session?.dispose();
  }

  if (!lastAssistant && agentEndMessages) {
    for (const message of agentEndMessages) {
      if (isAssistantMessage(message)) {
        assistantMessages.push(message);
        lastAssistant = message;
      }
    }
  }

  return {
    lastAssistant,
    assistantMessages,
    usage: aggregatePiUsage(assistantMessages),
    sessionId: session?.sessionId,
    durationMs: Date.now() - startedAt,
    numTurns,
    hitMaxTurns,
    warnings,
  };
}

function toStructuredPrompt<T>(
  kind: 'auxiliary' | 'synthesis',
  task: AuxiliaryTask | SynthesisTask | undefined,
  schema: z.ZodType<T>,
): string {
  const jsonSchema = z.toJSONSchema(schema);
  return [
    `You are Warden's ${kind} structured-output runtime.`,
    task ? `Task: ${task}` : undefined,
    'Return only valid JSON. Do not include markdown fences, commentary, or surrounding prose.',
    'The JSON must match this schema:',
    JSON.stringify(jsonSchema, null, 2),
  ].filter((line): line is string => line !== undefined).join('\n\n');
}

function toPiCustomTools(
  tools: AuxiliaryTool[] | undefined,
  executeTool: ((name: string, input: Record<string, unknown>) => Promise<string>) | undefined,
): ToolDefinition[] | undefined {
  if (!tools || tools.length === 0) {
    return undefined;
  }

  return tools.map((tool) => defineTool({
    name: tool.name,
    label: tool.name,
    description: tool.description ?? '',
    promptSnippet: `${tool.name}: ${tool.description ?? 'custom tool'}`,
    parameters: Type.Unsafe(tool.inputSchema as TSchema),
    async execute(_toolCallId, params) {
      const result = await (executeTool ?? (async () => ''))(tool.name, params as Record<string, unknown>);
      return {
        content: [{ type: 'text', text: result }],
        details: { tool: tool.name },
      };
    },
  }));
}

function toolDescriptionsByName(tools: AuxiliaryTool[] | undefined): Record<string, string> | undefined {
  const descriptions = Object.fromEntries(
    (tools ?? [])
      .filter((tool): tool is AuxiliaryTool & { description: string } =>
        typeof tool.description === 'string' && tool.description.length > 0
      )
      .map((tool) => [tool.name, tool.description]),
  );

  return Object.keys(descriptions).length > 0 ? descriptions : undefined;
}

async function runStructured<T>(
  request: {
    kind: 'auxiliary' | 'synthesis';
    task?: AuxiliaryTask | SynthesisTask;
    agentName?: string;
    apiKey?: string;
    prompt: string;
    schema: z.ZodType<T>;
    model?: string;
    maxTokens?: number;
    timeout?: number;
    maxRetries?: number;
    tools?: AuxiliaryTool[];
    executeTool?: (name: string, input: Record<string, unknown>) => Promise<string>;
    maxIterations?: number;
  }
): Promise<AuxiliaryRunResult<T>> {
  const customTools = toPiCustomTools(request.tools, request.executeTool);
  const systemPrompt = toStructuredPrompt(request.kind, request.task, request.schema);
  const toolNames = customTools?.map((tool) => tool.name) ?? [];
  const toolDescriptions = toolDescriptionsByName(request.tools);

  return startTracedSpan(
    {
      op: 'gen_ai.invoke_agent',
      name: genAiSpanName('invoke_agent', request.agentName),
      attributes: {
        'gen_ai.operation.name': 'invoke_agent',
        'gen_ai.provider.name': genAiProviderName('pi', request.model),
        ...(request.agentName ? { 'gen_ai.agent.name': request.agentName } : {}),
        ...(request.task ? { 'warden.ai.task': request.task } : {}),
        ...(request.model ? { 'gen_ai.request.model': request.model } : {}),
        'gen_ai.output.type': 'json',
      },
    },
    async (span) => {
      setGenAiSystemInstructionsAttr(span, systemPrompt);
      setGenAiInputMessagesAttr(span, [{ role: 'user', content: request.prompt }]);

      try {
        const run = await runPiPrompt({
          cwd: process.cwd(),
          systemPrompt,
          userPrompt: request.prompt,
          agentName: request.agentName,
          model: request.model,
          legacyAnthropicApiKey: request.apiKey,
          toolNames,
          customTools,
          toolDescriptions,
          maxTurns: request.maxIterations,
          maxRetries: request.maxRetries,
          timeout: request.timeout,
          parentSpan: span,
        });
        const result = normalizePiResult(run);
        if (!result) {
          span.setAttribute('error.type', 'missing_response');
          return { success: false, error: 'Pi runtime returned no response', usage: run.usage };
        }

        if (run.lastAssistant?.provider) {
          span.setAttribute('gen_ai.provider.name', run.lastAssistant.provider);
        }
        setGenAiUsageAttrs(span, result.usage);
        if (result.responseId) {
          span.setAttribute('gen_ai.response.id', result.responseId);
        }
        if (result.responseModel) {
          span.setAttribute('gen_ai.response.model', result.responseModel);
        }
        span.setAttribute('gen_ai.response.finish_reasons', [run.lastAssistant?.stopReason ?? result.status]);
        setGenAiOutputMessagesAttr(span, result.text, run.lastAssistant?.stopReason ?? result.status);

        if (result.status !== 'success') {
          span.setAttribute('error.type', result.status);
          return {
            success: false,
            error: result.errors.join('; ') || `Pi runtime execution failed: ${result.status}`,
            usage: result.usage,
          };
        }

        const json = extractJson(result.text);
        if (!json) {
          span.setAttribute('error.type', 'invalid_json');
          return { success: false, error: 'No JSON found in response', usage: result.usage };
        }

        const parsed = JSON.parse(json);
        const validated = request.schema.safeParse(parsed);
        if (!validated.success) {
          span.setAttribute('error.type', 'validation_error');
          return { success: false, error: `Validation failed: ${validated.error.message}`, usage: result.usage };
        }

        return { success: true, data: validated.data, usage: result.usage };
      } catch (error) {
        span.setAttribute('error.type', error instanceof Error ? error.name : '_OTHER');
        return { success: false, error: errorMessage(error), usage: emptyUsage() };
      }
    },
  );
}

export const piRuntime: Runtime = {
  name: 'pi',

  async runSkill(request: SkillRunRequest): Promise<SkillRunResponse> {
    const {
      systemPrompt,
      userPrompt,
      repoPath,
      apiKey,
      options,
      skillName,
      tools,
      allowMutatingTools,
    } = request;
    const { maxTurns = 50, model, effort, abortController } = options;
    const skillTools = resolvePiSkillTools(tools, allowMutatingTools);

    return startTracedSpan(
      {
        op: 'gen_ai.invoke_agent',
        name: genAiSpanName('invoke_agent', skillName),
        ...(request.parentSpan ? { parentSpan: request.parentSpan } : {}),
        attributes: {
          'gen_ai.operation.name': 'invoke_agent',
          'gen_ai.provider.name': genAiProviderName('pi', model),
          'gen_ai.agent.name': skillName,
          ...(model ? { 'gen_ai.request.model': model } : {}),
          'warden.request.max_turns': maxTurns,
        },
      },
      async (span) => {
        setGenAiSystemInstructionsAttr(span, systemPrompt);
        setGenAiInputMessagesAttr(span, [{ role: 'user', content: userPrompt }]);

        try {
          const run = await runPiPrompt({
            cwd: repoPath,
            systemPrompt,
            userPrompt,
            agentName: skillName,
            model,
            legacyAnthropicApiKey: apiKey,
            toolNames: skillTools.toolNames,
            maxTurns,
            effort,
            abortController,
            parentSpan: span,
            traceRecorder: request.traceRecorder,
          });
          run.warnings.unshift(...skillTools.warnings);
          const result = normalizePiResult(run);

          if (result) {
            if (run.lastAssistant?.provider) {
              span.setAttribute('gen_ai.provider.name', run.lastAssistant.provider);
            }
            setGenAiUsageAttrs(span, result.usage);
            if (result.responseId) {
              span.setAttribute('gen_ai.response.id', result.responseId);
            }
            if (result.responseModel) {
              span.setAttribute('gen_ai.response.model', result.responseModel);
            }
            span.setAttribute('gen_ai.response.finish_reasons', [run.lastAssistant?.stopReason ?? result.status]);
            if (result.text) {
              setGenAiOutputMessagesAttr(span, result.text, run.lastAssistant?.stopReason ?? result.status);
            }
            if (result.status !== 'success') {
              span.setAttribute('error.type', result.status);
            }
            if (result.sessionId) {
              span.setAttribute('gen_ai.conversation.id', result.sessionId);
            }
            if (result.durationMs !== undefined) {
              span.setAttribute('warden.sdk.duration_ms', result.durationMs);
            }
            if (result.numTurns !== undefined) {
              span.setAttribute('warden.sdk.num_turns', result.numTurns);
            }
          }

          return {
            result,
            stderr: run.warnings.join('\n') || undefined,
          };
        } catch (error) {
          const message = errorMessage(error);
          if (isAuthenticationErrorMessage(message)) {
            span.setAttribute('error.type', 'auth_error');
            return { authError: message };
          }
          span.setAttribute('error.type', error instanceof Error ? error.name : '_OTHER');
          throw error;
        }
      },
      request.traceRecorder,
    );
  },

  async runAuxiliary<T>(request: AuxiliaryRunRequest<T>): Promise<AuxiliaryRunResult<T>> {
    return runStructured({ kind: 'auxiliary', ...request });
  },

  async runSynthesis<T>(request: SynthesisRunRequest<T>): Promise<AuxiliaryRunResult<T>> {
    return runStructured({ kind: 'synthesis', ...request });
  },
};
