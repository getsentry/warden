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
import { mergeAuxiliaryUsage, mergeAuxiliaryUsageAttribution } from '../../sdk/usage.js';
import { canUseRuntimeAuth } from '../../sdk/extract.js';
import type { RuntimeName } from '../../sdk/runtimes/index.js';
import type { TriggerResult } from '../triggers/executor.js';
import { logAction, warnAction } from '../../cli/output/tty.js';
import type { FindingObservation } from '../reporting/outcomes.js';
import type { ReviewFeedbackGate } from './review-feedback-gate.js';

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
  runtime?: RuntimeName;
  model?: string;
  maxRetries?: number;
  /** Throw review posting failures instead of converting them to warnings. */
  failOnPostError?: boolean;
}

/**
 * Result from posting a review.
 */
export interface ReviewPostResult {
  /** Whether a review was posted */
  posted: boolean;
  /** New comments that were posted (for cross-trigger deduplication) */
  newComments: ExistingComment[];
  /** Existing Warden comment IDs matched by current findings */
  activeWardenCommentIds: Set<number>;
  /** Structured finding outcomes produced while posting this review */
  findingObservations: FindingObservation[];
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
  /** Head-freshness gate shared with the rest of the workflow run. */
  feedbackGate: ReviewFeedbackGate;
}

function emptyReviewPostResult(
  newComments: ExistingComment[],
  activeWardenCommentIds: Set<number>,
  findingObservations: FindingObservation[] = []
): ReviewPostResult {
  return { posted: false, newComments, activeWardenCommentIds, findingObservations, shouldFail: false };
}

function buildDedupeObservations(
  actions: DeduplicateResult['duplicateActions'],
  skill: string
): FindingObservation[] {
  return actions.map((action) => ({
    outcome: 'deduped',
    finding: action.finding,
    skill,
    dedupe: {
      source: action.existingComment.isWarden ? 'warden' : 'external',
      matchType: action.matchType,
      existingFindingId: action.existingComment.findingId,
      ...(action.existingComment.id > 0 ? { existingCommentId: action.existingComment.id } : {}),
      existingThreadId: action.existingComment.threadId,
      existingResolved: action.existingComment.isResolved,
      actor: action.existingComment.actor,
    },
  }));
}

function recenterReportFindingIds(reportFindings: Finding[], actions: DeduplicateResult['duplicateActions']): Finding[] {
  if (actions.length === 0) {
    return reportFindings;
  }

  const ids = new Map(
    actions
      .filter((action) => action.originalFindingId !== action.finding.id)
      .map((action) => [action.originalFindingId, action.finding.id])
  );

  if (ids.size === 0) {
    return reportFindings;
  }

  return reportFindings.map((finding) => {
    const recenteredId = ids.get(finding.id);
    return recenteredId ? { ...finding, id: recenteredId } : finding;
  });
}

// -----------------------------------------------------------------------------
// GitHub Review Posting
// -----------------------------------------------------------------------------

/**
 * How a review post attempt ended:
 * - `posted`: the review was created on the PR
 * - `checks_only`: findings could not be attached inline; they stay in Checks
 * - `no_review`: nothing to post (no PR context or no rendered review)
 * - `blocked`: the run may no longer write feedback for the current PR head
 */
type PostReviewOutcome = 'posted' | 'checks_only' | 'no_review' | 'blocked';

/**
 * Post a PR review to GitHub.
 */
