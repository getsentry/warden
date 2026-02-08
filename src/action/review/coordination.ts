/**
 * Review Coordination
 *
 * Safety checks for stale comment resolution across multiple triggers.
 */

import type { SkillReport } from '../../types/index.js';
import type { RenderResult } from '../../output/types.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * A trigger's execution result. The subset of fields from TriggerResult
 * needed for stale comment resolution decisions.
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
 * Check if stale comment resolution should proceed.
 *
 * Returns false if any trigger failed, because failed triggers may have
 * had findings that we can no longer verify are fixed.
 */
export function shouldResolveStaleComments(results: TriggerExecutionResult[]): boolean {
  return results.every((r) => !r.error);
}
