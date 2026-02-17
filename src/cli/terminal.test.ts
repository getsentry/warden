import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { renderTerminalReport } from './terminal.js';
import type { SkillReport, Finding } from '../types/index.js';

describe('renderTerminalReport', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `warden-terminal-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function createFinding(overrides: Partial<Finding> = {}): Finding {
    return {
      id: 'test-1',
      severity: 'medium',
      title: 'Test Finding',
      description: 'This is a test finding',
      ...overrides,
    };
  }

  function createReport(overrides: Partial<SkillReport> = {}): SkillReport {
    return {
      skill: 'test-skill',
      summary: 'Test summary',
      findings: [],
      ...overrides,
    };
  }

  describe('file unavailable indication', () => {
    it('shows file unavailable when source file cannot be read', () => {
      const nonExistentPath = join(tempDir, 'nonexistent.ts');
      const report = createReport({
        findings: [
          createFinding({
            location: {
              path: nonExistentPath,
              startLine: 5,
            },
          }),
        ],
      });

      const output = renderTerminalReport([report], {
        isTTY: true,
        supportsColor: false, // Disable color for easier assertions
        columns: 80,
      });

      expect(output).toContain('5 │');
      expect(output).toContain('(file unavailable)');
    });

    it('shows code line when file exists and is readable', () => {
      const filePath = join(tempDir, 'test.ts');
      writeFileSync(
        filePath,
        'line 1\nline 2\nline 3\nline 4\nconst important = true;\nline 6'
      );

      const report = createReport({
        findings: [
          createFinding({
            location: {
              path: filePath,
              startLine: 5,
            },
          }),
        ],
      });

      const output = renderTerminalReport([report], {
        isTTY: true,
        supportsColor: false,
        columns: 80,
      });

      expect(output).toContain('5 │');
      expect(output).toContain('const important = true;');
      expect(output).not.toContain('(file unavailable)');
    });

    it('shows nothing when line number exceeds file length', () => {
      const filePath = join(tempDir, 'short.ts');
      writeFileSync(filePath, 'line 1\nline 2');

      const report = createReport({
        findings: [
          createFinding({
            location: {
              path: filePath,
              startLine: 100, // Way past end of file
            },
          }),
        ],
      });

      const output = renderTerminalReport([report], {
        isTTY: true,
        supportsColor: false,
        columns: 80,
      });

      // Should not show file unavailable or any code line for out-of-range
      expect(output).not.toContain('100 │');
      expect(output).not.toContain('(file unavailable)');
    });
  });

  describe('basic rendering', () => {
    it('renders report with no findings', () => {
      const report = createReport();

      const output = renderTerminalReport([report], {
        isTTY: true,
        supportsColor: false,
        columns: 80,
      });

      expect(output).toContain('test-skill');
      expect(output).toContain('No issues found');
    });

    it('renders finding without location', () => {
      const report = createReport({
        findings: [createFinding()],
      });

      const output = renderTerminalReport([report], {
        isTTY: true,
        supportsColor: false,
        columns: 80,
      });

      expect(output).toContain('Test Finding');
      expect(output).toContain('This is a test finding');
    });
  });

  describe('CI (non-TTY) rendering', () => {
    const ciMode = { isTTY: false, supportsColor: false, columns: 80 };

    it('renders clean header with no findings', () => {
      const report = createReport({ durationMs: 1200 });

      const output = renderTerminalReport([report], ciMode);

      expect(output).toContain('test-skill (1.2s) - No findings');
      expect(output).not.toContain('===');
      expect(output).not.toContain('---');
      expect(output).not.toContain('No issues found.');
    });

    it('renders header with finding counts', () => {
      const report = createReport({
        durationMs: 285600,
        findings: [
          createFinding({ severity: 'high', title: 'Bug found' }),
        ],
      });

      const output = renderTerminalReport([report], ciMode);

      expect(output).toContain('test-skill (285.6s) - 1 finding (1 high)');
      expect(output).not.toContain('===');
      expect(output).not.toContain('---');
    });

    it('renders findings with severity and description', () => {
      const report = createReport({
        durationMs: 5000,
        findings: [
          createFinding({
            severity: 'high',
            title: 'Missing null check',
            description: 'Variable could be null',
            location: { path: 'src/foo.ts', startLine: 42 },
          }),
        ],
      });

      const output = renderTerminalReport([report], ciMode);

      expect(output).toContain('[high]');
      expect(output).toContain('src/foo.ts:42');
      expect(output).toContain('Missing null check');
      expect(output).toContain('Variable could be null');
    });

    it('separates multiple findings with blank lines', () => {
      const report = createReport({
        durationMs: 3000,
        findings: [
          createFinding({ severity: 'high', title: 'First issue' }),
          createFinding({ severity: 'medium', title: 'Second issue' }),
        ],
      });

      const output = renderTerminalReport([report], ciMode);
      const lines = output.split('\n');

      // Find the two finding lines and check there's a blank line between them
      const firstIdx = lines.findIndex((l) => l.includes('First issue'));
      const secondIdx = lines.findIndex((l) => l.includes('Second issue'));
      expect(firstIdx).toBeGreaterThan(-1);
      expect(secondIdx).toBeGreaterThan(firstIdx);
      // There should be a blank line between the description of the first and the badge of the second
      const between = lines.slice(firstIdx, secondIdx);
      expect(between.some((l) => l.trim() === '')).toBe(true);
    });

    it('renders without duration when not provided', () => {
      const report = createReport();

      const output = renderTerminalReport([report], ciMode);

      expect(output).toContain('test-skill - No findings');
      expect(output).not.toContain('()');
    });

    it('renders endLine range in location', () => {
      const report = createReport({
        durationMs: 5000,
        findings: [
          createFinding({
            severity: 'high',
            title: 'SQL injection risk',
            location: { path: 'src/api.ts', startLine: 45, endLine: 52 },
          }),
        ],
      });

      const output = renderTerminalReport([report], ciMode);

      expect(output).toContain('src/api.ts:45-52');
    });

    it('renders confidence when present', () => {
      const report = createReport({
        durationMs: 5000,
        findings: [
          createFinding({
            severity: 'high',
            title: 'SQL injection risk',
            confidence: 'high',
            location: { path: 'src/api.ts', startLine: 45 },
          }),
        ],
      });

      const output = renderTerminalReport([report], ciMode);

      expect(output).toContain('confidence: high');
    });

    it('does not render confidence line when not present', () => {
      const report = createReport({
        durationMs: 5000,
        findings: [
          createFinding({
            severity: 'high',
            title: 'SQL injection risk',
            location: { path: 'src/api.ts', startLine: 45 },
          }),
        ],
      });

      const output = renderTerminalReport([report], ciMode);

      expect(output).not.toContain('confidence:');
    });

    it('renders suggested fix diff in plain text', () => {
      const report = createReport({
        durationMs: 5000,
        findings: [
          createFinding({
            severity: 'high',
            title: 'SQL injection risk',
            location: { path: 'src/api.ts', startLine: 45 },
            suggestedFix: {
              description: 'Use parameterized queries',
              diff: '--- a/src/api.ts\n+++ b/src/api.ts\n@@ -45,3 +45,3 @@\n-  const result = db.query(`SELECT * FROM users WHERE id = ${userId}`);\n+  const result = db.query(\'SELECT * FROM users WHERE id = ?\', [userId]);',
            },
          }),
        ],
      });

      const output = renderTerminalReport([report], ciMode);

      expect(output).toContain('Suggested fix:');
      expect(output).toContain('--- a/src/api.ts');
      expect(output).toContain('+++ b/src/api.ts');
    });

    it('renders per-skill failedHunks warning', () => {
      const report = createReport({
        durationMs: 5000,
        findings: [createFinding({ severity: 'high', title: 'Bug found' })],
        failedHunks: 2,
      });

      const output = renderTerminalReport([report], ciMode);

      expect(output).toContain('WARN: 2 chunks failed to analyze');
    });

    it('renders per-skill failedExtractions warning', () => {
      const report = createReport({
        durationMs: 5000,
        findings: [createFinding({ severity: 'high', title: 'Bug found' })],
        failedExtractions: 1,
      });

      const output = renderTerminalReport([report], ciMode);

      expect(output).toContain('WARN: 1 finding extraction failed');
    });

    it('does not render warnings when counts are zero', () => {
      const report = createReport({
        durationMs: 5000,
        findings: [createFinding({ severity: 'high', title: 'Bug found' })],
        failedHunks: 0,
        failedExtractions: 0,
      });

      const output = renderTerminalReport([report], ciMode);

      expect(output).not.toContain('WARN:');
    });

    it('renders additional locations in CI mode', () => {
      const report = createReport({
        durationMs: 5000,
        findings: [
          createFinding({
            severity: 'high',
            title: 'Missing null check',
            location: { path: 'src/a.ts', startLine: 10 },
            additionalLocations: [
              { path: 'src/b.ts', startLine: 20 },
              { path: 'src/c.ts', startLine: 30, endLine: 35 },
            ],
          }),
        ],
      });

      const output = renderTerminalReport([report], ciMode);

      expect(output).toContain('also at: src/b.ts:20, src/c.ts:30-35');
    });
  });

  describe('suppressFixDiffs', () => {
    const ttyMode = { isTTY: true, supportsColor: false, columns: 80 };

    it('includes suggested fix diff by default', () => {
      const report = createReport({
        findings: [
          createFinding({
            location: { path: 'src/foo.ts', startLine: 10 },
            suggestedFix: {
              description: 'Use const',
              diff: '@@ -10,1 +10,1 @@\n-let x = 1;\n+const x = 1;',
            },
          }),
        ],
      });

      const output = renderTerminalReport([report], ttyMode);

      expect(output).toContain('Suggested fix:');
      expect(output).toContain('const x = 1;');
    });

    it('suppresses suggested fix diff when suppressFixDiffs is true', () => {
      const report = createReport({
        findings: [
          createFinding({
            location: { path: 'src/foo.ts', startLine: 10 },
            suggestedFix: {
              description: 'Use const',
              diff: '@@ -10,1 +10,1 @@\n-let x = 1;\n+const x = 1;',
            },
          }),
        ],
      });

      const output = renderTerminalReport([report], ttyMode, { suppressFixDiffs: true });

      expect(output).not.toContain('Suggested fix:');
      expect(output).not.toContain('const x = 1;');
    });

    it('still shows finding title and description when diffs suppressed', () => {
      const report = createReport({
        findings: [
          createFinding({
            title: 'Use const for immutable bindings',
            description: 'This variable is never reassigned',
            location: { path: 'src/foo.ts', startLine: 10 },
            suggestedFix: {
              description: 'Use const',
              diff: '@@ -10,1 +10,1 @@\n-let x = 1;\n+const x = 1;',
            },
          }),
        ],
      });

      const output = renderTerminalReport([report], ttyMode, { suppressFixDiffs: true });

      expect(output).toContain('Use const for immutable bindings');
      expect(output).toContain('This variable is never reassigned');
    });

    it('does not affect CI mode rendering', () => {
      const ciMode = { isTTY: false, supportsColor: false, columns: 80 };
      const report = createReport({
        findings: [
          createFinding({
            location: { path: 'src/foo.ts', startLine: 10 },
            suggestedFix: {
              description: 'Use const',
              diff: '@@ -10,1 +10,1 @@\n-let x = 1;\n+const x = 1;',
            },
          }),
        ],
      });

      const output = renderTerminalReport([report], ciMode, { suppressFixDiffs: true });

      // CI mode always shows diffs regardless of suppressFixDiffs
      expect(output).toContain('Suggested fix:');
      expect(output).toContain('const x = 1;');
    });
  });

  describe('TTY additionalLocations', () => {
    it('shows additional locations in TTY mode', () => {
      const report = createReport({
        findings: [
          createFinding({
            location: { path: 'src/a.ts', startLine: 10 },
            additionalLocations: [
              { path: 'src/b.ts', startLine: 20 },
            ],
          }),
        ],
      });

      const output = renderTerminalReport([report], {
        isTTY: true,
        supportsColor: false,
        columns: 80,
      });

      expect(output).toContain('+1 more location:');
      expect(output).toContain('src/b.ts:20');
    });

    it('uses plural for multiple additional locations', () => {
      const report = createReport({
        findings: [
          createFinding({
            location: { path: 'src/a.ts', startLine: 10 },
            additionalLocations: [
              { path: 'src/b.ts', startLine: 20 },
              { path: 'src/c.ts', startLine: 30 },
            ],
          }),
        ],
      });

      const output = renderTerminalReport([report], {
        isTTY: true,
        supportsColor: false,
        columns: 80,
      });

      expect(output).toContain('+2 more locations:');
    });
  });
});
