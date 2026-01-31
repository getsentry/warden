import { z } from 'zod';

// Severity levels for findings
export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export type Severity = z.infer<typeof SeveritySchema>;

// Confidence levels for findings
export const ConfidenceSchema = z.enum(['high', 'medium', 'low']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

/**
 * Confidence order for comparison (lower = more confident).
 * Single source of truth for confidence ordering across the codebase.
 */
export const CONFIDENCE_ORDER: Record<Confidence, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

// Severity threshold for config options (includes 'off' to disable)
export const SeverityThresholdSchema = z.enum(['off', 'critical', 'high', 'medium', 'low', 'info']);
export type SeverityThreshold = z.infer<typeof SeverityThresholdSchema>;

/**
 * Severity order for comparison (lower = more severe).
 * Single source of truth for severity ordering across the codebase.
 */
export const SEVERITY_ORDER: Record<Severity, number> = {
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
export function filterFindingsBySeverity(findings: Finding[], threshold?: SeverityThreshold): Finding[] {
  if (!threshold) return findings;
  if (threshold === 'off') return [];
  const thresholdOrder = SEVERITY_ORDER[threshold];
  return findings.filter((f) => SEVERITY_ORDER[f.severity] <= thresholdOrder);
}

// Location within a file
export const LocationSchema = z.object({
  path: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive().optional(),
});
export type Location = z.infer<typeof LocationSchema>;

// Suggested fix with diff
export const SuggestedFixSchema = z.object({
  description: z.string(),
  diff: z.string(),
});
export type SuggestedFix = z.infer<typeof SuggestedFixSchema>;

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
export type Finding = z.infer<typeof FindingSchema>;

// Usage statistics from SDK
export const UsageStatsSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadInputTokens: z.number().int().nonnegative().optional(),
  cacheCreationInputTokens: z.number().int().nonnegative().optional(),
  costUSD: z.number().nonnegative(),
});
export type UsageStats = z.infer<typeof UsageStatsSchema>;

// Skipped file info for chunking
export const SkippedFileSchema = z.object({
  filename: z.string(),
  reason: z.enum(['pattern', 'builtin']),
  pattern: z.string().optional(),
});
export type SkippedFile = z.infer<typeof SkippedFileSchema>;

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
});
export type SkillReport = z.infer<typeof SkillReportSchema>;

// GitHub event types
export const GitHubEventTypeSchema = z.enum([
  'pull_request',
  'issues',
  'issue_comment',
  'pull_request_review',
  'pull_request_review_comment',
  'schedule',
]);
export type GitHubEventType = z.infer<typeof GitHubEventTypeSchema>;

// Pull request actions
export const PullRequestActionSchema = z.enum([
  'opened',
  'synchronize',
  'reopened',
  'closed',
]);
export type PullRequestAction = z.infer<typeof PullRequestActionSchema>;

// File change info
export const FileChangeSchema = z.object({
  filename: z.string(),
  status: z.enum(['added', 'removed', 'modified', 'renamed', 'copied', 'changed', 'unchanged']),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  patch: z.string().optional(),
  chunks: z.number().int().nonnegative().optional(),
});
export type FileChange = z.infer<typeof FileChangeSchema>;

/**
 * Count the number of chunks/hunks in a patch string.
 * Each chunk starts with @@ -X,Y +A,B @@
 */
export function countPatchChunks(patch: string | undefined): number {
  if (!patch) return 0;
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
  files: z.array(FileChangeSchema),
});
export type PullRequestContext = z.infer<typeof PullRequestContextSchema>;

// Repository context
export const RepositoryContextSchema = z.object({
  owner: z.string(),
  name: z.string(),
  fullName: z.string(),
  defaultBranch: z.string(),
});
export type RepositoryContext = z.infer<typeof RepositoryContextSchema>;

// Full event context
export const EventContextSchema = z.object({
  eventType: GitHubEventTypeSchema,
  action: z.string(),
  repository: RepositoryContextSchema,
  pullRequest: PullRequestContextSchema.optional(),
  repoPath: z.string(),
});
export type EventContext = z.infer<typeof EventContextSchema>;

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
export type RetryConfig = z.infer<typeof RetryConfigSchema>;
