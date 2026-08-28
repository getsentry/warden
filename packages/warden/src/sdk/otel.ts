import type { UsageStats } from '../types/index.js';

interface SpanLike {
  setAttribute(
    key: string,
    value: string | number | boolean | string[] | undefined,
  ): unknown;
}

/**
 * Provider-neutral message envelope used before writing OTel GenAI attributes.
 *
 * Runtime adapters pass raw provider content blocks here. This module owns the
 * conversion to the current `gen_ai.*.messages` schema so Claude, Pi, and
 * Anthropic API shapes do not leak into trace consumers.
 */
export interface GenAiMessage {
  role: string;
  content: unknown;
  /** Tool result messages from some runtimes carry the call ID outside content. */
  toolCallId?: string;
  /** Provider finish/stop reason, emitted as OTel `finish_reason`. */
  finishReason?: string | null;
}

type GenAiUsageAttributes = Record<string, number>;
type GenAiToolAttributeValue = string | number | boolean | string[] | undefined;

/**
 * Match Sentry SDK GenAI message truncation (`DEFAULT_GEN_AI_MESSAGES_BYTE_LIMIT`).
 * Unbounded prompt JSON on pi/claude spans can bloat the transaction enough that
 * analyze-mode traces lose every child span while errors/logs still land.
 */
export const GEN_AI_MESSAGES_BYTE_LIMIT = 20_000;

const PROVIDER_NAME_ALIASES: Record<string, string> = {
  mistral: 'mistral_ai',
  xai: 'x_ai',
};

function providerFromModel(model: string | undefined): string | undefined {
  if (!model) {
    return undefined;
  }

  const slashIndex = model.indexOf('/');
  if (slashIndex > 0) {
    const provider = model.slice(0, slashIndex);
    return PROVIDER_NAME_ALIASES[provider] ?? provider;
  }

  return undefined;
}

/** Resolve the OpenTelemetry GenAI provider name, preferring the observed provider over selector fallbacks. */
export function genAiProviderName(
  runtime: string | undefined,
  model: string | undefined,
  provider?: string,
): string {
  const resolvedProvider = provider ?? providerFromModel(model);
  return resolvedProvider
    ? (PROVIDER_NAME_ALIASES[resolvedProvider] ?? resolvedProvider)
    : (runtime === 'pi' ? 'pi' : 'anthropic');
}

/** Build OTel GenAI span names as `<operation> <semantic target>`, when known. */
export function genAiSpanName(operationName: string, targetName: string | undefined): string {
  const trimmedTarget = targetName?.trim();
  return trimmedTarget ? `${operationName} ${trimmedTarget}` : operationName;
}

