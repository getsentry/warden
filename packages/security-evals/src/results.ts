import type { SuiteEntry } from './entries.js';

/** How a lane ran. Baseline lanes keep the config they were recorded with. */
export interface LaneConfig {
  runtime: string;
  model: string;
  effort: string;
  auxiliaryModel: string;
  auxiliaryEffort: string;
  maxTurns: number;
  judgeModel: string;
  /** Pinned warden-skills ref for wrdn-* lanes. */
  skillsRef?: string;
  /** Where the lane came from when it was not run by this suite. */
  origin?: string;
}

export interface LaneUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  costUSD: number;
  judgeCostUSD: number;
}

export interface LaneResult {
  config: LaneConfig;
  usage: LaneUsage;
  /** Passes completed: one per shard and repeat, or one per imported benchmark run. */
  runs: number;
  /** Shard passes that errored and were not scored. */
  failedRuns: number;
}

/** Hits over completed repeats for one entry in one lane. */
export interface Tally {
  hits: number;
  runs: number;
}

export interface EntryResult {
  source: SuiteEntry['source'];
  kind: SuiteEntry['kind'];
  ref: string;
  targets: string[];
  lanes: Record<string, Tally>;
}

export interface LaneSummary {
  bugEntries: number;
  /** Mean hit rate over bug entries this lane ran. */
  recall: number | null;
  found: number;
  /** Bug entries this lane found and every other lane that ran them missed. */
  onlyThisLane: string[];
  /** Bug entries this lane found and security-review missed. The "do we need it" list. */
  missedBySecurityReview: string[];
  cleanFlagged: Tally;
}

export interface SuiteResults {
  version: 1;
  lanes: Record<string, LaneResult>;
  entries: Record<string, EntryResult>;
  summary: Record<string, LaneSummary>;
}

/** One skill's pass over one shard, scored per entry. */
export interface ShardRun {
  skill: string;
  config: LaneConfig;
  usage: LaneUsage;
  /** Undefined when the pass errored; the entries then get no repeat. */
  hits?: Map<string, boolean>;
}

const SECURITY_REVIEW = 'security-review';

/** Start an empty result set for the selected entries. */
export function createResults(entries: SuiteEntry[]): SuiteResults {
  return {
    version: 1,
    lanes: {},
    entries: Object.fromEntries(entries.map((entry) => [entry.id, {
      source: entry.source,
      kind: entry.kind,
      ref: entry.ref,
      targets: entry.targets,
      lanes: {},
    }])),
    summary: {},
  };
}

/** Fold one shard pass into the results. */
export function recordShardRun(results: SuiteResults, run: ShardRun): void {
  const lane = results.lanes[run.skill] ?? {
    config: run.config,
    usage: { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, costUSD: 0, judgeCostUSD: 0 },
    runs: 0,
    failedRuns: 0,
  };
  for (const key of Object.keys(lane.usage) as (keyof LaneUsage)[]) {
    lane.usage[key] += run.usage[key];
  }
  if (!run.hits) {
    lane.failedRuns += 1;
  } else {
    lane.runs += 1;
    for (const [entryId, hit] of run.hits) {
      const entry = results.entries[entryId];
      if (!entry) continue;
      const tally = entry.lanes[run.skill] ?? { hits: 0, runs: 0 };
      tally.runs += 1;
      tally.hits += hit ? 1 : 0;
      entry.lanes[run.skill] = tally;
    }
  }
  results.lanes[run.skill] = lane;
}

/**
 * Copy lanes this run skipped from a baseline, limited to the selected
 * entries, so a candidate lane compares without rerunning the rest.
 */
export function mergeBaseline(results: SuiteResults, baseline: SuiteResults, ranSkills: string[]): void {
  for (const [skill, lane] of Object.entries(baseline.lanes)) {
    if (ranSkills.includes(skill)) continue;
    results.lanes[skill] = lane;
    for (const [entryId, entry] of Object.entries(results.entries)) {
      const tally = baseline.entries[entryId]?.lanes[skill];
      if (tally) entry.lanes[skill] = tally;
    }
  }
}

function hitRate(tally: Tally | undefined): number | undefined {
  return tally && tally.runs > 0 ? tally.hits / tally.runs : undefined;
}

/** Compute per-lane recall, unique catches, and clean-case false positives. */
export function summarize(results: SuiteResults): Record<string, LaneSummary> {
  const entries = Object.entries(results.entries);
  const summary: Record<string, LaneSummary> = {};

  for (const skill of Object.keys(results.lanes).sort()) {
    // Entries this lane ran, with its hit rate on each.
    const ran = entries.flatMap(([id, entry]) => {
      const rate = hitRate(entry.lanes[skill]);
      return rate === undefined ? [] : [{ id, entry, rate }];
    });
    const bugs = ran.filter(({ entry }) => entry.kind === 'bug');
    const clean = ran.filter(({ entry }) => entry.kind === 'clean');
    const found = bugs.filter(({ rate }) => rate > 0);
    const othersMissed = (entry: EntryResult) => Object.entries(entry.lanes)
      .every(([other, tally]) => other === skill || tally.hits === 0);

    summary[skill] = {
      bugEntries: bugs.length,
      recall: bugs.length > 0 ? bugs.reduce((sum, { rate }) => sum + rate, 0) / bugs.length : null,
      found: found.length,
      onlyThisLane: found.filter(({ entry }) => othersMissed(entry)).map(({ id }) => id),
      missedBySecurityReview: skill === SECURITY_REVIEW
        ? []
        : found.filter(({ entry }) => entry.lanes[SECURITY_REVIEW]?.hits === 0).map(({ id }) => id),
      cleanFlagged: { hits: clean.filter(({ rate }) => rate > 0).length, runs: clean.length },
    };
  }
  return summary;
}

function cell(tally: Tally | undefined): string {
  return tally ? `${tally.hits}/${tally.runs}` : '-';
}

/** Render the summary and the entry x lane hit table as Markdown. */
export function renderMarkdown(results: SuiteResults): string {
  const skills = Object.keys(results.lanes).sort();
  const lines = [
    '## Security evals',
    '',
    '| lane | recall | found | only this lane | missed by security-review | clean flagged | cost USD | input tokens | output tokens |',
    '|---|---|---|---|---|---|---|---|---|',
  ];
  for (const skill of skills) {
    const lane = results.lanes[skill];
    const s = results.summary[skill];
    if (!lane || !s) continue;
    const recall = s.recall === null ? '-' : s.recall.toFixed(2);
    lines.push(
      `| ${skill}${lane.config.origin ? ' (baseline)' : ''} | ${recall} | ${s.found}/${s.bugEntries} `
      + `| ${s.onlyThisLane.length} | ${skill === SECURITY_REVIEW ? '-' : s.missedBySecurityReview.length} `
      + `| ${cell(s.cleanFlagged)} | ${lane.usage.costUSD.toFixed(2)} | ${lane.usage.inputTokens} | ${lane.usage.outputTokens} |`,
    );
  }

  lines.push('', `| entry | kind | ${skills.join(' | ')} |`, `|---|---|${skills.map(() => '---|').join('')}`);
  for (const [id, entry] of Object.entries(results.entries).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`| ${id} | ${entry.kind} | ${skills.map((skill) => cell(entry.lanes[skill])).join(' | ')} |`);
  }
  return lines.join('\n');
}

/** Serialize with sorted keys so two result files diff cleanly. */
export function serializeResults(results: SuiteResults): string {
  const sortKeys = (_key: string, value: unknown): unknown => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
    }
    return value;
  };
  return `${JSON.stringify(results, sortKeys, 2)}\n`;
}
