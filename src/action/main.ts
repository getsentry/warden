import { readFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Octokit } from '@octokit/rest';
import { loadWardenConfig, resolveTrigger, type ResolvedTrigger } from '../config/loader.js';
import type { ScheduleConfig } from '../config/schema.js';
import { buildEventContext } from '../event/context.js';
import { buildScheduleEventContext } from '../event/schedule-context.js';
import { runSkill } from '../sdk/runner.js';
import { renderSkillReport } from '../output/renderer.js';
import { createOrUpdateIssue, createFixPR } from '../output/github-issues.js';
import {
  createCoreCheck,
  updateCoreCheck,
  createSkillCheck,
  updateSkillCheck,
  failSkillCheck,
  determineConclusion,
  aggregateSeverityCounts,
} from '../output/github-checks.js';
import { matchTrigger, shouldFail, countFindingsAtOrAbove, countSeverity } from '../triggers/matcher.js';
import { resolveSkillAsync } from '../skills/loader.js';
import type { EventContext, SkillReport } from '../types/index.js';
import type { RenderResult } from '../output/types.js';
import { processInBatches, DEFAULT_CONCURRENCY } from '../utils/index.js';

interface ActionInputs {
  anthropicApiKey: string;
  githubToken: string;
  configPath: string;
  failOn?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  maxFindings: number;
  /** Max concurrent trigger executions */
  parallel: number;
}

function getInputs(): ActionInputs {
  const getInput = (name: string, required = false): string => {
    // Check both hyphenated (native GitHub Actions) and underscored (composite action) formats
    const hyphenEnv = `INPUT_${name.toUpperCase()}`;
    const underscoreEnv = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
    const value = process.env[hyphenEnv] ?? process.env[underscoreEnv] ?? '';
    if (required && !value) {
      throw new Error(`Input required and not supplied: ${name}`);
    }
    return value;
  };

  // Check for API key: input first, then env vars as fallback
  const anthropicApiKey =
    getInput('anthropic-api-key') ||
    process.env['WARDEN_ANTHROPIC_API_KEY'] ||
    process.env['ANTHROPIC_API_KEY'] ||
    '';

  if (!anthropicApiKey) {
    throw new Error(
      'Anthropic API key not found. Provide it via the anthropic-api-key input or set WARDEN_ANTHROPIC_API_KEY environment variable.'
    );
  }

  const failOnInput = getInput('fail-on');
  const validFailOn = ['critical', 'high', 'medium', 'low', 'info'] as const;
  const failOn = validFailOn.includes(failOnInput as typeof validFailOn[number])
    ? (failOnInput as typeof validFailOn[number])
    : undefined;

  return {
    anthropicApiKey,
    githubToken: getInput('github-token') || process.env['GITHUB_TOKEN'] || '',
    configPath: getInput('config-path') || 'warden.toml',
    failOn,
    maxFindings: parseInt(getInput('max-findings') || '50', 10),
    parallel: parseInt(getInput('parallel') || String(DEFAULT_CONCURRENCY), 10),
  };
}

function setOutput(name: string, value: string | number): void {
  const outputFile = process.env['GITHUB_OUTPUT'];
  if (outputFile) {
    appendFileSync(outputFile, `${name}=${value}\n`);
  }
}

function setFailed(message: string): never {
  console.error(`::error::${message}`);
  process.exit(1);
}

function logGroup(name: string): void {
  console.log(`::group::${name}`);
}

function logGroupEnd(): void {
  console.log('::endgroup::');
}

async function postReviewToGitHub(
  octokit: Octokit,
  context: EventContext,
  result: RenderResult
): Promise<void> {
  if (!context.pullRequest) {
    return;
  }

  const { owner, name: repo } = context.repository;
  const pullNumber = context.pullRequest.number;
  const commitId = context.pullRequest.headSha;

  if (result.review) {
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
  } else {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body: result.summaryComment,
    });
  }

  for (const label of result.labels) {
    if (label.action === 'add') {
      await octokit.issues.addLabels({
        owner,
        repo,
        issue_number: pullNumber,
        labels: [label.name],
      });
    } else {
      try {
        await octokit.issues.removeLabel({
          owner,
          repo,
          issue_number: pullNumber,
          name: label.name,
        });
      } catch {
        // Label may not exist, ignore
      }
    }
  }
}

/**
 * Get the default branch for a repository from the GitHub API.
 */
