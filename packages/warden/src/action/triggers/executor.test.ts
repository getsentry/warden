import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Octokit } from '@octokit/rest';
import {
  executeTrigger,
  type TriggerCheckCompleteOptions,
  type TriggerExecutorDeps,
} from './executor.js';
import type { ResolvedTrigger } from '../../config/loader.js';
import type { EventContext, SkillReport } from '../../types/index.js';
import type { RenderResult } from '../../output/types.js';

const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  startSpan: vi.fn((_ctx: unknown, callback: (span: { setAttribute: (key: string, value: unknown) => void }) => unknown) =>
    callback({ setAttribute: vi.fn() })
  ),
}));

vi.mock('../../sentry.js', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  const actualSentry = actual['Sentry'] as Record<string, unknown>;
  return {
    ...actual,
    Sentry: {
      ...actualSentry,
      captureException: sentryMocks.captureException,
      startSpan: sentryMocks.startSpan,
    },
  };
});

// Mock dependencies
vi.mock('../../skills/loader.js', () => ({
  resolveSkillAsync: vi.fn(),
}));

vi.mock('../../cli/output/tasks.js', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    runSkillTask: vi.fn(),
  };
});

vi.mock('../../output/github-checks.js', () => ({
  createSkillCheck: vi.fn(),
  updateSkillCheck: vi.fn(),
  failSkillCheck: vi.fn(),
}));

vi.mock('../../output/renderer.js', () => ({
  renderSkillReport: vi.fn(),
}));

import { runSkillTask } from '../../cli/output/tasks.js';
import { createSkillCheck, updateSkillCheck, failSkillCheck } from '../../output/github-checks.js';
import { renderSkillReport } from '../../output/renderer.js';
import { resolveSkillAsync } from '../../skills/loader.js';
import { InvalidPiModelSelectorError } from '../../sdk/runtimes/model-selectors.js';

