import type { Finding } from '../../types/index.js';

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

export interface DedupeDetail {
  source: DedupeSource;
  matchType: DedupeMatchType;
  existingFindingId?: string;
  existingCommentId: number;
  existingThreadId?: string;
  existingResolved?: boolean;
  actor?: string;
}

export interface FindingObservation {
  outcome: FindingOutcome;
  finding: Finding;
  skill?: string;
  dedupe?: DedupeDetail;
  skippedReason?: SkippedReason;
  filteredReason?: FilteredReason;
  resolvedReason?: ResolvedReason;
}