async function getDefaultBranchFromAPI(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<string> {
  const { data } = await octokit.repos.get({ owner, repo });
  return data.default_branch;
}

/**
 * Handle scheduled analysis events.
 */
async function runScheduledAnalysis(
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
  const scheduleTriggers = config.triggers.filter((t) => t.event === 'schedule');
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
  let shouldFailAction = false;

  // Process each schedule trigger
  for (const trigger of scheduleTriggers) {
    const resolved = resolveTrigger(trigger, config);
    logGroup(`Running trigger: ${trigger.name} (skill: ${resolved.skill})`);

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
        console.log(`No files match trigger ${trigger.name}`);
        logGroupEnd();
        continue;
      }

      console.log(`Found ${context.pullRequest.files.length} files matching patterns`);

      // Run skill
      const skill = await resolveSkillAsync(resolved.skill, repoPath, config.skills);
      const report = await runSkill(skill, context, {
        apiKey: inputs.anthropicApiKey,
        model: resolved.model,
      });
      console.log(`Found ${report.findings.length} findings`);

      allReports.push(report);
      totalFindings += report.findings.length;

      // Create/update issue with findings
      const scheduleConfig: Partial<ScheduleConfig> = trigger.schedule ?? {};
      const issueTitle = scheduleConfig.issueTitle ?? `Warden: ${trigger.name}`;

      const issueResult = await createOrUpdateIssue(octokit, owner, repo, [report], {
        title: issueTitle,
        labels: resolved.output?.labels,
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
          triggerName: trigger.name,
        });

        if (fixResult) {
          console.log(`Created fix PR #${fixResult.prNumber} with ${fixResult.fixCount} fixes`);
          console.log(`PR URL: ${fixResult.prUrl}`);
        }
      }

      // Check failure condition
      const failOn = resolved.output?.failOn ?? inputs.failOn;
      if (failOn && shouldFail(report, failOn)) {
        shouldFailAction = true;
        const count = countFindingsAtOrAbove(report, failOn);
        failureReasons.push(`${trigger.name}: Found ${count} ${failOn}+ severity issues`);
      }

      logGroupEnd();
    } catch (error) {
      console.error(`::warning::Trigger ${trigger.name} failed: ${error}`);
      logGroupEnd();
    }
  }

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

