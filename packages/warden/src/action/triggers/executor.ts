/**
 * Trigger Executor
 *
 * Executes a single trigger. GitHub check writes are optional and must be
 * injected by legacy run mode; split analyze mode omits that capability.
 * Extracted from main.ts to enable isolated testing and clearer dependencies.
 */

import { Sentry } from '../../sentry.js';
import { ActionFailedError } from '../workflow/base.js';
import type { ResolvedTrigger } from '../../config/loader.js';
import type { EventContext, SkillReport, SeverityThreshold, ConfidenceThreshold } from '../../types/index.js';
import type { RenderResult } from '../../output/types.js';
import type { OutputMode } from '../../cli/output/tty.js';
import { resolveSkillAsync } from '../../skills/loader.js';
import { filterContextByPaths } from '../../triggers/matcher.js';
import { runSkillTask, createDefaultCallbacks } from '../../cli/output/tasks.js';
import type { SkillTaskOptions } from '../../cli/output/tasks.js';
import { renderSkillReport } from '../../output/renderer.js';
import { logGroup, logGroupEnd } from '../workflow/base.js';
import type { AnalysisChunkingConfig } from '../../sdk/types.js';
import type { FindingProcessingEvent } from '../../sdk/types.js';
import { SkillRunnerError } from '../../sdk/errors.js';
import type { AsyncWorkQueue } from '../../utils/index.js';
import { Verbosity } from '../../cli/output/verbosity.js';
import type { ProviderFailureCircuitBreaker } from '../../sdk/circuit-breaker.js';
import { assertValidPiModelSelectors } from '../../sdk/runtimes/model-selectors.js';
import { isWardenOffline } from '../../sdk/offline.js';
import { captureActionTriggerError } from '../error-reporting.js';

/** Log-mode output for CI: no TTY, no color. */
const CI_OUTPUT_MODE: OutputMode = { isTTY: false, supportsColor: false, columns: 120 };

