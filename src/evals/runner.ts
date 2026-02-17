import { basename, join, dirname } from 'node:path';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execGitNonInteractive } from '../utils/exec.js';
import { buildLocalEventContext } from '../cli/context.js';
import { resolveSkillAsync } from '../skills/loader.js';
import { runSkill } from '../sdk/runner.js';
import { runJudge } from './judge.js';
import { evalPassed } from './types.js';
import type { EvalMeta, EvalResult } from './types.js';

export interface RunEvalOptions {
  /** Anthropic API key */
  apiKey: string;
  /** Override the model from the YAML spec */
  model?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Set up a temporary git repository for an eval scenario.
 *
 * Creates a real git repo with:
 * 1. An initial empty commit on `main` (the base)
 * 2. A branch `eval` with the fixture files committed
 *
 * This gives the agent a real git environment to explore with Read/Grep,
 * and produces real git diffs for the pipeline to parse.
 */
function setupEvalRepo(meta: EvalMeta, log: (msg: string) => void): string {
  const tmpDir = mkdtempSync(join(tmpdir(), `warden-eval-${meta.name}-`));
  log(`Created temp repo: ${tmpDir}`);

  const git = (args: string[]) => execGitNonInteractive(args, { cwd: tmpDir });

  // Initialize a real git repo
  git(['init', '--initial-branch=main']);
  git(['config', 'user.email', 'eval@warden.dev']);
  git(['config', 'user.name', 'Warden Eval']);

  // Create an initial empty commit as the base
  git(['commit', '--allow-empty', '-m', 'initial commit']);

  // Create the eval branch and add fixture files
  git(['checkout', '-b', 'eval']);

  for (const srcPath of meta.filePaths) {
    const filename = basename(srcPath);
    // Preserve directory structure: use the fixture subdirectory name
    const fixtureSubdir = basename(dirname(srcPath));
    const destDir = join(tmpDir, fixtureSubdir);
    mkdirSync(destDir, { recursive: true });
    copyFileSync(srcPath, join(destDir, filename));
  }

  git(['add', '.']);
  git(['commit', '-m', `add fixture: ${meta.name}`]);

  log(`Repo ready: main (empty) -> eval (${meta.filePaths.length} file(s))`);
  return tmpDir;
}

/**
 * Run a single eval scenario end-to-end.
 *
 * This is a true end-to-end test of the Warden pipeline. The only thing
 * mocked is the GitHub event payload (there's no real PR). Everything else
 * runs for real:
 *
 * 1. Sets up a temporary git repo with fixture files
 * 2. Builds an EventContext from real git diff (main...eval)
 * 3. Resolves and runs the skill via the full SDK pipeline
 * 4. The agent operates in a real git repo with Read/Grep tools
 * 5. Findings are extracted, then judged by an LLM
 */
export async function runEval(
  meta: EvalMeta,
  options: RunEvalOptions
): Promise<EvalResult> {
  const startTime = Date.now();
  const name = `${meta.category}/${meta.name}`;
  const logs: string[] = [];

  const log = (msg: string): void => {
    logs.push(`[${Date.now() - startTime}ms] ${msg}`);
    if (options.verbose) {
      console.log(`  [eval:${name}] ${msg}`);
    }
  };

  // 1. Validate inputs
  if (meta.filePaths.length === 0) {
    throw new Error(`No fixture files specified for eval: ${name}`);
  }
  log(`Fixture file(s): ${meta.filePaths.map((f) => f.split('/').pop()).join(', ')}`);

  let repoDir: string | undefined;

  try {
    // 2. Set up a real git repo with fixture files
    log('Setting up eval git repo...');
    repoDir = setupEvalRepo(meta, log);

    // 3. Build EventContext from real git diff
    log('Building event context from git diff...');
    const context = buildLocalEventContext({
      base: 'main',
      head: 'eval',
      cwd: repoDir,
      defaultBranch: 'main',
    });
    const fileCount = context.pullRequest?.files.length ?? 0;
    log(`Context built: ${fileCount} file(s) from git diff`);

    // 4. Resolve the skill
    // Copy skill into the repo so the agent can read skill resources
    const skillDestDir = join(repoDir, '.warden', 'skills');
    mkdirSync(skillDestDir, { recursive: true });
    const skillDest = join(skillDestDir, basename(meta.skillPath));
    copyFileSync(meta.skillPath, skillDest);

    log(`Resolving skill: ${meta.skillPath}`);
    const skill = await resolveSkillAsync(skillDest);
    log(`Skill resolved: ${skill.name}`);

    // 5. Run the skill via the full SDK pipeline
    const model = options.model ?? meta.model;
    log(`Running skill with model: ${model}`);

    const report = await runSkill(skill, context, {
      apiKey: options.apiKey,
      model,
      verbose: options.verbose,
      parallel: false,
    });

    log(`Skill complete: ${report.findings.length} finding(s)`);
    for (const finding of report.findings) {
      const loc = finding.location ? ` (${finding.location.path}:${finding.location.startLine})` : '';
      log(`  [${finding.severity}] ${finding.title}${loc}`);
    }

    // 6. Run the LLM judge
    log('Running judge...');
    const judgeResult = await runJudge(meta, report.findings, options.apiKey);
    log('Judge complete');

    // 7. Determine pass/fail
    const passed = evalPassed(meta, judgeResult.response);
    log(`Result: ${passed ? 'PASS' : 'FAIL'}`);

    return {
      name,
      meta,
      passed,
      report,
      judgeResponse: judgeResult.response,
      logs,
      durationMs: Date.now() - startTime,
      skillUsage: report.usage,
      judgeUsage: judgeResult.usage,
    };
  } finally {
    // Always clean up the temp repo
    if (repoDir && existsSync(repoDir)) {
      rmSync(repoDir, { recursive: true, force: true });
      log('Cleaned up temp repo');
    }
  }
}
