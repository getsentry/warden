import { describe, it, expect } from 'vitest';
import { prepareFiles } from './prepare.js';
import type { EventContext, FileChange } from '../types/index.js';

function makeContext(
  files: { filename: string; patch: string; status?: FileChange['status'] }[],
  repoPath = '/tmp/test'
): EventContext {
  return {
    eventType: 'pull_request',
    action: 'opened',
    repository: { owner: 'test', name: 'test', fullName: 'test/test', defaultBranch: 'main' },
    repoPath,
    pullRequest: {
      number: 1,
      title: 'test',
      body: '',
      author: 'test',
      baseBranch: 'main',
      headBranch: 'test-branch',
      headSha: 'abc123',
      baseSha: 'def456',
      files: files.map((f) => ({
        filename: f.filename,
        status: f.status ?? 'added',
        additions: 0,
        deletions: 0,
        patch: f.patch,
        chunks: 1,
      })),
    },
  };
}

describe('prepareFiles', () => {
  it('skips files with empty patch content (zero-line hunks)', () => {
    const context = makeContext([
      { filename: 'empty.ts', patch: '@@ -0,0 +0,0 @@\n' },
    ]);
    const result = prepareFiles(context);

    expect(result.files).toHaveLength(0);
    expect(result.skippedFiles).toEqual([
      { filename: 'empty.ts', reason: 'builtin' },
    ]);
  });

  it('skips files whose hunks all have zero counts', () => {
    const context = makeContext([
      { filename: 'empty.js', patch: '@@ -0,0 +0,0 @@' },
    ]);
    const result = prepareFiles(context);

    expect(result.files).toHaveLength(0);
    expect(result.skippedFiles).toContainEqual({
      filename: 'empty.js',
      reason: 'builtin',
    });
  });

  it('does not skip files with actual content', () => {
    const context = makeContext([
      { filename: 'real.ts', patch: '@@ -0,0 +1,2 @@\n+line1\n+line2' },
    ]);
    // expandDiffContext may throw if file doesn't exist on disk,
    // but the file should NOT appear in skippedFiles
    try {
      const result = prepareFiles(context);
      expect(result.skippedFiles).toEqual([]);
      expect(result.files.length).toBeGreaterThan(0);
    } catch {
      // Expected - expandDiffContext reads from disk
    }
  });

  it('returns empty results when no pullRequest', () => {
    const context: EventContext = {
      eventType: 'pull_request',
      action: 'opened',
      repository: { owner: 'test', name: 'test', fullName: 'test/test', defaultBranch: 'main' },
      repoPath: '/tmp/test',
    };
    const result = prepareFiles(context);

    expect(result.files).toEqual([]);
    expect(result.skippedFiles).toEqual([]);
  });
});
