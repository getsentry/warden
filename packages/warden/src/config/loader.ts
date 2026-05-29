import { readFileSync, existsSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import { Sentry } from '../sentry.js';
import { isBuiltinSkillName } from '../skills/loader.js';
import {
  WardenConfigSchema,
  type WardenConfig,
  type SkillConfig,
  type ScheduleConfig,
  type TriggerType,
  type Defaults,
  type ChunkingConfig,
  type CoalesceConfig,
  type RunnerConfig,
  type LogsConfig,
  type RuntimeName,
  type AgentRuntimeConfig,
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

function mergeNestedConfig<T extends object>(base?: T, overlay?: T): T | undefined {
  if (!base) return overlay;
  if (!overlay) return base;
  return { ...base, ...overlay };
}

function mergeDefaults(base?: Defaults, overlay?: Defaults): Defaults | undefined {
  if (!base) return overlay;
  if (!overlay) return base;
  return {
    ...base,
    ...overlay,
    agent: mergeNestedConfig(base.agent, overlay.agent),
    auxiliary: mergeNestedConfig(base.auxiliary, overlay.auxiliary),
    synthesis: mergeNestedConfig(base.synthesis, overlay.synthesis),
    verification: mergeNestedConfig(base.verification, overlay.verification),
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

function inheritRepoLayerDefaults(base?: Defaults, repo?: Defaults): Defaults | undefined {
  const inherited: Defaults = { ...(repo ?? {}) };

  if (base?.runtime !== undefined && inherited.runtime === undefined) {
    inherited.runtime = base.runtime;
  }

  const verification = mergeNestedConfig(base?.verification, repo?.verification);
  if (verification) {
    inherited.verification = verification;
  }

  return Object.keys(inherited).length > 0 ? inherited : undefined;
}

export interface MergeWardenConfigOptions {
  baseConfigPath?: string;
  repoConfigPath?: string;
  onWarning?: (message: string) => void;
}

function withoutBaseDuplicateSkills(
  base: WardenConfig,
  repo: WardenConfig,
  options: MergeWardenConfigOptions = {}
): WardenConfig {
  const baseSkillNames = new Set(base.skills.map((skill) => skill.name));
  const skipped = new Set<string>();
  const skills = repo.skills.filter((skill) => {
    if (!baseSkillNames.has(skill.name)) {
      return true;
    }

    skipped.add(skill.name);
    return false;
  });

  for (const skillName of skipped) {
    const basePath = options.baseConfigPath ?? 'base config';
    const repoPath = options.repoConfigPath ?? 'repo config';
    options.onWarning?.(
      `Skill "${skillName}" is defined in both ${basePath} and ${repoPath}. ` +
      'Using the base config skill and ignoring the repo config duplicate.'
    );
  }

  return skipped.size > 0 ? { ...repo, skills } : repo;
}

export function mergeWardenConfigs(
  base: WardenConfig,
  overlay: WardenConfig,
  options: MergeWardenConfigOptions = {}
): WardenConfig {
  const effectiveOverlay = withoutBaseDuplicateSkills(base, overlay, options);
  const mergedConfig = {
    version: 1 as const,
    defaults: mergeDefaults(base.defaults, effectiveOverlay.defaults),
    skills: [...base.skills, ...effectiveOverlay.skills],
    runner: mergeRunnerConfig(base.runner, effectiveOverlay.runner),
    logs: mergeLogsConfig(base.logs, effectiveOverlay.logs),
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
  onWarning?: (message: string) => void;
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
    const localBaseSkillsRequiringRoot = localBaseSkills.filter(
      (skill) => !isBuiltinSkillName(skill.name)
    );
    if (localBaseSkillsRequiringRoot.length > 0 && !baseSkillRoot) {
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
    } else {
      for (const skill of localBaseSkills) {
        if (isBuiltinSkillName(skill.name)) {
          baseRoots[skill.name] = undefined;
        }
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

  const repoConfig = withoutBaseDuplicateSkills(baseConfig, loadWardenConfigFile(repoConfigPath), {
    baseConfigPath: options.baseConfigPath,
    repoConfigPath: options.configPath ?? 'warden.toml',
    onWarning: options.onWarning,
  });
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
  /** Draft state for pull_request triggers. false means non-draft only. */
  draft?: boolean;
  /** Pull request labels that can match this trigger. */
  labels?: string[];
  /** Remote repository reference */
  remote?: string;
  /** Repository root to use when resolving local skill names or paths */
  skillRoot?: string;
  /** Resolve from package built-ins instead of repo-local skill directories */
  useBuiltinSkill?: boolean;
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
  /** Reasoning effort for repo-aware skill execution. */
  reasoningEffort?: AgentRuntimeConfig['reasoningEffort'];
  /** Runtime backend for all model-backed execution. */
  runtime?: RuntimeName;
  /** Model for auxiliary structured model calls. */
  auxiliaryModel?: string;
  /** Model for post-analysis synthesis/consolidation. */
  synthesisModel?: string;
  /** Max retries for auxiliary structured model calls. */
  auxiliaryMaxRetries?: number;
  /** Whether candidate findings should be verified in a second pass. */
  verifyFindings?: boolean;
  /** Minimum confidence for findings (merged: trigger > skill > defaults) */
  minConfidence?: ConfidenceThreshold;
  /** Batch delay to use for this trigger's skill execution */
  batchDelayMs?: number;
  /** Max number of context files to include in prompts for this trigger */
  maxContextFiles?: number;
  /** Schedule-specific configuration */
  schedule?: ScheduleConfig;
}

function resolveSkillSource(
  skill: SkillConfig,
  skillRootsByName?: Record<string, string | undefined>
): Pick<ResolvedTrigger, 'skillRoot' | 'useBuiltinSkill'> {
  if (!skillRootsByName || !Object.hasOwn(skillRootsByName, skill.name)) {
    return {};
  }

  const skillRoot = skillRootsByName[skill.name];
  return {
    skillRoot,
    useBuiltinSkill: !skill.remote && skillRoot === undefined,
  };
}

/**
 * Convert empty strings to undefined.
 * GitHub Actions substitutes unconfigured secrets with empty strings,
 * so we need to treat '' as "not set" for optional config values.
 */
export function emptyToUndefined(value: string | undefined): string | undefined {
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
 * 3. defaults.agent.model
 * 4. defaults.model (legacy warden.toml [defaults])
 * 5. cliModel (--model flag)
 * 6. WARDEN_MODEL env var
 * 7. SDK default (not set here)
 */
export function resolveSkillConfigs(
  config: WardenConfig,
  cliModel?: string,
  skillRootsByName?: Record<string, string | undefined>
): ResolvedTrigger[] {
  const defaults = config.defaults;
  const envModel = emptyToUndefined(process.env['WARDEN_MODEL']);
  const result: ResolvedTrigger[] = [];
  const runtime = defaults?.runtime ?? 'pi';
  const auxiliaryModel = emptyToUndefined(defaults?.auxiliary?.model);
  const synthesisModel =
    emptyToUndefined(defaults?.synthesis?.model) ??
    auxiliaryModel;
  const auxiliaryMaxRetries =
    defaults?.auxiliary?.maxRetries ??
    defaults?.auxiliaryMaxRetries;
  const verifyFindings = defaults?.verification?.enabled !== false;

  for (const skill of config.skills) {
    const skillSource = resolveSkillSource(skill, skillRootsByName);
    const baseModel =
      emptyToUndefined(skill.model) ??
      emptyToUndefined(defaults?.agent?.model) ??
      emptyToUndefined(defaults?.model) ??
      emptyToUndefined(cliModel) ??
      envModel;
    const baseMaxTurns = skill.maxTurns ?? defaults?.agent?.maxTurns ?? defaults?.maxTurns;
    const reasoningEffort = defaults?.agent?.reasoningEffort;

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
        ...skillSource,
        filters,
        failOn: skill.failOn ?? defaults?.failOn,
        reportOn: skill.reportOn ?? defaults?.reportOn,
        maxFindings: skill.maxFindings ?? defaults?.maxFindings,
        reportOnSuccess: skill.reportOnSuccess ?? defaults?.reportOnSuccess,
        requestChanges: skill.requestChanges ?? defaults?.requestChanges,
        failCheck: skill.failCheck ?? defaults?.failCheck,
        model: baseModel,
        maxTurns: baseMaxTurns,
        reasoningEffort,
        runtime,
        auxiliaryModel,
        synthesisModel,
        auxiliaryMaxRetries,
        verifyFindings,
        minConfidence: skill.minConfidence ?? defaults?.minConfidence,
        batchDelayMs: defaults?.batchDelayMs,
        maxContextFiles: defaults?.chunking?.maxContextFiles,
      });
    } else {
      for (const trigger of skill.triggers) {
        result.push({
          name: skill.name,
          skill: skill.name,
          type: trigger.type,
          actions: trigger.actions,
          draft: trigger.draft,
          labels: trigger.labels,
          remote: skill.remote,
          ...skillSource,
          filters,
          // 3-level merge: trigger > skill > defaults
          failOn: trigger.failOn ?? skill.failOn ?? defaults?.failOn,
          reportOn: trigger.reportOn ?? skill.reportOn ?? defaults?.reportOn,
          maxFindings: trigger.maxFindings ?? skill.maxFindings ?? defaults?.maxFindings,
          reportOnSuccess: trigger.reportOnSuccess ?? skill.reportOnSuccess ?? defaults?.reportOnSuccess,
          requestChanges: trigger.requestChanges ?? skill.requestChanges ?? defaults?.requestChanges,
          failCheck: trigger.failCheck ?? skill.failCheck ?? defaults?.failCheck,
          model: emptyToUndefined(trigger.model) ?? baseModel,
          maxTurns: trigger.maxTurns ?? baseMaxTurns,
          reasoningEffort,
          runtime,
          auxiliaryModel,
          synthesisModel,
          auxiliaryMaxRetries,
          verifyFindings,
          minConfidence: trigger.minConfidence ?? skill.minConfidence ?? defaults?.minConfidence,
          batchDelayMs: defaults?.batchDelayMs,
          maxContextFiles: defaults?.chunking?.maxContextFiles,
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
    const repoConfig = withoutBaseDuplicateSkills(layered.baseConfig, layered.repoConfig);
    const repoConfigWithInheritedDefaults: WardenConfig = {
      ...repoConfig,
      defaults: inheritRepoLayerDefaults(layered.baseConfig.defaults, repoConfig.defaults),
    };

    return [
      ...resolveSkillConfigs(layered.baseConfig, cliModel, skillRootsByName?.base),
      ...resolveSkillConfigs(repoConfigWithInheritedDefaults, cliModel, skillRootsByName?.repo),
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
