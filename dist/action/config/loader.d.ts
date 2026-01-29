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
 */
export declare function resolveTrigger(trigger: Trigger, config: WardenConfig): ResolvedTrigger;
//# sourceMappingURL=loader.d.ts.map