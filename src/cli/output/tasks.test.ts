import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDefaultCallbacks, runSkillTask, runSkillTasks, type SkillProgressCallbacks } from './tasks.js';
import { Verbosity } from './verbosity.js';
import type { OutputMode } from './tty.js';
import type { SkillReport, Finding, HunkFailure } from '../../types/index.js';
import type { SkillTaskOptions } from './tasks.js';
import type { FileAnalysisResult } from '../../sdk/types.js';
import type { HunkWithContext } from '../../diff/index.js';
import type { SkillDefinition } from '../../config/schema.js';
import { Semaphore, runPool } from '../../utils/index.js';
import { SkillRunnerError, WardenAuthenticationError } from '../../sdk/errors.js';
import { ProviderFailureCircuitBreaker } from '../../sdk/circuit-breaker.js';
import * as sdkRunner from '../../sdk/runner.js';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'TEST-001',
    severity: 'high',
    title: 'Test finding',
    description: 'A test finding',
    location: { path: 'src/foo.ts', startLine: 10 },
    ...overrides,
  };
}

function makeReport(overrides: Partial<SkillReport> = {}): SkillReport {
  return {
    skill: 'test-skill',
    summary: 'Test summary',
    findings: [],
    durationMs: 1200,
    ...overrides,
  };
}

function makeTask(name: string, displayName?: string): SkillTaskOptions {
  return {
    name,
    displayName,
    resolveSkill: vi.fn(),
    context: {} as SkillTaskOptions['context'],
  };
}

function logMode(): OutputMode {
  return { isTTY: false, supportsColor: false, columns: 80 };
}

function ttyMode(): OutputMode {
  return { isTTY: true, supportsColor: true, columns: 80 };
}

