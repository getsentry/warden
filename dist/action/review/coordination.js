/**
 * Review Coordination
 *
 * Coordinates GitHub review posting across multiple triggers. Since Warden
 * no longer posts APPROVE reviews (it dismisses instead), this module
 * provides simple pass-through coordination and stale comment safety checks.
 */
import { coordinateReviewEvents } from '../review-state.js';
// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------
/**
 * Build review coordination decisions for all triggers.
 *
 * This determines which triggers can post APPROVE vs must downgrade to COMMENT.
 * The returned array has the same order as the input.
 */
export function buildReviewCoordination(results) {
    return coordinateReviewEvents(results.map((r) => ({
        triggerName: r.triggerName,
        reviewEvent: r.renderResult?.review?.event,
        failed: r.error !== undefined,
    })));
}
/**
 * Check if stale comment resolution should proceed.
 *
 * Returns false if any trigger failed, because failed triggers may have
 * had findings that we can no longer verify are fixed.
 */
export function shouldResolveStaleComments(results) {
    return results.every((r) => !r.error);
}
//# sourceMappingURL=coordination.js.map