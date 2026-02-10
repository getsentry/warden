/**
 * Action Input Parsing and Validation
 *
 * Handles parsing inputs from GitHub Actions environment and validates them.
 */
import type { SeverityThreshold } from '../types/index.js';
export interface ActionInputs {
    /** API key for Anthropic API (empty if using OAuth) */
    anthropicApiKey: string;
    /** OAuth token for Claude Code (empty if using API key) */
    oauthToken: string;
    githubToken: string;
    configPath: string;
    failOn?: SeverityThreshold;
    reportOn?: SeverityThreshold;
    maxFindings: number;
    /** Whether to use REQUEST_CHANGES review event when findings exceed failOn */
    requestChanges?: boolean;
    /** Whether to fail the check run when findings exceed failOn */
    failCheck?: boolean;
    /** Max concurrent trigger executions */
    parallel: number;
}
/**
 * Parse action inputs from the GitHub Actions environment.
 * Throws if required inputs are missing.
 */
export declare function parseActionInputs(): ActionInputs;
/**
 * Validate that required inputs are present.
 * Throws with a descriptive error if validation fails.
 */
export declare function validateInputs(inputs: ActionInputs): void;
/**
 * Set up environment variables for authentication.
 * Sets appropriate env vars based on token type (API key vs OAuth).
 */
export declare function setupAuthEnv(inputs: ActionInputs): void;
//# sourceMappingURL=inputs.d.ts.map