/** Build current OpenTelemetry GenAI usage attributes from normalized usage. */
export function genAiUsageAttributes(usage: UsageStats): GenAiUsageAttributes {
  return {
    'gen_ai.usage.input_tokens': usage.inputTokens,
    'gen_ai.usage.output_tokens': usage.outputTokens,
    'gen_ai.usage.cache_read.input_tokens': usage.cacheReadInputTokens ?? 0,
    'gen_ai.usage.cache_creation.input_tokens': usage.cacheCreationInputTokens ?? 0,
  };
}

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function truncateTextByBytes(text: string, maxBytes: number): string {
  if (maxBytes <= 0) {
    return '';
  }
  if (utf8ByteLength(text) <= maxBytes) {
    return text;
  }

  let low = 0;
  let high = text.length;
  let bestFit = '';
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = text.slice(0, mid);
    if (utf8ByteLength(candidate) <= maxBytes) {
      bestFit = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return bestFit;
}

/**
 * Serialize GenAI payload JSON and keep it under Sentry's GenAI attribute budget.
 * Prefers whole trailing messages; falls back to truncating the last message body.
 */
export function serializeGenAiMessagesJson(
  messages: unknown[],
  maxBytes = GEN_AI_MESSAGES_BYTE_LIMIT,
): { json: string; originalMessageCount: number; truncated: boolean } {
  const originalMessageCount = messages.length;
  try {
    const full = JSON.stringify(messages);
    if (utf8ByteLength(full) <= maxBytes) {
      return { json: full, originalMessageCount, truncated: false };
    }

    // Keep the newest messages first so multi-turn tool loops stay useful.
    for (let start = Math.max(0, messages.length - 1); start >= 0; start -= 1) {
      const slice = messages.slice(start);
      const candidate = JSON.stringify(slice);
      if (utf8ByteLength(candidate) <= maxBytes) {
        return { json: candidate, originalMessageCount, truncated: true };
      }
      if (slice.length === 1) {
        const only = slice[0];
        if (only && typeof only === 'object') {
          const record = only as Record<string, unknown>;
          const parts = Array.isArray(record['parts']) ? record['parts'] : undefined;
          if (parts && parts.length > 0) {
            const first = parts[0];
            if (first && typeof first === 'object' && typeof (first as Record<string, unknown>)['content'] === 'string') {
              // Budget against the final array payload (`[...]`), not the bare message.
              const emptyPayload = [{
                ...record,
                parts: parts.map((part, index) => {
                  if (index !== 0 || !part || typeof part !== 'object') {
                    return part;
                  }
                  return { ...(part as Record<string, unknown>), content: '' };
                }),
              }];
              const overhead = utf8ByteLength(JSON.stringify(emptyPayload));
              const budget = Math.max(0, maxBytes - overhead);
              const truncatedContent = truncateTextByBytes(
                (first as Record<string, unknown>)['content'] as string,
                budget,
              );
              const truncatedMessage = {
                ...record,
                parts: [
                  { ...(first as Record<string, unknown>), content: truncatedContent },
                  ...parts.slice(1),
                ],
              };
              return {
                json: JSON.stringify([truncatedMessage]),
                originalMessageCount,
                truncated: true,
              };
            }
          }
        }
        return {
          json: JSON.stringify([{
            role: 'user',
            parts: [{ type: 'text', content: '[truncated gen_ai payload]' }],
          }]),
          originalMessageCount,
          truncated: true,
        };
      }
    }

    return {
      json: JSON.stringify([{
        role: 'user',
        parts: [{ type: 'text', content: '[truncated gen_ai payload]' }],
      }]),
      originalMessageCount,
      truncated: true,
    };
  } catch {
    return {
      json: JSON.stringify([{
        role: 'user',
        parts: [{ type: 'text', content: '[unserializable gen_ai payload]' }],
      }]),
      originalMessageCount,
      truncated: true,
    };
  }
}

function stringifyGenAiAttribute(value: unknown, maxBytes = GEN_AI_MESSAGES_BYTE_LIMIT): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  try {
    const json = JSON.stringify(value);
    if (json === undefined) {
      return truncateTextByBytes(String(value), maxBytes);
    }
    if (utf8ByteLength(json) <= maxBytes) {
      return json;
    }
    if (typeof value === 'string') {
      return JSON.stringify(truncateTextByBytes(value, Math.max(0, maxBytes - 2)));
    }
    return truncateTextByBytes(json, maxBytes);
  } catch {
    return truncateTextByBytes(String(value), maxBytes);
  }
}

/**
 * Build OpenTelemetry GenAI attributes for an executed tool call span.
 *
 * Tool arguments and results are opt-in content attributes in OTel. Sentry span
 * data and Warden's local trace schema only preserve primitive attributes, so
 * structured values are JSON-encoded at this boundary.
 */
export function genAiToolCallAttributes(args: {
  agentName?: string;
  task?: string;
  toolName: string;
  toolDescription?: string;
  toolCallId?: string;
  toolType?: string;
  arguments?: unknown;
  result?: unknown;
  isError?: boolean;
}): Record<string, GenAiToolAttributeValue> {
  const attributes: Record<string, GenAiToolAttributeValue> = {
    'gen_ai.operation.name': 'execute_tool',
    ...(args.agentName ? { 'gen_ai.agent.name': args.agentName } : {}),
    ...(args.task ? { 'warden.ai.task': args.task } : {}),
    'gen_ai.tool.name': args.toolName,
    ...(args.toolDescription ? { 'gen_ai.tool.description': args.toolDescription } : {}),
    ...(args.toolCallId ? { 'gen_ai.tool.call.id': args.toolCallId } : {}),
    ...(args.toolType ? { 'gen_ai.tool.type': args.toolType } : {}),
  };

  const serializedArguments = stringifyGenAiAttribute(args.arguments);
  if (serializedArguments !== undefined) {
    attributes['gen_ai.tool.call.arguments'] = serializedArguments;
  }

  const serializedResult = args.isError ? undefined : stringifyGenAiAttribute(args.result);
  if (serializedResult !== undefined) {
    attributes['gen_ai.tool.call.result'] = serializedResult;
  }

  return attributes;
}

/** Set GenAI token usage attributes expected by Sentry AI monitoring. */
export function setGenAiUsageAttrs(span: SpanLike, usage: UsageStats): void {
  for (const [key, value] of Object.entries(genAiUsageAttributes(usage))) {
    span.setAttribute(key, value);
  }
}

