import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { config as dotenvConfig } from 'dotenv';
import { loadWardenConfig } from '../config/loader.js';
import type { SkillDefinition } from '../config/schema.js';
import { runSkill } from '../sdk/runner.js';
import { resolveSkillAsync, getBuiltinSkillNames } from '../skills/loader.js';
import { matchTrigger, shouldFail, countFindingsAtOrAbove } from '../triggers/matcher.js';
import type { SkillReport } from '../types/index.js';
import { processInBatches, DEFAULT_CONCURRENCY } from '../utils/index.js';
import { parseCliArgs, showHelp, classifyTargets, type CLIOptions } from './args.js';
import { buildLocalEventContext, buildFileEventContext } from './context.js';
import { getRepoRoot, refExists, hasUncommittedChanges } from './git.js';
import { renderTerminalReport, renderJsonReport } from './terminal.js';

/**
 * Load environment variables from .env files in the given directory.
 * Loads .env first, then .env.local for local overrides.
 */
function loadEnvFiles(dir: string): void {
  // Load .env first (base config)
  const envPath = join(dir, '.env');
  if (existsSync(envPath)) {
    dotenvConfig({ path: envPath });
  }

  // Load .env.local second (local overrides, typically gitignored)
  const envLocalPath = join(dir, '.env.local');
  if (existsSync(envLocalPath)) {
    dotenvConfig({ path: envLocalPath, override: true });
  }
}

// ANSI color codes for status messages
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message: string): void {
  console.error(message);
}

function logStep(message: string): void {
  console.error(`${COLORS.cyan}>${COLORS.reset} ${message}`);
}

function logSuccess(message: string): void {
  console.error(`${COLORS.green}✓${COLORS.reset} ${message}`);
}

function logWarning(message: string): void {
  console.error(`${COLORS.yellow}!${COLORS.reset} ${message}`);
}

function logError(message: string): void {
  console.error(`${COLORS.red}✗${COLORS.reset} ${message}`);
}

/**
 * Run skills on a context and output results.
 * If skillName is provided, runs only that skill.
 * Otherwise, runs all built-in skills.
 */
async function runSkills(
  context: Awaited<ReturnType<typeof buildLocalEventContext>>,
  options: CLIOptions
): Promise<number> {
  const cwd = process.cwd();

  // Check for API key
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    logError('ANTHROPIC_API_KEY environment variable is required');
    return 1;
  }

  // Determine which skills to run
  let skillNames: string[];
  if (options.skill) {
    skillNames = [options.skill];
  } else {
    skillNames = await getBuiltinSkillNames();
    if (skillNames.length === 0) {
      logError('No built-in skills found');
      return 1;
    }
    logSuccess(`Found ${skillNames.length} skill(s): ${skillNames.join(', ')}`);
    log('');
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

  // Run skills in parallel
  const concurrency = options.parallel ?? DEFAULT_CONCURRENCY;
  const failureReasons: string[] = [];

  interface SkillResult {
    skillName: string;
    report?: SkillReport;
    error?: unknown;
  }

  const runSingleSkill = async (skillName: string): Promise<SkillResult> => {
    logStep(`Running ${skillName}...`);
    try {
      const skill = await resolveSkillAsync(skillName, customSkillsDir, skillsConfig);
      const report = await runSkill(skill, context, { apiKey });
      logSuccess(`${skillName}: Found ${report.findings.length} finding(s)`);
      return { skillName, report };
    } catch (error) {
      logError(`Skill ${skillName} failed: ${error}`);
      return { skillName, error };
    }
  };

  const results = await processInBatches(skillNames, runSingleSkill, concurrency);

  // Collect reports and check for failures
  const reports: SkillReport[] = [];
  let hasFailure = false;

  for (const result of results) {
    if (result.report) {
      reports.push(result.report);
      // Check failure condition
      if (options.failOn && shouldFail(result.report, options.failOn)) {
        hasFailure = true;
        const count = countFindingsAtOrAbove(result.report, options.failOn);
        failureReasons.push(`${result.skillName}: ${count} ${options.failOn}+ severity issue(s)`);
      }
    }
  }

  // Output results
  log('');
  if (options.json) {
    console.log(renderJsonReport(reports));
  } else {
    console.log(renderTerminalReport(reports));
  }

  // Determine exit code
  if (options.failOn && hasFailure) {
    log('');
    logError(`Failing due to: ${failureReasons.join(', ')}`);
    return 1;
  }

  return 0;
}

