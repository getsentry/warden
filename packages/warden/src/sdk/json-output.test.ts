import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { Runtime } from './runtimes/index.js';
import { parseJsonFromOutput } from './json-output.js';

const PayloadSchema = z.object({
  value: z.string(),
}).strict();

function emptyUsage() {
  return {
    inputTokens: 10,
    outputTokens: 5,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    costUSD: 0.001,
  };
}

describe('parseJsonFromOutput', () => {
  it('parses valid JSON from model output without repair', async () => {
    const result = await parseJsonFromOutput({
      output: 'Here is the result:\n{"value":"ok"}',
      schema: PayloadSchema,
    });

    expect(result).toEqual({
      success: true,
      data: { value: 'ok' },
      json: '{"value":"ok"}',
      repaired: false,
    });
  });

  it('uses the configured runtime to repair malformed JSON output', async () => {
    const runtime: Runtime = {
      name: 'claude',
      runSkill: vi.fn(),
      runSynthesis: vi.fn(),
      runAuxiliary: vi.fn(async <T>() => ({
        success: true as const,
        data: { value: 'fixed' } as T,
        usage: emptyUsage(),
      })) as unknown as Runtime['runAuxiliary'],
    };

    const result = await parseJsonFromOutput({
      output: '{"value": "fixed"',
      schema: PayloadSchema,
      repair: {
        apiKey: 'test-key',
        runtime,
        model: 'fast-model',
        maxRetries: 2,
      },
    });

    expect(result).toEqual({
      success: true,
      data: { value: 'fixed' },
      json: '{"value":"fixed"}',
      repaired: true,
      usage: emptyUsage(),
    });
    expect(runtime.runAuxiliary).toHaveBeenCalledWith(expect.objectContaining({
      task: 'extraction',
      apiKey: 'test-key',
      model: 'fast-model',
      maxRetries: 2,
      schema: PayloadSchema,
      prompt: expect.stringContaining('Extract and repair the JSON value'),
    }));
  });

  it('repairs through Pi runtime auth without an Anthropic API key', async () => {
    const runtime: Runtime = {
      name: 'pi',
      runSkill: vi.fn(),
      runSynthesis: vi.fn(),
      runAuxiliary: vi.fn(async <T>() => ({
        success: true as const,
        data: { value: 'fixed' } as T,
        usage: emptyUsage(),
      })) as unknown as Runtime['runAuxiliary'],
    };

    const result = await parseJsonFromOutput({
      output: '{"value": "fixed"',
      schema: PayloadSchema,
      repair: { runtime },
    });

    expect(result.success).toBe(true);
    expect(runtime.runAuxiliary).toHaveBeenCalledWith(expect.objectContaining({
      task: 'extraction',
      apiKey: undefined,
    }));
  });

  it('reports the local parse failure when repair is unavailable', async () => {
    const result = await parseJsonFromOutput({
      output: 'There is no JSON here.',
      schema: PayloadSchema,
      repair: {},
    });

    expect(result).toEqual({
      success: false,
      error: 'no_json; repair_skipped: missing_api_key',
    });
  });
});
