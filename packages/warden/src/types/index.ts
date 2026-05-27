import { z } from 'zod';

/**
 * Normalize legacy severity values to the 3-level scale.
 * Maps 'critical' → 'high' and 'info' → 'low' for backwards compatibility
 * with old JSONL logs and LLM responses.
 */
export function normalizeSeverity(val: unknown): unknown {
  if (val === 'critical') return 'high';
  if (val === 'info') return 'low';
  return val;
}

// Severity levels for findings
export const SeveritySchema = z.preprocess(normalizeSeverity, z.enum(['high', 'medium', 'low']));
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
export const SeverityThresholdSchema = z.preprocess(normalizeSeverity, z.enum(['off', 'high', 'medium', 'low']));
export type SeverityThreshold = z.infer<typeof SeverityThresholdSchema>;

// Confidence threshold for config options (includes 'off' to disable filtering)
export const ConfidenceThresholdSchema = z.enum(['off', 'high', 'medium', 'low']);
export type ConfidenceThreshold = z.infer<typeof ConfidenceThresholdSchema>;

/**
 * Severity order for comparison (lower = more severe).
 * Single source of truth for severity ordering across the codebase.
 */
export const SEVERITY_ORDER: Record<Severity, number> = {
  high: 0,
  medium: 1,
  low: 2,
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

/**
 * Filter findings to only include those at or above the given confidence threshold.
 * If no threshold is provided or threshold is 'off', returns all findings unchanged.
 * Findings without a confidence field are always included (backwards compat).
 */
export function filterFindingsByConfidence(findings: Finding[], threshold?: ConfidenceThreshold): Finding[] {
  if (!threshold || threshold === 'off') return findings;
  const thresholdOrder = CONFIDENCE_ORDER[threshold];
  return findings.filter((f) => {
    if (!f.confidence) return true;
    return CONFIDENCE_ORDER[f.confidence] <= thresholdOrder;
  });
}

/**
 * Filter findings by both severity and confidence thresholds.
 * Applies severity filtering first, then confidence filtering.
 * Either threshold can be omitted to skip that filter.
 */
export function filterFindings(
  findings: Finding[],
  reportOn?: SeverityThreshold,
  minConfidence?: ConfidenceThreshold
): Finding[] {
  return filterFindingsByConfidence(filterFindingsBySeverity(findings, reportOn), minConfidence);
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
  verification: z.string().optional(),
  location: LocationSchema.optional(),
  additionalLocations: z.array(LocationSchema).optional(),
  suggestedFix: SuggestedFixSchema.optional(),
  elapsedMs: z.number().nonnegative().optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

/**
 * Get the effective line number for a finding (endLine if present, otherwise startLine).
 */
export function findingLine(f: Finding): number {
  return f.location?.endLine ?? f.location?.startLine ?? 0;
}

/**
 * Compare two findings by priority for winner selection.
 * Lower return value = higher priority (more severe, more confident, earlier path/line).
 */
export function compareFindingPriority(a: Finding, b: Finding): number {
  const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  if (sevDiff !== 0) return sevDiff;

  const confA = CONFIDENCE_ORDER[a.confidence ?? 'low'];
  const confB = CONFIDENCE_ORDER[b.confidence ?? 'low'];
  const confDiff = confA - confB;
  if (confDiff !== 0) return confDiff;

  const pathCmp = (a.location?.path ?? '').localeCompare(b.location?.path ?? '');
  if (pathCmp !== 0) return pathCmp;

  return findingLine(a) - findingLine(b);
}

// Usage statistics normalized from runtime/provider responses.
// inputTokens is total input, including cache-read and cache-created subsets.
export const UsageStatsSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadInputTokens: z.number().int().nonnegative().optional(),
  cacheCreationInputTokens: z.number().int().nonnegative().optional(),
  cacheCreation5mInputTokens: z.number().int().nonnegative().optional(),
  cacheCreation1hInputTokens: z.number().int().nonnegative().optional(),
  webSearchRequests: z.number().int().nonnegative().optional(),
  costUSD: z.number().nonnegative(),
});
export type UsageStats = z.infer<typeof UsageStatsSchema>;

// Auxiliary usage from non-SDK LLM calls (extraction repair, semantic dedup, etc.)
export const AuxiliaryUsageMapSchema = z.record(z.string(), UsageStatsSchema);
export type AuxiliaryUsageMap = z.infer<typeof AuxiliaryUsageMapSchema>;

// Skipped file info for chunking
export const SkippedFileSchema = z.object({
  filename: z.string(),
  reason: z.enum(['pattern', 'builtin']),
  pattern: z.string().optional(),
});
export type SkippedFile = z.infer<typeof SkippedFileSchema>;

