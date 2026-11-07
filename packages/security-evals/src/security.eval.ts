import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterAll, describe, it } from 'vitest';
import { filterEntries, groupShards, loadCaseEntries, loadCorpusEntries } from './entries.js';
import { resolveSuiteOptions } from './options.js';
import {
  createResults,
  mergeBaseline,
  recordShardRun,
  renderMarkdown,
  serializeResults,
  summarize,
  type SuiteResults,
} from './results.js';
import { loadSkills, runShardPass } from './shard.js';
import { ensureWorktree, removeWorktree, resolveSentryRepo } from './worktrees.js';

const options = resolveSuiteOptions();
const sentryRepo = resolveSentryRepo(options.sentryRepo);
const entries = filterEntries([...loadCorpusEntries(), ...loadCaseEntries()], options.entries);
const shards = groupShards(entries);
const foreign = shards.filter((shard) => shard.repository !== 'getsentry/sentry');
if (foreign.length > 0) {
  throw new Error(`Only getsentry/sentry entries are supported, got ${foreign.map((s) => s.repository).join(', ')}`);
}

// The directory name is the Roach `worktree-root` value; keep the two in sync.
const worktreesDir = join(options.cacheDir, 'security-evals-worktrees');
const apiKey = process.env['WARDEN_ANTHROPIC_API_KEY'] || process.env['ANTHROPIC_API_KEY'] || '';
const results = createResults(entries);
let skills: ReturnType<typeof loadSkills> | undefined;

// A pass runs every selected skill over a whole shard, which can take an hour on large shards.
const PASS_TIMEOUT_MS = 3 * 60 * 60 * 1000;

describe('security evals', () => {
  for (const shard of shards) {
    for (let repeat = 1; repeat <= options.repeats; repeat++) {
      const name = `${shard.ref.slice(0, 8)} pass ${repeat}/${options.repeats} `
        + `(${shard.targets.length} files, ${shard.entries.length} entries)`;
      it(name, { timeout: PASS_TIMEOUT_MS }, async () => {
        skills ??= loadSkills(options.skills);
        const worktree = ensureWorktree(sentryRepo, worktreesDir, shard.ref);
        try {
          const runs = await runShardPass({
            shard,
            worktree,
            skills: await skills,
            options,
            apiKey,
            log: (message) => console.log(`  ${message}`),
          });
          for (const run of runs) recordShardRun(results, run);
          const failed = runs.filter((run) => !run.hits).map((run) => run.skill);
          if (failed.length > 0) {
            throw new Error(`Skill passes failed: ${failed.join(', ')}`);
          }
        } finally {
          if (options.removeWorktrees && repeat === options.repeats) {
            removeWorktree(sentryRepo, worktree);
          }
        }
      });
    }
  }
});

afterAll(() => {
  if (Object.keys(results.lanes).length === 0) return;
  if (options.baseline && existsSync(options.baseline)) {
    const baseline = JSON.parse(readFileSync(options.baseline, 'utf8')) as SuiteResults;
    mergeBaseline(results, baseline, options.skills);
  }
  results.summary = summarize(results);

  mkdirSync(dirname(options.output), { recursive: true });
  writeFileSync(options.output, serializeResults(results));
  const markdown = renderMarkdown(results);
  console.log(`\n${markdown}\n\nResults: ${options.output}`);
  const stepSummary = process.env['GITHUB_STEP_SUMMARY'];
  if (stepSummary) appendFileSync(stepSummary, `${markdown}\n`);
});