describe('createDefaultCallbacks', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('onSkillStart', () => {
    it('logs "Running..." with file count in log mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);

      cb.onSkillStart({
        name: 'my-trigger',
        displayName: 'code-scanner',
        status: 'running',
        files: [
          { filename: 'src/a.ts', status: 'pending', currentHunk: 0, totalHunks: 1, findings: [] },
          { filename: 'src/b.ts', status: 'pending', currentHunk: 0, totalHunks: 2, findings: [] },
          { filename: 'src/c.ts', status: 'pending', currentHunk: 0, totalHunks: 1, findings: [] },
        ],
        findings: [],
      });

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const msg = errorSpy.mock.calls[0]![0] as string;
      expect(msg).toMatch(/\[.*\] warden: Running code-scanner \(3 files\)\.\.\./);
    });

    it('uses singular "file" for 1 file', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);

      cb.onSkillStart({
        name: 'my-trigger',
        displayName: 'code-scanner',
        status: 'running',
        files: [
          { filename: 'src/a.ts', status: 'pending', currentHunk: 0, totalHunks: 1, findings: [] },
        ],
        findings: [],
      });

      const msg = errorSpy.mock.calls[0]![0] as string;
      expect(msg).toMatch(/\(1 file\)/);
    });

    it('is silent in TTY mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, ttyMode(), Verbosity.Normal);

      cb.onSkillStart({
        name: 'my-trigger',
        displayName: 'code-scanner',
        status: 'running',
        files: [],
        findings: [],
      });

      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('is silent in Quiet mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Quiet);

      cb.onSkillStart({
        name: 'my-trigger',
        displayName: 'code-scanner',
        status: 'running',
        files: [],
        findings: [],
      });

      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('onHunkStart', () => {
    it('logs hunk progress with skill and file prefix in log mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);

      cb.onHunkStart!('my-trigger', 'src/cli/args.ts', 1, 3, 'L10-45');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const msg = errorSpy.mock.calls[0]![0] as string;
      expect(msg).toContain('warden:   code-scanner > src/cli/args.ts [1/3] L10-45');
    });

    it('uses displayName from task options', () => {
      const tasks = [makeTask('my-trigger', 'notseer')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);

      cb.onHunkStart!('my-trigger', 'src/main.ts', 2, 5, 'L50-80');

      const msg = errorSpy.mock.calls[0]![0] as string;
      expect(msg).toContain('notseer > src/main.ts [2/5] L50-80');
    });

    it('is silent in TTY mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, ttyMode(), Verbosity.Normal);

      cb.onHunkStart!('my-trigger', 'src/cli/args.ts', 1, 3, 'L10-45');

      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('is silent in Quiet mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Quiet);

      cb.onHunkStart!('my-trigger', 'src/cli/args.ts', 1, 3, 'L10-45');

      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('onSkillComplete', () => {
    it('logs completion with duration and finding summary in log mode (Normal verbosity omits per-finding lines)', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);
      const findings: Finding[] = [
        makeFinding({ severity: 'high', title: 'SQL injection', location: { path: 'src/api.ts', startLine: 45 } }),
        makeFinding({ id: 'TEST-002', severity: 'medium', title: 'Missing error handling', location: { path: 'src/utils.ts', startLine: 20 } }),
      ];
      const report = makeReport({ findings, durationMs: 1200 });

      cb.onSkillComplete('my-trigger', report);

      // At Normal verbosity, only the completion summary line is shown (no per-finding lines)
      expect(errorSpy).toHaveBeenCalledTimes(1);

      const completionMsg = errorSpy.mock.calls[0]![0] as string;
      expect(completionMsg).toMatch(/warden: code-scanner completed in 1\.2s/);
      expect(completionMsg).toContain('2 findings');
      expect(completionMsg).toContain('1 high');
      expect(completionMsg).toContain('1 medium');
    });

    it('shows per-finding lines at Verbose verbosity in log mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Verbose);
      const findings: Finding[] = [
        makeFinding({ severity: 'high', title: 'SQL injection', location: { path: 'src/api.ts', startLine: 45 } }),
        makeFinding({ id: 'TEST-002', severity: 'medium', title: 'Missing error handling', location: { path: 'src/utils.ts', startLine: 20 } }),
      ];
      const report = makeReport({ findings, durationMs: 1200 });

      cb.onSkillComplete('my-trigger', report);

      // Should have: completion line + 2 finding lines
      expect(errorSpy).toHaveBeenCalledTimes(3);

      const completionMsg = errorSpy.mock.calls[0]![0] as string;
      expect(completionMsg).toMatch(/warden: code-scanner completed in 1\.2s/);

      const finding1 = errorSpy.mock.calls[1]![0] as string;
      expect(finding1).toContain('[high]');
      expect(finding1).toContain('src/api.ts:45');
      expect(finding1).toContain('SQL injection');

      const finding2 = errorSpy.mock.calls[2]![0] as string;
      expect(finding2).toContain('[medium]');
      expect(finding2).toContain('src/utils.ts:20');
    });

    it('logs "No findings" when report has no findings', () => {
      const tasks = [makeTask('my-trigger', 'perf-analyzer')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);
      const report = makeReport({ findings: [], durationMs: 900 });

      cb.onSkillComplete('my-trigger', report);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const msg = errorSpy.mock.calls[0]![0] as string;
      expect(msg).toContain('perf-analyzer completed in 900ms');
      expect(msg).toContain('No findings');
    });

    it('shows suggested fix only at Debug verbosity in log mode', () => {
      const tasks = [makeTask('t', 'scanner')];
      const finding = makeFinding({
        suggestedFix: { description: 'Use parameterized queries', diff: '--- a\n+++ b\n' },
      });
      const report = makeReport({ findings: [finding] });

      // Normal: no finding lines at all (gated behind Verbose)
      const cbNormal = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);
      cbNormal.onSkillComplete('t', report);
      expect(errorSpy).toHaveBeenCalledTimes(1); // completion only
      errorSpy.mockClear();

      // Verbose: finding line shown, but no fix line
      const cbVerbose = createDefaultCallbacks(tasks, logMode(), Verbosity.Verbose);
      cbVerbose.onSkillComplete('t', report);
      expect(errorSpy).toHaveBeenCalledTimes(2); // completion + finding
      errorSpy.mockClear();

      // Debug: fix line shown
      const cbDebug = createDefaultCallbacks(tasks, logMode(), Verbosity.Debug);
      cbDebug.onSkillComplete('t', report);
      expect(errorSpy).toHaveBeenCalledTimes(3); // completion + finding + fix
      const fixMsg = errorSpy.mock.calls[2]![0] as string;
      expect(fixMsg).toContain('fix: Use parameterized queries');
    });

    it('is silent in Quiet mode', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Quiet);
      cb.onSkillComplete('t', makeReport());
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('shows collapsed skipped file count in log mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);

      cb.onFileUpdate('my-trigger', 'a.ts', { status: 'skipped' });
      cb.onFileUpdate('my-trigger', 'b.ts', { status: 'skipped' });
      cb.onFileUpdate('my-trigger', 'c.ts', { status: 'skipped' });
      cb.onSkillComplete('my-trigger', makeReport());

      const msgs = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string);
      const skippedLine = msgs.find((m: string) => m.includes('files skipped'));
      expect(skippedLine).toBeDefined();
      expect(skippedLine).toContain('3 files skipped');
    });

    it('omits skipped count when no files were skipped in log mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);

      cb.onSkillComplete('my-trigger', makeReport());

      const msgs = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(msgs.some((m: string) => m.includes('skipped'))).toBe(false);
    });
  });

  describe('onFileUpdate', () => {
    it('logs file completion with duration, cost, and findings in log mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);

      cb.onFileUpdate('my-trigger', 'src/api/auth.ts', {
        status: 'done',
        findings: [makeFinding({ severity: 'high' })],
        durationMs: 1800,
        usage: { inputTokens: 3000, outputTokens: 500, costUSD: 0.003 },
      });

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const msg = errorSpy.mock.calls[0]![0] as string;
      expect(msg).toContain('code-scanner > src/api/auth.ts done 1.8s $0.00 1 finding');
    });

    it('logs without cost when usage is not present', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);

      cb.onFileUpdate('my-trigger', 'src/utils.ts', {
        status: 'done',
        findings: [],
        durationMs: 500,
      });

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const msg = errorSpy.mock.calls[0]![0] as string;
      expect(msg).toContain('code-scanner > src/utils.ts done 500ms');
      expect(msg).not.toContain('$');
      expect(msg).not.toContain('finding');
    });

    it('is silent for non-done status updates', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);

      cb.onFileUpdate('my-trigger', 'src/api/auth.ts', { status: 'running' });

      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('is silent in TTY mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, ttyMode(), Verbosity.Normal);

      cb.onFileUpdate('my-trigger', 'src/api/auth.ts', {
        status: 'done',
        findings: [],
        durationMs: 1000,
      });

      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('is silent in Quiet mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Quiet);

      cb.onFileUpdate('my-trigger', 'src/api/auth.ts', {
        status: 'done',
        findings: [],
        durationMs: 1000,
      });

      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('tracks skipped files silently in log mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);

      cb.onFileUpdate('my-trigger', 'src/api/auth.ts', { status: 'skipped' });

      // onFileUpdate itself is silent; count appears in onSkillComplete
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('is silent for skipped status in TTY mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, ttyMode(), Verbosity.Normal);

      cb.onFileUpdate('my-trigger', 'src/api/auth.ts', { status: 'skipped' });

      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('is silent for skipped status in Quiet mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Quiet);

      cb.onFileUpdate('my-trigger', 'src/api/auth.ts', { status: 'skipped' });

      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('onSkillSkipped', () => {
    it('logs skipped with timestamp in log mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);

      cb.onSkillSkipped('my-trigger');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const msg = errorSpy.mock.calls[0]![0] as string;
      expect(msg).toMatch(/\[.*\] warden: code-scanner skipped/);
    });

    it('suppresses the duplicate completed line when onSkillComplete fires after onSkillSkipped', () => {
      // The skip path fires both callbacks (onSkillComplete for the
      // JSONL writer); plain output must show "skipped" only.
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);

      cb.onSkillSkipped('my-trigger');
      cb.onSkillComplete('my-trigger', makeReport({ skill: 'code-scanner', findings: [], durationMs: 0 }));

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const msg = errorSpy.mock.calls[0]![0] as string;
      expect(msg).toMatch(/code-scanner skipped/);
      expect(msg).not.toMatch(/completed/);
    });
  });

  describe('onSkillError', () => {
    it('logs error with timestamp in log mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);

      cb.onSkillError('my-trigger', 'Skill not found');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const msg = errorSpy.mock.calls[0]![0] as string;
      expect(msg).toMatch(/\[.*\] warden: ERROR: code-scanner - Skill not found/);
    });

    it('shows collapsed skipped file count on error in log mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);

      cb.onFileUpdate('my-trigger', 'a.ts', { status: 'skipped' });
      cb.onFileUpdate('my-trigger', 'b.ts', { status: 'skipped' });
      cb.onSkillError('my-trigger', 'Abort');

      expect(errorSpy).toHaveBeenCalledTimes(2);
      const skippedMsg = errorSpy.mock.calls[1]![0] as string;
      expect(skippedMsg).toContain('2 files skipped');
    });
  });

  describe('onLargePrompt', () => {
    it('logs warning with timestamp in log mode', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);

      cb.onLargePrompt!('t', 'src/big.ts', '1-100', 50000, 12500);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const msg = errorSpy.mock.calls[0]![0] as string;
      expect(msg).toMatch(/\[.*\] warden: WARN: Large prompt/);
      expect(msg).toContain('src/big.ts:1-100');
      expect(msg).toContain('50k chars');
    });
  });

  describe('debug callbacks', () => {
    it('onPromptSize is defined at Debug verbosity', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Debug);
      expect(cb.onPromptSize).toBeDefined();
    });

    it('onPromptSize is undefined below Debug verbosity', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);
      expect(cb.onPromptSize).toBeUndefined();
    });

    it('onExtractionResult is defined at Debug verbosity', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Debug);
      expect(cb.onExtractionResult).toBeDefined();
    });

    it('onExtractionResult is undefined below Debug verbosity', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);
      expect(cb.onExtractionResult).toBeUndefined();
    });

    it('onFindingProcessing is defined at Debug verbosity', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Debug);
      expect(cb.onFindingProcessing).toBeDefined();
    });

    it('onFindingProcessing is undefined below Debug verbosity', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);
      expect(cb.onFindingProcessing).toBeUndefined();
    });

    it('logs finding processing events in debug mode', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Debug);

      cb.onFindingProcessing!('t', {
        stage: 'verification',
        action: 'rejected',
        finding: {
          id: 'f1',
          severity: 'high',
          title: 'Candidate',
          description: 'desc',
          location: { path: 'src/app.ts', startLine: 10 },
        },
        reason: 'guarded upstream',
      });

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const msg = errorSpy.mock.calls[0]![0] as string;
      expect(msg).toContain('DEBUG: verification:rejected');
      expect(msg).toContain('src/app.ts:10');
      expect(msg).toContain('guarded upstream');
    });
  });

  describe('onHunkFailed', () => {
    it('is defined at Verbose verbosity', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Verbose);
      expect(cb.onHunkFailed).toBeDefined();
    });

    it('is undefined at Normal verbosity', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);
      expect(cb.onHunkFailed).toBeUndefined();
    });

    it('logs warning with location and error in log mode', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Verbose);

      cb.onHunkFailed!('t', 'src/foo.ts', '10-20', 'SDK returned no result');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const msg = errorSpy.mock.calls[0]![0] as string;
      expect(msg).toMatch(/WARN: Chunk failed: src\/foo\.ts:10-20/);
      expect(msg).toContain('SDK returned no result');
    });

    it('logs warning in TTY mode', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, ttyMode(), Verbosity.Verbose);

      cb.onHunkFailed!('t', 'src/bar.ts', '5-15', 'context length exceeded');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const msg = errorSpy.mock.calls[0]![0] as string;
      expect(msg).toContain('Chunk failed: src/bar.ts:5-15');
      expect(msg).toContain('context length exceeded');
    });
  });

  describe('onExtractionFailure', () => {
    it('is defined at Verbose verbosity', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Verbose);
      expect(cb.onExtractionFailure).toBeDefined();
    });

    it('is undefined at Normal verbosity', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);
      expect(cb.onExtractionFailure).toBeUndefined();
    });

    it('logs warning with location and error in log mode', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Verbose);

      cb.onExtractionFailure!('t', 'src/cli/main.ts', '120-155', 'no_findings_json', '{"some raw output...');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const msg = errorSpy.mock.calls[0]![0] as string;
      expect(msg).toMatch(/WARN: Extraction failed: src\/cli\/main\.ts:120-155/);
      expect(msg).toContain('no_findings_json');
    });

    it('shows output preview at Debug verbosity in log mode', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Debug);

      cb.onExtractionFailure!('t', 'src/foo.ts', '10-20', 'invalid_json', 'raw output preview here');

      expect(errorSpy).toHaveBeenCalledTimes(2);
      const previewMsg = errorSpy.mock.calls[1]![0] as string;
      expect(previewMsg).toContain('DEBUG: Output preview: raw output preview here');
    });

    it('does not show preview at Verbose verbosity', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Verbose);

      cb.onExtractionFailure!('t', 'src/foo.ts', '10-20', 'invalid_json', 'raw output preview here');

      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onRetry', () => {
    it('is defined at Verbose verbosity', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Verbose);
      expect(cb.onRetry).toBeDefined();
    });

    it('is undefined at Normal verbosity', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Normal);
      expect(cb.onRetry).toBeUndefined();
    });

    it('logs retry info in log mode', () => {
      const tasks = [makeTask('t', 's')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Verbose);

      cb.onRetry!('t', 'src/api.ts', '30-50', 1, 3, 'rate_limit_error', 2000);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const msg = errorSpy.mock.calls[0]![0] as string;
      expect(msg).toContain('Retry src/api.ts:30-50');
      expect(msg).toContain('attempt 1/3');
      expect(msg).toContain('retrying in 2s');
      expect(msg).toContain('rate_limit_error');
    });
  });
});

