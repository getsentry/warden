import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { LaneConfig } from './options.js';
import { summarize, type LaneResult, type LaneUsage, type SuiteResults } from './results.js';

const TallySchema = z.object({ hits: z.number().int(), runs: z.number().int(), errors: z.number().int() });

const LaneConfigSchema = z.object({
  runtime: z.string(),
  model: z.string(),
  effort: z.string(),
  auxiliaryModel: z.string(),
  auxiliaryEffort: z.string(),
  maxTurns: z.number(),
  judgeModel: z.string(),
  wardenVersion: z.string(),
  skillRef: z.string(),
});

const UsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadInputTokens: z.number(),
  costUSD: z.number(),
  judgeCostUSD: z.number(),
});

/** A results file. Summaries are recomputed on load, so they are not checked. */
const ResultsFileSchema = z.object({
  version: z.literal(2),
  lanes: z.record(z.string(), z.object({
    config: LaneConfigSchema,
    usage: UsageSchema,
    runs: z.number().int(),
    failedRuns: z.number().int(),
    fromBaseline: z.literal(true).optional(),
  })),
  entries: z.record(z.string(), z.object({
    source: z.enum(['corpus', 'case']),
    kind: z.enum(['bug', 'clean']),
    repository: z.string(),
    ref: z.string(),
    targets: z.array(z.string()),
    lanes: z.record(z.string(), TallySchema),
  })),
});

/** Read and check a results file written by the suite. */
export function loadResultsFile(path: string): SuiteResults {
  const parsed = ResultsFileSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
  if (!parsed.success) {
    throw new Error(`${path}: ${z.prettifyError(parsed.error)}`);
  }
  const results: SuiteResults = { ...parsed.data, summary: {} };
  results.summary = summarize(results);
  return results;
}

/** Fields where two lane configs differ. Empty means one can stand in for the other. */
function configMismatch(recorded: LaneConfig, expected: LaneConfig): string[] {
  return (Object.keys(expected) as (keyof LaneConfig)[])
    .filter((key) => recorded[key] !== expected[key])
    .map((key) => `${key} ${String(recorded[key])} != ${String(expected[key])}`);
}

/**
 * Copy lanes this run skipped from a baseline, limited to the selected
 * entries, so a candidate lane compares without rerunning the rest. A lane
 * recorded with a different config is dropped, never compared. Returns one
 * warning per dropped lane.
 */
export function mergeBaseline(
  results: SuiteResults,
  baseline: SuiteResults,
  ranSkills: string[],
  expectedConfig: (skill: string) => LaneConfig,
): string[] {
  const warnings: string[] = [];
  for (const [skill, lane] of Object.entries(baseline.lanes)) {
    if (ranSkills.includes(skill)) continue;
    const mismatch = configMismatch(lane.config, expectedConfig(skill));
    if (mismatch.length > 0) {
      warnings.push(`Dropped baseline lane ${skill}: ${mismatch.join('; ')}`);
      continue;
    }
    results.lanes[skill] = { ...lane, fromBaseline: true };
    for (const [entryId, entry] of Object.entries(results.entries)) {
      const recorded = baseline.entries[entryId];
      const tally = recorded?.lanes[skill];
      if (tally && recorded.ref === entry.ref) entry.lanes[skill] = tally;
    }
  }
  return warnings;
}

/**
 * Fold the lanes a run executed into the baseline. Entry tallies are replaced
 * per entry, so a filtered run only touches what it ran. A lane whose config
 * changed is replaced outright. Lane usage and run counts add up across the
 * runs that fed it. Refuses results with errored entries.
 */
export function updateBaseline(baseline: SuiteResults, run: SuiteResults): SuiteResults {
  const ran = Object.entries(run.lanes).filter(([, lane]) => !lane.fromBaseline);
  for (const [skill] of ran) {
    const errors = Object.values(run.entries).reduce((sum, entry) => sum + (entry.lanes[skill]?.errors ?? 0), 0);
    if (errors > 0) {
      throw new Error(`${skill} has ${errors} errored entry runs; rerun them before updating the baseline`);
    }
  }

  for (const [skill, lane] of ran) {
    let previous: LaneResult | undefined = baseline.lanes[skill];
    if (previous && configMismatch(previous.config, lane.config).length > 0) {
      for (const entry of Object.values(baseline.entries)) {
        entry.lanes = Object.fromEntries(Object.entries(entry.lanes).filter(([name]) => name !== skill));
      }
      previous = undefined;
    }
    const usage = { ...lane.usage };
    for (const key of Object.keys(usage) as (keyof LaneUsage)[]) usage[key] += previous?.usage[key] ?? 0;
    baseline.lanes[skill] = {
      config: lane.config,
      usage,
      runs: lane.runs + (previous?.runs ?? 0),
      failedRuns: lane.failedRuns + (previous?.failedRuns ?? 0),
    };

    for (const [entryId, entry] of Object.entries(run.entries)) {
      const tally = entry.lanes[skill];
      if (!tally) continue;
      const recorded = baseline.entries[entryId];
      // An entry whose ref moved starts over: its old tallies describe other code.
      const target = recorded && recorded.ref === entry.ref ? recorded : { ...entry, lanes: {} };
      target.lanes[skill] = tally;
      baseline.entries[entryId] = target;
    }
  }
  baseline.summary = summarize(baseline);
  return baseline;
}
