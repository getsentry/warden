/**
 * PR Workflow
 *
 * Handles pull_request and push events.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Octokit } from '@octokit/rest';
import { loadWardenConfig, resolveSkillConfigs } from '../../config/loader.js';
import type { ResolvedTrigger } from '../../config/loader.js';
import type { WardenConfig } from '../../config/schema.js';
import { buildEventContext } from '../../event/context.js';
import { matchTrigger, shouldFail, countFindingsAtOrAbove } from '../../triggers/matcher.js';
import {
  fetchExistingComments,
} from '../../output/dedup.js';
import type { ExistingComment } from '../../output/dedup.js';
import { buildAnalyzedScope, findStaleComments, resolveStaleComments } from '../../output/stale.js';
import type { EventContext, SkillReport, Finding } from '../../types/index.js';
import { processInBatches } from '../../utils/index.js';
import { evaluateFixAttempts, postThreadReply } from '../fix-evaluation/index.js';
import type { FixEvaluation } from '../fix-evaluation/index.js';
import { logAction, warnAction } from '../../cli/output/tty.js';
import { formatCost, formatTokens, formatDuration } from '../../cli/output/formatters.js';
import { findBotReviewState } from '../review-state.js';
import type { BotReviewInfo } from '../review-state.js';
import type { ActionInputs } from '../inputs.js';
import { executeTrigger } from '../triggers/executor.js';
import type { TriggerResult } from '../triggers/executor.js';
import { postTriggerReview } from '../review/poster.js';
import { shouldResolveStaleComments } from '../review/coordination.js';
import {
  createCoreCheck,
  updateCoreCheck,
  buildCoreSummaryData,
  determineCoreConclusion,
} from '../checks/manager.js';
import {
  setOutput,
  setFailed,
  logGroup,
  logGroupEnd,
  findClaudeCodeExecutable,
  handleTriggerErrors,
  collectTriggerErrors,
  computeWorkflowOutputs,
  setWorkflowOutputs,
  getAuthenticatedBotLogin,
} from './base.js';

// -----------------------------------------------------------------------------
// Phase Result Types
// -----------------------------------------------------------------------------

interface InitResult {
  context: EventContext;
  config: WardenConfig;
  matchedTriggers: ResolvedTrigger[];
}

interface GitHubSetupResult {
  coreCheckId?: number;
  previousReviewInfo: BotReviewInfo | null;
}

interface ReviewPhaseResult {
  reports: SkillReport[];
  fetchedComments: ExistingComment[];
  existingComments: ExistingComment[];
  shouldFailAction: boolean;
  failureReasons: string[];
}

// -----------------------------------------------------------------------------
// Fix Evaluation Logging
// -----------------------------------------------------------------------------

function logFixEvaluation(ev: FixEvaluation, index: number, total: number): void {
  const totalTokens = ev.usage.inputTokens + ev.usage.outputTokens;
  const costStr = ev.usage.costUSD > 0 ? `, ${formatCost(ev.usage.costUSD)}` : '';
  const idPrefix = ev.findingId ? `${ev.findingId} ` : '';
  const verdict = ev.usedFallback ? 'eval_error' : ev.verdict;

  const line = `  [${index + 1}/${total}] ${idPrefix}${ev.path}:${ev.line} → ${verdict} (${formatDuration(ev.durationMs)}, ${formatTokens(totalTokens)} tok${costStr})`;

  if (ev.usedFallback) {
    warnAction(line);
  } else {
    logAction(line);
  }

  if (ev.verdict === 'attempted_failed' && ev.reasoning) {
    logAction(`        reason: "${ev.reasoning}"`);
  }
}

// -----------------------------------------------------------------------------
// Phase Functions
// -----------------------------------------------------------------------------

/**
 * Parse event payload, build context, load config, match triggers.
 */
async function initializeWorkflow(
  octokit: Octokit,
  inputs: ActionInputs,
  eventName: string,
  eventPath: string,
  repoPath: string
): Promise<InitResult> {
  let eventPayload: unknown;
  try {
    eventPayload = JSON.parse(readFileSync(eventPath, 'utf-8'));
  } catch (error) {
    return setFailed(`Failed to read event payload: ${error}`);
  }

  logGroup('Building event context');
  console.log(`Event: ${eventName}`);
  console.log(`Workspace: ${repoPath}`);
  logGroupEnd();

  let context: EventContext;
  try {
    context = await buildEventContext(eventName, eventPayload, repoPath, octokit);
  } catch (error) {
    return setFailed(`Failed to build event context: ${error}`);
  }

  logGroup('Loading configuration');
  console.log(`Config path: ${inputs.configPath}`);
  logGroupEnd();

  const configFullPath = join(repoPath, inputs.configPath);
  const config = loadWardenConfig(dirname(configFullPath));

  // Resolve skills into triggers and match
  const resolvedTriggers = resolveSkillConfigs(config);
  const matchedTriggers = resolvedTriggers.filter((t) => matchTrigger(t, context, 'github'));

  if (matchedTriggers.length > 0) {
    logGroup('Matched triggers');
    for (const trigger of matchedTriggers) {
      console.log(`- ${trigger.name}: ${trigger.skill}`);
    }
    logGroupEnd();
  } else {
    console.log('No triggers matched for this event');
  }

  return { context, config, matchedTriggers };
}

