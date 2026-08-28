import { describe, expect, it } from 'vitest';
import {
  PI_MAX_OUTPUT_TOKENS,
  PI_MIN_INPUT_RESERVATION_TOKENS,
  clampPiCatalogMaxTokens,
} from './pi-model-tokens.js';

describe('clampPiCatalogMaxTokens', () => {
  it('caps remote Grok-style maxTokens (450k of 500k) to the generation ceiling', () => {
    const model = {
      id: 'x-ai/grok-4.5',
      contextWindow: 500_000,
      maxTokens: 450_000,
    };

    expect(clampPiCatalogMaxTokens(model)).toEqual({
      ...model,
      maxTokens: PI_MAX_OUTPUT_TOKENS,
    });

    // Even with estimate=0, input + max_tokens stays under context for normal prompts.
    const clamped = clampPiCatalogMaxTokens(model).maxTokens!;
    expect(52_078 + clamped).toBeLessThanOrEqual(500_000);
    expect(clamped + PI_MIN_INPUT_RESERVATION_TOKENS).toBeLessThanOrEqual(500_000);
  });

  it('caps kimi-k2.6-style 90%-of-context maxTokens the same way', () => {
    const model = {
      id: 'moonshotai/kimi-k2.6',
      contextWindow: 262_144,
      maxTokens: 235_929,
    };

    expect(clampPiCatalogMaxTokens(model).maxTokens).toBe(PI_MAX_OUTPUT_TOKENS);
  });

  it('leaves modest catalog maxTokens alone (Sonnet/GPT-shaped budgets)', () => {
    const sonnet = {
      id: 'anthropic/claude-sonnet-4.6',
      contextWindow: 1_000_000,
      maxTokens: 128_000,
    };
    const gpt = {
      id: 'openai/gpt-5.5',
      contextWindow: 1_050_000,
      maxTokens: 128_000,
    };
    const haiku = {
      id: 'anthropic/claude-haiku-4.5',
      contextWindow: 200_000,
      maxTokens: 64_000,
    };

    expect(clampPiCatalogMaxTokens(sonnet)).toBe(sonnet);
    expect(clampPiCatalogMaxTokens(gpt)).toBe(gpt);
    expect(clampPiCatalogMaxTokens(haiku)).toBe(haiku);
  });

  it('no-ops when context or maxTokens are missing', () => {
    const bare: { id: string; provider: string; contextWindow?: number; maxTokens?: number } = {
      id: 'gpt-test',
      provider: 'openai',
    };
    expect(clampPiCatalogMaxTokens(bare)).toBe(bare);
    expect(clampPiCatalogMaxTokens({ ...bare, contextWindow: 0, maxTokens: 100 })).toEqual({
      ...bare,
      contextWindow: 0,
      maxTokens: 100,
    });
  });

  it('on small windows reserves at most half the context', () => {
    const model = {
      id: 'small',
      contextWindow: 32_000,
      maxTokens: 30_000,
    };

    // reservation = min(128k, 16k) = 16k → ceiling = min(128k, 16k) = 16k
    expect(clampPiCatalogMaxTokens(model).maxTokens).toBe(16_000);
  });
});
