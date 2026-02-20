/**
 * Review Poster
 *
 * Handles posting GitHub PR reviews with deduplication.
 * Extracted from main.ts to isolate the complex review posting state machine.
 */

import type { Octokit } from '@octokit/rest';
import type { EventContext, Finding } from '../../types/index.js';
import { filterFindings } from '../../types/index.js';
import { shouldFail } from '../../triggers/matcher.js';
import type { RenderResult } from '../../output/types.js';
import { renderSkillReport, renderFindingsBody } from '../../output/renderer.js';
import {
  deduplicateFindings,
  processDuplicateActions,
  findingToExistingComment,
  consolidateBatchFindings,
} from '../../output/dedup.js';
import type { ExistingComment, DeduplicateResult } from '../../output/dedup.js';
import { mergeAuxiliaryUsage } from '../../sdk/usage.js';
import type { TriggerResult } from '../triggers/executor.js';
import { logAction, warnAction } from '../../cli/output/tty.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Context for posting a review for a single trigger.
 */
export interface ReviewPostingContext {
  result: TriggerResult;
  existingComments: ExistingComment[];
  apiKey: string;
  maxRetries?: number;
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

// -----------------------------------------------------------------------------
// GitHub Review Posting
// -----------------------------------------------------------------------------

/**
 * Post a PR review to GitHub.
 */
async function postReviewToGitHub(
  octokit: Octokit,
  context: EventContext,
  result: RenderResult
): Promise<void> {
  if (!context.pullRequest) {
    return;
  }

  // Only post PR reviews with inline comments - skip standalone summary comments
  // as they add noise without providing actionable inline feedback
  if (!result.review) {
    return;
  }

  const { owner, name: repo } = context.repository;
  const pullNumber = context.pullRequest.number;
  const commitId = context.pullRequest.headSha;

  const reviewComments = result.review.comments
    .filter((c): c is typeof c & { path: string; line: number } => Boolean(c.path && c.line))
    .map((c) => ({
      path: c.path,
      line: c.line,
      side: c.side ?? ('RIGHT' as const),
      body: c.body,
      start_line: c.start_line,
      start_side: c.start_line ? c.start_side ?? ('RIGHT' as const) : undefined,
    }));

  await octokit.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    commit_id: commitId,
    event: result.review.event,
    body: result.review.body,
    comments: reviewComments,
  });
}

/**
 * Move inline comments into the review body as markdown.
 * Used as a fallback when GitHub rejects inline comments (e.g. lines outside the diff).
 */
function moveCommentsToBody(renderResult: RenderResult, findings: Finding[], skill: string): RenderResult {
  if (!renderResult.review) {
    return renderResult;
  }

  const body = renderFindingsBody(findings, skill);

  return {
    ...renderResult,
    review: {
      ...renderResult.review,
      body,
      comments: [],
    },
  };
}

/**
 * Check if an error is a GitHub 422 "line could not be resolved" error.
 */
function isLineResolutionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('pull_request_review_thread.line') ||
    msg.includes('line must be part of the diff') ||
    msg.includes('line could not be resolved');
}

// -----------------------------------------------------------------------------
// Main Review Posting Logic
// -----------------------------------------------------------------------------

/**
 * Post a review for a single trigger result.
 *
 * Handles:
 * - Filtering findings by reportOn threshold
 * - Deduplicating against existing comments
 * - Processing duplicate actions (reactions, updates)
 * - Posting the final review
 */
