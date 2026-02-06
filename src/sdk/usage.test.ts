import { describe, it, expect } from 'vitest';
import { aggregateAuxiliaryUsage, mergeAuxiliaryUsage } from './usage.js';
import type { UsageStats } from '../types/index.js';

const makeUsage = (input: number, output: number, cost: number): UsageStats => ({
  inputTokens: input,
  outputTokens: output,
  costUSD: cost,
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
      extraction: { inputTokens: 300, outputTokens: 130, cacheReadInputTokens: 0, cacheCreationInputTokens: 0, costUSD: 0.003 },
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
      extraction: { inputTokens: 300, outputTokens: 130, cacheReadInputTokens: 0, cacheCreationInputTokens: 0, costUSD: 0.003 },
    });
  });
});
