import { describe, expect, it, vi } from 'vitest';
import type { ResolvedTrigger } from '../config/loader.js';
import type { SkillReport } from '../types/index.js';
import {
  baselineExternalId,
  buildReviewedHunkIndex,
  reviewedEverything,
  collectCarriedRanges,
  createIncrementalBaselineSource,
  hasOpenCarriedComment,
  hunkFingerprint,
  incrementalExternalId,
  isOnCarriedHunk,
  planIncrementalReview,
} from './incremental.js';

const AUTH_PATCH = [
  '@@ -10,3 +10,4 @@ export function authorize(user) {',
  '   const token = readToken();',
  '+  if (!token) return false;',
  '   return verify(token);',
  ' }',
  '@@ -40,2 +41,3 @@ export function logout() {',
  '   clearSession();',
  '+  audit("logout");',
  ' }',
].join('\n');

/** Same hunks as AUTH_PATCH, shifted by an unrelated change merged from the base branch. */
const AUTH_PATCH_SHIFTED = AUTH_PATCH
  .replace('@@ -10,3 +10,4 @@', '@@ -25,3 +25,4 @@')
  .replace('@@ -40,2 +41,3 @@', '@@ -55,2 +56,3 @@');

function trigger(overrides: Partial<ResolvedTrigger> = {}): ResolvedTrigger {
  return {
    id: 'security-review',
    skillExecutionId: 'abc123',
    name: 'security-review',
    skill: 'security-review',
    type: 'pull_request',
    filters: {},
    model: 'openai/gpt-5.5',
    ...overrides,
  } as ResolvedTrigger;
}

const skill = { name: 'security-review', prompt: 'Find injection bugs.' };

function report(overrides: Partial<SkillReport> = {}): SkillReport {
  return {
    skill: 'security-review',
    summary: 'done',
    findings: [],
    incremental: { externalId: 'warden-incremental:v1:abc', carriedRanges: [], complete: true },
    ...overrides,
  };
}

describe('hunkFingerprint', () => {
  it('ignores hunk header line numbers', () => {
    const [before] = buildReviewedHunkIndex([{ filename: 'src/auth.ts', patch: AUTH_PATCH }]).keys();
    const [after] = buildReviewedHunkIndex([{ filename: 'src/auth.ts', patch: AUTH_PATCH_SHIFTED }]).keys();
    expect(after).toBe(before);
  });

  it('differs by file path', () => {
    expect(hunkFingerprint('a.ts', ['+x'])).not.toBe(hunkFingerprint('b.ts', ['+x']));
  });

  it('ignores a trailing empty line from a patch that ends in a newline', () => {
    expect(hunkFingerprint('a.ts', ['+x', ''])).toBe(hunkFingerprint('a.ts', ['+x']));
  });
});

describe('planIncrementalReview', () => {
  it('skips hunks that moved but did not change', () => {
    const reviewed = buildReviewedHunkIndex([{ filename: 'src/auth.ts', patch: AUTH_PATCH }]);
    const plan = planIncrementalReview([{ filename: 'src/auth.ts', patch: AUTH_PATCH_SHIFTED }], reviewed);

    expect([...(plan.skipHunks.get('src/auth.ts') ?? [])]).toEqual([0, 1]);
    expect(plan.carriedRanges).toEqual([
      { path: 'src/auth.ts', startLine: 25, endLine: 28 },
      { path: 'src/auth.ts', startLine: 56, endLine: 58 },
    ]);
  });

  it('reviews a hunk whose content changed since the baseline', () => {
    const reviewed = buildReviewedHunkIndex([{ filename: 'src/auth.ts', patch: AUTH_PATCH }]);
    const edited = AUTH_PATCH.replace('audit("logout")', 'audit("logout", user)');
    const plan = planIncrementalReview([{ filename: 'src/auth.ts', patch: edited }], reviewed);

    expect([...(plan.skipHunks.get('src/auth.ts') ?? [])]).toEqual([0]);
  });

  it('carries each reviewed hunk forward at most once', () => {
    const hunk = '@@ -1,1 +1,2 @@\n context\n+added';
    const reviewed = buildReviewedHunkIndex([{ filename: 'a.ts', patch: hunk }]);
    const plan = planIncrementalReview(
      [{ filename: 'a.ts', patch: `${hunk}\n${hunk.replace('-1,1 +1,2', '-9,1 +10,2')}` }],
      reviewed
    );

    expect([...(plan.skipHunks.get('a.ts') ?? [])]).toEqual([0]);
  });

  it('reviews everything when the baseline is empty', () => {
    const plan = planIncrementalReview([{ filename: 'src/auth.ts', patch: AUTH_PATCH }], new Map());
    expect(plan.skipHunks.size).toBe(0);
    expect(plan.carriedRanges).toEqual([]);
  });
});