async function postReviewToGitHub(
  octokit: Octokit,
  context: EventContext,
  result: RenderResult,
  feedbackGate: ReviewFeedbackGate
): Promise<PostReviewOutcome> {
  if (!context.pullRequest) {
    return 'no_review';
  }

  if (!result.review) {
    return 'no_review';
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

  // Non-blocking body-only reviews cannot be resolved as review threads.
  // Keep those findings in Checks instead of leaving stale PR timeline entries.
  if (reviewComments.length === 0 && result.review.event === 'COMMENT') {
    return 'checks_only';
  }

  // Duplicate-action comment updates between the poster's gate check and this
  // write can outlive the gate's cache window; verify once more.
  if (!(await feedbackGate.canWrite())) {
    return 'blocked';
  }

  await octokit.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    commit_id: commitId,
    event: result.review.event,
    body: result.review.event === 'COMMENT' ? '' : result.review.body,
    comments: reviewComments,
  });

  return 'posted';
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
  const activeWardenCommentIds = new Set<number>();
  const findingObservations: FindingObservation[] = [];

  if (!result.report) {
    return emptyReviewPostResult(newComments, activeWardenCommentIds);
  }
  const skill = result.report.skill;

  // Filter findings by reportOn threshold and confidence
  const filteredFindings = filterFindings(result.report.findings, result.reportOn, result.minConfidence);
  const reportOnSuccess = result.reportOnSuccess ?? false;

  // Skip if review rendering is disabled. In the normal action path this is
  // only possible when reportOn is "off", which leaves no filtered findings.
  if (!result.renderResult) {
    if (filteredFindings.length > 0) {
      console.warn(
        `::warning::Trigger ${result.triggerName} produced reportable findings without a render result`
      );
    }
    return emptyReviewPostResult(newComments, activeWardenCommentIds, findingObservations);
  }

  if (filteredFindings.length === 0 && !reportOnSuccess) {
    return emptyReviewPostResult(newComments, activeWardenCommentIds, findingObservations);
  }

  let findingsToMarkFailed = filteredFindings;

  try {
    // Cross-location merging already happened in runSkillTask().
    // Consolidate findings within this batch (intra-batch dedup).
    let findingsToPost = filteredFindings;
    const canUseAuxiliaryRuntime = canUseRuntimeAuth({ apiKey, runtime: ctx.runtime });

    if (findingsToPost.length > 1) {
      const consolidateResult = await consolidateBatchFindings(findingsToPost, {
        apiKey,
        runtime: ctx.runtime,
        model: ctx.model,
        hashOnly: !canUseAuxiliaryRuntime,
        maxRetries: ctx.maxRetries,
        agentName: skill,
      });
      findingsToPost = consolidateResult.findings;
      findingsToMarkFailed = findingsToPost;
      for (const finding of consolidateResult.removedFindings ?? []) {
        findingObservations.push({
          outcome: 'skipped',
          finding,
          skill,
          skippedReason: 'duplicate_in_batch',
        });
      }

      if (consolidateResult.usage) {
        const consolidateAux = { consolidate: consolidateResult.usage };
        result.report.auxiliaryUsage = mergeAuxiliaryUsage(result.report.auxiliaryUsage, consolidateAux);
        result.report.auxiliaryUsageAttribution = mergeAuxiliaryUsageAttribution(
          result.report.auxiliaryUsageAttribution,
          { consolidate: { model: ctx.model, runtime: ctx.runtime } },
        );
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
        runtime: ctx.runtime,
        model: ctx.model,
        currentSkill: skill,
        maxRetries: ctx.maxRetries,
      });
      result.report.findings = recenterReportFindingIds(result.report.findings, dedupResult.duplicateActions);
      findingsToPost = dedupResult.newFindings;
      findingsToMarkFailed = findingsToPost;
      findingObservations.push(...buildDedupeObservations(dedupResult.duplicateActions, skill));

      // Merge dedup usage into the report's auxiliary usage
      if (dedupResult.dedupUsage) {
        const dedupAux = { dedup: dedupResult.dedupUsage };
        result.report.auxiliaryUsage = mergeAuxiliaryUsage(result.report.auxiliaryUsage, dedupAux);
        result.report.auxiliaryUsageAttribution = mergeAuxiliaryUsageAttribution(
          result.report.auxiliaryUsageAttribution,
          { dedup: { model: ctx.model, runtime: ctx.runtime } },
        );
      }

      if (dedupResult.duplicateActions.length > 0) {
        logAction(
          `Found ${dedupResult.duplicateActions.length} duplicate findings for ${result.triggerName}`
        );
      }

      for (const action of dedupResult.duplicateActions) {
        if (action.existingComment.isWarden && action.existingComment.id > 0) {
          activeWardenCommentIds.add(action.existingComment.id);
        }
      }
    }

    // Consolidation and dedup above can spend minutes in LLM calls. Re-verify
    // head freshness before the first GitHub write (duplicate-action comment
    // updates below, then the review itself).
    if (!(await deps.feedbackGate.canWrite())) {
      return emptyReviewPostResult(newComments, activeWardenCommentIds, findingObservations);
    }

    // Process duplicate actions (update Warden comments, add reactions)
    if (dedupResult?.duplicateActions.length) {
      const actionCounts = await processDuplicateActions(
        octokit,
        context.repository.owner,
        context.repository.name,
        dedupResult.duplicateActions,
        skill
      );

      if (actionCounts.updated > 0) {
        logAction(`Updated ${actionCounts.updated} existing Warden comments with skill attribution`);
      }
      if (actionCounts.reacted > 0) {
        logAction(`Added reactions to ${actionCounts.reacted} existing external comments`);
      }
      if (actionCounts.failed > 0) {
        const message = `Failed to process ${actionCounts.failed} duplicate actions`;
        if (ctx.failOnPostError) {
          throw new Error(message);
        }
        warnAction(message);
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
      const skippedFindings = result.maxFindings
        ? findingsToPost.slice(result.maxFindings)
        : [];
      // Only overflow-eligible findings should be marked failed if posting throws
      findingsToMarkFailed = postedFindings;
      for (const finding of skippedFindings) {
        findingObservations.push({
          outcome: 'skipped',
          finding,
          skill,
          skippedReason: 'max_findings',
        });
      }

      let postOutcome: PostReviewOutcome = 'no_review';
      try {
        postOutcome = await postReviewToGitHub(octokit, context, renderResultToPost, deps.feedbackGate);
      } catch (error) {
        if (!isLineResolutionError(error)) {
          throw error;
        }
        if (renderResultToPost.review?.event === 'REQUEST_CHANGES') {
          warnAction(`Inline comments failed for ${result.triggerName}, posting findings in review body`);
          const fallback = moveCommentsToBody(renderResultToPost, postedFindings, skill);
          postOutcome = await postReviewToGitHub(octokit, context, fallback, deps.feedbackGate);
        } else {
          warnAction(`Inline comments failed for ${result.triggerName}, falling back to checks only`);
          postOutcome = 'checks_only';
        }
      }
      if (postOutcome === 'checks_only') {
        for (const finding of postedFindings) {
          findingObservations.push({ outcome: 'skipped', finding, skill, skippedReason: 'no_inline_location' });
        }
        return emptyReviewPostResult(newComments, activeWardenCommentIds, findingObservations);
      }
      if (postOutcome !== 'posted') {
        return emptyReviewPostResult(newComments, activeWardenCommentIds, findingObservations);
      }
      // COMMENT reviews post with an empty body, so locationless findings that
      // the renderer placed in the body never reach the PR. Record them as
      // checks-only instead of claiming they were posted.
      const bodyStripped = renderResultToPost.review?.event === 'COMMENT';
      for (const finding of postedFindings) {
        if (bodyStripped && !finding.location) {
          findingObservations.push({ outcome: 'skipped', finding, skill, skippedReason: 'no_inline_location' });
          continue;
        }
        findingObservations.push({ outcome: 'posted', finding, skill });
        const comment = findingToExistingComment(finding, skill);
        if (comment) {
          newComments.push(comment);
        }
      }
      return {
        posted: true,
        newComments,
        activeWardenCommentIds,
        findingObservations,
        shouldFail: false,
      };
    }

    return emptyReviewPostResult(newComments, activeWardenCommentIds, findingObservations);
  } catch (error) {
    if (ctx.failOnPostError) {
      throw error;
    }
    warnAction(`Failed to post review for ${result.triggerName}: ${error}`);
    return {
      posted: false,
      newComments,
      activeWardenCommentIds,
      findingObservations: [
        ...findingObservations,
        ...findingsToMarkFailed.map((finding) => ({ outcome: 'failed' as const, finding, skill })),
      ],
      shouldFail: false,
    };
  }
}
