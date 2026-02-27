/**
 * PR Workflow
 *
 * Handles pull_request and push events.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Octokit } from '@octokit/rest';
import { Sentry, logger, emitStaleResolutionMetric, setGlobalAttributes, emitRunMetric } from '../../sentry.js';
import { loadWardenConfig, resolveSkillConfigs } from '../../config/loader.js';
import type { ResolvedTrigger } from '../../config/loader.js';
import type { WardenConfig } from '../../config/schema.js';
import { buildEventContext } from '../../event/context.js';
import { matchTrigger, shouldFail, countFindingsAtOrAbove } from '../../triggers/matcher.js';
import { fetchExistingComments } from '../../output/dedup.js';
import type { ExistingComment } from '../../output/dedup.js';
import { buildAnalyzedScope, findStaleComments, resolveStaleComments } from '../../output/stale.js';
import { filterFindings } from '../../types/index.js';
import type { EventContext, SkillReport, Finding } from '../../types/index.js';
import { runPool, Semaphore } from '../../utils/index.js';
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
    Sentry.captureException(error, { tags: { operation: 'read_event_payload' } });
    setFailed(`Failed to read event payload: ${error}`);
  }

  logGroup('Building event context');
  console.log(`Event: ${eventName}`);
  console.log(`Workspace: ${repoPath}`);
  logGroupEnd();

  let context: EventContext;
  try {
    context = await buildEventContext(eventName, eventPayload, repoPath, octokit);
  } catch (error) {
    Sentry.captureException(error, { tags: { operation: 'build_event_context' } });
    setFailed(`Failed to build event context: ${error}`);
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
 * Fetch the bot's previous review state on a PR.
 * Returns null if the bot has no actionable reviews or identity cannot be determined.
 */
async function fetchPreviousReviewInfo(
  octokit: Octokit,
  context: EventContext
): Promise<BotReviewInfo | null> {
  if (!context.pullRequest) {
    return null;
  }

  try {
    const botLogin = await getAuthenticatedBotLogin(octokit);

    if (!botLogin) {
      logAction(
        'Skipping dismiss flow: cannot identify bot (using PAT or GITHUB_TOKEN instead of GitHub App)'
      );
      return null;
    }

    // Note: No pagination. PRs with 100+ reviews are rare; if Warden's review
    // is beyond page 1, user can manually dismiss. Not worth the complexity.
    const { data: reviews } = await octokit.pulls.listReviews({
      owner: context.repository.owner,
      repo: context.repository.name,
      pull_number: context.pullRequest.number,
      per_page: 100,
    });

    return findBotReviewState(reviews, botLogin);
  } catch (error) {
    warnAction(`Failed to fetch previous review info: ${error}`);
    return null;
  }
}

/**
 * Create core check and fetch previous review info. PR-only.
 */
async function setupGitHubState(
  octokit: Octokit,
  context: EventContext
): Promise<GitHubSetupResult> {
  if (!context.pullRequest) {
    return { previousReviewInfo: null };
  }

  let coreCheckId: number | undefined;
  let previousReviewInfo: BotReviewInfo | null = null;

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
    Sentry.captureException(error, { tags: { operation: 'create_core_check' } });
    warnAction(`Failed to create core check: ${error}`);
  }

  previousReviewInfo = await fetchPreviousReviewInfo(octokit, context);

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
  const claudePath = await findClaudeCodeExecutable();

  // Global semaphore gates file-level work across all triggers.
  // All triggers launch immediately; the semaphore limits concurrent file analyses.
  const semaphore = new Semaphore(concurrency);

  return runPool(
    matchedTriggers,
    matchedTriggers.length,
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
        semaphore,
      }),
  );
}

/**
 * Fetch existing comments, post reviews with cross-trigger dedup, accumulate failure state.
 */
async function postReviewsAndTrackFailures(
  octokit: Octokit,
  context: EventContext,
  results: TriggerResult[],
  inputs: ActionInputs,
  auxiliaryMaxRetries?: number
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
      Sentry.captureException(error, { tags: { operation: 'fetch_existing_comments' } });
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
          maxRetries: auxiliaryMaxRetries,
        },
        { octokit, context }
      );

      // Add newly posted comments to existing comments for cross-trigger deduplication
      existingComments.push(...postResult.newComments);

      // Check if we should fail based on this trigger's config
      // Filter by confidence first so low-confidence findings don't cause failure
      const failCheck = result.failCheck ?? false;
      const reportForFail = { ...result.report, findings: filterFindings(result.report.findings, undefined, result.minConfidence) };
      if (failCheck && result.failOn && shouldFail(reportForFail, result.failOn)) {
        shouldFailAction = true;
        const count = countFindingsAtOrAbove(reportForFail, result.failOn);
        failureReasons.push(`${result.triggerName}: Found ${count} ${result.failOn}+ severity issues`);
      }
    }
  }

  return { reports, fetchedComments, existingComments, shouldFailAction, failureReasons };
}

