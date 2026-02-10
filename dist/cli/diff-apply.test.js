import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { applyUnifiedDiff, applyHunk } from './diff-apply.js';
describe('applyHunk', () => {
    it('replaces a single line', () => {
        const lines = ['line1', 'line2', 'line3'];
        const hunk = {
            oldStart: 2,
            oldCount: 1,
            newStart: 2,
            newCount: 1,
            content: '@@ -2,1 +2,1 @@\n-line2\n+LINE2',
            lines: ['-line2', '+LINE2'],
        };
        const result = applyHunk(lines, hunk);
        expect(result).toEqual(['line1', 'LINE2', 'line3']);
    });
    it('adds lines', () => {
        const lines = ['a', 'b'];
        const hunk = {
            oldStart: 1,
            oldCount: 2,
            newStart: 1,
            newCount: 4,
            content: '@@ -1,2 +1,4 @@\n a\n+new1\n+new2\n b',
            lines: [' a', '+new1', '+new2', ' b'],
        };
        const result = applyHunk(lines, hunk);
        expect(result).toEqual(['a', 'new1', 'new2', 'b']);
    });
    it('removes lines', () => {
        const lines = ['a', 'b', 'c', 'd'];
        const hunk = {
            oldStart: 2,
            oldCount: 2,
            newStart: 2,
            newCount: 0,
            content: '@@ -2,2 +2,0 @@\n-b\n-c',
            lines: ['-b', '-c'],
        };
        const result = applyHunk(lines, hunk);
        expect(result).toEqual(['a', 'd']);
    });
    it('handles context lines', () => {
        const lines = ['first', 'middle', 'last'];
        const hunk = {
            oldStart: 1,
            oldCount: 3,
            newStart: 1,
            newCount: 3,
            content: '@@ -1,3 +1,3 @@\n first\n-middle\n+MIDDLE\n last',
            lines: [' first', '-middle', '+MIDDLE', ' last'],
        };
        const result = applyHunk(lines, hunk);
        expect(result).toEqual(['first', 'MIDDLE', 'last']);
    });
    it('throws on context mismatch', () => {
        const lines = ['actual'];
        const hunk = {
            oldStart: 1,
            oldCount: 1,
            newStart: 1,
            newCount: 1,
            content: '@@ -1,1 +1,1 @@\n-expected\n+new',
            lines: ['-expected', '+new'],
        };
        expect(() => applyHunk(lines, hunk)).toThrow('context mismatch');
    });
    it('throws when line does not exist', () => {
        const lines = ['only'];
        const hunk = {
            oldStart: 5,
            oldCount: 1,
            newStart: 5,
            newCount: 1,
            content: '@@ -5,1 +5,1 @@\n-missing\n+new',
            lines: ['-missing', '+new'],
        };
        expect(() => applyHunk(lines, hunk)).toThrow("line 5 doesn't exist");
    });
    it('handles new file diffs with oldStart of 0', () => {
        const lines = [];
        const hunk = {
            oldStart: 0,
            oldCount: 0,
            newStart: 1,
            newCount: 3,
            content: '@@ -0,0 +1,3 @@\n+line1\n+line2\n+line3',
            lines: ['+line1', '+line2', '+line3'],
        };
        const result = applyHunk(lines, hunk);
        expect(result).toEqual(['line1', 'line2', 'line3']);
    });
});
describe('applyUnifiedDiff', () => {
    let testDir;
    beforeEach(() => {
        testDir = join(tmpdir(), `warden-diff-apply-test-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });
    });
    afterEach(() => {
        rmSync(testDir, { recursive: true, force: true });
    });
    it('applies a single-line replacement', () => {
        const filePath = join(testDir, 'test.ts');
        writeFileSync(filePath, 'const x = "hello";\nconst y = "world";\n');
        const diff = `@@ -1,2 +1,2 @@
-const x = "hello";
+const x = "goodbye";
 const y = "world";`;
        applyUnifiedDiff(filePath, diff);
        const result = readFileSync(filePath, 'utf-8');
        expect(result).toBe('const x = "goodbye";\nconst y = "world";\n');
    });
    it('applies a multi-line addition', () => {
        const filePath = join(testDir, 'test.ts');
        writeFileSync(filePath, 'function foo() {\n  return 1;\n}\n');
        const diff = `@@ -1,3 +1,5 @@
 function foo() {
+  // Added comment
+  const x = 1;
   return 1;
 }`;
        applyUnifiedDiff(filePath, diff);
        const result = readFileSync(filePath, 'utf-8');
        expect(result).toBe('function foo() {\n  // Added comment\n  const x = 1;\n  return 1;\n}\n');
    });
    it('applies a multi-line deletion', () => {
        const filePath = join(testDir, 'test.ts');
        writeFileSync(filePath, 'line1\nline2\nline3\nline4\n');
        const diff = `@@ -1,4 +1,2 @@
 line1
-line2
-line3
 line4`;
        applyUnifiedDiff(filePath, diff);
        const result = readFileSync(filePath, 'utf-8');
        expect(result).toBe('line1\nline4\n');
    });
    it('applies multiple hunks in reverse order', () => {
        const filePath = join(testDir, 'test.ts');
        writeFileSync(filePath, 'a\nb\nc\nd\ne\nf\ng\n');
        // Two hunks: one at line 2, one at line 6
        const diff = `@@ -2,1 +2,1 @@
-b
+B
@@ -6,1 +6,1 @@
-f
+F`;
        applyUnifiedDiff(filePath, diff);
        const result = readFileSync(filePath, 'utf-8');
        expect(result).toBe('a\nB\nc\nd\ne\nF\ng\n');
    });
    it('throws error for non-existent file', () => {
        const filePath = join(testDir, 'nonexistent.ts');
        const diff = `@@ -1,1 +1,1 @@
-old
+new`;
        expect(() => applyUnifiedDiff(filePath, diff)).toThrow('File not found');
    });
    it('throws error for context mismatch', () => {
        const filePath = join(testDir, 'test.ts');
        writeFileSync(filePath, 'actual content\n');
        const diff = `@@ -1,1 +1,1 @@
-expected content
+new content`;
        expect(() => applyUnifiedDiff(filePath, diff)).toThrow('context mismatch');
    });
    it('throws error for empty diff', () => {
        const filePath = join(testDir, 'test.ts');
        writeFileSync(filePath, 'content\n');
        expect(() => applyUnifiedDiff(filePath, '')).toThrow('No valid hunks');
    });
});
//# sourceMappingURL=diff-apply.test.js.map