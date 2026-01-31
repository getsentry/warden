import type { Octokit } from '@octokit/rest';
import type { Finding } from '../types/index.js';
/**
 * Parsed marker data from a Warden comment.
 */
export interface WardenMarker {
    path: string;
    line: number;
    contentHash: string;
}
/**
 * Existing comment from GitHub (either Warden or external).
 */
export interface ExistingComment {
    id: number;
    path: string;
    line: number;
    title: string;
    description: string;
    contentHash: string;
    /** GraphQL node ID for the review thread (used to resolve stale comments) */
    threadId?: string;
    /** Whether the thread has been resolved (resolved comments are used for dedup but not stale detection) */
    isResolved?: boolean;
    /** Whether this is a Warden-generated comment */
    isWarden?: boolean;
    /** Skills that have already detected this issue (for Warden comments) */
    skills?: string[];
    /** The raw comment body (needed for updating Warden comments) */
    body?: string;
    /** GraphQL node ID for the comment (needed for adding reactions) */
    commentNodeId?: string;
}
/**
 * Type of action to take for a duplicate finding.
 */
export type DuplicateActionType = 'update_warden' | 'react_external';
/**
 * Action to take for a duplicate finding.
 */
export interface DuplicateAction {
    type: DuplicateActionType;
    finding: Finding;
    existingComment: ExistingComment;
    /** Whether this was a hash match or semantic match */
    matchType: 'hash' | 'semantic';
}
/**
 * Result of deduplication with actions for duplicates.
 */
export interface DeduplicateResult {
    /** Findings that are not duplicates - should be posted */
    newFindings: Finding[];
    /** Actions to take for duplicate findings */
    duplicateActions: DuplicateAction[];
}
/**
 * Generate a short content hash from title and description.
 * Used for exact-match deduplication.
 */
export declare function generateContentHash(title: string, description: string): string;
/**
 * Generate the marker HTML comment to embed in comment body.
 * Format: <!-- warden:v1:{path}:{line}:{contentHash} -->
 */
export declare function generateMarker(path: string, line: number, contentHash: string): string;
/**
 * Parse a Warden marker from a comment body.
 * Returns null if no valid marker is found.
 */
export declare function parseMarker(body: string): WardenMarker | null;
/**
 * Parse title and description from a Warden comment body.
 * Expected format: **:emoji: Title**\n\nDescription
 */
export declare function parseWardenComment(body: string): {
    title: string;
    description: string;
} | null;
/**
 * Check if a comment body is a Warden-generated comment.
 */
export declare function isWardenComment(body: string): boolean;
/**
 * Parse skill names from a Warden comment's attribution line.
 * Handles both single skill: "<sub>warden: skill-name</sub>"
 * And multiple skills: "<sub>warden: skill1, skill2</sub>"
 */
export declare function parseWardenSkills(body: string): string[];
/**
 * Update a Warden comment body to add a new skill to the attribution.
 * Changes "<sub>warden: skill1</sub>" to "<sub>warden: skill1, skill2</sub>"
 * Returns null if skill is already listed or if no <sub>warden:...</sub> tag exists.
 */
export declare function updateWardenCommentBody(body: string, newSkill: string): string | null;
/**
 * Fetch all existing review comments for a PR (both Warden and external).
 * Uses GraphQL to get thread IDs for stale comment resolution and node IDs for reactions.
 */
export declare function fetchExistingComments(octokit: Octokit, owner: string, repo: string, prNumber: number): Promise<ExistingComment[]>;
/**
 * @deprecated Use fetchExistingComments instead
 */
export declare function fetchExistingWardenComments(octokit: Octokit, owner: string, repo: string, prNumber: number): Promise<ExistingComment[]>;
/**
 * Options for deduplication.
 */
export interface DeduplicateOptions {
    /** Anthropic API key for LLM-based semantic deduplication */
    apiKey?: string;
    /** Skip LLM deduplication and only use exact hash matching */
    hashOnly?: boolean;
    /** Current skill name (for updating Warden comment attribution) */
    currentSkill?: string;
}
/**
 * Update an existing Warden PR review comment via REST API.
 */
export declare function updateWardenComment(octokit: Octokit, owner: string, repo: string, commentId: number, newBody: string): Promise<void>;
/**
 * Add a reaction to an existing PR review comment.
 * Uses GraphQL to handle review comments.
 */
export declare function addReactionToComment(octokit: Octokit, commentNodeId: string, reaction?: 'THUMBS_UP' | 'EYES'): Promise<void>;
/**
 * Process duplicate actions - update Warden comments and add reactions.
 * Returns counts of actions taken for logging.
 */
export declare function processDuplicateActions(octokit: Octokit, owner: string, repo: string, actions: DuplicateAction[], currentSkill: string): Promise<{
    updated: number;
    reacted: number;
    skipped: number;
    failed: number;
}>;
/**
 * Convert a Finding to an ExistingComment for cross-trigger deduplication.
 * Returns null if the finding has no location.
 */
export declare function findingToExistingComment(finding: Finding, skill?: string): ExistingComment | null;
/**
 * Deduplicate findings against existing comments.
 * Returns non-duplicate findings and actions to take for duplicates.
 *
 * Deduplication is two-pass:
 * 1. Exact content hash match - instant match
 * 2. LLM semantic comparison for remaining findings (if API key provided)
 *
 * For duplicates:
 * - If matching a Warden comment: action to update attribution with new skill
 * - If matching an external comment: action to add reaction
 */
export declare function deduplicateFindings(findings: Finding[], existingComments: ExistingComment[], options?: DeduplicateOptions): Promise<DeduplicateResult>;
//# sourceMappingURL=dedup.d.ts.map