// Per-file report within a skill. `findings` is a count; the per-skill
// record uses the same name for the findings array. This matches the
// JSONL contract (see specs/jsonl-examples.jsonl).
//
// IMPORTANT: breaking on-disk JSONL log formats is NEVER ALLOWED. Old
// `.warden/logs/*.jsonl` files must always parse. The schema may evolve
// (add fields, normalize values) but readers must accept all historical
// shapes — convert legacy fields via preprocess/transform here, never by
// asking users to delete old logs. The preprocess below maps the legacy
// `findingCount` field (used pre-rename) into `findings`.
export const FileReportSchema = z.preprocess(
  (val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const obj = val as Record<string, unknown>;
      if ('findingCount' in obj && !('findings' in obj)) {
        const { findingCount, ...rest } = obj;
        return { ...rest, findings: findingCount };
      }
    }
    return val;
  },
  z.object({
    filename: z.string(),
    findings: z.number().int().nonnegative(),
    durationMs: z.number().nonnegative().optional(),
    usage: UsageStatsSchema.optional(),
  }),
);
export type FileReport = z.infer<typeof FileReportSchema>;

// Stable codes for run failures. Public contract: add new codes, do not rename.
export const ErrorCodeSchema = z.enum([
  'auth_failed',
  'provider_unavailable',
  'sdk_error',
  'subprocess_failure',
  'max_turns',
  'aborted',
  'all_hunks_failed',
  'invalid_model_selector',
  'skill_resolution_failed',
  'extraction_invalid_json',
  'extraction_unbalanced_json',
  'extraction_no_findings_json',
  'extraction_missing_findings_key',
  'extraction_findings_not_array',
  'extraction_llm_failed',
  'extraction_llm_timeout',
  'extraction_no_api_key',
  'unknown',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

const EXTRACTION_ERROR_CODES = new Set<ErrorCode>([
  'extraction_invalid_json',
  'extraction_unbalanced_json',
  'extraction_no_findings_json',
  'extraction_missing_findings_key',
  'extraction_findings_not_array',
  'extraction_llm_failed',
  'extraction_llm_timeout',
  'extraction_no_api_key',
]);

export function isExtractionErrorCode(code: ErrorCode): boolean {
  return EXTRACTION_ERROR_CODES.has(code);
}

export const SkillErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  timestamp: z.string().datetime().optional(),
});
export type SkillError = z.infer<typeof SkillErrorSchema>;

// 'analysis' = SDK/auth/abort failure, 'extraction' = parse-tier failure.
export const HunkFailureSchema = z.object({
  type: z.enum(['analysis', 'extraction']),
  filename: z.string(),
  lineRange: z.string(),
  code: ErrorCodeSchema,
  message: z.string(),
  preview: z.string().optional(),
  attempts: z.number().int().nonnegative().optional(),
});
export type HunkFailure = z.infer<typeof HunkFailureSchema>;

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
  /** Per-hunk failure details, in execution order. */
  hunkFailures: z.array(HunkFailureSchema).optional(),
  /** Set when the run cannot complete normally. */
  error: SkillErrorSchema.optional(),
  /** Usage from auxiliary LLM calls (extraction repair, semantic dedup, etc.) */
  auxiliaryUsage: AuxiliaryUsageMapSchema.optional(),
  /** Per-file breakdown of findings, timing, and usage */
  files: z.array(FileReportSchema).optional(),
  /** Model used for this skill's analysis */
  model: z.string().optional(),
  /** Runtime backend used for this skill's analysis. */
  runtime: z.string().optional(),
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
  'labeled',
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

// Source used to read surrounding file context for diff hunks.
export const DiffContextSourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('working-tree') }),
  z.object({ type: z.literal('git-index') }),
  z.object({ type: z.literal('git-ref'), ref: z.string() }),
]);
export type DiffContextSource = z.infer<typeof DiffContextSourceSchema>;

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
  draft: z.boolean().optional(),
  labels: z.array(z.string()).optional(),
  baseBranch: z.string(),
  headBranch: z.string(),
  headSha: z.string(),
  baseSha: z.string(),
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
  label: z.string().optional(),
  repository: RepositoryContextSchema,
  pullRequest: PullRequestContextSchema.optional(),
  repoPath: z.string(),
  diffContextSource: DiffContextSourceSchema.optional(),
});
export type EventContext = z.infer<typeof EventContextSchema>;

// Fix evaluation status
export const FixStatusSchema = z.enum(['not_attempted', 'attempted_failed', 'resolved']);
export type FixStatus = z.infer<typeof FixStatusSchema>;

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
