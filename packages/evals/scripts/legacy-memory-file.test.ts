import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { createFileReviewMemory } from './legacy-memory-file.js';

describe('legacy memory reproduction', () => {
  it('can correct an unscoped note returned by search', async () => {
    const root = mkdtempSync(join(tmpdir(), 'warden-legacy-memory-'));
    try {
      writeFileSync(join(root, 'auth.ts'), 'export const guarded = true;');
      const path = join(root, 'memory.json');
      writeFileSync(path, JSON.stringify({ formatVersion: 1, repository: 'acme/widgets', memories: [
        { id: 'note-1', version: 1, content: 'Auth guard is missing.', paths: ['auth.ts'], reason: 'Observed previously.' },
      ] }));
      const memory = createFileReviewMemory({ path, repository: 'acme/widgets', repoPath: root });
      expect(await memory.search({ query: 'auth guard', skill: 'security', paths: ['auth.ts'] })).toHaveLength(1);
      expect(await memory.update({ id: 'note-1', expectedVersion: 1, skill: 'security', paths: ['auth.ts'],
        content: 'Auth guard exists.', reason: 'Checked the current source.' })).toMatchObject({ status: 'saved', memory: { version: 2 } });
      expect(JSON.parse(readFileSync(path, 'utf8')).memories[0].history[0].content).toBe('Auth guard is missing.');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
