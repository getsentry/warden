import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { config as dotenvConfig } from 'dotenv';
import { loadWardenConfig, resolveTrigger } from '../config/loader.js';
import type { SkillRunnerOptions } from '../sdk/runner.js';
import { resolveSkillAsync } from '../skills/loader.js';
import { matchTrigger, shouldFail, countFindingsAtOrAbove } from '../triggers/matcher.js';
import type { SkillReport } from '../types/index.js';
import { DEFAULT_CONCURRENCY, getAnthropicApiKey } from '../utils/index.js';
import { parseCliArgs, showHelp, showVersion, classifyTargets, type CLIOptions } from './args.js';
import { buildLocalEventContext, buildFileEventContext } from './context.js';
import { getRepoRoot, refExists, hasUncommittedChanges } from './git.js';
import { renderTerminalReport, renderJsonReport, filterReportsBySeverity } from './terminal.js';
import {
  Reporter,
  detectOutputMode,
  parseVerbosity,
  Verbosity,
  runSkillTasks,
  pluralize,
  writeJsonlReport,
  getRunLogPath,
  type SkillTaskOptions,
} from './output/index.js';
import {
  collectFixableFindings,
  applyAllFixes,
  runInteractiveFixFlow,
  renderFixSummary,
} from './fix.js';
import { runInit } from './commands/init.js';
import { runAdd } from './commands/add.js';
import { runSetupApp } from './commands/setup-app.js';

/**
 * Global abort controller for graceful shutdown on SIGINT.
 * Used to cancel in-progress SDK queries.
 */
export const abortController = new AbortController();

/**
 * Load environment variables from .env files in the given directory.
 * Loads .env first, then .env.local for local overrides.
 */
function loadEnvFiles(dir: string): void {
  // Load .env first (base config)
  const envPath = join(dir, '.env');
  if (existsSync(envPath)) {
    dotenvConfig({ path: envPath, quiet: true });
  }

  // Load .env.local second (local overrides, typically gitignored)
  const envLocalPath = join(dir, '.env.local');
  if (existsSync(envLocalPath)) {
    dotenvConfig({ path: envLocalPath, override: true, quiet: true });
  }
}

/**
 * Create a Reporter instance from CLI options.
 */
function createReporter(options: CLIOptions): Reporter {
  const outputMode = detectOutputMode(options.color);
  const verbosity = parseVerbosity(options.quiet, options.verbose);
  return new Reporter(outputMode, verbosity);
}

/**
 * Run skills on a context and output results.
 * If skillName is provided, runs only that skill.
 * Otherwise, runs skills from matched triggers in warden.toml.
 */
