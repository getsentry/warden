import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterAll, describe, it } from 'vitest';
import { filterEntries, groupShards, loadCaseEntries, loadCorpusEntries } from './entries.js';
import { WARDEN_SKILLS_REF, resolveSuiteOptions } from './options.js';
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
import { SENTRY_CHECKOUT, SKILLS_CHECKOUT, ensureWorktree, removeWorktree, resolveCheckout } from './worktrees.js';

const options = resolveSuiteOptions();
const sentryRepo = resolveCheckout(SENTRY_CHECKOUT, options.sentryRepo);
const entries = filterEntries([...loadCorpusEntries(), ...loadCaseEntries()], options.entries);
const shards = groupShards(entries);
const foreign = shards.filter((shard) => shard.repository !== 'getsentry/sentry');
if (foreign.length > 0) {
  throw new Error(`Only getsentry/sentry entries are supported, got ${foreign.map((s) => s.repository).join(', ')}`);
}

// Both worktree directory names are Roach values in roach.json; keep them in sync.
const worktreesDir = join(options.cacheDir, 'security-evals-worktrees');
const skillsWorktreesDir = join(options.cacheDir, 'skills-worktrees');
const apiKey = process.env['WARDEN_ANTHROPIC_API_KEY'] || process.env['ANTHROPIC_API_KEY'] || '';
const results = createResults(entries);

// Setup, once per run: a skills problem fails collection here, so no pass runs and
// no entry is scored as a miss. No network unless the clone lacks the pinned ref.
const needsSkillsRepo = options.skills.some((skill) => skill !== 'security-review');
const skillsWorktree = needsSkillsRepo
  ? ensureWorktree(
    resolveCheckout(SKILLS_CHECKOUT, options.skillsRepo),
    skillsWorktreesDir,
    WARDEN_SKILLS_REF,
  )
  : undefined;
const skills = await loadSkills(options.skills, skillsWorktree);

// A pass runs every selected skill over a whole shard, which can take an hour on large shards.
const PASS_TIMEOUT_MS = 3 * 60 * 60 * 1000;

describe('security evals', () => {
  for (const shard of shards) {
    for (let repeat = 1; repeat <= options.repeats; repeat++) {
      const name = `${shard.ref.slice(0, 8)} pass ${repeat}/${options.repeats} `
        + `(${shard.targets.length} files, ${shard.entries.length} entries)`;
      it(name, { timeout: PASS_TIMEOUT_MS }, async () => {
        const worktree = ensureWorktree(sentryRepo, worktreesDir, shard.ref);
        try {
          const runs = await runShardPass({
            shard,
            worktree,
            skills,
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
