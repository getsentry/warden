import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRuntime, type Finding } from '@sentry/warden';
import type * as WardenPublic from '@sentry/warden';
import type { SuiteEntry } from './entries.js';
import { buildScorePrompt, scoreEntry } from './score.js';

vi.mock('@sentry/warden', async (importOriginal) => ({
  ...(await importOriginal<typeof WardenPublic>()),
  getRuntime: vi.fn(),
}));

const runAuxiliary = vi.fn();
const usage = { inputTokens: 1, outputTokens: 1, costUSD: 0.002 };

const entry: SuiteEntry = {
  id: 'sentry-vuln-001',
  source: 'corpus',
  kind: 'bug',
  repository: 'getsentry/sentry',
  ref: 'a',
  targets: ['src/sentry/api/accept.py'],
  lines: '265-275',
  summary: 'Invite acceptance deletes arbitrary members.',
};

function finding(path: string, title: string): Finding {
  return {
    id: 'ABC-DEF',
    severity: 'high',
    title,
    description: `${title} details`,
    location: { path, startLine: 270, endLine: 272 },
  } as Finding;
}

describe('scoreEntry', () => {
  beforeEach(() => {
    runAuxiliary.mockReset();
    vi.mocked(getRuntime).mockReturnValue({ runAuxiliary } as unknown as ReturnType<typeof getRuntime>);
  });

  it('skips the judge when no finding is in a target file', async () => {
    const verdict = await scoreEntry(entry, [finding('src/other.py', 'Other bug')], { model: 'judge' });
    expect(verdict.hit).toBe(false);
    expect(runAuxiliary).not.toHaveBeenCalled();
  });

  it('asks the judge about target-file findings only', async () => {
    runAuxiliary.mockResolvedValue({
      success: true,
      data: { matched: true, reasoning: 'same bug' },
      usage,
    });

    const verdict = await scoreEntry(entry, [
      finding('src/other.py', 'Other bug'),
      finding('src/sentry/api/accept.py', 'Member deletion without token check'),
    ], { model: 'judge' });

    expect(verdict).toEqual({ hit: true, reasoning: 'same bug', usage });
    const prompt = runAuxiliary.mock.calls[0]![0].prompt as string;
    expect(prompt).toContain('Location: src/sentry/api/accept.py lines 265-275');
    expect(prompt).toContain('Member deletion without token check');
    expect(prompt).not.toContain('Other bug');
  });

  it('throws instead of scoring a miss when the judge fails', async () => {
    runAuxiliary.mockResolvedValue({ success: false, error: 'timeout', usage });
    await expect(scoreEntry(entry, [finding('src/sentry/api/accept.py', 'x')], { model: 'judge' }))
      .rejects.toThrow('Judge failed for sentry-vuln-001: timeout');
  });
});

describe('buildScorePrompt', () => {
  it('states the corpus match rule', () => {
    expect(buildScorePrompt(entry, [])).toContain('different bug in the same file does not match');
  });
});
