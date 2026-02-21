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
import { getRepoRoot, getGitHubRepoUrl } from '../git.js';
import type { Reporter } from '../output/reporter.js';
import type { CLIOptions } from '../args.js';
import { getMajorVersion } from '../../utils/index.js';
import { appendSkill } from '../../config/index.js';
import { discoverAllSkills } from '../../skills/loader.js';

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
 * Returns the set of all bundled skill names (regardless of whether they were installed or skipped).
 */
function installBundledSkills(
  repoRoot: string,
  force: boolean,
  reporter: Reporter,
): { installed: number; names: Set<string> } {
  const names = new Set<string>();
  const bundledDir = resolveBundledSkillsDir();
  if (!bundledDir) {
    return { installed: 0, names };
  }

  const targetDir = join(repoRoot, '.agents', 'skills');
  mkdirSync(targetDir, { recursive: true });

  let installed = 0;
  const entries = readdirSync(bundledDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillName = entry.name;
    names.add(skillName);

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
      reporter.skipped(`.agents/skills/${skillName}`, 'already installed');
      continue;
    }

    // Remove first to handle symlinks cleanly (cpSync would follow them)
    if (destExists) {
      rmSync(dest, { recursive: true, force: true });
    }

    cpSync(src, dest, { recursive: true });
    reporter.created(`.agents/skills/${skillName}`);
    installed++;
  }

  return { installed, names };
}

/**
 * Ensure .claude/skills symlink points to ../.agents/skills if .claude/ exists.
 */
function ensureClaudeSymlink(repoRoot: string, reporter: Reporter): boolean {
  const claudeDir = join(repoRoot, '.claude');
  if (!existsSync(claudeDir)) return false;

  const skillsLink = join(claudeDir, 'skills');

  // Check if it already exists (file, dir, or symlink — including broken symlinks)
  try {
    lstatSync(skillsLink);
    reporter.skipped('.claude/skills', 'already exists');
    return false;
  } catch {
    // Doesn't exist — create it
  }

  symlinkSync('../.agents/skills', skillsLink);
  reporter.created('.claude/skills -> ../.agents/skills');
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

  // Ensure .warden/ is in .gitignore (migrating old .warden/logs/ entries)
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
      reporter.created('.gitignore entry for .warden/');
      filesCreated++;
    }
  } else {
    writeFileSync(gitignorePath, '.warden/\n', 'utf-8');
    reporter.created('.gitignore with .warden/');
    filesCreated++;
  }

  // Install bundled skills into .agents/skills/
  const { installed: skillsInstalled, names: bundledSkillNames } =
    installBundledSkills(repoRoot, options.force, reporter);
  filesCreated += skillsInstalled;

  // Symlink .claude/skills -> ../.agents/skills if .claude/ directory exists
  if (ensureClaudeSymlink(repoRoot, reporter)) {
    filesCreated++;
  }

  // Auto-register non-bundled analysis skills found in the repo
  const skills = await discoverAllSkills(repoRoot, {
    onWarning: (message) => reporter.warning(message),
  });

  let skillsAdded = 0;
  const analysisSkills = [...skills.keys()].filter((name) => !bundledSkillNames.has(name));

  if (analysisSkills.length > 0 && existsSync(wardenTomlPath)) {
    const existingToml = readFileSync(wardenTomlPath, 'utf-8');

    reporter.blank();
    for (const name of analysisSkills) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`^name\\s*=\\s*"${escaped}"`, 'm').test(existingToml)) {
        reporter.skipped(`Skill '${name}'`, 'already in config');
        continue;
      }
      try {
        appendSkill(wardenTomlPath, {
          name,
          triggers: [{ type: 'pull_request', actions: ['opened', 'synchronize', 'reopened'] }],
        });
        reporter.success(`Added skill '${name}'`);
        skillsAdded++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        reporter.warning(`Failed to add skill '${name}': ${message}`);
      }
    }
  }

  if (filesCreated === 0 && skillsAdded === 0) {
    reporter.blank();
    reporter.tip('All configuration files already exist. Use --force to overwrite.');
    return 0;
  }

  // Print next steps
  reporter.blank();
  reporter.bold('Next steps:');
  if (skillsAdded === 0) {
    reporter.text(`  1. Add a skill: ${chalk.cyan('warden add <skill-name>')}`);
  } else {
    reporter.text(`  1. Review skills in ${chalk.cyan('warden.toml')} and customize paths/filters`);
  }
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
