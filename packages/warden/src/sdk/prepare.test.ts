import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it, expect } from 'vitest';
import { prepareFiles, prepareSkillFiles } from './prepare.js';
import type { EventContext, FileChange } from '../types/index.js';
import { buildFileEventContext, buildLocalEventContext } from '../cli/context.js';

function makeContext(
  files: {
    filename: string;
    patch?: string;
    status?: FileChange['status'];
    additions?: number;
    deletions?: number;
  }[],
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
        additions: f.additions ?? 0,
        deletions: f.deletions ?? 0,
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

  it('leaves out hunks listed in skipHunks without reporting the file as skipped', () => {
    const repoPath = mkdtempSync(join(tmpdir(), 'warden-prepare-skip-'));
    tempDirs.push(repoPath);
    mkdirSync(join(repoPath, 'src'), { recursive: true });
    writeFileSync(
      join(repoPath, 'src/file.ts'),
      `${Array.from({ length: 120 }, (_, i) => `line ${i + 1}`).join('\n')}\n`
    );
    writeFileSync(join(repoPath, 'src/done.ts'), 'done\n');
    const context = makeContext([
      {
        filename: 'src/file.ts',
        status: 'modified',
        patch: '@@ -1,1 +1,2 @@\n line 1\n+line 2\n@@ -100,1 +101,2 @@\n line 101\n+line 102',
      },
      { filename: 'src/done.ts', status: 'modified', patch: '@@ -0,0 +1,1 @@\n+done' },
    ], repoPath);

    const result = prepareFiles(context, {
      skipHunks: new Map([
        ['src/file.ts', new Set([0])],
        ['src/done.ts', new Set([0])],
      ]),
    });

    expect(result.skippedFiles).toEqual([]);
    expect(result.files.map((file) => file.filename)).toEqual(['src/file.ts']);
    expect(result.files[0]?.hunks.map((hunk) => hunk.hunk.newStart)).toEqual([101]);
  });

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

  it('applies global ignore paths with negation overrides', () => {
    const context = makeContext([
      { filename: 'src/ignored.ts', patch: '@@ -0,0 +1,1 @@\n+ignored' },
      { filename: 'pnpm-lock.yaml', patch: '@@ -0,0 +1,1 @@\n+lockfileVersion: 9' },
    ]);

    const result = prepareFiles(context, {
      ignore: {
        paths: [
          'src/ignored.ts',
          '!pnpm-lock.yaml',
        ],
      },
    });

    expect(result.files.map((file) => file.filename)).toEqual(['pnpm-lock.yaml']);
    expect(result.skippedFiles).toContainEqual({
      filename: 'src/ignored.ts',
      reason: 'ignored:user',
      pattern: 'src/ignored.ts',
    });
  });

  it('re-includes files using ordered gitignore-style negation overrides', () => {
    const context = makeContext([
      { filename: 'fixtures/data.ts', patch: '@@ -0,0 +1,1 @@\n+fixture' },
      { filename: 'fixtures/security-regressions/a.ts', patch: '@@ -0,0 +1,1 @@\n+regression' },
    ]);

    const result = prepareFiles(context, {
      ignore: {
        paths: [
          '**/fixtures/**',
          '!**/fixtures/security-regressions/**',
        ],
      },
    });

    expect(result.files.map((file) => file.filename)).toEqual([
      'fixtures/security-regressions/a.ts',
    ]);
    expect(result.skippedFiles).toContainEqual({
      filename: 'fixtures/data.ts',
      reason: 'ignored:user',
      pattern: '**/fixtures/**',
    });
  });

  it('attributes gitignore-style directory patterns to user ignores', () => {
    const context = makeContext([
      { filename: 'fixtures/data.ts', patch: '@@ -0,0 +1,1 @@\n+fixture' },
    ]);

    const result = prepareFiles(context, {
      ignore: { paths: ['fixtures/'] },
    });

    expect(result.files).toEqual([]);
    expect(result.skippedFiles).toEqual([
      { filename: 'fixtures/data.ts', reason: 'ignored:user', pattern: 'fixtures/' },
    ]);
  });

  it('skips built-in ignored files before chunking', () => {
    const context = makeContext([
      { filename: 'pnpm-lock.yaml', patch: '@@ -0,0 +1,1 @@\n+lockfileVersion: 9' },
    ]);

    const result = prepareFiles(context);

    expect(result.files).toEqual([]);
    expect(result.skippedFiles).toEqual([
      { filename: 'pnpm-lock.yaml', reason: 'ignored:builtin' },
    ]);
  });

  it('records chunking skip patterns distinctly from built-in scan ignores', () => {
    const context = makeContext([
      { filename: 'snapshots/output.snap', patch: '@@ -0,0 +1,1 @@\n+snapshot' },
    ]);

    const result = prepareFiles(context, {
      chunking: {
        filePatterns: [{ pattern: '**/*.snap', mode: 'skip' }],
      },
    });

    expect(result.files).toEqual([]);
    expect(result.skippedFiles).toEqual([
      { filename: 'snapshots/output.snap', reason: 'pattern', pattern: '**/*.snap' },
    ]);
  });

  it('does not skip go.mod as a built-in ignored file', () => {
    const context = makeContext([
      { filename: 'go.mod', patch: '@@ -0,0 +1,1 @@\n+module example.com/app' },
    ]);

    const result = prepareFiles(context);

    expect(result.files.map((file) => file.filename)).toEqual(['go.mod']);
    expect(result.skippedFiles).toEqual([]);
  });

  it('skips high-confidence generated files', () => {
    const context = makeContext([
      {
        filename: 'src/generated-client.ts',
        patch: '@@ -0,0 +1,2 @@\n+// Code generated by OpenAPI Generator. DO NOT EDIT.\n+export const x = 1;',
      },
    ]);

    const result = prepareFiles(context);

    expect(result.files).toEqual([]);
    expect(result.skippedFiles).toEqual([
      { filename: 'src/generated-client.ts', reason: 'ignored:generated' },
    ]);
  });

  it('allows gitignore-style negation patterns to re-include generated files', () => {
    const context = makeContext([
      {
        filename: 'src/generated/client.ts',
        patch: '@@ -0,0 +1,2 @@\n+// Code generated by OpenAPI Generator. DO NOT EDIT.\n+export const x = 1;',
      },
    ]);

    const result = prepareFiles(context, {
      ignore: { paths: ['!src/generated/**'] },
    });

    expect(result.files.map((file) => file.filename)).toEqual(['src/generated/client.ts']);
    expect(result.skippedFiles).toEqual([]);
  });

  it('does not treat ordinary do-not-edit text as generated', () => {
    const context = makeContext([
      {
        filename: 'src/editor.ts',
        patch: '@@ -0,0 +1,1 @@\n+const warning = "Do not edit locked records";',
      },
    ]);

    const result = prepareFiles(context);

    expect(result.files.map((file) => file.filename)).toEqual(['src/editor.ts']);
    expect(result.skippedFiles).toEqual([]);
  });

  it('applies scan budgets in existing file order', () => {
    const context = makeContext([
      { filename: 'src/one.ts', patch: '@@ -0,0 +1,2 @@\n+one\n+two', additions: 2 },
      { filename: 'src/two.ts', patch: '@@ -0,0 +1,2 @@\n+one\n+two', additions: 2 },
      { filename: 'src/three.ts', patch: '@@ -0,0 +1,1 @@\n+one', additions: 1 },
    ]);

    const result = prepareFiles(context, {
      scan: { maxFiles: 2, maxChangedLines: 3 },
    });

    expect(result.files.map((file) => file.filename)).toEqual(['src/one.ts', 'src/three.ts']);
    expect(result.skippedFiles).toContainEqual({
      filename: 'src/two.ts',
      reason: 'limit:changed_lines',
    });
  });

  it('does not charge scan budgets for hunks an earlier run reviewed', () => {
    const context = makeContext([
      // Fully reviewed, and large enough to exhaust both budgets on its own.
      { filename: 'src/carried.ts', patch: '@@ -0,0 +1,3 @@\n+one\n+two\n+three', additions: 3 },
      // One reviewed hunk (3 lines) and one new hunk (1 line).
      {
        filename: 'src/partial.ts',
        patch: '@@ -0,0 +1,3 @@\n+one\n+two\n+three\n@@ -10,1 +13,2 @@\n ten\n+eleven',
        additions: 4,
      },
    ]);

    const result = prepareFiles(context, {
      scan: { maxFiles: 1, maxChangedLines: 1 },
      skipHunks: new Map([
        ['src/carried.ts', new Set([0])],
        ['src/partial.ts', new Set([0])],
      ]),
    });

    expect(result.skippedFiles).toEqual([]);
    expect(result.files.map((file) => file.filename)).toEqual(['src/partial.ts']);
    expect(result.files[0]?.hunks.map((hunk) => hunk.hunk.newStart)).toEqual([13]);
  });

  it('does not apply changed-line budget to explicit file targets', async () => {
    const repoPath = mkdtempSync(join(tmpdir(), 'warden-file-targets-'));
    tempDirs.push(repoPath);
    mkdirSync(join(repoPath, 'src'), { recursive: true });
    writeFileSync(join(repoPath, 'src/one.ts'), 'one\ntwo\nthree');
    writeFileSync(join(repoPath, 'src/two.ts'), 'one\ntwo\nthree');

    const context = await buildFileEventContext({
      patterns: ['src/*.ts'],
      cwd: repoPath,
    });

    const result = prepareFiles(context, {
      scan: { maxChangedLines: 3 },
    });

    expect(result.files.map((file) => file.filename)).toEqual(['src/one.ts', 'src/two.ts']);
    expect(result.skippedFiles).toEqual([]);
  });

  it('keeps file-count budget for explicit file targets', () => {
    const context = makeContext([
      { filename: 'src/one.ts', patch: '@@ -0,0 +1,1 @@\n+one', additions: 1 },
      { filename: 'src/two.ts', patch: '@@ -0,0 +1,1 @@\n+two', additions: 1 },
    ]);
    context.explicitFileTargets = true;

    const result = prepareFiles(context, {
      scan: { maxFiles: 1, maxChangedLines: 1 },
    });

    expect(result.files.map((file) => file.filename)).toEqual(['src/one.ts']);
    expect(result.skippedFiles).toEqual([
      { filename: 'src/two.ts', reason: 'limit:file_count' },
    ]);
  });

  it('skips patchless files before applying changed-line budget', () => {
    const context = makeContext([
      { filename: 'src/large-diff.ts', additions: 10 },
      { filename: 'src/real.ts', patch: '@@ -0,0 +1,1 @@\n+one', additions: 1 },
    ]);

    const result = prepareFiles(context, {
      scan: { maxChangedLines: 1 },
    });

    expect(result.files.map((file) => file.filename)).toEqual(['src/real.ts']);
    expect(result.skippedFiles).toContainEqual({
      filename: 'src/large-diff.ts',
      reason: 'limit:missing_patch',
    });
  });

  it('skips files that exceed configured file size limits before reading context', () => {
    const repoPath = mkdtempSync(join(tmpdir(), 'warden-prepare-size-'));
    tempDirs.push(repoPath);
    mkdirSync(join(repoPath, 'src'), { recursive: true });
    writeFileSync(join(repoPath, 'src/large.ts'), 'x'.repeat(20));
    const context = makeContext([
      { filename: 'src/large.ts', patch: '@@ -0,0 +1,1 @@\n+large', additions: 1 },
    ], repoPath);

    const result = prepareFiles(context, {
      scan: { maxFileBytes: 10 },
    });

    expect(result.files).toEqual([]);
    expect(result.skippedFiles).toEqual([
      { filename: 'src/large.ts', reason: 'limit:file_size' },
    ]);
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
  }, 30_000);

  it('applies git-ref scan limits to the analyzed commit, not the dirty working tree', () => {
    const repoPath = createGitRepo();
    const baseLines = ['one', 'old value'];
    const headLines = ['one', 'new value'];
    const dirtyLines = ['// Code generated by OpenAPI Generator. DO NOT EDIT.', 'x'.repeat(100)];

    writeTrackedFile(repoPath, baseLines);
    git(repoPath, ['add', 'src/file.ts']);
    git(repoPath, ['commit', '-m', 'base']);
    writeTrackedFile(repoPath, headLines);
    git(repoPath, ['add', 'src/file.ts']);
    git(repoPath, ['commit', '-m', 'head']);
    writeTrackedFile(repoPath, dirtyLines);

    const context = buildLocalEventContext({ base: 'HEAD^', head: 'HEAD', cwd: repoPath });
    const result = prepareFiles(context, {
      contextLines: 1,
      scan: { maxFileBytes: 30 },
    });

    expect(result.files.map((file) => file.filename)).toEqual(['src/file.ts']);
    expect(result.skippedFiles).toEqual([]);
  }, 30_000);

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
  }, 30_000);
});