describe('runSkillTasks', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  function makeAbortedTasks(): { tasks: SkillTaskOptions[]; resolveSkill: ReturnType<typeof vi.fn> } {
    const controller = new AbortController();
    controller.abort();
    const resolveSkill = vi.fn();
    const context = { eventType: 'pull_request', repository: { owner: 'o', name: 'n', fullName: 'o/n', defaultBranch: 'main' }, repoPath: '/tmp' } as SkillTaskOptions['context'];
    const tasks: SkillTaskOptions[] = [
      { name: 'task-a', resolveSkill, context, runnerOptions: { abortController: controller } },
      { name: 'task-b', resolveSkill, context, runnerOptions: { abortController: controller } },
    ];
    return { tasks, resolveSkill };
  }

  it('skips all tasks when abort signal is already set', async () => {
    const { tasks, resolveSkill } = makeAbortedTasks();

    const results = await runSkillTasks(tasks, {
      mode: logMode(),
      verbosity: Verbosity.Quiet,
      concurrency: 1,
    });

    expect(results).toHaveLength(0);
    expect(resolveSkill).not.toHaveBeenCalled();
  });

  it('skips remaining batches when abort signal is already set (parallel)', async () => {
    const { tasks, resolveSkill } = makeAbortedTasks();

    const results = await runSkillTasks(tasks, {
      mode: logMode(),
      verbosity: Verbosity.Quiet,
      concurrency: 4,
    });

    expect(results).toHaveLength(0);
    expect(resolveSkill).not.toHaveBeenCalled();
  });

  it('does not fail-fast on findings rejected by post-processing', async () => {
    const candidate = makeFinding();
    const controller = new AbortController();
    const fakeHunk = {
      hunk: { newStart: 1, newCount: 10 },
    } as unknown as HunkWithContext;

    const prepareFiles = vi.spyOn(sdkRunner, 'prepareFiles').mockReturnValue({
      files: [{ filename: 'a.ts', hunks: [fakeHunk] }],
      skippedFiles: [],
    });
    const analyzeFile = vi.spyOn(sdkRunner, 'analyzeFile').mockResolvedValue({
      filename: 'a.ts',
      findings: [candidate],
      usage: { inputTokens: 1, outputTokens: 1, costUSD: 0.001 },
      failedHunks: 0,
      failedExtractions: 0,
      hunkFailures: [],
    } satisfies FileAnalysisResult);
    const postProcessFindings = vi.spyOn(sdkRunner, 'postProcessFindings').mockResolvedValue({
      findings: [],
      auxiliaryUsage: [],
    });

    const results = await runSkillTasks([{
      name: 'verify-skill',
      resolveSkill: async () =>
        ({ name: 'verify-skill', definition: '', files: [] } as unknown as SkillDefinition),
      context: {
        eventType: 'pull_request',
        repository: { owner: 'o', name: 'n', fullName: 'o/n', defaultBranch: 'main' },
        repoPath: '/tmp',
        pullRequest: { number: 1, title: 't', body: '', headSha: 'abc', baseSha: 'def', files: [] },
      } as unknown as SkillTaskOptions['context'],
    }], {
      mode: logMode(),
      verbosity: Verbosity.Quiet,
      concurrency: 1,
      failFastController: controller,
    });

    expect(results[0]?.report?.findings).toEqual([]);
    expect(controller.signal.aborted).toBe(false);
    expect(postProcessFindings).toHaveBeenCalled();

    prepareFiles.mockRestore();
    analyzeFile.mockRestore();
    postProcessFindings.mockRestore();
  });

  it('fail-fast aborts after final findings are post-processed', async () => {
    const finalFinding = makeFinding();
    const controller = new AbortController();
    const fakeHunk = {
      hunk: { newStart: 1, newCount: 10 },
    } as unknown as HunkWithContext;

    const prepareFiles = vi.spyOn(sdkRunner, 'prepareFiles').mockReturnValue({
      files: [{ filename: 'a.ts', hunks: [fakeHunk] }],
      skippedFiles: [],
    });
    const analyzeFile = vi.spyOn(sdkRunner, 'analyzeFile').mockResolvedValue({
      filename: 'a.ts',
      findings: [finalFinding],
      usage: { inputTokens: 1, outputTokens: 1, costUSD: 0.001 },
      failedHunks: 0,
      failedExtractions: 0,
      hunkFailures: [],
    } satisfies FileAnalysisResult);
    const postProcessFindings = vi.spyOn(sdkRunner, 'postProcessFindings').mockResolvedValue({
      findings: [finalFinding],
      auxiliaryUsage: [],
    });

    await runSkillTasks([{
      name: 'verify-skill',
      resolveSkill: async () =>
        ({ name: 'verify-skill', definition: '', files: [] } as unknown as SkillDefinition),
      context: {
        eventType: 'pull_request',
        repository: { owner: 'o', name: 'n', fullName: 'o/n', defaultBranch: 'main' },
        repoPath: '/tmp',
        pullRequest: { number: 1, title: 't', body: '', headSha: 'abc', baseSha: 'def', files: [] },
      } as unknown as SkillTaskOptions['context'],
    }], {
      mode: logMode(),
      verbosity: Verbosity.Quiet,
      concurrency: 1,
      failFastController: controller,
    });

    expect(controller.signal.aborted).toBe(true);

    prepareFiles.mockRestore();
    analyzeFile.mockRestore();
    postProcessFindings.mockRestore();
  });
});

