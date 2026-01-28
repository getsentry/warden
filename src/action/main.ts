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
  failOn?: 'critical' | 'high' | 'medium' | 'low' | 'info';
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

  const filenames = context.pullRequest?.files.map((f) => f.filename);
  const pathPatterns = trigger.filters?.paths;
  const ignorePatterns = trigger.filters?.ignorePaths;

  if (pathPatterns && filenames) {
    const hasMatch = filenames.some((file) =>
      pathPatterns.some((pattern) => matchGlob(pattern, file))
    );
    if (!hasMatch) {
      return false;
    }
  }

  if (ignorePatterns && filenames) {
    const allIgnored = filenames.every((file) =>
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

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

function shouldFail(report: SkillReport, failOn: Severity): boolean {
  const threshold = SEVERITY_ORDER[failOn];
  return report.findings.some((f) => SEVERITY_ORDER[f.severity] <= threshold);
}

function countFindingsAtOrAbove(report: SkillReport, failOn: Severity): number {
  const threshold = SEVERITY_ORDER[failOn];
  return report.findings.filter((f) => SEVERITY_ORDER[f.severity] <= threshold).length;
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
    console.log(`- ${trigger.name}: ${trigger.skill}`);
  }
  logGroupEnd();

  const reports: SkillReport[] = [];
  let shouldFailAction = false;
  const failureReasons: string[] = [];

  for (const trigger of matchedTriggers) {
    logGroup(`Running trigger: ${trigger.name} (skill: ${trigger.skill})`);
    try {
      const skill = resolveSkill(trigger.skill, config, repoPath);
      const report = await runSkill(skill, context, { apiKey: inputs.anthropicApiKey });
      reports.push(report);
      console.log(`Found ${report.findings.length} findings`);

      // Use trigger's output config, falling back to global inputs
      const outputConfig = {
        maxFindings: trigger.output?.maxFindings ?? inputs.maxFindings ?? undefined,
        extraLabels: trigger.output?.labels ?? [],
      };

      const renderResult = renderSkillReport(report, {
        maxFindings: outputConfig.maxFindings,
        extraLabels: outputConfig.extraLabels,
      });

      try {
        await postReviewToGitHub(octokit, context, renderResult);
      } catch (error) {
        console.error(`::warning::Failed to post review: ${error}`);
      }

      // Check if we should fail based on this trigger's config
      const failOn = trigger.output?.failOn ?? inputs.failOn;
      if (failOn && shouldFail(report, failOn)) {
        shouldFailAction = true;
        const count = countFindingsAtOrAbove(report, failOn);
        failureReasons.push(`${trigger.name}: Found ${count} ${failOn}+ severity issues`);
      }
    } catch (error) {
      console.error(`::warning::Trigger ${trigger.name} failed: ${error}`);
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

  if (shouldFailAction) {
    setFailed(failureReasons.join('; '));
  }

  console.log(`\nAnalysis complete: ${totalFindings} total findings`);
}

run().catch((error) => {
  setFailed(`Unexpected error: ${error}`);
});
