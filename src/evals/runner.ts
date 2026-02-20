import { basename, join, dirname } from 'node:path';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
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
 * Creates a real git repo with an empty `main` commit (the base) and an
 * `eval` branch containing fixture files + the skill definition. This gives
 * the agent a real git environment to explore with Read/Grep and produces
 * real git diffs for the pipeline to parse.
 */
function setupEvalRepo(meta: EvalMeta, log: (msg: string) => void): string {
  const tmpDir = mkdtempSync(join(tmpdir(), `warden-eval-${meta.name}-`));

  try {
    const git = (args: string[]) => execGitNonInteractive(args, { cwd: tmpDir });

    git(['init', '--initial-branch=main']);
    git(['config', 'user.email', 'eval@warden.dev']);
    git(['config', 'user.name', 'Warden Eval']);
    git(['commit', '--allow-empty', '-m', 'initial commit']);
    git(['checkout', '-b', 'eval']);

    // Copy fixture files, preserving their parent directory name
    for (const srcPath of meta.filePaths) {
      const destDir = join(tmpDir, basename(dirname(srcPath)));
      mkdirSync(destDir, { recursive: true });
      copyFileSync(srcPath, join(destDir, basename(srcPath)));
    }

    // Copy skill into repo. If it lives in a directory (skill-name/SKILL.md),
    // copy the whole directory to preserve resource subdirs (scripts/, references/).
    // For flat .md files, just copy the single file.
    const skillSrcDir = dirname(meta.skillPath);
    const skillMarker = join(skillSrcDir, 'SKILL.md');
    const skillDestDir = join(tmpDir, '.warden', 'skills');
    mkdirSync(skillDestDir, { recursive: true });

    if (existsSync(skillMarker)) {
      // Directory-format skill: copy entire directory to preserve resources
      const skillDirName = basename(skillSrcDir);
      cpSync(skillSrcDir, join(skillDestDir, skillDirName), { recursive: true });
    } else {
      copyFileSync(meta.skillPath, join(skillDestDir, basename(meta.skillPath)));
    }

    git(['add', '.']);
    git(['commit', '-m', `add fixture: ${meta.name}`]);

    log(`Repo ready: ${tmpDir} (${meta.filePaths.length} file(s))`);
    return tmpDir;
  } catch (error) {
    // Clean up on partial failure so we don't leak temp directories
    rmSync(tmpDir, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Run a single eval scenario end-to-end.
 *
 * The only thing mocked is the GitHub event payload (no real PR).
 * Everything else runs for real: git repo, diff parsing, SDK invocation,
 * agent with Read/Grep tools, finding extraction, LLM judge.
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

  if (meta.filePaths.length === 0) {
    throw new Error(`No fixture files specified for eval: ${name}`);
  }
  log(`Fixture file(s): ${meta.filePaths.map((f) => f.split('/').pop()).join(', ')}`);

  let repoDir: string | undefined;

  try {
    repoDir = setupEvalRepo(meta, log);

    const context = buildLocalEventContext({
      base: 'main',
      head: 'eval',
      cwd: repoDir,
      defaultBranch: 'main',
    });
    log(`Context built: ${context.pullRequest?.files.length ?? 0} file(s) from git diff`);

    // Resolve skill from where setupEvalRepo placed it
    const skillSrcDir = dirname(meta.skillPath);
    const isDirectorySkill = existsSync(join(skillSrcDir, 'SKILL.md'));
    const skillPath = isDirectorySkill
      ? join(repoDir, '.warden', 'skills', basename(skillSrcDir))
      : join(repoDir, '.warden', 'skills', basename(meta.skillPath));
    const skill = await resolveSkillAsync(skillPath);
    log(`Skill resolved: ${skill.name}`);

    const model = options.model ?? meta.model;
    log(`Running skill with model: ${model}`);

    const report = await runSkill(skill, context, {
      apiKey: options.apiKey,
      model,
      verbose: options.verbose,
      parallel: false,
      session: { enabled: false },
    });

    log(`Skill complete: ${report.findings.length} finding(s)`);
    for (const finding of report.findings) {
      const loc = finding.location ? ` (${finding.location.path}:${finding.location.startLine})` : '';
      log(`  [${finding.severity}] ${finding.title}${loc}`);
    }

    log('Running judge...');
    const judgeResult = await runJudge(meta, report.findings, options.apiKey);

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
    if (repoDir) {
      rmSync(repoDir, { recursive: true, force: true });
    }
  }
}
