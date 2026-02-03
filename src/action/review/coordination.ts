/**
 * Review Coordination
 *
 * Coordinates GitHub review posting across multiple triggers to ensure
 * consistent PR state. Handles three key rules:
 *
 * 1. Failed triggers block approval (can't verify issues are fixed)
 * 2. REQUEST_CHANGES from any trigger blocks approval
 * 3. Only one trigger posts APPROVE (prevents duplicate reviews)
 */

import type { SkillReport } from '../../types/index.js';
import type { RenderResult } from '../../output/types.js';
import type { TriggerReviewOutput } from '../review-state.js';
import { coordinateReviewEvents } from '../review-state.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------

/**
 * Build review coordination decisions for all triggers.
 *
 * This determines which triggers can post APPROVE vs must downgrade to COMMENT.
 * The returned array has the same order as the input.
 */
export function buildReviewCoordination(
  results: TriggerExecutionResult[]
): TriggerReviewOutput[] {
  return coordinateReviewEvents(
    results.map((r) => ({
      triggerName: r.triggerName,
      reviewEvent: r.renderResult?.review?.event,
      failed: r.error !== undefined,
    }))
  );
}

/**
 * Check if stale comment resolution should proceed.
 *
 * Returns false if any trigger failed, because failed triggers may have
 * had findings that we can no longer verify are fixed.
 */
export function shouldResolveStaleComments(results: TriggerExecutionResult[]): boolean {
  return results.every((r) => !r.error);
}