/**
 * Create core check and fetch previous review info. PR-only.
 */
async function setupGitHubState(
  octokit: Octokit,
  context: EventContext
): Promise<GitHubSetupResult> {
  let coreCheckId: number | undefined;
  let previousReviewInfo: BotReviewInfo | null = null;

  if (!context.pullRequest) {
    return { coreCheckId, previousReviewInfo };
  }

  // Create core warden check
  try {
    const coreCheck = await createCoreCheck(octokit, {
      owner: context.repository.owner,
      repo: context.repository.name,
      headSha: context.pullRequest.headSha,
    });
    coreCheckId = coreCheck.checkRunId;
    logAction(`Created core check: ${coreCheck.url}`);
  } catch (error) {
    warnAction(`Failed to create core check: ${error}`);
  }

  // Fetch previous review info for dismiss logic
  try {
    const botLogin = await getAuthenticatedBotLogin(octokit);

    if (!botLogin) {
      logAction(
        'Skipping dismiss flow: cannot identify bot (using PAT or GITHUB_TOKEN instead of GitHub App)'
      );
    } else {
      // Note: No pagination. PRs with 100+ reviews are rare; if Warden's review
      // is beyond page 1, user can manually dismiss. Not worth the complexity.
      const { data: reviews } = await octokit.pulls.listReviews({
        owner: context.repository.owner,
        repo: context.repository.name,
        pull_number: context.pullRequest.number,
        per_page: 100,
      });

      previousReviewInfo = findBotReviewState(reviews, botLogin);
    }
  } catch (error) {
    warnAction(`Failed to fetch previous review info: ${error}`);
  }

  if (previousReviewInfo) {
    logAction(`Previous Warden review state: ${previousReviewInfo.state}`);
  }

  return { coreCheckId, previousReviewInfo };
}

/**
 * Run all matched triggers in parallel batches.
 */
async function executeAllTriggers(
  matchedTriggers: ResolvedTrigger[],
  octokit: Octokit,
  context: EventContext,
  config: WardenConfig,
  inputs: ActionInputs
): Promise<TriggerResult[]> {
  const concurrency = config.runner?.concurrency ?? inputs.parallel;
  const claudePath = findClaudeCodeExecutable();

  return processInBatches(
    matchedTriggers,
    (trigger) =>
      executeTrigger(trigger, {
        octokit,
        context,
        config,
        anthropicApiKey: inputs.anthropicApiKey,
        claudePath,
        globalFailOn: inputs.failOn,
        globalReportOn: inputs.reportOn,
        globalMaxFindings: inputs.maxFindings,
        globalRequestChanges: inputs.requestChanges,
        globalFailCheck: inputs.failCheck,
      }),
    concurrency
  );
}

/**
 * Fetch existing comments, post reviews with cross-trigger dedup, accumulate failure state.
 */
