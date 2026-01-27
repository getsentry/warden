import { readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { Octokit } from '@octokit/rest';
import { loadWardenConfig, resolveSkill } from '../config/loader.js';
import { buildEventContext } from '../event/context.js';
import { runSkill } from '../sdk/runner.js';
import { renderSkillReport } from '../output/renderer.js';
import type { Trigger } from '../config/schema.js';
import type { EventContext, SkillReport, Severity } from '../types/index.js';
import type { RenderResult } from '../output/types.js';

interface ActionInputs {
  anthropicApiKey: string;
  githubToken: string;
  configPath: string;
  failOnFindings: boolean;
  maxFindings: number;
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

  return {
    anthropicApiKey: getInput('anthropic-api-key', true),
    githubToken: getInput('github-token') || process.env['GITHUB_TOKEN'] || '',
    configPath: getInput('config-path') || 'warden.toml',
    failOnFindings: getInput('fail-on-findings') !== 'false',
    maxFindings: parseInt(getInput('max-findings') || '50', 10),
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

function matchTrigger(trigger: Trigger, context: EventContext): boolean {
  if (trigger.event !== context.eventType) {
    return false;
  }

  if (!trigger.actions.includes(context.action)) {
    return false;
  }

  if (trigger.filters?.paths && context.pullRequest) {
    const patterns = trigger.filters.paths;
    const files = context.pullRequest.files.map((f) => f.filename);
    const matches = files.some((file) =>
      patterns.some((pattern) => matchGlob(pattern, file))
    );
    if (!matches) {
      return false;
    }
  }

  if (trigger.filters?.ignorePaths && context.pullRequest) {
    const ignorePatterns = trigger.filters.ignorePaths;
    const files = context.pullRequest.files.map((f) => f.filename);
    const allIgnored = files.every((file) =>
      ignorePatterns.some((pattern) => matchGlob(pattern, file))
    );
    if (allIgnored) {
      return false;
    }
  }

  return true;
}

function matchGlob(pattern: string, path: string): boolean {
  const regexPattern = pattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/{{GLOBSTAR}}/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
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

function countSeverity(reports: SkillReport[], severity: Severity): number {
  return reports.reduce(
    (count, report) =>
      count + report.findings.filter((f) => f.severity === severity).length,
    0
  );
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
  const config = loadWardenConfig(configFullPath.replace(/\/warden\.toml$/, ''));

  const matchedTriggers = config.triggers.filter((t) => matchTrigger(t, context));

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
    console.log(`- ${trigger.name}: ${trigger.skills.join(', ')}`);
  }
  logGroupEnd();

  const skillsToRun = [...new Set(matchedTriggers.flatMap((t) => t.skills))];
  const reports: SkillReport[] = [];

  for (const skillName of skillsToRun) {
    logGroup(`Running skill: ${skillName}`);
    try {
      const skill = resolveSkill(skillName, config, repoPath);
      const report = await runSkill(skill, context, { apiKey: inputs.anthropicApiKey });
      reports.push(report);
      console.log(`Found ${report.findings.length} findings`);
    } catch (error) {
      console.error(`::warning::Skill ${skillName} failed: ${error}`);
    }
    logGroupEnd();
  }

  const totalFindings = reports.reduce((sum, r) => sum + r.findings.length, 0);
  const criticalCount = countSeverity(reports, 'critical');
  const highCount = countSeverity(reports, 'high');

  setOutput('findings-count', totalFindings);
  setOutput('critical-count', criticalCount);
  setOutput('high-count', highCount);
  setOutput('summary', reports.map((r) => r.summary).join('\n'));

  for (const report of reports) {
    const renderResult = renderSkillReport(report, {
      maxFindings: inputs.maxFindings || undefined,
    });

    try {
      await postReviewToGitHub(octokit, context, renderResult);
    } catch (error) {
      console.error(`::warning::Failed to post review: ${error}`);
    }
  }

  if (inputs.failOnFindings && (criticalCount > 0 || highCount > 0)) {
    setFailed(
      `Found ${criticalCount} critical and ${highCount} high severity findings`
    );
  }

  console.log(`\nAnalysis complete: ${totalFindings} total findings`);
}

run().catch((error) => {
  setFailed(`Unexpected error: ${error}`);
});
