/**
 * Action Input Parsing and Validation
 *
 * Handles parsing inputs from GitHub Actions environment and validates them.
 */

import { SeverityThresholdSchema } from '../types/index.js';
import type { SeverityThreshold } from '../types/index.js';
import { DEFAULT_CONCURRENCY } from '../utils/index.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ActionInputs {
  /** API key for Anthropic API (empty if using OAuth) */
  anthropicApiKey: string;
  /** OAuth token for Claude Code (empty if using API key) */
  oauthToken: string;
  githubToken: string;
  configPath: string;
  failOn?: SeverityThreshold;
  commentOn?: SeverityThreshold;
  maxFindings: number;
  /** Max concurrent trigger executions */
  parallel: number;
}

// -----------------------------------------------------------------------------
// Input Parsing
// -----------------------------------------------------------------------------

/**
 * Get an input value from GitHub Actions environment.
 * Checks both hyphenated (native) and underscored (composite action) formats.
 */
function getInput(name: string, required = false): string {
  // Check both hyphenated (native GitHub Actions) and underscored (composite action) formats
  const hyphenEnv = `INPUT_${name.toUpperCase()}`;
  const underscoreEnv = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
  const value = process.env[hyphenEnv] ?? process.env[underscoreEnv] ?? '';
  if (required && !value) {
    throw new Error(`Input required and not supplied: ${name}`);
  }
  return value;
}

/**
 * Parse action inputs from the GitHub Actions environment.
 * Throws if required inputs are missing.
 */
export function parseActionInputs(): ActionInputs {
  // Check for auth token: supports both API keys and OAuth tokens
  // Priority: input > WARDEN_ANTHROPIC_API_KEY > ANTHROPIC_API_KEY > CLAUDE_CODE_OAUTH_TOKEN
  const authToken =
    getInput('anthropic-api-key') ||
    process.env['WARDEN_ANTHROPIC_API_KEY'] ||
    process.env['ANTHROPIC_API_KEY'] ||
    process.env['CLAUDE_CODE_OAUTH_TOKEN'] ||
    '';

  if (!authToken) {
    throw new Error(
      'Authentication not found. Provide an API key via anthropic-api-key input, ' +
        'ANTHROPIC_API_KEY env var, or OAuth token via CLAUDE_CODE_OAUTH_TOKEN env var.'
    );
  }

  // Detect token type: OAuth tokens start with 'sk-ant-oat', API keys are other 'sk-ant-' prefixes
  const isOAuthToken = authToken.startsWith('sk-ant-oat');
  const anthropicApiKey = isOAuthToken ? '' : authToken;
  const oauthToken = isOAuthToken ? authToken : '';

  const failOnInput = getInput('fail-on');
  const failOn = SeverityThresholdSchema.safeParse(failOnInput).success
    ? (failOnInput as SeverityThreshold)
    : undefined;

  const commentOnInput = getInput('comment-on');
  const commentOn = SeverityThresholdSchema.safeParse(commentOnInput).success
    ? (commentOnInput as SeverityThreshold)
    : undefined;

  const maxFindingsParsed = parseInt(getInput('max-findings') || '50', 10);
  const parallelParsed = parseInt(getInput('parallel') || String(DEFAULT_CONCURRENCY), 10);

  return {
    anthropicApiKey,
    oauthToken,
    githubToken: getInput('github-token') || process.env['GITHUB_TOKEN'] || '',
    configPath: getInput('config-path') || 'warden.toml',
    failOn,
    commentOn,
    maxFindings: Number.isNaN(maxFindingsParsed) ? 50 : maxFindingsParsed,
    parallel: Number.isNaN(parallelParsed) ? DEFAULT_CONCURRENCY : parallelParsed,
  };
}

/**
 * Validate that required inputs are present.
 * Throws with a descriptive error if validation fails.
 */
export function validateInputs(inputs: ActionInputs): void {
  if (!inputs.githubToken) {
    throw new Error('GitHub token is required');
  }
}

/**
 * Set up environment variables for authentication.
 * Sets appropriate env vars based on token type (API key vs OAuth).
 */
export function setupAuthEnv(inputs: ActionInputs): void {
  if (inputs.oauthToken) {
    process.env['CLAUDE_CODE_OAUTH_TOKEN'] = inputs.oauthToken;
  } else {
    process.env['WARDEN_ANTHROPIC_API_KEY'] = inputs.anthropicApiKey;
    process.env['ANTHROPIC_API_KEY'] = inputs.anthropicApiKey;
  }
}
