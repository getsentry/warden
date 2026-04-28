import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { claudeAgentRuntime } from '../runtimes/claude.js';
import {
  claudeFastModelRuntime,
  getAgentRuntime,
  getFastModelRuntime,
  getRuntimeProvider,
} from './index.js';

describe('runtime providers', () => {
  it('exposes Claude as the default provider with agent and fast-model capabilities', () => {
    const provider = getRuntimeProvider();

    expect(provider.name).toBe('claude');
    expect(provider.agent).toBe(claudeAgentRuntime);
    expect(provider.fastModel).toBe(claudeFastModelRuntime);
    expect(getAgentRuntime()).toBe(claudeAgentRuntime);
    expect(getFastModelRuntime()).toBe(claudeFastModelRuntime);
  });

  it('rejects unsupported providers explicitly', () => {
    expect(() => getRuntimeProvider('pi')).toThrow('Unsupported runtime provider: pi');
  });

  it('fails fast-model calls clearly when the provider is missing auth', async () => {
    const result = await getFastModelRuntime().generateObject({
      prompt: 'Return {"ok": true}',
      schema: z.object({ ok: z.boolean() }),
    });

    expect(result).toEqual({
      success: false,
      error: 'Anthropic API key required for Claude fast-model runtime',
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        costUSD: 0,
      },
    });
  });
});
