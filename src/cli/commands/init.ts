import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import chalk from 'chalk';
import { getRepoRoot, getGitHubRepoUrl } from '../git.js';
import type { Reporter } from '../output/reporter.js';
import type { CLIOptions } from '../args.js';
import { getMajorVersion } from '../../utils/index.js';

/**
 * Template for warden.toml configuration file.
 */
function generateWardenToml(): string {
  return `# Warden Configuration
# https://github.com/getsentry/warden
#
# Warden reviews code using AI-powered skills triggered by GitHub events.
# Skills live in .agents/skills/ or .claude/skills/
#
# Add skills with: warden add <skill-name>

version = 1

# Default settings inherited by all skills
[defaults]
# Severity levels: critical, high, medium, low, info
# failOn: minimum severity that fails the check
failOn = "high"
# reportOn: minimum severity that creates PR annotations
reportOn = "medium"

# Skills define what to analyze and when to run
# Add skills with: warden add <skill-name>
#
# Example skill with path filters and triggers:
#
# [[skills]]
# name = "security-review"
# paths = ["src/**/*.ts", "src/**/*.tsx"]
# ignorePaths = ["**/*.test.ts", "**/__fixtures__/**"]
#
# [[skills.triggers]]
# type = "pull_request"
# actions = ["opened", "synchronize", "reopened"]
`;
}

/**
 * Template for GitHub Actions workflow file.
 */
function generateWorkflowYaml(): string {
  const majorVersion = getMajorVersion();
  return `name: Warden

on:
  pull_request:
    types: [opened, synchronize, reopened]

# contents: write required for resolving review threads via GraphQL
# See: https://github.com/orgs/community/discussions/44650
permissions:
  contents: write
  pull-requests: write
  checks: write

jobs:
  review:
    runs-on: ubuntu-latest
    env:
      WARDEN_MODEL: \${{ secrets.WARDEN_MODEL }}
      WARDEN_SENTRY_DSN: \${{ secrets.WARDEN_SENTRY_DSN }}
    steps:
      - uses: actions/checkout@v4
      - uses: getsentry/warden@v${majorVersion}
        with:
          anthropic-api-key: \${{ secrets.WARDEN_ANTHROPIC_API_KEY }}
`;
}

/**
 * Check for existing warden configuration files.
 */
function checkExistingFiles(repoRoot: string): {
  hasWardenToml: boolean;
  hasWorkflow: boolean;
} {
  const wardenTomlPath = join(repoRoot, 'warden.toml');
  const workflowPath = join(repoRoot, '.github', 'workflows', 'warden.yml');

  return {
    hasWardenToml: existsSync(wardenTomlPath),
    hasWorkflow: existsSync(workflowPath),
  };
}

export interface InitOptions {
  force: boolean;
}

/**
 * Run the init command to scaffold warden configuration.
 */
export async function runInit(options: CLIOptions, reporter: Reporter): Promise<number> {
  const cwd = process.cwd();

  // Find repo root
  let repoRoot: string;
  try {
    repoRoot = getRepoRoot(cwd);
  } catch {
    reporter.error('Not a git repository. Run this command from a git repository.');
    return 1;
  }

  // Check for existing files
  const existing = checkExistingFiles(repoRoot);

  let filesCreated = 0;

  // Create warden.toml
  const wardenTomlPath = join(repoRoot, 'warden.toml');
  if (existing.hasWardenToml && !options.force) {
    reporter.skipped(relative(cwd, wardenTomlPath), 'already exists');
  } else {
    const content = generateWardenToml();
    writeFileSync(wardenTomlPath, content, 'utf-8');
    reporter.created(relative(cwd, wardenTomlPath));
    filesCreated++;
  }

  // Create .github/workflows directory if needed
  const workflowDir = join(repoRoot, '.github', 'workflows');
  if (!existsSync(workflowDir)) {
    mkdirSync(workflowDir, { recursive: true });
  }

  // Create workflow file
  const workflowPath = join(workflowDir, 'warden.yml');
  if (existing.hasWorkflow && !options.force) {
    reporter.skipped(relative(cwd, workflowPath), 'already exists');
  } else {
    const content = generateWorkflowYaml();
    writeFileSync(workflowPath, content, 'utf-8');
    reporter.created(relative(cwd, workflowPath));
    filesCreated++;
  }

  // Ensure .warden/logs/ is in .gitignore
  const gitignorePath = join(repoRoot, '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
    const hasEntry = gitignoreContent.split('\n').some((line) => line.trim() === '.warden/logs/');
    if (!hasEntry) {
      const newline = gitignoreContent.endsWith('\n') ? '' : '\n';
      writeFileSync(gitignorePath, gitignoreContent + newline + '.warden/logs/\n', 'utf-8');
      reporter.created('.gitignore entry for .warden/logs/');
      filesCreated++;
    }
  } else {
    writeFileSync(gitignorePath, '.warden/logs/\n', 'utf-8');
    reporter.created('.gitignore with .warden/logs/');
    filesCreated++;
  }

  if (filesCreated === 0) {
    reporter.blank();
    reporter.tip('All configuration files already exist. Use --force to overwrite.');
    return 0;
  }

  // Print next steps
  reporter.blank();
  reporter.bold('Next steps:');
  reporter.text(`  1. Add a skill: ${chalk.cyan('warden add <skill-name>')}`);
  reporter.text(`  2. Set ${chalk.cyan('WARDEN_ANTHROPIC_API_KEY')} in .env.local`);
  reporter.text(`  3. Add ${chalk.cyan('WARDEN_ANTHROPIC_API_KEY')} to organization or repository secrets`);

  // Show GitHub secrets URL if available
  const githubUrl = getGitHubRepoUrl(repoRoot);
  if (githubUrl) {
    reporter.text(`     ${chalk.dim(githubUrl + '/settings/secrets/actions')}`);
  }

  reporter.text('  4. Commit and open a PR to test');

  return 0;
}
