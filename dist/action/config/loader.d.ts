import { type WardenConfig, type Trigger, type PathFilter, type OutputConfig } from './schema.js';
export declare class ConfigLoadError extends Error {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
export declare function loadWardenConfig(repoPath: string): WardenConfig;
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
 *
 * Model precedence (highest to lowest):
 * 1. trigger.model (warden.toml trigger-level)
 * 2. defaults.model (warden.toml [defaults])
 * 3. cliModel (--model flag)
 * 4. WARDEN_MODEL env var
 * 5. SDK default (not set here)
 */
export declare function resolveTrigger(trigger: Trigger, config: WardenConfig, cliModel?: string): ResolvedTrigger;
//# sourceMappingURL=loader.d.ts.map