import { afterEach, describe, expect, it, vi } from 'vitest';
import { Verbosity } from './verbosity.js';
import { runSkillTasksWithInk } from './ink-runner.js';

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
});