/**
 * Run in file mode: analyze specific files.
 */
async function runFileMode(filePatterns: string[], options: CLIOptions): Promise<number> {
  const cwd = process.cwd();

  // Load environment variables from .env files if they exist
  loadEnvFiles(cwd);

  // Build context from files
  logStep('Building context from files...');
  const context = await buildFileEventContext({
    patterns: filePatterns,
    cwd,
  });

  const pullRequest = context.pullRequest;
  if (!pullRequest) {
    logError('Failed to build context');
    return 1;
  }

  if (pullRequest.files.length === 0) {
    if (!options.json) {
      log('');
      logWarning('No files matched the given patterns');
    } else {
      console.log(renderJsonReport([]));
    }
    return 0;
  }

  logSuccess(`Found ${pullRequest.files.length} file(s)`);
  log('');

  return runSkills(context, options);
}

/**
 * Parse git ref target into base and head refs.
 * Supports formats: "base..head", "base" (head=working tree)
 */
function parseGitRef(ref: string): { base: string; head?: string } {
  if (ref.includes('..')) {
    const [base, head] = ref.split('..');
    return { base: base || 'HEAD', head: head || undefined };
  }
  return { base: ref };
}

/**
 * Run in git ref mode: analyze changes from a git ref.
 */
async function runGitRefMode(gitRef: string, options: CLIOptions): Promise<number> {
  const cwd = process.cwd();
  let repoPath: string;

  // Find repo root
  try {
    repoPath = getRepoRoot(cwd);
  } catch {
    logError('Not a git repository');
    return 1;
  }

  // Load environment variables from .env files
  loadEnvFiles(repoPath);

  const { base, head } = parseGitRef(gitRef);

  // Validate base ref
  if (!refExists(base, repoPath)) {
    logError(`Git ref does not exist: ${base}`);
    return 1;
  }

  // Validate head ref if specified
  if (head && !refExists(head, repoPath)) {
    logError(`Git ref does not exist: ${head}`);
    return 1;
  }

  // Build context from local git
  logStep(`Building context from git (${gitRef})...`);
  const context = buildLocalEventContext({
    base,
    head,
    cwd: repoPath,
  });

  const pullRequest = context.pullRequest;
  if (!pullRequest) {
    logError('Failed to build context');
    return 1;
  }

  if (pullRequest.files.length === 0) {
    if (!options.json) {
      log('');
      logWarning('No changes found');
    } else {
      console.log(renderJsonReport([]));
    }
    return 0;
  }

  logSuccess(`Found ${pullRequest.files.length} changed file(s)`);
  log('');

  return runSkills(context, options);
}

/**
 * Run in config mode: use warden.toml triggers.
 */
