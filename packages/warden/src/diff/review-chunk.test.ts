import { describe, expect, it } from 'vitest';
import { coalesceHunks } from './coalesce.js';
import { parsePatch } from './parser.js';
import { reviewChunkFromHunk } from './review-chunk.js';
import type { HunkWithContext } from './context.js';

function makeHunkContext(overrides: Partial<HunkWithContext> = {}): HunkWithContext {
  return {
    filename: 'src/example.ts',
    hunk: {
      oldStart: 10,
      oldCount: 1,
      newStart: 10,
      newCount: 0,
      header: '@@ -10,1 +10,0 @@',
      lines: ['-const removed = true;'],
      content: '-const removed = true;',
    },
    contextBefore: [],
    contextAfter: [],
    contextStartLine: 10,
    language: 'typescript',
    ...overrides,
  };
}

describe('reviewChunkFromHunk', () => {
  it('uses hunk coordinates and an anchor range for deletion-only chunks', () => {
    const chunk = reviewChunkFromHunk(makeHunkContext());

    expect(chunk.changedLineMap).toEqual([{ path: 'src/example.ts', start: 10, end: 10 }]);
    expect(chunk.id).toBe('src/example.ts:old10-10:new10-9');
  });

  it('resets changed-line ranges at embedded hunk headers from coalesced content', () => {
    const parsedHunks = parsePatch([
      '@@ -10,1 +10,1 @@',
      '-const first = oldValue;',
      '+const first = newValue;',
      '@@ -100,1 +100,1 @@',
      '-const second = oldValue;',
      '+const second = newValue;',
    ].join('\n'));
    const [hunk] = coalesceHunks(parsedHunks, { maxGapLines: 100 });
    expect(hunk?.lines).toEqual([
      '-const first = oldValue;',
      '+const first = newValue;',
      '-const second = oldValue;',
      '+const second = newValue;',
    ]);

    const chunk = reviewChunkFromHunk(makeHunkContext({
      hunk,
    }));

    expect(chunk.changedLineMap).toEqual([
      { path: 'src/example.ts', start: 10, end: 10 },
      { path: 'src/example.ts', start: 100, end: 100 },
    ]);
    expect(chunk.files[0].sourceLines).toEqual([
      { line: 10, content: 'const first = newValue;' },
      { line: 100, content: 'const second = newValue;' },
    ]);
  });

  it('anchors deletion-only embedded hunk sections independently', () => {
    const parsedHunks = parsePatch([
      '@@ -10,1 +10,0 @@',
      '-const first = removed;',
      '@@ -100,1 +100,0 @@',
      '-const second = removed;',
    ].join('\n'));
    const [hunk] = coalesceHunks(parsedHunks, { maxGapLines: 100 });

    const chunk = reviewChunkFromHunk(makeHunkContext({
      hunk,
    }));

    expect(chunk.changedLineMap).toEqual([
      { path: 'src/example.ts', start: 10, end: 10 },
      { path: 'src/example.ts', start: 100, end: 100 },
    ]);
  });
});
