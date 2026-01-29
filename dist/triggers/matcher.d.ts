import type { Trigger } from '../config/schema.js';
import type { EventContext, Severity, SkillReport } from '../types/index.js';
/** Clear the glob cache (useful for testing) */
export declare function clearGlobCache(): void;
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
 */
export declare function shouldFail(report: SkillReport, failOn: Severity): boolean;
/**
 * Count findings at or above the given severity threshold.
 */
export declare function countFindingsAtOrAbove(report: SkillReport, failOn: Severity): number;
/**
 * Count findings of a specific severity across multiple reports.
 */
export declare function countSeverity(reports: SkillReport[], severity: Severity): number;
//# sourceMappingURL=matcher.d.ts.map