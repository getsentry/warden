import { basename, join, dirname } from 'node:path';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execGitNonInteractive } from '../../../src/utils/exec.js';
import { buildLocalEventContext } from '../../../src/cli/context.js';
import { resolveSkillAsync } from '../../../src/skills/loader.js';
import { runSkill } from '../../../src/sdk/runner.js';
import { evalFixtureRepoPath, singleEvalFixtureSourceRepository } from './fixtures.js';
import { formatEvalId } from './names.js';
import type { EvalMeta } from './types.js';
import type { Finding, SkillReport } from '../../../src/types/index.js';
import type { FindingProcessingEvent } from '../../../src/sdk/runner.js';
import type { RuntimeName } from '../../../src/sdk/runtimes/types.js';

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
    const git = (args: string[]) => execGitNonInteractive(args, { cwd: tmpDir });

    git(['init', '--initial-branch=main']);
    git(['config', 'user.email', 'eval@warden.dev']);
    git(['config', 'user.name', 'Warden Eval']);
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
    const runtime = options.runtime ?? meta.runtime;
    log(`Running skill with model: ${model} [${runtime}]`);

    const report = await runSkill(skill, context, {
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
