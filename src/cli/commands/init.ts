import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import figures from 'figures';
import { getRepoRoot, getGitHubRepoUrl } from '../git.js';
import { readSingleKey } from '../input.js';
import { ICON_CHECK, ICON_SKIPPED } from '../output/icons.js';
import type { Reporter } from '../output/reporter.js';
import type { CLIOptions } from '../args.js';
import { getMajorVersion } from '../../utils/index.js';

/**
 * Render a section heading in the init output.
 */
function renderSection(
  reporter: Reporter,
  title: string,
  filepath: string,
  description: string,
): void {
  if (reporter.mode.isTTY) {
    reporter.text(chalk.bold(title) + chalk.dim(`  ${filepath}`));
    reporter.text(`  ${chalk.dim(description)}`);
  } else {
    reporter.text(`${title}: ${filepath}`);
    reporter.text(`  ${description}`);
  }
}

function renderCreated(reporter: Reporter, detail?: string): void {
  if (reporter.mode.isTTY) {
    const suffix = detail ? ` ${chalk.dim(detail)}` : '';
    reporter.text(`  ${chalk.green(ICON_CHECK)} Created${suffix}`);
  } else {
    const suffix = detail ? ` ${detail}` : '';
    reporter.text(`  Created${suffix}`);
  }
}

function renderSkipped(reporter: Reporter, reason: string): void {
  if (reporter.mode.isTTY) {
    reporter.text(`  ${chalk.yellow(ICON_SKIPPED)} Skipped ${chalk.dim(`(${reason})`)}`);
  } else {
    reporter.text(`  Skipped (${reason})`);
  }
}

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

/**
 * Resolve the warden package root directory from the compiled/source location.
 * Works from both src/cli/commands/init.ts and dist/cli/commands/init.js (3 levels up).
 */
function resolvePackageRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  return join(dirname(__filename), '..', '..', '..');
}

/**
 * Resolve the bundled skills directory shipped with the warden package.
 * Returns null if the directory doesn't exist (e.g., running from a non-standard location).
 */
function resolveBundledSkillsDir(): string | null {
  const dir = join(resolvePackageRoot(), 'skills');
  return existsSync(dir) ? dir : null;
}

/**
 * Install bundled skills into .agents/skills/.
 * Skips skills that already exist unless force is true.
 */
function installBundledSkills(
  repoRoot: string,
  force: boolean,
  reporter: Reporter,
): number {
  const bundledDir = resolveBundledSkillsDir();
  if (!bundledDir) {
    return 0;
  }

  const targetDir = join(repoRoot, '.agents', 'skills');
  mkdirSync(targetDir, { recursive: true });

  let installed = 0;
  const entries = readdirSync(bundledDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillName = entry.name;

    const src = join(bundledDir, skillName);
    const dest = join(targetDir, skillName);

    // Check if destination exists (as file, dir, or symlink)
    let destExists = false;
    try {
      lstatSync(dest);
      destExists = true;
    } catch {
      // doesn't exist
    }

    if (destExists && !force) {
      continue;
    }

    // Remove first to handle symlinks cleanly (cpSync would follow them)
    if (destExists) {
      rmSync(dest, { recursive: true, force: true });
    }

    cpSync(src, dest, { recursive: true });
    reporter.text(`  ${chalk.dim(`.agents/skills/${skillName}`)}`);
    installed++;
  }

  return installed;
}

/**
 * List bundled skill names that would be installed.
 */
