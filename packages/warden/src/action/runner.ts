/**
 * GitHub Action dispatcher.
 *
 * Parses action inputs, builds the GitHub client, and selects the workflow for
 * the current GitHub event. The top-level run module owns process exit handling.
 */

import { Octokit } from '@octokit/rest';
import { SPAN_STATUS_ERROR, SPAN_STATUS_OK } from '@sentry/core';
import { classifyError } from '../sdk/errors.js';
import { emitActionRunMetric, setGitHubActionScope, Sentry } from '../sentry.js';
import { parseActionInputs, setupAuthEnv, validateInputs } from './inputs.js';
import { ActionFailedError, setFailed } from './workflow/base.js';
import { runPRWorkflow } from './workflow/pr-workflow.js';
import { runScheduleWorkflow } from './workflow/schedule.js';

function isPullRequestEvent(eventName: string): boolean {
  return eventName === 'pull_request';
}

/** Run the GitHub Action dispatcher once. */
export async function runAction(): Promise<void> {
  const eventName = process.env['GITHUB_EVENT_NAME'];
  const actionAttributes = setGitHubActionScope(eventName);

  return Sentry.startSpan(
    { op: 'cicd.workflow', name: 'run Warden action', attributes: actionAttributes },
    async (span) => {
      // Advance this before each phase so failures retain their startup stage.
      let stage: 'input' | 'environment' | 'dispatch' = 'input';
      try {
        const inputs = parseActionInputs();
        validateInputs(inputs);

        stage = 'environment';
        const eventPath = process.env['GITHUB_EVENT_PATH'];
        const repoPath = process.env['GITHUB_WORKSPACE'];

        if (!eventName || !eventPath || !repoPath) {
          setFailed('This action must be run in a GitHub Actions environment');
        }

        setupAuthEnv(inputs);
        const octokit = new Octokit({ auth: inputs.githubToken });

        stage = 'dispatch';
        if (eventName === 'schedule' || eventName === 'workflow_dispatch') {
          if (inputs.mode !== 'run') {
            setFailed(`${inputs.mode} mode is only supported for pull request workflows`);
          }
          await runScheduleWorkflow(octokit, inputs, repoPath);
        } else {
          if (inputs.mode !== 'run' && !isPullRequestEvent(eventName)) {
            setFailed(`${inputs.mode} mode is only supported for pull request workflows`);
          }
          await runPRWorkflow(octokit, inputs, eventName, eventPath, repoPath);
        }

        span.setAttribute('warden.action.outcome', 'success');
        span.setStatus({ code: SPAN_STATUS_OK });
        emitActionRunMetric('success', stage);
      } catch (error) {
        const { code } = classifyError(error);
        span.setAttribute('warden.action.outcome', 'failure');
        span.setAttribute('warden.action.stage', stage);
        span.setAttribute('warden.error.code', code);
        span.setStatus({ code: SPAN_STATUS_ERROR, message: code });
        emitActionRunMetric('failure', stage, code);

        // Expected action failures are outcomes, not Sentry Issues.
        if (!(error instanceof ActionFailedError)) {
          Sentry.captureException(error, {
            tags: {
              'warden.error.code': code,
              'warden.action.stage': stage,
            },
          });
        }
        throw error;
      }
    }
  );
}
