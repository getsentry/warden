/**
 * Workflow Base
 *
 * Shared infrastructure for PR and schedule workflows.
 */

import { appendFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Octokit } from '@octokit/rest';
import { execNonInteractive } from '../../utils/exec.js';
import type { SkillReport } from '../../types/index.js';
import { countSeverity } from '../../triggers/matcher.js';
import type { TriggerResult } from '../triggers/executor.js';

// -----------------------------------------------------------------------------
// GitHub Actions Helpers
// -----------------------------------------------------------------------------

/**
 * Set a GitHub Actions output variable.
 */
export function setOutput(name: string, value: string | number): void {
  const outputFile = process.env['GITHUB_OUTPUT'];
  if (outputFile) {
    const stringValue = String(value);
    // Use heredoc format with random delimiter for multiline values
    // Random delimiter prevents injection if value contains the delimiter
    if (stringValue.includes('\n')) {
      const delimiter = `ghadelim_${randomUUID()}`;
      appendFileSync(outputFile, `${name}<<${delimiter}\n${stringValue}\n${delimiter}\n`);
    } else {
      appendFileSync(outputFile, `${name}=${stringValue}\n`);
    }
  }
}

/**
 * Fail the GitHub Action with an error message.
 */
export function setFailed(message: string): never {
  console.error(`::error::${message}`);
  process.exit(1);
}

/**
 * Start a collapsible log group.
 */
export function logGroup(name: string): void {
  console.log(`::group::${name}`);
}

/**
 * End a collapsible log group.
 */
export function logGroupEnd(): void {
  console.log('::endgroup::');
}

// -----------------------------------------------------------------------------
// Claude Code CLI
// -----------------------------------------------------------------------------

/**
 * Find the Claude Code CLI executable path.
 * Required in CI environments where the SDK can't auto-detect the CLI location.
 */
export function findClaudeCodeExecutable(): string {
  // Check environment variable first (set by action.yml)
  const envPath = process.env['CLAUDE_CODE_PATH'];
  if (envPath) {
    try {
      execNonInteractive(`test -x "${envPath}"`);
      return envPath;
    } catch {
      // Path from env doesn't exist, continue to fallbacks
    }
  }

  // Standard install location from claude.ai/install.sh
  const homeLocalBin = `${process.env['HOME']}/.local/bin/claude`;
  try {
    execNonInteractive(`test -x "${homeLocalBin}"`);
    return homeLocalBin;
  } catch {
    // Not found in standard location
  }

  // Try which command
  try {
    const path = execNonInteractive('which claude');
    if (path) {
      return path;
    }
  } catch {
    // which command failed
  }

  // Other common installation paths as fallback
  const commonPaths = ['/usr/local/bin/claude', '/usr/bin/claude'];

  for (const p of commonPaths) {
    try {
      execNonInteractive(`test -x "${p}"`);
      return p;
    } catch {
      // Path doesn't exist or isn't executable
    }
  }

  setFailed(
    'Claude Code CLI not found. Ensure Claude Code is installed via https://claude.ai/install.sh'
  );
}

// -----------------------------------------------------------------------------
// Trigger Error Handling
// -----------------------------------------------------------------------------

/**
 * Log trigger error summary and fail if all triggers failed.
 */
export function handleTriggerErrors(triggerErrors: string[], totalTriggers: number): void {
  if (triggerErrors.length === 0) {
    return;
  }

  logGroup('Trigger Errors Summary');
  for (const err of triggerErrors) {
    console.error(`  - ${err}`);
  }
  logGroupEnd();

  // Fail if ALL triggers failed (no successful analysis was performed)
  if (triggerErrors.length === totalTriggers && totalTriggers > 0) {
    setFailed(`All ${totalTriggers} trigger(s) failed: ${triggerErrors.join('; ')}`);
  }
}

/**
 * Collect error messages from trigger results.
 */
export function collectTriggerErrors(results: TriggerResult[]): string[] {
  return results
    .filter((r) => r.error)
    .map((r) => {
      const errorMessage = r.error instanceof Error ? r.error.message : String(r.error);
      return `${r.triggerName}: ${errorMessage}`;
    });
}

// -----------------------------------------------------------------------------
// Output Aggregation
// -----------------------------------------------------------------------------

export interface WorkflowOutputs {
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  summary: string;
}

/**
 * Compute workflow outputs from reports.
 */
export function computeWorkflowOutputs(reports: SkillReport[]): WorkflowOutputs {
  return {
    findingsCount: reports.reduce((sum, r) => sum + r.findings.length, 0),
    criticalCount: countSeverity(reports, 'critical'),
    highCount: countSeverity(reports, 'high'),
    summary: reports.map((r) => r.summary).join('\n'),
  };
}

/**
 * Set workflow output variables.
 */
export function setWorkflowOutputs(outputs: WorkflowOutputs): void {
  setOutput('findings-count', outputs.findingsCount);
  setOutput('critical-count', outputs.criticalCount);
  setOutput('high-count', outputs.highCount);
  setOutput('summary', outputs.summary);
}

// -----------------------------------------------------------------------------
// GitHub API Helpers
// -----------------------------------------------------------------------------

/**
 * Get the authenticated bot's login name.
 * For GitHub Apps, this returns the app's slug with [bot] suffix (e.g., "warden[bot]").
 */
export async function getAuthenticatedBotLogin(octokit: Octokit): Promise<string | null> {
  try {
    const { data: user } = await octokit.users.getAuthenticated();
    return user.login;
  } catch {
    // May fail if using a non-app token (e.g., PAT or GITHUB_TOKEN)
    return null;
  }
}

/**
 * Get the default branch for a repository from the GitHub API.
 */
export async function getDefaultBranchFromAPI(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<string> {
  const { data } = await octokit.repos.get({ owner, repo });
  return data.default_branch;
}
