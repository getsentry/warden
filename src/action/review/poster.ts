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
import { Sentry, captureFindingStage } from '../../sentry.js';

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

interface FindingMutationContext {
  report: NonNullable<TriggerResult['report']>;
  triggerName: string;
  apiKey: string;
  maxRetries?: number;
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

function captureReviewFindingStage(
  stage: 'review_filtered' | 'review_consolidated' | 'review_deduped' | 'review_posted',
  findings: Finding[],
  report: NonNullable<TriggerResult['report']>,
  triggerName: string
): void {
  captureFindingStage(stage, findings, {
    skill: report.skill,
    triggerName,
  });
}

async function consolidateFindingsForReview(
  findings: Finding[],
  ctx: FindingMutationContext
): Promise<Finding[]> {
  if (findings.length <= 1) {
    return findings;
  }

  const consolidateResult = await consolidateBatchFindings(findings, {
    apiKey: ctx.apiKey,
    hashOnly: !ctx.apiKey,
    maxRetries: ctx.maxRetries,
  });

  if (consolidateResult.usage) {
    const consolidateAux = { consolidate: consolidateResult.usage };
    ctx.report.auxiliaryUsage = mergeAuxiliaryUsage(ctx.report.auxiliaryUsage, consolidateAux);
  }

  if (consolidateResult.removedCount > 0) {
    logAction(`Consolidated ${consolidateResult.removedCount} duplicate findings within batch for ${ctx.triggerName}`);
  }

  return consolidateResult.findings;
}

async function deduplicateReviewFindings(
  findings: Finding[],
  existingComments: ExistingComment[],
  ctx: FindingMutationContext
): Promise<{ findings: Finding[]; dedupResult?: DeduplicateResult }> {
  if (existingComments.length === 0 || findings.length === 0) {
    return { findings };
  }

  const dedupResult = await deduplicateFindings(findings, existingComments, {
    apiKey: ctx.apiKey,
    currentSkill: ctx.report.skill,
    maxRetries: ctx.maxRetries,
  });

  if (dedupResult.dedupUsage) {
    const dedupAux = { dedup: dedupResult.dedupUsage };
    ctx.report.auxiliaryUsage = mergeAuxiliaryUsage(ctx.report.auxiliaryUsage, dedupAux);
  }

  if (dedupResult.duplicateActions.length > 0) {
    logAction(`Found ${dedupResult.duplicateActions.length} duplicate findings for ${ctx.triggerName}`);
  }

  return { findings: dedupResult.newFindings, dedupResult };
}

async function processReviewDuplicateActions(
  dedupResult: DeduplicateResult | undefined,
  deps: ReviewPosterDeps,
  skill: string
): Promise<void> {
  if (!dedupResult?.duplicateActions.length) {
    return;
  }

  const actionCounts = await processDuplicateActions(
    deps.octokit,
    deps.context.repository.owner,
    deps.context.repository.name,
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
    warnAction(`Failed to process ${actionCounts.failed} duplicate actions`);
  }
}

function shouldPostReview(
  result: TriggerResult,
  report: NonNullable<TriggerResult['report']>,
  findingsToPost: Finding[]
): boolean {
  if (findingsToPost.length > 0) {
    return true;
  }

  if (result.reportOnSuccess ?? false) {
    return true;
  }

  if (!(result.requestChanges ?? false) || !result.failOn) {
    return false;
  }

  const reportForFail = { ...report, findings: filterFindings(report.findings, undefined, result.minConfidence) };
  return shouldFail(reportForFail, result.failOn);
}

function getRenderResultToPost(
  result: TriggerResult,
  report: NonNullable<TriggerResult['report']>,
  filteredFindings: Finding[],
  findingsToPost: Finding[]
): RenderResult | undefined {
  if (findingsToPost.length === filteredFindings.length) {
    return result.renderResult;
  }

  return renderSkillReport(
    { ...report, findings: findingsToPost },
    {
      maxFindings: result.maxFindings,
      reportOn: result.reportOn,
      minConfidence: result.minConfidence,
      failOn: result.failOn,
      requestChanges: result.requestChanges,
      checkRunUrl: result.checkRunUrl,
      totalFindings: report.findings.length,
      allFindings: report.findings,
    }
  );
}

function getPostedFindings(findings: Finding[], maxFindings?: number): Finding[] {
  if (!maxFindings) {
    return findings;
  }

  return findings.slice(0, maxFindings);
}

async function postRenderedReview(
  deps: ReviewPosterDeps,
  result: TriggerResult,
  renderResult: RenderResult | undefined,
  findings: Finding[],
  skill: string
): Promise<boolean> {
  if (!renderResult) {
    return false;
  }

  try {
    await postReviewToGitHub(deps.octokit, deps.context, renderResult);
  } catch (error) {
    if (!isLineResolutionError(error)) {
      throw error;
    }

    warnAction(`Inline comments failed for ${result.triggerName}, posting findings in review body`);
    const fallback = moveCommentsToBody(renderResult, findings, skill);
    await postReviewToGitHub(deps.octokit, deps.context, fallback);
  }

  return true;
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

  const newComments: ExistingComment[] = [];

  if (!result.report) {
    return { posted: false, newComments, shouldFail: false };
  }
  const report = result.report;

  return Sentry.startSpan(
    {
      op: 'trigger.review_post',
      name: `review ${result.triggerName}`,
    },
    async () => {
      const filteredFindings = filterFindings(report.findings, result.reportOn, result.minConfidence);
      captureReviewFindingStage('review_filtered', filteredFindings, report, result.triggerName);

      if (!result.renderResult) {
        return { posted: false, newComments, shouldFail: false };
      }

      if (filteredFindings.length === 0 && !(result.reportOnSuccess ?? false)) {
        return { posted: false, newComments, shouldFail: false };
      }

      try {
        const mutationContext: FindingMutationContext = {
          report,
          triggerName: result.triggerName,
          apiKey,
          maxRetries: ctx.maxRetries,
        };

        const consolidatedFindings = await consolidateFindingsForReview(filteredFindings, mutationContext);
        captureReviewFindingStage('review_consolidated', consolidatedFindings, report, result.triggerName);

        const { findings: dedupedFindings, dedupResult } = await deduplicateReviewFindings(
          consolidatedFindings,
          existingComments,
          mutationContext
        );
        captureReviewFindingStage('review_deduped', dedupedFindings, report, result.triggerName);

        await processReviewDuplicateActions(dedupResult, deps, report.skill);

        if (!shouldPostReview(result, report, dedupedFindings)) {
          captureReviewFindingStage('review_posted', [], report, result.triggerName);
          return { posted: false, newComments, shouldFail: false };
        }

        const renderResultToPost = getRenderResultToPost(result, report, filteredFindings, dedupedFindings);
        const postedFindings = getPostedFindings(dedupedFindings, result.maxFindings);

        const posted = await postRenderedReview(deps, result, renderResultToPost, postedFindings, report.skill);
        if (!posted) {
          return { posted: false, newComments, shouldFail: false };
        }
        captureReviewFindingStage('review_posted', postedFindings, report, result.triggerName);

        for (const finding of postedFindings) {
          const comment = findingToExistingComment(finding, report.skill);
          if (comment) {
            newComments.push(comment);
          }
        }

        return { posted: true, newComments, shouldFail: false };
      } catch (error) {
        warnAction(`Failed to post review for ${result.triggerName}: ${error}`);
        return { posted: false, newComments, shouldFail: false };
      }
    },
  );
}
