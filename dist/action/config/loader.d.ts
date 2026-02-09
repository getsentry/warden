import { type WardenConfig, type ScheduleConfig, type TriggerType } from './schema.js';
import type { SeverityThreshold } from '../types/index.js';
export declare class ConfigLoadError extends Error {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
export declare function loadWardenConfig(repoPath: string): WardenConfig;
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
    filters: {
        paths?: string[];
        ignorePaths?: string[];
    };
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
export declare function resolveSkillConfigs(config: WardenConfig, cliModel?: string): ResolvedTrigger[];
//# sourceMappingURL=loader.d.ts.map