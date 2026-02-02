import type { ReviewState } from '../output/types.js';

const VALID_REVIEW_STATES: ReadonlySet<string> = new Set(['CHANGES_REQUESTED', 'APPROVED', 'COMMENTED']);

function isValidReviewState(state: string): state is ReviewState {
  return VALID_REVIEW_STATES.has(state);
}

export interface ReviewInfo {
  state: string;
  user?: { login: string } | null;
}

/**
 * Find the most recent review state from the given bot.
 * Returns the state if found, or null if no relevant review exists.
 *
 * If the bot's most recent review was DISMISSED by a user, returns null
 * to avoid auto-approving based on stale state from older reviews.
 */
export function findBotReviewState(reviews: ReviewInfo[], botLogin: string): ReviewState | null {
  // Reviews are returned in chronological order, so search from the end
  for (let i = reviews.length - 1; i >= 0; i--) {
    const review = reviews[i];
    if (!review?.user || review.user.login !== botLogin) {
      continue;
    }

    // If user dismissed our most recent review, don't look for older reviews.
    // They explicitly cleared our feedback; don't auto-approve based on stale state.
    if (review.state === 'DISMISSED') {
      return null;
    }

    if (isValidReviewState(review.state)) {
      return review.state;
    }
  }

  return null;
}