describe('incrementalExternalId', () => {
  const policy = { failOn: 'high', reportOn: 'medium' };

  it('is stable for the same skill and config', () => {
    expect(incrementalExternalId(trigger(), skill, policy, 'main')).toBe(
      incrementalExternalId(trigger(), skill, policy, 'main')
    );
    expect(incrementalExternalId(trigger(), skill, policy, 'main')).toMatch(/^warden-incremental:v1:[0-9a-f]{32}$/);
  });

  it('changes when the prompt, model, paths, or policy change', () => {
    const base = incrementalExternalId(trigger(), skill, policy, 'main');
    expect(incrementalExternalId(trigger(), { ...skill, prompt: 'Find SSRF.' }, policy, 'main')).not.toBe(base);
    expect(incrementalExternalId(trigger({ model: 'openai/gpt-5.6' }), skill, policy, 'main')).not.toBe(base);
    expect(incrementalExternalId(trigger({ filters: { paths: ['src/**'] } }), skill, policy, 'main')).not.toBe(base);
    expect(incrementalExternalId(trigger(), skill, { ...policy, reportOn: 'low' }, 'main')).not.toBe(base);
  });

  it('changes when the PR is retargeted to another base branch', () => {
    // Baselines are rebuilt against the current base, so an old check must not match.
    expect(incrementalExternalId(trigger(), skill, policy, 'release/1.x')).not.toBe(
      incrementalExternalId(trigger(), skill, policy, 'main')
    );
  });
});

describe('reviewedEverything', () => {
  it('accepts a clean run', () => {
    expect(reviewedEverything(report())).toBe(true);
  });

  it('rejects a run where any hunk failed', () => {
    expect(reviewedEverything(report({ failedHunks: 1 }))).toBe(false);
    expect(reviewedEverything(report({ failedExtractions: 1 }))).toBe(false);
  });

  it('rejects a run where scan limits skipped files', () => {
    expect(
      reviewedEverything(report({ skippedFiles: [{ filename: 'big.ts', reason: 'limit:changed_lines' }] }))
    ).toBe(false);
  });

  it('accepts a run where files were skipped by ignore rules', () => {
    expect(
      reviewedEverything(report({ skippedFiles: [{ filename: 'pnpm-lock.yaml', reason: 'ignored:builtin' }] }))
    ).toBe(true);
    expect(
      reviewedEverything(report({ skippedFiles: [{ filename: 'docs/a.md', reason: 'ignored:user', pattern: 'docs/**' }] }))
    ).toBe(true);
  });

  it('rejects a run where a file was skipped as generated', () => {
    // Generated detection reads file content, so the file can be reviewable on a later push.
    expect(
      reviewedEverything(report({ skippedFiles: [{ filename: 'src/schema.ts', reason: 'ignored:generated' }] }))
    ).toBe(false);
  });
});

describe('baselineExternalId', () => {
  it('returns the id for a complete run', () => {
    expect(baselineExternalId(report())).toBe('warden-incremental:v1:abc');
  });

  it('withholds the id when incremental review is off or the run was incomplete', () => {
    expect(baselineExternalId(report({ incremental: undefined }))).toBeUndefined();
    expect(
      baselineExternalId(report({ incremental: { externalId: 'x', carriedRanges: [], complete: false } }))
    ).toBeUndefined();
  });
});

describe('collectCarriedRanges', () => {
  it('tags ranges with the skill that carried them', () => {
    const ranges = collectCarriedRanges([
      report({
        incremental: {
          externalId: 'x',
          carriedRanges: [{ path: 'a.ts', startLine: 1, endLine: 3 }],
          complete: true,
        },
      }),
      report({ skill: 'code-review', incremental: undefined }),
    ]);
    expect(ranges).toEqual([{ path: 'a.ts', startLine: 1, endLine: 3, skill: 'security-review' }]);
  });
});

describe('isOnCarriedHunk', () => {
  const ranges = [{ path: 'a.ts', startLine: 5, endLine: 9, skill: 'security-review' }];

  it('matches a comment inside a range carried by its skill', () => {
    expect(isOnCarriedHunk({ path: 'a.ts', line: 7, skills: ['security-review'] }, ranges)).toBe(true);
  });

  it('does not match another skill, file, or line', () => {
    expect(isOnCarriedHunk({ path: 'a.ts', line: 7, skills: ['code-review'] }, ranges)).toBe(false);
    expect(isOnCarriedHunk({ path: 'b.ts', line: 7, skills: ['security-review'] }, ranges)).toBe(false);
    expect(isOnCarriedHunk({ path: 'a.ts', line: 10, skills: ['security-review'] }, ranges)).toBe(false);
  });

  it('matches a comment with no recorded skill', () => {
    expect(isOnCarriedHunk({ path: 'a.ts', line: 5 }, ranges)).toBe(true);
  });

  it('matches a shifted comment by its current GitHub line', () => {
    // Marker keeps the line from the original post; GitHub tracks the moved hunk.
    expect(isOnCarriedHunk({ path: 'a.ts', line: 1, currentLine: 6, skills: ['security-review'] }, ranges)).toBe(true);
  });
});

