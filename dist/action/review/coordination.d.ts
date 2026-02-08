/**
 * Review Coordination
 *
 * Coordinates GitHub review posting across multiple triggers. Since Warden
 * no longer posts APPROVE reviews (it dismisses instead), this module
 * provides simple pass-through coordination and stale comment safety checks.
 */
import type { SkillReport } from '../../types/index.js';
import type { RenderResult } from '../../output/types.js';
import type { TriggerReviewOutput } from '../review-state.js';
/**
 * A trigger's execution result. This is the subset of fields from TriggerResult
 * that coordination needs to make decisions.
 */
export interface TriggerExecutionResult {
    /** Name of the trigger (e.g., "security-review") */
    triggerName: string;
    /** Skill report, present when trigger succeeded */
    report?: SkillReport;
    /** Rendered review/comments, present when trigger succeeded */
    renderResult?: RenderResult;
    /** Error, present when trigger failed */
    error?: unknown;
}
/**
 * Build review coordination decisions for all triggers.
 *
 * This determines which triggers can post APPROVE vs must downgrade to COMMENT.
 * The returned array has the same order as the input.
 */
export declare function buildReviewCoordination(results: TriggerExecutionResult[]): TriggerReviewOutput[];
/**
 * Check if stale comment resolution should proceed.
 *
 * Returns false if any trigger failed, because failed triggers may have
 * had findings that we can no longer verify are fixed.
 */
export declare function shouldResolveStaleComments(results: TriggerExecutionResult[]): boolean;
//# sourceMappingURL=coordination.d.ts.map