import { describe, it, expect } from 'vitest';
import { processTaskResults } from './main.js';
import type { SkillReport } from '../types/index.js';

function makeReport(overrides: Partial<SkillReport> = {}): SkillReport {
  return {
    skill: 'skill-a',
    summary: 'ok',
    findings: [],
    ...overrides,
  };
}

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
