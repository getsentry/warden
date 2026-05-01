import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CLIOptions } from '../args.js';
import { Reporter } from '../output/reporter.js';
import { detectOutputMode } from '../output/tty.js';
import { Verbosity } from '../output/verbosity.js';
import { synthesizeCoordinatorPlan } from '../../coordinator/plan.js';
import { synthesizeCoordinatorChildSkill } from '../../coordinator/child-skills.js';
import { runSynthesize } from './synthesize.js';

vi.mock('../../coordinator/plan.js', async () => {
  const actual = await vi.importActual('../../coordinator/plan.js') as Record<string, unknown>;
  return {
    ...actual,
    synthesizeCoordinatorPlan: vi.fn(),
  };
});

vi.mock('../../coordinator/child-skills.js', async () => {
  const actual = await vi.importActual('../../coordinator/child-skills.js') as Record<string, unknown>;
  return {
    ...actual,
    synthesizeCoordinatorChildSkill: vi.fn(),
  };
});

const mockSynthesizeCoordinatorPlan = vi.mocked(synthesizeCoordinatorPlan);
const mockSynthesizeCoordinatorChildSkill = vi.mocked(synthesizeCoordinatorChildSkill);

function emptyUsage() {
  return {
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    costUSD: 0.01,
  };
}

function writeLocalSkill(root: string, name: string): void {
  mkdirSync(join(root, '.warden', 'superwarden', name), { recursive: true });
  writeFileSync(
    join(root, '.warden', 'superwarden', name, 'SKILL.md'),
    `---
name: ${name}
description: Review security issues.
---

Review security issues.
`,
    'utf-8',
  );
}

function createOptions(overrides: Partial<CLIOptions> = {}): CLIOptions {
  return {
    json: false,
    help: false,
    quiet: false,
    verbose: 0,
    debug: false,
    log: false,
    fix: false,
    force: false,
    list: false,
    git: false,
    staged: false,
    offline: false,
    failFast: false,
    showPlan: false,
    regenerate: false,
    ...overrides,
  };
}

