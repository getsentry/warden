/**
 * Schedule Workflow
 *
 * Handles schedule and workflow_dispatch events.
 */

import type { Octokit } from '@octokit/rest';
import {
  buildSkillRootsByName,
  loadLayeredWardenConfig,
  resolveLayeredSkillConfigs,
  ConfigLoadError,
} from '../../config/loader.js';
import type { LayeredSkillRootsByName, ResolvedTrigger } from '../../config/loader.js';
import type { ScheduleConfig } from '../../config/schema.js';
import { buildScheduleEventContext } from '../../event/schedule-context.js';
import { runSkill } from '../../sdk/runner.js';
import { assertValidPiModelSelectors } from '../../sdk/runtimes/model-selectors.js';
import { configureWardenOffline, isWardenOffline } from '../../sdk/offline.js';
import { createOrUpdateIssue } from '../../output/github-issues.js';
import { shouldFail, countFindingsAtOrAbove, countSeverity } from '../../triggers/matcher.js';
import { resolveSkillAsync } from '../../skills/loader.js';
import { filterFindings } from '../../types/index.js';
import type { EventContext, SkillReport } from '../../types/index.js';
import type { FindingProcessingEvent } from '../../sdk/types.js';
import { Sentry, logger, setRepositoryScope, emitRunMetric } from '../../sentry.js';
import type { ActionInputs } from '../inputs.js';
import { buildBaseOutputOptions } from '../reporting/output.js';
import type { SkillExecutionMeta } from '../reporting/output.js';
import {
  setOutput,
  setFailed,
  ActionFailedError,
  clearStaleFindingsOutput,
  FINDINGS_OUTPUT_DONE_FILENAME,
  FINDINGS_OUTPUT_FILENAME,
  logGroup,
  logGroupEnd,
  prepareRuntimeEnvironment,
  handleTriggerErrors,
  getDefaultBranchFromAPI,
  writeFindingsOutput,
  writeFindingsOutputLive,
} from './base.js';
import { captureActionTriggerError } from '../error-reporting.js';

interface SkippedScheduleTrigger {
  skillName: string;
  triggerId?: string;
  triggerName?: string;
  reason: 'no_changes' | 'pending' | 'error';
}

// -----------------------------------------------------------------------------
// Main Schedule Workflow
// -----------------------------------------------------------------------------

interface WorkflowSpan {
  setAttribute(key: string, value: string | number | boolean): void;
  spanContext?: () => { traceId: string };
}

export async function runScheduleWorkflow(
  octokit: Octokit,
  inputs: ActionInputs,
  repoPath: string
): Promise<void> {
  return Sentry.startSpan(
    { op: 'workflow.run', name: 'review schedule' },
    (span) => runScheduleWorkflowInner(octokit, inputs, repoPath, span),
  );
}