async function runSkills(
  context: Awaited<ReturnType<typeof buildLocalEventContext>>,
  options: CLIOptions,
  reporter: Reporter
): Promise<number> {
  const cwd = process.cwd();
  const startTime = Date.now();

  // Check for API key
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    reporter.error('WARDEN_ANTHROPIC_API_KEY environment variable is required');
    return 1;
  }

  // Try to find repo root for config loading
  let repoPath: string | undefined;
  try {
    repoPath = getRepoRoot(cwd);
  } catch {
    // Not in a git repo - that's fine for file mode
  }

  // Resolve config path
  let configPath: string | null = null;
  if (options.config) {
    configPath = resolve(cwd, options.config);
  } else if (repoPath) {
    configPath = resolve(repoPath, 'warden.toml');
  }

  // Load config if available
  const config = configPath && existsSync(configPath)
    ? loadWardenConfig(dirname(configPath))
    : null;

  const skillsConfig = config?.skills;
  const defaultsModel = config?.defaults?.model;
  const defaultsMaxTurns = config?.defaults?.maxTurns;

  // Determine which skills to run
  let skillNames: string[];
  if (options.skill) {
    // Explicit skill specified via CLI
    skillNames = [options.skill];
  } else if (config) {
    // Get skills from matched triggers
    const resolvedTriggers = config.triggers.map((t) => resolveTrigger(t, config, options.model));
    const matchedTriggers = resolvedTriggers.filter((t) => matchTrigger(t, context));
    skillNames = [...new Set(matchedTriggers.map((t) => t.skill))];
  } else {
    skillNames = [];
  }

  // Handle case where no skills to run
  if (skillNames.length === 0) {
    if (options.json) {
      console.log(renderJsonReport([]));
    } else {
      reporter.warning('No triggers matched for the changed files');
      reporter.tip('Specify a skill explicitly: warden <target> --skill <name>');
    }
    return 0;
  }

  // Build skill tasks
  // Model precedence: defaults.model > CLI flag > WARDEN_MODEL env var > SDK default
  const model = defaultsModel ?? options.model ?? process.env['WARDEN_MODEL'];
  const runnerOptions: SkillRunnerOptions = { apiKey, model, abortController, maxTurns: defaultsMaxTurns };
  const tasks: SkillTaskOptions[] = skillNames.map((skillName) => ({
    name: skillName,
    failOn: options.failOn,
    resolveSkill: () => resolveSkillAsync(skillName, repoPath, skillsConfig),
    context,
    runnerOptions,
  }));

  // Run skills with listr2
  const concurrency = options.parallel ?? DEFAULT_CONCURRENCY;
  const results = await runSkillTasks(tasks, {
    mode: reporter.mode,
    verbosity: reporter.verbosity,
    concurrency,
  });

  // Collect reports and check for failures
  const reports: SkillReport[] = [];
  let hasFailure = false;
  const failureReasons: string[] = [];

  for (const result of results) {
    if (result.report) {
      reports.push(result.report);
      // Check failure condition
      if (result.failOn && shouldFail(result.report, result.failOn)) {
        hasFailure = true;
        const count = countFindingsAtOrAbove(result.report, result.failOn);
        failureReasons.push(`${result.name}: ${count} ${result.failOn}+ severity ${pluralize(count, 'issue')}`);
      }
    }
  }

  // Filter reports for output based on commentOn threshold
  const filteredReports = filterReportsBySeverity(reports, options.commentOn);

  // Calculate total duration
  const totalDuration = Date.now() - startTime;

  // Write JSONL output if requested (uses unfiltered reports for complete data)
  if (options.output) {
    writeJsonlReport(options.output, reports, totalDuration);
    reporter.success(`Wrote JSONL output to ${options.output}`);
  }

  // Always write automatic run log for debugging
  const runLogPath = getRunLogPath(cwd);
  writeJsonlReport(runLogPath, reports, totalDuration);
  reporter.debug(`Run log: ${runLogPath}`);

  // Output results
  reporter.blank();
  if (options.json) {
    console.log(renderJsonReport(filteredReports));
  } else {
    console.log(renderTerminalReport(filteredReports, reporter.mode));
  }

  // Show summary (uses filtered reports for display)
  reporter.blank();
  reporter.renderSummary(filteredReports, totalDuration);

  // Handle fixes (uses filtered reports - only show fixes for visible findings)
  const fixableFindings = collectFixableFindings(filteredReports);
  if (fixableFindings.length > 0) {
    if (options.fix) {
      // --fix mode: apply all fixes automatically
      const fixSummary = applyAllFixes(fixableFindings);
      renderFixSummary(fixSummary, reporter);
    } else if (
      !options.json &&
      reporter.verbosity !== Verbosity.Quiet &&
      reporter.mode.isTTY
    ) {
      // Interactive mode: prompt user
      const fixSummary = await runInteractiveFixFlow(fixableFindings, reporter);
      renderFixSummary(fixSummary, reporter);
    }
  }

  // Determine exit code (based on original reports, not filtered)
  if (hasFailure) {
    reporter.blank();
    reporter.error(`Failing due to: ${failureReasons.join(', ')}`);
    return 1;
  }

  return 0;
}

/**
 * Run in file mode: analyze specific files.
 */
async function runFileMode(filePatterns: string[], options: CLIOptions, reporter: Reporter): Promise<number> {
  const cwd = process.cwd();

  // Load environment variables from .env files if they exist
  loadEnvFiles(cwd);

  // Build context from files
  reporter.step('Building context from files...');
  const context = await buildFileEventContext({
    patterns: filePatterns,
    cwd,
  });

  const pullRequest = context.pullRequest;
  if (!pullRequest) {
    reporter.error('Failed to build context');
    return 1;
  }

  if (pullRequest.files.length === 0) {
    if (!options.json) {
      reporter.blank();
      reporter.warning('No files matched the given patterns');
    } else {
      console.log(renderJsonReport([]));
    }
    return 0;
  }

  reporter.success(`Found ${pullRequest.files.length} ${pluralize(pullRequest.files.length, 'file')}`);
  reporter.contextFiles(pullRequest.files);

  return runSkills(context, options, reporter);
}

