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
  anthropicApiKey: string;
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
  // Check for API key: input first, then env vars as fallback
  const anthropicApiKey =
    getInput('anthropic-api-key') ||
    process.env['WARDEN_ANTHROPIC_API_KEY'] ||
    process.env['ANTHROPIC_API_KEY'] ||
    '';

  if (!anthropicApiKey) {
    throw new Error(
      'Anthropic API key not found. Provide it via the anthropic-api-key input or set WARDEN_ANTHROPIC_API_KEY environment variable.'
    );
  }

  const failOnInput = getInput('fail-on');
  const failOn = SeverityThresholdSchema.safeParse(failOnInput).success
    ? (failOnInput as SeverityThreshold)
    : undefined;

  const commentOnInput = getInput('comment-on');
  const commentOn = SeverityThresholdSchema.safeParse(commentOnInput).success
    ? (commentOnInput as SeverityThreshold)
    : undefined;

  return {
    anthropicApiKey,
    githubToken: getInput('github-token') || process.env['GITHUB_TOKEN'] || '',
    configPath: getInput('config-path') || 'warden.toml',
    failOn,
    commentOn,
    maxFindings: parseInt(getInput('max-findings') || '50', 10),
    parallel: parseInt(getInput('parallel') || String(DEFAULT_CONCURRENCY), 10),
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
 * Set up environment variables for the Anthropic API key.
 * This ensures code using either env var name will work.
 */
export function setupApiKeyEnv(apiKey: string): void {
  process.env['WARDEN_ANTHROPIC_API_KEY'] = apiKey;
  process.env['ANTHROPIC_API_KEY'] = apiKey;
}
