import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRuntime, type UsageStats } from '@sentry/warden';
import type * as WardenPublic from '@sentry/warden';
import { runJudge } from './judge.js';
import type { EvalMeta } from './types.js';

vi.mock('@sentry/warden', async (importOriginal) => ({
  ...(await importOriginal<typeof WardenPublic>()),
  getRuntime: vi.fn(),
}));

const runAuxiliary = vi.fn();
const mockedGetRuntime = vi.mocked(getRuntime);

const usage: UsageStats = {
  inputTokens: 10,
  outputTokens: 5,
  cacheReadInputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheCreation5mInputTokens: 0,
  cacheCreation1hInputTokens: 0,
  webSearchRequests: 0,
  costUSD: 0.001,
};

const meta: EvalMeta = {
  name: 'null-access',
  category: 'bug-detection',
  skillName: 'bug-detection',
  given: 'code that dereferences a possibly undefined value',
  skillPath: '/skills/bug-detection.md',
  filePaths: ['/fixtures/handler.ts'],
  model: 'openrouter/openai/gpt-6-luna',
  runtime: 'pi',
  should_find: [{ finding: 'null access on user', required: true }],
  should_not_find: ['style issues'],
};

describe('runJudge', () => {
  beforeEach(() => {
    runAuxiliary.mockReset();
    mockedGetRuntime.mockReturnValue({ runAuxiliary } as unknown as ReturnType<typeof getRuntime>);
  });

  it('runs the judge through Pi with the configured model', async () => {
    const response = {
      expectations: [{ met: true, matchedFindingIndex: 0, reasoning: 'found' }],
      antiExpectations: [{ violated: false, violatingFindingIndex: null, reasoning: 'clean' }],
    };
    runAuxiliary.mockResolvedValue({ success: true, data: response, usage });

    const result = await runJudge(meta, [], { model: 'openrouter/openai/gpt-6-luna' });

    expect(mockedGetRuntime).toHaveBeenCalledWith('pi');
    expect(runAuxiliary).toHaveBeenCalledWith(expect.objectContaining({
      task: 'eval_judge',
      model: 'openrouter/openai/gpt-6-luna',
      apiKey: undefined,
      maxRetries: 0,
    }));
    expect(result).toEqual({ response, usage });
  });

  it('passes an Anthropic key through when one is configured', async () => {
    runAuxiliary.mockResolvedValue({ success: false, error: 'boom', usage });

    await runJudge(meta, [], { model: 'openai/gpt-6-luna', apiKey: 'sk-ant' });

    expect(runAuxiliary).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'sk-ant' }));
  });

  it('marks every assertion failed when the judge call fails', async () => {
    runAuxiliary.mockResolvedValue({ success: false, error: 'No API key for provider: openrouter', usage });

    const result = await runJudge(meta, [], { model: 'openrouter/openai/gpt-6-luna' });

    expect(result.error).toBe('Judge call failed: No API key for provider: openrouter');
    expect(result.usage).toBe(usage);
    expect(result.response.expectations).toEqual([
      { met: false, matchedFindingIndex: null, reasoning: result.error },
    ]);
    expect(result.response.antiExpectations).toEqual([
      { violated: false, violatingFindingIndex: null, reasoning: 'Judge failed, assuming no violation' },
    ]);
  });

  it('rejects responses with the wrong number of verdicts', async () => {
    runAuxiliary.mockResolvedValue({
      success: true,
      data: { expectations: [], antiExpectations: [] },
      usage,
    });

    const result = await runJudge(meta, [], { model: 'openrouter/openai/gpt-6-luna' });

    expect(result.error).toBe('Judge returned 0 verdicts, expected 1');
  });
});
