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
  sentryRepo?: string;
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
    sentryRepo: read('SENTRY_REPO'),
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
