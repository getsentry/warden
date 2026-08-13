import { z } from 'zod';

export const SERVICE_PROTOCOL_VERSION = 1 as const;

const IdSchema = z.string().trim().min(1).max(128);
const ShortTextSchema = z.string().trim().min(1).max(512);
const DescriptionSchema = z.string().trim().min(1).max(8_000);
const PathSchema = z.string().trim().min(1).max(1_024);
const ShaSchema = z.string().trim().min(7).max(128);
const TimestampSchema = z.string().datetime();
const NonNegativeIntegerSchema = z.number().int().nonnegative();
const NonNegativeNumberSchema = z.number().finite().nonnegative();

export const DataProfileSchema = z.enum(['metrics', 'findings', 'code']);
export type DataProfile = z.infer<typeof DataProfileSchema>;

export const RepositoryIdentitySchema = z.object({
  provider: z.enum(['github', 'gitlab', 'local']),
  owner: z.string().trim().min(1).max(255),
  name: z.string().trim().min(1).max(255),
  fullName: z.string().trim().min(1).max(512),
}).strict().superRefine((repository, context) => {
  if (repository.fullName !== `${repository.owner}/${repository.name}`) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fullName'],
      message: 'fullName must match owner/name',
    });
  }
});
export type RepositoryIdentity = z.infer<typeof RepositoryIdentitySchema>;

export const UsageLineItemSchema = z.object({
  lane: z.string().trim().min(1).max(64),
  operation: z.string().trim().min(1).max(128).optional(),
  provider: z.string().trim().min(1).max(128).optional(),
  model: z.string().trim().min(1).max(255).optional(),
  runtime: z.string().trim().min(1).max(128).optional(),
  inputTokens: NonNegativeIntegerSchema.optional(),
  outputTokens: NonNegativeIntegerSchema.optional(),
  cacheReadInputTokens: NonNegativeIntegerSchema.optional(),
  cacheCreationInputTokens: NonNegativeIntegerSchema.optional(),
  cacheCreation5mInputTokens: NonNegativeIntegerSchema.optional(),
  cacheCreation1hInputTokens: NonNegativeIntegerSchema.optional(),
  webSearchRequests: NonNegativeIntegerSchema.optional(),
  costUsd: NonNegativeNumberSchema.nullable(),
  costBasis: z.enum(['reported', 'estimated', 'unknown']),
}).strict();
export type UsageLineItem = z.infer<typeof UsageLineItemSchema>;

export const FindingCountsSchema = z.object({
  total: NonNegativeIntegerSchema,
  bySeverity: z.object({
    high: NonNegativeIntegerSchema,
    medium: NonNegativeIntegerSchema,
    low: NonNegativeIntegerSchema,
  }).strict(),
}).strict();
export type FindingCounts = z.infer<typeof FindingCountsSchema>;

export const SkillExecutionSchema = z.object({
  executionId: IdSchema,
  skill: ShortTextSchema,
  skillDigest: z.string().trim().min(1).max(128).optional(),
  triggerId: IdSchema.optional(),
  triggerName: ShortTextSchema.optional(),
  model: z.string().trim().min(1).max(255).optional(),
  runtime: z.string().trim().min(1).max(128).optional(),
  status: z.enum(['success', 'failure', 'cancelled', 'skipped']),
  errorCode: z.string().trim().min(1).max(128).optional(),
  durationMs: NonNegativeNumberSchema.optional(),
  findingCounts: FindingCountsSchema,
  usage: z.array(UsageLineItemSchema).max(64),
}).strict();
export type SkillExecution = z.infer<typeof SkillExecutionSchema>;

export const FindingLocationSchema = z.object({
  path: PathSchema,
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive().optional(),
}).strict();
export type FindingLocation = z.infer<typeof FindingLocationSchema>;

const FindingSnapshotSchema = z.object({
  title: ShortTextSchema,
  description: DescriptionSchema,
  severity: z.enum(['high', 'medium', 'low']),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
}).strict();

export const FindingProvenanceSchema = z.object({
  originSkillExecutionId: IdSchema.optional(),
  originModel: z.string().trim().min(1).max(255).optional(),
  verification: z.object({
    outcome: z.literal('revised'),
    model: z.string().trim().min(1).max(255).optional(),
    evidence: z.string().trim().min(1).max(4_000).optional(),
    before: FindingSnapshotSchema,
  }).strict().optional(),
  merge: z.object({
    model: z.string().trim().min(1).max(255).optional(),
    absorbedFindingIds: z.array(IdSchema).max(100),
  }).strict().optional(),
}).strict();
export type FindingProvenance = z.infer<typeof FindingProvenanceSchema>;