/**
 * Parse git ref target into base and head refs.
 * Supports formats: "base..head", "base" (defaults head to HEAD)
 * Special case: "HEAD" alone means the HEAD commit (HEAD^..HEAD)
 */
function parseGitRef(ref: string): { base: string; head: string } {
  if (ref.includes('..')) {
    const [base, head] = ref.split('..');
    return { base: base || 'HEAD', head: head || 'HEAD' };
  }
  // Single ref: diff from that ref to HEAD
  // Special case: if ref is HEAD, diff from HEAD^ to see the current commit
  if (ref.toUpperCase() === 'HEAD') {
    return { base: 'HEAD^', head: 'HEAD' };
  }
  return { base: ref, head: 'HEAD' };
}

/**
 * Run in git ref mode: analyze changes from a git ref.
 */
async function runGitRefMode(gitRef: string, options: CLIOptions, reporter: Reporter): Promise<number> {
  const cwd = process.cwd();
  let repoPath: string;

  // Find repo root
  try {
    repoPath = getRepoRoot(cwd);
  } catch {
    reporter.error('Not a git repository');
    return 1;
  }

  // Load environment variables from .env files
  loadEnvFiles(repoPath);

  const { base, head } = parseGitRef(gitRef);

  // Validate base ref
  if (!refExists(base, repoPath)) {
    reporter.error(`Git ref does not exist: ${base}`);
    return 1;
  }

  // Validate head ref if specified
  if (head && !refExists(head, repoPath)) {
    reporter.error(`Git ref does not exist: ${head}`);
    return 1;
  }

  // Load config to get defaultBranch if available
  const configPath = options.config
    ? resolve(cwd, options.config)
    : resolve(repoPath, 'warden.toml');
  const config = existsSync(configPath) ? loadWardenConfig(dirname(configPath)) : null;

  // Build context from local git
  reporter.startContext(`Analyzing changes from ${gitRef}...`);
  const context = buildLocalEventContext({
    base,
    head,
    cwd: repoPath,
    defaultBranch: config?.defaults?.defaultBranch,
  });

  const pullRequest = context.pullRequest;
  if (!pullRequest) {
    reporter.error('Failed to build context');
    return 1;
  }

  if (pullRequest.files.length === 0) {
    if (!options.json) {
      reporter.renderEmptyState('No changes found');
      reporter.blank();
    } else {
      console.log(renderJsonReport([]));
    }
    return 0;
  }

  reporter.contextFiles(pullRequest.files);

  return runSkills(context, options, reporter);
}

/**
 * Run in config mode: use warden.toml triggers.
 */
