import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Octokit } from '@octokit/rest';
import type { ExistingComment } from '../../output/dedup.js';
import type { Finding } from '../../types/index.js';

// Mock the judge module - it makes LLM calls
vi.mock('./judge.js', () => ({
  evaluateFix: vi.fn(),
}));

// Mock GitHub helpers - they make API calls
vi.mock('./github.js', () => ({
  fetchFollowUpChanges: vi.fn(),
  fetchFileContent: vi.fn(),
  postThreadReply: vi.fn(),
  formatFailedFixReply: vi.fn((sha: string, reasoning: string) => {
    return `**Fix attempt** (${sha.slice(0, 7)}): ${reasoning}`;
  }),
}));

import { evaluateFixAttempts } from './index.js';
import { evaluateFix } from './judge.js';
import { fetchFollowUpChanges, fetchFileContent } from './github.js';

const mockEvaluateFix = vi.mocked(evaluateFix);
const mockFetchFollowUpChanges = vi.mocked(fetchFollowUpChanges);
const mockFetchFileContent = vi.mocked(fetchFileContent);

function createComment(overrides: Partial<ExistingComment> = {}): ExistingComment {
  return {
    id: 1,
    path: 'src/handler.ts',
    line: 15,
    title: 'SQL injection',
    description: 'User input concatenated into SQL',
    contentHash: 'abc123',
    isWarden: true,
    isResolved: false,
    threadId: 'thread-1',
    ...overrides,
  };
}

function createFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'f1',
    severity: 'high',
    title: 'SQL injection',
    description: 'User input concatenated into SQL',
    location: { path: 'src/handler.ts', startLine: 15 },
    ...overrides,
  };
}

const mockOctokit = {} as Octokit;
const defaultContext = {
  owner: 'test-owner',
  repo: 'test-repo',
  baseSha: 'base123',
  headSha: 'head456',
};

