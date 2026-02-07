/**
 * Trigger Executor
 *
 * Executes a single trigger and manages associated GitHub check runs.
 * Extracted from main.ts to enable isolated testing and clearer dependencies.
 */

import type { Octokit } from '@octokit/rest';
import type { ResolvedTrigger } from '../../config/loader.js';
import type { WardenConfig } from '../../config/schema.js';
import type { EventContext, SkillReport, SeverityThreshold } from '../../types/index.js';
import type { RenderResult, ReviewState } from '../../output/types.js';
import type { OutputMode } from '../../cli/output/tty.js';
import { resolveSkillAsync } from '../../skills/loader.js';
import { runSkillTask, createDefaultCallbacks } from '../../cli/output/tasks.js';
import type { SkillTaskOptions } from '../../cli/output/tasks.js';
import { renderSkillReport } from '../../output/renderer.js';
import {
  createSkillCheck,
  updateSkillCheck,
  failSkillCheck,
} from '../../output/github-checks.js';
import { logGroup, logGroupEnd } from '../workflow/base.js';
import { DEFAULT_FILE_CONCURRENCY } from '../../sdk/types.js';
import { Verbosity } from '../../cli/output/verbosity.js';

/** Log-mode output for CI: no TTY, no color. */
const CI_OUTPUT_MODE: OutputMode = { isTTY: false, supportsColor: false, columns: 120 };

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Dependencies required for trigger execution.
 * Making these explicit enables testing with mock implementations.
 */
export interface TriggerExecutorDeps {
  octokit: Octokit;
  context: EventContext;
  config: WardenConfig;
  anthropicApiKey: string;
  claudePath: string;
  previousReviewState: ReviewState | null;
  /** Global fail-on from action inputs (trigger-specific takes precedence) */
  globalFailOn?: SeverityThreshold;
  /** Global comment-on from action inputs (trigger-specific takes precedence) */
  globalCommentOn?: SeverityThreshold;
  /** Global max-findings from action inputs (trigger-specific takes precedence) */
  globalMaxFindings: number;
}

/**
 * Result from executing a single trigger.
 */
export interface TriggerResult {
  triggerName: string;
  report?: SkillReport;
  renderResult?: RenderResult;
  failOn?: SeverityThreshold;
  commentOn?: SeverityThreshold;
  commentOnSuccess?: boolean;
  checkRunUrl?: string;
  maxFindings?: number;
  previousReviewState?: ReviewState | null;
  error?: unknown;
}

// -----------------------------------------------------------------------------
// Executor
// -----------------------------------------------------------------------------

/**
 * Execute a single trigger and return results.
 *
 * Handles:
 * - Creating/updating GitHub check runs
 * - Running the skill via Claude Code SDK
 * - Rendering results for GitHub review
 */
export async function executeTrigger(
  trigger: ResolvedTrigger,
  deps: TriggerExecutorDeps
): Promise<TriggerResult> {
  const { octokit, context, config, anthropicApiKey, claudePath, previousReviewState } = deps;

  logGroup(`Running trigger: ${trigger.name} (skill: ${trigger.skill})`);

  // Create skill check (only for PRs)
  let skillCheckId: number | undefined;
  let skillCheckUrl: string | undefined;
  if (context.pullRequest) {
    try {
      const skillCheck = await createSkillCheck(octokit, trigger.skill, {
        owner: context.repository.owner,
        repo: context.repository.name,
        headSha: context.pullRequest.headSha,
      });
      skillCheckId = skillCheck.checkRunId;
      skillCheckUrl = skillCheck.url;
    } catch (error) {
      console.error(`::warning::Failed to create skill check for ${trigger.skill}: ${error}`);
    }
  }

  const failOn = trigger.output.failOn ?? deps.globalFailOn;
  const commentOn = trigger.output.commentOn ?? deps.globalCommentOn;

  try {
    const taskOptions: SkillTaskOptions = {
      name: trigger.name,
      displayName: trigger.skill,
      failOn,
      resolveSkill: () => resolveSkillAsync(trigger.skill, context.repoPath, {
        remote: trigger.remote,
      }),
      context,
      runnerOptions: {
        apiKey: anthropicApiKey,
        model: trigger.model,
        maxTurns: trigger.maxTurns ?? config.defaults?.maxTurns,
        batchDelayMs: config.defaults?.batchDelayMs,
        pathToClaudeCodeExecutable: claudePath,
      },
    };

    const callbacks = createDefaultCallbacks([taskOptions], CI_OUTPUT_MODE, Verbosity.Normal);
    const result = await runSkillTask(taskOptions, DEFAULT_FILE_CONCURRENCY, callbacks);
    const report = result.report;

    if (!report) {
      throw result.error ?? new Error('Skill task returned no report');
    }

    console.log(`Found ${report.findings.length} findings`);

    // Update skill check with results
    if (skillCheckId && context.pullRequest) {
      try {
        await updateSkillCheck(octokit, skillCheckId, report, {
          owner: context.repository.owner,
          repo: context.repository.name,
          headSha: context.pullRequest.headSha,
          failOn,
          commentOn,
        });
      } catch (error) {
        console.error(`::warning::Failed to update skill check for ${trigger.skill}: ${error}`);
      }
    }

    // Render if we're going to post comments OR if we might need to approve
    // (approval can happen even with no comments when previousReviewState is CHANGES_REQUESTED)
    const mightNeedApproval = previousReviewState === 'CHANGES_REQUESTED' && failOn && failOn !== 'off';
    const maxFindings = trigger.output.maxFindings ?? deps.globalMaxFindings;
    const renderResult =
      commentOn !== 'off' || mightNeedApproval
        ? renderSkillReport(report, {
            maxFindings,
            commentOn,
            failOn,
            checkRunUrl: skillCheckUrl,
            totalFindings: report.findings.length,
            previousReviewState,
          })
        : undefined;

    logGroupEnd();
    return {
      triggerName: trigger.name,
      report,
      renderResult,
      failOn,
      commentOn,
      commentOnSuccess: trigger.output.commentOnSuccess,
      checkRunUrl: skillCheckUrl,
      maxFindings,
      previousReviewState,
    };
  } catch (error) {
    // Mark skill check as failed
    if (skillCheckId && context.pullRequest) {
      try {
        await failSkillCheck(octokit, skillCheckId, error, {
          owner: context.repository.owner,
          repo: context.repository.name,
          headSha: context.pullRequest.headSha,
        });
      } catch (checkError) {
        console.error(`::warning::Failed to mark skill check as failed: ${checkError}`);
      }
    }

    console.error(`::warning::Trigger ${trigger.name} failed: ${error}`);
    logGroupEnd();
    return { triggerName: trigger.name, error };
  }
}
