import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('../sdk/json-output.js', () => ({
  parseJsonFromOutput: vi.fn(),
}));

import { parseJsonFromOutput } from '../sdk/json-output.js';
import { runStructuredSkillBuilderAgent } from './agentic.js';
import { emptyUsage } from '../sdk/usage.js';
import type { Runtime } from '../sdk/runtimes/index.js';
import type { ProvidersConfig } from '../config/schema.js';

const parseJsonFromOutputMock = vi.mocked(parseJsonFromOutput);

const schema = z.object({ ok: z.boolean() });

describe('runStructuredSkillBuilderAgent provider forwarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards custom providers to the fallback auxiliary JSON repair', async () => {
    const providers: ProvidersConfig = {
      litellm: {
        baseUrl: 'http://localhost:4000/v1',
        api: 'openai-completions',
        models: [{ id: 'gemma', name: 'gemma' }],
      },
    };

    // Main agent run succeeds with unparseable text; the structured-repair agent
    // run then fails (no result), forcing the fallback auxiliary repair path.
    const runSkill = vi
      .fn()
      .mockResolvedValueOnce({
        result: { status: 'success', text: 'NOT JSON', errors: [], usage: emptyUsage() },
      })
      .mockResolvedValue({});
    const runtime = {
      name: 'pi',
      runSkill,
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
    } as unknown as Runtime;

    // Primary parse fails; the fallback auxiliary repair succeeds.
    parseJsonFromOutputMock
      .mockResolvedValueOnce({ success: false, error: 'invalid_json: nope' })
      .mockResolvedValue({ success: true, data: { ok: true }, json: '{"ok":true}', repaired: true });

    const result = await runStructuredSkillBuilderAgent({
      runtime,
      repoPath: '/repo',
      skillName: 'security',
      systemPrompt: 'sys',
      userPrompt: 'user',
      schema,
      providers,
      repair: { apiKey: 'repair-key', model: 'repair-model', maxRetries: 2 },
    });

    expect(result.data).toEqual({ ok: true });
    // The fallback repair (second parse call) must carry the custom providers.
    expect(parseJsonFromOutputMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        repair: expect.objectContaining({ providers }),
      }),
    );
  });
});
