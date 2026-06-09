import { describe, it, expect } from 'vitest';
import { anthropicUsageToStats, apiUsageToStats, estimateUsageCostBreakdown } from './pricing.js';
import rawPricing from './model-pricing.json' with { type: 'json' };

describe('model-pricing.json', () => {
  it('has an entry for claude-haiku-4-5', () => {
    const entry = rawPricing['claude-haiku-4-5'];
    expect(entry).toBeDefined();
    expect(entry.inputPerMTok).toBe(1);
    expect(entry.outputPerMTok).toBe(5);
    expect(entry.cacheReadPerMTok).toBe(0.1);
    expect(entry.cacheWritePerMTok).toBe(1.25);
    expect(entry.cacheWrite1hPerMTok).toBe(2);
    expect(entry.webSearchPer1K).toBe(10);
  });

  it('has an entry for claude-opus-4-7', () => {
    const entry = rawPricing['claude-opus-4-7'];
    expect(entry).toBeDefined();
    expect(entry.inputPerMTok).toBe(5);
    expect(entry.outputPerMTok).toBe(25);
    expect(entry.cacheReadPerMTok).toBe(0.5);
    expect(entry.cacheWritePerMTok).toBe(6.25);
  });

  it('fills current-generation pricing gaps from canonical variants', () => {
    expect(rawPricing['claude-opus-4-6']).toMatchObject({
      inputPerMTok: 5,
      outputPerMTok: 25,
      cacheReadPerMTok: 0.5,
      cacheWritePerMTok: 6.25,
      cacheWrite1hPerMTok: 10,
      webSearchPer1K: 10,
    });
    expect(rawPricing['claude-sonnet-4-6']).toMatchObject({
      inputPerMTok: 3,
      outputPerMTok: 15,
      cacheReadPerMTok: 0.3,
      cacheWritePerMTok: 3.75,
      cacheWrite1hPerMTok: 6,
      webSearchPer1K: 10,
    });
  });
});

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
      inputTokens: 1_109_406,
      outputTokens: 12_202,
      cacheReadInputTokens: 822_069,
      cacheCreationInputTokens: 284_208,
      cacheCreation5mInputTokens: 284_208,
      cacheCreation1hInputTokens: 0,
      webSearchRequests: 0,
      costUSD: 2.9181204,
    };

    const breakdown = estimateUsageCostBreakdown('claude-sonnet-4-5-20250929', stats);

    expect(breakdown).toBeDefined();
    expect(breakdown!.freshInputUSD).toBeCloseTo(0.018774, 6);
    expect(breakdown!.cacheReadUSD).toBeCloseTo(0.4932414, 6);
    expect(breakdown!.cacheCreation5mUSD).toBeCloseTo(2.13156, 6);
    expect(breakdown!.outputUSD).toBeCloseTo(0.274545, 6);
    expect(breakdown!.totalUSD).toBeCloseTo(stats.costUSD, 6);
  });

  it('uses Sonnet 4.5 long-context pricing above 200k input tokens', () => {
    expect(apiUsageToStats('claude-sonnet-4-5-20250929', {
      input_tokens: 300_000,
      output_tokens: 1_000,
    }).costUSD).toBeCloseTo(1.8225, 6);
  });

  it('keeps Sonnet 4.6 at standard pricing above 200k input tokens', () => {
    expect(apiUsageToStats('claude-sonnet-4-6-20260301', {
      input_tokens: 300_000,
      output_tokens: 1_000,
    }).costUSD).toBeCloseTo(0.915, 6);
  });

  it('keeps Sonnet 4.7 aliases at standard pricing above 200k input tokens', () => {
    expect(apiUsageToStats('claude-sonnet-4-7-20260501', {
      input_tokens: 300_000,
      output_tokens: 1_000,
    }).costUSD).toBeCloseTo(0.915, 6);
  });

  it('calculates cost for alternate Claude SDK model id shapes', () => {
    expect(apiUsageToStats('claude-sonnet-4-20250514', {
      input_tokens: 1000,
      output_tokens: 500,
    }).costUSD).toBeCloseTo(0.0105, 6);
    expect(apiUsageToStats('claude-4-opus-20250514', {
      input_tokens: 1000,
      output_tokens: 500,
    }).costUSD).toBeCloseTo(0.0525, 6);
    expect(apiUsageToStats('claude-sonnet-4-6', {
      input_tokens: 1000,
      output_tokens: 500,
    }).costUSD).toBeCloseTo(0.0105, 6);
    expect(apiUsageToStats('claude-sonnet-4-7', {
      input_tokens: 1000,
      output_tokens: 500,
    }).costUSD).toBeCloseTo(0.0105, 6);
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

    // inputTokens is total: raw (1000) + no cache = 1000
    expect(stats.inputTokens).toBe(1000);
    expect(stats.outputTokens).toBe(500);
    expect(stats.costUSD).toBe(0);
  });
});
