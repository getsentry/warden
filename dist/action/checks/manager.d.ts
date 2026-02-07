/**
 * Check Manager
 *
 * Manages GitHub Check runs for Warden triggers.
 * Wraps the core github-checks module with action-specific logic.
 */
import type { SkillReport, UsageStats, AuxiliaryUsageMap } from '../../types/index.js';
import type { TriggerResult } from '../triggers/executor.js';
export { createCoreCheck, updateCoreCheck, createSkillCheck, updateSkillCheck, failSkillCheck, aggregateSeverityCounts, determineConclusion, } from '../../output/github-checks.js';
export type { CheckOptions, UpdateSkillCheckOptions, CreateCheckResult, CoreCheckSummaryData, CheckConclusion, } from '../../output/github-checks.js';
/**
 * Aggregate usage stats from multiple reports.
 */
export declare function aggregateUsage(reports: SkillReport[]): UsageStats | undefined;
/**
 * Build core check summary data from trigger results.
 */
export declare function buildCoreSummaryData(results: TriggerResult[], reports: SkillReport[]): {
    totalSkills: number;
    totalFindings: number;
    findingsBySeverity: Record<string, number>;
    totalDurationMs?: number;
    totalUsage?: UsageStats;
    totalAuxiliaryUsage?: AuxiliaryUsageMap;
    findings: SkillReport['findings'];
    skillResults: {
        name: string;
        findingCount: number;
        conclusion: 'success' | 'failure' | 'neutral' | 'cancelled';
        durationMs?: number;
        usage?: UsageStats;
    }[];
};
/**
 * Determine overall core check conclusion.
 */
export declare function determineCoreConclusion(shouldFailAction: boolean, totalFindings: number): 'success' | 'failure' | 'neutral';
//# sourceMappingURL=manager.d.ts.map