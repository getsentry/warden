import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it, expect, vi } from 'vitest';
import type { CLIOptions } from './args.js';
import {
  createSkillTasks,
  findInvalidPiModelSelector,
  formatSkillSource,
  mergeSkillRunnerOptions,
  processTaskResults,
  resolveInvocationCwd,
  resolveCliDefaultAuxiliaryModel,
  resolveCliDefaultSynthesisModel,
  resolveCliDefaultModel,
  resolveCliLogModel,
  type RunSkillSpec,
} from './main.js';
import { MODEL_DEFAULT_SENTINEL, Reporter, Verbosity } from './output/index.js';
import type { SkillReport } from '../types/index.js';

const tempDirs: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

function makeReport(overrides: Partial<SkillReport> = {}): SkillReport {
  return {
    skill: 'skill-a',
    summary: 'ok',
    findings: [],
    ...overrides,
  };
}

function createTestReporter(): Reporter {
  return new Reporter({ isTTY: false, supportsColor: false, columns: 80 }, Verbosity.Quiet);
}

function createVisibleTestReporter(): Reporter {
  return new Reporter({ isTTY: true, supportsColor: false, columns: 80 }, Verbosity.Normal);
}

function createCliOptions(overrides: Partial<CLIOptions> = {}): CLIOptions {
  return {
    json: false,
    help: false,
    quiet: true,
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
    regenerate: false,
    ...overrides,
  };
}

describe('createSkillTasks', () => {
  it('resolves explicit built-in skills from the package after repo-local paths', async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'warden-main-'));
    tempDirs.push(repoRoot);

    const spec: RunSkillSpec = {
      name: 'security-review',
      skill: 'security-review',
      context: {} as RunSkillSpec['context'],
      runnerOptions: {},
    };

    const [task] = await createSkillTasks({
      specs: [spec],
      repoPath: repoRoot,
      options: createCliOptions(),
      parallel: 1,
      reporter: createTestReporter(),
    });

    const skill = await task!.resolveSkill();
    expect(skill.name).toBe('security-review');
    expect(skill.rootDir).toContain('src/builtin-skills/security-review');
  });

  it('shows a built-in source label instead of the package cache path', async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'warden-main-repo-'));
    const packageRoot = mkdtempSync(join(tmpdir(), 'warden-main-package-'));
    tempDirs.push(repoRoot, packageRoot);

    const rootDir = join(
      packageRoot,
      'node_modules',
      '@sentry',
      'warden',
      'src',
      'builtin-skills',
      'security-review'
    );
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'SKILL.md'), `---
name: security-review
description: Review security issues.
---

Review security issues.
`, 'utf-8');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const spec: RunSkillSpec = {
      name: rootDir,
      skill: rootDir,
      context: {} as RunSkillSpec['context'],
      runnerOptions: {},
    };

    await createSkillTasks({
      specs: [spec],
      repoPath: repoRoot,
      options: createCliOptions({ quiet: false }),
      parallel: 1,
      reporter: createVisibleTestReporter(),
    });

    const output = errorSpy.mock.calls.map(([message]) => String(message)).join('\n');
    expect(output).toContain('  Source   built-in (@sentry/warden)');
    expect(output).not.toContain(rootDir);
  });

  it('shows the built-in source label for monorepo package skill paths', async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'warden-main-repo-'));
    tempDirs.push(repoRoot);

    const rootDir = join(
      repoRoot,
      'packages',
      'warden',
      'src',
      'builtin-skills',
      'security-review'
    );
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'SKILL.md'), `---
name: security-review
description: Review security issues.
---

Review security issues.
`, 'utf-8');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const spec: RunSkillSpec = {
      name: rootDir,
      skill: rootDir,
      context: {} as RunSkillSpec['context'],
      runnerOptions: {},
    };

    await createSkillTasks({
      specs: [spec],
      repoPath: repoRoot,
      options: createCliOptions({ quiet: false }),
      parallel: 1,
      reporter: createVisibleTestReporter(),
    });

    const output = errorSpy.mock.calls.map(([message]) => String(message)).join('\n');
    expect(output).toContain('  Source   built-in (@sentry/warden)');
    expect(output).not.toContain(rootDir);
  });

  it('reports missing generated artifacts for explicit generated skill paths', async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'warden-main-'));
    tempDirs.push(repoRoot);
    const rootDir = join(repoRoot, 'skills', 'security');
    mkdirSync(rootDir, { recursive: true });
    writeFileSync(join(rootDir, 'warden.yaml'), `version: 1
kind: generated-skill
name: security
prompt: |-
  Find security issues.
`, 'utf-8');

    const spec: RunSkillSpec = {
      name: './skills/security',
      skill: './skills/security',
      context: {} as RunSkillSpec['context'],
      runnerOptions: {},
    };

    await expect(createSkillTasks({
      specs: [spec],
      repoPath: repoRoot,
      options: createCliOptions(),
      parallel: 1,
      reporter: createTestReporter(),
    })).rejects.toThrow(
      'Generated skill ./skills/security is missing generated artifacts. Run "warden build ./skills/security" first.',
    );
  });
});

