/**
 * Trigger Executor
 *
 * Executes a single trigger and manages associated GitHub check runs.
 * Extracted from main.ts to enable isolated testing and clearer dependencies.
 */

import type { Octokit } from '@octokit/rest';
import { Sentry } from '../../sentry.js';
import { ActionFailedError } from '../workflow/base.js';
import type { ResolvedTrigger } from '../../config/loader.js';
import type { WardenConfig } from '../../config/schema.js';
import type { EventContext, SkillReport, SeverityThreshold, ConfidenceThreshold } from '../../types/index.js';
import type { RenderResult } from '../../output/types.js';
import type { OutputMode } from '../../cli/output/tty.js';
import { resolveSkillAsync } from '../../skills/loader.js';
import { filterContextByPaths } from '../../triggers/matcher.js';
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
import type { Semaphore } from '../../utils/index.js';
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
  /** Global fail-on from action inputs (trigger-specific takes precedence) */
  globalFailOn?: SeverityThreshold;
  /** Global report-on from action inputs (trigger-specific takes precedence) */
  globalReportOn?: SeverityThreshold;
  /** Global max-findings from action inputs (trigger-specific takes precedence) */
  globalMaxFindings: number;
  /** Global request-changes from action inputs (trigger-specific takes precedence) */
  globalRequestChanges?: boolean;
  /** Global fail-check from action inputs (trigger-specific takes precedence) */
  globalFailCheck?: boolean;
  /** Global semaphore for limiting concurrent file analyses across triggers */
  semaphore?: Semaphore;
}

/**
 * Result from executing a single trigger.
 */
export interface TriggerResult {
  triggerName: string;
  report?: SkillReport;
  renderResult?: RenderResult;
  failOn?: SeverityThreshold;
  reportOn?: SeverityThreshold;
  minConfidence?: ConfidenceThreshold;
  reportOnSuccess?: boolean;
  requestChanges?: boolean;
  failCheck?: boolean;
  checkRunUrl?: string;
  maxFindings?: number;
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
  return Sentry.startSpan(
    { op: 'trigger.execute', name: `execute ${trigger.name}` },
    async (span) => {
      span.setAttribute('skill.name', trigger.skill);
      const { octokit, context, config, anthropicApiKey, claudePath } = deps;

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

      const failOn = trigger.failOn ?? deps.globalFailOn;
      const reportOn = trigger.reportOn ?? deps.globalReportOn;
      const minConfidence = trigger.minConfidence ?? 'medium';
      const requestChanges = trigger.requestChanges ?? deps.globalRequestChanges;
      const failCheck = trigger.failCheck ?? deps.globalFailCheck;

      try {
        const taskOptions: SkillTaskOptions = {
          name: trigger.name,
          displayName: trigger.skill,
          failOn,
          resolveSkill: () => resolveSkillAsync(trigger.skill, context.repoPath, {
            remote: trigger.remote,
          }),
          context: filterContextByPaths(context, trigger.filters),
          runnerOptions: {
            apiKey: anthropicApiKey,
            model: trigger.model,
            maxTurns: trigger.maxTurns,
            batchDelayMs: config.defaults?.batchDelayMs,
            pathToClaudeCodeExecutable: claudePath,
            auxiliaryMaxRetries: config.defaults?.auxiliaryMaxRetries,
            session: { enabled: false },
          },
        };

        const callbacks = createDefaultCallbacks([taskOptions], CI_OUTPUT_MODE, Verbosity.Normal);
        const fileConcurrency = deps.semaphore ? Number.MAX_SAFE_INTEGER : DEFAULT_FILE_CONCURRENCY;
        const result = await runSkillTask(taskOptions, fileConcurrency, callbacks, deps.semaphore);
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
              reportOn,
              minConfidence,
              failCheck,
            });
          } catch (error) {
            console.error(`::warning::Failed to update skill check for ${trigger.skill}: ${error}`);
          }
        }

        const maxFindings = trigger.maxFindings ?? deps.globalMaxFindings;
        const renderResult =
          reportOn !== 'off'
            ? renderSkillReport(report, {
                maxFindings,
                reportOn,
                minConfidence,
                failOn,
                requestChanges,
                checkRunUrl: skillCheckUrl,
                totalFindings: report.findings.length,
              })
            : undefined;

        logGroupEnd();
        return {
          triggerName: trigger.name,
          report,
          renderResult,
          failOn,
          reportOn,
          minConfidence,
          reportOnSuccess: trigger.reportOnSuccess,
          requestChanges,
          failCheck,
          checkRunUrl: skillCheckUrl,
          maxFindings,
        };
      } catch (error) {
        if (error instanceof ActionFailedError) throw error;
        Sentry.captureException(error, {
          tags: { 'trigger.name': trigger.name, 'skill.name': trigger.skill },
        });

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
    },
  );
}