export async function postTriggerReview(
  ctx: ReviewPostingContext,
  deps: ReviewPosterDeps
): Promise<ReviewPostResult> {
  const { result, existingComments, apiKey } = ctx;
  const { octokit, context } = deps;

  const newComments: ExistingComment[] = [];

  if (!result.report) {
    return { posted: false, newComments, shouldFail: false };
  }

  // Filter findings by reportOn threshold and confidence
  const filteredFindings = filterFindings(result.report.findings, result.reportOn, result.minConfidence);
  const reportOnSuccess = result.reportOnSuccess ?? false;

  // Skip if nothing to post
  if (!result.renderResult || (filteredFindings.length === 0 && !reportOnSuccess)) {
    return { posted: false, newComments, shouldFail: false };
  }

  try {
    // Cross-location merging already happened in runSkillTask().
    // Consolidate findings within this batch (intra-batch dedup).
    let findingsToPost = filteredFindings;

    if (findingsToPost.length > 1) {
      const consolidateResult = await consolidateBatchFindings(findingsToPost, {
        apiKey,
        hashOnly: !apiKey,
        maxRetries: ctx.maxRetries,
      });
      findingsToPost = consolidateResult.findings;

      if (consolidateResult.usage) {
        const consolidateAux = { consolidate: consolidateResult.usage };
        result.report.auxiliaryUsage = mergeAuxiliaryUsage(result.report.auxiliaryUsage, consolidateAux);
      }

      if (consolidateResult.removedCount > 0) {
        logAction(
          `Consolidated ${consolidateResult.removedCount} duplicate findings within batch for ${result.triggerName}`
        );
      }
    }

    // Deduplicate findings against existing comments
    let dedupResult: DeduplicateResult | undefined;

    if (existingComments.length > 0 && findingsToPost.length > 0) {
      dedupResult = await deduplicateFindings(findingsToPost, existingComments, {
        apiKey,
        currentSkill: result.report.skill,
        maxRetries: ctx.maxRetries,
      });
      findingsToPost = dedupResult.newFindings;

      // Merge dedup usage into the report's auxiliary usage
      if (dedupResult.dedupUsage) {
        const dedupAux = { dedup: dedupResult.dedupUsage };
        result.report.auxiliaryUsage = mergeAuxiliaryUsage(result.report.auxiliaryUsage, dedupAux);
      }

      if (dedupResult.duplicateActions.length > 0) {
        logAction(
          `Found ${dedupResult.duplicateActions.length} duplicate findings for ${result.triggerName}`
        );
      }
    }

    // Process duplicate actions (update Warden comments, add reactions)
    if (dedupResult?.duplicateActions.length) {
      const actionCounts = await processDuplicateActions(
        octokit,
        context.repository.owner,
        context.repository.name,
        dedupResult.duplicateActions,
        result.report.skill
      );

      if (actionCounts.updated > 0) {
        logAction(`Updated ${actionCounts.updated} existing Warden comments with skill attribution`);
      }
      if (actionCounts.reacted > 0) {
        logAction(`Added reactions to ${actionCounts.reacted} existing external comments`);
      }
      if (actionCounts.failed > 0) {
        warnAction(`Failed to process ${actionCounts.failed} duplicate actions`);
      }
    }

    // Check if failOn threshold is met (even if all findings deduplicated, we still need REQUEST_CHANGES)
    // Filter by confidence first so low-confidence findings don't trigger REQUEST_CHANGES
    const useRequestChanges = result.requestChanges ?? false;
    const reportForFail = { ...result.report, findings: filterFindings(result.report.findings, undefined, result.minConfidence) };
    const needsRequestChanges = useRequestChanges && result.failOn && shouldFail(reportForFail, result.failOn);

    // Only post if we have non-duplicate findings, reportOnSuccess, or REQUEST_CHANGES needed
    if (findingsToPost.length > 0 || reportOnSuccess || needsRequestChanges) {
      // Re-render with deduplicated findings if any were removed
      const renderResultToPost =
        findingsToPost.length !== filteredFindings.length
          ? renderSkillReport(
              { ...result.report, findings: findingsToPost },
              {
                maxFindings: result.maxFindings,
                reportOn: result.reportOn,
                minConfidence: result.minConfidence,
                failOn: result.failOn,
                requestChanges: result.requestChanges,
                checkRunUrl: result.checkRunUrl,
                totalFindings: result.report.findings.length,
                // Pass original findings for failOn evaluation (not affected by dedup)
                allFindings: result.report.findings,
              }
            )
          : result.renderResult;

      // Apply maxFindings limit consistently for both the fallback body and dedup tracking
      const postedFindings = result.maxFindings
        ? findingsToPost.slice(0, result.maxFindings)
        : findingsToPost;

      try {
        await postReviewToGitHub(octokit, context, renderResultToPost);
      } catch (error) {
        if (!isLineResolutionError(error)) {
          throw error;
        }
        warnAction(`Inline comments failed for ${result.triggerName}, posting findings in review body`);
        const fallback = moveCommentsToBody(renderResultToPost, postedFindings, result.report.skill);
        await postReviewToGitHub(octokit, context, fallback);
      }
      for (const finding of postedFindings) {
        const comment = findingToExistingComment(finding, result.report.skill);
        if (comment) {
          newComments.push(comment);
        }
      }

      return { posted: true, newComments, shouldFail: false };
    }

    return { posted: false, newComments, shouldFail: false };
  } catch (error) {
    warnAction(`Failed to post review for ${result.triggerName}: ${error}`);
    return { posted: false, newComments, shouldFail: false };
  }
}
