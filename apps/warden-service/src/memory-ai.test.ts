import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createGatewayProvider: vi.fn(),
  embed: vi.fn(),
  generateObject: vi.fn(),
  getVercelOidcToken: vi.fn(),
}));

vi.mock('@ai-sdk/gateway', () => ({ createGatewayProvider: mocks.createGatewayProvider }));
vi.mock('@vercel/oidc', () => ({ getVercelOidcToken: mocks.getVercelOidcToken }));
vi.mock('ai', () => ({ embed: mocks.embed, generateObject: mocks.generateObject }));

import { createHostedMemoryRuntime } from './memory-ai.js';

describe('hosted memory AI runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVercelOidcToken.mockResolvedValue('oidc-token');
    mocks.createGatewayProvider.mockReturnValue({
      chat: (model: string) => `chat:${model}`,
      embeddingModel: (model: string) => `embedding:${model}`,
    });
  });

  it('extracts bounded memory proposals through AI Gateway with attributed usage', async () => {
    mocks.generateObject.mockResolvedValue({
      object: {
        proposals: [{
          kind: 'confirmed_pattern',
          content: 'Use the repository parser for untrusted input.',
          evidenceIds: ['observation-1', 'observation-2'],
          skill: 'security',
          confidence: 0.8,
        }],
      },
      usage: { inputTokens: 100, outputTokens: 20 },
    });
    const runtime = createHostedMemoryRuntime({
      memoryModel: 'openai/gpt-5.6-luna',
      embeddingModel: 'openai/text-embedding-3-small',
      environment: {},
    });

    const result = await runtime.extractor.extract({
      runId: 'run-1',
      evidence: [{
        findingId: 'finding-1', observationId: 'observation-1', runId: 'run-1',
        skill: 'security', title: 'Unsafe input', description: 'Input reaches a sink.',
        outcome: 'resolved', observedAt: '2026-08-14T10:00:00.000Z',
      }],
    });

    expect(mocks.createGatewayProvider).toHaveBeenCalledWith({ apiKey: 'oidc-token' });
    expect(mocks.generateObject).toHaveBeenCalledWith(expect.objectContaining({
      model: 'chat:openai/gpt-5.6-luna',
    }));
    expect(result.usage).toEqual(expect.objectContaining({
      provider: 'vercel-ai-gateway', model: 'openai/gpt-5.6-luna',
      inputTokens: 100, outputTokens: 20, costUsd: 0.000044, costBasis: 'estimated',
    }));
  });

  it('embeds memory through the API-key fallback with attributed cost', async () => {
    mocks.getVercelOidcToken.mockResolvedValue(undefined);
    mocks.embed.mockResolvedValue({
      embedding: Array.from({ length: 1_536 }, () => 0.01),
      usage: { tokens: 50 },
    });
    const runtime = createHostedMemoryRuntime({
      memoryModel: 'openai/gpt-5.6-luna',
      embeddingModel: 'openai/text-embedding-3-small',
      environment: { AI_GATEWAY_API_KEY: 'gateway-key' },
    });

    const result = await runtime.embedding.embed('Use the repository parser.');

    expect(mocks.createGatewayProvider).toHaveBeenCalledWith({ apiKey: 'gateway-key' });
    expect(mocks.embed).toHaveBeenCalledWith(expect.objectContaining({
      model: 'embedding:openai/text-embedding-3-small',
    }));
    expect(result.vector).toHaveLength(1_536);
    expect(result.usage).toEqual(expect.objectContaining({
      inputTokens: 50, costUsd: 0.000001, costBasis: 'estimated',
    }));
  });

  it('fails closed when AI Gateway has no credential', async () => {
    mocks.getVercelOidcToken.mockResolvedValue(undefined);
    const runtime = createHostedMemoryRuntime({
      memoryModel: 'openai/gpt-5.6-luna',
      embeddingModel: 'openai/text-embedding-3-small',
      environment: {},
    });

    await expect(runtime.relevance.classify({ skills: [], languages: [], paths: [], candidates: [] }))
      .rejects.toThrow('memory_gateway_unavailable');
  });
});