describe('evaluateFixAttempts', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default: patches exist for relevant files
    mockFetchFollowUpChanges.mockResolvedValue({
      patches: new Map([['src/handler.ts', '@@ -14,1 +14,1 @@\n-old\n+new']]),
      commitMessages: ['Fix issue'],
    });

    // Default: file content available
    mockFetchFileContent.mockResolvedValue('1: const x = 1;\n2: const y = 2;');
  });

  it('returns empty result when no unresolved Warden comments', async () => {
    const result = await evaluateFixAttempts(mockOctokit, [], defaultContext, [], 'api-key');

    expect(result.evaluated).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.toResolve).toHaveLength(0);
    expect(result.toReply).toHaveLength(0);
    expect(result.evaluations).toHaveLength(0);
  });

  it('skips resolved comments', async () => {
    const resolved = createComment({ isResolved: true });
    const result = await evaluateFixAttempts(mockOctokit, [resolved], defaultContext, [], 'api-key');

    expect(result.evaluated).toBe(0);
    expect(mockEvaluateFix).not.toHaveBeenCalled();
  });

  it('skips non-Warden comments', async () => {
    const external = createComment({ isWarden: false });
    const result = await evaluateFixAttempts(mockOctokit, [external], defaultContext, [], 'api-key');

    expect(result.evaluated).toBe(0);
    expect(mockEvaluateFix).not.toHaveBeenCalled();
  });

  it('skips all when no patches found', async () => {
    mockFetchFollowUpChanges.mockResolvedValue({ patches: new Map(), commitMessages: [] });

    const comment = createComment();
    const result = await evaluateFixAttempts(mockOctokit, [comment], defaultContext, [], 'api-key');

    expect(result.skipped).toBe(1);
    expect(result.evaluated).toBe(0);
  });

  it('categorizes resolved verdicts into toResolve', async () => {
    const comment = createComment();
    mockEvaluateFix.mockResolvedValue({
      verdict: { status: 'resolved', reasoning: 'Fix applied correctly' },
      usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
      usedFallback: false,
    });

    const result = await evaluateFixAttempts(mockOctokit, [comment], defaultContext, [], 'api-key');

    expect(result.evaluated).toBe(1);
    expect(result.toResolve).toHaveLength(1);
    expect(result.toResolve[0]).toBe(comment);
    expect(result.toReply).toHaveLength(0);
    expect(result.evaluations).toHaveLength(1);
    expect(result.evaluations[0]).toMatchObject({
      path: 'src/handler.ts',
      line: 15,
      verdict: 'resolved',
      usedFallback: false,
    });
  });

  it('categorizes attempted_failed verdicts into toReply', async () => {
    const comment = createComment();
    mockEvaluateFix.mockResolvedValue({
      verdict: { status: 'attempted_failed', reasoning: 'Only partial fix' },
      usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
      usedFallback: false,
    });

    const result = await evaluateFixAttempts(mockOctokit, [comment], defaultContext, [], 'api-key');

    expect(result.evaluated).toBe(1);
    expect(result.toReply).toHaveLength(1);
    expect(result.toReply[0]?.comment).toBe(comment);
    expect(result.toResolve).toHaveLength(0);
    expect(result.evaluations).toHaveLength(1);
    expect(result.evaluations[0]).toMatchObject({
      verdict: 'attempted_failed',
      reasoning: 'Only partial fix',
    });
  });

  it('skips not_attempted verdicts', async () => {
    const comment = createComment();
    mockEvaluateFix.mockResolvedValue({
      verdict: { status: 'not_attempted', reasoning: 'Unrelated changes' },
      usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
      usedFallback: false,
    });

    const result = await evaluateFixAttempts(mockOctokit, [comment], defaultContext, [], 'api-key');

    expect(result.evaluated).toBe(1);
    expect(result.toResolve).toHaveLength(0);
    expect(result.toReply).toHaveLength(0);
    expect(result.evaluations).toHaveLength(1);
    expect(result.evaluations[0]).toMatchObject({
      verdict: 'not_attempted',
    });
  });

  it('overrides resolved verdict when issue is re-detected', async () => {
    const comment = createComment();
    const finding = createFinding(); // Same title+path as comment

    mockEvaluateFix.mockResolvedValue({
      verdict: { status: 'resolved', reasoning: 'Fix applied' },
      usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
      usedFallback: false,
    });

    const result = await evaluateFixAttempts(
      mockOctokit,
      [comment],
      defaultContext,
      [finding],
      'api-key'
    );

    // Judge said resolved, but re-detection overrides to toReply
    expect(result.toResolve).toHaveLength(0);
    expect(result.toReply).toHaveLength(1);
    expect(result.evaluations).toHaveLength(1);
    expect(result.evaluations[0]).toMatchObject({
      verdict: 're_detected',
    });
  });

  it('limits evaluation to MAX_EVALUATIONS (20)', async () => {
    const comments = Array.from({ length: 25 }, (_, i) =>
      createComment({ id: i + 1, threadId: `thread-${i}` })
    );

    mockEvaluateFix.mockResolvedValue({
      verdict: { status: 'not_attempted', reasoning: 'No changes' },
      usage: { inputTokens: 50, outputTokens: 20, costUSD: 0.0005 },
      usedFallback: false,
    });

    const result = await evaluateFixAttempts(mockOctokit, comments, defaultContext, [], 'api-key');

    expect(result.evaluated).toBe(20);
    expect(result.skipped).toBe(5);
    expect(mockEvaluateFix).toHaveBeenCalledTimes(20);
  });

  it('tracks failed evaluations and uses fallback', async () => {
    const comment = createComment();
    mockEvaluateFix.mockResolvedValue({
      verdict: { status: 'not_attempted', reasoning: 'Evaluation failed' },
      usage: { inputTokens: 50, outputTokens: 0, costUSD: 0.0001 },
      usedFallback: true,
    });

    const result = await evaluateFixAttempts(mockOctokit, [comment], defaultContext, [], 'api-key');

    expect(result.evaluated).toBe(1);
    expect(result.failedEvaluations).toBe(1);
    expect(result.toResolve).toHaveLength(0);
    expect(result.toReply).toHaveLength(0);
    expect(result.evaluations).toHaveLength(1);
    expect(result.evaluations[0]).toMatchObject({
      usedFallback: true,
    });
  });

  it('aggregates usage across multiple evaluations', async () => {
    const comments = [
      createComment({ id: 1, threadId: 'thread-1' }),
      createComment({ id: 2, threadId: 'thread-2' }),
    ];

    mockEvaluateFix
      .mockResolvedValueOnce({
        verdict: { status: 'resolved', reasoning: 'Fixed' },
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
        usedFallback: false,
      })
      .mockResolvedValueOnce({
        verdict: { status: 'not_attempted', reasoning: 'Unrelated' },
        usage: { inputTokens: 80, outputTokens: 30, costUSD: 0.0008 },
        usedFallback: false,
      });

    const result = await evaluateFixAttempts(mockOctokit, comments, defaultContext, [], 'api-key');

    expect(result.usage.inputTokens).toBe(180);
    expect(result.usage.outputTokens).toBe(80);
    expect(result.usage.costUSD).toBeCloseTo(0.0018);
  });

  it('extracts finding ID from comment title into evaluations', async () => {
    const comment = createComment({ title: '[WRZ-XPL] baseSha is set to branch name' });
    mockEvaluateFix.mockResolvedValue({
      verdict: { status: 'resolved', reasoning: 'Fixed' },
      usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
      usedFallback: false,
    });

    const result = await evaluateFixAttempts(mockOctokit, [comment], defaultContext, [], 'api-key');

    expect(result.evaluations).toHaveLength(1);
    expect(result.evaluations[0]?.findingId).toBe('WRZ-XPL');
  });

  it('counts skipped when pre-fix code fetch fails', async () => {
    const comment = createComment();
    mockFetchFileContent.mockRejectedValueOnce(new Error('API rate limit'));

    const result = await evaluateFixAttempts(mockOctokit, [comment], defaultContext, [], 'api-key');

    expect(result.skipped).toBe(1);
    expect(result.evaluated).toBe(0);
    expect(mockEvaluateFix).not.toHaveBeenCalled();
  });

  it('re-detects findings when comment title has ID prefix', async () => {
    const comment = createComment({ title: '[WRZ-SQL] SQL injection' });
    const finding = createFinding({ title: 'SQL injection' }); // No prefix

    mockEvaluateFix.mockResolvedValue({
      verdict: { status: 'resolved', reasoning: 'Fix applied' },
      usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
      usedFallback: false,
    });

    const result = await evaluateFixAttempts(
      mockOctokit,
      [comment],
      defaultContext,
      [finding],
      'api-key'
    );

    // Re-detection should match despite ID prefix on comment title
    expect(result.toResolve).toHaveLength(0);
    expect(result.toReply).toHaveLength(1);
    expect(result.evaluations[0]).toMatchObject({ verdict: 're_detected' });
  });

  it('handles multiple comments with mixed verdicts', async () => {
    const comments = [
      createComment({ id: 1, threadId: 'thread-1', path: 'src/a.ts' }),
      createComment({ id: 2, threadId: 'thread-2', path: 'src/b.ts' }),
      createComment({ id: 3, threadId: 'thread-3', path: 'src/c.ts' }),
    ];

    mockFetchFollowUpChanges.mockResolvedValue({
      patches: new Map([
        ['src/a.ts', 'patch-a'],
        ['src/b.ts', 'patch-b'],
        ['src/c.ts', 'patch-c'],
      ]),
      commitMessages: ['Fix issues'],
    });

    mockEvaluateFix
      .mockResolvedValueOnce({
        verdict: { status: 'resolved', reasoning: 'Fixed' },
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
        usedFallback: false,
      })
      .mockResolvedValueOnce({
        verdict: { status: 'attempted_failed', reasoning: 'Partial fix' },
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
        usedFallback: false,
      })
      .mockResolvedValueOnce({
        verdict: { status: 'not_attempted', reasoning: 'Unrelated' },
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
        usedFallback: false,
      });

    const result = await evaluateFixAttempts(mockOctokit, comments, defaultContext, [], 'api-key');

    expect(result.evaluated).toBe(3);
    expect(result.toResolve).toHaveLength(1);
    expect(result.toReply).toHaveLength(1);
    expect(result.failedEvaluations).toBe(0);
  });
});
