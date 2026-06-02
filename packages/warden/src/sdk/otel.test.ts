import { describe, expect, it } from 'vitest';
import { genAiProviderName, genAiUsageAttributes } from './otel.js';

describe('OpenTelemetry GenAI provider attribution', () => {
  it('uses provider ids from model selectors', () => {
    expect(genAiProviderName('pi', 'openai/gpt-test')).toBe('openai');
    expect(genAiProviderName('pi', 'anthropic/claude-test')).toBe('anthropic');
    expect(genAiProviderName('pi', 'xai/grok-test')).toBe('x_ai');
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
