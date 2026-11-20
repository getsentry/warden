import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EffortSchema, RuntimeNameSchema, type Effort, type RuntimeName } from '@sentry/warden';

/** Skills the matrix compares: builtin security-review plus the remote security skills production runs. */
export const MATRIX_SKILLS = [
  'security-review',
  'wrdn-authz',
  'wrdn-pii',
  'wrdn-data-exfil',
  'wrdn-code-execution',
  'wrdn-dos-review',
] as const;

/**
 * getsentry/warden-skills commit the wrdn-* lanes load from. Pinned so a
 * warden-skills edit cannot silently move results. Bump on purpose, update
 * .github/workflows/security-evals.yml to match, and rerun the affected lanes.
 */
export const WARDEN_SKILLS_REF = 'daf01f970a28450627a8d2d61d9915a742a735e2';

const PACKAGE_DIR = join(import.meta.dirname, '..');

/** Committed results used for lanes a run does not execute. */
export const DEFAULT_BASELINE = join(PACKAGE_DIR, 'baseline', 'results.json');

export interface SuiteOptions {
  /** Local clone per repository, keyed `owner/name`. Every entry's repository needs one. */
  repos: Record<string, string>;
  /** Local getsentry/warden-skills checkout. Required when a wrdn-* lane is selected. */
  skillsRepo?: string;
  skills: string[];
  entries: string[];
  repeats: number;
  runtime: RuntimeName;
  model: string;
  effort: Effort;
  auxiliaryModel: string;
  auxiliaryEffort: Effort;
  judgeModel: string;
  maxTurns: number;
  /** Concurrent chunk analyses per skill. */
  concurrency: number;
  cacheDir: string;
  output: string;
  /** Results file whose lanes fill in skills this run skips. Undefined disables it. */
  baseline?: string;
  /** Delete each worktree after its shard finishes, for disk-limited CI runners. */
  removeWorktrees: boolean;
}

const PREFIX = 'WARDEN_SECURITY_EVALS_';

function list(value: string | undefined): string[] {
  return (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
}

/** Parse `owner/name=<path>` pairs. `--sentry-repo` is an alias for the getsentry/sentry pair. */
function repoPaths(value: string | undefined, sentryRepo: string | undefined): Record<string, string> {
  const repos: Record<string, string> = {};
  for (const pair of list(value)) {
    const split = pair.indexOf('=');
    const repository = pair.slice(0, split);
    const path = pair.slice(split + 1);
    if (split < 0 || !/^[\w.-]+\/[\w.-]+$/.test(repository) || !path) {
      throw new Error(`${PREFIX}REPOS entries look like owner/name=<path>, got ${pair}`);
    }
    repos[repository] = path;
  }
  if (sentryRepo) {
    if (repos['getsentry/sentry'] && repos['getsentry/sentry'] !== sentryRepo) {
      throw new Error('getsentry/sentry is set by both --repo and --sentry-repo; pass one');
    }
    repos['getsentry/sentry'] = sentryRepo;
  }
  return repos;
}

function positiveInt(name: string, value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${PREFIX}${name} must be a positive integer, got ${value}`);
  }
  return parsed;
}

/**
 * Read suite options from `WARDEN_SECURITY_EVALS_*`. `scripts/run.ts` maps CLI
 * flags onto the same variables. Defaults match the production lane and the
 * corpus runbook (maxTurns 100, so a turn limit does not read as a miss).
 */
export function resolveSuiteOptions(env: NodeJS.ProcessEnv = process.env): SuiteOptions {
  const read = (name: string): string | undefined => env[`${PREFIX}${name}`]?.trim() || undefined;

  const skills = list(read('SKILLS'));
  const unknown = skills.filter((skill) => !(MATRIX_SKILLS as readonly string[]).includes(skill));
  if (unknown.length > 0) {
    throw new Error(`Unknown skills: ${unknown.join(', ')}. Choose from ${MATRIX_SKILLS.join(', ')}`);
  }

  const cacheDir = read('CACHE_DIR') ?? join(PACKAGE_DIR, '.cache');
  const baseline = read('BASELINE') ?? DEFAULT_BASELINE;

  return {
    repos: repoPaths(read('REPOS'), read('SENTRY_REPO')),
    skillsRepo: read('SKILLS_REPO'),
    skills: skills.length > 0 ? skills : [...MATRIX_SKILLS],
    entries: list(read('ENTRIES')),
    repeats: positiveInt('REPEATS', read('REPEATS'), 1),
    runtime: RuntimeNameSchema.parse(read('RUNTIME') ?? 'pi'),
    model: read('MODEL') ?? 'openrouter/x-ai/grok-4.5',
    effort: EffortSchema.parse(read('EFFORT') ?? 'high'),
    auxiliaryModel: read('AUX_MODEL') ?? 'openrouter/openai/gpt-5.6-luna',
    auxiliaryEffort: EffortSchema.parse(read('AUX_EFFORT') ?? 'high'),
    judgeModel: read('JUDGE_MODEL') ?? 'openrouter/anthropic/claude-sonnet-4.6',
    maxTurns: positiveInt('MAX_TURNS', read('MAX_TURNS'), 100),
    concurrency: positiveInt('CONCURRENCY', read('CONCURRENCY'), 4),
    cacheDir,
    output: read('OUTPUT') ?? join(cacheDir, 'results.json'),
    baseline: baseline === 'none' ? undefined : baseline,
    removeWorktrees: read('REMOVE_WORKTREES') === '1',
  };
}

const WARDEN_VERSION = (JSON.parse(
  readFileSync(join(PACKAGE_DIR, '..', 'warden', 'package.json'), 'utf8'),
) as { version: string }).version;

/**
 * Everything that changes what a lane finds or how it is scored. A baseline
 * lane only stands in for a lane whose config matches field for field.
 */
export interface LaneConfig {
  runtime: string;
  model: string;
  effort: string;
  auxiliaryModel: string;
  auxiliaryEffort: string;
  maxTurns: number;
  judgeModel: string;
  wardenVersion: string;
  /** `builtin` for security-review, `getsentry/warden-skills@<sha>` for wrdn-* skills. */
  skillRef: string;
}

/** The config a lane runs with under these options. */
export function laneConfig(skill: string, options: SuiteOptions): LaneConfig {
  return {
    runtime: options.runtime,
    model: options.model,
    effort: options.effort,
    auxiliaryModel: options.auxiliaryModel,
    auxiliaryEffort: options.auxiliaryEffort,
    maxTurns: options.maxTurns,
    judgeModel: options.judgeModel,
    wardenVersion: WARDEN_VERSION,
    skillRef: skill === 'security-review' ? 'builtin' : `getsentry/warden-skills@${WARDEN_SKILLS_REF}`,
  };
}