async function run(): Promise<void> {
  const inputs = getInputs();

  if (!inputs.githubToken) {
    setFailed('GitHub token is required');
  }

  const eventName = process.env['GITHUB_EVENT_NAME'];
  const eventPath = process.env['GITHUB_EVENT_PATH'];
  const repoPath = process.env['GITHUB_WORKSPACE'];

  if (!eventName || !eventPath || !repoPath) {
    setFailed('This action must be run in a GitHub Actions environment');
  }

  // Set both env vars so code using either will work
  process.env['WARDEN_ANTHROPIC_API_KEY'] = inputs.anthropicApiKey;
  process.env['ANTHROPIC_API_KEY'] = inputs.anthropicApiKey;

  const octokit = new Octokit({ auth: inputs.githubToken });

  // Route schedule events to dedicated handler
  if (eventName === 'schedule' || eventName === 'workflow_dispatch') {
    return runScheduledAnalysis(octokit, inputs, repoPath);
  }

  let eventPayload: unknown;
  try {
    eventPayload = JSON.parse(readFileSync(eventPath, 'utf-8'));
  } catch (error) {
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
    setFailed(`Failed to build event context: ${error}`);
  }

  logGroup('Loading configuration');
  console.log(`Config path: ${inputs.configPath}`);
  logGroupEnd();

  const configFullPath = join(repoPath, inputs.configPath);
  const config = loadWardenConfig(dirname(configFullPath));

  // Resolve triggers with defaults and match
  const resolvedTriggers = config.triggers.map((t) => resolveTrigger(t, config));
  const matchedTriggers = resolvedTriggers.filter((t) => matchTrigger(t, context));

  if (matchedTriggers.length === 0) {
    console.log('No triggers matched for this event');
    setOutput('findings-count', 0);
    setOutput('critical-count', 0);
    setOutput('high-count', 0);
    setOutput('summary', 'No triggers matched');
    return;
  }

  logGroup('Matched triggers');
  for (const trigger of matchedTriggers) {
    console.log(`- ${trigger.name}: ${trigger.skill}`);
  }
  logGroupEnd();

  // Create core warden check (only for PRs)
  let coreCheckId: number | undefined;
  if (context.pullRequest) {
    try {
      const coreCheck = await createCoreCheck(octokit, {
        owner: context.repository.owner,
        repo: context.repository.name,
        headSha: context.pullRequest.headSha,
      });
      coreCheckId = coreCheck.checkRunId;
      console.log(`Created core check: ${coreCheck.url}`);
    } catch (error) {
      console.error(`::warning::Failed to create core check: ${error}`);
    }
  }

  // Run triggers in parallel
  const concurrency = config.runner?.concurrency ?? inputs.parallel;
  const failureReasons: string[] = [];

  interface TriggerResult {
    triggerName: string;
    report?: SkillReport;
    renderResult?: RenderResult;
    failOn?: typeof inputs.failOn;
    error?: unknown;
  }

  const runSingleTrigger = async (trigger: ResolvedTrigger): Promise<TriggerResult> => {
    logGroup(`Running trigger: ${trigger.name} (skill: ${trigger.skill})`);

    // Create skill check (only for PRs)
    let skillCheckId: number | undefined;
    if (context.pullRequest) {
      try {
        const skillCheck = await createSkillCheck(octokit, trigger.skill, {
          owner: context.repository.owner,
          repo: context.repository.name,
          headSha: context.pullRequest.headSha,
        });
        skillCheckId = skillCheck.checkRunId;
      } catch (error) {
        console.error(`::warning::Failed to create skill check for ${trigger.skill}: ${error}`);
      }
    }

    const failOn = trigger.output.failOn ?? inputs.failOn;
    const commentOn = trigger.output.commentOn;

    try {
      const skill = await resolveSkillAsync(trigger.skill, repoPath, config.skills);
      const report = await runSkill(skill, context, { apiKey: inputs.anthropicApiKey, model: trigger.model });
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

      const renderResult = renderSkillReport(report, {
        maxFindings: trigger.output.maxFindings ?? inputs.maxFindings,
        extraLabels: trigger.output.labels ?? [],
        commentOn,
      });

      logGroupEnd();
      return {
        triggerName: trigger.name,
        report,
        renderResult,
        failOn,
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
  };

  const results = await processInBatches(matchedTriggers, runSingleTrigger, concurrency);

  // Post reviews to GitHub (sequentially to avoid rate limits)
  const reports: SkillReport[] = [];
  let shouldFailAction = false;

  for (const result of results) {
    if (result.report) {
      reports.push(result.report);

      // Post review to GitHub
      if (result.renderResult) {
        try {
          await postReviewToGitHub(octokit, context, result.renderResult);
        } catch (error) {
          console.error(`::warning::Failed to post review for ${result.triggerName}: ${error}`);
        }
      }

      // Check if we should fail based on this trigger's config
      if (result.failOn && shouldFail(result.report, result.failOn)) {
        shouldFailAction = true;
        const count = countFindingsAtOrAbove(result.report, result.failOn);
        failureReasons.push(`${result.triggerName}: Found ${count} ${result.failOn}+ severity issues`);
      }
    }
  }

  const totalFindings = reports.reduce((sum, r) => sum + r.findings.length, 0);
  const criticalCount = countSeverity(reports, 'critical');
  const highCount = countSeverity(reports, 'high');

  setOutput('findings-count', totalFindings);
  setOutput('critical-count', criticalCount);
  setOutput('high-count', highCount);
  setOutput('summary', reports.map((r) => r.summary).join('\n'));

  // Update core check with overall summary
  if (coreCheckId && context.pullRequest) {
    try {
      const summaryData = {
        totalSkills: matchedTriggers.length,
        totalFindings,
        findingsBySeverity: aggregateSeverityCounts(reports),
        skillResults: results.map((r) => ({
          name: r.triggerName,
          findingCount: r.report?.findings.length ?? 0,
          conclusion: r.report
            ? determineConclusion(r.report.findings, r.failOn)
            : ('failure' as const),
        })),
      };

      let coreConclusion: 'success' | 'failure' | 'neutral';
      if (shouldFailAction) {
        coreConclusion = 'failure';
      } else if (totalFindings > 0) {
        coreConclusion = 'neutral';
      } else {
        coreConclusion = 'success';
      }

      await updateCoreCheck(octokit, coreCheckId, summaryData, coreConclusion, {
        owner: context.repository.owner,
        repo: context.repository.name,
      });
    } catch (error) {
      console.error(`::warning::Failed to update core check: ${error}`);
    }
  }

  if (shouldFailAction) {
    setFailed(failureReasons.join('; '));
  }

  console.log(`\nAnalysis complete: ${totalFindings} total findings`);
}

run().catch((error) => {
  setFailed(`Unexpected error: ${error}`);
});
