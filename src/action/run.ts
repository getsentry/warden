/**
 * GitHub Action Runner
 *
 * main.ts installs action-bundle compatibility hooks before loading this
 * module. Workflow modules own trigger-level error handling.
 */

import { Octokit } from '@octokit/rest';
import { initSentry, Sentry, flushSentry, setGitHubActionScope, setRepositoryScope } from '../sentry.js';
import { parseActionInputs, validateInputs, setupAuthEnv } from './inputs.js';
import { setFailed, ActionFailedError } from './workflow/base.js';
import { runPRWorkflow } from './workflow/pr-workflow.js';
import { runScheduleWorkflow } from './workflow/schedule.js';

initSentry('action');

async function run(): Promise<void> {
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
    return runScheduleWorkflow(octokit, inputs, repoPath);
  }

  return runPRWorkflow(octokit, inputs, eventName, eventPath, repoPath);
}

run()
  .then(() => flushSentry())
  .catch(async (error) => {
    if (error instanceof ActionFailedError) {
      console.error(`::error::${error.message}`);
    } else {
      Sentry.captureException(error);
      console.error(`::error::Unexpected error: ${error}`);
    }
    await flushSentry();
    process.exit(1);
  });
