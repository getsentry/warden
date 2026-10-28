import { describe, it, expect } from 'vitest';
import {
  aggregateAuxiliaryUsage,
  aggregateAuxiliaryUsageAttribution,
  extractUsage,
  mergeAuxiliaryUsage,
  mergeAuxiliaryUsageAttribution,
} from './usage.js';
import type { UsageStats } from '../types/index.js';

const makeUsage = (input: number, output: number, cost: number): UsageStats => ({
  inputTokens: input,
  outputTokens: output,
  costUSD: cost,
});

describe('extractUsage', () => {
  it('counts cached input tokens in total input tokens', () => {
    expect(extractUsage({
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_read_input_tokens: 2,
        cache_creation_input_tokens: 3,
      },
      total_cost_usd: 0.01,
    })).toEqual({
      inputTokens: 15,
      outputTokens: 5,
      cacheReadInputTokens: 2,
      cacheCreationInputTokens: 3,
      cacheCreation5mInputTokens: 3,
      cacheCreation1hInputTokens: 0,
      webSearchRequests: 0,
      costUSD: 0.01,
    });
  });

  it('returns valid zero usage when runtime usage is absent', () => {
    expect(extractUsage({})).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheCreation5mInputTokens: 0,
      cacheCreation1hInputTokens: 0,
      webSearchRequests: 0,
      costUSD: 0,
    });
  });

  it('counts tiered cache writes when the aggregate cache field is absent', () => {
    expect(extractUsage({
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_read_input_tokens: 2,
        cache_creation: {
          ephemeral_5m_input_tokens: 3,
          ephemeral_1h_input_tokens: 4,
        },
      },
      total_cost_usd: 0.01,
    })).toEqual({
      inputTokens: 19,
      outputTokens: 5,
      cacheReadInputTokens: 2,
      cacheCreationInputTokens: 7,
      cacheCreation5mInputTokens: 3,
      cacheCreation1hInputTokens: 4,
      webSearchRequests: 0,
      costUSD: 0.01,
    });
  });
});

describe('aggregateAuxiliaryUsage', () => {
  it('returns undefined for empty entries', () => {
    expect(aggregateAuxiliaryUsage([])).toBeUndefined();
  });

  it('creates map from single entry', () => {
    const result = aggregateAuxiliaryUsage([
      { agent: 'extraction', usage: makeUsage(100, 50, 0.001) },
    ]);

    expect(result).toEqual({
      extraction: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
    });
  });

  it('merges multiple entries for the same agent', () => {
    const result = aggregateAuxiliaryUsage([
      { agent: 'extraction', usage: makeUsage(100, 50, 0.001) },
      { agent: 'extraction', usage: makeUsage(200, 80, 0.002) },
    ]);

    expect(result).toEqual({
      extraction: {
        inputTokens: 300,
        outputTokens: 130,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheCreation5mInputTokens: 0,
        cacheCreation1hInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0.003,
      },
    });
  });

  it('separates different agents', () => {
    const result = aggregateAuxiliaryUsage([
      { agent: 'extraction', usage: makeUsage(100, 50, 0.001) },
      { agent: 'dedup', usage: makeUsage(200, 80, 0.002) },
    ]);

    expect(result).toEqual({
      extraction: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
      dedup: { inputTokens: 200, outputTokens: 80, costUSD: 0.002 },
    });
  });

  it('merges cache token fields', () => {
    const result = aggregateAuxiliaryUsage([
      { agent: 'extraction', usage: { inputTokens: 100, outputTokens: 50, cacheReadInputTokens: 10, cacheCreationInputTokens: 5, costUSD: 0.001 } },
      { agent: 'extraction', usage: { inputTokens: 100, outputTokens: 50, cacheReadInputTokens: 20, cacheCreationInputTokens: 10, costUSD: 0.001 } },
    ]);

    expect(result!['extraction']!.cacheReadInputTokens).toBe(30);
    expect(result!['extraction']!.cacheCreationInputTokens).toBe(15);
  });

  it('merges cache tiers and web search fields', () => {
    const result = aggregateAuxiliaryUsage([
      {
        agent: 'extraction',
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheCreation5mInputTokens: 5,
          cacheCreation1hInputTokens: 7,
          webSearchRequests: 2,
          costUSD: 0.001,
        },
      },
      {
        agent: 'extraction',
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheCreation5mInputTokens: 3,
          cacheCreation1hInputTokens: 4,
          webSearchRequests: 1,
          costUSD: 0.001,
        },
      },
    ]);

    expect(result!['extraction']!.cacheCreation5mInputTokens).toBe(8);
    expect(result!['extraction']!.cacheCreation1hInputTokens).toBe(11);
    expect(result!['extraction']!.webSearchRequests).toBe(3);
  });
});

