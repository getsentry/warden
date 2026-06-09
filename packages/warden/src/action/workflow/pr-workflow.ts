/**
 * PR Workflow
 *
 * Handles pull_request and push events.
 */

import { readFileSync } from 'node:fs';
import type { Octokit } from '@octokit/rest';
import { Sentry, logger, emitStaleResolutionMetric, setRepositoryScope, emitRunMetric } from '../../sentry.js';
import {
  buildSkillRootsByName,
  loadLayeredWardenConfig,
  resolveLayeredSkillConfigs,
  ConfigLoadError,
  emptyToUndefined,
} from '../../config/loader.js';
import type {
  LayeredSkillRootsByName,
  LoadedLayeredConfig,
  ResolvedTrigger,
} from '../../config/loader.js';
import { buildEventContext } from '../../event/context.js';
import { matchTrigger, shouldFail, countFindingsAtOrAbove } from '../../triggers/matcher.js';
import { fetchExistingComments } from '../../output/dedup.js';
import type { ExistingComment } from '../../output/dedup.js';
import { buildAnalyzedScope, findStaleComments, resolveStaleComments } from '../../output/stale.js';
import { filterFindings } from '../../types/index.js';
import type { EventContext, SkillReport, Finding } from '../../types/index.js';
import { runPool, Semaphore } from '../../utils/index.js';
import { evaluateFixAttempts, postThreadReply } from '../fix-evaluation/index.js';
import type { EvaluateFixAttemptsResult, FixEvaluation } from '../fix-evaluation/index.js';
import { aggregateUsage } from '../../sdk/usage.js';
import { logAction, warnAction } from '../../cli/output/tty.js';
import { formatCost, formatTokens, formatDuration } from '../../cli/output/formatters.js';
import { findBotReviewState } from '../review-state.js';
import type { BotReviewInfo } from '../review-state.js';
import type { ActionInputs } from '../inputs.js';
import { executeTrigger } from '../triggers/executor.js';
import type { TriggerResult } from '../triggers/executor.js';
import { postTriggerReview } from '../review/poster.js';
import { shouldResolveStaleComments } from '../review/coordination.js';
import type { FindingObservation } from '../reporting/outcomes.js';
import type { RuntimeName } from '../../sdk/runtimes/index.js';
import { canUseRuntimeAuth } from '../../sdk/extract.js';
import { ProviderFailureCircuitBreaker } from '../../sdk/circuit-breaker.js';
import {
  createCoreCheck,
  createSkillCheck,
  failSkillCheck,
  updateCoreCheck,
  updateSkillCheck,
  buildCoreSummaryData,
  determineCoreConclusion,
  type CheckOptions,
} from '../checks/manager.js';
import {
  setOutput,
  setFailed,
  ensureClaudeAuth,
  logGroup,
  logGroupEnd,
  prepareRuntimeEnvironment,
  handleTriggerErrors,
  collectTriggerErrors,
  computeWorkflowOutputs,
  setWorkflowOutputs,
  getAuthenticatedBotLogin,
  writeFindingsOutput,
} from './base.js';

// -----------------------------------------------------------------------------
// Phase Result Types
// -----------------------------------------------------------------------------

interface InitResult {
  context: EventContext;
  runnerConcurrency?: number;
  auxiliaryOptions: AuxiliaryWorkflowOptions;
  matchedTriggers: ResolvedTrigger[];
  skippedTriggers: ResolvedTrigger[];
  skipCoreCheck?: SkippedCoreCheck;
}

interface GitHubSetupResult {
  coreCheckId?: number;
  previousReviewInfo: BotReviewInfo | null;
}

interface ReviewPhaseResult {
  reports: SkillReport[];
  fetchedComments: ExistingComment[];
  existingComments: ExistingComment[];
  activeWardenCommentIds: Set<number>;
  findingObservations: FindingObservation[];
  shouldFailAction: boolean;
  failureReasons: string[];
}