/** Set OpenTelemetry GenAI system-instruction attributes for prompt spans. */
export function setGenAiSystemInstructionsAttr(span: SpanLike, systemPrompt: string): void {
  const serialized = serializeGenAiMessagesJson([
    { type: 'text', content: systemPrompt },
  ]);
  span.setAttribute('gen_ai.system_instructions', serialized.json);
  if (serialized.truncated) {
    span.setAttribute('sentry.sdk_meta.gen_ai.system_instructions.truncated', true);
  }
}

function normalizeContentPart(part: unknown): Record<string, unknown> {
  if (!part || typeof part !== 'object') {
    return { type: 'text', content: String(part ?? '') };
  }

  const block = part as Record<string, unknown>;
  if (block['type'] === 'text' && typeof block['text'] === 'string') {
    return { type: 'text', content: block['text'] };
  }
  if (block['type'] === 'tool_use') {
    return {
      type: 'tool_call',
      id: block['id'],
      name: block['name'],
      arguments: block['input'],
    };
  }
  if (block['type'] === 'toolCall') {
    return {
      type: 'tool_call',
      id: block['id'],
      name: block['name'],
      arguments: block['arguments'],
    };
  }
  if (block['type'] === 'tool_result') {
    return {
      type: 'tool_call_response',
      id: block['tool_use_id'],
      result: normalizeToolResultContent(block['content']),
    };
  }

  return { ...block };
}

function normalizeToolResultContent(content: unknown): unknown {
  if (Array.isArray(content)) {
    const normalized = content.map(normalizeContentPart);
    if (
      normalized.length === 1
      && normalized[0]?.['type'] === 'text'
      && typeof normalized[0]?.['content'] === 'string'
    ) {
      return normalized[0]['content'];
    }
    return normalized;
  }

  return content;
}

function finishReasonAttrs(message: GenAiMessage): Record<string, string> {
  return message.finishReason ? { finish_reason: message.finishReason } : {};
}

function normalizeMessage(message: GenAiMessage): Record<string, unknown> {
  const { role, content } = message;
  if ((role === 'tool' || role === 'toolResult') && message.toolCallId) {
    return {
      role: 'tool',
      parts: [{
        type: 'tool_call_response',
        id: message.toolCallId,
        result: normalizeToolResultContent(content),
      }],
    };
  }

  const contentParts = Array.isArray(content) ? content : undefined;
  // Anthropic tool results arrive as user messages; OTel records them as tool
  // messages so trace readers can reconstruct the request/result pairing.
  const normalizedRole = role === 'toolResult'
    || (
      role === 'user'
      && contentParts?.length
      && contentParts.every((part) =>
        Boolean(part && typeof part === 'object' && (part as Record<string, unknown>)['type'] === 'tool_result')
      )
    )
    ? 'tool'
    : role;
  if (typeof content === 'string') {
    return {
      role: normalizedRole,
      parts: [{ type: 'text', content }],
      ...finishReasonAttrs(message),
    };
  }
  if (Array.isArray(content)) {
    return {
      role: normalizedRole,
      parts: content.map(normalizeContentPart),
      ...finishReasonAttrs(message),
    };
  }

  return {
    role: normalizedRole,
    parts: [normalizeContentPart(content)],
    ...finishReasonAttrs(message),
  };
}

/** Set OTel GenAI input messages from raw runtime transcript messages. */
export function setGenAiInputMessagesAttr(span: SpanLike, messages: GenAiMessage[]): void {
  const serialized = serializeGenAiMessagesJson(messages.map(normalizeMessage));
  span.setAttribute('gen_ai.input.messages', serialized.json);
  span.setAttribute(
    'sentry.sdk_meta.gen_ai.input.messages.original_length',
    serialized.originalMessageCount,
  );
  if (serialized.truncated) {
    span.setAttribute('sentry.sdk_meta.gen_ai.input.messages.truncated', true);
  }
}

/** Set OTel GenAI output messages from raw runtime response messages. */
export function setGenAiOutputMessagesAttrFromMessages(span: SpanLike, messages: GenAiMessage[]): void {
  const serialized = serializeGenAiMessagesJson(messages.map(normalizeMessage));
  span.setAttribute('gen_ai.output.messages', serialized.json);
  if (serialized.truncated) {
    span.setAttribute('sentry.sdk_meta.gen_ai.output.messages.truncated', true);
  }
}

/** Set OpenTelemetry GenAI output message attributes for text responses. */
export function setGenAiOutputMessagesAttr(
  span: SpanLike,
  responseText: string,
  finishReason?: string | null,
): void {
  setGenAiOutputMessagesAttrFromMessages(span, [{
    role: 'assistant',
    content: responseText,
    finishReason,
  }]);
}
