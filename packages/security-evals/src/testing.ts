import type { SuiteEntry } from './entries.js';
import type { LaneConfig } from './options.js';
import { recordShardRun, type LaneUsage, type SuiteResults } from './results.js';

/** Test fixtures shared by the results, verdict, and baseline tests. */
export const testConfig = (overrides: Partial<LaneConfig> = {}): LaneConfig => ({
  runtime: 'pi',
  model: 'm',
  effort: 'high',
  auxiliaryModel: 'a',
  auxiliaryEffort: 'high',
  maxTurns: 100,
  judgeModel: 'j',
  wardenVersion: '1.0.0',
  skillRef: 'builtin',
  ...overrides,
});

export const testUsage = (costUSD = 1): LaneUsage => ({
  inputTokens: 10, outputTokens: 1, cacheReadInputTokens: 5, costUSD, judgeCostUSD: 0.01,
});

export function testEntry(id: string, overrides: Partial<SuiteEntry> = {}): SuiteEntry {
  return {
    id,
    source: id.includes('/') ? 'case' : 'corpus',
    kind: 'bug',
    repository: 'getsentry/sentry',
    ref: 'a'.repeat(40),
    targets: ['x.py'],
    summary: id,
    ...overrides,
  };
}

/** Record `repeats` passes of one lane, hitting each entry in the first `hits[id]` passes. */
export function recordRepeats(
  results: SuiteResults,
  skill: string,
  hits: Record<string, number>,
  repeats: number,
  config: LaneConfig = testConfig(),
): void {
  for (let pass = 0; pass < repeats; pass++) {
    recordShardRun(results, {
      skill,
      config,
      usage: testUsage(),
      hits: new Map(Object.entries(hits).map(([id, count]) => [id, pass < count])),
      errors: [],
    });
  }
}
