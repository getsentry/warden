import { basename, join, dirname } from 'node:path';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { runLocalSkill } from '@sentry/warden';
import { evalFixtureRepoPath, singleEvalFixtureSourceRepository } from './fixtures.js';
import { formatEvalId } from './names.js';
import type { EvalMeta } from './types.js';
import type { Finding, FindingProcessingEvent, RuntimeName, SkillReport } from '@sentry/warden';

export interface RunEvalOptions {
  /** Anthropic API key */
  apiKey: string;
  /** Override the model from the YAML spec */
  model?: string;
  /** Override the runtime from the YAML spec */
  runtime?: RuntimeName;
  /** Enable verbose logging */
  verbose?: boolean;
}

export interface EvalSkillRunResult {
  /** Display name (e.g. "code-review/case") */
  name: string;
  /** Eval metadata */
  meta: EvalMeta;
  /** Skill report from the agent run */
  report: SkillReport;
  /** Verbose logs from the agent run */
  logs: string[];
  /** Duration of the skill run in ms */
  durationMs: number;
}

function copyFixtureIntoRepo(srcPath: string, repoDir: string): void {
  const destPath = join(repoDir, ...evalFixtureRepoPath(srcPath).split('/'));
  mkdirSync(dirname(destPath), { recursive: true });
  copyFileSync(srcPath, destPath);
}

function execGit(args: string[], cwd: string): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

/**
 * Set up a temporary git repository for an eval scenario.
 *
 * Creates a real git repo with a `main` commit containing the skill definition
 * and an `eval` branch containing only fixture files. This gives
 * the agent a real git environment to explore with Read/Grep and produces
 * real git diffs for the pipeline to parse.
 */
export function setupEvalRepo(meta: EvalMeta, log: (msg: string) => void): string {
  const tmpDir = mkdtempSync(join(tmpdir(), `warden-eval-${meta.name}-`));

  try {
    const git = (args: string[]) => execGit(args, tmpDir);

    git(['init', '--initial-branch=main']);
    git(['config', 'user.email', 'eval@warden.dev']);
    git(['config', 'user.name', 'Warden Eval']);
    git(['config', 'commit.gpgsign', 'false']);
    const sourceRepository = singleEvalFixtureSourceRepository(meta.filePaths);
    if (sourceRepository) {
      git(['remote', 'add', 'origin', `https://github.com/${sourceRepository}.git`]);
    }

    // Copy skill into repo. If it lives in a directory (skill-name/SKILL.md),
    // copy the whole directory to preserve resource subdirs (scripts/, references/).
    // For flat .md files, just copy the single file. Commit it on main so eval
    // diffs contain only fixture code, not the skill used to run the eval.
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

    for (const srcPath of meta.supportingFilePaths ?? []) {
      copyFixtureIntoRepo(srcPath, tmpDir);
    }

    git(['add', '.']);
    git(['commit', '-m', 'install eval skill']);
    git(['checkout', '-b', 'eval']);

    // Copy fixture files, preserving their path under the eval package fixtures.
    for (const srcPath of meta.filePaths) {
      copyFixtureIntoRepo(srcPath, tmpDir);
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

function formatFinding(finding: Finding): string {
  const loc = finding.location ? `${finding.location.path}:${finding.location.startLine}` : 'general';
  return `${loc} "${finding.title}"`;
}

function formatFindingProcessingEvent(event: FindingProcessingEvent): string {
  const reason = event.reason ? ` (${event.reason})` : '';
  const replacement = event.replacement ? ` -> ${formatFinding(event.replacement)}` : '';
  return `Finding ${event.stage}:${event.action} ${formatFinding(event.finding)}${replacement}${reason}`;
}

/**
 * Run a single eval scenario through Warden's skill pipeline.
 *
 * The only thing mocked is the GitHub event payload (no real PR).
 * Everything else runs for real: git repo, diff parsing, SDK invocation,
 * agent with Read/Grep tools, and finding extraction.
 */
export async function runEvalSkill(
  meta: EvalMeta,
  options: RunEvalOptions
): Promise<EvalSkillRunResult> {
  const startTime = Date.now();
  const name = formatEvalId(meta);
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

    // Resolve skill from where setupEvalRepo placed it
    const skillSrcDir = dirname(meta.skillPath);
    const isDirectorySkill = existsSync(join(skillSrcDir, 'SKILL.md'));
    const skillPath = isDirectorySkill
      ? join(repoDir, '.warden', 'skills', basename(skillSrcDir))
      : join(repoDir, '.warden', 'skills', basename(meta.skillPath));

    const model = options.model ?? meta.model;
    const runtime = options.runtime ?? meta.runtime;
    log(`Running skill with model: ${model} [${runtime}]`);

    const result = await runLocalSkill({
      skillPath,
      base: 'main',
      head: 'eval',
      cwd: repoDir,
      defaultBranch: 'main',
      apiKey: options.apiKey,
      model,
      runtime,
      verbose: options.verbose,
      parallel: false,
      callbacks: options.verbose
        ? {
            onFindingProcessing: (event) => {
              log(formatFindingProcessingEvent(event));
            },
          }
        : undefined,
    });
    log(`Context built: ${result.context.pullRequest?.files.length ?? 0} file(s) from git diff`);
    log(`Skill resolved: ${result.skill.name}`);

    const { report } = result;
    log(`Skill complete: ${report.findings.length} finding(s)`);
    for (const finding of report.findings) {
      const loc = finding.location ? ` (${finding.location.path}:${finding.location.startLine})` : '';
      log(`  [${finding.severity}] ${finding.title}${loc}`);
    }

    return {
      name,
      meta,
      report,
      logs,
      durationMs: Date.now() - startTime,
    };
  } finally {
    if (repoDir) {
      rmSync(repoDir, { recursive: true, force: true });
    }
  }
}