async function runConfigMode(options: CLIOptions): Promise<number> {
  const cwd = process.cwd();
  let repoPath: string;

  // Find repo root
  try {
    repoPath = getRepoRoot(cwd);
  } catch {
    logError('Not a git repository');
    return 1;
  }

  // Load environment variables from .env files
  loadEnvFiles(repoPath);

  // Resolve config path
  const configPath = options.config
    ? resolve(cwd, options.config)
    : resolve(repoPath, 'warden.toml');

  if (!existsSync(configPath)) {
    logError(`Configuration file not found: ${configPath}`);
    log(`${COLORS.dim}Tip: Create a warden.toml or specify targets: warden <files> --skill <name>${COLORS.reset}`);
    return 1;
  }

  // Build context from local git
  logStep('Building context from git...');
  const context = buildLocalEventContext({
    cwd: repoPath,
  });

  const pullRequest = context.pullRequest;
  if (!pullRequest) {
    logError('Failed to build context');
    return 1;
  }

  if (pullRequest.files.length === 0) {
    if (!options.json) {
      log('');
      logWarning('No changes found');
      if (!hasUncommittedChanges(repoPath)) {
        log(`${COLORS.dim}Tip: Specify a git ref: warden HEAD~3 --skill <name>${COLORS.reset}`);
      }
    } else {
      console.log(renderJsonReport([]));
    }
    return 0;
  }

  logSuccess(`Found ${pullRequest.files.length} changed file(s)`);

  // Load config
  logStep('Loading configuration...');
  const config = loadWardenConfig(dirname(configPath));
  logSuccess(`Loaded ${config.triggers.length} trigger(s)`);

  // Match triggers
  const matchedTriggers = config.triggers.filter((t) => matchTrigger(t, context));

  // Filter by skill if specified
  const triggersToRun = options.skill
    ? matchedTriggers.filter((t) => t.skill === options.skill)
    : matchedTriggers;

  if (triggersToRun.length === 0) {
    if (!options.json) {
      log('');
      if (options.skill) {
        logWarning(`No triggers matched for skill: ${options.skill}`);
      } else {
        logWarning('No triggers matched for the changed files');
      }
    } else {
      console.log(renderJsonReport([]));
    }
    return 0;
  }

  logSuccess(`${triggersToRun.length} trigger(s) matched`);
  log('');

  // Check for API key
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    logError('ANTHROPIC_API_KEY environment variable is required');
    return 1;
  }

  // Run triggers in parallel
  const concurrency = options.parallel ?? config.runner?.concurrency ?? DEFAULT_CONCURRENCY;
  const customSkillsDir = join(repoPath, '.warden', 'skills');
  const failureReasons: string[] = [];

  interface TriggerResult {
    triggerName: string;
    report?: SkillReport;
    failOn?: typeof options.failOn;
    error?: unknown;
  }

  const runSingleTrigger = async (trigger: typeof triggersToRun[number]): Promise<TriggerResult> => {
    logStep(`Running ${trigger.name} (${trigger.skill})...`);
    try {
      const skill = await resolveSkillAsync(trigger.skill, customSkillsDir, config.skills);
      const report = await runSkill(skill, context, { apiKey, model: trigger.model });
      logSuccess(`${trigger.name}: Found ${report.findings.length} finding(s)`);
      return { triggerName: trigger.name, report, failOn: trigger.output?.failOn ?? options.failOn };
    } catch (error) {
      logError(`Trigger ${trigger.name} failed: ${error}`);
      return { triggerName: trigger.name, error };
    }
  };

  const results = await processInBatches(triggersToRun, runSingleTrigger, concurrency);

  // Collect reports and check for failures
  const reports: SkillReport[] = [];
  let hasFailure = false;

  for (const result of results) {
    if (result.report) {
      reports.push(result.report);
      // Check failure condition
      if (result.failOn && shouldFail(result.report, result.failOn)) {
        hasFailure = true;
        const count = countFindingsAtOrAbove(result.report, result.failOn);
        failureReasons.push(`${result.triggerName}: ${count} ${result.failOn}+ severity issue(s)`);
      }
    }
  }

  // Output results
  log('');
  if (options.json) {
    console.log(renderJsonReport(reports));
  } else {
    console.log(renderTerminalReport(reports));
  }

  // Determine exit code
  if (options.failOn && hasFailure) {
    log('');
    logError(`Failing due to: ${failureReasons.join(', ')}`);
    return 1;
  }

  return 0;
}

async function runCommand(options: CLIOptions): Promise<number> {
  // No targets → config mode
  if (!options.targets || options.targets.length === 0) {
    return runConfigMode(options);
  }

  // Classify targets
  const { gitRefs, filePatterns } = classifyTargets(options.targets);

  // Can't mix git refs and file patterns
  if (gitRefs.length > 0 && filePatterns.length > 0) {
    logError('Cannot mix git refs and file patterns');
    log(`${COLORS.dim}Git refs: ${gitRefs.join(', ')}${COLORS.reset}`);
    log(`${COLORS.dim}Files: ${filePatterns.join(', ')}${COLORS.reset}`);
    return 1;
  }

  // Multiple git refs not supported (yet)
  if (gitRefs.length > 1) {
    logError('Only one git ref can be specified');
    return 1;
  }

  // Git ref mode
  const gitRef = gitRefs[0];
  if (gitRef) {
    return runGitRefMode(gitRef, options);
  }

  // File mode
  return runFileMode(filePatterns, options);
}

export async function main(): Promise<void> {
  const { command, options } = parseCliArgs();

  if (command === 'help') {
    showHelp();
    process.exit(0);
  }

  const exitCode = await runCommand(options);
  process.exit(exitCode);
}