describe('executeTrigger', () => {
  // Suppress console output during tests
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.clearAllMocks();
  });

  const mockOctokit = {} as Octokit;

  const checkOptions = {
    owner: 'test-owner',
    repo: 'test-repo',
    headSha: 'abc123',
  };

  const createTestCheckReporter = () => ({
    async start(skillName: string) {
      const check = await createSkillCheck(mockOctokit, skillName, checkOptions);
      return {
        url: check.url,
        complete: (report: SkillReport, options: TriggerCheckCompleteOptions) =>
          updateSkillCheck(mockOctokit, check.checkRunId, report, {
            ...checkOptions,
            ...options,
          }),
        fail: (error: unknown) =>
          failSkillCheck(mockOctokit, check.checkRunId, error, checkOptions),
      };
    },
  });

  const mockContext: EventContext = {
    eventType: 'pull_request',
    action: 'opened',
    repository: { owner: 'test-owner', name: 'test-repo', fullName: 'test-owner/test-repo', defaultBranch: 'main' },
    pullRequest: {
      number: 1,
      title: 'Test PR',
      body: 'Test description',
      author: 'test-user',
      baseBranch: 'main',
      headBranch: 'feature',
      headSha: 'abc123',
      baseSha: 'base123',
      files: [],
    },
    repoPath: '/test/path',
  };

  const mockTrigger: ResolvedTrigger = {
    name: 'test-trigger',
    skill: 'test-skill',
    type: 'pull_request',
    actions: ['opened'],
    filters: {},
  };

  const mockDeps: TriggerExecutorDeps = {
    context: mockContext,
    anthropicApiKey: 'test-key',
    claudePath: '/test/claude',
    globalMaxFindings: 10,
    checks: createTestCheckReporter(),
  };

  const createReport = (findings: SkillReport['findings'] = []): SkillReport => ({
    skill: 'test-skill',
    summary: findings.length > 0 ? 'Found issues' : 'No issues found',
    findings,
    usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
  });

  const createRenderResult = (): RenderResult => ({
    summaryComment: 'Summary',
    review: { event: 'COMMENT', body: 'Test review', comments: [] },
  });

  it('resolves local skills from trigger.skillRoot when provided', async () => {
    const mockReport = createReport();

    vi.mocked(resolveSkillAsync).mockResolvedValue({
      name: 'test-skill',
      description: 'Test skill',
      prompt: 'Review code',
    });
    vi.mocked(runSkillTask).mockImplementation(async (taskOptions) => {
      await taskOptions.resolveSkill();
      return { name: 'test-trigger', report: mockReport };
    });
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(updateSkillCheck).mockResolvedValue(undefined);

    await executeTrigger({ ...mockTrigger, skillRoot: '/org/skills-root' }, mockDeps);

    expect(resolveSkillAsync).toHaveBeenCalledWith(
      'test-skill',
      '/org/skills-root',
      { remote: undefined }
    );
  });

  it('resolves built-in base skills without the repo root', async () => {
    const mockReport = createReport();

    vi.mocked(resolveSkillAsync).mockResolvedValue({
      name: 'test-skill',
      description: 'Test skill',
      prompt: 'Review code',
    });
    vi.mocked(runSkillTask).mockImplementation(async (taskOptions) => {
      await taskOptions.resolveSkill();
      return { name: 'test-trigger', report: mockReport };
    });
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(updateSkillCheck).mockResolvedValue(undefined);

    await executeTrigger({ ...mockTrigger, useBuiltinSkill: true }, mockDeps);

    expect(resolveSkillAsync).toHaveBeenCalledWith(
      'test-skill',
      undefined,
      { remote: undefined }
    );
  });

  it('uses trigger-level execution defaults instead of merged config defaults', async () => {
    const mockReport = createReport();

    vi.mocked(runSkillTask).mockResolvedValue({ name: 'test-trigger', report: mockReport });
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(updateSkillCheck).mockResolvedValue(undefined);

    await executeTrigger({
      ...mockTrigger,
      batchDelayMs: 250,
      maxContextFiles: 12,
      auxiliaryMaxRetries: 9,
    }, {
      ...mockDeps,
    });

    expect(runSkillTask).toHaveBeenCalledWith(
      expect.objectContaining({
        runnerOptions: expect.objectContaining({
          batchDelayMs: 250,
          maxContextFiles: 12,
          auxiliaryMaxRetries: 9,
        }),
      }),
      expect.any(Number),
      expect.anything(),
      undefined
    );
  });

  it('executes a trigger successfully with findings', async () => {
    const mockReport = createReport([
      { id: 'test-1', severity: 'medium', confidence: 'high', title: 'Test finding', description: 'Test' },
    ]);
    const mockRenderResult = createRenderResult();

    vi.mocked(runSkillTask).mockResolvedValue({ name: 'test-trigger', report: mockReport });
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(updateSkillCheck).mockResolvedValue(undefined);
    vi.mocked(renderSkillReport).mockReturnValue(mockRenderResult);

    const result = await executeTrigger(mockTrigger, mockDeps);

    expect(result.triggerName).toBe('test-trigger');
    expect(result.report).toBe(mockReport);
    expect(result.renderResult).toBe(mockRenderResult);
    expect(result.error).toBeUndefined();
    expect(createSkillCheck).toHaveBeenCalledWith(mockOctokit, 'test-skill', {
      owner: 'test-owner',
      repo: 'test-repo',
      headSha: 'abc123',
    });
    expect(updateSkillCheck).toHaveBeenCalledWith(mockOctokit, 123, mockReport, {
      owner: 'test-owner',
      repo: 'test-repo',
      headSha: 'abc123',
      failOn: undefined,
      reportOn: undefined,
      minConfidence: 'medium',
      failCheck: undefined,
    });
  });

  it('executes a trigger successfully with no findings', async () => {
    const mockReport = createReport();

    vi.mocked(runSkillTask).mockResolvedValue({ name: 'test-trigger', report: mockReport });
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(updateSkillCheck).mockResolvedValue(undefined);

    const result = await executeTrigger(mockTrigger, mockDeps);

    expect(result.triggerName).toBe('test-trigger');
    expect(result.report).toBe(mockReport);
    expect(result.error).toBeUndefined();
  });

  it('handles skill resolution failure', async () => {
    vi.mocked(runSkillTask).mockResolvedValue({ name: 'test-trigger', error: new Error('Skill not found') });
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(failSkillCheck).mockResolvedValue(undefined);

    const result = await executeTrigger(mockTrigger, mockDeps);

    expect(result.triggerName).toBe('test-trigger');
    expect(result.error).toBeDefined();
    expect(result.report).toBeUndefined();
    expect(failSkillCheck).toHaveBeenCalledWith(
      mockOctokit, 123, expect.objectContaining({ message: 'Skill not found' }),
      { owner: 'test-owner', repo: 'test-repo', headSha: 'abc123' }
    );
  });

  it('handles skill execution failure', async () => {
    vi.mocked(runSkillTask).mockResolvedValue({ name: 'test-trigger', error: new Error('API error') });
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(failSkillCheck).mockResolvedValue(undefined);

    const result = await executeTrigger(mockTrigger, mockDeps);

    expect(result.triggerName).toBe('test-trigger');
    expect(result.error).toBeDefined();
    expect(result.report).toBeUndefined();
    expect(failSkillCheck).toHaveBeenCalledWith(
      mockOctokit, 123, expect.objectContaining({ message: 'API error' }),
      { owner: 'test-owner', repo: 'test-repo', headSha: 'abc123' }
    );
  });

  it('reports invalid Pi model selectors before running the skill', async () => {
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(failSkillCheck).mockResolvedValue(undefined);

    const result = await executeTrigger({
      ...mockTrigger,
      runtime: 'pi',
      model: 'claude-sonnet-4-5',
    }, mockDeps);

    expect(runSkillTask).not.toHaveBeenCalled();
    expect(result.triggerName).toBe('test-trigger');
    expect(result.error).toBeInstanceOf(InvalidPiModelSelectorError);
    expect((result.error as Error).message).toBe(
      'Pi runtime model for test-trigger must use provider/model format: claude-sonnet-4-5'
    );
    expect(failSkillCheck).toHaveBeenCalledWith(
      mockOctokit, 123, expect.objectContaining({
        message: 'Pi runtime model for test-trigger must use provider/model format: claude-sonnet-4-5',
      }),
      { owner: 'test-owner', repo: 'test-repo', headSha: 'abc123' }
    );
    expect(sentryMocks.captureException).toHaveBeenCalledWith(
      expect.any(InvalidPiModelSelectorError),
      expect.objectContaining({
        tags: expect.objectContaining({
          'warden.error.code': 'invalid_model_selector',
          'warden.trigger.name': 'test-trigger',
        }),
        fingerprint: ['warden', 'invalid_model_selector'],
      })
    );
  });

  it('treats a report with error as a trigger failure', async () => {
    // runSkillTask now populates report even on failure; the action must
    // still route the skill check to the fail path.
    const failedReport = {
      skill: 'test-skill',
      summary: 'test-skill: failed (all_hunks_failed)',
      findings: [],
      error: { code: 'all_hunks_failed' as const, message: 'All 2 chunks failed to analyze.' },
    };
    vi.mocked(runSkillTask).mockResolvedValue({
      name: 'test-trigger',
      report: failedReport,
      error: new Error('All 2 chunks failed to analyze.'),
    });
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(failSkillCheck).mockResolvedValue(undefined);

    const result = await executeTrigger(mockTrigger, mockDeps);

    expect(result.error).toBeDefined();
    expect(result.report).toBeUndefined();
    expect(failSkillCheck).toHaveBeenCalled();
  });

  it('continues if check creation fails', async () => {
    const mockReport = createReport();

    vi.mocked(runSkillTask).mockResolvedValue({ name: 'test-trigger', report: mockReport });
    vi.mocked(createSkillCheck).mockRejectedValue(new Error('Rate limited'));

    const result = await executeTrigger(mockTrigger, mockDeps);

    expect(result.triggerName).toBe('test-trigger');
    expect(result.report).toBe(mockReport);
    expect(result.error).toBeUndefined();
  });

  it('skips check writes when no check reporter is provided', async () => {
    const mockReport = createReport();

    vi.mocked(runSkillTask).mockResolvedValue({ name: 'test-trigger', report: mockReport });

    const result = await executeTrigger(mockTrigger, { ...mockDeps, checks: undefined });

    expect(createSkillCheck).not.toHaveBeenCalled();
    expect(updateSkillCheck).not.toHaveBeenCalled();
    expect(result.triggerName).toBe('test-trigger');
    expect(result.report).toBe(mockReport);
  });

  it('uses trigger-specific failOn over global', async () => {
    const mockReport = createReport([
      { id: 'test-1', severity: 'high', confidence: 'high', title: 'Test', description: 'Test' },
    ]);
    const mockRenderResult = createRenderResult();
    mockRenderResult.review = { event: 'REQUEST_CHANGES', body: '', comments: [] };

    vi.mocked(runSkillTask).mockResolvedValue({ name: 'test-trigger', report: mockReport });
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(updateSkillCheck).mockResolvedValue(undefined);
    vi.mocked(renderSkillReport).mockReturnValue(mockRenderResult);

    const triggerWithFailOn: ResolvedTrigger = {
      ...mockTrigger,
      failOn: 'high',
    };

    const depsWithGlobalFailOn = {
      ...mockDeps,
      globalFailOn: 'medium' as const,
    };

    const result = await executeTrigger(triggerWithFailOn, depsWithGlobalFailOn);

    expect(result.failOn).toBe('high'); // Trigger-specific takes precedence
  });

  it('uses global failOn when trigger does not specify', async () => {
    const mockReport = createReport();

    vi.mocked(runSkillTask).mockResolvedValue({ name: 'test-trigger', report: mockReport });
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(updateSkillCheck).mockResolvedValue(undefined);

    const depsWithGlobalFailOn = {
      ...mockDeps,
      globalFailOn: 'medium' as const,
    };

    const result = await executeTrigger(mockTrigger, depsWithGlobalFailOn);

    expect(result.failOn).toBe('medium');
  });

  it('passes requestChanges and failCheck through from trigger', async () => {
    const mockReport = createReport([
      { id: 'test-1', severity: 'high', confidence: 'high', title: 'Test', description: 'Test' },
    ]);
    const mockRenderResult = createRenderResult();

    vi.mocked(runSkillTask).mockResolvedValue({ name: 'test-trigger', report: mockReport });
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(updateSkillCheck).mockResolvedValue(undefined);
    vi.mocked(renderSkillReport).mockReturnValue(mockRenderResult);

    const triggerWithFlags: ResolvedTrigger = {
      ...mockTrigger,
      requestChanges: false,
      failCheck: true,
    };

    const result = await executeTrigger(triggerWithFlags, mockDeps);

    expect(result.requestChanges).toBe(false);
    expect(result.failCheck).toBe(true);
  });

  it('uses global requestChanges and failCheck when trigger does not specify', async () => {
    const mockReport = createReport();

    vi.mocked(runSkillTask).mockResolvedValue({ name: 'test-trigger', report: mockReport });
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(updateSkillCheck).mockResolvedValue(undefined);

    const depsWithGlobals = {
      ...mockDeps,
      globalRequestChanges: false,
      globalFailCheck: true,
    };

    const result = await executeTrigger(mockTrigger, depsWithGlobals);

    expect(result.requestChanges).toBe(false);
    expect(result.failCheck).toBe(true);
  });

  it('skips check creation for non-PR events', async () => {
    const mockReport = createReport();

    vi.mocked(runSkillTask).mockResolvedValue({ name: 'test-trigger', report: mockReport });

    const nonPRContext: EventContext = {
      ...mockContext,
      pullRequest: undefined,
    };

    const result = await executeTrigger(mockTrigger, { ...mockDeps, context: nonPRContext });

    expect(createSkillCheck).not.toHaveBeenCalled();
    expect(result.triggerName).toBe('test-trigger');
    expect(result.report).toBe(mockReport);
  });
});
