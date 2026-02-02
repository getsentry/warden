import type { ReviewState, GitHubReview } from '../output/types.js';

const VALID_REVIEW_STATES: ReadonlySet<string> = new Set(['CHANGES_REQUESTED', 'APPROVED', 'COMMENTED']);

function isValidReviewState(state: string): state is ReviewState {
  return VALID_REVIEW_STATES.has(state);
}

/**
 * Input for coordinating review events across multiple triggers.
 */
export interface TriggerReviewInput {
  triggerName: string;
  reviewEvent: GitHubReview['event'] | undefined;
}

/**
 * Output with coordinated review decisions.
 */
export interface TriggerReviewOutput {
  triggerName: string;
  /** The final event to post (may differ from input if coordinated) */
  reviewEvent: GitHubReview['event'] | undefined;
  /** Whether this trigger's APPROVE was suppressed */
  approvalSuppressed: boolean;
  /** Reason for suppression, if applicable */
  suppressionReason?: string;
}

/**
 * Coordinate review events across multiple triggers to ensure consistent PR state.
 *
 * Rules:
 * 1. If ANY trigger has REQUEST_CHANGES, no trigger posts APPROVE (they downgrade to COMMENT)
 * 2. Only ONE trigger posts APPROVE (first one wins, others downgrade to COMMENT)
 *
 * This prevents:
 * - A clean trigger from approving while another trigger has blocking findings
 * - Multiple redundant APPROVE reviews on the same PR
 */
export function coordinateReviewEvents(triggers: TriggerReviewInput[]): TriggerReviewOutput[] {
  const anyHasBlockingFindings = triggers.some((t) => t.reviewEvent === 'REQUEST_CHANGES');
  let approvalPosted = false;

  return triggers.map((trigger) => {
    const wantsApproval = trigger.reviewEvent === 'APPROVE';

    if (wantsApproval && anyHasBlockingFindings) {
      return {
        triggerName: trigger.triggerName,
        reviewEvent: 'COMMENT' as const,
        approvalSuppressed: true,
        suppressionReason: 'another trigger has blocking findings',
      };
    }

    if (wantsApproval && approvalPosted) {
      return {
        triggerName: trigger.triggerName,
        reviewEvent: 'COMMENT' as const,
        approvalSuppressed: true,
        suppressionReason: 'approval already posted by earlier trigger',
      };
    }

    if (wantsApproval) {
      approvalPosted = true;
    }

    return {
      triggerName: trigger.triggerName,
      reviewEvent: trigger.reviewEvent,
      approvalSuppressed: false,
    };
  });
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