function toAnalysisChunkingConfig(
  chunking: ResolvedTrigger['chunking']
): AnalysisChunkingConfig | undefined {
  if (!chunking) {
    return undefined;
  }

  const analysisChunking: AnalysisChunkingConfig = {};
  if (chunking.filePatterns) {
    analysisChunking.filePatterns = chunking.filePatterns;
  }
  if (chunking.coalesce) {
    analysisChunking.coalesce = chunking.coalesce;
  }

  return analysisChunking.filePatterns || analysisChunking.coalesce
    ? analysisChunking
    : undefined;
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Optional check lifecycle for trigger execution.
 */
export interface TriggerCheckRun {
  url?: string;
  checkRunId?: number;
  complete(report: SkillReport, options: TriggerCheckCompleteOptions): Promise<void>;
  fail(error: unknown): Promise<void>;
}

/**
 * Reporting policy applied when completing a trigger check.
 */
export interface TriggerCheckCompleteOptions {
  failOn?: SeverityThreshold;
  reportOn?: SeverityThreshold;
  minConfidence?: ConfidenceThreshold;
  failCheck?: boolean;
}

/**
 * Optional context-bound check capability. Omit for analyze mode.
 */
export interface TriggerCheckReporter {
  start(skillName: string): Promise<TriggerCheckRun>;
}

/**
 * Dependencies required for trigger execution.
 * Making these explicit enables testing with mock implementations.
 */
export interface TriggerExecutorDeps {
  context: EventContext;
  anthropicApiKey: string;
  claudePath?: string;
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
  /** Global queue for limiting concurrent hunk analyses across triggers. */
  analysisQueue?: AsyncWorkQueue;
  /** Shared controller for stopping the whole action run */
  abortController?: AbortController;
  /** Shared circuit breaker for auth/provider failures */
  circuitBreaker?: ProviderFailureCircuitBreaker;
  /** Optional context-bound check writer. Omit for analyze mode. */
  checks?: TriggerCheckReporter;
  /** Lower-authority repository memory recalled once for the Action run. */
  historicalEvidence?: string;
}

/**
 * Result from executing a single trigger.
 */
export interface TriggerResult {
  triggerId?: string;
  skillExecutionId?: string;
  triggerName: string;
  skillName: string;
  report?: SkillReport;
  renderResult?: RenderResult;
  failOn?: SeverityThreshold;
  reportOn?: SeverityThreshold;
  minConfidence?: ConfidenceThreshold;
  reportOnSuccess?: boolean;
  requestChanges?: boolean;
  failCheck?: boolean;
  checkRunUrl?: string;
  checkRunId?: number;
  maxFindings?: number;
  auxiliaryModel?: string;
  synthesisModel?: string;
  error?: unknown;
  /** Verification/merge events captured during post-processing, for provenance export. */
  findingProcessingEvents?: FindingProcessingEvent[];
  /**
   * The review event actually posted to GitHub by `postTriggerReview`, set
   * only when posting succeeds. Distinct from `renderResult.review.event`,
   * which reflects pre-posting render intent and can diverge from what (if
   * anything) actually posted — the gate can block the write, or posting can
   * fall back to checks-only after rendering already decided an event.
   */
  reviewEventPosted?: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
}

// -----------------------------------------------------------------------------
// Executor
// -----------------------------------------------------------------------------

/**
 * Execute a single trigger and return results.
 *
 * Handles:
 * - Running the skill via Claude Code SDK
 * - Rendering results for GitHub review
 * - Creating/updating GitHub check runs only when a check reporter is provided
 */
export async function executeTrigger(
  trigger: ResolvedTrigger,
  deps: TriggerExecutorDeps
): Promise<TriggerResult> {
  return Sentry.startSpan(
    { op: 'trigger.execute', name: `execute ${trigger.name}` },
    async (span) => {
      span.setAttribute('gen_ai.agent.name', trigger.skill);
      span.setAttribute('warden.trigger.name', trigger.name);
      const { context, anthropicApiKey, claudePath } = deps;

      logGroup(`Running trigger: ${trigger.name} (skill: ${trigger.skill})`);

      // Create skill check (only for PRs)
      let skillCheck: TriggerCheckRun | undefined;
      let skillCheckUrl: string | undefined;
      let skillCheckRunId: number | undefined;
      if (deps.checks && context.pullRequest) {
        try {
          skillCheck = await deps.checks.start(trigger.skill);
          skillCheckUrl = skillCheck.url;
          skillCheckRunId = skillCheck.checkRunId;
        } catch (error) {
          console.error(`::warning::Failed to create skill check for ${trigger.skill}: ${error}`);
        }
      }

      const failOn = trigger.failOn ?? deps.globalFailOn;
      const reportOn = trigger.reportOn ?? deps.globalReportOn;
      const minConfidence = trigger.minConfidence ?? 'medium';
      const requestChanges = trigger.requestChanges ?? deps.globalRequestChanges;
      const failCheck = trigger.failCheck ?? deps.globalFailCheck;
      const skillRoot = trigger.useBuiltinSkill ? undefined : (trigger.skillRoot ?? context.repoPath);

      try {
        assertValidPiModelSelectors([trigger]);

        const taskOptions: SkillTaskOptions = {
          name: trigger.name,
          displayName: trigger.skill,
          triggerName: trigger.name,
          failOn,
          resolveSkill: () => resolveSkillAsync(trigger.skill, skillRoot, {
            remote: trigger.remote,
            offline: isWardenOffline(),
          }),
          context: filterContextByPaths(context, trigger.filters),
          runnerOptions: {
            apiKey: anthropicApiKey,
            model: trigger.model,
            runtime: trigger.runtime,
            effort: trigger.effort,
            auxiliaryModel: trigger.auxiliaryModel,
            auxiliaryEffort: trigger.auxiliaryEffort,
            synthesisModel: trigger.synthesisModel,
            maxTurns: trigger.maxTurns,
            batchDelayMs: trigger.batchDelayMs,
            maxContextFiles: trigger.maxContextFiles,
            ignore: trigger.ignore,
            scan: trigger.scan,
            chunking: toAnalysisChunkingConfig(trigger.chunking),
            pathToClaudeCodeExecutable: claudePath,
            auxiliaryMaxRetries: trigger.auxiliaryMaxRetries,
            verifyFindings: trigger.verifyFindings,
            abortController: deps.abortController,
            circuitBreaker: deps.circuitBreaker,
            historicalEvidence: deps.historicalEvidence,
          },
        };

        const defaultCallbacks = createDefaultCallbacks([taskOptions], CI_OUTPUT_MODE, Verbosity.Normal);
        const findingProcessingEvents: FindingProcessingEvent[] = [];
        const callbacks = {
          ...defaultCallbacks,
          onFindingProcessing: (skillName: string, event: FindingProcessingEvent) => {
            findingProcessingEvents.push(event);
            defaultCallbacks.onFindingProcessing?.(skillName, event);
          },
        };
        const result = await runSkillTask(taskOptions, callbacks, deps.analysisQueue);
        const report = result.report;

        if (!report) {
          throw result.error ?? new Error('Skill task returned no report');
        }
        // runSkillTask now synthesizes a report even on failure so the CLI
        // can log it as JSONL. The action's fail-check path still expects a
        // thrown error, so re-throw when the report carries one. Preserve
        // the ErrorCode in the fallback so Sentry / failSkillCheck see a
        // typed error.
        if (report.error) {
          throw (
            result.error ??
            new SkillRunnerError(report.error.message, {
              code: report.error.code,
              hunkFailures: report.hunkFailures,
            })
          );
        }

        console.log(`Found ${report.findings.length} findings`);

        // Update skill check with results
        if (skillCheck && context.pullRequest) {
          try {
            await skillCheck.complete(report, {
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
          triggerId: trigger.id,
          skillExecutionId: trigger.skillExecutionId,
          triggerName: trigger.name,
          skillName: trigger.skill,
          report,
          renderResult,
          failOn,
          reportOn,
          minConfidence,
          reportOnSuccess: trigger.reportOnSuccess,
          requestChanges,
          failCheck,
          checkRunUrl: skillCheckUrl,
          checkRunId: skillCheckRunId,
          maxFindings,
          auxiliaryModel: trigger.auxiliaryModel,
          synthesisModel: trigger.synthesisModel,
          findingProcessingEvents,
        };
      } catch (error) {
        if (error instanceof ActionFailedError) throw error;
        captureActionTriggerError(error, {
          triggerName: trigger.name,
          skillName: trigger.skill,
        });

        // Mark skill check as failed
        if (skillCheck && context.pullRequest) {
          try {
            await skillCheck.fail(error);
          } catch (checkError) {
            console.error(`::warning::Failed to mark skill check as failed: ${checkError}`);
          }
        }

        console.error(`::warning::Trigger ${trigger.name} failed: ${error}`);
        logGroupEnd();
        return {
          triggerId: trigger.id,
          skillExecutionId: trigger.skillExecutionId,
          triggerName: trigger.name,
          skillName: trigger.skill,
          error,
        };
      }
    },
  );
}
