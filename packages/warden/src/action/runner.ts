/**
 * GitHub Action dispatcher.
 *
 * Parses action inputs, builds the GitHub client, and selects the workflow for
 * the current GitHub event. The top-level run module owns process exit handling.
 */

import { Octokit } from '@octokit/rest';
import { setGitHubActionScope, setRepositoryScope } from '../sentry.js';
import { parseActionInputs, setupAuthEnv, validateInputs } from './inputs.js';
import { setFailed } from './workflow/base.js';
import { runPRWorkflow } from './workflow/pr-workflow.js';
import { runScheduleWorkflow } from './workflow/schedule.js';

function isPullRequestEvent(eventName: string): boolean {
  return eventName === 'pull_request';
}

/** Run the GitHub Action dispatcher once. */
export async function runAction(): Promise<void> {
  const inputs = parseActionInputs();
  validateInputs(inputs);

  const eventName = process.env['GITHUB_EVENT_NAME'];
  const eventPath = process.env['GITHUB_EVENT_PATH'];
  const repoPath = process.env['GITHUB_WORKSPACE'];

  if (!eventName || !eventPath || !repoPath) {
    setFailed('This action must be run in a GitHub Actions environment');
  }

  setGitHubActionScope(eventName);
  setRepositoryScope(process.env['GITHUB_REPOSITORY']);

  setupAuthEnv(inputs);

  const octokit = new Octokit({ auth: inputs.githubToken });

  if (eventName === 'schedule' || eventName === 'workflow_dispatch') {
    if (inputs.mode !== 'run') {
      setFailed(`${inputs.mode} mode is only supported for pull request workflows`);
    }
    return runScheduleWorkflow(octokit, inputs, repoPath);
  }

  if (inputs.mode !== 'run' && !isPullRequestEvent(eventName)) {
    setFailed(`${inputs.mode} mode is only supported for pull request workflows`);
  }

  return runPRWorkflow(octokit, inputs, eventName, eventPath, repoPath);
}
