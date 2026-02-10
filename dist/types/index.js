import { z } from 'zod';
// Severity levels for findings
export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
// Confidence levels for findings
export const ConfidenceSchema = z.enum(['high', 'medium', 'low']);
/**
 * Confidence order for comparison (lower = more confident).
 * Single source of truth for confidence ordering across the codebase.
 */
export const CONFIDENCE_ORDER = {
    high: 0,
    medium: 1,
    low: 2,
};
// Severity threshold for config options (includes 'off' to disable)
export const SeverityThresholdSchema = z.enum(['off', 'critical', 'high', 'medium', 'low', 'info']);
/**
 * Severity order for comparison (lower = more severe).
 * Single source of truth for severity ordering across the codebase.
 */
export const SEVERITY_ORDER = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
};
/**
 * Filter findings to only include those at or above the given severity threshold.
 * If no threshold is provided, returns all findings unchanged.
 * If threshold is 'off', returns empty array (disabled).
 */
export function filterFindingsBySeverity(findings, threshold) {
    if (!threshold)
        return findings;
    if (threshold === 'off')
        return [];
    const thresholdOrder = SEVERITY_ORDER[threshold];
    return findings.filter((f) => SEVERITY_ORDER[f.severity] <= thresholdOrder);
}
// Location within a file
export const LocationSchema = z.object({
    path: z.string(),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive().optional(),
});
// Suggested fix with diff
export const SuggestedFixSchema = z.object({
    description: z.string(),
    diff: z.string(),
});
// Individual finding from a skill
export const FindingSchema = z.object({
    id: z.string(),
    severity: SeveritySchema,
    confidence: ConfidenceSchema.optional(),
    title: z.string(),
    description: z.string(),
    location: LocationSchema.optional(),
    suggestedFix: SuggestedFixSchema.optional(),
    elapsedMs: z.number().nonnegative().optional(),
});
// Usage statistics from SDK
export const UsageStatsSchema = z.object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    cacheReadInputTokens: z.number().int().nonnegative().optional(),
    cacheCreationInputTokens: z.number().int().nonnegative().optional(),
    costUSD: z.number().nonnegative(),
});
// Auxiliary usage from non-SDK LLM calls (extraction repair, semantic dedup, etc.)
export const AuxiliaryUsageMapSchema = z.record(z.string(), UsageStatsSchema);
// Skipped file info for chunking
export const SkippedFileSchema = z.object({
    filename: z.string(),
    reason: z.enum(['pattern', 'builtin']),
    pattern: z.string().optional(),
});
// Per-file report within a skill
export const FileReportSchema = z.object({
    filename: z.string(),
    findingCount: z.number().int().nonnegative(),
    durationMs: z.number().nonnegative().optional(),
    usage: UsageStatsSchema.optional(),
});
// Skill report output
export const SkillReportSchema = z.object({
    skill: z.string(),
    summary: z.string(),
    findings: z.array(FindingSchema),
    metadata: z.record(z.string(), z.unknown()).optional(),
    durationMs: z.number().nonnegative().optional(),
    usage: UsageStatsSchema.optional(),
    /** Files that were skipped due to chunking patterns */
    skippedFiles: z.array(SkippedFileSchema).optional(),
    /** Number of hunks that failed to analyze (SDK errors, API errors, etc.) */
    failedHunks: z.number().int().nonnegative().optional(),
    /** Number of hunks where findings extraction failed (JSON parse errors) */
    failedExtractions: z.number().int().nonnegative().optional(),
    /** Usage from auxiliary LLM calls (extraction repair, semantic dedup, etc.) */
    auxiliaryUsage: AuxiliaryUsageMapSchema.optional(),
    /** Per-file breakdown of findings, timing, and usage */
    files: z.array(FileReportSchema).optional(),
});
// GitHub event types
export const GitHubEventTypeSchema = z.enum([
    'pull_request',
    'issues',
    'issue_comment',
    'pull_request_review',
    'pull_request_review_comment',
    'schedule',
]);
// Pull request actions
export const PullRequestActionSchema = z.enum([
    'opened',
    'synchronize',
    'reopened',
    'closed',
]);
// File change info
export const FileChangeSchema = z.object({
    filename: z.string(),
    status: z.enum(['added', 'removed', 'modified', 'renamed', 'copied', 'changed', 'unchanged']),
    additions: z.number().int().nonnegative(),
    deletions: z.number().int().nonnegative(),
    patch: z.string().optional(),
    chunks: z.number().int().nonnegative().optional(),
});
/**
 * Count the number of chunks/hunks in a patch string.
 * Each chunk starts with @@ -X,Y +A,B @@
 */
export function countPatchChunks(patch) {
    if (!patch)
        return 0;
    const matches = patch.match(/^@@\s/gm);
    return matches?.length ?? 0;
}
// Pull request context
export const PullRequestContextSchema = z.object({
    number: z.number().int().positive(),
    title: z.string(),
    body: z.string().nullable(),
    author: z.string(),
    baseBranch: z.string(),
    headBranch: z.string(),
    headSha: z.string(),
    baseSha: z.string(),
    files: z.array(FileChangeSchema),
});
// Repository context
export const RepositoryContextSchema = z.object({
    owner: z.string(),
    name: z.string(),
    fullName: z.string(),
    defaultBranch: z.string(),
});
// Full event context
export const EventContextSchema = z.object({
    eventType: GitHubEventTypeSchema,
    action: z.string(),
    repository: RepositoryContextSchema,
    pullRequest: PullRequestContextSchema.optional(),
    repoPath: z.string(),
});
// Retry configuration for SDK calls
export const RetryConfigSchema = z.object({
    /** Maximum number of retry attempts (default: 3) */
    maxRetries: z.number().int().nonnegative().default(3),
    /** Initial delay in milliseconds before first retry (default: 1000) */
    initialDelayMs: z.number().int().positive().default(1000),
    /** Multiplier for exponential backoff (default: 2) */
    backoffMultiplier: z.number().positive().default(2),
    /** Maximum delay in milliseconds between retries (default: 30000) */
    maxDelayMs: z.number().int().positive().default(30000),
});
//# sourceMappingURL=index.js.map