import type { ResolvedTrigger } from '../config/loader.js';
import type { TriggerType } from '../config/schema.js';
import type { EventContext, Severity, SeverityThreshold, SkillReport } from '../types/index.js';
/** Clear the glob cache (useful for testing) */
export declare function clearGlobCache(): void;
/** Get current cache size (useful for testing) */
export declare function getGlobCacheSize(): number;
/**
 * Match a glob pattern against a file path.
 * Supports ** for recursive matching and * for single directory matching.
 */
export declare function matchGlob(pattern: string, path: string): boolean;
/**
 * Return a copy of the context with only files matching the path filters.
 * If no filters are set, returns the original context unchanged (no copy).
 */
export declare function filterContextByPaths(context: EventContext, filters: {
    paths?: string[];
    ignorePaths?: string[];
}): EventContext;
/**
 * Check if a trigger matches the given event context and environment.
 *
 * Trigger types:
 * - '*' (wildcard): matches all environments, skips event/action checks
 * - 'local': matches only when environment is 'local'
 * - 'pull_request': matches when environment is 'github' and event is pull_request
 * - 'schedule': matches when event is schedule
 */
export declare function matchTrigger(trigger: ResolvedTrigger, context: EventContext, environment?: TriggerType | 'github'): boolean;
/**
 * Check if a report has any findings at or above the given severity threshold.
 * Returns false if failOn is 'off' (disabled).
 */
export declare function shouldFail(report: SkillReport, failOn: SeverityThreshold): boolean;
/**
 * Count findings at or above the given severity threshold.
 * Returns 0 if failOn is 'off' (disabled).
 */
export declare function countFindingsAtOrAbove(report: SkillReport, failOn: SeverityThreshold): number;
/**
 * Count findings of a specific severity across multiple reports.
 */
export declare function countSeverity(reports: SkillReport[], severity: Severity): number;
//# sourceMappingURL=matcher.d.ts.map