/**
 * Evaluate fix attempts on unresolved comments and resolve stale comments.
 *
 * Returns whether all Warden comments are resolved after evaluation.
 */
async function evaluateFixesAndResolveStale(
  octokit: Octokit,
  context: EventContext,
  fetchedComments: ExistingComment[],
  allFindings: Finding[],
  canResolveStale: boolean,
  anthropicApiKey: string,
  auxiliaryMaxRetries?: number
): Promise<{
  allResolved: boolean;
  autoResolvedByFixEvaluation: number;
  autoResolvedByStaleCheck: number;
}> {
  const wardenComments = fetchedComments.filter((c) => c.isWarden);
  const commentsResolvedByFixEval = new Set<number>();
  const commentsEvaluatedByFixEval = new Set<number>();
  const commentsResolvedByStale = new Set<number>();

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
        anthropicApiKey,
        auxiliaryMaxRetries
      );

      // Log per-evaluation details
      fixEvaluation.evaluations.forEach((ev, i) =>
        logFixEvaluation(ev, i, fixEvaluation.evaluations.length)
      );

      // Resolve successful fixes
      if (fixEvaluation.toResolve.length > 0) {
        const { resolvedCount, resolvedIds } = await resolveStaleComments(octokit, fixEvaluation.toResolve);
        if (resolvedCount > 0) {
          logAction(`Resolved ${resolvedCount} comments via fix evaluation`);
        }
        // Track only actually resolved comments for allResolved check
        resolvedIds.forEach((id) => commentsResolvedByFixEval.add(id));
      }

      // Post replies for failed fixes and track them so stale pass doesn't override
      for (const reply of fixEvaluation.toReply) {
        commentsEvaluatedByFixEval.add(reply.comment.id);
        if (reply.comment.threadId) {
          try {
            await postThreadReply(octokit, reply.comment.threadId, reply.replyBody);
          } catch (error) {
            Sentry.captureException(error, { tags: { operation: 'post_thread_reply' } });
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
      Sentry.captureException(error, { tags: { operation: 'evaluate_fix_attempts' } });
      warnAction(`Failed to evaluate fix attempts: ${error}`);
      logGroupEnd();
    }
  }

  // Resolve stale Warden comments (comments that no longer have matching findings)
  // Exclude comments already handled by fix evaluation (resolved or flagged as needing attention)
  if (context.pullRequest && wardenComments.length > 0 && canResolveStale) {
    try {
      const scope = buildAnalyzedScope(context.pullRequest.files);
      const commentsForStaleCheck = wardenComments.filter(
        (c) => !commentsResolvedByFixEval.has(c.id) && !commentsEvaluatedByFixEval.has(c.id)
      );
      const staleComments = findStaleComments(commentsForStaleCheck, allFindings, scope);

      if (staleComments.length > 0) {
        const { resolvedCount, resolvedIds } = await resolveStaleComments(octokit, staleComments);
        if (resolvedCount > 0) {
          logAction(`Resolved ${resolvedCount} stale Warden comments`);
          emitStaleResolutionMetric(resolvedCount);
        }
        resolvedIds.forEach((id) => commentsResolvedByStale.add(id));
      }
    } catch (error) {
      Sentry.captureException(error, { tags: { operation: 'resolve_stale_comments' } });
      warnAction(`Failed to resolve stale comments: ${error}`);
    }
  } else if (!canResolveStale && wardenComments.length > 0) {
    logAction('Skipping stale comment resolution due to trigger failures');
  }

  // Determine if all unresolved Warden comments were resolved during this run
  const unresolvedBefore = wardenComments.filter((c) => !c.isResolved);
  const allResolved = unresolvedBefore.every(
    (c) => commentsResolvedByFixEval.has(c.id) || commentsResolvedByStale.has(c.id)
  );

  return {
    allResolved,
    autoResolvedByFixEvaluation: commentsResolvedByFixEval.size,
    autoResolvedByStaleCheck: commentsResolvedByStale.size,
  };
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
  const wouldRequestChanges = results.some((r) => {
    if (!r.failOn || r.failOn === 'off' || !(r.requestChanges ?? false) || !r.report) return false;
    const filtered = { ...r.report, findings: filterFindings(r.report.findings, undefined, r.minConfidence) };
    return shouldFail(filtered, r.failOn);
  });
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
      Sentry.captureException(error, { tags: { operation: 'dismiss_review' } });
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
      Sentry.captureException(error, { tags: { operation: 'update_core_check' } });
      warnAction(`Failed to update core check: ${error}`);
    }
  }

  if (shouldFailAction) {
    setFailed(failureReasons.join('; '));
  }

  logAction(`Analysis complete: ${outputs.findingsCount} total findings`);
}

/**
 * Clean up orphaned Warden comments when no triggers matched.
 *
 * Runs fix evaluation and stale resolution on existing comments so that
 * comments from earlier pushes get resolved even when the current push
 * only touches files outside all skills' paths filters.
 */
