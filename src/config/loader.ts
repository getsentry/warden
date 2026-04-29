import { readFileSync, existsSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import { Sentry } from '../sentry.js';
import {
  WardenConfigSchema,
  type WardenConfig,
  type ScheduleConfig,
  type TriggerType,
  type Defaults,
  type ChunkingConfig,
  type CoalesceConfig,
  type RunnerConfig,
  type LogsConfig,
} from './schema.js';
import type { SeverityThreshold, ConfidenceThreshold } from '../types/index.js';

export class ConfigLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ConfigLoadError';
  }
}

function parseConfigContent(content: string): WardenConfig {
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

export function loadWardenConfigFile(configPath: string): WardenConfig {
  return Sentry.startSpan(
    { op: 'config.load', name: 'load config' },
    () => {
      if (!existsSync(configPath)) {
        throw new ConfigLoadError(`Configuration file not found: ${configPath}`);
      }

      let content: string;
      try {
        content = readFileSync(configPath, 'utf-8');
      } catch (error) {
        throw new ConfigLoadError(`Failed to read configuration file: ${configPath}`, { cause: error });
      }

      return parseConfigContent(content);
    },
  );
}

export function loadWardenConfig(configDir: string): WardenConfig {
  return loadWardenConfigFile(join(configDir, 'warden.toml'));
}

function mergeArray<T>(base?: T[], overlay?: T[]): T[] | undefined {
  const merged = [...(base ?? []), ...(overlay ?? [])];
  return merged.length > 0 ? merged : undefined;
}

function mergeCoalesceConfig(
  base?: CoalesceConfig,
  overlay?: CoalesceConfig
): CoalesceConfig | undefined {
  if (!base) return overlay;
  if (!overlay) return base;
  return { ...base, ...overlay };
}

function mergeChunkingConfig(
  base?: ChunkingConfig,
  overlay?: ChunkingConfig
): ChunkingConfig | undefined {
  if (!base) return overlay;
  if (!overlay) return base;
  return {
    ...base,
    ...overlay,
    filePatterns: mergeArray(base.filePatterns, overlay.filePatterns),
    coalesce: mergeCoalesceConfig(base.coalesce, overlay.coalesce),
  };
}

function mergeDefaults(base?: Defaults, overlay?: Defaults): Defaults | undefined {
  if (!base) return overlay;
  if (!overlay) return base;
  return {
    ...base,
    ...overlay,
    ignorePaths: mergeArray(base.ignorePaths, overlay.ignorePaths),
    chunking: mergeChunkingConfig(base.chunking, overlay.chunking),
  };
}

function mergeRunnerConfig(
  base?: RunnerConfig,
  overlay?: RunnerConfig
): RunnerConfig | undefined {
  if (!base) return overlay;
  if (!overlay) return base;
  return { ...base, ...overlay };
}

function mergeLogsConfig(
  base?: LogsConfig,
  overlay?: LogsConfig
): LogsConfig | undefined {
  if (!base) return overlay;
  if (!overlay) return base;
  return { ...base, ...overlay };
}

export function mergeWardenConfigs(base: WardenConfig, overlay: WardenConfig): WardenConfig {
  const mergedConfig = {
    version: 1 as const,
    defaults: mergeDefaults(base.defaults, overlay.defaults),
    skills: [...base.skills, ...overlay.skills],
    runner: mergeRunnerConfig(base.runner, overlay.runner),
    logs: mergeLogsConfig(base.logs, overlay.logs),
  };

  const result = WardenConfigSchema.safeParse(mergedConfig);
  if (!result.success) {
    const issues = result.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new ConfigLoadError(`Invalid merged configuration:\n${issues}`);
  }

  return result.data;
}

export interface LayeredConfigOptions {
  baseConfigPath?: string;
  configPath?: string;
}

export interface LoadedLayeredConfig {
  config: WardenConfig;
  baseConfig?: WardenConfig;
  repoConfig?: WardenConfig;
}

export interface LayeredSkillRootsByName {
  base?: Record<string, string | undefined>;
  repo?: Record<string, string | undefined>;
}

export function buildSkillRootsByName(
  repoPath: string,
  layered: LoadedLayeredConfig,
  baseSkillRoot?: string
): LayeredSkillRootsByName | undefined {
  const baseRoots: Record<string, string | undefined> = {};
  const repoRoots: Record<string, string | undefined> = {};

  if (layered.baseConfig) {
    const localBaseSkills = layered.baseConfig.skills.filter((skill) => !skill.remote);
    if (localBaseSkills.length > 0 && !baseSkillRoot) {
      throw new ConfigLoadError(
        'base-skill-root is required when the base config defines local skills'
      );
    }

    if (baseSkillRoot) {
      const resolvedBaseSkillRoot = join(repoPath, baseSkillRoot);
      if (!existsSync(resolvedBaseSkillRoot)) {
        throw new ConfigLoadError(`Skill root not found: ${resolvedBaseSkillRoot}`);
      }
      for (const skill of localBaseSkills) {
        baseRoots[skill.name] = resolvedBaseSkillRoot;
      }
    }
  }

  if (layered.repoConfig) {
    for (const skill of layered.repoConfig.skills) {
      if (!skill.remote) {
        repoRoots[skill.name] = repoPath;
      }
    }
  }

  const result: LayeredSkillRootsByName = {};
  if (Object.keys(baseRoots).length > 0) {
    result.base = baseRoots;
  }
  if (Object.keys(repoRoots).length > 0) {
    result.repo = repoRoots;
  }
  return result.base || result.repo ? result : undefined;
}

export function loadLayeredWardenConfig(
  repoPath: string,
  options: LayeredConfigOptions = {}
): LoadedLayeredConfig {
  const repoConfigPath = join(repoPath, options.configPath ?? 'warden.toml');
  const baseConfigPath = options.baseConfigPath
    ? join(repoPath, options.baseConfigPath)
    : undefined;

  if (baseConfigPath && !existsSync(baseConfigPath)) {
    throw new ConfigLoadError(`Configuration file not found: ${baseConfigPath}`);
  }

  if (!baseConfigPath) {
    const repoConfig = loadWardenConfigFile(repoConfigPath);
    return { config: repoConfig, repoConfig };
  }

  if (normalize(baseConfigPath) === normalize(repoConfigPath)) {
    throw new ConfigLoadError('base-config-path and config-path must point to different files');
  }

  const baseConfig = loadWardenConfigFile(baseConfigPath);
  if (!existsSync(repoConfigPath)) {
    return { config: baseConfig, baseConfig };
  }

  const repoConfig = loadWardenConfigFile(repoConfigPath);
  return {
    config: mergeWardenConfigs(baseConfig, repoConfig),
    baseConfig,
    repoConfig,
  };
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
  /** Repository root to use when resolving local skill names or paths */
  skillRoot?: string;
  /** Path filters */
  filters: { paths?: string[]; ignorePaths?: string[] };
  // Flattened output fields (merged: trigger > skill > defaults)
  failOn?: SeverityThreshold;
  reportOn?: SeverityThreshold;
  maxFindings?: number;
  reportOnSuccess?: boolean;
  /** Use REQUEST_CHANGES review event when findings exceed failOn */
  requestChanges?: boolean;
  /** Fail the check run when findings exceed failOn */
  failCheck?: boolean;
  /** Model (merged: trigger > skill > defaults > cli > env) */
  model?: string;
  /** Max agentic turns (merged: trigger > skill > defaults) */
  maxTurns?: number;
  /** Minimum confidence for findings (merged: trigger > skill > defaults) */
  minConfidence?: ConfidenceThreshold;
  /** Batch delay to use for this trigger's skill execution */
  batchDelayMs?: number;
  /** Max number of context files to include in prompts for this trigger */
  maxContextFiles?: number;
  /** Max retries for auxiliary model calls during this trigger */
  auxiliaryMaxRetries?: number;
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
  cliModel?: string,
  skillRootsByName?: Record<string, string | undefined>
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
        skillRoot: skillRootsByName?.[skill.name],
        filters,
        failOn: skill.failOn ?? defaults?.failOn,
        reportOn: skill.reportOn ?? defaults?.reportOn,
        maxFindings: skill.maxFindings ?? defaults?.maxFindings,
        reportOnSuccess: skill.reportOnSuccess ?? defaults?.reportOnSuccess,
        requestChanges: skill.requestChanges ?? defaults?.requestChanges,
        failCheck: skill.failCheck ?? defaults?.failCheck,
        model: baseModel,
        maxTurns: skill.maxTurns ?? defaults?.maxTurns,
        minConfidence: skill.minConfidence ?? defaults?.minConfidence,
        batchDelayMs: defaults?.batchDelayMs,
        maxContextFiles: defaults?.chunking?.maxContextFiles,
        auxiliaryMaxRetries: defaults?.auxiliaryMaxRetries,
      });
    } else {
      for (const trigger of skill.triggers) {
        result.push({
          name: skill.name,
          skill: skill.name,
          type: trigger.type,
          actions: trigger.actions,
          remote: skill.remote,
          skillRoot: skillRootsByName?.[skill.name],
          filters,
          // 3-level merge: trigger > skill > defaults
          failOn: trigger.failOn ?? skill.failOn ?? defaults?.failOn,
          reportOn: trigger.reportOn ?? skill.reportOn ?? defaults?.reportOn,
          maxFindings: trigger.maxFindings ?? skill.maxFindings ?? defaults?.maxFindings,
          reportOnSuccess: trigger.reportOnSuccess ?? skill.reportOnSuccess ?? defaults?.reportOnSuccess,
          requestChanges: trigger.requestChanges ?? skill.requestChanges ?? defaults?.requestChanges,
          failCheck: trigger.failCheck ?? skill.failCheck ?? defaults?.failCheck,
          model: emptyToUndefined(trigger.model) ?? baseModel,
          maxTurns: trigger.maxTurns ?? skill.maxTurns ?? defaults?.maxTurns,
          minConfidence: trigger.minConfidence ?? skill.minConfidence ?? defaults?.minConfidence,
          batchDelayMs: defaults?.batchDelayMs,
          maxContextFiles: defaults?.chunking?.maxContextFiles,
          auxiliaryMaxRetries: defaults?.auxiliaryMaxRetries,
          schedule: trigger.schedule,
        });
      }
    }
  }

  return result;
}

export function resolveLayeredSkillConfigs(
  layered: LoadedLayeredConfig,
  cliModel?: string,
  skillRootsByName?: LayeredSkillRootsByName
): ResolvedTrigger[] {
  if (layered.baseConfig && layered.repoConfig) {
    return [
      ...resolveSkillConfigs(layered.baseConfig, cliModel, skillRootsByName?.base),
      ...resolveSkillConfigs(layered.repoConfig, cliModel, skillRootsByName?.repo),
    ];
  }

  if (layered.baseConfig) {
    return resolveSkillConfigs(layered.baseConfig, cliModel, skillRootsByName?.base);
  }

  if (layered.repoConfig) {
    return resolveSkillConfigs(layered.repoConfig, cliModel, skillRootsByName?.repo);
  }

  return resolveSkillConfigs(
    layered.config,
    cliModel,
    skillRootsByName?.repo ?? skillRootsByName?.base
  );
}