describe('runSkillTask all-hunks-fail synthesis', () => {
  function noopCallbacks(): SkillProgressCallbacks {
    return {
      onSkillStart: () => undefined,
      onSkillUpdate: () => undefined,
      onFileUpdate: () => undefined,
      onSkillComplete: () => undefined,
      onSkillSkipped: () => undefined,
      onSkillError: () => undefined,
    };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('synthesizes a report with error.code=auth_failed when every hunk fails with auth errors', async () => {
    const fakeHunk = {
      hunk: { newStart: 1, newCount: 10 },
    } as unknown as HunkWithContext;
    const hunkFailures: HunkFailure[] = [
      { type: 'analysis', filename: 'a.ts', lineRange: '1-10', code: 'auth_failed', message: 'bad key' },
    ];

    vi.spyOn(sdkRunner, 'prepareFiles').mockReturnValue({
      files: [{ filename: 'a.ts', hunks: [fakeHunk] }],
      skippedFiles: [],
    });

    const failedFileResult: FileAnalysisResult = {
      filename: 'a.ts',
      findings: [],
      usage: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
      failedHunks: 1,
      failedExtractions: 0,
      hunkFailures,
    };
    vi.spyOn(sdkRunner, 'analyzeFile').mockResolvedValue(failedFileResult);

    const options: SkillTaskOptions = {
      name: 'all-fail-skill',
      resolveSkill: async () =>
        ({ name: 'all-fail-skill', definition: '', files: [] } as unknown as SkillDefinition),
      context: {
        eventType: 'pull_request',
        repository: { owner: 'o', name: 'n', fullName: 'o/n', defaultBranch: 'main' },
        repoPath: '/tmp',
        pullRequest: { number: 1, title: 't', body: '', headSha: 'abc', baseSha: 'def', files: [] },
      } as unknown as SkillTaskOptions['context'],
    };

    const onSkillError = vi.fn();
    const result = await runSkillTask(options, 1, { ...noopCallbacks(), onSkillError });

    expect(result.report).toBeDefined();
    expect(result.report!.error?.code).toBe('auth_failed');
    expect(result.report!.findings).toEqual([]);
    expect(result.report!.failedHunks).toBe(1);
    expect(result.report!.hunkFailures).toEqual(hunkFailures);
    expect(onSkillError).toHaveBeenCalledTimes(1);
    // A typed error must travel alongside the report so consumers that
    // re-throw (action executor, Sentry) preserve the ErrorCode. A missing
    // error here produces a plain Error downstream and loses classification.
    expect(result.error).toBeInstanceOf(SkillRunnerError);
    expect((result.error as SkillRunnerError).code).toBe('auth_failed');
    // Per-file metadata must be present even on failure runs — `warden runs`
    // and JSONL consumers count attempted files via report.files. Empty
    // files would show totalFiles: 0 for an all-hunks-failed run.
    expect(result.report!.files).toHaveLength(1);
    expect(result.report!.files![0]!.filename).toBe('a.ts');
  });

  it('preserves auth_failed when all analysis failures are auth alongside extraction failures', async () => {
    const fakeHunks = [
      { hunk: { newStart: 1, newCount: 10 } },
      { hunk: { newStart: 20, newCount: 5 } },
    ] as unknown as HunkWithContext[];
    const hunkFailures: HunkFailure[] = [
      { type: 'analysis', filename: 'a.ts', lineRange: '1-10', code: 'auth_failed', message: 'bad key' },
      {
        type: 'extraction',
        filename: 'a.ts',
        lineRange: '20-24',
        code: 'extraction_invalid_json',
        message: 'invalid_json',
      },
    ];

    vi.spyOn(sdkRunner, 'prepareFiles').mockReturnValue({
      files: [{ filename: 'a.ts', hunks: fakeHunks }],
      skippedFiles: [],
    });
    vi.spyOn(sdkRunner, 'analyzeFile').mockResolvedValue({
      filename: 'a.ts',
      findings: [],
      usage: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
      failedHunks: 1,
      failedExtractions: 1,
      hunkFailures,
    });

    const options: SkillTaskOptions = {
      name: 'mixed-fail-skill',
      resolveSkill: async () =>
        ({ name: 'mixed-fail-skill', definition: '', files: [] } as unknown as SkillDefinition),
      context: {
        eventType: 'pull_request',
        repository: { owner: 'o', name: 'n', fullName: 'o/n', defaultBranch: 'main' },
        repoPath: '/tmp',
        pullRequest: { number: 1, title: 't', body: '', headSha: 'abc', baseSha: 'def', files: [] },
      } as unknown as SkillTaskOptions['context'],
    };

    const result = await runSkillTask(options, 1, noopCallbacks());

    expect(result.report!.error?.code).toBe('auth_failed');
    expect(result.report!.failedHunks).toBe(1);
    expect(result.report!.failedExtractions).toBe(1);
    expect((result.error as SkillRunnerError).code).toBe('auth_failed');
  });

  it('synthesizes provider_unavailable when every hunk fails with provider errors', async () => {
    const fakeHunk = {
      hunk: { newStart: 1, newCount: 10 },
    } as unknown as HunkWithContext;
    const hunkFailures: HunkFailure[] = [
      {
        type: 'analysis',
        filename: 'a.ts',
        lineRange: '1-10',
        code: 'provider_unavailable',
        message: 'Claude Code process exited with code 1',
      },
    ];

    vi.spyOn(sdkRunner, 'prepareFiles').mockReturnValue({
      files: [{ filename: 'a.ts', hunks: [fakeHunk] }],
      skippedFiles: [],
    });
    vi.spyOn(sdkRunner, 'analyzeFile').mockResolvedValue({
      filename: 'a.ts',
      findings: [],
      usage: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
      failedHunks: 1,
      failedExtractions: 0,
      hunkFailures,
    });

    const options: SkillTaskOptions = {
      name: 'provider-fail-skill',
      resolveSkill: async () =>
        ({ name: 'provider-fail-skill', definition: '', files: [] } as unknown as SkillDefinition),
      context: {
        eventType: 'pull_request',
        repository: { owner: 'o', name: 'n', fullName: 'o/n', defaultBranch: 'main' },
        repoPath: '/tmp',
        pullRequest: { number: 1, title: 't', body: '', headSha: 'abc', baseSha: 'def', files: [] },
      } as unknown as SkillTaskOptions['context'],
    };

    const result = await runSkillTask(options, 1, noopCallbacks());

    expect(result.report!.error?.code).toBe('provider_unavailable');
    expect(result.report!.error?.message).toContain('Provider unavailable');
    expect((result.error as SkillRunnerError).code).toBe('provider_unavailable');
  });

  it('ignores unrelated circuit state when this skill completed without failures', async () => {
    const fakeHunk = {
      hunk: { newStart: 1, newCount: 10 },
    } as unknown as HunkWithContext;
    const circuitBreaker = new ProviderFailureCircuitBreaker({
      maxConsecutiveProviderFailures: 1,
    });
    circuitBreaker.recordFailure('provider_unavailable', 'temporary outage');

    vi.spyOn(sdkRunner, 'prepareFiles').mockReturnValue({
      files: [{ filename: 'a.ts', hunks: [fakeHunk] }],
      skippedFiles: [],
    });
    vi.spyOn(sdkRunner, 'analyzeFile').mockResolvedValue({
      filename: 'a.ts',
      findings: [],
      usage: { inputTokens: 1, outputTokens: 1, costUSD: 0.001 },
      failedHunks: 0,
      failedExtractions: 0,
      hunkFailures: [],
    });

    const options: SkillTaskOptions = {
      name: 'clean-skill',
      resolveSkill: async () =>
        ({ name: 'clean-skill', definition: '', files: [] } as unknown as SkillDefinition),
      context: {
        eventType: 'pull_request',
        repository: { owner: 'o', name: 'n', fullName: 'o/n', defaultBranch: 'main' },
        repoPath: '/tmp',
        pullRequest: { number: 1, title: 't', body: '', headSha: 'abc', baseSha: 'def', files: [] },
      } as unknown as SkillTaskOptions['context'],
      runnerOptions: { circuitBreaker },
    };

    const onSkillError = vi.fn();
    const result = await runSkillTask(options, 1, { ...noopCallbacks(), onSkillError });

    expect(result.error).toBeUndefined();
    expect(result.report).toBeDefined();
    expect(result.report!.error).toBeUndefined();
    expect(result.report!.findings).toEqual([]);
    expect(result.report!.failedHunks).toBeUndefined();
    expect(result.report!.failedExtractions).toBeUndefined();
    expect(onSkillError).not.toHaveBeenCalled();
  });

  it('triggers all_hunks_failed when every hunk succeeded at SDK level but extraction failed for all', async () => {
    // Regression test for the if/else mutual-exclusion change: each hunk
    // contributes to either failedHunks OR failedExtractions, not both.
    // If every hunk fails extraction (SDK call succeeds, parsing fails)
    // then failedHunks is 0 — naive `failedHunks === totalHunks` checks
    // would silently produce a "0 findings" run. Detection must sum both.
    const fakeHunk = {
      hunk: { newStart: 1, newCount: 10 },
    } as unknown as HunkWithContext;
    const hunkFailures: HunkFailure[] = [
      {
        type: 'extraction',
        filename: 'a.ts',
        lineRange: '1-10',
        code: 'extraction_invalid_json',
        message: 'invalid_json',
      },
    ];

    vi.spyOn(sdkRunner, 'prepareFiles').mockReturnValue({
      files: [{ filename: 'a.ts', hunks: [fakeHunk] }],
      skippedFiles: [],
    });

    const failedFileResult: FileAnalysisResult = {
      filename: 'a.ts',
      findings: [],
      usage: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
      failedHunks: 0,
      failedExtractions: 1,
      hunkFailures,
    };
    vi.spyOn(sdkRunner, 'analyzeFile').mockResolvedValue(failedFileResult);

    const options: SkillTaskOptions = {
      name: 'extraction-fail-skill',
      resolveSkill: async () =>
        ({ name: 'extraction-fail-skill', definition: '', files: [] } as unknown as SkillDefinition),
      context: {
        eventType: 'pull_request',
        repository: { owner: 'o', name: 'n', fullName: 'o/n', defaultBranch: 'main' },
        repoPath: '/tmp',
        pullRequest: { number: 1, title: 't', body: '', headSha: 'abc', baseSha: 'def', files: [] },
      } as unknown as SkillTaskOptions['context'],
    };

    const result = await runSkillTask(options, 1, noopCallbacks());

    expect(result.report).toBeDefined();
    expect(result.report!.error?.code).toBe('all_hunks_failed');
    expect(result.report!.failedExtractions).toBe(1);
    expect(result.report!.findings).toEqual([]);
  });

  it('does not convert user interruption into all_hunks_failed', async () => {
    const fakeHunk = {
      hunk: { newStart: 1, newCount: 10 },
    } as unknown as HunkWithContext;
    const hunkFailures: HunkFailure[] = [
      { type: 'analysis', filename: 'a.ts', lineRange: '1-10', code: 'aborted', message: 'Analysis aborted' },
    ];
    const controller = new AbortController();

    vi.spyOn(sdkRunner, 'prepareFiles').mockReturnValue({
      files: [{ filename: 'a.ts', hunks: [fakeHunk] }],
      skippedFiles: [],
    });

    vi.spyOn(sdkRunner, 'analyzeFile').mockImplementation(async () => {
      controller.abort();
      return {
        filename: 'a.ts',
        findings: [],
        usage: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
        failedHunks: 1,
        failedExtractions: 0,
        hunkFailures,
      };
    });

    const options: SkillTaskOptions = {
      name: 'interrupted-skill',
      resolveSkill: async () =>
        ({ name: 'interrupted-skill', definition: '', files: [] } as unknown as SkillDefinition),
      context: {
        eventType: 'pull_request',
        repository: { owner: 'o', name: 'n', fullName: 'o/n', defaultBranch: 'main' },
        repoPath: '/tmp',
        pullRequest: { number: 1, title: 't', body: '', headSha: 'abc', baseSha: 'def', files: [] },
      } as unknown as SkillTaskOptions['context'],
      runnerOptions: { abortController: controller },
    };

    const onSkillError = vi.fn();
    const result = await runSkillTask(options, 1, { ...noopCallbacks(), onSkillError });

    expect(result.error).toBeUndefined();
    expect(result.report).toBeDefined();
    expect(result.report!.error).toBeUndefined();
    expect(result.report!.failedHunks).toBe(1);
    expect(result.report!.hunkFailures).toEqual(hunkFailures);
    expect(onSkillError).not.toHaveBeenCalled();
  });
});

describe('runSkillTask skipped path', () => {
  function noopCallbacks(): SkillProgressCallbacks {
    return {
      onSkillStart: () => undefined,
      onSkillUpdate: () => undefined,
      onFileUpdate: () => undefined,
      onSkillComplete: () => undefined,
      onSkillSkipped: () => undefined,
      onSkillError: () => undefined,
    };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits onSkillComplete alongside onSkillSkipped so incremental JSONL captures skipped skills', async () => {
    vi.spyOn(sdkRunner, 'prepareFiles').mockReturnValue({ files: [], skippedFiles: [] });

    const options: SkillTaskOptions = {
      name: 'no-files-skill',
      resolveSkill: async () =>
        ({ name: 'no-files-skill', definition: '', files: [] } as unknown as SkillDefinition),
      context: {
        eventType: 'pull_request',
        repository: { owner: 'o', name: 'n', fullName: 'o/n', defaultBranch: 'main' },
        repoPath: '/tmp',
        pullRequest: { number: 1, title: 't', body: '', headSha: 'a', baseSha: 'b', files: [] },
      } as unknown as SkillTaskOptions['context'],
    };

    const onSkillSkipped = vi.fn();
    const onSkillComplete = vi.fn();
    const result = await runSkillTask(options, 1, {
      ...noopCallbacks(),
      onSkillSkipped,
      onSkillComplete,
    });

    expect(onSkillSkipped).toHaveBeenCalledExactlyOnceWith('no-files-skill');
    expect(onSkillComplete).toHaveBeenCalledTimes(1);
    const [name, report] = onSkillComplete.mock.calls[0]!;
    expect(name).toBe('no-files-skill');
    expect(report.skill).toBe('no-files-skill');
    expect(report.summary).toBe('No code changes to analyze');
    expect(result.report).toBe(report);
  });
});