async function runScheduleWorkflowInner(
  octokit: Octokit,
  inputs: ActionInputs,
  repoPath: string,
  workflowSpan: WorkflowSpan
): Promise<void> {
  const githubRepository = process.env['GITHUB_REPOSITORY'];
  setRepositoryScope(githubRepository);
  clearStaleFindingsOutput(repoPath);

  logGroup('Loading configuration');
  if (inputs.baseConfigPath) {
    console.log(`Base config path: ${inputs.baseConfigPath}`);
  }
  if (inputs.baseSkillRoot) {
    console.log(`Base skill root: ${inputs.baseSkillRoot}`);
  }
  console.log(`Repo config path: ${inputs.configPath}`);
  logGroupEnd();

  let scheduleTriggers: ResolvedTrigger[];
  let skillRootsByName: LayeredSkillRootsByName | undefined;
  try {
    const layered = loadLayeredWardenConfig(repoPath, {
      baseConfigPath: inputs.baseConfigPath,
      configPath: inputs.configPath,
      onWarning: (message) => console.log(`::warning::${message}`),
    });
    configureWardenOffline(
      layered.baseConfig?.defaults?.offline === true
      || layered.repoConfig?.defaults?.offline === true
      || layered.config.defaults?.offline === true,
    );
    skillRootsByName = buildSkillRootsByName(repoPath, layered, inputs.baseSkillRoot);
    scheduleTriggers = resolveLayeredSkillConfigs(layered, undefined, skillRootsByName)
      .filter((t) => t.type === 'schedule');
  } catch (error) {
    if (
      error instanceof ConfigLoadError &&
      error.message.includes('not found') &&
      !inputs.baseConfigPath
    ) {
      console.log('::warning::No warden.toml found. Skipping analysis.');
      setOutput('findings-count', 0);
      setOutput('high-count', 0);
      setOutput('summary', 'No warden.toml found');
      try {
        const fullName = process.env['GITHUB_REPOSITORY'] ?? '';
        const [o = '', n = ''] = fullName.split('/');
        workflowSpan.setAttribute('warden.trigger.count', 0);
        workflowSpan.setAttribute('warden.finding.count', 0);
        writeFindingsOutput([], {
          eventType: 'schedule',
          action: 'scheduled',
          repository: { owner: o, name: n, fullName, defaultBranch: '' },
          repoPath,
        }, [], buildBaseOutputOptions(inputs, []));
      } catch (writeError) {
        console.error(`::warning::Failed to write findings output: ${writeError}`);
      }
      return;
    }
    throw error;
  }

  workflowSpan.setAttribute('warden.trigger.count', scheduleTriggers.length);
  emitRunMetric();
  const traceId = workflowSpan.spanContext?.().traceId;
  logger.info('Workflow initialized', {
    'warden.trigger.count': scheduleTriggers.length,
    ...(traceId ? { 'trace.id': traceId } : {}),
  });

  if (scheduleTriggers.length === 0) {
    console.log('No schedule triggers configured');
    setOutput('findings-count', 0);
    setOutput('high-count', 0);
    setOutput('summary', 'No schedule triggers configured');
    workflowSpan.setAttribute('warden.finding.count', 0);
    try {
      const fullName = process.env['GITHUB_REPOSITORY'] ?? '';
      const [o = '', n = ''] = fullName.split('/');
      writeFindingsOutput([], {
        eventType: 'schedule',
        action: 'scheduled',
        repository: { owner: o, name: n, fullName, defaultBranch: '' },
        repoPath,
      }, [], buildBaseOutputOptions(inputs, []));
    } catch (writeError) {
      console.error(`::warning::Failed to write findings output: ${writeError}`);
    }
    return;
  }

  // Get repo info from environment
  if (!githubRepository) {
    setFailed('GITHUB_REPOSITORY environment variable not set');
  }
  const [owner, repo] = githubRepository.split('/');
  if (!owner || !repo) {
    setFailed('Invalid GITHUB_REPOSITORY format');
  }

  const headSha = process.env['GITHUB_SHA'] ?? '';
  if (!headSha) {
    setFailed('GITHUB_SHA environment variable not set');
  }

  const defaultBranch = await getDefaultBranchFromAPI(octokit, owner, repo);

  logGroup('Processing schedule triggers');
  for (const trigger of scheduleTriggers) {
    console.log(`- ${trigger.name}: ${trigger.skill}`);
  }
  logGroupEnd();

  const scheduleContext: EventContext = {
    eventType: 'schedule',
    action: 'scheduled',
    repository: { owner, name: repo, fullName: `${owner}/${repo}`, defaultBranch },
    repoPath,
  };

  const allReports: SkillReport[] = [];
  const skillExecutions: SkillExecutionMeta[] = [];
  const skippedTriggers: SkippedScheduleTrigger[] = [];
  let totalFindings = 0;
  const failureReasons: string[] = [];
  const triggerErrors: string[] = [];
  let shouldFailAction = false;

  const writeLiveSnapshot = (processedCount: number): void => {
    const pending: SkippedScheduleTrigger[] = scheduleTriggers.slice(processedCount + 1).map((t) => ({
      skillName: t.skill,
      triggerId: t.id,
      triggerName: t.name,
      reason: 'pending',
    }));
    writeFindingsOutputLive([...allReports], scheduleContext, [], {
      ...buildBaseOutputOptions(inputs, [...skippedTriggers, ...pending]),
      skillExecutions: [...skillExecutions],
    });
  };

  // Process each schedule trigger
  for (const [triggerIndex, resolved] of scheduleTriggers.entries()) {
    logGroup(`Running trigger: ${resolved.name} (skill: ${resolved.skill})`);
    const findingProcessingEvents: FindingProcessingEvent[] = [];
    let executionRecorded = false;

    try {
      assertValidPiModelSelectors([resolved]);

      // Build context from paths filter
      const patterns = resolved.filters?.paths ?? ['**/*'];
      const ignorePatterns = [
        ...(resolved.filters?.ignorePaths ?? []),
        FINDINGS_OUTPUT_FILENAME,
        FINDINGS_OUTPUT_DONE_FILENAME,
      ];

      const context = await buildScheduleEventContext({
        patterns,
        ignorePatterns,
        ignore: resolved.ignore,
        scan: resolved.scan,
        repoPath,
        owner,
        name: repo,
        defaultBranch,
        headSha,
      });

      // Skip if no matching files
      if (!context.pullRequest?.files.length) {
        console.log(`No files match trigger ${resolved.name}`);
        skippedTriggers.push({ skillName: resolved.skill, triggerId: resolved.id, triggerName: resolved.name, reason: 'no_changes' });
        logGroupEnd();
        writeLiveSnapshot(triggerIndex);
        continue;
      }

      console.log(`Found ${context.pullRequest.files.length} files matching patterns`);

      // Run skill
      const skillRoot = resolved.useBuiltinSkill ? undefined : (resolved.skillRoot ?? repoPath);
      const skill = await resolveSkillAsync(resolved.skill, skillRoot, {
        remote: resolved.remote,
        // Warden-wide offline gates remote skills. PI_OFFLINE remains catalog-only.
        offline: isWardenOffline(),
      });
      const runtimeEnv = await prepareRuntimeEnvironment([resolved], inputs);
      const report = await runSkill(skill, context, {
        apiKey: inputs.anthropicApiKey,
        model: resolved.model,
        runtime: resolved.runtime,
        effort: resolved.effort,
        auxiliaryModel: resolved.auxiliaryModel,
        auxiliaryEffort: resolved.auxiliaryEffort,
        synthesisModel: resolved.synthesisModel,
        maxTurns: resolved.maxTurns,
        batchDelayMs: resolved.batchDelayMs,
        maxContextFiles: resolved.maxContextFiles,
        ignore: resolved.ignore,
        scan: resolved.scan,
        chunking: resolved.chunking,
        auxiliaryMaxRetries: resolved.auxiliaryMaxRetries,
        verifyFindings: resolved.verifyFindings,
        triggerName: resolved.name,
        pathToClaudeCodeExecutable: runtimeEnv.pathToClaudeCodeExecutable,
        callbacks: {
          onFindingProcessing: (event) => findingProcessingEvents.push(event),
        },
      });
      console.log(`Found ${report.findings.length} findings`);

      allReports.push(report);
      totalFindings += report.findings.length;

      // Pushed before the fallible issue write below: if createOrUpdateIssue
      // throws, allReports (and thus the final export) already has this
      // report, so its execution metadata (join key, model lanes, captured
      // provenance events) must already be recorded too, not lost with it.
      const executionMeta: (typeof skillExecutions)[number] = {
        report,
        skillExecutionId: resolved.skillExecutionId,
        triggerId: resolved.id,
        triggerName: resolved.name,
        auxiliaryModel: resolved.auxiliaryModel,
        synthesisModel: resolved.synthesisModel,
        findingProcessingEvents,
      };
      skillExecutions.push(executionMeta);
      executionRecorded = true;

      // Create/update issue with findings
      const scheduleConfig: Partial<ScheduleConfig> = resolved.schedule ?? {};
      const issueTitle = scheduleConfig.issueTitle ?? `Warden: ${resolved.name}`;

      const issueResult = await createOrUpdateIssue(octokit, owner, repo, [report], {
        title: issueTitle,
        commitSha: headSha,
      });

      if (issueResult) {
        console.log(`${issueResult.created ? 'Created' : 'Updated'} issue #${issueResult.issueNumber}`);
        console.log(`Issue URL: ${issueResult.issueUrl}`);
        executionMeta.issueNumber = issueResult.issueNumber;
        executionMeta.issueUrl = issueResult.issueUrl;
      }

      // Check failure condition
      // Filter by confidence first so low-confidence findings don't cause failure
      const failOn = resolved.failOn ?? inputs.failOn;
      const failCheck = resolved.failCheck ?? inputs.failCheck ?? false;
      const reportForFail = { ...report, findings: filterFindings(report.findings, undefined, resolved.minConfidence ?? 'medium') };
      if (failCheck && failOn && shouldFail(reportForFail, failOn)) {
        shouldFailAction = true;
        const count = countFindingsAtOrAbove(reportForFail, failOn);
        failureReasons.push(`${resolved.name}: Found ${count} ${failOn}+ severity issues`);
      }

      logGroupEnd();
      writeLiveSnapshot(triggerIndex);
    } catch (error) {
      if (error instanceof ActionFailedError) throw error;
      captureActionTriggerError(error, {
        triggerName: resolved.name,
        skillName: resolved.skill,
      });
      const errorMessage = error instanceof Error ? error.message : String(error);
      triggerErrors.push(`${resolved.name}: ${errorMessage}`);
      if (!executionRecorded) {
        skippedTriggers.push({ skillName: resolved.skill, triggerId: resolved.id, triggerName: resolved.name, reason: 'error' });
      }
      console.error(`::warning::Trigger ${resolved.name} failed: ${error}`);
      logGroupEnd();
      writeLiveSnapshot(triggerIndex);
    }
  }

  // Set outputs
  const highCount = countSeverity(allReports, 'high');
  workflowSpan.setAttribute('warden.finding.count', totalFindings);

  setOutput('findings-count', totalFindings);
  setOutput('high-count', highCount);
  setOutput('summary', allReports.map((r) => r.summary).join('\n') || 'Scheduled analysis complete');

  // Write structured findings to file for external export (GCS, S3, etc.)
  // before any all-failed/shouldFail error can propagate — this is the run's
  // one true final write (`.done` marker + `findings-file` output), and it
  // must land even when every trigger failed, or a terminated run is left
  // looking permanently in-progress to a follower of the live snapshots.
  try {
    const findingsPath = writeFindingsOutput(allReports, scheduleContext, [], {
      ...buildBaseOutputOptions(inputs, skippedTriggers),
      skillExecutions,
    });
    console.log(`Findings written to ${findingsPath}`);
  } catch (error) {
    console.error(`::warning::Failed to write findings output: ${error}`);
  }

  handleTriggerErrors(triggerErrors, scheduleTriggers.length);

  if (shouldFailAction) {
    setFailed(failureReasons.join('; '));
  }

  console.log(`\nScheduled analysis complete: ${totalFindings} total findings`);
}
