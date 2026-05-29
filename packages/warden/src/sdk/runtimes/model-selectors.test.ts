import { describe, expect, it } from 'vitest';
import { assertValidPiModelSelectors, isPiModelSelector } from './model-selectors.js';

describe('isPiModelSelector', () => {
  it('accepts provider-prefixed model IDs', () => {
    expect(isPiModelSelector('openai/gpt-5.5')).toBe(true);
    expect(isPiModelSelector('fireworks/accounts/fireworks/models/kimi-k2p6')).toBe(true);
  });

  it('rejects selectors without both provider and model ID', () => {
    expect(isPiModelSelector('gpt-5.5')).toBe(false);
    expect(isPiModelSelector('/gpt-5.5')).toBe(false);
    expect(isPiModelSelector('fireworks/')).toBe(false);
  });
});

describe('assertValidPiModelSelectors', () => {
  it('allows provider-specific model IDs with slashes in every Pi model lane', () => {
    expect(() => assertValidPiModelSelectors([
      {
        runtime: 'pi',
        model: 'fireworks/accounts/fireworks/models/kimi-k2p6',
        auxiliaryModel: 'fireworks/accounts/fireworks/models/kimi-k2p6',
        synthesisModel: 'fireworks/accounts/fireworks/models/kimi-k2p6',
      },
    ])).not.toThrow();
  });
});
