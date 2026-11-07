import { join } from 'node:path';
import { resolveSkillAsync, runSkill, type SkillReport, type UsageStats } from '@sentry/warden';
// Not on the public surface; the CLI's file mode builds its context the same way.
import { buildFileEventContext } from '../../warden/src/cli/context.js';
import type { SuiteShard } from './entries.js';
import { laneConfig, type SuiteOptions } from './options.js';
import type { LaneUsage, ShardRun } from './results.js';
import { scoreEntry } from './score.js';

type SkillDefinition = Awaited<ReturnType<typeof resolveSkillAsync>>;

const BUILTIN_SECURITY_REVIEW = join(import.meta.dirname, '..', '..', 'warden', 'src', 'builtin-skills', 'security-review');

/** Corpus runbook scan limits, so explicit targets are never dropped by PR-sized budgets. */
const SCAN = { maxFiles: 200, maxChangedLines: 50_000 };

/**
 * Load each skill once, from disk only. security-review comes from this
 * checkout by path, so a same-named skill in the scanned repo cannot shadow
 * it. wrdn-* skills come from a worktree of warden-skills at the pinned ref.
 * Any failure throws once, before a pass runs, instead of reading as misses.
 */
export async function loadSkills(names: string[], skillsWorktree: string | undefined): Promise<Map<string, SkillDefinition>> {
  const skills = new Map<string, SkillDefinition>();
  for (const name of names) {
    let dir = BUILTIN_SECURITY_REVIEW;
    if (name !== 'security-review') {
      if (!skillsWorktree) {
        throw new Error(`${name} needs a getsentry/warden-skills checkout; set --skills-repo`);
      }
      dir = join(skillsWorktree, 'skills', name);
    }
    try {
      const skill = await resolveSkillAsync(dir);
      if (skill.name !== name) {
        throw new Error(`loaded ${skill.name}`);
      }
      skills.set(name, skill);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not load ${name} from ${dir}: ${message}`);
    }
  }
  return skills;
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
 * every selected skill against it, then score each entry per skill. An entry
 * the pass could not score (failed chunk, failed skill, failed judge) is
 * recorded as an error for that skill, never as a miss.
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
    const allEntries = shard.entries.map((entry) => entry.id);
    let usage: LaneUsage = { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, costUSD: 0, judgeCostUSD: 0 };
    const failed = (error: unknown): ShardRun => {
      const message = error instanceof Error ? error.message : String(error);
      log(`${name} @ ${shard.ref.slice(0, 8)} failed: ${message}`);
      return { skill: name, config, usage, error: message, hits: new Map(), errors: allEntries };
    };

    try {
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
      usage = reportUsage(report);
      if (report.error) return failed(report.error.message);

      const failedFiles = new Set(report.hunkFailures?.map((failure) => failure.filename));
      const hits = new Map<string, boolean>();
      const errors: string[] = [];
      for (const entry of shard.entries) {
        if (entry.targets.some((target) => failedFiles.has(target))) {
          log(`${name} @ ${shard.ref.slice(0, 8)}: ${entry.id} errored, a target chunk failed`);
          errors.push(entry.id);
          continue;
        }
        const verdict = await scoreEntry(entry, report.findings, { model: options.judgeModel, apiKey });
        usage.judgeCostUSD += verdict.usage?.costUSD ?? 0;
        hits.set(entry.id, verdict.hit);
      }
      log(`${name} @ ${shard.ref.slice(0, 8)}: ${report.findings.length} findings, `
        + `${[...hits.values()].filter(Boolean).length}/${hits.size} entries hit, ${errors.length} errored`);
      return { skill: name, config, usage, hits, errors };
    } catch (error) {
      return failed(error);
    }
  }));
}
