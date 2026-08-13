import { InMemoryCredentialStore } from '@earendil-works/pi-ai';
import { getBuiltinModel } from '@earendil-works/pi-ai/providers/all';
import { ModelRuntime } from '@earendil-works/pi-coding-agent';
import { describe, expect, it, vi } from 'vitest';

describe('Pi model catalog', () => {
  it('includes Grok 4.5 through OpenRouter', () => {
    expect(getBuiltinModel('openrouter', 'x-ai/grok-4.5')).toMatchObject({
      id: 'x-ai/grok-4.5',
      name: 'SpaceXAI: Grok 4.5',
      provider: 'openrouter',
      reasoning: true,
    });
  });

  it('loads newly published models from Pi remote catalogs', async () => {
    const remoteModel = {
      id: 'x-ai/grok-4.6',
      name: 'SpaceXAI: Grok 4.6',
      api: 'openai-completions',
      baseUrl: 'https://openrouter.ai/api/v1',
      provider: 'openrouter',
      reasoning: true,
      input: ['text', 'image'],
      cost: { input: 2, output: 6, cacheRead: 0.5, cacheWrite: 0 },
      contextWindow: 500_000,
      maxTokens: 4096,
      compat: {
        supportsDeveloperRole: false,
        thinkingFormat: 'openrouter',
      },
    };
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ [remoteModel.id]: remoteModel }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'last-modified': 'Thu, 01 Jan 2100 00:00:00 GMT',
        },
      },
    ));
    vi.stubGlobal('fetch', fetchMock);

    try {
      const credentials = new InMemoryCredentialStore();
      await credentials.modify('openrouter', async () => ({
        type: 'api_key',
        key: 'test-api-key',
      }));
      const modelRuntime = await ModelRuntime.create({
        credentials,
        modelsPath: null,
      });
      // Match production: omit allowNetwork so ModelRuntime defaults from PI_OFFLINE.
      await modelRuntime.refresh({
        providers: ['openrouter'],
        force: true,
        signal: AbortSignal.timeout(5_000),
      });

      expect(fetchMock).toHaveBeenCalledWith(
        new URL('https://pi.dev/api/models/providers/openrouter'),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(modelRuntime.getModel('openrouter', remoteModel.id)).toMatchObject(remoteModel);
    } finally {
      vi.unstubAllGlobals();
    }
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

  it('does not network-refresh catalogs when PI_OFFLINE is set', async () => {
    const previous = process.env['PI_OFFLINE'];
    process.env['PI_OFFLINE'] = '1';
    const fetchMock = vi.fn(async () => new Response('should not fetch', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    try {
      const credentials = new InMemoryCredentialStore();
      await credentials.modify('openrouter', async () => ({
        type: 'api_key',
        key: 'test-api-key',
      }));
      const modelRuntime = await ModelRuntime.create({
        credentials,
        modelsPath: null,
      });
      // Match Warden's refresh call: omit allowNetwork so ModelRuntime honors PI_OFFLINE.
      await modelRuntime.refresh({
        providers: ['openrouter'],
        signal: AbortSignal.timeout(5_000),
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(modelRuntime.getModel('openrouter', 'x-ai/grok-4.5')).toMatchObject({
        id: 'x-ai/grok-4.5',
      });
    } finally {
      vi.unstubAllGlobals();
      if (previous === undefined) {
        delete process.env['PI_OFFLINE'];
      } else {
        process.env['PI_OFFLINE'] = previous;
      }
    }
  });
});
