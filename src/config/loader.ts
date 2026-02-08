import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import {
  WardenConfigSchema,
  type WardenConfig,
  type ScheduleConfig,
  type TriggerType,
} from './schema.js';
import type { SeverityThreshold } from '../types/index.js';

export class ConfigLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ConfigLoadError';
  }
}

export function loadWardenConfig(repoPath: string): WardenConfig {
  const configPath = join(repoPath, 'warden.toml');

  if (!existsSync(configPath)) {
    throw new ConfigLoadError(`Configuration file not found: ${configPath}`);
  }

  let content: string;
  try {
    content = readFileSync(configPath, 'utf-8');
  } catch (error) {
    throw new ConfigLoadError(`Failed to read configuration file: ${configPath}`, { cause: error });
  }

  let rawConfig: unknown;
  try {
    rawConfig = parseToml(content);
  } catch (error) {
    throw new ConfigLoadError('Failed to parse TOML configuration', { cause: error });
  }

  // Detect legacy [[triggers]] format and provide migration guidance
  if (rawConfig && typeof rawConfig === 'object' && 'triggers' in rawConfig) {
    throw new ConfigLoadError(
      'Legacy [[triggers]] format detected. Migrate to [[skills]] format:\n\n' +
      '  [[triggers]]               →  [[skills]]\n' +
      '  name = "my-skill"              name = "my-skill"\n' +
      '  event = "pull_request"     →  [[skills.triggers]]\n' +
      '  skill = "my-skill"              type = "pull_request"\n' +
      '  actions = [...]                 actions = [...]\n\n' +
      'See the migration guide for details.'
    );
  }

  const result = WardenConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    const issues = result.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new ConfigLoadError(`Invalid configuration:\n${issues}`);
  }

  return result.data;
}

/**
 * Resolved trigger configuration with defaults applied.
 * Each skill x trigger combination produces one ResolvedTrigger.
 * Skills with no triggers produce a wildcard entry (type: '*').
 */
export interface ResolvedTrigger {
  /** Skill name (used for display and deduplication) */
  name: string;
  /** Skill reference (same as name, for downstream compatibility) */
  skill: string;
  /** Trigger type, or '*' for wildcard (runs everywhere) */
  type: TriggerType | '*';
  /** Actions for pull_request triggers */
  actions?: string[];
  /** Remote repository reference */
  remote?: string;
  /** Path filters */
  filters: { paths?: string[]; ignorePaths?: string[] };
  // Flattened output fields (merged: trigger > skill > defaults)
  failOn?: SeverityThreshold;
  reportOn?: SeverityThreshold;
  maxFindings?: number;
  reportOnSuccess?: boolean;
  /** Model (merged: trigger > skill > defaults > cli > env) */
  model?: string;
  /** Max agentic turns (merged: trigger > skill > defaults) */
  maxTurns?: number;
  /** Schedule-specific configuration */
  schedule?: ScheduleConfig;
}

/**
 * Convert empty strings to undefined.
 * GitHub Actions substitutes unconfigured secrets with empty strings,
 * so we need to treat '' as "not set" for optional config values.
 */
function emptyToUndefined(value: string | undefined): string | undefined {
  return value === '' ? undefined : value;
}

/**
 * Resolve all skills in a config into a flat array of ResolvedTriggers.
 * Each skill x trigger combination produces one entry.
 * Skills with no triggers produce one wildcard entry (type: '*').
 *
 * Model precedence (highest to lowest):
 * 1. trigger-level model
 * 2. skill-level model
 * 3. defaults.model (warden.toml [defaults])
 * 4. cliModel (--model flag)
 * 5. WARDEN_MODEL env var
 * 6. SDK default (not set here)
 */
export function resolveSkillConfigs(
  config: WardenConfig,
  cliModel?: string
): ResolvedTrigger[] {
  const defaults = config.defaults;
  const envModel = emptyToUndefined(process.env['WARDEN_MODEL']);
  const result: ResolvedTrigger[] = [];

  for (const skill of config.skills) {
    const baseModel =
      emptyToUndefined(skill.model) ??
      emptyToUndefined(defaults?.model) ??
      emptyToUndefined(cliModel) ??
      envModel;

    // Merge ignorePaths: skill-level + defaults (additive, not override)
    const mergedIgnorePaths = [
      ...(defaults?.ignorePaths ?? []),
      ...(skill.ignorePaths ?? []),
    ];

    const filters = {
      paths: skill.paths,
      ignorePaths: mergedIgnorePaths.length > 0 ? mergedIgnorePaths : undefined,
    };

    if (!skill.triggers || skill.triggers.length === 0) {
      // Wildcard: no triggers means run everywhere
      result.push({
        name: skill.name,
        skill: skill.name,
        type: '*',
        remote: skill.remote,
        filters,
        failOn: skill.failOn ?? defaults?.failOn,
        reportOn: skill.reportOn ?? defaults?.reportOn,
        maxFindings: skill.maxFindings ?? defaults?.maxFindings,
        reportOnSuccess: skill.reportOnSuccess ?? defaults?.reportOnSuccess,
        model: baseModel,
        maxTurns: skill.maxTurns ?? defaults?.maxTurns,
      });
    } else {
      for (const trigger of skill.triggers) {
        result.push({
          name: skill.name,
          skill: skill.name,
          type: trigger.type,
          actions: trigger.actions,
          remote: skill.remote,
          filters,
          // 3-level merge: trigger > skill > defaults
          failOn: trigger.failOn ?? skill.failOn ?? defaults?.failOn,
          reportOn: trigger.reportOn ?? skill.reportOn ?? defaults?.reportOn,
          maxFindings: trigger.maxFindings ?? skill.maxFindings ?? defaults?.maxFindings,
          reportOnSuccess: trigger.reportOnSuccess ?? skill.reportOnSuccess ?? defaults?.reportOnSuccess,
          model: emptyToUndefined(trigger.model) ?? baseModel,
          maxTurns: trigger.maxTurns ?? skill.maxTurns ?? defaults?.maxTurns,
          schedule: trigger.schedule,
        });
      }
    }
  }

  return result;
}