const FindingRecordBaseSchema = z.object({
  id: IdSchema,
  reportedId: IdSchema.optional(),
  skillExecutionId: IdSchema,
  severity: z.enum(['high', 'medium', 'low']),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  title: ShortTextSchema,
  description: DescriptionSchema,
  verification: z.string().trim().min(1).max(4_000).optional(),
  location: FindingLocationSchema.optional(),
  additionalLocations: z.array(FindingLocationSchema).max(20).optional(),
  provenance: FindingProvenanceSchema.optional(),
}).strict();

export const FindingRecordSchema = FindingRecordBaseSchema;
export type FindingRecord = z.infer<typeof FindingRecordSchema>;

export const SourceEvidenceSchema = z.object({
  path: PathSchema,
  language: z.string().trim().min(1).max(64).optional(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  targetStartLine: z.number().int().positive(),
  targetEndLine: z.number().int().positive(),
  content: z.string().max(16_000),
}).strict();
export type SourceEvidence = z.infer<typeof SourceEvidenceSchema>;

export const CodeFindingRecordSchema = FindingRecordBaseSchema.extend({
  sourceEvidence: SourceEvidenceSchema.optional(),
}).strict();
export type CodeFindingRecord = z.infer<typeof CodeFindingRecordSchema>;

export const FindingObservationSchema = z.object({
  findingId: IdSchema,
  skillExecutionId: IdSchema.optional(),
  outcome: z.enum(['posted', 'deduped', 'skipped', 'resolved', 'failed', 'rejected', 'revised']),
  reason: z.string().trim().min(1).max(128).optional(),
  observedAt: TimestampSchema,
}).strict();
export type FindingObservation = z.infer<typeof FindingObservationSchema>;

export const RecalledMemoryReferenceSchema = z.object({
  id: IdSchema,
  version: z.number().int().positive(),
}).strict();
export type RecalledMemoryReference = z.infer<typeof RecalledMemoryReferenceSchema>;

const RunEnvelopeBaseSchema = z.object({
  protocolVersion: z.literal(SERVICE_PROTOCOL_VERSION),
  clientRunId: IdSchema,
  source: z.enum(['cli', 'action', 'sdk', 'replay']),
  wardenVersion: z.string().trim().min(1).max(128),
  startedAt: TimestampSchema,
  completedAt: TimestampSchema,
  outcome: z.enum(['success', 'failure', 'cancelled', 'skipped']),
  traceId: z.string().trim().min(1).max(128).optional(),
  repository: RepositoryIdentitySchema,
  headSha: ShaSchema.optional(),
  event: z.string().trim().min(1).max(128).optional(),
  pullRequest: z.object({
    number: z.number().int().positive(),
    author: z.string().trim().min(1).max(255).optional(),
    title: z.string().trim().min(1).max(1_000).optional(),
    baseBranch: z.string().trim().min(1).max(255).optional(),
    headBranch: z.string().trim().min(1).max(255).optional(),
  }).strict().optional(),
  features: z.object({
    memory: z.boolean(),
  }).strict(),
  findingCounts: FindingCountsSchema,
  skills: z.array(SkillExecutionSchema).max(100),
  recalledMemories: z.array(RecalledMemoryReferenceSchema).max(5).optional(),
  memoryRecallId: IdSchema.optional(),
}).strict();

export const MetricsRunEnvelopeSchema = RunEnvelopeBaseSchema.extend({
  dataProfile: z.literal('metrics'),
  features: z.object({
    memory: z.literal(false),
  }).strict(),
}).strict();
export type MetricsRunEnvelope = z.infer<typeof MetricsRunEnvelopeSchema>;

export const FindingsRunEnvelopeSchema = RunEnvelopeBaseSchema.extend({
  dataProfile: z.literal('findings'),
  findings: z.array(FindingRecordSchema).max(500),
  observations: z.array(FindingObservationSchema).max(1_000),
}).strict();
export type FindingsRunEnvelope = z.infer<typeof FindingsRunEnvelopeSchema>;

export const CodeRunEnvelopeSchema = RunEnvelopeBaseSchema.extend({
  dataProfile: z.literal('code'),
  findings: z.array(CodeFindingRecordSchema).max(500),
  observations: z.array(FindingObservationSchema).max(1_000),
}).strict();
export type CodeRunEnvelope = z.infer<typeof CodeRunEnvelopeSchema>;

export const RunEnvelopeV1Schema = z.discriminatedUnion('dataProfile', [
  MetricsRunEnvelopeSchema,
  FindingsRunEnvelopeSchema,
  CodeRunEnvelopeSchema,
]);
export type RunEnvelopeV1 = z.infer<typeof RunEnvelopeV1Schema>;

export const RunProjectionSchema = RunEnvelopeBaseSchema.omit({}).extend({
  dataProfile: DataProfileSchema,
  findings: z.array(CodeFindingRecordSchema).max(500).default([]),
  observations: z.array(FindingObservationSchema).max(1_000).default([]),
}).strict();
export type RunProjection = z.input<typeof RunProjectionSchema>;
