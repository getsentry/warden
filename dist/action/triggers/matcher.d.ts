import type { Trigger } from '../config/schema.js';
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
 * Check if a trigger matches the given event context.
 */
export declare function matchTrigger(trigger: Trigger, context: EventContext): boolean;
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