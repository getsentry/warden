import { describe, expect, it } from 'vitest';
import {
  genAiProviderName,
  genAiToolCallAttributes,
  genAiUsageAttributes,
  setGenAiInputMessageHashesAttr,
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
});

describe('OpenTelemetry GenAI input message hashes', () => {
  function capture(messages: Parameters<typeof setGenAiInputMessageHashesAttr>[1]) {
    const attrs = new Map<string, unknown>();
    setGenAiInputMessageHashesAttr({ setAttribute: (key, value) => attrs.set(key, value) }, messages);
    return attrs;
  }

  it('records one hash per message and no message content', () => {
    const secret = 'x'.repeat(10_000);
    const attrs = capture([
      { role: 'user', content: secret },
      { role: 'assistant', content: [{ type: 'text', text: 'ok' }] },
    ]);

    expect(attrs.has('gen_ai.input.messages')).toBe(false);
    const raw = attrs.get('warden.gen_ai.input.message_hashes') as string;
    expect(raw).not.toContain('xxxx');
    const hashes = JSON.parse(raw) as string[];
    expect(hashes).toHaveLength(2);
    for (const hash of hashes) expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('keeps hashes stable for shared history and changes them when content differs', () => {
    const history = [{ role: 'user', content: 'review this diff' }];
    const first = JSON.parse(capture(history).get('warden.gen_ai.input.message_hashes') as string) as string[];
    const next = JSON.parse(capture([
      ...history,
      { role: 'assistant', content: 'done' },
    ]).get('warden.gen_ai.input.message_hashes') as string) as string[];
    const changed = JSON.parse(capture([
      { role: 'user', content: 'review that diff' },
    ]).get('warden.gen_ai.input.message_hashes') as string) as string[];

    expect(next[0]).toBe(first[0]);
    expect(changed[0]).not.toBe(first[0]);
  });
});
