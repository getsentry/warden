import { z } from 'zod';
import {
  DataProfileSchema,
  FindingCountsSchema,
  RepositoryIdentitySchema,
  SERVICE_PROTOCOL_VERSION,
  SourceEvidenceSchema,
  UsageLineItemSchema,
} from './protocol.js';

const IdSchema = z.string().trim().min(1).max(128);
const TimestampSchema = z.string().datetime();

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string().trim().min(1).max(128),
    message: z.string().trim().min(1).max(512),
  }).strict(),
}).strict();
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const IngestRunResponseSchema = z.object({
  protocolVersion: z.literal(SERVICE_PROTOCOL_VERSION),
  runId: IdSchema,
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  created: z.boolean(),
}).strict();
export type IngestRunResponse = z.infer<typeof IngestRunResponseSchema>;

export const RunSummarySchema = z.object({
  id: IdSchema,
  clientRunId: IdSchema,
  source: z.enum(['cli', 'action', 'sdk', 'replay']),
  dataProfile: DataProfileSchema,
  repository: RepositoryIdentitySchema,
  startedAt: TimestampSchema,
  completedAt: TimestampSchema,
  outcome: z.enum(['success', 'failure', 'cancelled', 'skipped']),
  durationMs: z.number().finite().nonnegative(),
  findingCounts: FindingCountsSchema,
  costUsd: z.number().finite().nonnegative().nullable(),
  traceId: z.string().max(128).optional(),
}).strict();
export type RunSummary = z.infer<typeof RunSummarySchema>;

export const RunListResponseSchema = z.object({
  items: z.array(RunSummarySchema),
  nextCursor: z.string().trim().min(1).max(512).optional(),
}).strict();
export type RunListResponse = z.infer<typeof RunListResponseSchema>;

export const FindingOutcomeSchema = z.enum([
  'posted',
  'deduped',
  'skipped',
  'resolved',
  'failed',
  'rejected',
  'revised',
]);

export const FindingReviewVerdictSchema = z.enum([
  'false_positive',
  'true_positive',
  'mitigated',
]);
export type FindingReviewVerdict = z.infer<typeof FindingReviewVerdictSchema>;

export const FindingReviewSummarySchema = z.object({
  verdict: FindingReviewVerdictSchema,
  comment: z.string().max(4_000),
  updatedAt: TimestampSchema,
}).strict();
export type FindingReviewSummary = z.infer<typeof FindingReviewSummarySchema>;

export const FindingFeedItemSchema = z.object({
  id: IdSchema,
  displayId: IdSchema,
  runId: IdSchema,
  clientRunId: IdSchema,
  repository: RepositoryIdentitySchema,
  skill: z.string().trim().min(1).max(512),
  severity: z.enum(['high', 'medium', 'low']),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  title: z.string().trim().min(1).max(512),
  description: z.string().trim().min(1).max(8_000),
  location: z.object({
    path: z.string().trim().min(1).max(1_024),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive().optional(),
  }).strict().optional(),
  outcome: FindingOutcomeSchema.nullable(),
  /** Current inspect review. Does not replace `outcome`. */
  review: FindingReviewSummarySchema.optional(),
  /** Earliest observation timestamp for this finding row. */
  firstObservedAt: TimestampSchema.nullable(),
  /** Latest observation timestamp for this finding row. */
  lastObservedAt: TimestampSchema.nullable(),
  completedAt: TimestampSchema,
}).strict();
export type FindingFeedItem = z.infer<typeof FindingFeedItemSchema>;

export const FindingDetailResponseSchema = z.object({
  finding: FindingFeedItemSchema,
  headSha: z.string().trim().min(7).max(128).optional(),
  sourceUrl: z.url().max(4_096).optional(),
  sourceEvidence: SourceEvidenceSchema.optional(),
  verification: z.string().trim().min(1).max(4_000).optional(),
}).strict();
export type FindingDetailResponse = z.infer<typeof FindingDetailResponseSchema>;

export const FindingListResponseSchema = z.object({
  items: z.array(FindingFeedItemSchema),
  nextCursor: z.string().trim().min(1).max(512).optional(),
}).strict();
export type FindingListResponse = z.infer<typeof FindingListResponseSchema>;