describe('synthesize command', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-synthesize-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    writeLocalSkill(tempDir, 'security-review');
    writeFileSync(
      join(tempDir, 'warden.toml'),
      `version = 1

[defaults.auxiliary]
model = "aux-model"
maxRetries = 3

[defaults.synthesis]
model = "synth-model"

[[skills]]
name = "security-review"
mode = "coordinator"
model = "skill-agent-model"
`,
      'utf-8',
    );
    mockSynthesizeCoordinatorChildSkill.mockImplementation(async (args) => {
      const taskDir = join(args.rootDir!, args.task.id);
      mkdirSync(taskDir, { recursive: true });
      writeFileSync(
        join(taskDir, 'SKILL.md'),
        `---
name: ${args.task.id}
description: ${args.task.title}
allowed-tools: Read Grep Glob WebFetch WebSearch
---

Use WebSearch or WebFetch for public prior art.
`,
        'utf-8',
      );
      writeFileSync(join(taskDir, 'SPEC.md'), '# Spec\n', 'utf-8');
      writeFileSync(join(taskDir, 'SOURCES.md'), '# Sources\n', 'utf-8');
      return {
        source: 'generated',
        taskId: args.task.id,
        name: args.task.id,
        path: taskDir,
        bytes: 1024,
        durationMs: 12_000,
        usage: emptyUsage(),
        externalSources: [{ title: 'Source', url: 'https://example.com', reason: 'Prior art' }],
        missingInputs: [],
      };
    });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('synthesizes and exports a configured Superwarden skill', async () => {
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockSynthesizeCoordinatorPlan.mockResolvedValue({
      source: 'generated',
      cachePath: join(tempDir, '.warden', 'superwarden', 'security-review', 'cache', 'hash.json'),
      plan: {
        version: 1,
        skill: 'security-review',
        sourceHash: 'hash',
        coordinatorVersion: '1',
        synthesis: {
          phases: [{ id: 'collect-inputs', status: 'generated' }],
        },
        tasks: [{
          id: 'authz',
          title: 'Authorization',
          scope: 'Find authorization issues.',
          prompt: 'Review authorization issues.',
          evidenceRequirements: ['Trace the permission boundary.'],
          outOfScope: [],
        }],
      },
    });

    const reporter = new Reporter(detectOutputMode(false), Verbosity.Normal);
    const exitCode = await runSynthesize(
      createOptions({
        skill: 'security-review',
        regenerate: true,
        exportPath: 'plan.json',
      }),
      reporter,
    );

    expect(exitCode).toBe(0);
    expect(mockSynthesizeCoordinatorPlan).toHaveBeenCalledWith(expect.objectContaining({
      skill: expect.objectContaining({ name: 'security-review' }),
      model: 'synth-model',
      regenerate: true,
      repairModel: 'aux-model',
      repairMaxRetries: 3,
      cacheDir: expect.stringContaining(join('.warden', 'superwarden', 'security-review', 'cache')),
    }));
    const stderr = stderrSpy.mock.calls.map(([line]) => String(line)).join('\n');
    expect(stderr).not.toContain('\nSUPERWARDEN\n');
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Skill    security-review'));
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Model    synth-model [claude]'));
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('PLAN'));
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Synthesizing Superwarden plan...'));
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('TASKS'));
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringMatching(/authz\s+\[generated\]/));
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Find authorization issues.'));
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Artifact  1.0 KB'));
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Synthesis 12.0s'));
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Usage     1.0k input / 500 output · $0.01'));
    expect(stderr).not.toContain('Cache     ');
    expect(stderr).not.toContain('Cost      ');
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Generated 1 task'));
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('pnpm cli src/file.ts --skill security-review'));
    expect(existsSync(join(tempDir, 'plan.json'))).toBe(true);
    expect(JSON.parse(readFileSync(join(tempDir, 'plan.json'), 'utf-8')).tasks[0].id).toBe('authz');
    const childSkillPath = join(
      tempDir,
      '.warden',
      'superwarden',
      'security-review',
      'cache',
      'hash',
      'skills',
      'authz',
      'SKILL.md',
    );
    expect(existsSync(childSkillPath)).toBe(true);
    expect(readFileSync(childSkillPath, 'utf-8')).toContain('allowed-tools: Read Grep Glob WebFetch WebSearch');
    expect(readFileSync(childSkillPath, 'utf-8')).toContain('Use WebSearch or WebFetch');
    expect(mockSynthesizeCoordinatorChildSkill).toHaveBeenCalledWith(expect.objectContaining({
      repoPath: expect.stringContaining('warden-synthesize-test-'),
      model: 'synth-model',
      repairModel: 'aux-model',
      repairMaxRetries: 3,
      regenerate: true,
    }));
    stderrSpy.mockRestore();
  });

  it('prepares cached child skills without forcing regeneration on a cached parent plan', async () => {
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockSynthesizeCoordinatorPlan.mockResolvedValue({
      source: 'cache',
      cachePath: join(tempDir, '.warden', 'superwarden', 'security-review', 'cache', 'hash.json'),
      plan: {
        version: 1,
        skill: 'security-review',
        sourceHash: 'hash',
        coordinatorVersion: '1',
        synthesis: {
          phases: [{ id: 'collect-inputs', status: 'cached' }],
        },
        tasks: [{
          id: 'authz',
          title: 'Authorization',
          scope: 'Find authorization issues.',
          prompt: 'Review authorization issues.',
          evidenceRequirements: ['Trace the permission boundary.'],
          outOfScope: [],
        }],
      },
    });
    mockSynthesizeCoordinatorChildSkill.mockImplementationOnce(async (args) => ({
      source: 'cache',
      taskId: args.task.id,
      name: args.task.id,
      path: join(args.rootDir!, args.task.id),
      bytes: 1024,
      durationMs: 12_000,
      usage: emptyUsage(),
      externalSources: [{ title: 'Source', url: 'https://example.com', reason: 'Prior art' }],
      missingInputs: [],
    }));

    const reporter = new Reporter(detectOutputMode(false), Verbosity.Normal);
    const exitCode = await runSynthesize(
      createOptions({ skill: 'security-review' }),
      reporter,
    );

    expect(exitCode).toBe(0);
    expect(mockSynthesizeCoordinatorChildSkill).toHaveBeenCalledWith(expect.objectContaining({
      regenerate: false,
      rootDir: join(tempDir, '.warden', 'superwarden', 'security-review', 'cache', 'hash', 'skills'),
    }));
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringMatching(/authz\s+\[cached\]/));
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('pnpm cli src/file.ts --skill security-review'));
    const output = stderrSpy.mock.calls.map(([line]) => String(line)).join('\n');
    expect(output).not.toContain('Cache: reuse validated child skills when inputs match');
    expect(output).not.toContain('Prepared 1 task');
    expect(output).not.toContain('Cached    1');
    expect(output).not.toContain('Path');
    expect(output).not.toContain('Artifact  1.0 KB');
    expect(output).not.toContain('Synthesis 12.0s');
    expect(output).not.toContain('Usage     1.0k input / 500 output · $0.01');
    stderrSpy.mockRestore();
  });

  it('shows a readable plan without synthesizing child skills', async () => {
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    mockSynthesizeCoordinatorPlan.mockResolvedValue({
      source: 'cache',
      cachePath: join(tempDir, '.warden', 'superwarden', 'security-review', 'cache', 'hash.json'),
      plan: {
        version: 1,
        skill: 'security-review',
        sourceHash: 'hash',
        coordinatorVersion: '1',
        synthesis: {
          phases: [
            { id: 'collect-inputs', status: 'generated' },
            { id: 'validate-coverage', status: 'validated' },
          ],
          externalSources: [{
            title: 'GitHub Actions security hardening',
            url: 'https://example.com/actions-security',
            reason: 'Explains pull request trust boundaries.',
          }],
          missingInputs: ['Whether fork pull requests run with repository secrets.'],
        },
        tasks: [{
          id: 'authz',
          title: 'Authorization',
          scope: 'Find authorization issues in changed TypeScript code.',
          prompt: 'Review authorization issues.',
          evidenceRequirements: ['Trace the permission boundary.'],
          outOfScope: ['Generic style comments.'],
        }],
      },
    });

    const reporter = new Reporter(detectOutputMode(false), Verbosity.Normal);
    const exitCode = await runSynthesize(
      createOptions({ skill: 'security-review', showPlan: true }),
      reporter,
    );

    expect(exitCode).toBe(0);
    expect(mockSynthesizeCoordinatorChildSkill).not.toHaveBeenCalled();
    const output = stdoutSpy.mock.calls.map(([chunk]) => String(chunk)).join('');
    expect(output).toContain('SUPERWARDEN PLAN');
    expect(output).toContain('TASKS');
    expect(output).toContain('authz');
    expect(output).toContain('Authorization');
    expect(output).toContain('Find authorization issues in changed TypeScript code.');
    expect(output).toContain('SOURCES');
    expect(output).toContain('GitHub Actions security hardening');
    expect(output).toContain('MISSING INPUTS');
    expect(output).toContain('Whether fork pull requests run with repository secrets.');
    expect(output.trim().startsWith('{')).toBe(false);
    expect(output).not.toContain('"tasks"');
    expect(output).not.toContain('"version"');
    const stderr = stderrSpy.mock.calls.map(([line]) => String(line)).join('\n');
    expect(stderr).toContain('Loaded plan with 1 task');
    expect(stderr).not.toContain('TRY IT');
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('reports Ctrl-C as interrupted instead of a synthesis failure', async () => {
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockSynthesizeCoordinatorPlan.mockResolvedValue({
      source: 'generated',
      cachePath: join(tempDir, '.warden', 'superwarden', 'security-review', 'cache', 'hash.json'),
      plan: {
        version: 1,
        skill: 'security-review',
        sourceHash: 'hash',
        coordinatorVersion: '1',
        synthesis: {
          phases: [{ id: 'collect-inputs', status: 'generated' }],
        },
        tasks: [{
          id: 'authz',
          title: 'Authorization',
          scope: 'Find authorization issues.',
          prompt: 'Review authorization issues.',
          evidenceRequirements: ['Trace the permission boundary.'],
          outOfScope: [],
        }],
      },
    });
    mockSynthesizeCoordinatorChildSkill.mockRejectedValueOnce(
      new Error('Child skill synthesis failed for authz: Superwarden agent returned no result'),
    );
    const controller = new AbortController();
    controller.abort();

    const reporter = new Reporter(detectOutputMode(false), Verbosity.Normal);
    const exitCode = await runSynthesize(
      createOptions({ skill: 'security-review' }),
      reporter,
      { abortController: controller, interrupted: { value: true } },
    );

    expect(exitCode).toBe(130);
    const output = stderrSpy.mock.calls.map(([line]) => String(line)).join('\n');
    expect(output).toContain('Interrupted');
    expect(output).not.toContain('Child skill synthesis failed');
    stderrSpy.mockRestore();
  });

  it('synthesizes a local skill that is not configured in warden.toml', async () => {
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    unlinkSync(join(tempDir, 'warden.toml'));
    writeLocalSkill(tempDir, 'ad-hoc-security');
    mockSynthesizeCoordinatorPlan.mockResolvedValue({
      source: 'generated',
      cachePath: join(tempDir, '.warden', 'superwarden', 'ad-hoc-security', 'cache', 'hash.json'),
      plan: {
        version: 1,
        skill: 'ad-hoc-security',
        sourceHash: 'hash',
        coordinatorVersion: '1',
        synthesis: {
          phases: [{ id: 'collect-inputs', status: 'generated' }],
        },
        tasks: [{
          id: 'authz',
          title: 'Authorization',
          scope: 'Find authorization issues.',
          prompt: 'Review authorization issues.',
          evidenceRequirements: ['Trace the permission boundary.'],
          outOfScope: [],
        }],
      },
    });

    const reporter = new Reporter(detectOutputMode(false), Verbosity.Normal);
    const exitCode = await runSynthesize(
      createOptions({ skill: 'ad-hoc-security' }),
      reporter,
    );

    expect(exitCode).toBe(0);
    expect(mockSynthesizeCoordinatorPlan).toHaveBeenCalledWith(expect.objectContaining({
      skill: expect.objectContaining({ name: 'ad-hoc-security' }),
      model: undefined,
      cacheDir: expect.stringContaining(join('.warden', 'superwarden', 'ad-hoc-security', 'cache')),
    }));
    stderrSpy.mockRestore();
  });

  it('creates a missing Superwarden skill from an initial prompt', async () => {
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockSynthesizeCoordinatorPlan.mockResolvedValue({
      source: 'generated',
      cachePath: join(tempDir, '.warden', 'superwarden', 'brand-new-security', 'cache', 'hash.json'),
      plan: {
        version: 1,
        skill: 'brand-new-security',
        sourceHash: 'hash',
        coordinatorVersion: '1',
        synthesis: {
          phases: [{ id: 'collect-inputs', status: 'generated' }],
        },
        tasks: [{
          id: 'secrets',
          title: 'Secret handling',
          scope: 'Find secret exposure issues.',
          prompt: 'Review secret handling issues.',
          evidenceRequirements: ['Trace where the secret can be exposed.'],
          outOfScope: [],
        }],
      },
    });

    const reporter = new Reporter(detectOutputMode(false), Verbosity.Normal);
    const exitCode = await runSynthesize(
      createOptions({
        skill: 'brand-new-security',
        prompt: 'Review changed code for secret exposure.',
        description: 'Review secret exposure.',
      }),
      reporter,
    );

    expect(exitCode).toBe(0);
    const root = join(tempDir, '.warden', 'superwarden', 'brand-new-security');
    expect(readFileSync(join(root, 'SKILL.md'), 'utf-8')).toContain('Review changed code for secret exposure.');
    expect(readFileSync(join(root, 'warden.yaml'), 'utf-8')).toContain('kind: superwarden-skill');
    expect(readFileSync(join(root, 'SPEC.md'), 'utf-8')).toContain('Superwarden skill');
    expect(mockSynthesizeCoordinatorPlan).toHaveBeenCalledWith(expect.objectContaining({
      skill: expect.objectContaining({ name: 'brand-new-security' }),
      cacheDir: expect.stringContaining(join('.warden', 'superwarden', 'brand-new-security', 'cache')),
    }));
    expect(existsSync(join(root, 'cache', 'hash', 'skills', 'secrets', 'SKILL.md'))).toBe(true);
    const stderr = stderrSpy.mock.calls.map(([line]) => String(line)).join('\n');
    expect(stderr).toContain('NEW SUPERWARDEN SKILL');
    expect(stderr).toContain('Created brand-new-security');
    expect(stderr).toMatch(/Source\s+\.warden\/superwarden\/brand-new-security/);
    expect(stderr).toMatch(/Prompt\s+40 chars/);
    expect(stderr).not.toContain('Metadata ');
    expect(stderr.search(/Source\s+\.warden\/superwarden\/brand-new-security/)).toBeLessThan(
      stderr.search(/Prompt\s+40 chars/),
    );
    stderrSpy.mockRestore();
  });

  it('creates a missing Superwarden skill from --prompt @file shorthand', async () => {
    const stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    writeFileSync(join(tempDir, 'prompt.md'), 'Review changed code for insecure secret storage.\n', 'utf-8');
    mockSynthesizeCoordinatorPlan.mockResolvedValue({
      source: 'generated',
      cachePath: join(tempDir, '.warden', 'superwarden', 'file-backed-security', 'cache', 'hash.json'),
      plan: {
        version: 1,
        skill: 'file-backed-security',
        sourceHash: 'hash',
        coordinatorVersion: '1',
        synthesis: {
          phases: [{ id: 'collect-inputs', status: 'generated' }],
        },
        tasks: [{
          id: 'secrets',
          title: 'Secret handling',
          scope: 'Find secret storage issues.',
          prompt: 'Review secret storage issues.',
          evidenceRequirements: ['Trace where the secret is persisted.'],
          outOfScope: [],
        }],
      },
    });

    const reporter = new Reporter(detectOutputMode(false), Verbosity.Normal);
    const exitCode = await runSynthesize(
      createOptions({
        skill: 'file-backed-security',
        prompt: '@prompt.md',
      }),
      reporter,
    );

    expect(exitCode).toBe(0);
    const root = join(tempDir, '.warden', 'superwarden', 'file-backed-security');
    expect(readFileSync(join(root, 'SKILL.md'), 'utf-8')).toContain('Review changed code for insecure secret storage.');
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Created file-backed-security'));
    stderrSpy.mockRestore();
  });
});
