import { readFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Octokit } from '@octokit/rest';
import { loadWardenConfig, resolveTrigger, type ResolvedTrigger } from '../config/loader.js';
import { buildEventContext } from '../event/context.js';
import { runSkill } from '../sdk/runner.js';
import { renderSkillReport } from '../output/renderer.js';
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
    const envName = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
    const value = process.env[envName] ?? '';
    if (required && !value) {
      throw new Error(`Input required and not supplied: ${name}`);
    }
    return value;
  };

  const failOnInput = getInput('fail-on');
  const validFailOn = ['critical', 'high', 'medium', 'low', 'info'] as const;
  const failOn = validFailOn.includes(failOnInput as typeof validFailOn[number])
    ? (failOnInput as typeof validFailOn[number])
    : undefined;

  return {
    anthropicApiKey: getInput('anthropic-api-key', true),
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
  console.log(`::set-output name=${name}::${value}`);
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

  process.env['ANTHROPIC_API_KEY'] = inputs.anthropicApiKey;

  const octokit = new Octokit({ auth: inputs.githubToken });

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
    try {
      const skill = await resolveSkillAsync(trigger.skill, repoPath, config.skills);
      const report = await runSkill(skill, context, { apiKey: inputs.anthropicApiKey, model: trigger.model });
      console.log(`Found ${report.findings.length} findings`);

      const renderResult = renderSkillReport(report, {
        maxFindings: trigger.output.maxFindings ?? inputs.maxFindings,
        extraLabels: trigger.output.labels ?? [],
      });

      logGroupEnd();
      return {
        triggerName: trigger.name,
        report,
        renderResult,
        failOn: trigger.output.failOn ?? inputs.failOn,
      };
    } catch (error) {
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

  if (shouldFailAction) {
    setFailed(failureReasons.join('; '));
  }

  console.log(`\nAnalysis complete: ${totalFindings} total findings`);
}

run().catch((error) => {
  setFailed(`Unexpected error: ${error}`);
});
