import { describe, expect, it } from 'vitest';
import {
  GEN_AI_MESSAGES_BYTE_LIMIT,
  genAiProviderName,
  genAiToolCallAttributes,
  genAiUsageAttributes,
  serializeGenAiMessagesJson,
  setGenAiInputMessagesAttr,
  setGenAiSystemInstructionsAttr,
} from './otel.js';

describe('OpenTelemetry GenAI provider attribution', () => {
  it('uses provider ids from model selectors', () => {
    expect(genAiProviderName('pi', 'openai/gpt-test')).toBe('openai');
    expect(genAiProviderName('pi', 'anthropic/claude-test')).toBe('anthropic');
    expect(genAiProviderName('pi', 'xai/grok-test')).toBe('x_ai');
    expect(genAiProviderName('pi', 'gpt-test-2026', 'openai')).toBe('openai');
    expect(genAiProviderName('pi', 'grok-test', 'xai')).toBe('x_ai');
  });
});

describe('OpenTelemetry GenAI usage attributes', () => {
  it('uses current cache subset attribute names', () => {
    expect(genAiUsageAttributes({
      inputTokens: 1300,
      outputTokens: 500,
      cacheReadInputTokens: 200,
      cacheCreationInputTokens: 100,
      costUSD: 0.01,
    })).toEqual({
      'gen_ai.usage.input_tokens': 1300,
      'gen_ai.usage.output_tokens': 500,
      'gen_ai.usage.cache_read.input_tokens': 200,
      'gen_ai.usage.cache_creation.input_tokens': 100,
    });
  });
});

describe('OpenTelemetry GenAI tool call attributes', () => {
  it('serializes tool call arguments and results for span attributes', () => {
    expect(genAiToolCallAttributes({
      agentName: 'test-skill',
      toolName: 'Read',
      toolCallId: 'tool-1',
      toolType: 'function',
      arguments: { path: 'src/index.ts' },
      result: { ok: true },
    })).toEqual({
      'gen_ai.operation.name': 'execute_tool',
      'gen_ai.agent.name': 'test-skill',
      'gen_ai.tool.name': 'Read',
      'gen_ai.tool.call.id': 'tool-1',
      'gen_ai.tool.type': 'function',
      'gen_ai.tool.call.arguments': '{"path":"src/index.ts"}',
      'gen_ai.tool.call.result': '{"ok":true}',
    });
  });

  it('truncates oversized tool payloads instead of shipping unbounded JSON', () => {
    const huge = 'x'.repeat(GEN_AI_MESSAGES_BYTE_LIMIT + 5_000);
    const attrs = genAiToolCallAttributes({
      toolName: 'Read',
      arguments: { body: huge },
      result: { body: huge },
    });

    expect(new TextEncoder().encode(String(attrs['gen_ai.tool.call.arguments'])).length)
      .toBeLessThanOrEqual(GEN_AI_MESSAGES_BYTE_LIMIT);
    expect(new TextEncoder().encode(String(attrs['gen_ai.tool.call.result'])).length)
      .toBeLessThanOrEqual(GEN_AI_MESSAGES_BYTE_LIMIT);
  });
});

describe('OpenTelemetry GenAI message serialization', () => {
  it('preserves small payloads untouched', () => {
    const serialized = serializeGenAiMessagesJson([
      { role: 'user', parts: [{ type: 'text', content: 'hello' }] },
    ]);

    expect(serialized.truncated).toBe(false);
    expect(serialized.originalMessageCount).toBe(1);
    expect(serialized.json).toContain('hello');
  });

  it('truncates oversized message JSON under the Sentry GenAI byte budget', () => {
    const huge = 'y'.repeat(GEN_AI_MESSAGES_BYTE_LIMIT);
    const serialized = serializeGenAiMessagesJson([
      { role: 'user', parts: [{ type: 'text', content: huge }] },
      { role: 'assistant', parts: [{ type: 'text', content: huge }] },
    ]);

    expect(serialized.truncated).toBe(true);
    expect(serialized.originalMessageCount).toBe(2);
    expect(new TextEncoder().encode(serialized.json).length).toBeLessThanOrEqual(GEN_AI_MESSAGES_BYTE_LIMIT);
  });

  it('stays under budget when trailing multi-part tool payloads alone exceed the limit', () => {
    const hugeToolArgs = { body: 't'.repeat(GEN_AI_MESSAGES_BYTE_LIMIT + 1_000) };
    const serialized = serializeGenAiMessagesJson([
      {
        role: 'assistant',
        parts: [
          { type: 'text', content: 'calling tool' },
          { type: 'tool_call', id: 'tool-1', name: 'read', arguments: hugeToolArgs },
        ],
      },
    ]);

    expect(serialized.truncated).toBe(true);
    expect(serialized.originalMessageCount).toBe(1);
    expect(new TextEncoder().encode(serialized.json).length).toBeLessThanOrEqual(GEN_AI_MESSAGES_BYTE_LIMIT);
    // Trailing tool_call must be dropped; only the text part (or placeholder) remains.
    expect(serialized.json).not.toContain('tool-1');
  });

  it('records truncation metadata on input and system instruction attrs', () => {
    const attrs = new Map<string, string | number | boolean | string[]>();
    const span = {
      setAttribute(key: string, value: string | number | boolean | string[] | undefined) {
        if (value !== undefined) {
          attrs.set(key, value);
        }
      },
    };
    const huge = 'z'.repeat(GEN_AI_MESSAGES_BYTE_LIMIT);

    setGenAiInputMessagesAttr(span, [{ role: 'user', content: huge }]);
    setGenAiSystemInstructionsAttr(span, huge);

    expect(attrs.get('sentry.sdk_meta.gen_ai.input.messages.truncated')).toBe(true);
    expect(attrs.get('sentry.sdk_meta.gen_ai.input.messages.original_length')).toBe(1);
    expect(attrs.get('sentry.sdk_meta.gen_ai.system_instructions.truncated')).toBe(true);
    expect(new TextEncoder().encode(String(attrs.get('gen_ai.input.messages'))).length)
      .toBeLessThanOrEqual(GEN_AI_MESSAGES_BYTE_LIMIT);
    expect(new TextEncoder().encode(String(attrs.get('gen_ai.system_instructions'))).length)
      .toBeLessThanOrEqual(GEN_AI_MESSAGES_BYTE_LIMIT);
  });
});
