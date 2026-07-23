import { InMemoryCredentialStore } from '@earendil-works/pi-ai';
import { getBuiltinModel } from '@earendil-works/pi-ai/providers/all';
import { ModelRuntime } from '@earendil-works/pi-coding-agent';
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

  it('includes Kimi K3 through OpenRouter with supported effort levels', async () => {
    const modelRuntime = await ModelRuntime.create({
      credentials: new InMemoryCredentialStore(),
      modelsPath: null,
    });

    expect(modelRuntime.getModel('openrouter', 'moonshotai/kimi-k3')).toMatchObject({
      id: 'moonshotai/kimi-k3',
      name: 'MoonshotAI: Kimi K3',
      provider: 'openrouter',
      reasoning: true,
      contextWindow: 1_048_576,
      maxTokens: 131_072,
      compat: { thinkingFormat: 'openrouter' },
    });
  });
});
