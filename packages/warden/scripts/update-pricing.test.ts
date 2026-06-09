import { describe, expect, it } from 'vitest';
import { buildAnthropicPricing } from './update-pricing.js';

describe('buildAnthropicPricing', () => {
  it('uses the applicable price alternative for array-shaped upstream prices', () => {
    const pricing = buildAnthropicPricing([
      {
        id: 'anthropic',
        models: [
          {
            id: 'claude-example-4-6',
            name: 'Claude Example 4.6',
            prices: [
              {
                prices: {
                  input_mtok: { base: 3, tiers: [{ start: 200000, price: 6 }] },
                  output_mtok: { base: 15, tiers: [{ start: 200000, price: 22.5 }] },
                  cache_read_mtok: { base: 0.3, tiers: [{ start: 200000, price: 0.6 }] },
                  cache_write_mtok: { base: 3.75, tiers: [{ start: 200000, price: 7.5 }] },
                },
              },
              {
                constraint: { start_date: '2026-03-13' },
                prices: {
                  input_mtok: 3,
                  output_mtok: 15,
                  cache_read_mtok: 0.3,
                  cache_write_mtok: 3.75,
                },
              },
            ],
          },
        ],
      },
    ], new Date('2026-05-29T00:00:00Z'));

    expect(pricing['claude-example-4-6']).toEqual({
      inputPerMTok: 3,
      outputPerMTok: 15,
      cacheReadPerMTok: 0.3,
      cacheWritePerMTok: 3.75,
      cacheWrite1hPerMTok: 6,
      webSearchPer1K: 10,
    });
  });

  it('skips upstream entries without token prices', () => {
    const pricing = buildAnthropicPricing([
      {
        id: 'anthropic',
        models: [
          {
            id: 'claude-empty-price',
            name: 'Claude Empty Price',
            prices: {},
          },
        ],
      },
    ], new Date('2026-05-29T00:00:00Z'));

    expect(pricing).not.toHaveProperty('claude-empty-price');
  });
});
