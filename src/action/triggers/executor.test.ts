import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Octokit } from '@octokit/rest';
import { executeTrigger, type TriggerExecutorDeps } from './executor.js';
import type { ResolvedTrigger } from '../../config/loader.js';
import type { EventContext, SkillReport } from '../../types/index.js';
import type { SkillDefinition } from '../../config/schema.js';
import type { RenderResult } from '../../output/types.js';

// Mock dependencies
vi.mock('../../skills/loader.js', () => ({
  resolveSkillAsync: vi.fn(),
}));

vi.mock('../../sdk/runner.js', () => ({
  runSkill: vi.fn(),
}));

vi.mock('../../output/github-checks.js', () => ({
  createSkillCheck: vi.fn(),
  updateSkillCheck: vi.fn(),
  failSkillCheck: vi.fn(),
}));

vi.mock('../../output/renderer.js', () => ({
  renderSkillReport: vi.fn(),
}));

import { resolveSkillAsync } from '../../skills/loader.js';
import { runSkill } from '../../sdk/runner.js';
import { createSkillCheck, updateSkillCheck, failSkillCheck } from '../../output/github-checks.js';
import { renderSkillReport } from '../../output/renderer.js';

describe('executeTrigger', () => {
  // Suppress console output during tests
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.clearAllMocks();
  });

  const mockOctokit = {} as Octokit;

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
      files: [],
    },
    repoPath: '/test/path',
  };

  const mockTrigger: ResolvedTrigger = {
    name: 'test-trigger',
    event: 'pull_request',
    actions: ['opened'],
    skill: 'test-skill',
    filters: {},
    output: {},
  };

  const mockConfig = { version: 1 as const, triggers: [] };

  const mockDeps: TriggerExecutorDeps = {
    octokit: mockOctokit,
    context: mockContext,
    config: mockConfig,
    anthropicApiKey: 'test-key',
    claudePath: '/test/claude',
    previousReviewState: null,
    globalMaxFindings: 10,
  };

  const mockSkill: SkillDefinition = {
    name: 'test-skill',
    description: 'A test skill',
    prompt: 'Test prompt',
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

  it('executes a trigger successfully with findings', async () => {
    const mockReport = createReport([
      { id: 'test-1', severity: 'medium', confidence: 'high', title: 'Test finding', description: 'Test' },
    ]);
    const mockRenderResult = createRenderResult();

    vi.mocked(resolveSkillAsync).mockResolvedValue(mockSkill);
    vi.mocked(runSkill).mockResolvedValue(mockReport);
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(updateSkillCheck).mockResolvedValue(undefined);
    vi.mocked(renderSkillReport).mockReturnValue(mockRenderResult);

    const result = await executeTrigger(mockTrigger, mockDeps);

    expect(result.triggerName).toBe('test-trigger');
    expect(result.report).toBe(mockReport);
    expect(result.renderResult).toBe(mockRenderResult);
    expect(result.error).toBeUndefined();
    expect(createSkillCheck).toHaveBeenCalled();
    expect(updateSkillCheck).toHaveBeenCalled();
  });

  it('executes a trigger successfully with no findings', async () => {
    const mockReport = createReport();

    vi.mocked(resolveSkillAsync).mockResolvedValue(mockSkill);
    vi.mocked(runSkill).mockResolvedValue(mockReport);
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(updateSkillCheck).mockResolvedValue(undefined);

    const result = await executeTrigger(mockTrigger, mockDeps);

    expect(result.triggerName).toBe('test-trigger');
    expect(result.report).toBe(mockReport);
    expect(result.error).toBeUndefined();
  });

  it('handles skill resolution failure', async () => {
    vi.mocked(resolveSkillAsync).mockRejectedValue(new Error('Skill not found'));
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(failSkillCheck).mockResolvedValue(undefined);

    const result = await executeTrigger(mockTrigger, mockDeps);

    expect(result.triggerName).toBe('test-trigger');
    expect(result.error).toBeDefined();
    expect(result.report).toBeUndefined();
    expect(failSkillCheck).toHaveBeenCalled();
  });

  it('handles skill execution failure', async () => {
    vi.mocked(resolveSkillAsync).mockResolvedValue(mockSkill);
    vi.mocked(runSkill).mockRejectedValue(new Error('API error'));
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(failSkillCheck).mockResolvedValue(undefined);

    const result = await executeTrigger(mockTrigger, mockDeps);

    expect(result.triggerName).toBe('test-trigger');
    expect(result.error).toBeDefined();
    expect(result.report).toBeUndefined();
    expect(failSkillCheck).toHaveBeenCalled();
  });

  it('continues if check creation fails', async () => {
    const mockReport = createReport();

    vi.mocked(resolveSkillAsync).mockResolvedValue(mockSkill);
    vi.mocked(runSkill).mockResolvedValue(mockReport);
    vi.mocked(createSkillCheck).mockRejectedValue(new Error('Rate limited'));

    const result = await executeTrigger(mockTrigger, mockDeps);

    expect(result.triggerName).toBe('test-trigger');
    expect(result.report).toBe(mockReport);
    expect(result.error).toBeUndefined();
  });

  it('uses trigger-specific failOn over global', async () => {
    const mockReport = createReport([
      { id: 'test-1', severity: 'high', confidence: 'high', title: 'Test', description: 'Test' },
    ]);
    const mockRenderResult = createRenderResult();
    mockRenderResult.review = { event: 'REQUEST_CHANGES', body: '', comments: [] };

    vi.mocked(resolveSkillAsync).mockResolvedValue(mockSkill);
    vi.mocked(runSkill).mockResolvedValue(mockReport);
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(updateSkillCheck).mockResolvedValue(undefined);
    vi.mocked(renderSkillReport).mockReturnValue(mockRenderResult);

    const triggerWithFailOn: ResolvedTrigger = {
      ...mockTrigger,
      output: { failOn: 'high' },
    };

    const depsWithGlobalFailOn = {
      ...mockDeps,
      globalFailOn: 'critical' as const,
    };

    const result = await executeTrigger(triggerWithFailOn, depsWithGlobalFailOn);

    expect(result.failOn).toBe('high'); // Trigger-specific takes precedence
  });

  it('uses global failOn when trigger does not specify', async () => {
    const mockReport = createReport();

    vi.mocked(resolveSkillAsync).mockResolvedValue(mockSkill);
    vi.mocked(runSkill).mockResolvedValue(mockReport);
    vi.mocked(createSkillCheck).mockResolvedValue({ checkRunId: 123, url: 'https://github.com/check/123' });
    vi.mocked(updateSkillCheck).mockResolvedValue(undefined);

    const depsWithGlobalFailOn = {
      ...mockDeps,
      globalFailOn: 'critical' as const,
    };

    const result = await executeTrigger(mockTrigger, depsWithGlobalFailOn);

    expect(result.failOn).toBe('critical');
  });

  it('skips check creation for non-PR events', async () => {
    const mockReport = createReport();

    vi.mocked(resolveSkillAsync).mockResolvedValue(mockSkill);
    vi.mocked(runSkill).mockResolvedValue(mockReport);

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