async function postReviewsAndTrackFailures(
  octokit: Octokit,
  context: EventContext,
  results: TriggerResult[],
  inputs: ActionInputs
): Promise<ReviewPhaseResult> {
  // Fetch existing comments for deduplication (only for PRs)
  // Keep original list separate for stale detection (modified list includes newly posted comments)
  let fetchedComments: ExistingComment[] = [];
  let existingComments: ExistingComment[] = [];
  if (context.pullRequest) {
    try {
      fetchedComments = await fetchExistingComments(
        octokit,
        context.repository.owner,
        context.repository.name,
        context.pullRequest.number
      );
      existingComments = [...fetchedComments];
      if (fetchedComments.length > 0) {
        const wardenCount = fetchedComments.filter((c) => c.isWarden).length;
        const externalCount = fetchedComments.length - wardenCount;
        logAction(
          `Found ${fetchedComments.length} existing comments for deduplication (${wardenCount} Warden, ${externalCount} external)`
        );
      }
    } catch (error) {
      warnAction(`Failed to fetch existing comments for deduplication: ${error}`);
    }
  }

  // Post reviews to GitHub (sequentially to avoid rate limits)
  const reports: SkillReport[] = [];
  let shouldFailAction = false;
  const failureReasons: string[] = [];

  for (const result of results) {
    if (result.report) {
      reports.push(result.report);

      // Post review
      const postResult = await postTriggerReview(
        {
          result,
          existingComments,
          apiKey: inputs.anthropicApiKey,
        },
        { octokit, context }
      );

      // Add newly posted comments to existing comments for cross-trigger deduplication
      existingComments.push(...postResult.newComments);

      // Check if we should fail based on this trigger's config
      const failCheck = result.failCheck ?? false;
      if (failCheck && result.failOn && shouldFail(result.report, result.failOn)) {
        shouldFailAction = true;
        const count = countFindingsAtOrAbove(result.report, result.failOn);
        failureReasons.push(`${result.triggerName}: Found ${count} ${result.failOn}+ severity issues`);
      }
    }
  }

  return { reports, fetchedComments, existingComments, shouldFailAction, failureReasons };
}

/**
 * Evaluate fix attempts on unresolved comments and resolve stale comments.
 */
async function evaluateFixesAndResolveStale(
  octokit: Octokit,
  context: EventContext,
  fetchedComments: ExistingComment[],
  allFindings: Finding[],
  canResolveStale: boolean,
  anthropicApiKey: string
): Promise<void> {
  const wardenComments = fetchedComments.filter((c) => c.isWarden);
  const commentsResolvedByFixEval = new Set<number>();

  // Evaluate follow-up commit fix attempts
  if (
    context.pullRequest &&
    wardenComments.length > 0 &&
    canResolveStale &&
    anthropicApiKey
  ) {
    try {
      logGroup('Fix evaluation');
      const unresolvedCount = wardenComments.filter((c) => !c.isResolved && c.threadId).length;
      if (unresolvedCount > 0) {
        logAction(`Fix evaluation: evaluating ${unresolvedCount} unresolved comments`);
      }

      const fixEvaluation = await evaluateFixAttempts(
        octokit,
        wardenComments,
        {
          owner: context.repository.owner,
          repo: context.repository.name,
          baseSha: context.pullRequest.baseSha,
          headSha: context.pullRequest.headSha,
        },
        allFindings,
        anthropicApiKey
      );

      // Log per-evaluation details
      fixEvaluation.evaluations.forEach((ev, i) =>
        logFixEvaluation(ev, i, fixEvaluation.evaluations.length)
      );

      // Resolve successful fixes
      if (fixEvaluation.toResolve.length > 0) {
        const resolvedCount = await resolveStaleComments(octokit, fixEvaluation.toResolve);
        if (resolvedCount > 0) {
          logAction(`Resolved ${resolvedCount} comments via fix evaluation`);
        }
        // Track all attempted resolves so stale-comment pass skips them
        // (resolveStaleComments handles individual failures internally)
        fixEvaluation.toResolve.forEach((c) => commentsResolvedByFixEval.add(c.id));
      }

      // Post replies for failed fixes
      for (const reply of fixEvaluation.toReply) {
        if (reply.comment.threadId) {
          try {
            await postThreadReply(octokit, reply.comment.threadId, reply.replyBody);
          } catch {
            // Already logged in postThreadReply
          }
        }
      }

      if (fixEvaluation.evaluated > 0) {
        const totalTokens = fixEvaluation.usage.inputTokens + fixEvaluation.usage.outputTokens;
        let usageStr = '';
        if (totalTokens > 0) {
          usageStr = `, ${formatTokens(totalTokens)} tok, ${formatCost(fixEvaluation.usage.costUSD)}`;
        }
        logAction(
          `Fix evaluation: ${fixEvaluation.toResolve.length} resolved, ` +
            `${fixEvaluation.toReply.length} need attention, ` +
            `${fixEvaluation.skipped} skipped` +
            usageStr
        );
      }
      logGroupEnd();
    } catch (error) {
      warnAction(`Failed to evaluate fix attempts: ${error}`);
      logGroupEnd();
    }
  }

  // Resolve stale Warden comments (comments that no longer have matching findings)
  // Exclude comments already resolved by fix evaluation
  if (context.pullRequest && wardenComments.length > 0 && canResolveStale) {
    try {
      const scope = buildAnalyzedScope(context.pullRequest.files);
      const commentsForStaleCheck = wardenComments.filter(
        (c) => !commentsResolvedByFixEval.has(c.id)
      );
      const staleComments = findStaleComments(commentsForStaleCheck, allFindings, scope);

      if (staleComments.length > 0) {
        const resolvedCount = await resolveStaleComments(octokit, staleComments);
        if (resolvedCount > 0) {
          logAction(`Resolved ${resolvedCount} stale Warden comments`);
        }
      }
    } catch (error) {
      warnAction(`Failed to resolve stale comments: ${error}`);
    }
  } else if (!canResolveStale && wardenComments.length > 0) {
    logAction('Skipping stale comment resolution due to trigger failures');
  }
}

