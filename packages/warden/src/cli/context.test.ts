import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildFileEventContext } from './context.js';

describe('buildFileEventContext', () => {
  let repoPath: string;

  beforeEach(() => {
    repoPath = mkdtempSync(join(tmpdir(), 'warden-file-context-'));
  });

  afterEach(() => {
    rmSync(repoPath, { recursive: true, force: true });
  });

  it('uses the checkout root when file analysis starts from a subdirectory', async () => {
    const sourcePath = join(repoPath, 'packages', 'widget');
    mkdirSync(sourcePath, { recursive: true });
    writeFileSync(join(sourcePath, 'index.ts'), 'export const widget = true;\n');
    execFileSync('git', ['init'], { cwd: repoPath, stdio: 'ignore' });

    const context = await buildFileEventContext({
      patterns: ['index.ts'],
      cwd: sourcePath,
    });

    expect(context.repoPath).toBe(realpathSync(repoPath));
    expect(context.pullRequest?.files.map((file) => file.filename)).toEqual([
      'packages/widget/index.ts',
    ]);
  });
});
