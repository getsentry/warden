/**
 * Check Manager
 *
 * Manages GitHub Check runs for Warden triggers.
 * Wraps the core github-checks module with action-specific logic.
 */
import { aggregateSeverityCounts, determineConclusion, } from '../../output/github-checks.js';
import { mergeAuxiliaryUsage } from '../../sdk/usage.js';
// Re-export types and functions that are used directly
export { createCoreCheck, updateCoreCheck, createSkillCheck, updateSkillCheck, failSkillCheck, aggregateSeverityCounts, determineConclusion, } from '../../output/github-checks.js';
// -----------------------------------------------------------------------------
// Aggregate Functions
// -----------------------------------------------------------------------------
/**
 * Aggregate usage stats from multiple reports.
 */
export function aggregateUsage(reports) {
    const reportsWithUsage = reports.filter((r) => r.usage);
    if (reportsWithUsage.length === 0)
        return undefined;
    return {
        inputTokens: reportsWithUsage.reduce((sum, r) => sum + (r.usage?.inputTokens ?? 0), 0),
        outputTokens: reportsWithUsage.reduce((sum, r) => sum + (r.usage?.outputTokens ?? 0), 0),
        cacheReadInputTokens: reportsWithUsage.reduce((sum, r) => sum + (r.usage?.cacheReadInputTokens ?? 0), 0),
        cacheCreationInputTokens: reportsWithUsage.reduce((sum, r) => sum + (r.usage?.cacheCreationInputTokens ?? 0), 0),
        costUSD: reportsWithUsage.reduce((sum, r) => sum + (r.usage?.costUSD ?? 0), 0),
    };
}
/**
 * Build core check summary data from trigger results.
 */
export function buildCoreSummaryData(results, reports) {
    // Aggregate auxiliary usage across all reports
    let totalAuxiliaryUsage;
    for (const r of reports) {
        if (r.auxiliaryUsage) {
            totalAuxiliaryUsage = mergeAuxiliaryUsage(totalAuxiliaryUsage, r.auxiliaryUsage);
        }
    }
    return {
        totalSkills: results.length,
        totalFindings: reports.reduce((sum, r) => sum + r.findings.length, 0),
        findingsBySeverity: aggregateSeverityCounts(reports),
        totalDurationMs: reports.some((r) => r.durationMs !== undefined)
            ? reports.reduce((sum, r) => sum + (r.durationMs ?? 0), 0)
            : undefined,
        totalUsage: aggregateUsage(reports),
        totalAuxiliaryUsage,
        findings: reports.flatMap((r) => r.findings),
        skillResults: results.map((r) => ({
            name: r.triggerName,
            findingCount: r.report?.findings.length ?? 0,
            conclusion: r.report
                ? determineConclusion(r.report.findings, r.failOn)
                : 'failure',
            durationMs: r.report?.durationMs,
            usage: r.report?.usage,
        })),
    };
}
/**
 * Determine overall core check conclusion.
 */
export function determineCoreConclusion(shouldFailAction, totalFindings) {
    if (shouldFailAction) {
        return 'failure';
    }
    if (totalFindings > 0) {
        return 'neutral';
    }
    return 'success';
}
//# sourceMappingURL=manager.js.map