describe('formatSkillSource', () => {
  it('formats repo-local skill sources relative to the repo root', () => {
    expect(formatSkillSource(
      { rootDir: '/repo/.agents/skills/security-review' },
      '/repo'
    )).toBe('.agents/skills/security-review');
  });

  it('keeps external custom skill sources as absolute paths', () => {
    expect(formatSkillSource(
      { rootDir: '/external/skills/security-review' },
      '/repo'
    )).toBe('/external/skills/security-review');
  });

  it('keeps the repo root source path instead of rendering an empty source', () => {
    expect(formatSkillSource(
      { rootDir: '/repo' },
      '/repo'
    )).toBe('/repo');
  });
});

describe('mergeSkillRunnerOptions', () => {
  it('preserves global defaults when per-skill options are undefined', () => {
    const merged = mergeSkillRunnerOptions(
      {
        apiKey: 'test-key',
        model: 'global-agent-model',
        runtime: 'claude',
        auxiliaryModel: 'global-aux-model',
        synthesisModel: 'global-synth-model',
        maxTurns: 20,
        reasoningEffort: 'medium',
        auxiliaryMaxRetries: 4,
      },
      {
        model: undefined,
        runtime: undefined,
        auxiliaryModel: undefined,
        synthesisModel: undefined,
        maxTurns: undefined,
        reasoningEffort: undefined,
        auxiliaryMaxRetries: undefined,
      }
    );

    expect(merged).toEqual({
      apiKey: 'test-key',
      model: 'global-agent-model',
      runtime: 'claude',
      auxiliaryModel: 'global-aux-model',
      synthesisModel: 'global-synth-model',
      maxTurns: 20,
      reasoningEffort: 'medium',
      auxiliaryMaxRetries: 4,
    });
  });

  it('uses defined per-skill options over global defaults', () => {
    const merged = mergeSkillRunnerOptions(
      {
        apiKey: 'test-key',
        model: 'global-agent-model',
        runtime: 'claude',
        auxiliaryModel: 'global-aux-model',
        synthesisModel: 'global-synth-model',
        maxTurns: 20,
        reasoningEffort: 'medium',
        auxiliaryMaxRetries: 4,
      },
      {
        model: 'skill-agent-model',
        auxiliaryModel: 'skill-aux-model',
        synthesisModel: 'skill-synth-model',
        maxTurns: 8,
        reasoningEffort: 'low',
        auxiliaryMaxRetries: 2,
      }
    );

    expect(merged).toEqual({
      apiKey: 'test-key',
      model: 'skill-agent-model',
      runtime: 'claude',
      auxiliaryModel: 'skill-aux-model',
      synthesisModel: 'skill-synth-model',
      maxTurns: 8,
      reasoningEffort: 'low',
      auxiliaryMaxRetries: 2,
    });
  });
});

describe('findInvalidPiModelSelector', () => {
  it('flags bare model names when the runner uses Pi', () => {
    const invalid = findInvalidPiModelSelector([
      {
        name: 'security-review',
        runnerOptions: {
          runtime: 'pi',
          model: 'claude-sonnet-4-5',
        },
      },
    ]);

    expect(invalid).toEqual({
      specName: 'security-review',
      option: 'model',
      model: 'claude-sonnet-4-5',
    });
  });

  it('allows bare model names when the runner uses Claude', () => {
    const invalid = findInvalidPiModelSelector([
      {
        name: 'security-review',
        runnerOptions: {
          runtime: 'claude',
          model: 'claude-sonnet-4-5',
        },
      },
    ]);

    expect(invalid).toBeUndefined();
  });
});

