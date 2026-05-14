import { describe, it, expect, vi } from 'vitest';
import { extractJson, setGenAiResponseAttrs } from './haiku.js';

describe('setGenAiResponseAttrs', () => {
  function makeSpan() {
    const attrs = new Map<string, unknown>();
    return {
      setAttribute: vi.fn((key: string, value: unknown) => attrs.set(key, value)),
      _attrs: attrs,
    };
  }

  it('sets usage with total input tokens and stop reason', () => {
    const span = makeSpan();
    setGenAiResponseAttrs(span as never, {
      input_tokens: 10, output_tokens: 20,
      cache_read_input_tokens: 5, cache_creation_input_tokens: 3,
    }, 'end_turn');
    // input_tokens is total: 10 + 5 + 3 = 18
    expect(span.setAttribute).toHaveBeenCalledWith('gen_ai.usage.input_tokens', 18);
    expect(span.setAttribute).toHaveBeenCalledWith('gen_ai.usage.output_tokens', 20);
    expect(span.setAttribute).toHaveBeenCalledWith('gen_ai.usage.input_tokens.cached', 5);
    expect(span.setAttribute).toHaveBeenCalledWith('gen_ai.usage.input_tokens.cache_write', 3);
    expect(span.setAttribute).toHaveBeenCalledWith('gen_ai.usage.total_tokens', 38);
    expect(span.setAttribute).toHaveBeenCalledWith('gen_ai.response.finish_reasons', ['end_turn']);
    expect(span._attrs.has('gen_ai.output.messages')).toBe(false);
  });

  it('handles missing cache fields as zero', () => {
    const span = makeSpan();
    setGenAiResponseAttrs(span as never, { input_tokens: 10, output_tokens: 20 }, 'end_turn');
    expect(span.setAttribute).toHaveBeenCalledWith('gen_ai.usage.input_tokens', 10);
    expect(span.setAttribute).toHaveBeenCalledWith('gen_ai.usage.input_tokens.cached', 0);
    expect(span.setAttribute).toHaveBeenCalledWith('gen_ai.usage.input_tokens.cache_write', 0);
    expect(span.setAttribute).toHaveBeenCalledWith('gen_ai.usage.total_tokens', 30);
  });

  it('sets gen_ai.output.messages when responseText is provided', () => {
    const span = makeSpan();
    setGenAiResponseAttrs(span as never, { input_tokens: 5, output_tokens: 15 }, 'end_turn', 'hello world');
    expect(span.setAttribute).toHaveBeenCalledWith('gen_ai.output.messages', JSON.stringify([{
      role: 'assistant',
      parts: [{ type: 'text', content: 'hello world' }],
      finish_reason: 'end_turn',
    }]));
  });

  it('omits gen_ai.output.messages when responseText is undefined', () => {
    const span = makeSpan();
    setGenAiResponseAttrs(span as never, { input_tokens: 5, output_tokens: 15 }, 'end_turn');
    expect(span._attrs.has('gen_ai.output.messages')).toBe(false);
  });
});

describe('extractJson', () => {
  it('extracts a simple JSON object', () => {
    expect(extractJson('{"status": "resolved", "reasoning": "Fixed"}')).toBe(
      '{"status": "resolved", "reasoning": "Fixed"}'
    );
  });

  it('extracts JSON from surrounding prose', () => {
    const text = 'Here is my analysis:\n{"status": "not_attempted", "reasoning": "No changes"}\nDone.';
    expect(extractJson(text)).toBe('{"status": "not_attempted", "reasoning": "No changes"}');
  });

  it('extracts JSON from markdown code fences', () => {
    const text = '```json\n{"status": "resolved", "reasoning": "Fixed the bug"}\n```';
    expect(extractJson(text)).toBe('{"status": "resolved", "reasoning": "Fixed the bug"}');
  });

  it('extracts JSON array', () => {
    const text = 'Results: [{"findingIndex": 1, "existingIndex": 2}]';
    expect(extractJson(text)).toBe('[{"findingIndex": 1, "existingIndex": 2}]');
  });

  it('extracts empty JSON array', () => {
    expect(extractJson('[]')).toBe('[]');
  });

  it('handles nested objects', () => {
    const text = '{"outer": {"inner": {"deep": true}}, "status": "ok"}';
    expect(extractJson(text)).toBe('{"outer": {"inner": {"deep": true}}, "status": "ok"}');
  });

  it('returns null when no JSON found', () => {
    expect(extractJson('This is just plain text with no JSON')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractJson('')).toBeNull();
  });

  it('handles prefilled JSON (starts with {)', () => {
    const text = '{"status": "resolved", "reasoning": "The fix was applied correctly"}';
    expect(extractJson(text)).toBe(text);
  });

  it('handles prefilled JSON (starts with [)', () => {
    const text = '[{"findingIndex": 1, "existingIndex": 1}]';
    expect(extractJson(text)).toBe(text);
  });

  it('handles code fence with language tag', () => {
    const text = '```typescript\n{"value": 42}\n```';
    expect(extractJson(text)).toBe('{"value": 42}');
  });

  it('extracts fenced JSON when a JSON string contains markdown fences', () => {
    const text = 'Now I have enough context.\n```json\n{"skillBody":"Use this example: ```ts\\nconst x = 1;\\n```","specMd":"# Spec"}\n```';
    expect(extractJson(text)).toBe(
      '{"skillBody":"Use this example: ```ts\\nconst x = 1;\\n```","specMd":"# Spec"}'
    );
  });

  it('handles JSON with escaped quotes in strings', () => {
    const text = '{"reasoning": "The \\"fix\\" was incomplete"}';
    expect(extractJson(text)).toBe('{"reasoning": "The \\"fix\\" was incomplete"}');
  });

  it('chooses first valid JSON when multiple closers exist', () => {
    // The function scans for the first valid JSON from the first { or [
    const text = '{"a": 1} extra text {"b": 2}';
    expect(extractJson(text)).toBe('{"a": 1}');
  });

  it('skips orphaned prefill before prose and valid JSON', () => {
    const text = '{Here is the JSON:\n{"findings": []}\nDone.';
    expect(extractJson(text)).toBe('{"findings": []}');
  });
});