export const FindingListQuerySchema = z.object({
  review: FindingReviewVerdictSchema.optional(),
}).strict();
export type FindingListQuery = z.infer<typeof FindingListQuerySchema>;

export const PublishReviewsItemSchema = z.object({
  skill: z.string().trim().min(1).max(512),
  findingId: IdSchema,
  occurrence: z.number().int().positive(),
  verdict: FindingReviewVerdictSchema,
  comment: z.string().max(4_000),
  updatedAt: TimestampSchema,
}).strict();
export type PublishReviewsItem = z.infer<typeof PublishReviewsItemSchema>;

export const PublishReviewsRequestSchema = z.object({
  reviews: z.array(PublishReviewsItemSchema).max(500),
}).strict();
export type PublishReviewsRequest = z.infer<typeof PublishReviewsRequestSchema>;

export const PublishReviewsUnmatchedSchema = z.object({
  skill: z.string().trim().min(1).max(512),
  findingId: IdSchema,
  occurrence: z.number().int().positive(),
  reason: z.literal('finding_not_found'),
}).strict();
export type PublishReviewsUnmatched = z.infer<typeof PublishReviewsUnmatchedSchema>;

export const PublishReviewsResponseSchema = z.object({
  runId: IdSchema,
  clientRunId: IdSchema,
  applied: z.number().int().nonnegative(),
  unmatched: z.array(PublishReviewsUnmatchedSchema),
}).strict();
export type PublishReviewsResponse = z.infer<typeof PublishReviewsResponseSchema>;

export const RunDetailResponseSchema = z.object({
  run: RunSummarySchema,
  skills: z.array(z.object({
    id: IdSchema,
    executionId: IdSchema,
    skill: z.string().min(1).max(512),
    status: z.enum(['success', 'failure', 'cancelled', 'skipped']),
    model: z.string().max(255).optional(),
    runtime: z.string().max(128).optional(),
    durationMs: z.number().finite().nonnegative().optional(),
    findingCounts: FindingCountsSchema,
    usage: z.array(UsageLineItemSchema),
  }).strict()),
}).strict();
export type RunDetailResponse = z.infer<typeof RunDetailResponseSchema>;

export const CostGroupSchema = z.object({
  dimensions: z.record(z.string(), z.string()),
  runs: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  costUsd: z.number().finite().nonnegative().nullable(),
}).strict();
export type CostGroup = z.infer<typeof CostGroupSchema>;

export const CostAggregateResponseSchema = z.object({
  groups: z.array(CostGroupSchema),
  totals: z.object({
    runs: z.number().int().nonnegative(),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    costUsd: z.number().finite().nonnegative().nullable(),
  }).strict(),
}).strict();
export type CostAggregateResponse = z.infer<typeof CostAggregateResponseSchema>;

export const CostBreakdownsResponseSchema = z.object({
  breakdowns: z.array(z.object({
    dimension: z.enum(['day', 'repository', 'skill', 'model', 'runtime', 'provider', 'lane', 'source', 'outcome']),
    groups: z.array(CostGroupSchema),
  }).strict()),
}).strict();
export type CostBreakdownsResponse = z.infer<typeof CostBreakdownsResponseSchema>;

export const HistoryDimensionsResponseSchema = z.object({
  repositories: z.array(z.object({
    id: IdSchema,
    repository: RepositoryIdentitySchema,
  }).strict()),
  skills: z.array(z.string().trim().min(1).max(512)),
}).strict();
export type HistoryDimensionsResponse = z.infer<typeof HistoryDimensionsResponseSchema>;

export const RepositorySummarySchema = z.object({
  id: IdSchema,
  repository: RepositoryIdentitySchema,
  runs: z.number().int().nonnegative(),
  findings: z.number().int().nonnegative(),
  costUsd: z.number().finite().nonnegative().nullable(),
  lastRunAt: TimestampSchema.nullable(),
}).strict();
export type RepositorySummary = z.infer<typeof RepositorySummarySchema>;

