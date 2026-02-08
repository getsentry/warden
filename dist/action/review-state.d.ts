/**
 * GitHub Review State Management
 *
 * Handles coordination of GitHub PR reviews across multiple Warden triggers
 * and tracking the bot's previous review state for dismissal.
 */
import type { ReviewState, GitHubReview } from '../output/types.js';
/**
 * Input to the review coordination function.
 * Represents what review event a trigger wants to post.
 */
export interface TriggerReviewInput {
    triggerName: string;
    /** The review event this trigger wants to post, or undefined if silent (no review to post) */
    reviewEvent: GitHubReview['event'] | undefined;
    /** True if this trigger failed with an error (distinct from silent triggers with no review) */
    failed: boolean;
}
/**
 * Output from review coordination.
 * Contains the final decision about what review event to post.
 */
export interface TriggerReviewOutput {
    triggerName: string;
    /** The final event to post (pass-through from input) */
    reviewEvent: GitHubReview['event'] | undefined;
}
/**
 * Coordinate review events across multiple triggers.
 *
 * Since Warden no longer posts APPROVE (it dismisses previous reviews instead),
 * this is a simple pass-through that preserves trigger order.
 */
export declare function coordinateReviewEvents(triggers: TriggerReviewInput[]): TriggerReviewOutput[];
/**
 * A GitHub review from the API (subset of fields we need).
 */
export interface GitHubReviewInfo {
    id: number;
    state: string;
    user?: {
        login: string;
    } | null;
}
/**
 * The bot's most recent review info (state + review ID for dismissal).
 */
export interface BotReviewInfo {
    state: ReviewState;
    reviewId: number;
}
/**
 * Find the bot's most recent review state on a PR.
 *
 * Used to determine if we should dismiss a previous REQUEST_CHANGES
 * when all issues are now resolved.
 *
 * Returns null if:
 * - Bot has no reviews on this PR
 * - Bot's most recent review was DISMISSED (user explicitly cleared it)
 */
export declare function findBotReviewState(reviews: GitHubReviewInfo[], botLogin: string): BotReviewInfo | null;
//# sourceMappingURL=review-state.d.ts.map