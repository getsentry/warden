import { z } from 'zod';
import type { Finding } from '../../types/index.js';
import { FindingSchema } from '../../types/index.js';

export type FindingOutcome =
  | 'posted'
  | 'deduped'
  | 'skipped'
  | 'resolved'
  | 'failed';

export type DedupeSource = 'warden' | 'external';
export type DedupeMatchType = 'hash' | 'semantic';
export type SkippedReason =
  | 'max_findings'
  | 'duplicate_in_batch'
  | 'no_inline_location'
  | 'pull_request_changed'
  | 'review_not_posted';
export type ResolvedReason = 'fix_evaluation' | 'stale_check';

export const DedupeDetailSchema = z.object({
  source: z.enum(['warden', 'external']),
  matchType: z.enum(['hash', 'semantic']),
  existingFindingId: z.string().optional(),
  existingCommentId: z.number().int().positive().optional(),
  existingThreadId: z.string().optional(),
  existingResolved: z.boolean().optional(),
  /** Skills already attributed to the matched comment, parsed from its attribution footer. */
  existingSkills: z.array(z.string()).optional(),
  actor: z.string().optional(),
});

export type DedupeDetail = z.infer<typeof DedupeDetailSchema>;

interface BaseFindingObservation {
  finding: Finding;
  skill?: string;
  /** skillExecutionId of the trigger execution that produced this observation. */
  skillExecutionId?: string;
}

export interface PostedFindingObservation extends BaseFindingObservation {
  outcome: 'posted';
}

export interface DedupedFindingObservation extends BaseFindingObservation {
  outcome: 'deduped';
  dedupe: DedupeDetail;
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
  | SkippedFindingObservation
  | ResolvedFindingObservation
  | FailedFindingObservation;

export const FindingObservationSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('posted'),
    finding: FindingSchema,
    skill: z.string().optional(),
    skillExecutionId: z.string().optional(),
  }),
  z.object({
    outcome: z.literal('deduped'),
    finding: FindingSchema,
    skill: z.string().optional(),
    skillExecutionId: z.string().optional(),
    dedupe: DedupeDetailSchema,
  }),
  z.object({
    outcome: z.literal('skipped'),
    finding: FindingSchema,
    skill: z.string().optional(),
    skillExecutionId: z.string().optional(),
    skippedReason: z.enum([
      'max_findings',
      'duplicate_in_batch',
      'no_inline_location',
      'pull_request_changed',
      'review_not_posted',
    ]),
  }),
  z.object({
    outcome: z.literal('resolved'),
    finding: FindingSchema,
    skill: z.string().optional(),
    skillExecutionId: z.string().optional(),
    resolvedReason: z.enum(['fix_evaluation', 'stale_check']),
  }),
  z.object({
    outcome: z.literal('failed'),
    finding: FindingSchema,
    skill: z.string().optional(),
    skillExecutionId: z.string().optional(),
  }),
]);

export type ParsedFindingObservation = z.infer<typeof FindingObservationSchema>;
