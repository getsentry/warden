/**
 * GitHub Review State Management
 *
 * Tracks the bot's previous review state on a PR for dismissal logic.
 */

import type { ReviewState } from '../output/types.js';

const VALID_REVIEW_STATES: ReadonlySet<string> = new Set(['CHANGES_REQUESTED', 'APPROVED', 'COMMENTED']);

function isValidReviewState(state: string): state is ReviewState {
  return VALID_REVIEW_STATES.has(state);
}

// -----------------------------------------------------------------------------
// Bot Review History
// -----------------------------------------------------------------------------

/**
 * A GitHub review from the API (subset of fields we need).
 */
export interface GitHubReviewInfo {
  id: number;
  state: string;
  user?: { login: string } | null;
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
export function findBotReviewState(reviews: GitHubReviewInfo[], botLogin: string): BotReviewInfo | null {
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