describe('resolveCliDefaultModel', () => {
  it('normalizes empty config defaults before falling through', () => {
    const model = resolveCliDefaultModel(
      {
        defaults: {
          agent: { model: '' },
          model: '',
        },
      },
      'cli-model'
    );

    expect(model).toBe('cli-model');
  });

  it('normalizes empty auxiliary defaults', () => {
    const model = resolveCliDefaultAuxiliaryModel({
      defaults: {
        auxiliary: { model: '' },
      },
    });

    expect(model).toBeUndefined();
  });

  it('prefers synthesis defaults and falls back to auxiliary defaults', () => {
    const explicit = resolveCliDefaultSynthesisModel({
      defaults: {
        synthesis: { model: 'synth-model' },
        auxiliary: { model: 'aux-model' },
      },
    });
    const fallback = resolveCliDefaultSynthesisModel({
      defaults: {
        auxiliary: { model: 'aux-model' },
      },
    });

    expect(explicit).toBe('synth-model');
    expect(fallback).toBe('aux-model');
  });
});

describe('resolveCliLogModel', () => {
  it('normalizes empty config defaults before recording the run model', () => {
    const model = resolveCliLogModel(
      {
        defaults: {
          agent: { model: '' },
          model: 'legacy-model',
        },
      },
      'cli-model'
    );

    expect(model).toBe('legacy-model');
  });

  it('uses the log sentinel when no explicit model is configured', () => {
    const model = resolveCliLogModel({
      defaults: {
        agent: { model: '' },
        model: '',
      },
    });

    expect(model).toBe(MODEL_DEFAULT_SENTINEL);
  });
});

describe('processTaskResults', () => {
  it('marks the run as failed when any report carries an error', () => {
    const results = [
      {
        name: 'task-a',
        report: makeReport({
          skill: 'task-a',
          findings: [],
          error: { code: 'auth_failed' as const, message: 'bad key' },
        }),
        failOn: 'high' as const,
      },
    ];

    const processed = processTaskResults(results, undefined);

    expect(processed.hasFailure).toBe(true);
    expect(processed.failureReasons[0]).toContain('auth_failed');
    expect(processed.failureReasons[0]).toContain('bad key');
  });

  it('fails on error regardless of failOn threshold', () => {
    const results = [
      {
        name: 'task-a',
        report: makeReport({
          error: { code: 'all_hunks_failed' as const, message: 'all chunks failed' },
        }),
        // No failOn set; normal findings wouldn't fail the run.
      },
    ];

    const processed = processTaskResults(results, undefined);

    expect(processed.hasFailure).toBe(true);
  });

  it('does not double-count: an errored report does not trigger findings-based failure', () => {
    // Hypothetical: findings slipped through despite an error. Exit reason
    // should reference the error, not the finding count.
    const results = [
      {
        name: 'task-a',
        report: makeReport({
          findings: [
            { id: 'F1', severity: 'high' as const, title: 'test', description: 'test' },
          ],
          error: { code: 'sdk_error' as const, message: 'SDK crashed mid-run' },
        }),
        failOn: 'high' as const,
      },
    ];

    const processed = processTaskResults(results, undefined);

    expect(processed.hasFailure).toBe(true);
    expect(processed.failureReasons).toHaveLength(1);
    expect(processed.failureReasons[0]).toContain('sdk_error');
  });

  it('applies failOn normally for reports without error', () => {
    const results = [
      {
        name: 'task-a',
        report: makeReport({
          findings: [
            { id: 'F1', severity: 'high' as const, title: 'sql injection', description: '' },
          ],
        }),
        failOn: 'high' as const,
      },
    ];

    const processed = processTaskResults(results, undefined);

    expect(processed.hasFailure).toBe(true);
    expect(processed.failureReasons[0]).toContain('1 high+ severity issue');
  });

  it('returns clean when all reports pass', () => {
    const results = [
      { name: 'task-a', report: makeReport({ findings: [] }), failOn: 'high' as const },
    ];

    const processed = processTaskResults(results, undefined);

    expect(processed.hasFailure).toBe(false);
    expect(processed.failureReasons).toEqual([]);
  });

  it('includes reports with errors in the reports array', () => {
    const errored = makeReport({
      skill: 'task-a',
      error: { code: 'auth_failed' as const, message: 'bad' },
    });
    const ok = makeReport({ skill: 'task-b' });
    const results = [
      { name: 'task-a', report: errored },
      { name: 'task-b', report: ok },
    ];

    const processed = processTaskResults(results, undefined);

    expect(processed.reports).toHaveLength(2);
    expect(processed.reports[0]!.error).toBeDefined();
  });
});

describe('resolveInvocationCwd', () => {
  it('uses the current working directory by default', () => {
    expect(resolveInvocationCwd('/repo', undefined)).toBe('/repo');
  });

  it('resolves a relative cwd override from the original working directory', () => {
    expect(resolveInvocationCwd('/launcher', '../repo')).toBe('/repo');
  });
});