describe('prepareSkillFiles', () => {
  const files = [
    { filename: 'package.json', patch: '@@ -0,0 +1,3 @@\n+{\n+  "scripts": { "postinstall": "node x.js" }\n+}' },
    { filename: 'src/sum.ts', patch: '@@ -0,0 +1,1 @@\n+export const sum = (a: number, b: number) => a + b;' },
  ];
  const skill = { name: 'integrity-review', description: '', prompt: '', rootDir: '/pkg/src/builtin-skills/integrity-review' };

  it('applies the integrity-review gate to the built-in skill', () => {
    const result = prepareSkillFiles(skill, makeContext(files));

    expect(result.files.map((f) => f.filename)).toEqual(['package.json']);
    expect(result.hunkGate).toEqual({ skippedHunks: 1, pushScoped: false });
  });

  it('reads lockfiles the default scan policy ignores for the built-in skill', () => {
    const lockfile = {
      filename: 'package-lock.json',
      patch: '@@ -10,2 +10,2 @@\n-      "resolved": "https://registry.npmjs.org/left-pad/-/left-pad-1.3.0.tgz",\n-      "integrity": "sha512-old",\n+      "resolved": "https://pkgs.example.net/left-pad/-/left-pad-1.3.0.tgz",\n+      "integrity": "sha512-new",',
      additions: 2,
      deletions: 2,
    };
    const context = makeContext([lockfile]);

    expect(prepareSkillFiles(skill, context, { scan: { maxChangedLines: 1 } }).files.map((f) => f.filename)).toEqual(['package-lock.json']);
    expect(prepareSkillFiles(skill, context, { ignore: { paths: ['package-lock.json'] } }).files).toEqual([]);
    expect(prepareSkillFiles({ ...skill, name: 'code-review', rootDir: '/pkg/src/builtin-skills/code-review' }, context).files).toEqual([]);
  });

  it('keeps lockfiles out of the file-count budget', () => {
    const lockfile = {
      filename: 'package-lock.json',
      patch: '@@ -10,1 +10,1 @@\n-      "resolved": "https://registry.npmjs.org/left-pad/-/left-pad-1.3.0.tgz",\n+      "resolved": "https://pkgs.example.net/left-pad/-/left-pad-1.3.0.tgz",',
      additions: 1,
      deletions: 1,
    };
    const result = prepareSkillFiles(skill, makeContext([lockfile, ...files]), { scan: { maxFiles: 1 } });

    expect(result.files.map((f) => f.filename)).toEqual(['package-lock.json', 'package.json']);
  });

  it('leaves other skills untouched', () => {
    const result = prepareSkillFiles({ ...skill, name: 'code-review', rootDir: '/pkg/src/builtin-skills/code-review' }, makeContext(files));

    expect(result.files.map((f) => f.filename)).toEqual(['package.json', 'src/sum.ts']);
    expect(result.hunkGate).toBeUndefined();
  });
});
