import { z } from 'zod';
import type { Finding } from '../../types/index.js';
import { FindingSchema } from '../../types/index.js';

export type FindingOutcome =
  | 'posted'
  | 'deduped'
  | 'filtered'
  | 'skipped'
  | 'resolved'
  | 'failed';

export type DedupeSource = 'warden' | 'external';
export type DedupeMatchType = 'hash' | 'semantic';
export type SkippedReason = 'max_findings' | 'no_renderable_review';
export type FilteredReason = 'report_threshold';
export type ResolvedReason = 'fix_evaluation' | 'stale_check';

export const DedupeDetailSchema = z.object({
  source: z.enum(['warden', 'external']),
  matchType: z.enum(['hash', 'semantic']),
  existingFindingId: z.string().optional(),
  existingCommentId: z.number().int().positive().optional(),
  existingThreadId: z.string().optional(),
  existingResolved: z.boolean().optional(),
  actor: z.string().optional(),
});

export type DedupeDetail = z.infer<typeof DedupeDetailSchema>;

interface BaseFindingObservation {
  finding: Finding;
  skill?: string;
}

export interface PostedFindingObservation extends BaseFindingObservation {
  outcome: 'posted';
}

export interface DedupedFindingObservation extends BaseFindingObservation {
  outcome: 'deduped';
  dedupe: DedupeDetail;
}

export interface FilteredFindingObservation extends BaseFindingObservation {
  outcome: 'filtered';
  filteredReason: FilteredReason;
}

export interface SkippedFindingObservation extends BaseFindingObservation {
  outcome: 'skipped';
  skippedReason: SkippedReason;
}

export interface ResolvedFindingObservation extends BaseFindingObservation {
  outcome: 'resolved';
  resolvedReason: ResolvedReason;
}

export interface FailedFindingObservation extends BaseFindingObservation {
  outcome: 'failed';
}

export type FindingObservation =
  | PostedFindingObservation
  | DedupedFindingObservation
  | FilteredFindingObservation
  | SkippedFindingObservation
  | ResolvedFindingObservation
  | FailedFindingObservation;

export const FindingObservationSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('posted'),
    finding: FindingSchema,
    skill: z.string().optional(),
  }),
  z.object({
    outcome: z.literal('deduped'),
    finding: FindingSchema,
    skill: z.string().optional(),
    dedupe: DedupeDetailSchema,
  }),
  z.object({
    outcome: z.literal('filtered'),
    finding: FindingSchema,
    skill: z.string().optional(),
    filteredReason: z.literal('report_threshold'),
  }),
  z.object({
    outcome: z.literal('skipped'),
    finding: FindingSchema,
    skill: z.string().optional(),
    skippedReason: z.enum(['max_findings', 'no_renderable_review']),
  }),
  z.object({
    outcome: z.literal('resolved'),
    finding: FindingSchema,
    skill: z.string().optional(),
    resolvedReason: z.enum(['fix_evaluation', 'stale_check']),
  }),
  z.object({
    outcome: z.literal('failed'),
    finding: FindingSchema,
    skill: z.string().optional(),
  }),
]);

export type ParsedFindingObservation = z.infer<typeof FindingObservationSchema>;
