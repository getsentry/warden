import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import chalk from 'chalk';
import figures from 'figures';
import select from '@inquirer/select';
import { getRepoRoot } from '../git.js';
import { loadWardenConfig, appendTrigger } from '../../config/index.js';
import type { Trigger } from '../../config/schema.js';
import { discoverAllSkills, type DiscoveredSkill } from '../../skills/loader.js';
import type { Reporter } from '../output/reporter.js';
import type { CLIOptions } from '../args.js';

/** Custom theme for select prompts - white for selected, gray for unselected */
const selectTheme = {
  prefix: {
    idle: '',
    done: '',
  },
  icon: {
    cursor: chalk.white('›'),
  },
  style: {
    message: () => '', // We print heading separately
    highlight: (text: string) => chalk.white(text),
    disabled: (text: string) => chalk.dim(text),
    description: (text: string) => chalk.white(text),
    keysHelpTip: (keys: [key: string, action: string][]) => {
      const keyStr = keys.map(([key, action]) => `${key} ${action}`).join(', ');
      return `\n${chalk.dim(keyStr)}`;
    },
  },
};

/**
 * Render the list of available skills.
 */
function renderSkillList(
  skills: Map<string, DiscoveredSkill>,
  configuredSkills: Set<string>,
  reporter: Reporter
): void {
  reporter.bold('Available Skills');
  reporter.blank();

  // Sort skills alphabetically by name
  const sortedSkills = Array.from(skills.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  for (const [name, discovered] of sortedSkills) {
    const isConfigured = configuredSkills.has(name);
    const dirTag = chalk.dim(`[${discovered.directory}]`);
    const configuredTag = isConfigured ? chalk.dim(' (already configured)') : '';

    if (reporter.mode.isTTY) {
      const icon = isConfigured ? chalk.dim(figures.tick) : ' ';
      reporter.text(`  ${icon} ${chalk.bold(name)} ${dirTag}${configuredTag}`);
      reporter.text(`    ${chalk.dim(discovered.skill.description)}`);
    } else {
      const status = isConfigured ? '[configured]' : '';
      reporter.text(`${name} ${status} [${discovered.directory}]`);
      reporter.text(`  ${discovered.skill.description}`);
    }
  }
}

/**
 * Prompt user to select a skill interactively.
 */
async function promptSkillSelection(
  skills: Map<string, DiscoveredSkill>,
  configuredSkills: Set<string>,
  reporter: Reporter,
): Promise<string | null> {
  // Filter out already configured skills for selection
  const availableSkills = Array.from(skills.entries())
    .filter(([name]) => !configuredSkills.has(name))
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (availableSkills.length === 0) {
    reporter.warning('All available skills are already configured.');
    return null;
  }

  const choices = availableSkills.map(([name, discovered]) => {
    return {
      name: `${name} ${chalk.dim(`[${discovered.directory}]`)}`,
      value: name,
      description: discovered.skill.description,
    };
  });

  reporter.bold('ADD SKILL');
  reporter.blank();

  try {
    const answer = await select({
      message: '',
      choices,
      theme: selectTheme,
    });
    // Clear the inquirer "done" line
    process.stderr.write('\x1b[1A\x1b[2K');
    return answer;
  } catch {
    // User cancelled (Ctrl+C or escape)
    return null;
  }
}

/**
 * Create a default trigger for a skill.
 */
function createDefaultTrigger(skillName: string): Trigger {
  return {
    name: skillName,
    event: 'pull_request',
    actions: ['opened', 'synchronize', 'reopened'],
    skill: skillName,
  };
}

/**
 * Run the add command.
 */
export async function runAdd(options: CLIOptions, reporter: Reporter): Promise<number> {
  const cwd = process.cwd();

  // 1. Check git repo
  let repoRoot: string;
  try {
    repoRoot = getRepoRoot(cwd);
  } catch {
    reporter.error('Not a git repository. Run this command from a git repository.');
    return 1;
  }

  // 2. Check warden.toml exists (deferred for --list)
  const configPath = join(repoRoot, 'warden.toml');
  const hasConfig = existsSync(configPath);

  // 3. Load existing config if available
  let configuredSkills = new Set<string>();
  if (hasConfig) {
    try {
      const config = loadWardenConfig(repoRoot);
      configuredSkills = new Set(config.triggers.map((t) => t.name));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      reporter.error(`Failed to load warden.toml: ${message}`);
      return 1;
    }
  }

  // 4. Discover all available skills
  const skills = await discoverAllSkills(repoRoot);

  if (skills.size === 0) {
    reporter.error('No skills found.');
    return 1;
  }

  // 5. Handle --list: display skills and exit (works without warden.toml)
  if (options.list) {
    renderSkillList(skills, configuredSkills, reporter);
    return 0;
  }

  // 6. For adding skills, require warden.toml
  if (!hasConfig) {
    reporter.error('warden.toml not found.');
    reporter.tip('Run `warden init` first to create the configuration file.');
    return 1;
  }

  // 7. Get skill to add (from arg or interactive prompt)
  let skillName: string | null;

  if (options.skill) {
    // Non-interactive: skill specified as argument
    skillName = options.skill;
  } else if (reporter.mode.isTTY) {
    // Interactive mode
    skillName = await promptSkillSelection(skills, configuredSkills, reporter);
    if (!skillName) {
      return 0; // User quit or no skills available
    }
  } else {
    // Non-TTY and no skill specified
    reporter.error('Skill name required when not running interactively.');
    reporter.tip('Use: warden add <skill-name> or warden add --list');
    return 1;
  }

  // 8. Validate skill exists
  if (!skills.has(skillName)) {
    reporter.error(`Skill not found: ${skillName}`);
    reporter.blank();
    reporter.tip('Available skills:');
    for (const name of skills.keys()) {
      reporter.text(`  - ${name}`);
    }
    return 1;
  }

  // 9. Check for duplicate trigger
  if (configuredSkills.has(skillName)) {
    reporter.warning(`Trigger '${skillName}' already exists in warden.toml`);
    reporter.skipped(relative(cwd, configPath), 'trigger already configured');
    return 0;
  }

  // 10. Append trigger to warden.toml
  const trigger = createDefaultTrigger(skillName);
  try {
    appendTrigger(configPath, trigger);
    reporter.success(`Added trigger '${skillName}' to ${relative(cwd, configPath)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    reporter.error(`Failed to update warden.toml: ${message}`);
    return 1;
  }

  // 11. Show success message with next steps
  reporter.blank();
  reporter.text(`The trigger will run on pull requests.`);
  reporter.text(`Edit ${chalk.cyan('warden.toml')} to customize filters and output options.`);

  return 0;
}
