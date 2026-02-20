/**
 * Schedule Workflow
 *
 * Handles schedule and workflow_dispatch events.
 */

import { dirname, join } from 'node:path';
import type { Octokit } from '@octokit/rest';
import { loadWardenConfig, resolveSkillConfigs } from '../../config/loader.js';
import type { ScheduleConfig } from '../../config/schema.js';
import { buildScheduleEventContext } from '../../event/schedule-context.js';
import { runSkill } from '../../sdk/runner.js';
import { createOrUpdateIssue, createFixPR } from '../../output/github-issues.js';
import { shouldFail, countFindingsAtOrAbove, countSeverity } from '../../triggers/matcher.js';
import { resolveSkillAsync } from '../../skills/loader.js';
import { filterFindings } from '../../types/index.js';
import type { SkillReport } from '../../types/index.js';
import type { ActionInputs } from '../inputs.js';
import {
  setOutput,
  setFailed,
  ActionFailedError,
  logGroup,
  logGroupEnd,
  findClaudeCodeExecutable,
  handleTriggerErrors,
  getDefaultBranchFromAPI,
} from './base.js';

// -----------------------------------------------------------------------------
// Main Schedule Workflow
// -----------------------------------------------------------------------------

export async function runScheduleWorkflow(
  octokit: Octokit,
  inputs: ActionInputs,
  repoPath: string
): Promise<void> {
  logGroup('Loading configuration');
  console.log(`Config path: ${inputs.configPath}`);
  logGroupEnd();

  const configFullPath = join(repoPath, inputs.configPath);
  const config = loadWardenConfig(dirname(configFullPath));

  // Find schedule triggers
  const scheduleTriggers = resolveSkillConfigs(config).filter((t) => t.type === 'schedule');
  if (scheduleTriggers.length === 0) {
    console.log('No schedule triggers configured');
    setOutput('findings-count', 0);
    setOutput('critical-count', 0);
    setOutput('high-count', 0);
    setOutput('summary', 'No schedule triggers configured');
    return;
  }

  // Get repo info from environment
  const githubRepository = process.env['GITHUB_REPOSITORY'];
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
      const skill = await resolveSkillAsync(resolved.skill, repoPath, {
        remote: resolved.remote,
      });
      const claudePath = await findClaudeCodeExecutable();
      const report = await runSkill(skill, context, {
        apiKey: inputs.anthropicApiKey,
        model: resolved.model,
        maxTurns: resolved.maxTurns,
        batchDelayMs: config.defaults?.batchDelayMs,
        pathToClaudeCodeExecutable: claudePath,
        session: { enabled: false },
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      triggerErrors.push(`${resolved.name}: ${errorMessage}`);
      console.error(`::warning::Trigger ${resolved.name} failed: ${error}`);
      logGroupEnd();
    }
  }

  handleTriggerErrors(triggerErrors, scheduleTriggers.length);

  // Set outputs
  const criticalCount = countSeverity(allReports, 'critical');
  const highCount = countSeverity(allReports, 'high');

  setOutput('findings-count', totalFindings);
  setOutput('critical-count', criticalCount);
  setOutput('high-count', highCount);
  setOutput('summary', allReports.map((r) => r.summary).join('\n') || 'Scheduled analysis complete');

  if (shouldFailAction) {
    setFailed(failureReasons.join('; '));
  }

  console.log(`\nScheduled analysis complete: ${totalFindings} total findings`);
}
