import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import chalk from 'chalk';
import { getRepoRoot, getGitHubRepoUrl } from '../git.js';
import { getBuiltinSkillNames } from '../../skills/loader.js';
import type { Reporter } from '../output/reporter.js';
import type { CLIOptions } from '../args.js';

/**
 * Template for warden.toml configuration file.
 */
function generateWardenToml(skill: string): string {
  return `version = 1

[[triggers]]
name = "${skill}"
event = "pull_request"
actions = ["opened", "synchronize", "reopened"]
skill = "${skill}"
`;
}

/**
 * Template for GitHub Actions workflow file.
 */
function generateWorkflowYaml(): string {
  return `name: Warden

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: getsentry/warden@main
        with:
          anthropic-api-key: \${{ secrets.ANTHROPIC_API_KEY }}
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
  skill?: string;
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

  // Determine skill (default to security-review)
  const skill = options.skill ?? 'security-review';

  // Validate skill exists (warn if not a builtin)
  const builtinSkills = await getBuiltinSkillNames();
  if (!builtinSkills.includes(skill)) {
    reporter.warning(
      `'${skill}' is not a built-in skill. Available: ${builtinSkills.join(', ')}`
    );
  }

  let filesCreated = 0;

  // Create warden.toml
  const wardenTomlPath = join(repoRoot, 'warden.toml');
  if (existing.hasWardenToml && !options.force) {
    reporter.skipped(relative(cwd, wardenTomlPath), 'already exists');
  } else {
    const content = generateWardenToml(skill);
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

  if (filesCreated === 0) {
    reporter.blank();
    reporter.tip('All configuration files already exist. Use --force to overwrite.');
    return 0;
  }

  // Print next steps
  reporter.blank();
  reporter.bold('Next steps:');
  reporter.text(`  1. Set ${chalk.cyan('ANTHROPIC_API_KEY')} in .env.local`);
  reporter.text(`  2. Add ${chalk.cyan('ANTHROPIC_API_KEY')} to repository secrets`);

  // Show GitHub secrets URL if available
  const githubUrl = getGitHubRepoUrl(repoRoot);
  if (githubUrl) {
    reporter.text(`     ${chalk.dim(githubUrl + '/settings/secrets/actions')}`);
  }

  reporter.text('  3. Commit and open a PR to test');

  return 0;
}