describe('hasOpenCarriedComment', () => {
  const ranges = [{ path: 'a.ts', startLine: 5, endLine: 9, skill: 'security-review' }];
  const comment = { id: 1, path: 'a.ts', line: 7, title: 't', description: 'd', contentHash: 'h', isWarden: true };

  it('is true for an unresolved Warden comment on a carried hunk', () => {
    expect(hasOpenCarriedComment([comment], ranges)).toBe(true);
  });

  it('ignores resolved, non-Warden, and uncarried comments', () => {
    expect(hasOpenCarriedComment([{ ...comment, isResolved: true }], ranges)).toBe(false);
    expect(hasOpenCarriedComment([{ ...comment, isWarden: false }], ranges)).toBe(false);
    expect(hasOpenCarriedComment([{ ...comment, line: 20 }], ranges)).toBe(false);
  });
});

describe('createIncrementalBaselineSource', () => {
  const externalId = 'warden-incremental:v1:match';

  function checkRun(overrides: Record<string, unknown> = {}) {
    return {
      name: 'warden: security-review',
      status: 'completed',
      conclusion: 'success',
      external_id: externalId,
      app: { slug: 'sentry-warden' },
      ...overrides,
    };
  }

  function mockOctokit(checksBySha: Record<string, unknown[]>, options: { compareFails?: boolean } = {}) {
    const listForRef = vi.fn(async ({ ref }: { ref: string }) => ({
      data: { check_runs: checksBySha[ref] ?? [] },
    }));
    const compareCommitsWithBasehead = vi.fn(async () => {
      if (options.compareFails) throw new Error('Not Found');
      return { data: { files: [{ filename: 'src/auth.ts', patch: AUTH_PATCH }] } };
    });
    const octokit = {
      paginate: vi.fn(async () => [{ sha: 'c1' }, { sha: 'c2' }, { sha: 'c3' }, { sha: 'head' }]),
      pulls: { listCommits: vi.fn() },
      checks: { listForRef },
      repos: { compareCommitsWithBasehead },
    };
    return { octokit, listForRef, compareCommitsWithBasehead };
  }

  const options = {
    owner: 'getsentry',
    repo: 'warden',
    pullNumber: 7,
    headSha: 'head',
    baseSha: 'base',
  };
  const trustedApp = 'sentry-warden';

  it('uses the newest earlier commit with a matching clean check', async () => {
    const { octokit, compareCommitsWithBasehead } = mockOctokit({
      c3: [checkRun({ conclusion: 'failure' })],
      c2: [checkRun()],
      c1: [checkRun()],
    });
    const source = createIncrementalBaselineSource(octokit as never, { ...options, warn: vi.fn() });

    const baseline = await source.baselineFor(externalId, trustedApp);

    expect(baseline?.sha).toBe('c2');
    expect(baseline?.reviewed.size).toBe(2);
    expect(compareCommitsWithBasehead).toHaveBeenCalledWith(
      expect.objectContaining({ basehead: 'base...c2' })
    );
  });

  it('ignores checks that Warden did not create', async () => {
    const { octokit } = mockOctokit({ c3: [checkRun({ name: 'lint' })] });
    const source = createIncrementalBaselineSource(octokit as never, { ...options, warn: vi.fn() });

    expect(await source.baselineFor(externalId, trustedApp)).toBeUndefined();
  });

  it('ignores look-alike checks from another app', async () => {
    const { octokit } = mockOctokit({
      c3: [checkRun({ app: { slug: 'some-other-app' } })],
      c2: [checkRun({ app: null })],
    });
    const source = createIncrementalBaselineSource(octokit as never, { ...options, warn: vi.fn() });

    expect(await source.baselineFor(externalId, trustedApp)).toBeUndefined();
  });

  it('matches each lookup against its own trusted app', async () => {
    const { octokit } = mockOctokit({
      c3: [checkRun({ app: { slug: 'some-other-app' } })],
      c2: [checkRun()],
    });
    const source = createIncrementalBaselineSource(octokit as never, { ...options, warn: vi.fn() });

    expect((await source.baselineFor(externalId, trustedApp))?.sha).toBe('c2');
    expect((await source.baselineFor(externalId, 'some-other-app'))?.sha).toBe('c3');
  });

  it('shares commit lookups across skills', async () => {
    const { octokit, listForRef } = mockOctokit({ c3: [checkRun()] });
    const source = createIncrementalBaselineSource(octokit as never, { ...options, warn: vi.fn() });

    await Promise.all([source.baselineFor(externalId, trustedApp), source.baselineFor('warden-incremental:v1:other', trustedApp)]);

    expect(octokit.paginate).toHaveBeenCalledTimes(1);
    expect(listForRef).toHaveBeenCalledTimes(3);
  });

  it('fails open when checks cannot be read', async () => {
    const { octokit } = mockOctokit({});
    octokit.paginate.mockRejectedValueOnce(new Error('Resource not accessible by integration'));
    const warn = vi.fn();
    const source = createIncrementalBaselineSource(octokit as never, { ...options, warn });

    expect(await source.baselineFor(externalId, trustedApp)).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('reviewing the full PR'));
  });

  it('fails open when the baseline diff cannot be loaded', async () => {
    const { octokit } = mockOctokit({ c3: [checkRun()] }, { compareFails: true });
    const warn = vi.fn();
    const source = createIncrementalBaselineSource(octokit as never, { ...options, warn });

    expect(await source.baselineFor(externalId, trustedApp)).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not load the diff'));
  });
});
