import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  claudeAgentRuntime,
  claudeFastModelRuntime,
  getAgentRuntime,
  getFastModelRuntime,
  getRuntime,
} from './index.js';

describe('runtimes', () => {
  it('exposes Claude as the default runtime with agent and fast-model capabilities', () => {
    const runtime = getRuntime();

    expect(runtime.name).toBe('claude');
    expect(runtime.agent).toBe(claudeAgentRuntime);
    expect(runtime.fastModel).toBe(claudeFastModelRuntime);
    expect(getAgentRuntime()).toBe(claudeAgentRuntime);
    expect(getFastModelRuntime()).toBe(claudeFastModelRuntime);
  });

  it('rejects unsupported runtimes explicitly', () => {
    expect(() => getRuntime('pi' as never)).toThrow('Unsupported runtime: pi');
  });

  it('fails fast-model calls clearly when Claude auth is missing', async () => {
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