interface FixEvaluationCommentGroups {
  groups: Map<string, ExistingComment[]>;
  currentHeadCount: number;
  missingOriginalCommitCount: number;
}

interface AuxiliaryWorkflowOptions {
  runtime?: RuntimeName;
  model?: string;
  maxRetries?: number;
}

interface SkippedCoreCheck {
  title: string;
  message: string;
}

function existingCommentToFinding(comment: ExistingComment): Finding {
  const location = comment.path && comment.line > 0
    ? {
        path: comment.path,
        startLine: comment.line,
        endLine: comment.line,
      }
    : undefined;

  return {
    id: comment.findingId ?? `comment-${comment.id}`,
    severity: comment.severity ?? 'low',
    title: comment.title,
    description: comment.description,
    ...(comment.confidence ? { confidence: comment.confidence } : {}),
    ...(location ? { location } : {}),
  };
}

function reportsPullRequestCheck(trigger: ResolvedTrigger, context: EventContext): boolean {
  return (
    Boolean(context.pullRequest) &&
    (trigger.type === 'pull_request' || trigger.type === '*')
  );
}

function checkOptionsForPullRequest(context: EventContext): CheckOptions | undefined {
  if (!context.pullRequest) {
    return undefined;
  }

  return {
    owner: context.repository.owner,
    repo: context.repository.name,
    headSha: context.pullRequest.headSha,
  };
}

function resolveWorkflowAuxiliaryOptions(layered: LoadedLayeredConfig): AuxiliaryWorkflowOptions {
  const baseDefaults = layered.baseConfig?.defaults;
  const repoDefaults = layered.repoConfig?.defaults ?? layered.config.defaults;

  return {
    // These workflow-scoped auxiliary calls are not tied to an individual
    // trigger, so the org base config remains the enforced baseline and the
    // repo layer only fills fields the base omits.
    runtime: baseDefaults?.runtime ?? repoDefaults?.runtime ?? 'pi',
    model:
      emptyToUndefined(baseDefaults?.auxiliary?.model) ??
      emptyToUndefined(repoDefaults?.auxiliary?.model),
    maxRetries:
      baseDefaults?.auxiliary?.maxRetries ??
      baseDefaults?.auxiliaryMaxRetries ??
      repoDefaults?.auxiliary?.maxRetries ??
      repoDefaults?.auxiliaryMaxRetries,
  };
}

// -----------------------------------------------------------------------------
// Fix Evaluation Logging
// -----------------------------------------------------------------------------

