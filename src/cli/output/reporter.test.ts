import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Reporter } from './reporter.js';
import { Verbosity } from './verbosity.js';
import type { OutputMode } from './tty.js';
import type { SkillReport, Finding } from '../../types/index.js';

function logMode(): OutputMode {
  return { isTTY: false, supportsColor: false, columns: 80 };
}

function ttyMode(): OutputMode {
  return { isTTY: true, supportsColor: true, columns: 80 };
}

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'TEST-001',
    severity: 'high',
    title: 'Test finding',
    description: 'A test finding',
    ...overrides,
  };
}

function makeReport(overrides: Partial<SkillReport> = {}): SkillReport {
  return {
    skill: 'test-skill',
    summary: 'Test summary',
    findings: [],
    ...overrides,
  };
}

describe('Reporter', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  describe('renderSummary', () => {
    it('shows finding counts in log mode', () => {
      const reporter = new Reporter(logMode(), Verbosity.Normal);
      reporter.renderSummary([makeReport({ findings: [makeFinding()] })], 1000);

      const output = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('\n');
      expect(output).toContain('Summary:');
      expect(output).toContain('1 finding');
    });

    it('shows finding counts in TTY mode', () => {
      const reporter = new Reporter(ttyMode(), Verbosity.Normal);
      reporter.renderSummary([makeReport({ findings: [makeFinding()] })], 1000);

      const output = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('\n');
      expect(output).toContain('SUMMARY');
    });

    it('shows failed hunk count in log mode', () => {
      const reporter = new Reporter(logMode(), Verbosity.Normal);
      reporter.renderSummary([makeReport({ failedHunks: 3 })], 1000);

      const output = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('\n');
      expect(output).toContain('WARN: 3 chunks failed to analyze');
    });

    it('shows failed extraction count in log mode', () => {
      const reporter = new Reporter(logMode(), Verbosity.Normal);
      reporter.renderSummary([makeReport({ failedExtractions: 5 })], 1000);

      const output = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('\n');
      expect(output).toContain('WARN: 5 finding extractions failed');
    });

    it('shows failed hunk count in TTY mode', () => {
      const reporter = new Reporter(ttyMode(), Verbosity.Normal);
      reporter.renderSummary([makeReport({ failedHunks: 2 })], 1000);

      const output = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('\n');
      expect(output).toContain('2 chunks failed to analyze');
    });

    it('shows -v hint when failures present and verbosity is Normal', () => {
      const reporter = new Reporter(logMode(), Verbosity.Normal);
      reporter.renderSummary([makeReport({ failedHunks: 1 })], 1000);

      const output = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('\n');
      expect(output).toContain('Use -v for failure details');
    });

    it('shows -v hint in TTY mode when failures present and verbosity is Normal', () => {
      const reporter = new Reporter(ttyMode(), Verbosity.Normal);
      reporter.renderSummary([makeReport({ failedExtractions: 2 })], 1000);

      const output = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('\n');
      expect(output).toContain('Use -v for failure details');
    });

    it('does not show -v hint when verbosity is Verbose', () => {
      const reporter = new Reporter(logMode(), Verbosity.Verbose);
      reporter.renderSummary([makeReport({ failedHunks: 1 })], 1000);

      const output = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('\n');
      expect(output).not.toContain('Use -v for failure details');
    });

    it('does not show -v hint when no failures', () => {
      const reporter = new Reporter(logMode(), Verbosity.Normal);
      reporter.renderSummary([makeReport()], 1000);

      const output = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('\n');
      expect(output).not.toContain('Use -v for failure details');
    });

    it('aggregates failures across multiple reports', () => {
      const reporter = new Reporter(logMode(), Verbosity.Normal);
      reporter.renderSummary([
        makeReport({ failedHunks: 1 }),
        makeReport({ failedHunks: 2, failedExtractions: 3 }),
      ], 1000);

      const output = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('\n');
      expect(output).toContain('WARN: 3 chunks failed to analyze');
      expect(output).toContain('WARN: 3 finding extractions failed');
    });

    it('uses singular "chunk" for 1 failure', () => {
      const reporter = new Reporter(logMode(), Verbosity.Normal);
      reporter.renderSummary([makeReport({ failedHunks: 1 })], 1000);

      const output = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('\n');
      expect(output).toContain('1 chunk failed to analyze');
    });

    it('uses singular "extraction" for 1 failure', () => {
      const reporter = new Reporter(logMode(), Verbosity.Normal);
      reporter.renderSummary([makeReport({ failedExtractions: 1 })], 1000);

      const output = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('\n');
      expect(output).toContain('1 finding extraction failed');
    });

    it('shows duration in log mode', () => {
      const reporter = new Reporter(logMode(), Verbosity.Normal);
      reporter.renderSummary([makeReport()], 5000);

      const output = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('\n');
      expect(output).toContain('Total time: 5.0s');
    });

    it('outputs only finding counts in Quiet mode', () => {
      const reporter = new Reporter(logMode(), Verbosity.Quiet);
      reporter.renderSummary([makeReport({ findings: [makeFinding()] })], 1000);

      // Quiet mode uses console.log (not console.error)
      expect(logSpy).toHaveBeenCalledTimes(1);
      const output = logSpy.mock.calls[0]![0] as string;
      expect(output).toContain('1 finding');
      // No WARN or hint in quiet mode
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('skips failure warnings in Quiet mode', () => {
      const reporter = new Reporter(logMode(), Verbosity.Quiet);
      reporter.renderSummary([makeReport({ failedHunks: 5 })], 1000);

      const errorOutput = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('\n');
      expect(errorOutput).not.toContain('failed to analyze');
      expect(errorOutput).not.toContain('Use -v');
    });
  });
});
