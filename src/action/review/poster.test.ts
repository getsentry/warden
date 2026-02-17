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

  it('posts a review with findings', async () => {
    const finding = createFinding();
    const result: TriggerResult = {
      triggerName: 'test-trigger',
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
      reportOn: 'info',
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
      reportOn: 'info',
    };

    const existingComment = createExistingComment({ isWarden: false });

    // Mock that the finding is a duplicate
    vi.mocked(deduplicateFindings).mockResolvedValue({
      newFindings: [],
      duplicateActions: [{ type: 'react_external', finding, existingComment, matchType: 'hash' }],
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
      [{ type: 'react_external', finding, existingComment, matchType: 'hash' }],
      'test-skill'
    );
    // Since all findings were duplicates and failOn not triggered, nothing new to post
    expect(postResult.posted).toBe(false);
  });

  it('posts REQUEST_CHANGES when all findings deduplicated but failOn threshold met', async () => {
    const finding = createFinding({ severity: 'high' });
    const result: TriggerResult = {
      triggerName: 'test-trigger',
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
      reportOn: 'info',
      failOn: 'high',
      requestChanges: true,
    };

    const existingComment = createExistingComment({ isWarden: true });

    // Mock that the finding is a duplicate (already posted in previous run)
    vi.mocked(deduplicateFindings).mockResolvedValue({
      newFindings: [],
      duplicateActions: [{ type: 'update_warden', finding, existingComment, matchType: 'hash' }],
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
      [{ type: 'update_warden', finding, existingComment, matchType: 'hash' }],
      'test-skill'
    );
    // Even though all findings were deduplicated, REQUEST_CHANGES should still be posted
    expect(postResult.posted).toBe(true);
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
      reportOn: 'info',
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
      reportOn: 'info',
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
      reportOn: 'info',
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

  it('consolidates batch findings before dedup when multiple findings exist', async () => {
    const finding1 = createFinding({ id: 'f1', severity: 'high', title: 'Root cause' });
    const finding2 = createFinding({ id: 'f2', severity: 'medium', title: 'Same root cause, different framing' });

    const result: TriggerResult = {
      triggerName: 'test-trigger',
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
      reportOn: 'info',
    };

    // Mock consolidation removing the duplicate
    vi.mocked(consolidateBatchFindings).mockResolvedValue({
      findings: [finding1],
      removedCount: 1,
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
      { apiKey: 'test-key', hashOnly: false }
    );

    expect(postResult.posted).toBe(true);
    // Only the consolidated finding should be posted
    expect(postResult.newComments).toHaveLength(1);
  });

  it('skips consolidation when only one finding exists', async () => {
    const finding = createFinding();

    const result: TriggerResult = {
      triggerName: 'test-trigger',
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
      reportOn: 'info',
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