function listBundledSkillNames(): string[] {
  const bundledDir = resolveBundledSkillsDir();
  if (!bundledDir) return [];
  return readdirSync(bundledDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

/**
 * Check if any bundled skills are already installed.
 */
function allSkillsInstalled(repoRoot: string): boolean {
  const names = listBundledSkillNames();
  if (names.length === 0) return true;
  const targetDir = join(repoRoot, '.agents', 'skills');
  return names.every((name) => {
    try {
      lstatSync(join(targetDir, name));
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * Ensure .claude/skills symlink points to ../.agents/skills if .claude/ exists.
 */
function ensureClaudeSymlink(repoRoot: string, force: boolean, reporter: Reporter): boolean {
  const claudeDir = join(repoRoot, '.claude');
  if (!existsSync(claudeDir)) return false;

  const skillsLink = join(claudeDir, 'skills');

  // Check if it already exists (file, dir, or symlink — including broken symlinks)
  let linkExists = false;
  try {
    lstatSync(skillsLink);
    linkExists = true;
  } catch {
    // Doesn't exist
  }

  if (linkExists && !force) {
    return false;
  }

  if (linkExists) {
    rmSync(skillsLink, { recursive: true, force: true });
  }

  symlinkSync('../.agents/skills', skillsLink);
  reporter.text(`  ${chalk.dim('.claude/skills -> ../.agents/skills')}`);
  return true;
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
  let skillsSkipped = false;

  // --- CONFIG section ---
  const wardenTomlPath = join(repoRoot, 'warden.toml');
  renderSection(reporter, 'CONFIG', relative(cwd, wardenTomlPath), 'Severity thresholds and skill settings');
  if (existing.hasWardenToml && !options.force) {
    renderSkipped(reporter, 'already exists');
  } else {
    writeFileSync(wardenTomlPath, generateWardenToml(), 'utf-8');
    renderCreated(reporter);
    filesCreated++;
  }
  reporter.blank();

  // --- WORKFLOW section ---
  const workflowDir = join(repoRoot, '.github', 'workflows');
  if (!existsSync(workflowDir)) {
    mkdirSync(workflowDir, { recursive: true });
  }
  const workflowPath = join(workflowDir, 'warden.yml');
  renderSection(reporter, 'WORKFLOW', relative(cwd, workflowPath), 'Runs Warden on pull requests via GitHub Actions');
  if (existing.hasWorkflow && !options.force) {
    renderSkipped(reporter, 'already exists');
  } else {
    writeFileSync(workflowPath, generateWorkflowYaml(), 'utf-8');
    renderCreated(reporter);
    filesCreated++;
  }
  reporter.blank();

  // --- SKILLS section ---
  const skillNames = listBundledSkillNames();
  const skillPath = join(repoRoot, '.agents', 'skills');
  renderSection(
    reporter,
    'SKILLS',
    relative(cwd, skillPath),
    `Bundled skills for AI agents (${skillNames.join(', ')})`,
  );
  if (allSkillsInstalled(repoRoot) && !options.force) {
    if (ensureClaudeSymlink(repoRoot, false, reporter)) filesCreated++;
    renderSkipped(reporter, 'already installed');
  } else if (options.force) {
    const count = installBundledSkills(repoRoot, true, reporter);
    if (ensureClaudeSymlink(repoRoot, true, reporter)) filesCreated++;
    renderCreated(reporter);
    filesCreated += count;
  } else if (reporter.mode.isTTY && process.stdin.isTTY) {
    process.stderr.write(`  ${chalk.cyan(figures.arrowRight)} Install? ${chalk.dim('[Y/n]')} `);
    const key = await readSingleKey();
    process.stderr.write(key === '\r' || key === '\n' ? 'y' : key);
    process.stderr.write('\n');

    if (key.toLowerCase() !== 'n') {
      const count = installBundledSkills(repoRoot, false, reporter);
      if (ensureClaudeSymlink(repoRoot, false, reporter)) filesCreated++;
      renderCreated(reporter);
      filesCreated += count;
    } else {
      skillsSkipped = true;
      renderSkipped(reporter, 'declined');
    }
  } else {
    skillsSkipped = true;
    renderSkipped(reporter, 'non-interactive');
  }
  reporter.blank();

  // Ensure .warden/ is in .gitignore (silent housekeeping)
  const gitignorePath = join(repoRoot, '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
    const lines = gitignoreContent.split('\n');
    const hasWardenEntry = lines.some((line) => {
      const trimmed = line.trim();
      return trimmed === '.warden/' || trimmed === '.warden';
    });
    if (!hasWardenEntry) {
      // Remove old specific entries that are superseded by .warden/
      const oldPatterns = new Set(['.warden/logs/', '.warden/logs', '.warden/sessions/', '.warden/sessions']);
      const cleaned = lines.filter((line) => !oldPatterns.has(line.trim()));
      const cleanedContent = cleaned.join('\n');
      const newline = cleanedContent.endsWith('\n') ? '' : '\n';
      writeFileSync(gitignorePath, cleanedContent + newline + '.warden/\n', 'utf-8');
      filesCreated++;
    }
  } else {
    writeFileSync(gitignorePath, '.warden/\n', 'utf-8');
    filesCreated++;
  }

  if (filesCreated === 0 && !skillsSkipped) {
    reporter.tip('All configuration files already exist. Use --force to overwrite.');
    return 0;
  }

  if (filesCreated === 0) {
    return 0;
  }

  // Print next steps
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
