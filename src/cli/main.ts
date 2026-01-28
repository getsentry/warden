import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { config as dotenvConfig } from 'dotenv';
import { loadWardenConfig, resolveTrigger } from '../config/loader.js';
import type { SkillDefinition } from '../config/schema.js';
import { runSkill } from '../sdk/runner.js';
import { resolveSkillAsync, getBuiltinSkillNames } from '../skills/loader.js';
import { matchTrigger, shouldFail, countFindingsAtOrAbove } from '../triggers/matcher.js';
import type { SkillReport } from '../types/index.js';
import { DEFAULT_CONCURRENCY } from '../utils/index.js';
import { parseCliArgs, showHelp, classifyTargets, type CLIOptions } from './args.js';
import { buildLocalEventContext, buildFileEventContext } from './context.js';
import { getRepoRoot, refExists, hasUncommittedChanges } from './git.js';
import { renderTerminalReport, renderJsonReport } from './terminal.js';
import {
  Reporter,
  detectOutputMode,
  parseVerbosity,
  Verbosity,
  runSkillTasks,
  type SkillTaskOptions,
} from './output/index.js';
import {
  collectFixableFindings,
  applyAllFixes,
  runInteractiveFixFlow,
  renderFixSummary,
} from './fix.js';
import { runInit } from './commands/init.js';

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
 * Otherwise, runs all built-in skills.
 */
async function runSkills(
  context: Awaited<ReturnType<typeof buildLocalEventContext>>,
  options: CLIOptions,
  reporter: Reporter
): Promise<number> {
  const cwd = process.cwd();
  const startTime = Date.now();

  // Check for API key
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    reporter.error('ANTHROPIC_API_KEY environment variable is required');
    return 1;
  }

  // Determine which skills to run
  let skillNames: string[];
  if (options.skill) {
    skillNames = [options.skill];
  } else {
    skillNames = await getBuiltinSkillNames();
    if (skillNames.length === 0) {
      reporter.error('No built-in skills found');
      return 1;
    }
    reporter.success(`Found ${skillNames.length} skill(s): ${skillNames.join(', ')}`);
    reporter.blank();
  }

  // Try to load config for custom skills
  let customSkillsDir: string | undefined;
  let skillsConfig: SkillDefinition[] | undefined;

  try {
    const repoPath = getRepoRoot(cwd);
    customSkillsDir = join(repoPath, '.warden', 'skills');
    const configPath = options.config
      ? resolve(cwd, options.config)
      : resolve(repoPath, 'warden.toml');
    if (existsSync(configPath)) {
      const config = loadWardenConfig(dirname(configPath));
      skillsConfig = config.skills;
    }
  } catch {
    // Not in a git repo or no config - that's fine
  }

  // Build skill tasks
  const tasks: SkillTaskOptions[] = skillNames.map((skillName) => ({
    name: skillName,
    failOn: options.failOn,
    run: async (callbacks) => {
      const skill = await resolveSkillAsync(skillName, customSkillsDir, skillsConfig);
      return runSkill(skill, context, { apiKey, callbacks });
    },
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
        failureReasons.push(`${result.name}: ${count} ${result.failOn}+ severity issue(s)`);
      }
    }
  }

  // Output results
  reporter.blank();
  if (options.json) {
    console.log(renderJsonReport(reports));
  } else {
    console.log(renderTerminalReport(reports, reporter.mode));
  }

  // Show summary
  const totalDuration = Date.now() - startTime;
  reporter.blank();
  reporter.renderSummary(reports, totalDuration);

  // Handle fixes
  const fixableFindings = collectFixableFindings(reports);
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

  // Determine exit code
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

  reporter.success(`Found ${pullRequest.files.length} file(s)`);
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

  // Build context from local git
  reporter.startContext(`Analyzing changes from ${gitRef}...`);
  const context = buildLocalEventContext({
    base,
    head,
    cwd: repoPath,
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

  // Build context from local git
  reporter.startContext('Analyzing uncommitted changes...');
  const context = buildLocalEventContext({
    cwd: repoPath,
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

  // Load config
  reporter.step('Loading configuration...');
  const config = loadWardenConfig(dirname(configPath));
  reporter.success(`Loaded ${config.triggers.length} trigger(s)`);

  // Resolve triggers with defaults and match
  const resolvedTriggers = config.triggers.map((t) => resolveTrigger(t, config));
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

  reporter.success(`${triggersToRun.length} trigger(s) matched`);
  reporter.blank();

  // Check for API key
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    reporter.error('ANTHROPIC_API_KEY environment variable is required');
    return 1;
  }

  // Build trigger tasks
  const customSkillsDir = join(repoPath, '.warden', 'skills');
  const tasks: SkillTaskOptions[] = triggersToRun.map((trigger) => ({
    name: trigger.name,
    displayName: `${trigger.name} (${trigger.skill})`,
    failOn: trigger.output.failOn ?? options.failOn,
    run: async (callbacks) => {
      const skill = await resolveSkillAsync(trigger.skill, customSkillsDir, config.skills);
      return runSkill(skill, context, { apiKey, model: trigger.model, callbacks });
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
        failureReasons.push(`${result.name}: ${count} ${result.failOn}+ severity issue(s)`);
      }
    }
  }

  // Output results
  reporter.blank();
  if (options.json) {
    console.log(renderJsonReport(reports));
  } else {
    console.log(renderTerminalReport(reports, reporter.mode));
  }

  // Show summary
  const totalDuration = Date.now() - startTime;
  reporter.blank();
  reporter.renderSummary(reports, totalDuration);

  // Handle fixes
  const fixableFindings = collectFixableFindings(reports);
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

  // Determine exit code
  if (hasFailure) {
    reporter.blank();
    reporter.error(`Failing due to: ${failureReasons.join(', ')}`);
    return 1;
  }

  return 0;
}

async function runCommand(options: CLIOptions, reporter: Reporter): Promise<number> {
  // No targets → config mode
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
  const { command, options } = parseCliArgs();

  if (command === 'help') {
    showHelp();
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
  } else {
    exitCode = await runCommand(options, reporter);
  }

  process.exit(exitCode);
}