describe('mergeAuxiliaryUsage', () => {
  it('returns undefined when both are undefined', () => {
    expect(mergeAuxiliaryUsage(undefined, undefined)).toBeUndefined();
  });

  it('returns first when second is undefined', () => {
    const a = { extraction: makeUsage(100, 50, 0.001) };
    expect(mergeAuxiliaryUsage(a, undefined)).toEqual(a);
  });

  it('returns second when first is undefined', () => {
    const b = { dedup: makeUsage(200, 80, 0.002) };
    expect(mergeAuxiliaryUsage(undefined, b)).toEqual(b);
  });

  it('merges both maps', () => {
    const a = { extraction: makeUsage(100, 50, 0.001) };
    const b = { dedup: makeUsage(200, 80, 0.002) };
    const result = mergeAuxiliaryUsage(a, b);

    expect(result).toEqual({
      extraction: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
      dedup: { inputTokens: 200, outputTokens: 80, costUSD: 0.002 },
    });
  });

  it('sums same-agent entries across maps', () => {
    const a = { extraction: makeUsage(100, 50, 0.001) };
    const b = { extraction: makeUsage(200, 80, 0.002) };
    const result = mergeAuxiliaryUsage(a, b);

    expect(result).toEqual({
      extraction: {
        inputTokens: 300,
        outputTokens: 130,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheCreation5mInputTokens: 0,
        cacheCreation1hInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0.003,
      },
    });
  });
});

describe('aggregateAuxiliaryUsageAttribution', () => {
  it('returns undefined when entries have no attribution', () => {
    expect(aggregateAuxiliaryUsageAttribution([
      { agent: 'extraction', usage: makeUsage(100, 50, 0.001) },
    ])).toBeUndefined();
  });

  it('uses singular model/runtime for one attributed agent', () => {
    expect(aggregateAuxiliaryUsageAttribution([
      { agent: 'verification', usage: makeUsage(100, 50, 0.001), model: 'verify-model', runtime: 'pi' },
      { agent: 'verification', usage: makeUsage(10, 5, 0.0001), model: 'verify-model', runtime: 'pi' },
    ])).toEqual({
      verification: { model: 'verify-model', runtime: 'pi' },
    });
  });

  it('uses model arrays when one agent has mixed attribution', () => {
    expect(aggregateAuxiliaryUsageAttribution([
      { agent: 'verification', usage: makeUsage(100, 50, 0.001), model: 'model-b', runtime: 'pi' },
      { agent: 'verification', usage: makeUsage(10, 5, 0.0001), model: 'model-a', runtime: 'claude' },
    ])).toEqual({
      verification: {
        models: ['model-a', 'model-b'],
        runtimes: ['claude', 'pi'],
      },
    });
  });
});

describe('mergeAuxiliaryUsageAttribution', () => {
  it('merges singular and array attribution', () => {
    expect(mergeAuxiliaryUsageAttribution(
      { verification: { model: 'model-a', runtime: 'pi' } },
      { verification: { models: ['model-b'], runtime: 'claude' } },
    )).toEqual({
      verification: {
        models: ['model-a', 'model-b'],
        runtimes: ['claude', 'pi'],
      },
    });
  });
});