async function cleanupOrphanedComments(
  octokit: Octokit,
  context: EventContext,
  anthropicApiKey: string,
  auxiliaryMaxRetries?: number
): Promise<void> {
  if (!context.pullRequest) {
    return;
  }

  let existingComments: ExistingComment[];
  try {
    existingComments = await fetchExistingComments(
      octokit,
      context.repository.owner,
      context.repository.name,
      context.pullRequest.number
    );
  } catch (error) {
    warnAction(`Failed to fetch existing comments for cleanup: ${error}`);
    return;
  }

  const wardenComments = existingComments.filter((c) => c.isWarden);
  if (wardenComments.length === 0) {
    return;
  }

  logAction(`No triggers matched, but found ${wardenComments.length} existing Warden comments. Running cleanup.`);

  const { allResolved, autoResolvedByFixEvaluation, autoResolvedByStaleCheck } =
    await evaluateFixesAndResolveStale(
    octokit, context, existingComments, [], true, anthropicApiKey, auxiliaryMaxRetries
    );
  const activeSpan = Sentry.getActiveSpan();
  activeSpan?.setAttribute('warden.feedback.auto_resolve.fix_eval_count', autoResolvedByFixEvaluation);
  activeSpan?.setAttribute('warden.feedback.auto_resolve.stale_count', autoResolvedByStaleCheck);

  // Dismiss CHANGES_REQUESTED only if every unresolved comment was resolved
  if (allResolved) {
    const previousReviewInfo = await fetchPreviousReviewInfo(octokit, context);
    if (previousReviewInfo?.state === 'CHANGES_REQUESTED') {
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
  }
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
  return Sentry.startSpan(
    { op: 'workflow.run', name: 'review pull_request' },
    async (span) => {
      span.setAttribute('github.event', eventName);

      const { context, config, matchedTriggers } = await Sentry.startSpan(
        { op: 'workflow.init', name: 'initialize workflow' },
        () => initializeWorkflow(octokit, inputs, eventName, eventPath, repoPath),
      );

      // Set Sentry context after building event context
      if (context.pullRequest) {
        Sentry.setUser({ username: context.pullRequest.author });
      }
      Sentry.setContext('repository', {
        owner: context.repository.owner,
        name: context.repository.name,
      });
      if (context.pullRequest) {
        Sentry.setContext('pull_request', {
          number: context.pullRequest.number,
          baseBranch: context.pullRequest.baseBranch,
          headBranch: context.pullRequest.headBranch,
        });
      }

      setGlobalAttributes({ 'warden.repository': context.repository.fullName });
      emitRunMetric();

      const traceId = span.spanContext().traceId;
      logger.info('Workflow initialized', {
        'trigger.count': matchedTriggers.length,
        'trace.id': traceId,
      });

      if (matchedTriggers.length === 0) {
        await cleanupOrphanedComments(octokit, context, inputs.anthropicApiKey, config.defaults?.auxiliaryMaxRetries);
        setOutput('findings-count', 0);
        setOutput('high-count', 0);
        setOutput('summary', 'No triggers matched');
        return;
      }

      const { coreCheckId, previousReviewInfo } = await Sentry.startSpan(
        { op: 'workflow.setup', name: 'setup github state' },
        () => setupGitHubState(octokit, context),
      );

      const results = await Sentry.startSpan(
        { op: 'workflow.execute', name: 'execute triggers' },
        () => executeAllTriggers(matchedTriggers, octokit, context, config, inputs),
      );

      const reviewPhase = await Sentry.startSpan(
        { op: 'workflow.review', name: 'post reviews' },
        () => postReviewsAndTrackFailures(octokit, context, results, inputs, config.defaults?.auxiliaryMaxRetries),
      );

      const triggerErrors = collectTriggerErrors(results);
      handleTriggerErrors(triggerErrors, matchedTriggers.length);

      const canResolveStale = shouldResolveStaleComments(results);
      const allFindings = reviewPhase.reports.flatMap((r) => r.findings);

      await Sentry.startSpan(
        { op: 'workflow.resolve', name: 'resolve stale comments' },
        async (resolveSpan) => {
          const resolutionResult = await evaluateFixesAndResolveStale(
            octokit, context, reviewPhase.fetchedComments,
            allFindings, canResolveStale, inputs.anthropicApiKey,
            config.defaults?.auxiliaryMaxRetries,
          );
          resolveSpan.setAttribute(
            'warden.feedback.auto_resolve.fix_eval_count',
            resolutionResult.autoResolvedByFixEvaluation
          );
          resolveSpan.setAttribute(
            'warden.feedback.auto_resolve.stale_count',
            resolutionResult.autoResolvedByStaleCheck
          );
        },
      );

      await finalizeWorkflow(
        octokit, context, previousReviewInfo, coreCheckId,
        results, reviewPhase.reports,
        reviewPhase.shouldFailAction, reviewPhase.failureReasons,
        canResolveStale,
      );
    },
  );
}
