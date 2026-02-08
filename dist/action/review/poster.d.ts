/**
 * Review Poster
 *
 * Handles posting GitHub PR reviews with deduplication.
 * Extracted from main.ts to isolate the complex review posting state machine.
 */
import type { Octokit } from '@octokit/rest';
import type { EventContext } from '../../types/index.js';
import type { ExistingComment } from '../../output/dedup.js';
import type { TriggerResult } from '../triggers/executor.js';
/**
 * Context for posting a review for a single trigger.
 */
export interface ReviewPostingContext {
    result: TriggerResult;
    existingComments: ExistingComment[];
    apiKey: string;
}
/**
 * Result from posting a review.
 */
export interface ReviewPostResult {
    /** Whether a review was posted */
    posted: boolean;
    /** New comments that were posted (for cross-trigger deduplication) */
    newComments: ExistingComment[];
    /** Whether this trigger should cause the action to fail */
    shouldFail: boolean;
    /** Reason for failure, if any */
    failureReason?: string;
}
/**
 * Dependencies for the review poster.
 */
export interface ReviewPosterDeps {
    octokit: Octokit;
    context: EventContext;
}
/**
 * Post a review for a single trigger result.
 *
 * Handles:
 * - Filtering findings by reportOn threshold
 * - Deduplicating against existing comments
 * - Processing duplicate actions (reactions, updates)
 * - Posting the final review
 */
export declare function postTriggerReview(ctx: ReviewPostingContext, deps: ReviewPosterDeps): Promise<ReviewPostResult>;
//# sourceMappingURL=poster.d.ts.map