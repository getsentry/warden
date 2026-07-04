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
import { ReviewFeedbackGate } from './review-feedback-gate.js';

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

    vi.mocked(mockOctokit.pulls.createReview).mockResolvedValue({} as never);
    vi.mocked(mockOctokit.pulls.get).mockResolvedValue({ data: { head: { sha: 'abc123' } } } as never);
    mockDeps = {
      octokit: mockOctokit,
      context: mockContext,
      feedbackGate: new ReviewFeedbackGate(mockOctokit, mockContext),
    };
  });

  const mockOctokit = {
    pulls: {
      createReview: vi.fn().mockResolvedValue({}),
      get: vi.fn().mockResolvedValue({ data: { head: { sha: 'abc123' } } }),
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

  // Rebuilt per test so the gate's head-freshness cache starts empty.
  let mockDeps: ReviewPosterDeps;

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
      body: '',
      comments: [expect.objectContaining({ path: 'test.ts', line: 10, side: 'RIGHT', body: 'Test comment' })],
    });
  });

  it('skips body-only non-blocking reviews', async () => {
    const finding = createFinding({ location: undefined });
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
          body: 'Locationless finding',
          comments: [],
        },
      }),
      reportOn: 'low',
    };

    const postResult = await postTriggerReview({
      result,
      existingComments: [],
      apiKey: 'test-key',
    }, mockDeps);

    expect(postResult.posted).toBe(false);
    expect(postResult.findingObservations).toEqual([
      { outcome: 'skipped', finding, skill: 'test-skill', skippedReason: 'no_inline_location' },
    ]);
    expect(mockOctokit.pulls.createReview).not.toHaveBeenCalled();
  });

  it('skips all GitHub writes when the PR head advances during consolidation', async () => {
    const findings = [createFinding(), createFinding({ id: 'test-2', title: 'Second finding' })];
    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'Found 2 issues',
        findings,
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

    // The head moves while the LLM consolidation runs.
    vi.mocked(consolidateBatchFindings).mockImplementation(async (batch) => {
      vi.mocked(mockOctokit.pulls.get).mockResolvedValue({ data: { head: { sha: 'new-head-sha' } } } as never);
      return { findings: batch, removedCount: 0, removedFindings: [] };
    });
    vi.mocked(deduplicateFindings).mockResolvedValue({
      newFindings: findings,
      duplicateActions: [{ finding: findings[0]!, existingComment: createExistingComment(), matchType: 'hash', originalFindingId: findings[0]!.id }],
    } as never);

    const postResult = await postTriggerReview({
      result,
      existingComments: [createExistingComment()],
      apiKey: 'test-key',
    }, mockDeps);

    expect(postResult.posted).toBe(false);
    expect(mockOctokit.pulls.createReview).not.toHaveBeenCalled();
    expect(processDuplicateActions).not.toHaveBeenCalled();
  });

  it('skips the review write when the PR head advances during duplicate processing', async () => {
    // The gate verifies before duplicate processing; advance the clock past
    // its cache window inside that write phase so the pre-review check
    // re-fetches the head.
    let now = 1_750_000_000_000;
    const dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => now);
    try {
      const findings = [createFinding(), createFinding({ id: 'test-2', title: 'Second finding' })];
      const result: TriggerResult = {
        triggerName: 'test-trigger',
        skillName: 'test-skill',
        report: {
          skill: 'test-skill',
          summary: 'Found 2 issues',
          findings,
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

      vi.mocked(deduplicateFindings).mockResolvedValue({
        newFindings: [findings[0]!],
        duplicateActions: [{ finding: findings[1]!, existingComment: createExistingComment(), matchType: 'hash', originalFindingId: findings[1]!.id }],
      } as never);
      // Dedup shrank the finding set, so the poster re-renders before posting.
      vi.mocked(renderSkillReport).mockReturnValue(createRenderResult({
        review: {
          event: 'COMMENT',
          body: '',
          comments: [{ path: 'test.ts', line: 10, body: 'Test comment' }],
        },
      }));
      vi.mocked(processDuplicateActions).mockImplementation(async () => {
        now += 60_000;
        vi.mocked(mockOctokit.pulls.get).mockResolvedValue({ data: { head: { sha: 'new-head-sha' } } } as never);
        return { updated: 1, reacted: 0, skipped: 0, failed: 0 };
      });

      const postResult = await postTriggerReview({
        result,
        existingComments: [createExistingComment()],
        apiKey: 'test-key',
      }, mockDeps);

      expect(processDuplicateActions).toHaveBeenCalled();
      expect(postResult.posted).toBe(false);
      expect(mockOctokit.pulls.createReview).not.toHaveBeenCalled();
      // The gate verified twice: before duplicate processing and again before
      // the review write, where it saw the new head.
      expect(mockOctokit.pulls.get).toHaveBeenCalledTimes(2);
      // No swallowed error: the findings were not marked failed.
      expect(postResult.findingObservations.filter((o) => o.outcome === 'failed')).toEqual([]);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it('marks locationless findings in a mixed review as checks-only instead of posted', async () => {
    const inlineFinding = createFinding();
    const bodyFinding = createFinding({ id: 'test-2', title: 'Locationless finding', location: undefined });
    const result: TriggerResult = {
      triggerName: 'test-trigger',
      skillName: 'test-skill',
      report: {
        skill: 'test-skill',
        summary: 'Found 2 issues',
        findings: [inlineFinding, bodyFinding],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.01 },
      },
      renderResult: createRenderResult({
        review: {
          event: 'COMMENT',
          body: 'Locationless finding body',
          comments: [{ path: 'test.ts', line: 10, body: 'Test comment' }],
        },
      }),
      reportOn: 'low',
    };

    vi.mocked(findingToExistingComment).mockReturnValue(createExistingComment());

    const postResult = await postTriggerReview({
      result,
      existingComments: [],
      apiKey: 'test-key',
    }, mockDeps);

    expect(postResult.posted).toBe(true);
    expect(mockOctokit.pulls.createReview).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'COMMENT', body: '' })
    );
    expect(postResult.findingObservations).toEqual([
      { outcome: 'posted', finding: inlineFinding, skill: 'test-skill' },
      { outcome: 'skipped', finding: bodyFinding, skill: 'test-skill', skippedReason: 'no_inline_location' },
    ]);
  });

  it('does not post a blocking review when reportOn filters out all findings', async () => {
    // reportOn stricter than failOn: the renderer emits a REQUEST_CHANGES
    // fallback, but the reportOn early return runs before the
    // needsRequestChanges branch, so nothing posts. The workflow's
    // wouldPostBlockingReview escalation predicate relies on this.
    const finding = createFinding({ severity: 'medium' });
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
          body: 'Findings exceed the configured threshold. See the GitHub Check for details.',
          comments: [],
        },
      }),
      reportOn: 'high',
      failOn: 'medium',
      requestChanges: true,
    };

    const postResult = await postTriggerReview({
      result,
      existingComments: [],
      apiKey: 'test-key',
    }, mockDeps);

    expect(postResult.posted).toBe(false);
    expect(mockOctokit.pulls.createReview).not.toHaveBeenCalled();
    expect(postResult.findingObservations).toEqual([]);
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

  it('does not leave body-only comments when GitHub returns line resolution error', async () => {
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

    // First call fails with line resolution error. The fallback is body-only,
    // so Warden should rely on checks instead of leaving an unresolvable review.
    vi.mocked(mockOctokit.pulls.createReview)
      .mockRejectedValueOnce(new Error('Validation Failed: pull_request_review_thread.line does not form part of the diff'));

    const ctx: ReviewPostingContext = {
      result,
      existingComments: [],
      apiKey: 'test-key',
    };

    const postResult = await postTriggerReview(ctx, mockDeps);

    expect(postResult.posted).toBe(false);
    expect(postResult.newComments).toHaveLength(0);
    expect(postResult.findingObservations).toEqual([
      { outcome: 'skipped', finding, skill: 'test-skill', skippedReason: 'no_inline_location' },
    ]);
    expect(mockOctokit.pulls.createReview).toHaveBeenCalledTimes(1);
  });

  it('still posts body-only request changes reviews', async () => {
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
          body: 'Blocking finding in body',
          comments: [],
        },
      }),
      reportOn: 'low',
      requestChanges: true,
      failOn: 'high',
    };

    const postResult = await postTriggerReview({
      result,
      existingComments: [],
      apiKey: 'test-key',
    }, mockDeps);

    expect(postResult.posted).toBe(true);
    expect(mockOctokit.pulls.createReview).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'REQUEST_CHANGES',
        body: 'Blocking finding in body',
        comments: [],
      })
    );
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
