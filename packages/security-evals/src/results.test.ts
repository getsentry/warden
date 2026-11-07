import { describe, expect, it } from 'vitest';
import { createResults, recordShardRun, renderMarkdown, serializeResults, summarize } from './results.js';
import { recordRepeats, testConfig, testEntry, testUsage } from './testing.js';

describe('summarize', () => {
  it('reports recall, unique catches, and clean flags', () => {
    const results = createResults([
      testEntry('authz'), testEntry('dos'), testEntry('both'), testEntry('fixed', { kind: 'clean' }),
    ]);
    recordRepeats(results, 'security-review', { authz: 0, dos: 0, both: 2, fixed: 0 }, 2);
    recordRepeats(results, 'wrdn-authz', { authz: 1, dos: 0, both: 1, fixed: 1 }, 1);
    recordRepeats(results, 'wrdn-dos-review', { authz: 1, dos: 1, both: 0, fixed: 0 }, 1);

    const summary = summarize(results);

    expect(summary['security-review']).toMatchObject({ found: 1, recall: 1 / 3, onlyThisLane: [], errors: 0 });
    expect(summary['wrdn-authz']).toMatchObject({ found: 2, onlyThisLane: [], cleanFlagged: { hits: 1, runs: 1 } });
    expect(summary['wrdn-dos-review']).toMatchObject({ onlyThisLane: ['dos'] });
    expect(results.lanes['security-review']).toMatchObject({ runs: 2, usage: { costUSD: 2, judgeCostUSD: 0.02 } });
  });

  it('records a failed pass as errors on its entries, not misses', () => {
    const results = createResults([testEntry('authz')]);
    recordShardRun(results, {
      skill: 'wrdn-authz', config: testConfig(), usage: testUsage(3), error: 'boom', hits: new Map(), errors: ['authz'],
    });
    expect(results.lanes['wrdn-authz']).toMatchObject({ runs: 0, failedRuns: 1, usage: { costUSD: 3 } });
    expect(results.entries['authz']!.lanes['wrdn-authz']).toEqual({ hits: 0, runs: 0, errors: 1 });
    expect(summarize(results)['wrdn-authz']).toMatchObject({ bugEntries: 0, recall: null, errors: 1 });
  });
});

describe('output', () => {
  it('leads with verdicts and never prints a bare unique-catch count', () => {
    const results = createResults([testEntry('authz')]);
    recordRepeats(results, 'security-review', { authz: 0 }, 1);
    recordRepeats(results, 'wrdn-authz', { authz: 1 }, 1);
    results.summary = summarize(results);

    const markdown = renderMarkdown(results);
    expect(markdown).toContain('- **wrdn-authz: insufficient-evidence**.');
    expect(markdown).toContain('| wrdn-authz | 1.00 | 1/1 | 1 | 0/0 | 0 | 1.00 | 10 | 1 |');
    expect(markdown).toContain('| authz | bug | 0/1 | 1/1 |');
    expect(markdown).not.toContain('missed by security-review');
  });

  it('marks errored cells', () => {
    const results = createResults([testEntry('authz')]);
    recordShardRun(results, {
      skill: 'security-review', config: testConfig(), usage: testUsage(), error: 'boom', hits: new Map(), errors: ['authz'],
    });
    results.summary = summarize(results);
    expect(renderMarkdown(results)).toContain('| authz | bug | 0/0 (1 err) |');
  });

  it('serializes with sorted keys', () => {
    const results = createResults([testEntry('b'), testEntry('a')]);
    expect(Object.keys(JSON.parse(serializeResults(results)).entries)).toEqual(['a', 'b']);
  });
});
