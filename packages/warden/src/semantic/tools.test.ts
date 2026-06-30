import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { EventContext } from '../types/index.js';
import type { ReviewChunk } from '../diff/index.js';
import { createSemanticPlannerToolExecutor } from './tools.js';

describe('createSemanticPlannerToolExecutor', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'warden-semantic-tools-'));
    await mkdir(join(tempDir, 'src'), { recursive: true });
    await writeFile(join(tempDir, 'src/dashboard.ts'), 'export const axisRange = widget.axisRange;\n');
    await writeFile(join(tempDir, 'src/secret.ts'), 'export const unrelated = true;\n');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  function makeContext(): EventContext {
    return {
      eventType: 'pull_request',
      action: 'opened',
      repository: {
        owner: 'qa',
        name: 'repo',
        fullName: 'qa/repo',
        defaultBranch: 'main',
      },
      repoPath: tempDir,
      pullRequest: {
        number: 1,
        title: 'Preserve dashboard range',
        body: '',
        author: 'qa',
        baseBranch: 'main',
        headBranch: 'feature',
        headSha: 'head',
        baseSha: 'base',
        files: [{
          filename: 'src/dashboard.ts',
          status: 'modified',
          additions: 1,
          deletions: 1,
          patch: '@@ -1,1 +1,1 @@\n-old\n+new',
        }],
      },
    };
  }

  it('only reads changed files inside the repository', async () => {
    const executeTool = createSemanticPlannerToolExecutor(makeContext(), []);

    await expect(executeTool('read_changed_file', { path: 'src/dashboard.ts' }))
      .resolves.toContain('axisRange');
    await expect(executeTool('read_changed_file', { path: 'src/secret.ts' }))
      .resolves.toBe('Refusing to read a file that is not in the changed file list');
    await expect(executeTool('read_changed_file', { path: '../outside.ts' }))
      .resolves.toBe('Refusing to read a file that is not in the changed file list');
  });

  it('searches the repository with capped output', async () => {
    const executeTool = createSemanticPlannerToolExecutor(makeContext(), []);

    await expect(executeTool('search_repo', { query: 'axisRange' }))
      .resolves.toContain('src/dashboard.ts:1');
  });

  it('reads exact review chunk diffs by chunk id', async () => {
    const chunk: ReviewChunk = {
      id: 'src/dashboard.ts:1',
      title: 'src/dashboard.ts:1',
      changedLineMap: [{ path: 'src/dashboard.ts', start: 1, end: 1 }],
      files: [{
        path: 'src/dashboard.ts',
        language: 'typescript',
        changedRanges: [{ path: 'src/dashboard.ts', start: 1, end: 1 }],
        content: '@@ -1,1 +1,1 @@\n-old\n+new',
        contentMode: 'raw-hunks',
        sourceLines: [{ line: 1, content: 'new' }],
      }],
    };
    const executeTool = createSemanticPlannerToolExecutor(makeContext(), [chunk]);

    await expect(executeTool('read_review_chunk', { chunkId: 'src/dashboard.ts:1' }))
      .resolves.toContain('-old');
    await expect(executeTool('read_review_chunk', { chunkId: 'missing' }))
      .resolves.toBe('Unknown review chunk ID');
  });
});
