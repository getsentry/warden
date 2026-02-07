import { describe, it, expect } from 'vitest';
import { apiUsageToStats } from './pricing.js';
import rawPricing from './model-pricing.json' with { type: 'json' };

describe('model-pricing.json', () => {
  it('has an entry for claude-haiku-4-5', () => {
    const entry = rawPricing['claude-haiku-4-5'];
    expect(entry).toBeDefined();
    expect(entry.inputPerMTok).toBe(1);
    expect(entry.outputPerMTok).toBe(5);
    expect(entry.cacheReadPerMTok).toBe(0.1);
    expect(entry.cacheWritePerMTok).toBe(1.25);
  });
});

describe('apiUsageToStats', () => {
  it('calculates cost for claude-haiku-4-5', () => {
    const stats = apiUsageToStats('claude-haiku-4-5', {
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 200,
      cache_creation_input_tokens: 100,
    });

    expect(stats.inputTokens).toBe(1000);
    expect(stats.outputTokens).toBe(500);
    expect(stats.cacheReadInputTokens).toBe(200);
    expect(stats.cacheCreationInputTokens).toBe(100);

    // Cost: 1000 * 1.00/1M + 500 * 5.00/1M + 200 * 0.10/1M + 100 * 1.25/1M
    //      = 0.001 + 0.0025 + 0.00002 + 0.000125 = 0.003645
    expect(stats.costUSD).toBeCloseTo(0.003645, 6);
  });

  it('handles null cache fields', () => {
    const stats = apiUsageToStats('claude-haiku-4-5', {
      input_tokens: 500,
      output_tokens: 100,
      cache_read_input_tokens: null,
      cache_creation_input_tokens: null,
    });

    expect(stats.cacheReadInputTokens).toBe(0);
    expect(stats.cacheCreationInputTokens).toBe(0);
    expect(stats.costUSD).toBeCloseTo(500 * 1.00 / 1_000_000 + 100 * 5.00 / 1_000_000, 6);
  });

  it('handles missing cache fields', () => {
    const stats = apiUsageToStats('claude-haiku-4-5', {
      input_tokens: 500,
      output_tokens: 100,
    });

    expect(stats.cacheReadInputTokens).toBe(0);
    expect(stats.cacheCreationInputTokens).toBe(0);
  });

  it('returns zero cost for unknown model', () => {
    const stats = apiUsageToStats('unknown-model', {
      input_tokens: 1000,
      output_tokens: 500,
    });

    expect(stats.inputTokens).toBe(1000);
    expect(stats.outputTokens).toBe(500);
    expect(stats.costUSD).toBe(0);
  });
});
