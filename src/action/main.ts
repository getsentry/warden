/**
 * GitHub Action Entry Point
 *
 * Thin orchestrator that routes events to the appropriate workflow handler.
 *
 * Error Handling Policy
 * =====================
 *
 * Fatal errors (setFailed - exit immediately):
 * - Missing required inputs (API key, GitHub token, environment variables)
 * - Environment setup failures (not running in GitHub Actions)
 * - Claude Code CLI not found
 * - Event payload parsing failures
 * - Event context building failures
 *
 * Non-fatal errors (log warning + continue):
 * - Individual trigger execution failures (accumulate and report)
 * - GitHub check creation/update failures
 * - Review comment posting failures
 * - Stale comment resolution failures
 *
 * End-of-run failure conditions:
 * - Findings exceed severity threshold (fail-on)
 * - ALL triggers failed (no successful analysis)
 */

import { initSentry, Sentry, flushSentry } from '../sentry.js';
initSentry('action');

import { Octokit } from '@octokit/rest';
import { parseActionInputs, validateInputs, setupAuthEnv } from './inputs.js';
import { setFailed, ActionFailedError } from './workflow/base.js';
import { runPRWorkflow } from './workflow/pr-workflow.js';
import { runScheduleWorkflow } from './workflow/schedule.js';

async function run(): Promise<void> {
  const inputs = parseActionInputs();
  validateInputs(inputs);

  const eventName = process.env['GITHUB_EVENT_NAME'];
  const eventPath = process.env['GITHUB_EVENT_PATH'];
  const repoPath = process.env['GITHUB_WORKSPACE'];

  if (!eventName || !eventPath || !repoPath) {
    setFailed('This action must be run in a GitHub Actions environment');
  }

  // Set up authentication environment variables
  setupAuthEnv(inputs);

  const octokit = new Octokit({ auth: inputs.githubToken });

  // Route schedule events to dedicated handler
  if (eventName === 'schedule' || eventName === 'workflow_dispatch') {
    return runScheduleWorkflow(octokit, inputs, repoPath);
  }

  // Handle PR and push events
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
