import type { Octokit } from '@octokit/rest';
import type { Severity, Finding, SkillReport } from '../types/index.js';
/**
 * GitHub Check annotation for inline code comments.
 */
export interface CheckAnnotation {
    path: string;
    start_line: number;
    end_line: number;
    annotation_level: 'failure' | 'warning' | 'notice';
    message: string;
    title?: string;
}
/**
 * Possible conclusions for a GitHub Check run.
 */
export type CheckConclusion = 'success' | 'failure' | 'neutral' | 'cancelled';
/**
 * Options for creating/updating checks.
 */
export interface CheckOptions {
    owner: string;
    repo: string;
    headSha: string;
}
/**
 * Options for updating a skill check.
 */
export interface UpdateSkillCheckOptions extends CheckOptions {
    failOn?: Severity;
    /** Only include findings at or above this severity level in annotations */
    commentOn?: Severity;
}
/**
 * Summary data for the core warden check.
 */
export interface CoreCheckSummaryData {
    totalSkills: number;
    totalFindings: number;
    findingsBySeverity: Record<Severity, number>;
    skillResults: {
        name: string;
        findingCount: number;
        conclusion: CheckConclusion;
    }[];
}
/**
 * Result from creating a check run.
 */
export interface CreateCheckResult {
    checkRunId: number;
    url: string;
}
/**
 * Map severity levels to GitHub annotation levels.
 * critical/high -> failure, medium -> warning, low/info -> notice
 */
export declare function severityToAnnotationLevel(severity: Severity): CheckAnnotation['annotation_level'];
/**
 * Convert findings to GitHub Check annotations.
 * Only findings with locations can be converted to annotations.
 * Returns at most MAX_ANNOTATIONS_PER_REQUEST annotations.
 * If commentOn is specified, only include findings at or above that severity.
 */
export declare function findingsToAnnotations(findings: Finding[], commentOn?: Severity): CheckAnnotation[];
/**
 * Determine the check conclusion based on findings and failOn threshold.
 * - No findings: success
 * - Findings, none >= failOn: neutral
 * - Findings >= failOn threshold: failure
 */
export declare function determineConclusion(findings: Finding[], failOn?: Severity): CheckConclusion;
/**
 * Create a check run for a skill.
 * The check is created with status: in_progress.
 */
export declare function createSkillCheck(octokit: Octokit, skillName: string, options: CheckOptions): Promise<CreateCheckResult>;
/**
 * Update a skill check with results.
 * Completes the check with conclusion, summary, and annotations.
 */
export declare function updateSkillCheck(octokit: Octokit, checkRunId: number, report: SkillReport, options: UpdateSkillCheckOptions): Promise<void>;
/**
 * Mark a skill check as failed due to execution error.
 */
export declare function failSkillCheck(octokit: Octokit, checkRunId: number, error: unknown, options: CheckOptions): Promise<void>;
/**
 * Create the core warden check run.
 * The check is created with status: in_progress.
 */
export declare function createCoreCheck(octokit: Octokit, options: CheckOptions): Promise<CreateCheckResult>;
/**
 * Update the core warden check with overall summary.
 */
export declare function updateCoreCheck(octokit: Octokit, checkRunId: number, summaryData: CoreCheckSummaryData, conclusion: CheckConclusion, options: Omit<CheckOptions, 'headSha'>): Promise<void>;
/**
 * Aggregate severity counts from multiple reports.
 */
export declare function aggregateSeverityCounts(reports: SkillReport[]): Record<Severity, number>;
//# sourceMappingURL=github-checks.d.ts.map