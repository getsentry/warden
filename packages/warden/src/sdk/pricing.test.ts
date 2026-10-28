import { describe, it, expect } from 'vitest';
import { anthropicUsageToStats, apiUsageToStats, estimateUsageCostBreakdown } from './pricing.js';

describe('apiUsageToStats', () => {
  it('keeps the deprecated name as an alias for the public Anthropic helper', () => {
    expect(apiUsageToStats).toBe(anthropicUsageToStats);
  });

  it('calculates cost for claude-haiku-4-5', () => {
    const stats = apiUsageToStats('claude-haiku-4-5', {
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 200,
      cache_creation_input_tokens: 100,
    });

    // inputTokens is total: raw (1000) + cache_read (200) + cache_creation (100) = 1300
    expect(stats.inputTokens).toBe(1300);
    expect(stats.outputTokens).toBe(500);
    expect(stats.cacheReadInputTokens).toBe(200);
    expect(stats.cacheCreationInputTokens).toBe(100);

    // Cost: 1000 * 1.00/1M + 500 * 5.00/1M + 200 * 0.10/1M + 100 * 1.25/1M
    //      = 0.001 + 0.0025 + 0.00002 + 0.000125 = 0.003645
    expect(stats.costUSD).toBeCloseTo(0.003645, 6);
  });

  it('calculates cost for dated model ids from their base pricing', () => {
    const stats = apiUsageToStats('claude-haiku-4-5-20251001', {
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 200,
      cache_creation_input_tokens: 100,
    });

    expect(stats.costUSD).toBeCloseTo(0.003645, 6);
  });

  it('includes cache write tiers and web search request charges', () => {
    const stats = apiUsageToStats('claude-haiku-4-5', {
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 200,
      cache_creation_input_tokens: 300,
      cache_creation: {
        ephemeral_5m_input_tokens: 100,
        ephemeral_1h_input_tokens: 200,
      },
      server_tool_use: {
        web_search_requests: 2,
      },
    });

    expect(stats.inputTokens).toBe(1500);
    expect(stats.outputTokens).toBe(500);
    expect(stats.costUSD).toBeCloseTo(0.024045, 6);

    const breakdown = estimateUsageCostBreakdown('claude-haiku-4-5', stats);
    expect(breakdown?.cacheCreation5mUSD).toBeCloseTo(0.000125, 6);
    expect(breakdown?.cacheCreation1hUSD).toBeCloseTo(0.0004, 6);
    expect(breakdown?.webSearchUSD).toBeCloseTo(0.02, 6);
  });

  it('counts tiered cache writes even when the aggregate cache field is absent', () => {
    const stats = apiUsageToStats('claude-haiku-4-5', {
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 200,
      cache_creation: {
        ephemeral_5m_input_tokens: 100,
        ephemeral_1h_input_tokens: 200,
      },
    });

    expect(stats.inputTokens).toBe(1500);
    expect(stats.cacheCreationInputTokens).toBe(300);
    expect(stats.cacheCreation5mInputTokens).toBe(100);
    expect(stats.cacheCreation1hInputTokens).toBe(200);
    expect(stats.costUSD).toBeCloseTo(0.004045, 6);
  });

  it('breaks down cost by billed token category', () => {
    const stats = {
      inputTokens: 909_406,
      outputTokens: 12_202,
      cacheReadInputTokens: 622_069,
      cacheCreationInputTokens: 284_208,
      cacheCreation5mInputTokens: 284_208,
      cacheCreation1hInputTokens: 0,
      webSearchRequests: 0,
      costUSD: 1.4448177,
    };

    const breakdown = estimateUsageCostBreakdown('claude-sonnet-4-6', stats);

    expect(breakdown).toBeDefined();
    expect(breakdown!.freshInputUSD).toBeCloseTo(0.009387, 6);
    expect(breakdown!.cacheReadUSD).toBeCloseTo(0.1866207, 6);
    expect(breakdown!.cacheCreation5mUSD).toBeCloseTo(1.06578, 6);
    expect(breakdown!.outputUSD).toBeCloseTo(0.18303, 6);
    expect(breakdown!.totalUSD).toBeCloseTo(stats.costUSD, 6);
  });

  it('uses Pi standard pricing for Sonnet 4.6 above 200k input tokens', () => {
    expect(apiUsageToStats('claude-sonnet-4-6', {
      input_tokens: 300_000,
      output_tokens: 1_000,
    }).costUSD).toBeCloseTo(0.915, 6);
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

  it('returns zero cost for a model absent from Pi', () => {
    const stats = apiUsageToStats('claude-sonnet-4-7-20260501', {
      input_tokens: 1000,
      output_tokens: 500,
    });

    // inputTokens is total: raw (1000) + no cache = 1000
    expect(stats.inputTokens).toBe(1000);
    expect(stats.outputTokens).toBe(500);
    expect(stats.costUSD).toBe(0);
  });
});
