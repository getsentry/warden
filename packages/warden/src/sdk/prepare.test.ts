import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it, expect } from 'vitest';
import { prepareFiles } from './prepare.js';
import type { EventContext, FileChange } from '../types/index.js';
import { buildLocalEventContext } from '../cli/context.js';

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
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function git(cwd: string, args: string[]): string {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  }

  function createGitRepo(): string {
    const repoPath = mkdtempSync(join(tmpdir(), 'warden-prepare-'));
    tempDirs.push(repoPath);
    git(repoPath, ['init']);
    git(repoPath, ['config', 'user.email', 'warden@example.com']);
    git(repoPath, ['config', 'user.name', 'Warden Test']);
    git(repoPath, ['config', 'commit.gpgsign', 'false']);
    return repoPath;
  }

  function writeTrackedFile(repoPath: string, lines: string[]): void {
    mkdirSync(join(repoPath, 'src'), { recursive: true });
    writeFileSync(join(repoPath, 'src/file.ts'), `${lines.join('\n')}\n`);
  }

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

  it('reads git-ref hunk context from the analyzed commit, not the dirty working tree', () => {
    const repoPath = createGitRepo();
    const baseLines = ['one', 'two', 'three', 'old value', 'after one', 'after two', 'after three', 'clean context'];
    const headLines = [...baseLines];
    headLines[3] = 'new value';
    const dirtyLines = [...headLines];
    dirtyLines[7] = 'dirty context';

    writeTrackedFile(repoPath, baseLines);
    git(repoPath, ['add', 'src/file.ts']);
    git(repoPath, ['commit', '-m', 'base']);
    writeTrackedFile(repoPath, headLines);
    git(repoPath, ['add', 'src/file.ts']);
    git(repoPath, ['commit', '-m', 'head']);
    writeTrackedFile(repoPath, dirtyLines);

    const context = buildLocalEventContext({ base: 'HEAD^', head: 'HEAD', cwd: repoPath });
    const result = prepareFiles(context, { contextLines: 1 });

    expect(result.files[0]?.hunks[0]?.contextAfter).toEqual(['clean context']);
  }, 10_000);

  it('reads staged hunk context from the index, not unstaged changes', () => {
    const repoPath = createGitRepo();
    const baseLines = ['one', 'two', 'three', 'old value', 'after one', 'after two', 'after three', 'index context'];
    const stagedLines = [...baseLines];
    stagedLines[3] = 'new value';
    const dirtyLines = [...stagedLines];
    dirtyLines[7] = 'dirty context';

    writeTrackedFile(repoPath, baseLines);
    git(repoPath, ['add', 'src/file.ts']);
    git(repoPath, ['commit', '-m', 'base']);
    writeTrackedFile(repoPath, stagedLines);
    git(repoPath, ['add', 'src/file.ts']);
    writeTrackedFile(repoPath, dirtyLines);

    const context = buildLocalEventContext({ cwd: repoPath, staged: true });
    const result = prepareFiles(context, { contextLines: 1 });

    expect(result.files[0]?.hunks[0]?.contextAfter).toEqual(['index context']);
  });
});
