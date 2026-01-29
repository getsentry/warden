import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { applyUnifiedDiff, collectFixableFindings, applyAllFixes, } from './fix.js';
describe('applyUnifiedDiff', () => {
    let testDir;
    beforeEach(() => {
        testDir = join(tmpdir(), `warden-fix-test-${Date.now()}`);
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
describe('collectFixableFindings', () => {
    it('returns empty array when no findings have fixes', () => {
        const reports = [
            {
                skill: 'test',
                summary: 'Test summary',
                findings: [
                    {
                        id: '1',
                        severity: 'high',
                        title: 'Test finding',
                        description: 'No fix available',
                    },
                ],
            },
        ];
        const result = collectFixableFindings(reports);
        expect(result).toEqual([]);
    });
    it('returns only findings with both diff and location', () => {
        const fixableFinding = {
            id: '1',
            severity: 'high',
            title: 'Fixable',
            description: 'Has fix',
            location: { path: 'test.ts', startLine: 10 },
            suggestedFix: { description: 'Fix it', diff: '@@ -10,1 +10,1 @@\n-old\n+new' },
        };
        const noLocation = {
            id: '2',
            severity: 'high',
            title: 'No location',
            description: 'Missing location',
            suggestedFix: { description: 'Fix it', diff: '@@ -1,1 +1,1 @@\n-old\n+new' },
        };
        const noDiff = {
            id: '3',
            severity: 'high',
            title: 'No diff',
            description: 'Missing diff',
            location: { path: 'test.ts', startLine: 5 },
        };
        const reports = [
            {
                skill: 'test',
                summary: 'Test',
                findings: [fixableFinding, noLocation, noDiff],
            },
        ];
        const result = collectFixableFindings(reports);
        expect(result).toHaveLength(1);
        expect(result[0]?.id).toBe('1');
    });
    it('sorts findings by file then by line (descending)', () => {
        const finding1 = {
            id: '1',
            severity: 'high',
            title: 'F1',
            description: 'D1',
            location: { path: 'b.ts', startLine: 10 },
            suggestedFix: { description: 'Fix', diff: '@@ -10,1 +10,1 @@\n-x\n+y' },
        };
        const finding2 = {
            id: '2',
            severity: 'high',
            title: 'F2',
            description: 'D2',
            location: { path: 'a.ts', startLine: 20 },
            suggestedFix: { description: 'Fix', diff: '@@ -20,1 +20,1 @@\n-x\n+y' },
        };
        const finding3 = {
            id: '3',
            severity: 'high',
            title: 'F3',
            description: 'D3',
            location: { path: 'a.ts', startLine: 5 },
            suggestedFix: { description: 'Fix', diff: '@@ -5,1 +5,1 @@\n-x\n+y' },
        };
        const reports = [
            { skill: 'test', summary: 'Test', findings: [finding1, finding2, finding3] },
        ];
        const result = collectFixableFindings(reports);
        expect(result).toHaveLength(3);
        // Sorted: a.ts:20, a.ts:5, b.ts:10
        expect(result[0]?.id).toBe('2'); // a.ts:20
        expect(result[1]?.id).toBe('3'); // a.ts:5
        expect(result[2]?.id).toBe('1'); // b.ts:10
    });
});
describe('applyAllFixes', () => {
    let testDir;
    beforeEach(() => {
        testDir = join(tmpdir(), `warden-fix-test-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });
    });
    afterEach(() => {
        rmSync(testDir, { recursive: true, force: true });
    });
    it('applies all valid fixes', () => {
        const filePath = join(testDir, 'test.ts');
        writeFileSync(filePath, 'line1\nline2\nline3\n');
        const findings = [
            {
                id: '1',
                severity: 'high',
                title: 'Fix line 2',
                description: 'Change line 2',
                location: { path: filePath, startLine: 2 },
                suggestedFix: { description: 'Fix', diff: '@@ -2,1 +2,1 @@\n-line2\n+LINE2' },
            },
        ];
        const summary = applyAllFixes(findings);
        expect(summary.applied).toBe(1);
        expect(summary.failed).toBe(0);
        expect(summary.skipped).toBe(0);
        const result = readFileSync(filePath, 'utf-8');
        expect(result).toBe('line1\nLINE2\nline3\n');
    });
    it('handles failed fixes and continues', () => {
        const filePath = join(testDir, 'test.ts');
        writeFileSync(filePath, 'actual\n');
        const findings = [
            {
                id: '1',
                severity: 'high',
                title: 'Bad fix',
                description: 'Wrong context',
                location: { path: filePath, startLine: 1 },
                suggestedFix: { description: 'Fix', diff: '@@ -1,1 +1,1 @@\n-wrong\n+new' },
            },
        ];
        const summary = applyAllFixes(findings);
        expect(summary.applied).toBe(0);
        expect(summary.failed).toBe(1);
        expect(summary.results[0]?.error).toContain('mismatch');
    });
    it('applies multiple fixes to same file in correct order', () => {
        const filePath = join(testDir, 'test.ts');
        writeFileSync(filePath, 'a\nb\nc\nd\ne\n');
        // Findings already sorted by line descending
        const findings = [
            {
                id: '1',
                severity: 'high',
                title: 'Fix line 4',
                description: 'Change d',
                location: { path: filePath, startLine: 4 },
                suggestedFix: { description: 'Fix', diff: '@@ -4,1 +4,1 @@\n-d\n+D' },
            },
            {
                id: '2',
                severity: 'high',
                title: 'Fix line 2',
                description: 'Change b',
                location: { path: filePath, startLine: 2 },
                suggestedFix: { description: 'Fix', diff: '@@ -2,1 +2,1 @@\n-b\n+B' },
            },
        ];
        const summary = applyAllFixes(findings);
        expect(summary.applied).toBe(2);
        expect(summary.failed).toBe(0);
        const result = readFileSync(filePath, 'utf-8');
        expect(result).toBe('a\nB\nc\nD\ne\n');
    });
});
//# sourceMappingURL=fix.test.js.map