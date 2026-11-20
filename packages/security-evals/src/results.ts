import type { SuiteEntry } from './entries.js';
import type { LaneConfig } from './options.js';
import { REFERENCE_SKILL, judgeSkill, type SkillVerdict } from './verdict.js';

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
  /** Passes completed: one per shard and repeat. */
  runs: number;
  /** Shard passes that errored. Their entries count as errors, not misses. */
  failedRuns: number;
  /** Set when the lane was copied from the baseline instead of run. */
  fromBaseline?: true;
}

/** One entry in one lane: hits over scored repeats, plus repeats that errored. */
export interface Tally {
  hits: number;
  runs: number;
  errors: number;
}

export interface EntryResult {
  source: SuiteEntry['source'];
  kind: SuiteEntry['kind'];
  repository: string;
  ref: string;
  targets: string[];
  lanes: Record<string, Tally>;
}

export interface LaneSummary {
  bugEntries: number;
  /** Mean hit rate over bug entries this lane scored. */
  recall: number | null;
  found: number;
  /** Bug entries this lane found and every other lane that ran them missed. */
  onlyThisLane: string[];
  cleanFlagged: { hits: number; runs: number };
  errors: number;
  /** Whether a wrdn-* skill catches what security-review misses. Absent for security-review itself. */
  verdict?: SkillVerdict;
}

export interface SuiteResults {
  version: 2;
  lanes: Record<string, LaneResult>;
  entries: Record<string, EntryResult>;
  summary: Record<string, LaneSummary>;
}

/** One skill's pass over one shard, scored per entry. */
export interface ShardRun {
  skill: string;
  config: LaneConfig;
  usage: LaneUsage;
  /** Set when the whole pass failed. */
  error?: string;
  hits: Map<string, boolean>;
  /** Entries this pass could not score. */
  errors: string[];
}

/** Start an empty result set for the selected entries. */
export function createResults(entries: SuiteEntry[]): SuiteResults {
  return {
    version: 2,
    lanes: {},
    entries: Object.fromEntries(entries.map((entry) => [entry.id, {
      source: entry.source,
      kind: entry.kind,
      repository: entry.repository,
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
  if (run.error) {
    lane.failedRuns += 1;
  } else {
    lane.runs += 1;
  }
  const tally = (entryId: string): Tally | undefined => {
    const entry = results.entries[entryId];
    if (!entry) return undefined;
    entry.lanes[run.skill] ??= { hits: 0, runs: 0, errors: 0 };
    return entry.lanes[run.skill];
  };
  for (const [entryId, hit] of run.hits) {
    const t = tally(entryId);
    if (!t) continue;
    t.runs += 1;
    t.hits += hit ? 1 : 0;
  }
  for (const entryId of run.errors) {
    const t = tally(entryId);
    if (t) t.errors += 1;
  }
  results.lanes[run.skill] = lane;
}

function hitRate(tally: Tally | undefined): number | undefined {
  return tally && tally.runs > 0 ? tally.hits / tally.runs : undefined;
}

/** Compute per-lane recall, unique catches, clean-case false positives, and each wrdn-* verdict. */
export function summarize(results: SuiteResults): Record<string, LaneSummary> {
  const entries = Object.entries(results.entries);
  const summary: Record<string, LaneSummary> = {};

  for (const skill of Object.keys(results.lanes).sort()) {
    // Entries this lane scored, with its hit rate on each.
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
      cleanFlagged: { hits: clean.filter(({ rate }) => rate > 0).length, runs: clean.length },
      errors: entries.reduce((sum, [, entry]) => sum + (entry.lanes[skill]?.errors ?? 0), 0),
      ...(skill === REFERENCE_SKILL ? {} : { verdict: judgeSkill(results, skill) }),
    };
  }
  return summary;
}

function cell(tally: Tally | undefined): string {
  if (!tally) return '-';
  return `${tally.hits}/${tally.runs}${tally.errors > 0 ? ` (${tally.errors} err)` : ''}`;
}

/** Render verdicts, the lane table, and the entry x lane hit table as Markdown. */
export function renderMarkdown(results: SuiteResults): string {
  const skills = Object.keys(results.lanes).sort();
  const lines = ['## Security evals', '', '### Verdicts', ''];
  for (const skill of skills) {
    const verdict = results.summary[skill]?.verdict;
    if (!verdict) continue;
    const ids = verdict.uniqueCatches.length > 0 ? ` Unique: ${verdict.uniqueCatches.join(', ')}.` : '';
    lines.push(`- **${skill}: ${verdict.verdict}**. ${verdict.reason}.${ids}`);
  }

  lines.push(
    '',
    '| lane | recall | found | only this lane | clean flagged | errors | cost USD | input tokens | output tokens |',
    '|---|---|---|---|---|---|---|---|---|',
  );
  for (const skill of skills) {
    const lane = results.lanes[skill];
    const s = results.summary[skill];
    if (!lane || !s) continue;
    const recall = s.recall === null ? '-' : s.recall.toFixed(2);
    lines.push(
      `| ${skill}${lane.fromBaseline ? ' (baseline)' : ''} | ${recall} | ${s.found}/${s.bugEntries} `
      + `| ${s.onlyThisLane.length} | ${s.cleanFlagged.hits}/${s.cleanFlagged.runs} | ${s.errors} `
      + `| ${lane.usage.costUSD.toFixed(2)} | ${lane.usage.inputTokens} | ${lane.usage.outputTokens} |`,
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
