import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import chalk from 'chalk';
import select from '@inquirer/select';
import { getRepoRoot } from '../git.js';
import { loadWardenConfig, appendSkill } from '../../config/index.js';
import type { SkillConfig } from '../../config/schema.js';
import { discoverAllSkills, type DiscoveredSkill } from '../../skills/loader.js';
import {
  fetchRemote,
  discoverRemoteSkills,
  parseRemoteRef,
  type DiscoveredRemoteSkill,
} from '../../skills/remote.js';
import type { Reporter } from '../output/reporter.js';
import type { CLIOptions } from '../args.js';
import { ICON_CHECK } from '../output/icons.js';

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
 * Render the list of available local skills.
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
      const icon = isConfigured ? chalk.dim(ICON_CHECK) : ' ';
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
 * Render the list of available remote skills.
 */
function renderRemoteSkillList(
  skills: DiscoveredRemoteSkill[],
  configuredSkills: Set<string>,
  remote: string,
  reporter: Reporter
): void {
  reporter.bold(`Available Skills from ${remote}`);
  reporter.blank();

  // Sort skills alphabetically by name
  const sortedSkills = [...skills].sort((a, b) => a.name.localeCompare(b.name));

  for (const skill of sortedSkills) {
    const isConfigured = configuredSkills.has(skill.name);
    const configuredTag = isConfigured ? chalk.dim(' (already configured)') : '';

    if (reporter.mode.isTTY) {
      const icon = isConfigured ? chalk.dim(ICON_CHECK) : ' ';
      reporter.text(`  ${icon} ${chalk.bold(skill.name)}${configuredTag}`);
      reporter.text(`    ${chalk.dim(skill.description)}`);
    } else {
      const status = isConfigured ? '[configured]' : '';
      reporter.text(`${skill.name} ${status}`);
      reporter.text(`  ${skill.description}`);
    }
  }
}

/**
 * Prompt user to select a local skill interactively.
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
 * Prompt user to select a remote skill interactively.
 */