describe('runSkillTask model lanes', () => {
  function noopCallbacks(): SkillProgressCallbacks {
    return {
      onSkillStart: () => undefined,
      onSkillUpdate: () => undefined,
      onFileUpdate: () => undefined,
      onSkillComplete: () => undefined,
      onSkillSkipped: () => undefined,
      onSkillError: () => undefined,
    };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes model lanes to shared finding post-processing', async () => {
    const fakeHunk = {
      hunk: { newStart: 1, newCount: 10 },
    } as unknown as HunkWithContext;
    const finding = makeFinding();

    vi.spyOn(sdkRunner, 'prepareFiles').mockReturnValue({
      files: [{ filename: 'a.ts', hunks: [fakeHunk] }],
      skippedFiles: [],
    });
    vi.spyOn(sdkRunner, 'analyzeFile').mockResolvedValue({
      filename: 'a.ts',
      findings: [finding],
      usage: { inputTokens: 1, outputTokens: 1, costUSD: 0.001 },
      failedHunks: 0,
      failedExtractions: 0,
      hunkFailures: [],
    } satisfies FileAnalysisResult);
    const postProcessSpy = vi.spyOn(sdkRunner, 'postProcessFindings').mockResolvedValue({
      findings: [finding],
      auxiliaryUsage: [],
    });

    const result = await runSkillTask({
      name: 'lane-skill',
      resolveSkill: async () =>
        ({ name: 'lane-skill', definition: '', files: [] } as unknown as SkillDefinition),
      context: {
        eventType: 'pull_request',
        repository: { owner: 'o', name: 'n', fullName: 'o/n', defaultBranch: 'main' },
        repoPath: '/tmp',
        pullRequest: { number: 1, title: 't', body: '', headSha: 'abc', baseSha: 'def', files: [] },
      } as unknown as SkillTaskOptions['context'],
      runnerOptions: {
        auxiliaryModel: 'claude-haiku-4-5',
        synthesisModel: 'claude-opus-4-5',
      },
    }, 1, noopCallbacks());

    expect(result.report?.error).toBeUndefined();
    expect(postProcessSpy).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        auxiliaryModel: 'claude-haiku-4-5',
        synthesisModel: 'claude-opus-4-5',
      })
    );
  });
});

