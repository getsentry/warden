import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDefaultCallbacks, runSkillTasks } from './tasks.js';
import { Verbosity } from './verbosity.js';
import type { OutputMode } from './tty.js';
import type { SkillReport, Finding } from '../../types/index.js';
import type { SkillTaskOptions } from './tasks.js';

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
    errorSpy.mockRestore();
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
        makeFinding({ severity: 'critical', title: 'SQL injection', location: { path: 'src/api.ts', startLine: 45 } }),
        makeFinding({ id: 'TEST-002', severity: 'high', title: 'Missing error handling', location: { path: 'src/utils.ts', startLine: 20 } }),
      ];
      const report = makeReport({ findings, durationMs: 1200 });

      cb.onSkillComplete('my-trigger', report);

      // At Normal verbosity, only the completion summary line is shown (no per-finding lines)
      expect(errorSpy).toHaveBeenCalledTimes(1);

      const completionMsg = errorSpy.mock.calls[0]![0] as string;
      expect(completionMsg).toMatch(/warden: code-scanner completed in 1\.2s/);
      expect(completionMsg).toContain('2 findings');
      expect(completionMsg).toContain('1 critical');
      expect(completionMsg).toContain('1 high');
    });

    it('shows per-finding lines at Verbose verbosity in log mode', () => {
      const tasks = [makeTask('my-trigger', 'code-scanner')];
      const cb = createDefaultCallbacks(tasks, logMode(), Verbosity.Verbose);
      const findings: Finding[] = [
        makeFinding({ severity: 'critical', title: 'SQL injection', location: { path: 'src/api.ts', startLine: 45 } }),
        makeFinding({ id: 'TEST-002', severity: 'high', title: 'Missing error handling', location: { path: 'src/utils.ts', startLine: 20 } }),
      ];
      const report = makeReport({ findings, durationMs: 1200 });

      cb.onSkillComplete('my-trigger', report);

      // Should have: completion line + 2 finding lines
      expect(errorSpy).toHaveBeenCalledTimes(3);

      const completionMsg = errorSpy.mock.calls[0]![0] as string;
      expect(completionMsg).toMatch(/warden: code-scanner completed in 1\.2s/);

      const finding1 = errorSpy.mock.calls[1]![0] as string;
      expect(finding1).toContain('[critical]');
      expect(finding1).toContain('src/api.ts:45');
      expect(finding1).toContain('SQL injection');

      const finding2 = errorSpy.mock.calls[2]![0] as string;
      expect(finding2).toContain('[high]');
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
});
