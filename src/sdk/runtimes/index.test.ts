import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  claudeRuntime,
  getRuntime,
  getRuntimeProviderOptions,
  piRuntime,
} from './index.js';

describe('runtimes', () => {
  it('exposes Pi as the default runtime provider', () => {
    const runtime = getRuntime();

    expect(runtime).toBe(piRuntime);
    expect(runtime.name).toBe('pi');
    expect(runtime.runSkill).toBeTypeOf('function');
    expect(runtime.runAuxiliary).toBeTypeOf('function');
    expect(runtime.runSynthesis).toBeTypeOf('function');
  });

  it('exposes Claude as an opt-in runtime provider', () => {
    const runtime = getRuntime('claude');

    expect(runtime).toBe(claudeRuntime);
    expect(runtime.name).toBe('claude');
    expect(runtime.runSkill).toBeTypeOf('function');
    expect(runtime.runAuxiliary).toBeTypeOf('function');
    expect(runtime.runSynthesis).toBeTypeOf('function');
  });

  it('rejects unsupported runtimes explicitly', () => {
    expect(() => getRuntime('bogus' as never)).toThrow('Unsupported runtime: bogus');
  });

  it('builds provider options at the runtime boundary', () => {
    expect(getRuntimeProviderOptions('claude', {
      pathToClaudeCodeExecutable: '/bin/claude',
    })).toEqual({
      pathToClaudeCodeExecutable: '/bin/claude',
    });

    expect(getRuntimeProviderOptions('pi', {
      pathToClaudeCodeExecutable: '/bin/claude',
    })).toBeUndefined();
  });

  it('fails auxiliary calls clearly when Claude auth is missing', async () => {
    const result = await getRuntime('claude').runAuxiliary({
      task: 'extraction',
      prompt: 'Return {"ok": true}',
      schema: z.object({ ok: z.boolean() }),
    });

    expect(result).toEqual({
      success: false,
      error: 'Anthropic API key required for Claude auxiliary runtime',
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheCreation5mInputTokens: 0,
        cacheCreation1hInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0,
      },
    });
  });

  it('fails synthesis calls clearly when Claude auth is missing', async () => {
    const result = await getRuntime('claude').runSynthesis({
      task: 'consolidation',
      prompt: 'Return []',
      schema: z.array(z.array(z.number())),
    });

    expect(result).toEqual({
      success: false,
      error: 'Anthropic API key required for Claude synthesis runtime',
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheCreation5mInputTokens: 0,
        cacheCreation1hInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0,
      },
    });
  });
});
