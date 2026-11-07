import { describe, expect, it } from 'vitest';
import type { SuiteEntry } from './entries.js';
import {
  createResults,
  mergeBaseline,
  recordShardRun,
  renderMarkdown,
  serializeResults,
  summarize,
  type LaneConfig,
  type LaneUsage,
} from './results.js';

const config: LaneConfig = {
  runtime: 'pi',
  model: 'm',
  effort: 'high',
  auxiliaryModel: 'a',
  auxiliaryEffort: 'high',
  maxTurns: 100,
  judgeModel: 'j',
};
const usage = (costUSD: number): LaneUsage => ({
  inputTokens: 10, outputTokens: 1, cacheReadInputTokens: 5, costUSD, judgeCostUSD: 0.01,
});

function entry(id: string, kind: SuiteEntry['kind'] = 'bug'): SuiteEntry {
  return { id, source: 'corpus', kind, repository: 'getsentry/sentry', ref: 'a', targets: ['x.py'], summary: id };
}

function record(results: ReturnType<typeof createResults>, skill: string, hits: Record<string, boolean>): void {
  recordShardRun(results, { skill, config, usage: usage(1), hits: new Map(Object.entries(hits)) });
}

describe('summarize', () => {
  it('reports recall, unique catches, misses by security-review, and clean flags', () => {
    const results = createResults([entry('authz'), entry('dos'), entry('both'), entry('fixed', 'clean')]);
    record(results, 'security-review', { authz: false, dos: false, both: true, fixed: false });
    record(results, 'security-review', { authz: false, dos: false, both: true, fixed: false });
    record(results, 'wrdn-authz', { authz: true, dos: false, both: true, fixed: true });
    record(results, 'wrdn-dos-review', { authz: true, dos: true, both: false, fixed: false });

    const summary = summarize(results);

    expect(summary['security-review']).toMatchObject({ found: 1, recall: 1 / 3, onlyThisLane: [] });
    expect(summary['wrdn-authz']).toMatchObject({
      found: 2,
      onlyThisLane: [],
      missedBySecurityReview: ['authz'],
      cleanFlagged: { hits: 1, runs: 1 },
    });
    expect(summary['wrdn-dos-review']).toMatchObject({
      onlyThisLane: ['dos'],
      missedBySecurityReview: ['authz', 'dos'],
    });
    expect(results.lanes['security-review']).toMatchObject({ runs: 2, usage: { costUSD: 2, judgeCostUSD: 0.02 } });
  });

  it('leaves entries out of a lane when its pass failed', () => {
    const results = createResults([entry('authz')]);
    recordShardRun(results, { skill: 'wrdn-authz', config, usage: usage(3) });
    expect(results.lanes['wrdn-authz']).toMatchObject({ runs: 0, failedRuns: 1, usage: { costUSD: 3 } });
    expect(summarize(results)['wrdn-authz']).toMatchObject({ bugEntries: 0, recall: null });
  });
});

describe('mergeBaseline', () => {
  it('adds lanes the run skipped, limited to the selected entries', () => {
    const baseline = createResults([entry('authz'), entry('dos')]);
    record(baseline, 'security-review', { authz: true, dos: false });
    record(baseline, 'wrdn-authz', { authz: false, dos: false });

    const results = createResults([entry('authz')]);
    record(results, 'wrdn-authz', { authz: true });
    mergeBaseline(results, baseline, ['wrdn-authz']);

    expect(Object.keys(results.entries)).toEqual(['authz']);
    expect(results.entries['authz']!.lanes).toEqual({
      'security-review': { hits: 1, runs: 1 },
      'wrdn-authz': { hits: 1, runs: 1 },
    });
  });
});

describe('output', () => {
  it('renders the lane table and the entry x lane table', () => {
    const results = createResults([entry('authz')]);
    record(results, 'security-review', { authz: false });
    record(results, 'wrdn-authz', { authz: true });
    results.summary = summarize(results);

    const markdown = renderMarkdown(results);
    expect(markdown).toContain('| wrdn-authz | 1.00 | 1/1 | 1 | 1 | 0/0 | 1.00 | 10 | 1 |');
    expect(markdown).toContain('| authz | bug | 0/1 | 1/1 |');
  });

  it('serializes with sorted keys', () => {
    const results = createResults([entry('b'), entry('a')]);
    expect(Object.keys(JSON.parse(serializeResults(results)).entries)).toEqual(['a', 'b']);
  });
});
