/**
 * Workflow Base
 *
 * Shared infrastructure for PR and schedule workflows.
 */

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Octokit } from '@octokit/rest';
import { execFileNonInteractive, execNonInteractive } from '../../utils/exec.js';
import { isRepoRelativePath, normalizePath } from '../../utils/path.js';
import type { EventContext, SkillReport } from '../../types/index.js';
import { countSeverity } from '../../triggers/matcher.js';
import type { RuntimeName } from '../../sdk/runtimes/index.js';
import type { TriggerResult } from '../triggers/executor.js';
import type { ActionInputs } from '../inputs.js';

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

/** Validate Claude runtime auth before invoking the Claude Code SDK. */
export function ensureClaudeAuth(inputs: ActionInputs): void {
  if (inputs.anthropicApiKey || inputs.oauthToken) {
    return;
  }
  setFailed(
    'Authentication not found. Provide an API key via anthropic-api-key input, ' +
      'WARDEN_ANTHROPIC_API_KEY env var, or OAuth token via CLAUDE_CODE_OAUTH_TOKEN env var.'
  );
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
// Runtime setup
// -----------------------------------------------------------------------------

export interface RuntimeEnvironment {
  pathToClaudeCodeExecutable?: string;
}

/** Prepare runtime-specific process dependencies required by matched triggers. */
export async function prepareRuntimeEnvironment(
  triggers: Iterable<{ runtime?: RuntimeName }>,
  inputs: ActionInputs
): Promise<RuntimeEnvironment> {
  const runtimes = new Set<RuntimeName>();
  for (const trigger of triggers) {
    runtimes.add(trigger.runtime ?? 'pi');
  }

  const env: RuntimeEnvironment = {};
  for (const runtime of runtimes) {
    switch (runtime) {
      case 'pi':
        break;
      case 'claude':
        ensureClaudeAuth(inputs);
        env.pathToClaudeCodeExecutable = await findClaudeCodeExecutable();
        break;
    }
  }

  return env;
}

// -----------------------------------------------------------------------------
// Claude Code CLI
// -----------------------------------------------------------------------------

const CLAUDE_CODE_VERSION = '2.1.32';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function findInstalledClaudeCodeExecutable(): string | undefined {
  const envPath = process.env['CLAUDE_CODE_PATH'];
  if (envPath && isExecutable(envPath)) {
    return envPath;
  }

  // Standard install location from claude.ai/install.sh
  const home = process.env['HOME'];
  const homeLocalBin = home ? `${home}/.local/bin/claude` : undefined;
  if (homeLocalBin && isExecutable(homeLocalBin)) {
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

  return undefined;
}

async function installClaudeCodeExecutable(): Promise<void> {
  console.log(`Installing Claude Code v${CLAUDE_CODE_VERSION}...`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`Installation attempt ${attempt}...`);
    try {
      const output = execNonInteractive(
        `curl -fsSL https://claude.ai/install.sh | bash -s -- "${CLAUDE_CODE_VERSION}"`,
        { timeout: 120_000 }
      );
      if (output) {
        console.log(output);
      }
      console.log('Claude Code installed successfully');
      return;
    } catch (error) {
      if (attempt === 3) {
        setFailed(`Failed to install Claude Code after 3 attempts: ${error}`);
      }
      console.log('Installation failed, retrying...');
      await sleep(5000);
    }
  }
}

/**
 * Find the Claude Code CLI executable path, installing it on demand when the
 * selected runtime needs Claude Code in CI.
 */
export async function findClaudeCodeExecutable(): Promise<string> {
  const existingPath = findInstalledClaudeCodeExecutable();
  if (existingPath) {
    return existingPath;
  }

  await installClaudeCodeExecutable();

  const installedPath = findInstalledClaudeCodeExecutable();
  if (installedPath) {
    return installedPath;
  }

  setFailed(
    'Claude Code CLI not found after installation. Ensure Claude Code is installed via https://claude.ai/install.sh'
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

function getFindingsOutputValue(filePath: string, repoPath: string): string {
  const relativePath = normalizePath(relative(repoPath, filePath));
  return isRepoRelativePath(relativePath) ? relativePath : filePath;
}

/**
 * Get the path for the findings output file.
 *
 * Uses the GitHub Actions workspace when available so action consumers can pass
 * the output to upload actions that expect repo-relative paths. Falls back to
 * RUNNER_TEMP for local callers and tests.
 */
export function getFindingsOutputPath(repoPath?: string): string {
  if (repoPath && process.env['GITHUB_WORKSPACE']) {
    return join(repoPath, 'warden-findings.json');
  }

  const tmpDir = process.env['RUNNER_TEMP'] ?? tmpdir();
  return join(tmpDir, 'warden-findings.json');
}

/**
 * Write structured findings data to a JSON file for external export (GCS, S3, etc.).
 *
 * Sets `findings-file` to a repo-relative path when possible so downstream
 * steps can reference the path without tripping ignore processors on absolute
 * runner temp paths.
 */
export function writeFindingsOutput(
  reports: SkillReport[],
  context: EventContext
): string {
  const filePath = getFindingsOutputPath(context.repoPath);
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
  setOutput('findings-file', getFindingsOutputValue(filePath, context.repoPath));
  return filePath;
}
