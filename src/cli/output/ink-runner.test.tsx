import { afterEach, describe, expect, it, vi } from 'vitest';
import { Verbosity } from './verbosity.js';
import { getSkillCostUSD, runSkillTasksWithInk } from './ink-runner.js';

const { mockRender, mockRunComposedSkillTasks } = vi.hoisted(() => ({
  mockRender: vi.fn(() => ({
    rerender: vi.fn(),
    unmount: vi.fn(),
    clear: vi.fn(),
  })),
  mockRunComposedSkillTasks: vi.fn(async (_tasks, callbacks) => {
    callbacks.onSkillStart({
      name: 'security/authz',
      displayName: 'security/authz',
      status: 'running',
      files: [],
      findings: [],
    });
    callbacks.onSkillUpdate('security/authz', {
      status: 'done',
      durationMs: 1_200,
      files: [],
      findings: [],
    });
    return [];
  }),
}));

vi.mock('ink', () => ({
  render: mockRender,
  Box: 'box',
  Text: 'text',
  Static: 'static',
}));

vi.mock('./tasks.js', () => ({
  composeTasksWithFailFast: vi.fn((tasks) => tasks),
  runComposedSkillTasks: mockRunComposedSkillTasks,
}));

describe('runSkillTasksWithInk', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockRender.mockClear();
    mockRunComposedSkillTasks.mockClear();
  });

  it('prints the SKILLS section header before the live area and does not duplicate it after completion', async () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await runSkillTasksWithInk(
      [{
        name: 'security/authz',
        displayName: 'security/authz',
      } as never],
      {
        mode: { isTTY: true, supportsColor: false, columns: 80 },
        verbosity: Verbosity.Normal,
        concurrency: 2,
      },
    );

    const output = stderrWrite.mock.calls.map(([chunk]) => String(chunk)).join('');
    expect(output).toContain('SKILLS');
    expect(output.match(/SKILLS/g)).toHaveLength(1);
    expect(output.indexOf('SKILLS')).toBeLessThan(output.indexOf('security/authz'));
  });

  it('adds auxiliary usage to rendered skill cost', () => {
    expect(getSkillCostUSD({
      name: 'find-warden-bugs',
      displayName: 'find-warden-bugs',
      status: 'running',
      findings: [],
      files: [{
        filename: 'src/app.ts',
        status: 'done',
        currentHunk: 1,
        totalHunks: 1,
        findings: [],
        usage: { inputTokens: 10, outputTokens: 1, costUSD: 20 },
      }],
      auxiliaryUsage: {
        verification: { inputTokens: 5, outputTokens: 1, costUSD: 6.19 },
      },
    })).toBeCloseTo(26.19);
  });

  it('prints completed skill cost with auxiliary usage included', async () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const usage = { inputTokens: 10, outputTokens: 1, costUSD: 20 };
    const auxiliaryUsage = {
      verification: { inputTokens: 5, outputTokens: 1, costUSD: 6.19 },
    };

    mockRunComposedSkillTasks.mockImplementationOnce(async (_tasks, callbacks) => {
      callbacks.onSkillStart({
        name: 'find-warden-bugs',
        displayName: 'find-warden-bugs',
        status: 'running',
        files: [],
        findings: [],
      });
      callbacks.onSkillUpdate('find-warden-bugs', {
        status: 'done',
        durationMs: 1_200,
        findings: [],
        usage,
        auxiliaryUsage,
      });
      callbacks.onSkillComplete('find-warden-bugs', {
        skill: 'find-warden-bugs',
        summary: 'find-warden-bugs: No issues found',
        findings: [],
        usage,
        auxiliaryUsage,
        durationMs: 1_200,
      });
      return [];
    });

    await runSkillTasksWithInk(
      [{
        name: 'find-warden-bugs',
        displayName: 'find-warden-bugs',
      } as never],
      {
        mode: { isTTY: true, supportsColor: false, columns: 80 },
        verbosity: Verbosity.Normal,
        concurrency: 2,
      },
    );

    const output = stderrWrite.mock.calls.map(([chunk]) => String(chunk)).join('');
    expect(output).toContain('find-warden-bugs');
    expect(output).toContain('$26.19');
  });

  it('preserves skipped status when skipped skills emit completion', async () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    mockRunComposedSkillTasks.mockImplementationOnce(async (_tasks, callbacks) => {
      callbacks.onSkillSkipped('empty-skill');
      callbacks.onSkillComplete('empty-skill', {
        skill: 'empty-skill',
        summary: 'No code changes to analyze',
        findings: [],
        durationMs: 100,
      });
      return [];
    });

    await runSkillTasksWithInk(
      [{
        name: 'empty-skill',
        displayName: 'empty-skill',
      } as never],
      {
        mode: { isTTY: true, supportsColor: false, columns: 80 },
        verbosity: Verbosity.Normal,
        concurrency: 2,
      },
    );

    const output = stderrWrite.mock.calls.map(([chunk]) => String(chunk)).join('');
    expect(output).toContain('empty-skill');
    expect(output).toContain('[skipped]');
  });

  it('does not trigger fail-fast from file findings before completion', async () => {
    const controller = new AbortController();

    mockRunComposedSkillTasks.mockImplementationOnce(async (_tasks, callbacks) => {
      callbacks.onSkillStart({
        name: 'find-warden-bugs',
        displayName: 'find-warden-bugs',
        status: 'running',
        files: [{
          filename: 'src/app.ts',
          status: 'running',
          currentHunk: 1,
          totalHunks: 1,
          findings: [],
        }],
        findings: [],
      });
      callbacks.onFileUpdate('find-warden-bugs', 'src/app.ts', {
        status: 'done',
        findings: [{
          id: 'candidate',
          severity: 'high',
          title: 'Rejected candidate',
          description: 'Rejected during verification',
        }],
      });
      callbacks.onSkillComplete('find-warden-bugs', {
        skill: 'find-warden-bugs',
        summary: 'find-warden-bugs: No issues found',
        findings: [],
      });
      return [];
    });

    await runSkillTasksWithInk(
      [{
        name: 'find-warden-bugs',
        displayName: 'find-warden-bugs',
      } as never],
      {
        mode: { isTTY: true, supportsColor: false, columns: 80 },
        verbosity: Verbosity.Normal,
        concurrency: 2,
        failFastController: controller,
      },
    );

    expect(controller.signal.aborted).toBe(false);
  });

  it('does not trigger fail-fast from file findings in quiet mode', async () => {
    const controller = new AbortController();

    mockRunComposedSkillTasks.mockImplementationOnce(async (_tasks, callbacks) => {
      callbacks.onFileUpdate('find-warden-bugs', 'src/app.ts', {
        status: 'done',
        findings: [{
          id: 'candidate',
          severity: 'high',
          title: 'Rejected candidate',
          description: 'Rejected during verification',
        }],
      });
      callbacks.onSkillComplete('find-warden-bugs', {
        skill: 'find-warden-bugs',
        summary: 'find-warden-bugs: No issues found',
        findings: [],
      });
      return [];
    });

    await runSkillTasksWithInk(
      [{
        name: 'find-warden-bugs',
        displayName: 'find-warden-bugs',
      } as never],
      {
        mode: { isTTY: true, supportsColor: false, columns: 80 },
        verbosity: Verbosity.Quiet,
        concurrency: 2,
        failFastController: controller,
      },
    );

    expect(controller.signal.aborted).toBe(false);
  });
});
