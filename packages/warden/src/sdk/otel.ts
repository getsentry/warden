import type { UsageStats } from '../types/index.js';

interface SpanLike {
  setAttribute(
    key: string,
    value: string | number | boolean | string[] | undefined,
  ): unknown;
}

interface GenAiMessage {
  role: string;
  content: unknown;
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

/** Build OpenTelemetry GenAI attributes for an executed tool call span. */
export function genAiToolCallAttributes(args: {
  agentName?: string;
  task?: string;
  toolName: string;
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
  if (block['type'] === 'tool_result') {
    return {
      type: 'tool_call_response',
      id: block['tool_use_id'],
      result: block['content'],
    };
  }

  return { ...block };
}

function normalizeMessage(message: GenAiMessage): Record<string, unknown> {
  const { role, content } = message;
  if (typeof content === 'string') {
    return {
      role,
      parts: [{ type: 'text', content }],
    };
  }
  if (Array.isArray(content)) {
    return {
      role,
      parts: content.map(normalizeContentPart),
    };
  }

  return {
    role,
    parts: [normalizeContentPart(content)],
  };
}

/** Set OpenTelemetry GenAI input message attributes using the current schema. */
export function setGenAiInputMessagesAttr(span: SpanLike, messages: GenAiMessage[]): void {
  span.setAttribute('gen_ai.input.messages', JSON.stringify(messages.map(normalizeMessage)));
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
