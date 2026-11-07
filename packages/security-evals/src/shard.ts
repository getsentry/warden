import { join } from 'node:path';
import { resolveSkillAsync, runSkill, type SkillReport, type UsageStats } from '@sentry/warden';
// Not on the public surface; the CLI's file mode builds its context the same way.
import { buildFileEventContext } from '../../warden/src/cli/context.js';
import type { SuiteShard } from './entries.js';
import type { SuiteOptions } from './options.js';
import { WARDEN_SKILLS_REMOTE } from './options.js';
import type { LaneConfig, LaneUsage, ShardRun } from './results.js';
import { scoreEntry } from './score.js';

type SkillDefinition = Awaited<ReturnType<typeof resolveSkillAsync>>;

const BUILTIN_SECURITY_REVIEW = join(import.meta.dirname, '..', '..', 'warden', 'src', 'builtin-skills', 'security-review');

/** Corpus runbook scan limits, so explicit targets are never dropped by PR-sized budgets. */
const SCAN = { maxFiles: 200, maxChangedLines: 50_000 };

/**
 * Load each skill once. security-review comes from this checkout by path, so a
 * same-named skill in the scanned repo cannot shadow it. wrdn-* skills come
 * from the pinned warden-skills ref.
 */
export async function loadSkills(names: string[]): Promise<Map<string, SkillDefinition>> {
  const skills = new Map<string, SkillDefinition>();
  // Sequential: remote skills share one checkout of the pinned ref.
  for (const name of names) {
    skills.set(name, name === 'security-review'
      ? await resolveSkillAsync(BUILTIN_SECURITY_REVIEW)
      : await resolveSkillAsync(name, undefined, { remote: WARDEN_SKILLS_REMOTE }));
  }
  return skills;
}

/** Lane config recorded with each result. */
function laneConfig(skill: string, options: SuiteOptions): LaneConfig {
  return {
    runtime: options.runtime,
    model: options.model,
    effort: options.effort,
    auxiliaryModel: options.auxiliaryModel,
    auxiliaryEffort: options.auxiliaryEffort,
    maxTurns: options.maxTurns,
    judgeModel: options.judgeModel,
    ...(skill === 'security-review' ? {} : { skillsRemote: WARDEN_SKILLS_REMOTE }),
  };
}

function reportUsage(report: SkillReport): LaneUsage {
  const parts: UsageStats[] = [report.usage, ...Object.values(report.auxiliaryUsage ?? {})]
    .filter((usage): usage is UsageStats => usage !== undefined);
  return {
    inputTokens: parts.reduce((sum, usage) => sum + usage.inputTokens, 0),
    outputTokens: parts.reduce((sum, usage) => sum + usage.outputTokens, 0),
    cacheReadInputTokens: parts.reduce((sum, usage) => sum + (usage.cacheReadInputTokens ?? 0), 0),
    costUSD: parts.reduce((sum, usage) => sum + usage.costUSD, 0),
    judgeCostUSD: 0,
  };
}

/**
 * One Warden pass over a shard's worktree: build the file context once, run
 * every selected skill against it, then score each entry per skill. Entries in
 * a file with a failed chunk get no repeat instead of a false miss.
 */
export async function runShardPass(args: {
  shard: SuiteShard;
  worktree: string;
  skills: Map<string, SkillDefinition>;
  options: SuiteOptions;
  apiKey: string;
  log: (message: string) => void;
}): Promise<ShardRun[]> {
  const { shard, worktree, skills, options, apiKey, log } = args;
  const context = await buildFileEventContext({ patterns: shard.targets, cwd: worktree, scan: SCAN });
  const scanned = new Set(context.pullRequest?.files.map((file) => file.filename));
  const missing = shard.targets.filter((target) => !scanned.has(target));
  if (missing.length > 0) {
    throw new Error(`Shard ${shard.ref} is missing targets: ${missing.join(', ')}`);
  }

  return Promise.all([...skills].map(async ([name, skill]): Promise<ShardRun> => {
    const config = laneConfig(name, options);
    const report = await runSkill(skill, context, {
      apiKey: apiKey || undefined,
      runtime: options.runtime,
      model: options.model,
      effort: options.effort,
      auxiliaryModel: options.auxiliaryModel,
      auxiliaryEffort: options.auxiliaryEffort,
      synthesisModel: options.auxiliaryModel,
      maxTurns: options.maxTurns,
      concurrency: options.concurrency,
      verifyFindings: true,
    });
    const usage = reportUsage(report);
    if (report.error) {
      log(`${name} @ ${shard.ref.slice(0, 8)} failed: ${report.error.message}`);
      return { skill: name, config, usage };
    }

    const failedFiles = new Set(report.hunkFailures?.map((failure) => failure.filename));
    const hits = new Map<string, boolean>();
    for (const entry of shard.entries) {
      if (entry.targets.some((target) => failedFiles.has(target))) {
        log(`${name} @ ${shard.ref.slice(0, 8)}: ${entry.id} skipped, a target chunk failed`);
        continue;
      }
      const verdict = await scoreEntry(entry, report.findings, { model: options.judgeModel, apiKey });
      usage.judgeCostUSD += verdict.usage?.costUSD ?? 0;
      hits.set(entry.id, verdict.hit);
    }
    log(`${name} @ ${shard.ref.slice(0, 8)}: ${report.findings.length} findings, `
      + `${[...hits.values()].filter(Boolean).length}/${hits.size} entries hit`);
    return { skill: name, config, usage, hits };
  }));
}
