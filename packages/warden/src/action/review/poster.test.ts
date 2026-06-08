import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Octokit } from '@octokit/rest';
import { postTriggerReview, type ReviewPostingContext, type ReviewPosterDeps } from './poster.js';
import type { EventContext, Finding } from '../../types/index.js';
import type { TriggerResult } from '../triggers/executor.js';
import type { ExistingComment } from '../../output/dedup.js';
import type { RenderResult } from '../../output/types.js';

// Mock dependencies
vi.mock('../../output/dedup.js', () => ({
  deduplicateFindings: vi.fn(),
  processDuplicateActions: vi.fn(),
  findingToExistingComment: vi.fn(),
  consolidateBatchFindings: vi.fn(),
}));

vi.mock('../../output/renderer.js', () => ({
  renderSkillReport: vi.fn(),
  renderFindingsBody: vi.fn().mockReturnValue('rendered findings body'),
}));

import { deduplicateFindings, processDuplicateActions, findingToExistingComment, consolidateBatchFindings } from '../../output/dedup.js';
import { renderSkillReport } from '../../output/renderer.js';

describe('postTriggerReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    // Default: consolidation passes findings through unchanged
    vi.mocked(consolidateBatchFindings).mockImplementation(async (findings) => ({
      findings,
      removedCount: 0,
      removedFindings: [],
    }));
  });

  const mockOctokit = {
    pulls: {
      createReview: vi.fn().mockResolvedValue({}),
    },
  } as unknown as Octokit;

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

  const mockDeps: ReviewPosterDeps = {
    octokit: mockOctokit,
    context: mockContext,
  };

  const createFinding = (overrides: Partial<Finding> = {}): Finding => ({
    id: 'test-1',
    severity: 'medium',
    confidence: 'high',
    title: 'Test finding',
    description: 'Test description',
    location: { path: 'test.ts', startLine: 10 },
    ...overrides,
  });

  const createRenderResult = (overrides: Partial<RenderResult> = {}): RenderResult => ({
    summaryComment: 'Summary',
    review: { event: 'COMMENT', body: 'Test review', comments: [] },
    ...overrides,
  });

  const createExistingComment = (overrides: Partial<ExistingComment> = {}): ExistingComment => ({
    id: 1,
    path: 'test.ts',
    line: 10,
    title: 'Test finding',
    description: 'Test description',
    contentHash: 'abc123',
    ...overrides,
  });

  it('returns early when no report exists', async () => {
    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: undefined,
    };

    const ctx: ReviewPostingContext = {
      result,

      existingComments: [],
      apiKey: 'test-key',
    };

    const postResult = await postTriggerReview(ctx, mockDeps);

    expect(postResult.posted).toBe(false);
    expect(postResult.newComments).toEqual([]);
    expect(postResult.shouldFail).toBe(false);
  });

  it('skips posting when no findings and reportOnSuccess is false', async () => {
    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'No issues found',
        findings: [],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      },
      renderResult: createRenderResult(),
      reportOnSuccess: false,
    };

    const ctx: ReviewPostingContext = {
      result,

      existingComments: [],
      apiKey: 'test-key',
    };

    const postResult = await postTriggerReview(ctx, mockDeps);

    expect(postResult.posted).toBe(false);
    expect(mockOctokit.pulls.createReview).not.toHaveBeenCalled();
  });

  it('does not emit posting observations for threshold-suppressed findings', async () => {
    const finding = createFinding({ severity: 'low' });
    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'Found 1 issue',
        findings: [finding],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      },
      renderResult: createRenderResult(),
      reportOn: 'medium',
    };

    const postResult = await postTriggerReview({ result, existingComments: [], apiKey: 'test-key' }, mockDeps);

    expect(postResult.findingObservations).toEqual([]);
  });

  it('does not emit a public skipped reason when no review render result exists', async () => {
    const finding = createFinding();
    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'Found 1 issue',
        findings: [finding],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      },
      renderResult: undefined,
      reportOn: 'low',
    };

    const ctx: ReviewPostingContext = {
      result,
      existingComments: [],
      apiKey: 'test-key',
    };

    const postResult = await postTriggerReview(ctx, mockDeps);

    expect(postResult.posted).toBe(false);
    expect(mockOctokit.pulls.createReview).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      '::warning::Trigger test-trigger produced reportable findings without a render result'
    );
    expect(postResult.findingObservations).toEqual([]);
  });

  it('posts a review with findings', async () => {
    const finding = createFinding();
    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'Found 1 issue',
        findings: [finding],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      },
      renderResult: createRenderResult({
        review: {
          event: 'COMMENT',
          body: 'Test review',
          comments: [{ path: 'test.ts', line: 10, body: 'Test comment' }],
        },
      }),
      reportOn: 'low',
    };

    vi.mocked(findingToExistingComment).mockReturnValue(createExistingComment());

    const ctx: ReviewPostingContext = {
      result,

      existingComments: [],
      apiKey: 'test-key',
    };

    const postResult = await postTriggerReview(ctx, mockDeps);

    expect(postResult.posted).toBe(true);
    expect(postResult.newComments).toHaveLength(1);
    expect(mockOctokit.pulls.createReview).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      pull_number: 1,
      commit_id: 'abc123',
      event: 'COMMENT',
      body: 'Test review',
      comments: [expect.objectContaining({ path: 'test.ts', line: 10, side: 'RIGHT', body: 'Test comment' })],
    });
  });

  it('deduplicates findings against existing comments', async () => {
    const finding = createFinding();
    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'Found 1 issue',
        findings: [finding],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      },
      renderResult: createRenderResult({
        review: {
          event: 'COMMENT',
          body: 'Test review',
          comments: [{ path: 'test.ts', line: 10, body: 'Test comment' }],
        },
      }),
      reportOn: 'low',
    };

    const existingComment = createExistingComment({
      isWarden: false,
      actor: 'coderabbitai',
      threadId: 'thread-1',
    });

    // Mock that the finding is a duplicate
    vi.mocked(deduplicateFindings).mockResolvedValue({
      newFindings: [],
      duplicateActions: [{ type: 'react_external', originalFindingId: finding.id, finding, existingComment, matchType: 'hash' }],
    });
    vi.mocked(processDuplicateActions).mockResolvedValue({ updated: 0, reacted: 1, skipped: 0, failed: 0 });

    const ctx: ReviewPostingContext = {
      result,

      existingComments: [existingComment],
      apiKey: 'test-key',
    };

    const postResult = await postTriggerReview(ctx, mockDeps);

    expect(deduplicateFindings).toHaveBeenCalledWith([finding], [existingComment], {
      apiKey: 'test-key',
      currentSkill: 'test-skill',
    });
    expect(processDuplicateActions).toHaveBeenCalledWith(
      mockOctokit, 'test-owner', 'test-repo',
      [{ type: 'react_external', originalFindingId: finding.id, finding, existingComment, matchType: 'hash' }],
      'test-skill'
    );
    // Since all findings were duplicates and failOn not triggered, nothing new to post
    expect(postResult.posted).toBe(false);
    expect(postResult.activeWardenCommentIds.size).toBe(0);
    expect(postResult.findingObservations).toEqual([
      expect.objectContaining({
        outcome: 'deduped',
        finding,
        skill: 'test-skill',
        dedupe: expect.objectContaining({
          source: 'external',
          matchType: 'hash',
          existingCommentId: 1,
          existingThreadId: 'thread-1',
          actor: 'coderabbitai',
        }),
      }),
    ]);
  });

  it('omits sentinel comment IDs from dedupe observations', async () => {
    const finding = createFinding();
    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'Found 1 issue',
        findings: [finding],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      },
      renderResult: createRenderResult({
        review: {
          event: 'COMMENT',
          body: 'Test review',
          comments: [{ path: 'test.ts', line: 10, body: 'Test comment' }],
        },
      }),
      reportOn: 'low',
    };

    const existingComment = createExistingComment({
      id: -1,
      isWarden: true,
      findingId: finding.id,
    });

    vi.mocked(deduplicateFindings).mockResolvedValue({
      newFindings: [],
      duplicateActions: [{ type: 'update_warden', originalFindingId: finding.id, finding, existingComment, matchType: 'hash' }],
    });
    vi.mocked(processDuplicateActions).mockResolvedValue({ updated: 0, reacted: 0, skipped: 1, failed: 0 });

    const ctx: ReviewPostingContext = {
      result,
      existingComments: [existingComment],
      apiKey: 'test-key',
    };

    const postResult = await postTriggerReview(ctx, mockDeps);
    const [observation] = postResult.findingObservations;

    expect(observation).toEqual(
      expect.objectContaining({
        outcome: 'deduped',
        finding,
        skill: 'test-skill',
        dedupe: expect.objectContaining({
          source: 'warden',
          matchType: 'hash',
          existingFindingId: finding.id,
        }),
      })
    );
    if (observation?.outcome !== 'deduped') {
      throw new Error('Expected deduped observation');
    }
    expect(observation.dedupe).not.toHaveProperty('existingCommentId');
    expect(postResult.activeWardenCommentIds.size).toBe(0);
  });

  it('does not mark deduped findings as failed when later duplicate handling errors', async () => {
    const duplicateFinding = createFinding({ id: 'duplicate-finding' });
    const newFinding = createFinding({ id: 'new-finding', location: { path: 'test.ts', startLine: 20 } });
    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'Found 2 issues',
        findings: [duplicateFinding, newFinding],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      },
      renderResult: createRenderResult({
        review: {
          event: 'COMMENT',
          body: 'Test review',
          comments: [
            { path: 'test.ts', line: 10, body: 'Duplicate comment' },
            { path: 'test.ts', line: 20, body: 'New comment' },
          ],
        },
      }),
      reportOn: 'low',
    };

    const existingComment = createExistingComment({
      isWarden: false,
      actor: 'coderabbitai',
      threadId: 'thread-1',
    });
    const duplicateAction = {
      type: 'react_external' as const,
      originalFindingId: duplicateFinding.id,
      finding: duplicateFinding,
      existingComment,
      matchType: 'hash' as const,
    };

    vi.mocked(deduplicateFindings).mockResolvedValue({
      newFindings: [newFinding],
      duplicateActions: [duplicateAction],
    });
    vi.mocked(processDuplicateActions).mockRejectedValue(new Error('Duplicate action failed'));

    const ctx: ReviewPostingContext = {
      result,
      existingComments: [existingComment],
      apiKey: 'test-key',
    };

    const postResult = await postTriggerReview(ctx, mockDeps);

    expect(postResult.posted).toBe(false);
    expect(postResult.findingObservations).toEqual([
      expect.objectContaining({
        outcome: 'deduped',
        finding: duplicateFinding,
        skill: 'test-skill',
      }),
      {
        outcome: 'failed',
        finding: newFinding,
        skill: 'test-skill',
      },
    ]);
  });

  it('throws duplicate action write failures when post errors are fatal', async () => {
    const finding = createFinding();
    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'Found 1 issue',
        findings: [finding],
      },
      renderResult: createRenderResult({
        review: {
          event: 'COMMENT',
          body: 'Test review',
          comments: [{ path: 'test.ts', line: 10, body: 'Test comment' }],
        },
      }),
      reportOn: 'low',
    };

    const existingComment = createExistingComment({
      isWarden: true,
      findingId: finding.id,
    });

    vi.mocked(deduplicateFindings).mockResolvedValue({
      newFindings: [],
      duplicateActions: [
        {
          type: 'update_warden',
          originalFindingId: finding.id,
          finding,
          existingComment,
          matchType: 'hash',
        },
      ],
    });
    vi.mocked(processDuplicateActions).mockResolvedValue({
      updated: 0,
      reacted: 0,
      skipped: 0,
      failed: 1,
    });

    await expect(
      postTriggerReview(
        {
          result,
          existingComments: [existingComment],
          apiKey: 'test-key',
          failOnPostError: true,
        },
        mockDeps
      )
    ).rejects.toThrow('Failed to process 1 duplicate actions');
  });

  it('posts REQUEST_CHANGES when all findings deduplicated but failOn threshold met', async () => {
    const finding = createFinding({ severity: 'high' });
    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'Found 1 issue',
        findings: [finding],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      },
      renderResult: createRenderResult({
        review: {
          event: 'REQUEST_CHANGES',
          body: 'Findings exceed threshold',
          comments: [{ path: 'test.ts', line: 10, body: 'Test comment' }],
        },
      }),
      reportOn: 'low',
      failOn: 'high',
      requestChanges: true,
    };

    const existingComment = createExistingComment({ isWarden: true, findingId: 'WRZ-XPL' });
    const recenteredFinding = { ...finding, id: 'WRZ-XPL' };

    // Mock that the finding is a duplicate (already posted in previous run)
    vi.mocked(deduplicateFindings).mockResolvedValue({
      newFindings: [],
      duplicateActions: [{ type: 'update_warden', originalFindingId: finding.id, finding: recenteredFinding, existingComment, matchType: 'hash' }],
    });
    vi.mocked(processDuplicateActions).mockResolvedValue({ updated: 1, reacted: 0, skipped: 0, failed: 0 });

    // Mock renderSkillReport to return a REQUEST_CHANGES review when re-rendering with empty findings
    vi.mocked(renderSkillReport).mockReturnValue({
      summaryComment: 'Summary',
      review: {
        event: 'REQUEST_CHANGES',
        body: 'Findings exceed the configured threshold. See the GitHub Check for details.',
        comments: [],
      },
    });

    const ctx: ReviewPostingContext = {
      result,

      existingComments: [existingComment],
      apiKey: 'test-key',
    };

    const postResult = await postTriggerReview(ctx, mockDeps);

    expect(deduplicateFindings).toHaveBeenCalledWith([finding], [existingComment], {
      apiKey: 'test-key',
      currentSkill: 'test-skill',
    });
    expect(processDuplicateActions).toHaveBeenCalledWith(
      mockOctokit, 'test-owner', 'test-repo',
      [{ type: 'update_warden', originalFindingId: finding.id, finding: recenteredFinding, existingComment, matchType: 'hash' }],
      'test-skill'
    );
    // Even though all findings were deduplicated, REQUEST_CHANGES should still be posted
    expect(postResult.posted).toBe(true);
    expect([...postResult.activeWardenCommentIds]).toEqual([1]);
    expect(result.report?.findings[0]?.id).toBe('WRZ-XPL');
    expect(postResult.findingObservations).toEqual([
      expect.objectContaining({
        outcome: 'deduped',
        finding: recenteredFinding,
        skill: 'test-skill',
        dedupe: expect.objectContaining({
          source: 'warden',
          existingFindingId: 'WRZ-XPL',
        }),
      }),
    ]);
    expect(mockOctokit.pulls.createReview).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'REQUEST_CHANGES',
        comments: [],
      })
    );
  });

  it('handles API errors gracefully', async () => {
    const finding = createFinding();
    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'Found 1 issue',
        findings: [finding],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      },
      renderResult: createRenderResult({
        review: {
          event: 'COMMENT',
          body: 'Test review',
          comments: [{ path: 'test.ts', line: 10, body: 'Test comment' }],
        },
      }),
      reportOn: 'low',
    };

    vi.mocked(mockOctokit.pulls.createReview).mockRejectedValueOnce(new Error('API rate limit'));

    const ctx: ReviewPostingContext = {
      result,

      existingComments: [],
      apiKey: 'test-key',
    };

    const postResult = await postTriggerReview(ctx, mockDeps);

    expect(postResult.posted).toBe(false);
    expect(postResult.shouldFail).toBe(false);
  });

  it('retries with findings in body when GitHub returns line resolution error', async () => {
    const finding = createFinding();
    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'Found 1 issue',
        findings: [finding],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      },
      renderResult: createRenderResult({
        review: {
          event: 'COMMENT',
          body: '',
          comments: [{ path: 'test.ts', line: 10, body: 'Test comment' }],
        },
      }),
      reportOn: 'low',
    };

    vi.mocked(findingToExistingComment).mockReturnValue(createExistingComment());

    // First call fails with line resolution error, second succeeds
    vi.mocked(mockOctokit.pulls.createReview)
      .mockRejectedValueOnce(new Error('Validation Failed: pull_request_review_thread.line does not form part of the diff'))
      .mockResolvedValueOnce({} as never);

    const ctx: ReviewPostingContext = {
      result,
      existingComments: [],
      apiKey: 'test-key',
    };

    const postResult = await postTriggerReview(ctx, mockDeps);

    expect(postResult.posted).toBe(true);
    expect(mockOctokit.pulls.createReview).toHaveBeenCalledTimes(2);
    // Second call should have no inline comments and findings in body
    const secondCall = vi.mocked(mockOctokit.pulls.createReview).mock.calls[1]![0]!;
    expect(secondCall.comments).toEqual([]);
    expect(secondCall.body).toBe('rendered findings body');
  });

  it('does not retry on non-line-resolution errors', async () => {
    const finding = createFinding();
    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'Found 1 issue',
        findings: [finding],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      },
      renderResult: createRenderResult({
        review: {
          event: 'COMMENT',
          body: '',
          comments: [{ path: 'test.ts', line: 10, body: 'Test comment' }],
        },
      }),
      reportOn: 'low',
    };

    vi.mocked(mockOctokit.pulls.createReview).mockRejectedValueOnce(new Error('Resource not accessible by integration'));

    const ctx: ReviewPostingContext = {
      result,
      existingComments: [],
      apiKey: 'test-key',
    };

    const postResult = await postTriggerReview(ctx, mockDeps);

    expect(postResult.posted).toBe(false);
    expect(mockOctokit.pulls.createReview).toHaveBeenCalledTimes(1);
  });

  it('preserves max findings skipped observations when posting fails', async () => {
    const finding1 = createFinding({ id: 'f1' });
    const finding2 = createFinding({ id: 'f2', location: { path: 'test.ts', startLine: 20 } });
    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'Found 2 issues',
        findings: [finding1, finding2],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      },
      renderResult: createRenderResult({
        review: {
          event: 'COMMENT',
          body: '',
          comments: [
            { path: 'test.ts', line: 10, body: 'Comment 1' },
            { path: 'test.ts', line: 20, body: 'Comment 2' },
          ],
        },
      }),
      reportOn: 'low',
      maxFindings: 1,
    };

    vi.mocked(mockOctokit.pulls.createReview).mockRejectedValueOnce(new Error('Resource not accessible by integration'));

    const postResult = await postTriggerReview({
      result,
      existingComments: [],
      apiKey: 'test-key',
    }, mockDeps);

    expect(postResult.posted).toBe(false);
    expect(postResult.findingObservations).toEqual([
      {
        outcome: 'skipped',
        finding: finding2,
        skill: 'test-skill',
        skippedReason: 'max_findings',
      },
      {
        outcome: 'failed',
        finding: finding1,
        skill: 'test-skill',
      },
    ]);
  });

  it('consolidates batch findings before dedup when multiple findings exist', async () => {
    const finding1 = createFinding({ id: 'f1', severity: 'high', title: 'Root cause' });
    const finding2 = createFinding({ id: 'f2', severity: 'medium', title: 'Same root cause, different framing' });

    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'Found 2 issues',
        findings: [finding1, finding2],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      },
      renderResult: createRenderResult({
        review: {
          event: 'COMMENT',
          body: 'Test review',
          comments: [
            { path: 'test.ts', line: 10, body: 'Comment 1' },
            { path: 'test.ts', line: 10, body: 'Comment 2' },
          ],
        },
      }),
      reportOn: 'low',
    };

    // Mock consolidation removing the duplicate
    vi.mocked(consolidateBatchFindings).mockResolvedValue({
      findings: [finding1],
      removedCount: 1,
      removedFindings: [finding2],
    });

    vi.mocked(findingToExistingComment).mockReturnValue(createExistingComment());

    // Re-render mock for the consolidated findings
    vi.mocked(renderSkillReport).mockReturnValue(createRenderResult({
      review: {
        event: 'COMMENT',
        body: 'Re-rendered review',
        comments: [{ path: 'test.ts', line: 10, body: 'Comment 1' }],
      },
    }));

    const ctx: ReviewPostingContext = {
      result,
      existingComments: [],
      apiKey: 'test-key',
    };

    const postResult = await postTriggerReview(ctx, mockDeps);

    // Consolidation should have been called with both findings
    expect(consolidateBatchFindings).toHaveBeenCalledWith(
      [finding1, finding2],
      expect.objectContaining({ apiKey: 'test-key', hashOnly: false })
    );

    expect(postResult.posted).toBe(true);
    // Only the consolidated finding should be posted
    expect(postResult.newComments).toHaveLength(1);
    expect(postResult.findingObservations).toEqual([
      {
        outcome: 'skipped',
        finding: finding2,
        skill: 'test-skill',
        skippedReason: 'duplicate_in_batch',
      },
      {
        outcome: 'posted',
        finding: finding1,
        skill: 'test-skill',
      },
    ]);
  });

  it('skips consolidation when only one finding exists', async () => {
    const finding = createFinding();

    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'Found 1 issue',
        findings: [finding],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      },
      renderResult: createRenderResult({
        review: {
          event: 'COMMENT',
          body: 'Test review',
          comments: [{ path: 'test.ts', line: 10, body: 'Test comment' }],
        },
      }),
      reportOn: 'low',
    };

    vi.mocked(findingToExistingComment).mockReturnValue(createExistingComment());

    const ctx: ReviewPostingContext = {
      result,
      existingComments: [],
      apiKey: 'test-key',
    };

    await postTriggerReview(ctx, mockDeps);

    // Consolidation should NOT be called for a single finding
    expect(consolidateBatchFindings).not.toHaveBeenCalled();
  });
});
