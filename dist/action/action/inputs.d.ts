/**
 * Action Input Parsing and Validation
 *
 * Handles parsing inputs from GitHub Actions environment and validates them.
 */
import type { SeverityThreshold } from '../types/index.js';
export type ActionMode = 'run' | 'analyze' | 'report';
export interface ActionInputs {
    /** API key for Anthropic API (empty if using OAuth) */
    anthropicApiKey: string;
    /** OAuth token for Claude Code (empty if using API key) */
    oauthToken: string;
    githubToken: string;
    /** Action execution mode */
    mode: ActionMode;
    /** Structured findings file used by report mode */
    findingsFile?: string;
    /** Optional org-wide base config that is loaded before the repo config */
    baseConfigPath?: string;
    /** Optional repo root containing org-shared local skills for the base config */
    baseSkillRoot?: string;
    /** Optional repo-local config that extends the base config in the same run */
    configPath: string;
    failOn?: SeverityThreshold;
    reportOn?: SeverityThreshold;
    maxFindings: number;
    /** Whether to use REQUEST_CHANGES review event when findings exceed failOn */
    requestChanges?: boolean;
    /** Whether to fail the check run when findings exceed failOn */
    failCheck?: boolean;
    /** Whether to create/update GitHub Check runs. Default true; explicit false disables the core check and all per-skill checks. */
    postChecks: boolean;
    /** Max concurrent trigger executions */
    parallel: number;
}
/**
 * Parse action inputs from the GitHub Actions environment.
 * Runtime-specific auth can be absent here; runtime setup validates it when needed.
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