import { describe, it, expect } from 'vitest';
import { apiUsageToStats } from './pricing.js';

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

    // Cost: 1000 * 0.80/1M + 500 * 4.00/1M + 200 * 0.08/1M + 100 * 1.00/1M
    //      = 0.0008 + 0.002 + 0.000016 + 0.0001 = 0.002916
    expect(stats.costUSD).toBeCloseTo(0.002916, 6);
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
    expect(stats.costUSD).toBeCloseTo(500 * 0.80 / 1_000_000 + 100 * 4.00 / 1_000_000, 6);
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

  it('handles the versioned model name', () => {
    const stats = apiUsageToStats('claude-haiku-4-5-20250929', {
      input_tokens: 1000,
      output_tokens: 500,
    });

    expect(stats.costUSD).toBeGreaterThan(0);
  });
});