describe('runSkillTask error capture', () => {
  function noopCallbacks(): SkillProgressCallbacks {
    return {
      onSkillStart: () => undefined,
      onSkillUpdate: () => undefined,
      onFileUpdate: () => undefined,
      onSkillComplete: () => undefined,
      onSkillSkipped: () => undefined,
      onSkillError: () => undefined,
    };
  }

  function makeContext(): SkillTaskOptions['context'] {
    return {
      eventType: 'pull_request',
      repository: { owner: 'o', name: 'n', fullName: 'o/n', defaultBranch: 'main' },
      repoPath: '/tmp',
    } as SkillTaskOptions['context'];
  }

  it('returns a report with error when resolveSkill throws WardenAuthenticationError', async () => {
    const options: SkillTaskOptions = {
      name: 'auth-skill',
      resolveSkill: async () => {
        throw new WardenAuthenticationError('missing API key');
      },
      context: makeContext(),
    };

    const onSkillError = vi.fn();
    const result = await runSkillTask(options, 1, { ...noopCallbacks(), onSkillError });

    expect(result.name).toBe('auth-skill');
    expect(result.report).toBeDefined();
    expect(result.report!.error).toBeDefined();
    expect(result.report!.error!.code).toBe('auth_failed');
    expect(result.report!.error!.message).toContain('missing API key');
    expect(result.report!.findings).toEqual([]);
    expect(onSkillError).toHaveBeenCalledTimes(1);
    // raw error is still exposed for in-process consumers
    expect(result.error).toBeInstanceOf(WardenAuthenticationError);
  });

  it('returns a report with skill_resolution_failed when resolveSkill throws a generic error', async () => {
    const options: SkillTaskOptions = {
      name: 'missing-skill',
      resolveSkill: async () => {
        throw new Error('skill not found: foo');
      },
      context: makeContext(),
    };

    const result = await runSkillTask(options, 1, noopCallbacks());

    expect(result.report).toBeDefined();
    expect(result.report!.error?.code).toBe('skill_resolution_failed');
    expect(result.report!.error?.message).toContain('skill not found: foo');
    expect(result.report!.summary).toContain('skill_resolution_failed');
  });

  it('preserves failOn/minConfidence on error result', async () => {
    const options: SkillTaskOptions = {
      name: 'fail-skill',
      failOn: 'high',
      minConfidence: 'medium',
      resolveSkill: async () => {
        throw new Error('boom');
      },
      context: makeContext(),
    };

    const result = await runSkillTask(options, 1, noopCallbacks());

    expect(result.failOn).toBe('high');
    expect(result.minConfidence).toBe('medium');
  });
});

describe('Semaphore integration with runPool', () => {
  it('limits concurrent file analyses across skills to the semaphore size', async () => {
    // Track concurrent active file analyses
    let active = 0;
    let maxActive = 0;
    const concurrencyLimit = 2;
    const semaphore = new Semaphore(concurrencyLimit);

    // Simulate 3 skills each with 3 files (9 total file analyses).
    // runPool gets unlimited concurrency (like skills launching in parallel),
    // but the semaphore gates how many run simultaneously.
    const fileWork = Array.from({ length: 9 }, (_, i) => i);

    const results = await runPool(fileWork, fileWork.length, async (item) => {
      await semaphore.acquire();
      try {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        return item;
      } finally {
        semaphore.release();
      }
    });

    expect(results).toHaveLength(9);
    expect(maxActive).toBeLessThanOrEqual(concurrencyLimit);
    expect(maxActive).toBe(concurrencyLimit);
  });
});
