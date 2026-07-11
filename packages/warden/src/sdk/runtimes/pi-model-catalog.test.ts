import { getBuiltinModel } from '@earendil-works/pi-ai/providers/all';
import { describe, expect, it } from 'vitest';

describe('Pi model catalog', () => {
  it('includes Grok 4.5 through OpenRouter', () => {
    expect(getBuiltinModel('openrouter', 'x-ai/grok-4.5')).toMatchObject({
      id: 'x-ai/grok-4.5',
      name: 'xAI: Grok 4.5',
      provider: 'openrouter',
      reasoning: true,
    });
  });
});
