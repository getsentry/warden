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

/** Resolve the OpenTelemetry GenAI provider name from runtime and model selectors. */
export function genAiProviderName(runtime: string | undefined, model: string | undefined): string {
  return providerFromModel(model) ?? (runtime === 'pi' ? 'pi' : 'anthropic');
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

function stringifyGenAiAttribute(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  try {
    const json = JSON.stringify(value);
    return json === undefined ? String(value) : json;
  } catch {
    return String(value);
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
  span.setAttribute('gen_ai.system_instructions', JSON.stringify([
    { type: 'text', content: systemPrompt },
  ]));
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
  span.setAttribute('gen_ai.input.messages', JSON.stringify(messages.map(normalizeMessage)));
}

/** Set OTel GenAI output messages from raw runtime response messages. */
export function setGenAiOutputMessagesAttrFromMessages(span: SpanLike, messages: GenAiMessage[]): void {
  span.setAttribute('gen_ai.output.messages', JSON.stringify(messages.map(normalizeMessage)));
}

/** Set OpenTelemetry GenAI output message attributes for text responses. */
export function setGenAiOutputMessagesAttr(
  span: SpanLike,
  responseText: string,
  finishReason?: string | null,
): void {
  span.setAttribute('gen_ai.output.messages', JSON.stringify([
    {
      role: 'assistant',
      parts: [{ type: 'text', content: responseText }],
      ...(finishReason ? { finish_reason: finishReason } : {}),
    },
  ]));
}
