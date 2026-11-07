#!/usr/bin/env tsx
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

// Each flag maps to WARDEN_SECURITY_EVALS_<ENV>; see src/options.ts for defaults.
const FLAGS = {
  'sentry-repo': 'SENTRY_REPO',
  'skills-repo': 'SKILLS_REPO',
  skills: 'SKILLS',
  entries: 'ENTRIES',
  repeats: 'REPEATS',
  runtime: 'RUNTIME',
  model: 'MODEL',
  effort: 'EFFORT',
  'aux-model': 'AUX_MODEL',
  'aux-effort': 'AUX_EFFORT',
  'judge-model': 'JUDGE_MODEL',
  'max-turns': 'MAX_TURNS',
  concurrency: 'CONCURRENCY',
  'cache-dir': 'CACHE_DIR',
  output: 'OUTPUT',
  baseline: 'BASELINE',
} as const;

const PATH_FLAGS = new Set(['sentry-repo', 'skills-repo', 'cache-dir', 'output', 'baseline']);

const USAGE = `usage: pnpm evals:security --repo getsentry/sentry=<path> [--skills-repo <path>] [options]

  --repo <owner/name=path>
                         Local clone of a repository the selected entries scan.
                         Repeat it per repository (required)
  --sentry-repo <path>   Same as --repo getsentry/sentry=<path>
  --skills-repo <path>   Local getsentry/warden-skills clone (required for wrdn-* lanes)
  --skills <a,b>         Lanes to run (default: security-review and the five wrdn-* skills)
  --entries <a,b>        Entry ids, or prefixes ending in * (default: all)
  --repeats <n>          Passes per shard (default: 1)
  --runtime, --model, --effort, --aux-model, --aux-effort
                         Model lane (default: pi, openrouter/x-ai/grok-4.5 high,
                         openrouter/openai/gpt-5.6-luna high)
  --judge-model <id>     Scoring model (default: openrouter/anthropic/claude-sonnet-4.6)
  --max-turns <n>        Agent turn cap (default: 100)
  --concurrency <n>      Concurrent chunks per skill (default: 4)
  --cache-dir <path>     Worktrees and results (default: packages/security-evals/.cache)
  --output <path>        Results JSON (default: <cache-dir>/results.json)
  --baseline <path|none> Lanes to compare against (default: baseline/results.json)
  --remove-worktrees     Delete each worktree after its shard (CI disk limits)`;

const { values } = parseArgs({
  options: {
    ...Object.fromEntries(Object.keys(FLAGS).map((flag) => [flag, { type: 'string' as const }])),
    repo: { type: 'string', multiple: true },
    'remove-worktrees': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

// pnpm runs scripts from the package directory; INIT_CWD is where the caller ran it.
const callerPath = (path: string): string => resolve(process.env['INIT_CWD'] ?? process.cwd(), path);

const env: NodeJS.ProcessEnv = { ...process.env };
for (const [flag, name] of Object.entries(FLAGS)) {
  const value = (values as Record<string, unknown>)[flag];
  if (typeof value === 'string') {
    env[`WARDEN_SECURITY_EVALS_${name}`] = PATH_FLAGS.has(flag) && value !== 'none' ? callerPath(value) : value;
  }
}
if (values.repo) {
  env['WARDEN_SECURITY_EVALS_REPOS'] = values.repo.map((pair) => {
    const split = pair.indexOf('=');
    return split < 0 ? pair : `${pair.slice(0, split)}=${callerPath(pair.slice(split + 1))}`;
  }).join(',');
}
if (values['remove-worktrees']) {
  env['WARDEN_SECURITY_EVALS_REMOVE_WORKTREES'] = '1';
}

const result = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', 'vitest.config.ts'], {
  cwd: resolve(import.meta.dirname, '..'),
  env,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
