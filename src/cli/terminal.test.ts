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
});
