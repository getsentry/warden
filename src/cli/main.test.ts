import { describe, it, expect } from 'vitest';
import {
  mergeSkillRunnerOptions,
  processTaskResults,
  resolveCliDefaultFastModel,
  resolveCliDefaultModel,
  resolveCliLogModel,
} from './main.js';
import { MODEL_DEFAULT_SENTINEL } from './output/index.js';
import type { SkillReport } from '../types/index.js';

function makeReport(overrides: Partial<SkillReport> = {}): SkillReport {
  return {
    skill: 'skill-a',
    summary: 'ok',
    findings: [],
    ...overrides,
  };
}

describe('mergeSkillRunnerOptions', () => {
  it('preserves global defaults when per-skill options are undefined', () => {
    const merged = mergeSkillRunnerOptions(
      {
        apiKey: 'test-key',
        model: 'global-agent-model',
        runtime: 'claude',
        fastModelModel: 'global-fast-model',
        maxTurns: 20,
        auxiliaryMaxRetries: 4,
      },
      {
        model: undefined,
        runtime: undefined,
        fastModelModel: undefined,
        maxTurns: undefined,
        auxiliaryMaxRetries: undefined,
      }
    );

    expect(merged).toEqual({
      apiKey: 'test-key',
      model: 'global-agent-model',
      runtime: 'claude',
      fastModelModel: 'global-fast-model',
      maxTurns: 20,
      auxiliaryMaxRetries: 4,
    });
  });

  it('uses defined per-skill options over global defaults', () => {
    const merged = mergeSkillRunnerOptions(
      {
        apiKey: 'test-key',
        model: 'global-agent-model',
        runtime: 'claude',
        fastModelModel: 'global-fast-model',
        maxTurns: 20,
        auxiliaryMaxRetries: 4,
      },
      {
        model: 'skill-agent-model',
        fastModelModel: 'skill-fast-model',
        maxTurns: 8,
        auxiliaryMaxRetries: 2,
      }
    );

    expect(merged).toEqual({
      apiKey: 'test-key',
      model: 'skill-agent-model',
      runtime: 'claude',
      fastModelModel: 'skill-fast-model',
      maxTurns: 8,
      auxiliaryMaxRetries: 2,
    });
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

  it('normalizes empty fast-model defaults', () => {
    const model = resolveCliDefaultFastModel({
      defaults: {
        fastModel: { model: '' },
      },
    });

    expect(model).toBeUndefined();
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