async function runConfigMode(options: CLIOptions, reporter: Reporter): Promise<number> {
  const cwd = process.cwd();
  let repoPath: string;
  const startTime = Date.now();

  // Find repo root
  try {
    repoPath = getRepoRoot(cwd);
  } catch {
    reporter.error('Not a git repository');
    return 1;
  }

  // Load environment variables from .env files
  loadEnvFiles(repoPath);

  // Resolve config path
  const configPath = options.config
    ? resolve(cwd, options.config)
    : resolve(repoPath, 'warden.toml');

  if (!existsSync(configPath)) {
    reporter.error(`Configuration file not found: ${configPath}`);
    reporter.tip('Create a warden.toml or specify targets: warden <files> --skill <name>');
    return 1;
  }

  // Load config
  const config = loadWardenConfig(dirname(configPath));

  // Build context from local git
  reporter.startContext('Analyzing uncommitted changes...');
  const context = buildLocalEventContext({
    cwd: repoPath,
    defaultBranch: config.defaults?.defaultBranch,
  });

  const pullRequest = context.pullRequest;
  if (!pullRequest) {
    reporter.error('Failed to build context');
    return 1;
  }

  if (pullRequest.files.length === 0) {
    if (!options.json) {
      const tip = !hasUncommittedChanges(repoPath)
        ? 'Specify a git ref: warden HEAD~3 --skill <name>'
        : undefined;
      reporter.renderEmptyState('No changes found', tip);
      reporter.blank();
    } else {
      console.log(renderJsonReport([]));
    }
    return 0;
  }

  reporter.contextFiles(pullRequest.files);

  reporter.step('Loading configuration...');
  reporter.success(`Loaded ${config.triggers.length} ${pluralize(config.triggers.length, 'trigger')}`);

  // Resolve triggers with defaults and match
  const resolvedTriggers = config.triggers.map((t) => resolveTrigger(t, config, options.model));
  const matchedTriggers = resolvedTriggers.filter((t) => matchTrigger(t, context));

  // Filter by skill if specified
  const triggersToRun = options.skill
    ? matchedTriggers.filter((t) => t.skill === options.skill)
    : matchedTriggers;

  if (triggersToRun.length === 0) {
    if (!options.json) {
      reporter.blank();
      if (options.skill) {
        reporter.warning(`No triggers matched for skill: ${options.skill}`);
      } else {
        reporter.warning('No triggers matched for the changed files');
      }
    } else {
      console.log(renderJsonReport([]));
    }
    return 0;
  }

  reporter.success(`${triggersToRun.length} ${pluralize(triggersToRun.length, 'trigger')} matched`);
  reporter.blank();

  // Check for API key
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    reporter.error('WARDEN_ANTHROPIC_API_KEY environment variable is required');
    return 1;
  }

  // Build trigger tasks
  const tasks: SkillTaskOptions[] = triggersToRun.map((trigger) => ({
    name: trigger.name,
    displayName: `${trigger.name} (${trigger.skill})`,
    failOn: trigger.output.failOn ?? options.failOn,
    resolveSkill: () => resolveSkillAsync(trigger.skill, repoPath, config.skills),
    context,
    runnerOptions: {
      apiKey,
      model: trigger.model,
      abortController,
      maxTurns: trigger.maxTurns ?? config.defaults?.maxTurns,
    },
  }));

  // Run triggers with listr2
  const concurrency = options.parallel ?? config.runner?.concurrency ?? DEFAULT_CONCURRENCY;
  const results = await runSkillTasks(tasks, {
    mode: reporter.mode,
    verbosity: reporter.verbosity,
    concurrency,
  });

  // Collect reports and check for failures
  const reports: SkillReport[] = [];
  let hasFailure = false;
  const failureReasons: string[] = [];

  for (const result of results) {
    if (result.report) {
      reports.push(result.report);
      // Check failure condition
      if (result.failOn && shouldFail(result.report, result.failOn)) {
        hasFailure = true;
        const count = countFindingsAtOrAbove(result.report, result.failOn);
        failureReasons.push(`${result.name}: ${count} ${result.failOn}+ severity ${pluralize(count, 'issue')}`);
      }
    }
  }

  // Filter reports for output based on commentOn threshold
  const filteredReports = filterReportsBySeverity(reports, options.commentOn);

  // Calculate total duration
  const totalDuration = Date.now() - startTime;

  // Write JSONL output if requested (uses unfiltered reports for complete data)
  if (options.output) {
    writeJsonlReport(options.output, reports, totalDuration);
    reporter.success(`Wrote JSONL output to ${options.output}`);
  }

  // Always write automatic run log for debugging
  const runLogPath = getRunLogPath(repoPath);
  writeJsonlReport(runLogPath, reports, totalDuration);
  reporter.debug(`Run log: ${runLogPath}`);

  // Output results
  reporter.blank();
  if (options.json) {
    console.log(renderJsonReport(filteredReports));
  } else {
    console.log(renderTerminalReport(filteredReports, reporter.mode));
  }

  // Show summary (uses filtered reports for display)
  reporter.blank();
  reporter.renderSummary(filteredReports, totalDuration);

  // Handle fixes (uses filtered reports - only show fixes for visible findings)
  const fixableFindings = collectFixableFindings(filteredReports);
  if (fixableFindings.length > 0) {
    if (options.fix) {
      // --fix mode: apply all fixes automatically
      const fixSummary = applyAllFixes(fixableFindings);
      renderFixSummary(fixSummary, reporter);
    } else if (
      !options.json &&
      reporter.verbosity !== Verbosity.Quiet &&
      reporter.mode.isTTY
    ) {
      // Interactive mode: prompt user
      const fixSummary = await runInteractiveFixFlow(fixableFindings, reporter);
      renderFixSummary(fixSummary, reporter);
    }
  }

  // Determine exit code (based on original reports, not filtered)
  if (hasFailure) {
    reporter.blank();
    reporter.error(`Failing due to: ${failureReasons.join(', ')}`);
    return 1;
  }

  return 0;
}

