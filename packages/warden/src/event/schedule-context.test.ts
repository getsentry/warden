import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildScheduleEventContext } from './schedule-context.js';

describe('buildScheduleEventContext', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('applies scan limits while creating scheduled file changes', async () => {
    const repoPath = mkdtempSync(join(tmpdir(), 'warden-schedule-'));
    tempDirs.push(repoPath);
    mkdirSync(join(repoPath, 'src'), { recursive: true });
    writeFileSync(join(repoPath, 'src/large.ts'), 'x'.repeat(20));

    const context = await buildScheduleEventContext({
      patterns: ['src/**/*.ts'],
      scan: { maxFileBytes: 10 },
      repoPath,
      owner: 'test',
      name: 'repo',
      defaultBranch: 'main',
      headSha: 'abc123',
    });

    expect(context.pullRequest?.files).toEqual([
      {
        filename: 'src/large.ts',
        status: 'added',
        additions: 0,
        deletions: 0,
        chunks: 0,
      },
    ]);
  });

  it('applies ignore policy while creating scheduled file changes', async () => {
    const repoPath = mkdtempSync(join(tmpdir(), 'warden-schedule-'));
    tempDirs.push(repoPath);
    mkdirSync(join(repoPath, 'src'), { recursive: true });
    writeFileSync(join(repoPath, 'src/ignored.ts'), 'const ignored = true;');

    const context = await buildScheduleEventContext({
      patterns: ['src/**/*.ts'],
      ignore: { paths: ['src/ignored.ts'] },
      repoPath,
      owner: 'test',
      name: 'repo',
      defaultBranch: 'main',
      headSha: 'abc123',
    });

    expect(context.pullRequest?.files).toEqual([
      {
        filename: 'src/ignored.ts',
        status: 'added',
        additions: 0,
        deletions: 0,
        chunks: 0,
      },
    ]);
  });

  it('excludes Warden output artifacts from broad scheduled scans', async () => {
    const repoPath = mkdtempSync(join(tmpdir(), 'warden-schedule-'));
    tempDirs.push(repoPath);
    mkdirSync(join(repoPath, 'src'), { recursive: true });
    writeFileSync(join(repoPath, 'src/index.ts'), 'export const value = true;');
    writeFileSync(join(repoPath, 'warden-findings.json'), '{"version":"1"}');
    writeFileSync(join(repoPath, 'warden-findings.json.done'), '');

    const context = await buildScheduleEventContext({
      patterns: ['**/*'],
      ignorePatterns: ['warden-findings.json', 'warden-findings.json.done'],
      repoPath,
      owner: 'test',
      name: 'repo',
      defaultBranch: 'main',
      headSha: 'abc123',
    });

    expect(context.pullRequest?.files.map((file) => file.filename)).toEqual(['src/index.ts']);
  });
});
