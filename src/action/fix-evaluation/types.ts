import { z } from 'zod';
import { FixStatusSchema } from '../../types/index.js';
import type { FixStatus, UsageStats } from '../../types/index.js';
import type { ExistingComment } from '../../output/dedup.js';

export { FixStatusSchema };
export type { FixStatus };

export const FixJudgeVerdictSchema = z.object({
  status: FixStatusSchema,
  reasoning: z.string(),
});
export type FixJudgeVerdict = z.infer<typeof FixJudgeVerdictSchema>;

export interface FixJudgeResult {
  verdict: FixJudgeVerdict;
  usage: UsageStats;
  usedFallback: boolean;
}

/** Per-comment evaluation detail for structured reporting. */
export interface FixEvaluation {
  findingId?: string;
  skill?: string;
  path: string;
  line: number;
  title: string;
  verdict: FixStatus | 're_detected';
  reasoning?: string;
  durationMs: number;
  usage: UsageStats;
  usedFallback: boolean;
}

export interface EvaluateFixAttemptsResult {
  /** Comments where fix was successful and should be resolved */
  toResolve: ExistingComment[];
  /** Comments where fix failed and need a reply */
  toReply: { comment: ExistingComment; replyBody: string; commitSha: string }[];
  /** Comments not evaluated (no patches, or over limit) */
  skipped: number;
  /** Comments sent to LLM for evaluation */
  evaluated: number;
  /** Evaluations that failed and used fallback (API errors, invalid responses) */
  failedEvaluations: number;
  /** Unique finding threads evaluated in this run */
  uniqueFindingsEvaluated: number;
  /** Unique finding threads with evidence of code-change action */
  uniqueFindingsCodeChanged: number;
  /** Unique finding threads judged resolved */
  uniqueFindingsResolved: number;
  /** Accumulated usage stats from all fix evaluations */
  usage: UsageStats;
  /** Per-comment evaluation details for logging/reporting */
  evaluations: FixEvaluation[];
}

export interface EvaluateFixAttemptsContext {
  owner: string;
  repo: string;
  baseSha: string;
  headSha: string;
}