export const RepositoryListResponseSchema = z.object({
  items: z.array(RepositorySummarySchema),
}).strict();
export type RepositoryListResponse = z.infer<typeof RepositoryListResponseSchema>;

export const SkillSummarySchema = z.object({
  skill: z.string().trim().min(1).max(512),
  executions: z.number().int().nonnegative(),
  successful: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  findings: z.number().int().nonnegative(),
  costUsd: z.number().finite().nonnegative().nullable(),
}).strict();
export type SkillSummary = z.infer<typeof SkillSummarySchema>;

export const SkillListResponseSchema = z.object({
  items: z.array(SkillSummarySchema),
}).strict();
export type SkillListResponse = z.infer<typeof SkillListResponseSchema>;

export const OutcomeSummaryResponseSchema = z.object({
  totals: z.object({
    runs: z.number().int().nonnegative(),
    successful: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    cancelled: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    findings: z.number().int().nonnegative(),
    costUsd: z.number().finite().nonnegative().nullable(),
  }).strict(),
}).strict();
export type OutcomeSummaryResponse = z.infer<typeof OutcomeSummaryResponseSchema>;

export const MemoryKindSchema = z.enum(['convention', 'confirmed_pattern', 'false_positive', 'review_guidance']);
export const MemoryLifecycleSchema = z.enum(['candidate', 'active', 'superseded', 'archived', 'expired']);

export const MemoryRecordSchema = z.object({
  id: IdSchema,
  version: z.number().int().positive(),
  repository: RepositoryIdentitySchema,
  kind: MemoryKindSchema,
  lifecycle: MemoryLifecycleSchema,
  content: z.string().trim().min(1).max(4_000),
  skill: z.string().trim().min(1).max(512).optional(),
  language: z.string().trim().min(1).max(64).optional(),
  pathFamily: z.string().trim().min(1).max(512).optional(),
  createdAt: TimestampSchema,
  observedAt: TimestampSchema,
  expiresAt: TimestampSchema.optional(),
}).strict();
export type MemoryRecord = z.infer<typeof MemoryRecordSchema>;

export const MemoryRecallRequestSchema = z.object({
  protocolVersion: z.literal(SERVICE_PROTOCOL_VERSION),
  clientRecallId: IdSchema,
  repository: RepositoryIdentitySchema,
  skills: z.array(z.string().trim().min(1).max(512)).max(100),
  languages: z.array(z.string().trim().min(1).max(64)).max(32),
  paths: z.array(z.string().trim().min(1).max(1_024)).max(500),
}).strict();
export type MemoryRecallRequest = z.infer<typeof MemoryRecallRequestSchema>;

export const MemoryRecallResponseSchema = z.object({
  protocolVersion: z.literal(SERVICE_PROTOCOL_VERSION),
  clientRecallId: IdSchema,
  memories: z.array(MemoryRecordSchema.pick({
    id: true,
    version: true,
    kind: true,
    content: true,
    skill: true,
    language: true,
    pathFamily: true,
  })).max(5),
}).strict();
export type MemoryRecallResponse = z.infer<typeof MemoryRecallResponseSchema>;

export const MemoryListResponseSchema = z.object({
  items: z.array(MemoryRecordSchema),
  nextCursor: z.string().trim().min(1).max(512).optional(),
}).strict();

export const MemoryMutationResponseSchema = z.object({
  memory: MemoryRecordSchema,
}).strict();

export const MemoryDetailResponseSchema = z.object({
  memory: MemoryRecordSchema,
  evidence: z.array(z.object({
    kind: z.string().trim().min(1).max(128),
    findingId: IdSchema.optional(),
    observationId: IdSchema.optional(),
    createdAt: TimestampSchema,
  }).strict()),
  lifecycle: z.array(z.object({
    from: MemoryLifecycleSchema.optional(),
    to: MemoryLifecycleSchema,
    reason: z.string().trim().min(1).max(1_000).optional(),
    createdAt: TimestampSchema,
  }).strict()),
}).strict();
export type MemoryDetailResponse = z.infer<typeof MemoryDetailResponseSchema>;