/**
 * Dismiss review, set outputs, update core check, fail action.
 */
async function finalizeWorkflow(
  octokit: Octokit,
  context: EventContext,
  previousReviewInfo: BotReviewInfo | null,
  coreCheckId: number | undefined,
  results: TriggerResult[],
  reports: SkillReport[],
  shouldFailAction: boolean,
  failureReasons: string[],
  canResolveStale: boolean
): Promise<void> {
  // Dismiss previous CHANGES_REQUESTED if all blocking issues are resolved.
  // Requires: all triggers succeeded, current run would not request changes,
  // and at least one trigger has an active failOn (prevents accidental dismiss when config changes).
  const wouldRequestChanges = results.some(
    (r) => r.failOn && r.failOn !== 'off' && (r.requestChanges ?? true) &&
      r.report && shouldFail(r.report, r.failOn)
  );
  const hasActiveFailOn = results.some((r) => r.failOn && r.failOn !== 'off');
  if (
    context.pullRequest &&
    previousReviewInfo?.state === 'CHANGES_REQUESTED' &&
    canResolveStale &&
    !wouldRequestChanges &&
    hasActiveFailOn
  ) {
    try {
      await octokit.pulls.dismissReview({
        owner: context.repository.owner,
        repo: context.repository.name,
        pull_number: context.pullRequest.number,
        review_id: previousReviewInfo.reviewId,
        message: 'All previously reported issues have been resolved.',
      });
      logAction('Dismissed previous CHANGES_REQUESTED review');
    } catch (error) {
      warnAction(`Failed to dismiss previous review: ${error}`);
    }
  }

  // Set outputs
  const outputs = computeWorkflowOutputs(reports);
  setWorkflowOutputs(outputs);

  // Update core check with overall summary
  if (coreCheckId && context.pullRequest) {
    try {
      const summaryData = buildCoreSummaryData(results, reports);
      const coreConclusion = determineCoreConclusion(shouldFailAction, outputs.findingsCount);

      await updateCoreCheck(octokit, coreCheckId, summaryData, coreConclusion, {
        owner: context.repository.owner,
        repo: context.repository.name,
      });
    } catch (error) {
      warnAction(`Failed to update core check: ${error}`);
    }
  }

  if (shouldFailAction) {
    setFailed(failureReasons.join('; '));
  }

  logAction(`Analysis complete: ${outputs.findingsCount} total findings`);
}

// -----------------------------------------------------------------------------
// Main PR Workflow
// -----------------------------------------------------------------------------

export async function runPRWorkflow(
  octokit: Octokit,
  inputs: ActionInputs,
  eventName: string,
  eventPath: string,
  repoPath: string
): Promise<void> {
  const { context, config, matchedTriggers } = await initializeWorkflow(
    octokit, inputs, eventName, eventPath, repoPath
  );

  if (matchedTriggers.length === 0) {
    setOutput('findings-count', 0);
    setOutput('critical-count', 0);
    setOutput('high-count', 0);
    setOutput('summary', 'No triggers matched');
    return;
  }

  const { coreCheckId, previousReviewInfo } = await setupGitHubState(octokit, context);

  const results = await executeAllTriggers(matchedTriggers, octokit, context, config, inputs);

  const reviewPhase = await postReviewsAndTrackFailures(octokit, context, results, inputs);

  const triggerErrors = collectTriggerErrors(results);
  handleTriggerErrors(triggerErrors, matchedTriggers.length);

  const canResolveStale = shouldResolveStaleComments(results);
  const allFindings = reviewPhase.reports.flatMap((r) => r.findings);

  await evaluateFixesAndResolveStale(
    octokit, context, reviewPhase.fetchedComments,
    allFindings, canResolveStale, inputs.anthropicApiKey
  );

  await finalizeWorkflow(
    octokit, context, previousReviewInfo, coreCheckId,
    results, reviewPhase.reports,
    reviewPhase.shouldFailAction, reviewPhase.failureReasons,
    canResolveStale
  );
}