async function promptRemoteSkillSelection(
  skills: DiscoveredRemoteSkill[],
  configuredSkills: Set<string>,
  reporter: Reporter,
): Promise<string | null> {
  // Filter out already configured skills for selection
  const availableSkills = skills
    .filter((s) => !configuredSkills.has(s.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (availableSkills.length === 0) {
    reporter.warning('All available skills are already configured.');
    return null;
  }

  const choices = availableSkills.map((skill) => {
    return {
      name: skill.name,
      value: skill.name,
      description: skill.description,
    };
  });

  reporter.bold('ADD REMOTE SKILL');
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
 * Resolve which skill to add from explicit option, interactive prompt, or error.
 * Returns the skill name, or null if the user cancelled, or a numeric exit code on error.
 */
async function resolveSkillName(
  options: CLIOptions,
  reporter: Reporter,
  prompt: () => Promise<string | null>,
  usageTip: string,
): Promise<string | number> {
  if (options.skill) {
    return options.skill;
  }
  if (reporter.mode.isTTY) {
    const selected = await prompt();
    return selected ?? 0;
  }
  reporter.error('Skill name required when not running interactively.');
  reporter.tip(usageTip);
  return 1;
}

const DEFAULT_TRIGGERS = [
  {
    type: 'pull_request' as const,
    actions: ['opened', 'synchronize', 'reopened'],
  },
];

/**
 * Create a default skill config for a local skill.
 */
function createDefaultSkillConfig(skillName: string): SkillConfig {
  return {
    name: skillName,
    triggers: DEFAULT_TRIGGERS,
  };
}

/**
 * Create a skill config for a remote skill.
 */
function createRemoteSkillConfig(skillName: string, remote: string): SkillConfig {
  return {
    name: skillName,
    remote,
    triggers: DEFAULT_TRIGGERS,
  };
}

/**
 * Run the add command for remote skills.
 */
async function runAddRemote(
  options: CLIOptions,
  reporter: Reporter,
  configPath: string,
  configuredSkills: Set<string>
): Promise<number> {
  const remote = options.remote ?? '';
  if (!remote) {
    reporter.error('Remote repository is required');
    return 1;
  }
  const cwd = process.cwd();

  // Validate remote ref format
  try {
    parseRemoteRef(remote);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    reporter.error(message);
    return 1;
  }

  // Fetch remote repository
  reporter.step(`Fetching skills from ${remote}...`);
  try {
    await fetchRemote(remote, {
      force: options.force,
      onProgress: (msg) => reporter.debug(msg),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    reporter.error(`Failed to fetch remote: ${message}`);
    return 1;
  }

  // Discover skills in the remote
  const remoteSkills = await discoverRemoteSkills(remote);

  if (remoteSkills.length === 0) {
    reporter.error(`No skills found in remote: ${remote}`);
    return 1;
  }

  reporter.success(`Found ${remoteSkills.length} skill${remoteSkills.length === 1 ? '' : 's'}`);

  // Handle --list: display remote skills and exit
  if (options.list) {
    reporter.blank();
    renderRemoteSkillList(remoteSkills, configuredSkills, remote, reporter);
    return 0;
  }

  // Get skill to add (from --skill or interactive prompt)
  if (!options.skill && reporter.mode.isTTY) reporter.blank();
  const resolved = await resolveSkillName(
    options,
    reporter,
    () => promptRemoteSkillSelection(remoteSkills, configuredSkills, reporter),
    `Use: warden add --remote ${remote} --skill <name>`,
  );
  if (typeof resolved === 'number') return resolved;
  const skillName = resolved;

  // Validate skill exists in remote, retry with fresh fetch if using stale cache
  let availableSkills = remoteSkills;
  let skill = availableSkills.find((s) => s.name === skillName);

  if (!skill && !options.force) {
    reporter.debug(`Skill '${skillName}' not in cache, refetching...`);
    try {
      await fetchRemote(remote, {
        force: true,
        onProgress: (msg) => reporter.debug(msg),
      });
      availableSkills = await discoverRemoteSkills(remote);
      skill = availableSkills.find((s) => s.name === skillName);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      reporter.error(`Failed to refetch remote: ${message}`);
      return 1;
    }
  }

  if (!skill) {
    reporter.error(`Skill '${skillName}' not found in remote: ${remote}`);
    reporter.blank();
    reporter.tip('Available skills:');
    for (const s of availableSkills) {
      reporter.text(`  - ${s.name}`);
    }
    return 1;
  }

  // Check for duplicate skill
  if (configuredSkills.has(skillName)) {
    reporter.warning(`Skill '${skillName}' already exists in warden.toml`);
    reporter.skipped(relative(cwd, configPath), 'skill already configured');
    return 0;
  }

  // Append skill to warden.toml — preserve the user's original URL form
  const skillConfig = createRemoteSkillConfig(skillName, remote);
  try {
    appendSkill(configPath, skillConfig);
    reporter.success(`Added skill '${skillName}' to ${relative(cwd, configPath)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    reporter.error(`Failed to update warden.toml: ${message}`);
    return 1;
  }

  // Show success message
  reporter.blank();
  reporter.text(`The skill will run on pull requests using skill from ${chalk.cyan(remote)}.`);
  reporter.text(`Edit ${chalk.cyan('warden.toml')} to customize filters and output options.`);

  return 0;
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

  // 2. Check warden.toml exists (deferred for --list without --remote)
  const configPath = join(repoRoot, 'warden.toml');
  const hasConfig = existsSync(configPath);

  // 3. Load existing config if available
  let configuredSkills = new Set<string>();
  if (hasConfig) {
    try {
      const config = loadWardenConfig(repoRoot);
      configuredSkills = new Set(config.skills.map((s) => s.name));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      reporter.error(`Failed to load warden.toml: ${message}`);
      return 1;
    }
  }

  // 4. Handle remote skills with --remote flag
  if (options.remote) {
    // For remote skills, require warden.toml (unless --list)
    if (!hasConfig && !options.list) {
      reporter.error('warden.toml not found.');
      reporter.tip('Run `warden init` first to create the configuration file.');
      return 1;
    }

    return runAddRemote(options, reporter, configPath, configuredSkills);
  }

  // 5. Discover local skills
  const skills = await discoverAllSkills(repoRoot, {
    onWarning: (message) => reporter.warning(message),
  });

  if (skills.size === 0) {
    reporter.error('No skills found.');
    reporter.tip('Add skills to .agents/skills/ or .claude/skills/');
    reporter.tip('Or use --remote to add remote skills: warden add --remote owner/repo --skill name');
    return 1;
  }

  // 6. Handle --list: display skills and exit (works without warden.toml)
  if (options.list) {
    renderSkillList(skills, configuredSkills, reporter);
    return 0;
  }

  // 7. For adding skills, require warden.toml
  if (!hasConfig) {
    reporter.error('warden.toml not found.');
    reporter.tip('Run `warden init` first to create the configuration file.');
    return 1;
  }

  // 8. Get skill to add (from arg or interactive prompt)
  const resolved = await resolveSkillName(
    options,
    reporter,
    () => promptSkillSelection(skills, configuredSkills, reporter),
    'Use: warden add <skill-name> or warden add --list',
  );
  if (typeof resolved === 'number') return resolved;
  const skillName = resolved;

  // 9. Validate skill exists
  if (!skills.has(skillName)) {
    reporter.error(`Skill not found: ${skillName}`);
    reporter.blank();
    reporter.tip('Available skills:');
    for (const name of skills.keys()) {
      reporter.text(`  - ${name}`);
    }
    return 1;
  }

  // 10. Check for duplicate skill
  if (configuredSkills.has(skillName)) {
    reporter.warning(`Skill '${skillName}' already exists in warden.toml`);
    reporter.skipped(relative(cwd, configPath), 'skill already configured');
    return 0;
  }

  // 11. Append skill to warden.toml
  const skillConfig = createDefaultSkillConfig(skillName);
  try {
    appendSkill(configPath, skillConfig);
    reporter.success(`Added skill '${skillName}' to ${relative(cwd, configPath)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    reporter.error(`Failed to update warden.toml: ${message}`);
    return 1;
  }

  // 12. Show success message with next steps
  reporter.blank();
  reporter.text(`The skill will run on pull requests.`);
  reporter.text(`Edit ${chalk.cyan('warden.toml')} to customize filters and output options.`);

  return 0;
}