/**
 * Run in direct skill mode: run a specific skill on uncommitted changes.
 * Used when --skill is specified without targets.
 */
async function runDirectSkillMode(options: CLIOptions, reporter: Reporter): Promise<number> {
  const cwd = process.cwd();
  let repoPath: string;

  // Find repo root
  try {
    repoPath = getRepoRoot(cwd);
  } catch {
    reporter.error('Not a git repository');
    return 1;
  }

  // Load environment variables from .env files
  loadEnvFiles(repoPath);

  // Load config to get defaultBranch if available
  const configPath = options.config
    ? resolve(cwd, options.config)
    : resolve(repoPath, 'warden.toml');
  const config = existsSync(configPath) ? loadWardenConfig(dirname(configPath)) : null;

  // Build context from local git - compare against HEAD for true uncommitted changes
  reporter.startContext('Analyzing uncommitted changes...');
  const context = buildLocalEventContext({
    base: 'HEAD',
    cwd: repoPath,
    defaultBranch: config?.defaults?.defaultBranch,
  });

  const pullRequest = context.pullRequest;
  if (!pullRequest) {
    reporter.error('Failed to build context');
    return 1;
  }

  if (pullRequest.files.length === 0) {
    if (!options.json) {
      const tip = 'Specify a git ref to analyze committed changes: warden main --skill <name>';
      reporter.renderEmptyState('No uncommitted changes found', tip);
      reporter.blank();
    } else {
      console.log(renderJsonReport([]));
    }
    return 0;
  }

  reporter.contextFiles(pullRequest.files);

  return runSkills(context, options, reporter);
}

async function runCommand(options: CLIOptions, reporter: Reporter): Promise<number> {
  // No targets with --skill → run skill directly on uncommitted changes
  if ((!options.targets || options.targets.length === 0) && options.skill) {
    return runDirectSkillMode(options, reporter);
  }

  // No targets → config mode (use triggers)
  if (!options.targets || options.targets.length === 0) {
    return runConfigMode(options, reporter);
  }

  // Classify targets
  const { gitRefs, filePatterns } = classifyTargets(options.targets);

  // Can't mix git refs and file patterns
  if (gitRefs.length > 0 && filePatterns.length > 0) {
    reporter.error('Cannot mix git refs and file patterns');
    reporter.debug(`Git refs: ${gitRefs.join(', ')}`);
    reporter.debug(`Files: ${filePatterns.join(', ')}`);
    return 1;
  }

  // Multiple git refs not supported (yet)
  if (gitRefs.length > 1) {
    reporter.error('Only one git ref can be specified');
    return 1;
  }

  // Git ref mode
  const gitRef = gitRefs[0];
  if (gitRef) {
    return runGitRefMode(gitRef, options, reporter);
  }

  // File mode
  return runFileMode(filePatterns, options, reporter);
}

export async function main(): Promise<void> {
  const { command, options, setupAppOptions } = parseCliArgs();

  if (command === 'help') {
    showHelp();
    process.exit(0);
  }

  if (command === 'version') {
    showVersion();
    process.exit(0);
  }

  // Create reporter based on options
  const reporter = createReporter(options);

  // Show header (unless JSON output or quiet)
  if (!options.json) {
    reporter.header();
  }

  let exitCode: number;

  if (command === 'init') {
    exitCode = await runInit(options, reporter);
  } else if (command === 'add') {
    exitCode = await runAdd(options, reporter);
  } else if (command === 'setup-app') {
    if (!setupAppOptions) {
      reporter.error('Missing setup-app options');
      process.exit(1);
    }
    exitCode = await runSetupApp(setupAppOptions, reporter);
  } else {
    exitCode = await runCommand(options, reporter);
  }

  process.exit(exitCode);
}
