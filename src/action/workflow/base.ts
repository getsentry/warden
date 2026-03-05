/**
 * Workflow Base
 *
 * Shared infrastructure for PR and schedule workflows.
 */

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Octokit } from '@octokit/rest';
import { execFileNonInteractive } from '../../utils/exec.js';
import type { EventContext, SkillReport } from '../../types/index.js';
import { countSeverity } from '../../triggers/matcher.js';
import type { TriggerResult } from '../triggers/executor.js';

/**
 * Sentinel error thrown by setFailed() so the top-level catch handler
 * can distinguish expected failures from unexpected crashes.
 */
export class ActionFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActionFailedError';
  }
}

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
 * Throws ActionFailedError so spans end cleanly before the process exits.
 */
export function setFailed(message: string): never {
  throw new ActionFailedError(message);
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
 * Test whether a path is an executable file.
 */
function isExecutable(path: string): boolean {
  try {
    execFileNonInteractive('test', ['-x', path]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find the Claude Code CLI executable path.
 * Required in CI environments where the SDK can't auto-detect the CLI location.
 */
export async function findClaudeCodeExecutable(): Promise<string> {
  // Check environment variable first (set by action.yml)
  const envPath = process.env['CLAUDE_CODE_PATH'];
  if (envPath && isExecutable(envPath)) {
    return envPath;
  }

  // Standard install location from claude.ai/install.sh
  const homeLocalBin = `${process.env['HOME']}/.local/bin/claude`;
  if (isExecutable(homeLocalBin)) {
    return homeLocalBin;
  }

  // Try which command
  try {
    const path = execFileNonInteractive('which', ['claude']);
    if (path) return path;
  } catch {
    // which command failed
  }

  // Other common installation paths as fallback
  const commonPaths = ['/usr/local/bin/claude', '/usr/bin/claude'];
  for (const p of commonPaths) {
    if (isExecutable(p)) return p;
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
  highCount: number;
  summary: string;
}

/**
 * Compute workflow outputs from reports.
 */
export function computeWorkflowOutputs(reports: SkillReport[]): WorkflowOutputs {
  return {
    findingsCount: reports.reduce((sum, r) => sum + r.findings.length, 0),
    highCount: countSeverity(reports, 'high'),
    summary: reports.map((r) => r.summary).join('\n'),
  };
}

/**
 * Set workflow output variables.
 */
export function setWorkflowOutputs(outputs: WorkflowOutputs): void {
  setOutput('findings-count', outputs.findingsCount);
  setOutput('high-count', outputs.highCount);
  setOutput('summary', outputs.summary);
}

// -----------------------------------------------------------------------------
// GitHub API Helpers
// -----------------------------------------------------------------------------

/**
 * Get the authenticated bot's login name.
 *
 * Tries three strategies in order:
 * 1. GraphQL `viewer` query (works for both installation tokens and PATs)
 * 2. `octokit.apps.getAuthenticated()` → `${slug}[bot]` (GitHub App JWT fallback)
 * 3. `octokit.users.getAuthenticated()` (PAT fallback)
 */
export async function getAuthenticatedBotLogin(octokit: Octokit): Promise<string | null> {
  // Strategy 1: GraphQL viewer (works for installation tokens and PATs)
  try {
    const result: { viewer: { login: string } } = await octokit.graphql('query { viewer { login } }');
    if (result.viewer?.login) {
      return result.viewer.login;
    }
  } catch {
    // GraphQL may not be available or may fail for certain token types
  }

  // Strategy 2: GitHub App JWT endpoint
  try {
    const { data: app } = await octokit.apps.getAuthenticated();
    if (app?.slug) {
      return `${app.slug}[bot]`;
    }
  } catch {
    // Not a GitHub App token
  }

  // Strategy 3: PAT user endpoint
  try {
    const { data: user } = await octokit.users.getAuthenticated();
    return user.login;
  } catch {
    // Token doesn't have user scope
  }

  return null;
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

// -----------------------------------------------------------------------------
// Findings Output File
// -----------------------------------------------------------------------------

/**
 * Get the path for the findings output file.
 * Uses RUNNER_TEMP (GitHub Actions) with fallback to OS temp dir.
 */
export function getFindingsOutputPath(): string {
  const tmpDir = process.env['RUNNER_TEMP'] ?? tmpdir();
  return join(tmpDir, 'warden-findings.json');
}

/**
 * Write structured findings data to a JSON file for external export (GCS, S3, etc.).
 *
 * Always writes to a known location under RUNNER_TEMP and sets the `findings-file`
 * output so downstream steps can reference the path.
 */
export function writeFindingsOutput(
  reports: SkillReport[],
  context: EventContext
): string {
  const filePath = getFindingsOutputPath();
  const allFindings = reports.flatMap((r) => r.findings);

  const output = {
    version: '1',
    timestamp: new Date().toISOString(),
    repository: {
      owner: context.repository.owner,
      name: context.repository.name,
      fullName: context.repository.fullName,
    },
    event: context.eventType,
    ...(context.pullRequest && {
      pullRequest: {
        number: context.pullRequest.number,
        author: context.pullRequest.author,
        title: context.pullRequest.title,
        baseBranch: context.pullRequest.baseBranch,
        headBranch: context.pullRequest.headBranch,
        headSha: context.pullRequest.headSha,
      },
    }),
    runId: process.env['GITHUB_RUN_ID'] ?? '',
    summary: {
      totalFindings: allFindings.length,
      findingsBySeverity: {
        high: allFindings.filter((f) => f.severity === 'high').length,
        medium: allFindings.filter((f) => f.severity === 'medium').length,
        low: allFindings.filter((f) => f.severity === 'low').length,
      },
      totalSkills: reports.length,
    },
    skills: reports.map((r) => ({
      name: r.skill,
      summary: r.summary,
      model: r.model,
      durationMs: r.durationMs,
      usage: r.usage,
      findings: r.findings.map((f) => ({
        id: f.id,
        severity: f.severity,
        confidence: f.confidence,
        title: f.title,
        description: f.description,
        location: f.location,
        additionalLocations: f.additionalLocations,
        suggestedFix: f.suggestedFix,
      })),
    })),
  };

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(output, null, 2));
  setOutput('findings-file', filePath);
  return filePath;
}
