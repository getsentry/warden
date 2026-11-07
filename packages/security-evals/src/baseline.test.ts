import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadResultsFile, mergeBaseline, updateBaseline } from './baseline.js';
import { DEFAULT_BASELINE } from './options.js';
import { createResults, recordShardRun, serializeResults } from './results.js';
import { recordRepeats, testConfig, testEntry, testUsage } from './testing.js';

const current = testConfig();

describe('mergeBaseline', () => {
  it('adds matching lanes the run skipped, limited to the selected entries', () => {
    const baseline = createResults([testEntry('authz'), testEntry('dos')]);
    recordRepeats(baseline, 'security-review', { authz: 1, dos: 0 }, 1);

    const results = createResults([testEntry('authz')]);
    recordRepeats(results, 'wrdn-authz', { authz: 1 }, 1);
    const warnings = mergeBaseline(results, baseline, ['wrdn-authz'], () => current);

    expect(warnings).toEqual([]);
    expect(results.lanes['security-review']?.fromBaseline).toBe(true);
    expect(results.entries['authz']!.lanes).toEqual({
      'security-review': { hits: 1, runs: 1, errors: 0 },
      'wrdn-authz': { hits: 1, runs: 1, errors: 0 },
    });
  });

  it('drops a lane recorded with another model, warden version, or skill ref, with a warning', () => {
    const baseline = createResults([testEntry('authz')]);
    recordRepeats(baseline, 'security-review', { authz: 1 }, 1, testConfig({ wardenVersion: '0.9.0' }));
    recordRepeats(baseline, 'wrdn-pii', { authz: 1 }, 1, testConfig({ skillRef: 'getsentry/warden-skills@old' }));

    const results = createResults([testEntry('authz')]);
    const warnings = mergeBaseline(results, baseline, [], () => current);

    expect(warnings).toEqual([
      'Dropped baseline lane security-review: wardenVersion 0.9.0 != 1.0.0',
      'Dropped baseline lane wrdn-pii: skillRef getsentry/warden-skills@old != builtin',
    ]);
    expect(results.lanes).toEqual({});
    expect(results.entries['authz']!.lanes).toEqual({});
  });

  it('ignores tallies recorded at a different ref', () => {
    const baseline = createResults([testEntry('authz', { ref: 'b'.repeat(40) })]);
    recordRepeats(baseline, 'security-review', { authz: 1 }, 1);

    const results = createResults([testEntry('authz')]);
    mergeBaseline(results, baseline, [], () => current);
    expect(results.entries['authz']!.lanes).toEqual({});
  });
});

describe('updateBaseline', () => {
  it('replaces tallies for entries the run covered and keeps the rest', () => {
    const baseline = createResults([testEntry('authz'), testEntry('dos')]);
    recordRepeats(baseline, 'security-review', { authz: 0, dos: 1 }, 3);

    const run = createResults([testEntry('authz')]);
    recordRepeats(run, 'security-review', { authz: 3 }, 3);
    updateBaseline(baseline, run);

    expect(baseline.entries['authz']!.lanes['security-review']).toEqual({ hits: 3, runs: 3, errors: 0 });
    expect(baseline.entries['dos']!.lanes['security-review']).toEqual({ hits: 1, runs: 3, errors: 0 });
    expect(baseline.lanes['security-review']).toMatchObject({ runs: 6 });
  });

  it('starts a lane over when its config changed', () => {
    const baseline = createResults([testEntry('authz'), testEntry('dos')]);
    recordRepeats(baseline, 'security-review', { authz: 0, dos: 1 }, 3, testConfig({ model: 'old' }));

    const run = createResults([testEntry('authz')]);
    recordRepeats(run, 'security-review', { authz: 3 }, 3);
    updateBaseline(baseline, run);

    expect(baseline.lanes['security-review']).toMatchObject({ runs: 3, config: { model: 'm' } });
    expect(baseline.entries['dos']!.lanes).toEqual({});
  });

  it('skips lanes the run copied from the baseline', () => {
    const baseline = createResults([testEntry('authz')]);
    const run = createResults([testEntry('authz')]);
    recordRepeats(run, 'security-review', { authz: 1 }, 1);
    run.lanes['security-review']!.fromBaseline = true;
    expect(updateBaseline(baseline, run).lanes).toEqual({});
  });

  it('refuses results with errored entries', () => {
    const run = createResults([testEntry('authz')]);
    recordShardRun(run, {
      skill: 'wrdn-authz', config: current, usage: testUsage(), error: 'boom', hits: new Map(), errors: ['authz'],
    });
    expect(() => updateBaseline(createResults([]), run)).toThrow('1 errored entry runs');
  });
});

describe('loadResultsFile', () => {
  it('round-trips a results file, keeping which lanes came from the baseline', () => {
    const dir = mkdtempSync(join(tmpdir(), 'security-evals-results-'));
    try {
      const results = createResults([testEntry('authz')]);
      recordRepeats(results, 'security-review', { authz: 1 }, 1);
      results.lanes['security-review']!.fromBaseline = true;
      writeFileSync(join(dir, 'results.json'), serializeResults(results));

      const loaded = loadResultsFile(join(dir, 'results.json'));
      expect(loaded.lanes['security-review']?.fromBaseline).toBe(true);
      expect(loaded.entries['authz']!.lanes['security-review']).toEqual({ hits: 1, runs: 1, errors: 0 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('loads the committed baseline', () => {
    expect(() => loadResultsFile(DEFAULT_BASELINE)).not.toThrow();
  });
});
