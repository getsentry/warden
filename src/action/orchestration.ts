/**
 * Review Orchestration
 *
 * Coordinates GitHub review posting across multiple triggers to ensure
 * consistent PR state. Handles three key rules:
 *
 * 1. Failed triggers block approval (can't verify issues are fixed)
 * 2. REQUEST_CHANGES from any trigger blocks approval
 * 3. Only one trigger posts APPROVE (prevents duplicate reviews)
 */

import type { SkillReport } from '../types/index.js';
import type { RenderResult } from '../output/types.js';
import type { TriggerReviewOutput } from './review-state.js';
import { coordinateReviewEvents, applyCoordinationToReview } from './review-state.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * A trigger's execution result. This is the subset of fields from main.ts's
 * TriggerResult that orchestration needs to make decisions.
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
 * Result of orchestrating reviews across all triggers.
 */
export interface OrchestrationResult {
  /** Triggers that succeeded, with coordinated review decisions applied */
  successful: SuccessfulTrigger[];
  /** Whether it's safe to resolve stale comments (all triggers must succeed) */
  canResolveStale: boolean;
  /** Names of triggers that failed */
  failedTriggers: string[];
}

/**
 * A successful trigger with its coordinated review decision.
 */
export interface SuccessfulTrigger {
  triggerName: string;
  report: SkillReport;
  /** The render result with any approval downgrades applied */
  renderResult: RenderResult;
  /** Whether this trigger's approval was suppressed and why */
  reviewDecision: {
    approvalSuppressed: boolean;
    suppressionReason?: string;
  };
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

/**
 * Orchestrate review posting for multiple triggers.
 *
 * This is the main entry point that combines coordination decisions with
 * trigger results, filtering out failures and applying any approval downgrades.
 */
export function orchestrateReviews(results: TriggerExecutionResult[]): OrchestrationResult {
  const coordination = buildReviewCoordination(results);
  const successful: SuccessfulTrigger[] = [];

  for (const [i, result] of results.entries()) {
    const coord = coordination[i];
    if (!result.report || !result.renderResult || !coord) {
      continue;
    }

    const coordinatedReview = applyCoordinationToReview(result.renderResult.review, coord);

    successful.push({
      triggerName: result.triggerName,
      report: result.report,
      renderResult: coordinatedReview !== result.renderResult.review
        ? { ...result.renderResult, review: coordinatedReview }
        : result.renderResult,
      reviewDecision: {
        approvalSuppressed: coord.approvalSuppressed,
        suppressionReason: coord.suppressionReason,
      },
    });
  }

  return {
    successful,
    canResolveStale: shouldResolveStaleComments(results),
    failedTriggers: results.filter((r) => r.error).map((r) => r.triggerName),
  };
}
