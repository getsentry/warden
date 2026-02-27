import { describe, expect, it } from 'vitest';
import { applyDiffToContent } from './apply.js';

describe('applyDiffToContent', () => {
  it('applies a single-line replacement', () => {
    const content = 'line1\nline2\nline3\n';
    const diff = `--- a/src/file.ts
+++ b/src/file.ts
@@ -2,1 +2,1 @@
-line2
+LINE2`;

    const result = applyDiffToContent(content, diff);
    expect(result).toBe('line1\nLINE2\nline3\n');
  });

  it('applies multiple hunks bottom-up', () => {
    const content = 'a\nb\nc\nd\ne\n';
    const diff = `@@ -2,1 +2,1 @@
-b
+B
@@ -4,1 +4,1 @@
-d
+D`;

    const result = applyDiffToContent(content, diff);
    expect(result).toBe('a\nB\nc\nD\ne\n');
  });

  it('applies insertion and deletion', () => {
    const content = 'one\ntwo\nthree\n';
    const diff = `@@ -1,3 +1,3 @@
 one
-two
+TWO
 three`;

    const result = applyDiffToContent(content, diff);
    expect(result).toBe('one\nTWO\nthree\n');
  });

  it('throws when no hunks are found', () => {
    expect(() => applyDiffToContent('x\n', 'not a diff')).toThrow('No valid hunks found in diff');
  });

  it('throws on context mismatch', () => {
    const content = 'line1\nline2\n';
    const diff = `@@ -2,1 +2,1 @@
-wrong
+right`;

    expect(() => applyDiffToContent(content, diff)).toThrow('Hunk context mismatch');
  });

  it("throws when hunk references a line that doesn't exist", () => {
    const content = 'line1\n';
    const diff = `@@ -5,1 +5,1 @@
-line5
+LINE5`;

    expect(() => applyDiffToContent(content, diff)).toThrow("doesn't exist");
  });
});
