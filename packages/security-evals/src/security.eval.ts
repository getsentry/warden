import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterAll, describe, it } from 'vitest';
import { filterEntries, groupShards, loadCaseEntries, loadCorpusEntries } from './entries.js';
import { mergeBaseline, loadResultsFile } from './baseline.js';
import { WARDEN_SKILLS_REF, laneConfig, resolveSuiteOptions } from './options.js';
import { createResults, recordShardRun, renderMarkdown, serializeResults, summarize } from './results.js';
import { loadSkills, runShardPass } from './shard.js';
import { SKILLS_CHECKOUT, ensureWorktree, removeWorktree, repoCheckout, resolveCheckout } from './worktrees.js';

const options = resolveSuiteOptions();
const entries = filterEntries([...loadCorpusEntries(), ...loadCaseEntries()], options.entries);
const shards = groupShards(entries);

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
    // Resolved while vitest collects tests, so a missing clone fails before any pass runs.
    const clone = resolveCheckout(repoCheckout(shard.repository), options.repos[shard.repository]);
    for (let repeat = 1; repeat <= options.repeats; repeat++) {
      const name = `${shard.ref.slice(0, 8)} pass ${repeat}/${options.repeats} `
        + `(${shard.targets.length} files, ${shard.entries.length} entries)`;
      it(name, { timeout: PASS_TIMEOUT_MS }, async () => {
        const worktree = ensureWorktree(clone, worktreesDir, shard.ref);
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
          const failed = runs.filter((run) => run.errors.length > 0)
            .map((run) => `${run.skill} (${run.errors.length} entries)`);
          if (failed.length > 0) {
            throw new Error(`Entries errored, recorded as errors: ${failed.join(', ')}`);
          }
        } finally {
          if (options.removeWorktrees && repeat === options.repeats) {
            removeWorktree(clone, worktree);
          }
        }
      });
    }
  }
});

afterAll(() => {
  if (Object.keys(results.lanes).length === 0) return;
  if (options.baseline && existsSync(options.baseline)) {
    const warnings = mergeBaseline(results, loadResultsFile(options.baseline), options.skills,
      (skill) => laneConfig(skill, options));
    for (const warning of warnings) console.warn(warning);
  }
  results.summary = summarize(results);

  mkdirSync(dirname(options.output), { recursive: true });
  writeFileSync(options.output, serializeResults(results));
  const markdown = renderMarkdown(results);
  console.log(`\n${markdown}\n\nResults: ${options.output}`);
  const stepSummary = process.env['GITHUB_STEP_SUMMARY'];
  if (stepSummary) appendFileSync(stepSummary, `${markdown}\n`);
});
