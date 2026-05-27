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
import { createOrUpdateIssue, createFixPR } from '../../output/github-issues.js';
import { shouldFail, countFindingsAtOrAbove, countSeverity } from '../../triggers/matcher.js';
import { resolveSkillAsync } from '../../skills/loader.js';
import { filterFindings } from '../../types/index.js';
import type { SkillReport } from '../../types/index.js';
import { Sentry, logger, setRepositoryScope, emitRunMetric } from '../../sentry.js';
import type { ActionInputs } from '../inputs.js';
import {
  setOutput,
  setFailed,
  ActionFailedError,
  logGroup,
  logGroupEnd,
  prepareRuntimeEnvironment,
  handleTriggerErrors,
  getDefaultBranchFromAPI,
  writeFindingsOutput,
} from './base.js';
import { captureActionTriggerError } from '../error-reporting.js';

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
        });
      } catch { /* non-fatal */ }
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
      });
    } catch { /* non-fatal */ }
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

  const allReports: SkillReport[] = [];
  let totalFindings = 0;
  const failureReasons: string[] = [];
  const triggerErrors: string[] = [];
  let shouldFailAction = false;

  // Process each schedule trigger
  for (const resolved of scheduleTriggers) {
    logGroup(`Running trigger: ${resolved.name} (skill: ${resolved.skill})`);

    try {
      assertValidPiModelSelectors([resolved]);

      // Build context from paths filter
      const patterns = resolved.filters?.paths ?? ['**/*'];
      const ignorePatterns = resolved.filters?.ignorePaths;

      const context = await buildScheduleEventContext({
        patterns,
        ignorePatterns,
        repoPath,
        owner,
        name: repo,
        defaultBranch,
        headSha,
      });

      // Skip if no matching files
      if (!context.pullRequest?.files.length) {
        console.log(`No files match trigger ${resolved.name}`);
        logGroupEnd();
        continue;
      }

      console.log(`Found ${context.pullRequest.files.length} files matching patterns`);

      // Run skill
      const skillRoot = resolved.useBuiltinSkill ? undefined : (resolved.skillRoot ?? repoPath);
      const skill = await resolveSkillAsync(resolved.skill, skillRoot, {
        remote: resolved.remote,
      });
      const runtimeEnv = await prepareRuntimeEnvironment([resolved], inputs);
      const report = await runSkill(skill, context, {
        apiKey: inputs.anthropicApiKey,
        model: resolved.model,
        runtime: resolved.runtime,
        auxiliaryModel: resolved.auxiliaryModel,
        synthesisModel: resolved.synthesisModel,
        maxTurns: resolved.maxTurns,
        batchDelayMs: resolved.batchDelayMs,
        maxContextFiles: resolved.maxContextFiles,
        auxiliaryMaxRetries: resolved.auxiliaryMaxRetries,
        verifyFindings: resolved.verifyFindings,
        telemetryTriggerName: resolved.name,
        pathToClaudeCodeExecutable: runtimeEnv.pathToClaudeCodeExecutable,
      });
      console.log(`Found ${report.findings.length} findings`);

      allReports.push(report);
      totalFindings += report.findings.length;

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
      }

      // Create fix PR if enabled and there are fixable findings
      if (scheduleConfig.createFixPR) {
        const fixResult = await createFixPR(octokit, owner, repo, report.findings, {
          branchPrefix: scheduleConfig.fixBranchPrefix ?? 'warden-fix',
          baseBranch: defaultBranch,
          baseSha: headSha,
          repoPath,
          triggerName: resolved.name,
        });

        if (fixResult) {
          console.log(`Created fix PR #${fixResult.prNumber} with ${fixResult.fixCount} fixes`);
          console.log(`PR URL: ${fixResult.prUrl}`);
        }
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
    } catch (error) {
      if (error instanceof ActionFailedError) throw error;
      captureActionTriggerError(error, {
        triggerName: resolved.name,
        skillName: resolved.skill,
      });
      const errorMessage = error instanceof Error ? error.message : String(error);
      triggerErrors.push(`${resolved.name}: ${errorMessage}`);
      console.error(`::warning::Trigger ${resolved.name} failed: ${error}`);
      logGroupEnd();
    }
  }

  handleTriggerErrors(triggerErrors, scheduleTriggers.length);

  // Set outputs
  const highCount = countSeverity(allReports, 'high');
  workflowSpan.setAttribute('warden.finding.count', totalFindings);

  setOutput('findings-count', totalFindings);
  setOutput('high-count', highCount);
  setOutput('summary', allReports.map((r) => r.summary).join('\n') || 'Scheduled analysis complete');

  // Write structured findings to file for external export (GCS, S3, etc.)
  try {
    const findingsPath = writeFindingsOutput(allReports, {
      eventType: 'schedule',
      action: 'scheduled',
      repository: { owner, name: repo, fullName: `${owner}/${repo}`, defaultBranch },
      repoPath,
    });
    console.log(`Findings written to ${findingsPath}`);
  } catch (error) {
    console.error(`::warning::Failed to write findings output: ${error}`);
  }

  if (shouldFailAction) {
    setFailed(failureReasons.join('; '));
  }

  console.log(`\nScheduled analysis complete: ${totalFindings} total findings`);
}
