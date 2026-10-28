import { describe, it, expect } from 'vitest';
import {
  parsePatch,
  parseFileDiff,
  getHunkLineRange,
  getExpandedLineRange,
  type DiffHunk,
} from './parser.js';

describe('parsePatch', () => {
  it('parses a simple hunk', () => {
    const patch = `@@ -1,3 +1,4 @@
 line 1
+added line
 line 2
 line 3`;

    const hunks = parsePatch(patch);
    expect(hunks).toHaveLength(1);
    const hunk = hunks[0]!;
    expect(hunk.oldStart).toBe(1);
    expect(hunk.oldCount).toBe(3);
    expect(hunk.newStart).toBe(1);
    expect(hunk.newCount).toBe(4);
    expect(hunk.lines).toEqual([' line 1', '+added line', ' line 2', ' line 3']);
  });

  it('parses multiple hunks', () => {
    const patch = `@@ -1,3 +1,4 @@
 line 1
+added line
 line 2
@@ -10,2 +11,3 @@
 line 10
+another added
 line 11`;

    const hunks = parsePatch(patch);
    expect(hunks).toHaveLength(2);
    expect(hunks[0]!.newStart).toBe(1);
    expect(hunks[1]!.newStart).toBe(11);
  });

  it('parses hunk with function header', () => {
    const patch = `@@ -5,3 +5,4 @@ function example()
 const x = 1;
+const y = 2;
 return x;`;

    const hunks = parsePatch(patch);
    expect(hunks).toHaveLength(1);
    expect(hunks[0]!.header).toBe('function example()');
  });

  it('handles hunk without count (single line)', () => {
    const patch = `@@ -1 +1,2 @@
 existing
+added`;

    const hunks = parsePatch(patch);
    expect(hunks).toHaveLength(1);
    const hunk = hunks[0]!;
    expect(hunk.oldCount).toBe(1);
    expect(hunk.newCount).toBe(2);
  });

  it('skips diff metadata lines', () => {
    const patch = `diff --git a/file.ts b/file.ts
index abc123..def456 100644
--- a/file.ts
+++ b/file.ts
@@ -1,2 +1,3 @@
 line 1
+added
 line 2`;

    const hunks = parsePatch(patch);
    expect(hunks).toHaveLength(1);
    const hunk = hunks[0]!;
    expect(hunk.lines).toEqual([' line 1', '+added', ' line 2']);
    expect(hunk.content).not.toContain('diff --git');
    expect(hunk.content).not.toContain('index ');
  });

  it('handles "No newline at end of file" marker', () => {
    const patch = `@@ -1,2 +1,2 @@
 line 1
-old line
+new line
\\ No newline at end of file`;

    const hunks = parsePatch(patch);
    expect(hunks).toHaveLength(1);
    expect(hunks[0]!.lines).not.toContain('\\ No newline at end of file');
  });

  it('returns empty array for empty patch', () => {
    expect(parsePatch('')).toEqual([]);
  });

  it('returns empty array for patch with only metadata', () => {
    const patch = `diff --git a/file.ts b/file.ts
index abc123..def456 100644
--- a/file.ts
+++ b/file.ts`;

    expect(parsePatch(patch)).toEqual([]);
  });
});

describe('parseFileDiff', () => {
  it('creates parsed diff with correct structure', () => {
    const patch = `@@ -1,2 +1,3 @@
 line 1
+added
 line 2`;

    const diff = parseFileDiff('src/index.ts', patch);
    expect(diff.filename).toBe('src/index.ts');
    expect(diff.status).toBe('modified');
    expect(diff.hunks).toHaveLength(1);
    expect(diff.rawPatch).toBe(patch);
  });

  it('accepts different status values', () => {
    const patch = `@@ -0,0 +1,2 @@
+new file
+content`;

    expect(parseFileDiff('new.ts', patch, 'added').status).toBe('added');
    expect(parseFileDiff('old.ts', patch, 'removed').status).toBe('removed');
    expect(parseFileDiff('moved.ts', patch, 'renamed').status).toBe('renamed');
  });
});

describe('getHunkLineRange', () => {
  it('returns correct range for hunk', () => {
    const hunk: DiffHunk = {
      oldStart: 1,
      oldCount: 3,
      newStart: 5,
      newCount: 10,
      content: '',
      lines: [],
    };

    const range = getHunkLineRange(hunk);
    expect(range.start).toBe(5);
    expect(range.end).toBe(14); // 5 + 10 - 1
  });

  it('handles single line hunk', () => {
    const hunk: DiffHunk = {
      oldStart: 1,
      oldCount: 1,
      newStart: 1,
      newCount: 1,
      content: '',
      lines: [],
    };

    const range = getHunkLineRange(hunk);
    expect(range.start).toBe(1);
    expect(range.end).toBe(1);
  });
});

describe('getExpandedLineRange', () => {
  it('expands range with default context', () => {
    const hunk: DiffHunk = {
      oldStart: 1,
      oldCount: 3,
      newStart: 50,
      newCount: 5,
      content: '',
      lines: [],
    };

    const range = getExpandedLineRange(hunk);
    expect(range.start).toBe(30); // 50 - 20
    expect(range.end).toBe(74); // 54 + 20
  });

  it('does not go below line 1', () => {
    const hunk: DiffHunk = {
      oldStart: 1,
      oldCount: 2,
      newStart: 5,
      newCount: 3,
      content: '',
      lines: [],
    };

    const range = getExpandedLineRange(hunk);
    expect(range.start).toBe(1); // Math.max(1, 5 - 20)
  });

  it('accepts custom context lines', () => {
    const hunk: DiffHunk = {
      oldStart: 1,
      oldCount: 2,
      newStart: 100,
      newCount: 5,
      content: '',
      lines: [],
    };

    const range = getExpandedLineRange(hunk, 50);
    expect(range.start).toBe(50); // 100 - 50
    expect(range.end).toBe(154); // 104 + 50
  });
});
