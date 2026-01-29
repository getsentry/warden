import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import {
  WardenConfigSchema,
  type WardenConfig,
  type Trigger,
  type PathFilter,
  type OutputConfig,
} from './schema.js';

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

  const result = WardenConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    const issues = result.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new ConfigLoadError(`Invalid configuration:\n${issues}`);
  }

  return result.data;
}

/**
 * Resolved trigger configuration with defaults applied.
 */
export interface ResolvedTrigger extends Trigger {
  filters: PathFilter;
  output: OutputConfig;
}

/**
 * Resolve a trigger's configuration by merging with defaults.
 * Trigger-specific values override defaults.
 */
export function resolveTrigger(trigger: Trigger, config: WardenConfig): ResolvedTrigger {
  const defaults = config.defaults;

  return {
    ...trigger,
    filters: {
      paths: trigger.filters?.paths ?? defaults?.filters?.paths,
      ignorePaths: trigger.filters?.ignorePaths ?? defaults?.filters?.ignorePaths,
    },
    output: {
      failOn: trigger.output?.failOn ?? defaults?.output?.failOn,
      commentOn: trigger.output?.commentOn ?? defaults?.output?.commentOn,
      maxFindings: trigger.output?.maxFindings ?? defaults?.output?.maxFindings,
      labels: trigger.output?.labels ?? defaults?.output?.labels,
      commentOnSuccess: trigger.output?.commentOnSuccess ?? defaults?.output?.commentOnSuccess,
    },
    model: trigger.model ?? defaults?.model,
  };
}
