import { describe, expect, it } from 'vitest';
import {
  PI_INPUT_HEADROOM_TOKENS,
  clampPiCatalogMaxTokens,
} from './pi-model-tokens.js';

describe('clampPiCatalogMaxTokens', () => {
  it('caps grok-shaped remote catalogs that leave almost no input headroom', () => {
    const clamped = clampPiCatalogMaxTokens({
      id: 'grok-4.5',
      contextWindow: 500_000,
      maxTokens: 450_000,
    });

    expect(clamped.maxTokens).toBe(500_000 - PI_INPUT_HEADROOM_TOKENS);
    expect(clamped.contextWindow).toBe(500_000);
    expect(clamped.id).toBe('grok-4.5');
    // Observed WARDEN-Y inputs (~52k) plus undercount still fit.
    expect(52_000 + (clamped.maxTokens ?? 0)).toBeLessThanOrEqual(500_000);
  });

  it('caps kimi-k2.6-shaped catalogs the same way', () => {
    const clamped = clampPiCatalogMaxTokens({
      contextWindow: 262_144,
      maxTokens: 236_000,
    });

    expect(clamped.maxTokens).toBe(262_144 - PI_INPUT_HEADROOM_TOKENS);
  });

  it('leaves sonnet/gpt-shaped modest maxTokens unchanged', () => {
    const model = {
      contextWindow: 1_000_000,
      maxTokens: 128_000,
    };

    expect(clampPiCatalogMaxTokens(model)).toBe(model);
  });

  it('no-ops when context or maxTokens are missing', () => {
    expect(clampPiCatalogMaxTokens({})).toEqual({});
    expect(clampPiCatalogMaxTokens({ contextWindow: 100_000 })).toEqual({
      contextWindow: 100_000,
    });
    expect(clampPiCatalogMaxTokens({ maxTokens: 50_000 })).toEqual({
      maxTokens: 50_000,
    });
  });

  it('reserves at most half the window on small models', () => {
    const clamped = clampPiCatalogMaxTokens({
      contextWindow: 8_000,
      maxTokens: 8_000,
    });

    expect(clamped.maxTokens).toBe(4_000);
  });
});
