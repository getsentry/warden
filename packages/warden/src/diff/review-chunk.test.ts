import { describe, expect, it } from 'vitest';
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
});
