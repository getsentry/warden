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

function providerFromModel(model: string | undefined): string | undefined {
  if (!model) {
    return undefined;
  }

  const slashIndex = model.indexOf('/');
  if (slashIndex > 0) {
    return model.slice(0, slashIndex);
  }

  const colonIndex = model.indexOf(':');
  if (colonIndex > 0) {
    return model.slice(0, colonIndex);
  }

  return undefined;
}

/** Resolve the OpenTelemetry GenAI provider name from runtime and model selectors. */
export function genAiProviderName(runtime: string | undefined, model: string | undefined): string {
  return providerFromModel(model) ?? (runtime === 'pi' ? 'pi' : 'anthropic');
}

/** Set OpenTelemetry GenAI token usage attributes and Warden-owned totals. */
export function setGenAiUsageAttrs(span: SpanLike, usage: UsageStats): void {
  span.setAttribute('gen_ai.usage.input_tokens', usage.inputTokens);
  span.setAttribute('gen_ai.usage.output_tokens', usage.outputTokens);
  span.setAttribute('gen_ai.usage.cache_read.input_tokens', usage.cacheReadInputTokens ?? 0);
  span.setAttribute('gen_ai.usage.cache_creation.input_tokens', usage.cacheCreationInputTokens ?? 0);
  span.setAttribute('warden.gen_ai.usage.total_tokens', usage.inputTokens + usage.outputTokens);
  if (usage.costUSD) {
    span.setAttribute('warden.gen_ai.cost.usd', usage.costUSD);
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
