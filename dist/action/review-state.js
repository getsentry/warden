/**
 * GitHub Review State Management
 *
 * Tracks the bot's previous review state on a PR for dismissal logic.
 */
const VALID_REVIEW_STATES = new Set(['CHANGES_REQUESTED', 'APPROVED', 'COMMENTED']);
function isValidReviewState(state) {
    return VALID_REVIEW_STATES.has(state);
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
export function findBotReviewState(reviews, botLogin) {
    // GitHub API returns reviews in chronological order, search from end
    for (let i = reviews.length - 1; i >= 0; i--) {
        const review = reviews[i];
        if (!review?.user || review.user.login !== botLogin) {
            continue;
        }
        // User dismissed our review - don't look at older reviews
        if (review.state === 'DISMISSED') {
            return null;
        }
        if (isValidReviewState(review.state)) {
            return { state: review.state, reviewId: review.id };
        }
    }
    return null;
}
//# sourceMappingURL=review-state.js.map