function logFixEvaluation(ev: FixEvaluation, index: number, total: number): void {
  const totalTokens = ev.usage.inputTokens + ev.usage.outputTokens;
  const costStr = ev.usage.costUSD > 0 ? `, ${formatCost(ev.usage.costUSD)}` : '';
  const idPrefix = ev.findingId ? `${ev.findingId} ` : '';
  const verdict = ev.verdict;

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

function groupCommentsForFixEvaluation(
  comments: ExistingComment[],
  headSha: string
): FixEvaluationCommentGroups {
  const groups = new Map<string, ExistingComment[]>();
  let currentHeadCount = 0;
  let missingOriginalCommitCount = 0;

  for (const comment of comments) {
    const originalCommitSha = comment.originalCommitSha;
    if (!originalCommitSha) {
      missingOriginalCommitCount++;
      continue;
    }
    if (originalCommitSha === headSha) {
      currentHeadCount++;
      continue;
    }

    const group = groups.get(originalCommitSha);
    if (group) {
      group.push(comment);
    } else {
      groups.set(originalCommitSha, [comment]);
    }
  }

  return { groups, currentHeadCount, missingOriginalCommitCount };
}

function mergeFixEvaluationResults(
  results: EvaluateFixAttemptsResult[]
): EvaluateFixAttemptsResult {
  return {
    toResolve: results.flatMap((result) => result.toResolve),
    toReply: results.flatMap((result) => result.toReply),
    skipped: results.reduce((total, result) => total + result.skipped, 0),
    evaluated: results.reduce((total, result) => total + result.evaluated, 0),
    failedEvaluations: results.reduce((total, result) => total + result.failedEvaluations, 0),
    uniqueFindingsEvaluated: results.reduce((total, result) => total + result.uniqueFindingsEvaluated, 0),
    uniqueFindingsCodeChanged: results.reduce((total, result) => total + result.uniqueFindingsCodeChanged, 0),
    uniqueFindingsResolved: results.reduce((total, result) => total + result.uniqueFindingsResolved, 0),
    usage: aggregateUsage(results.map((result) => result.usage)),
    evaluations: results.flatMap((result) => result.evaluations),
  };
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
  setRepositoryScope(context.repository.fullName);

  logGroup('Loading configuration');
  if (inputs.baseConfigPath) {
    console.log(`Base config path: ${inputs.baseConfigPath}`);
  }
  if (inputs.baseSkillRoot) {
    console.log(`Base skill root: ${inputs.baseSkillRoot}`);
  }
  console.log(`Repo config path: ${inputs.configPath}`);
  logGroupEnd();

  let runnerConcurrency: number | undefined;
  let auxiliaryOptions: AuxiliaryWorkflowOptions = { runtime: 'pi' };
  let skillRootsByName: LayeredSkillRootsByName | undefined;
  try {
    const layered = loadLayeredWardenConfig(repoPath, {
      baseConfigPath: inputs.baseConfigPath,
      configPath: inputs.configPath,
      onWarning: (message) => console.log(`::warning::${message}`),
    });
    // The org base config is an enforced baseline. Repo config extends the run
    // with additional repo-local triggers, but does not override these
    // action-level settings for the global workflow.
    runnerConcurrency =
      layered.baseConfig?.runner?.concurrency ??
      layered.repoConfig?.runner?.concurrency ??
      layered.config.runner?.concurrency;
    auxiliaryOptions = resolveWorkflowAuxiliaryOptions(layered);
    skillRootsByName = buildSkillRootsByName(repoPath, layered, inputs.baseSkillRoot);
    const resolvedTriggers = resolveLayeredSkillConfigs(layered, undefined, skillRootsByName);
    const matchedTriggers = resolvedTriggers.filter((t) => matchTrigger(t, context, 'github'));
    const skippedTriggers = resolvedTriggers.filter(
      (t) => reportsPullRequestCheck(t, context) && !matchedTriggers.includes(t)
    );

    if (matchedTriggers.length > 0) {
      logGroup('Matched triggers');
      for (const trigger of matchedTriggers) {
        console.log(`- ${trigger.name}: ${trigger.skill}`);
      }
      logGroupEnd();
    } else {
      console.log('No triggers matched for this event');
    }

    return { context, runnerConcurrency, auxiliaryOptions, matchedTriggers, skippedTriggers };
  } catch (error) {
    if (
      error instanceof ConfigLoadError &&
      error.message.includes('not found') &&
      !inputs.baseConfigPath
    ) {
      const message = 'No warden.toml found. Skipping analysis.';
      console.log(`::warning::${message}`);
      return {
        context,
        runnerConcurrency,
        auxiliaryOptions,
        matchedTriggers: [],
        skippedTriggers: [],
        skipCoreCheck: {
          title: 'No warden.toml found',
          message,
        },
      };
    }
    throw error;
  }
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
  runnerConcurrency: number | undefined,
  inputs: ActionInputs
): Promise<TriggerResult[]> {
  const concurrency = runnerConcurrency ?? inputs.parallel;
  const runtimeEnv = await prepareRuntimeEnvironment(matchedTriggers, inputs);

  const semaphore = new Semaphore(concurrency);
  const abortController = new AbortController();
  const circuitBreaker = new ProviderFailureCircuitBreaker({ abortController });

  // Limit trigger dispatch too; the semaphore only gates work after a trigger starts.
  return runPool(
    matchedTriggers,
    concurrency,
    (trigger) =>
      executeTrigger(trigger, {
        octokit,
        context,
        anthropicApiKey: inputs.anthropicApiKey,
        claudePath: runtimeEnv.pathToClaudeCodeExecutable,
        globalFailOn: inputs.failOn,
        globalReportOn: inputs.reportOn,
        globalMaxFindings: inputs.maxFindings,
        globalRequestChanges: inputs.requestChanges,
        globalFailCheck: inputs.failCheck,
        semaphore,
        abortController,
        circuitBreaker,
      }),
    { shouldAbort: () => abortController.signal.aborted },
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
  auxiliaryOptions: AuxiliaryWorkflowOptions
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
  const activeWardenCommentIds = new Set<number>();
  const findingObservations: FindingObservation[] = [];
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
          runtime: auxiliaryOptions.runtime,
          model: auxiliaryOptions.model,
          maxRetries: auxiliaryOptions.maxRetries,
        },
        { octokit, context }
      );

      // Add newly posted comments to existing comments for cross-trigger deduplication
      existingComments.push(...postResult.newComments);
      postResult.activeWardenCommentIds.forEach((id) => activeWardenCommentIds.add(id));
      findingObservations.push(...postResult.findingObservations);

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

  return {
    reports,
    fetchedComments,
    existingComments,
    activeWardenCommentIds,
    findingObservations,
    shouldFailAction,
    failureReasons,
  };
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
  activeWardenCommentIds: ReadonlySet<number>,
  canResolveStale: boolean,
  anthropicApiKey: string,
  auxiliaryOptions: AuxiliaryWorkflowOptions
): Promise<{
  allResolved: boolean;
  autoResolvedByFixEvaluation: number;
  autoResolvedByStaleCheck: number;
  findingObservations: FindingObservation[];
}> {
  const wardenComments = fetchedComments.filter((c) => c.isWarden);
  const commentsResolvedByFixEval = new Set<number>();
  const commentsEvaluatedByFixEval = new Set<number>();
  const commentsResolvedByStale = new Set<number>();
  const findingObservations: FindingObservation[] = [];
  const commentsForFixEvaluation = wardenComments.filter(
    (c) => !activeWardenCommentIds.has(c.id)
  );
  const fixEvaluationRuntime = auxiliaryOptions.runtime ?? 'pi';
  const canUseFixEvaluationRuntime = canUseRuntimeAuth({
    apiKey: anthropicApiKey,
    runtime: fixEvaluationRuntime,
  });

  // Evaluate follow-up commit fix attempts
  if (
    context.pullRequest &&
    commentsForFixEvaluation.length > 0 &&
    canResolveStale &&
    canUseFixEvaluationRuntime
  ) {
    try {
      logGroup('Fix evaluation');

      // Only evaluate comments that were posted on an earlier commit. If a comment was
      // posted on the current headSha there are no follow-up changes to evaluate yet, and
      // running fix evaluation would compare the entire PR diff (PR base to head) against a
      // finding from this same run, producing spurious "Fix attempt detected" replies.
      const headSha = context.pullRequest.headSha;
      const {
        groups: commentsByOriginalCommit,
        currentHeadCount,
        missingOriginalCommitCount,
      } = groupCommentsForFixEvaluation(commentsForFixEvaluation, headSha);

      const unresolvedCount = [...commentsByOriginalCommit.values()]
        .flat()
        .filter((c) => !c.isResolved && c.threadId).length;
      if (unresolvedCount > 0) {
        logAction(`Fix evaluation: evaluating ${unresolvedCount} unresolved comments`);
      } else {
        logAction(
          `Fix evaluation: no eligible comments (${currentHeadCount} current head, ` +
            `${missingOriginalCommitCount} missing original commit)`
        );
      }

      const groupResults: EvaluateFixAttemptsResult[] = [];
      for (const [commentBaseSha, groupComments] of commentsByOriginalCommit) {
        groupResults.push(
          await evaluateFixAttempts(
            octokit,
            groupComments,
            {
              owner: context.repository.owner,
              repo: context.repository.name,
              baseSha: commentBaseSha,
              headSha,
            },
            allFindings,
            anthropicApiKey,
            { ...auxiliaryOptions, runtime: fixEvaluationRuntime }
          )
        );
      }
      const fixEvaluation = mergeFixEvaluationResults(groupResults);

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
        for (const comment of fixEvaluation.toResolve) {
          if (!resolvedIds.has(comment.id)) continue;
          findingObservations.push({
            outcome: 'resolved',
            finding: existingCommentToFinding(comment),
            skill: comment.skills?.[0],
            resolvedReason: 'fix_evaluation',
          });
        }
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
        (c) =>
          !activeWardenCommentIds.has(c.id) &&
          !commentsResolvedByFixEval.has(c.id) &&
          !commentsEvaluatedByFixEval.has(c.id)
      );
      const staleComments = findStaleComments(commentsForStaleCheck, allFindings, scope);

      if (staleComments.length > 0) {
        const { resolvedCount, resolvedIds } = await resolveStaleComments(octokit, staleComments);
        if (resolvedCount > 0) {
          logAction(`Resolved ${resolvedCount} stale Warden comments`);
          emitStaleResolutionMetric(resolvedCount);
          // Emit per-skill breakdown (only count actually resolved comments)
          const bySkill = new Map<string, number>();
          for (const c of staleComments) {
            if (!resolvedIds.has(c.id)) continue;
            const skill = c.skills?.[0];
            if (skill) {
              bySkill.set(skill, (bySkill.get(skill) ?? 0) + 1);
            }
          }
          for (const [skill, count] of bySkill) {
            emitStaleResolutionMetric(count, skill);
          }
        }
        resolvedIds.forEach((id) => commentsResolvedByStale.add(id));
        for (const comment of staleComments) {
          if (!resolvedIds.has(comment.id)) continue;
          findingObservations.push({
            outcome: 'resolved',
            finding: existingCommentToFinding(comment),
            skill: comment.skills?.[0],
            resolvedReason: 'stale_check',
          });
        }
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
    findingObservations,
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
  findingObservations: FindingObservation[],
  shouldFailAction: boolean,
  failureReasons: string[],
  canResolveStale: boolean,
  triggerErrors: string[]
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

  // Write structured findings to file for external export (GCS, S3, etc.)
  try {
    const findingsPath = writeFindingsOutput(reports, context, findingObservations);
    logAction(`Findings written to ${findingsPath}`);
  } catch (error) {
    warnAction(`Failed to write findings output: ${error}`);
  }

  // Update core check with overall summary
  if (coreCheckId && context.pullRequest) {
    try {
      const summaryData = buildCoreSummaryData(results, reports);
      const coreConclusion = determineCoreConclusion(
        shouldFailAction || triggerErrors.length > 0,
        outputs.findingsCount
      );

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

/** Complete the core check for a PR run that intentionally skipped analysis. */
async function completeSkippedCoreCheck(
  octokit: Octokit,
  context: EventContext,
  coreCheckId: number | undefined,
  skipped: SkippedCoreCheck
): Promise<void> {
  const options = checkOptionsForPullRequest(context);
  if (!coreCheckId || !options) {
    return;
  }

  try {
    await updateCoreCheck(
      octokit,
      coreCheckId,
      {
        ...buildCoreSummaryData([], []),
        title: skipped.title,
        message: skipped.message,
      },
      'neutral',
      options
    );
  } catch (error) {
    Sentry.captureException(error, { tags: { operation: 'update_core_check_skipped' } });
    warnAction(`Failed to update core check: ${error}`);
  }
}

/** Complete per-skill checks for configured PR triggers that did not run. */
async function completeSkippedSkillChecks(
  octokit: Octokit,
  context: EventContext,
  skippedTriggers: ResolvedTrigger[]
): Promise<void> {
  const options = checkOptionsForPullRequest(context);
  if (!options || skippedTriggers.length === 0) {
    return;
  }

  for (const trigger of skippedTriggers) {
    try {
      const skillCheck = await createSkillCheck(octokit, trigger.skill, options);

      await updateSkillCheck(
        octokit,
        skillCheck.checkRunId,
        {
          skill: trigger.skill,
          summary: 'Trigger did not run for this event.',
          findings: [],
        },
        {
          ...options,
          failOn: trigger.failOn,
          reportOn: trigger.reportOn,
          minConfidence: trigger.minConfidence ?? 'medium',
          failCheck: trigger.failCheck,
          conclusion: 'neutral',
          title: 'Skipped',
        }
      );
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          operation: 'update_skipped_skill_check',
          trigger_name: trigger.name,
          skill_name: trigger.skill,
        },
      });
      warnAction(`Failed to update skipped skill check for ${trigger.skill}: ${error}`);
    }
  }
}

/**
 * Fail per-skill checks when workflow setup fails before triggers are dispatched.
 */
async function failUndispatchedSkillChecks(
  octokit: Octokit,
  context: EventContext,
  triggers: ResolvedTrigger[],
  error: unknown
): Promise<void> {
  const options = checkOptionsForPullRequest(context);
  if (!options || triggers.length === 0) {
    return;
  }

  for (const trigger of triggers) {
    try {
      const skillCheck = await createSkillCheck(octokit, trigger.skill, options);

      await failSkillCheck(octokit, skillCheck.checkRunId, error, options);
    } catch (checkError) {
      Sentry.captureException(checkError, {
        tags: {
          operation: 'fail_undispatched_skill_check',
          trigger_name: trigger.name,
          skill_name: trigger.skill,
        },
      });
      warnAction(`Failed to mark skill check as failed for ${trigger.skill}: ${checkError}`);
    }
  }
}

/**
 * Mark the core check failed when an early PR workflow phase fails after check creation.
 */
async function failCoreCheck(
  octokit: Octokit,
  context: EventContext,
  coreCheckId: number | undefined,
  error: unknown
): Promise<void> {
  const options = checkOptionsForPullRequest(context);
  if (!coreCheckId || !options) {
    return;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);

  try {
    await updateCoreCheck(
      octokit,
      coreCheckId,
      {
        ...buildCoreSummaryData([], []),
        title: 'Warden failed',
        message: `Error: ${errorMessage}`,
      },
      'failure',
      options
    );
  } catch (checkError) {
    Sentry.captureException(checkError, { tags: { operation: 'fail_core_check' } });
    warnAction(`Failed to mark core check as failed: ${checkError}`);
  }
}

async function runOrFailCore<T>(
  octokit: Octokit,
  context: EventContext,
  coreCheckId: number | undefined,
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    await failCoreCheck(octokit, context, coreCheckId, error);
    throw error;
  }
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
  inputs: ActionInputs,
  auxiliaryOptions: AuxiliaryWorkflowOptions
): Promise<FindingObservation[]> {
  if (!context.pullRequest) {
    return [];
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
    return [];
  }

  const wardenComments = existingComments.filter((c) => c.isWarden);
  if (wardenComments.length === 0) {
    return [];
  }

  if ((auxiliaryOptions.runtime ?? 'pi') === 'claude') {
    ensureClaudeAuth(inputs);
  }

  logAction(`No triggers matched, but found ${wardenComments.length} existing Warden comments. Running cleanup.`);

  const { allResolved, autoResolvedByFixEvaluation, autoResolvedByStaleCheck, findingObservations } =
    await evaluateFixesAndResolveStale(
      octokit, context, existingComments, [], new Set(), true, inputs.anthropicApiKey, auxiliaryOptions
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

  return findingObservations;
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
      const initResult = await Sentry.startSpan(
        { op: 'workflow.init', name: 'initialize workflow' },
        () => initializeWorkflow(octokit, inputs, eventName, eventPath, repoPath),
      );

      const {
        context,
        runnerConcurrency,
        auxiliaryOptions,
        matchedTriggers,
        skippedTriggers,
        skipCoreCheck,
      } = initResult;
      span.setAttribute('warden.trigger.count', matchedTriggers.length);

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

      emitRunMetric();

      const traceId = span.spanContext().traceId;
      logger.info('Workflow initialized', {
        'warden.trigger.count': matchedTriggers.length,
        'trace.id': traceId,
      });

      const { coreCheckId, previousReviewInfo } = await Sentry.startSpan(
        { op: 'workflow.setup', name: 'setup github state' },
        () => setupGitHubState(octokit, context),
      );

      await completeSkippedSkillChecks(octokit, context, skippedTriggers);

      if (skipCoreCheck) {
        setOutput('findings-count', 0);
        setOutput('high-count', 0);
        setOutput('summary', skipCoreCheck.title);
        try {
          writeFindingsOutput([], context);
        } catch (error) {
          warnAction(`Failed to write findings output: ${error}`);
        }
        await completeSkippedCoreCheck(octokit, context, coreCheckId, skipCoreCheck);
        return;
      }

      if (matchedTriggers.length === 0) {
        await runOrFailCore(octokit, context, coreCheckId, async () => {
          const cleanupFindingObservations = await cleanupOrphanedComments(
            octokit,
            context,
            inputs,
            auxiliaryOptions
          );
          setOutput('findings-count', 0);
          setOutput('high-count', 0);
          setOutput('summary', 'No triggers matched');
          try {
            writeFindingsOutput([], context, cleanupFindingObservations);
          } catch (error) {
            warnAction(`Failed to write findings output: ${error}`);
          }
          await completeSkippedCoreCheck(octokit, context, coreCheckId, {
            title: 'No triggers matched',
            message: 'No triggers matched for this event.',
          });
        });
        return;
      }

      let results: TriggerResult[];
      try {
        results = await Sentry.startSpan(
          {
            op: 'workflow.execute',
            name: 'execute triggers',
            attributes: { 'warden.trigger.count': matchedTriggers.length },
          },
          () => executeAllTriggers(matchedTriggers, octokit, context, runnerConcurrency, inputs),
        );
      } catch (error) {
        await failUndispatchedSkillChecks(octokit, context, matchedTriggers, error);
        await failCoreCheck(octokit, context, coreCheckId, error);
        throw error;
      }

      const reviewPhase = await runOrFailCore(
        octokit,
        context,
        coreCheckId,
        () => Sentry.startSpan(
          { op: 'workflow.review', name: 'post reviews' },
          () => postReviewsAndTrackFailures(octokit, context, results, inputs, auxiliaryOptions),
        ),
      );

      const triggerErrors = collectTriggerErrors(results);
      const canResolveStale = shouldResolveStaleComments(results);
      const allFindings = reviewPhase.reports.flatMap((r) => r.findings);
      span.setAttribute('warden.finding.count', allFindings.length);

      await runOrFailCore(
        octokit,
        context,
        coreCheckId,
        () => Sentry.startSpan(
          { op: 'workflow.resolve', name: 'resolve stale comments' },
          async (resolveSpan) => {
            const resolutionResult = await evaluateFixesAndResolveStale(
              octokit, context, reviewPhase.fetchedComments,
              allFindings, reviewPhase.activeWardenCommentIds,
              canResolveStale, inputs.anthropicApiKey,
              auxiliaryOptions,
            );
            resolveSpan.setAttribute(
              'warden.feedback.auto_resolve.fix_eval_count',
              resolutionResult.autoResolvedByFixEvaluation
            );
            resolveSpan.setAttribute(
              'warden.feedback.auto_resolve.stale_count',
              resolutionResult.autoResolvedByStaleCheck
            );
            reviewPhase.findingObservations.push(...resolutionResult.findingObservations);
          },
        ),
      );

      await finalizeWorkflow(
        octokit, context, previousReviewInfo, coreCheckId,
        results, reviewPhase.reports,
        reviewPhase.findingObservations,
        reviewPhase.shouldFailAction, reviewPhase.failureReasons,
        canResolveStale,
        triggerErrors,
      );

      handleTriggerErrors(triggerErrors, matchedTriggers.length);
    },
  );
}
