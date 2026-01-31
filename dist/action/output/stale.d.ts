import type { Octokit } from '@octokit/rest';
import type { ExistingComment } from './dedup.js';
import type { Finding, FileChange } from '../types/index.js';
/**
 * Scope of analyzed files in the PR.
 */
export interface AnalyzedScope {
    /** Set of file paths that were in the diff */
    files: Set<string>;
}
/**
 * Build the analyzed scope from file changes.
 */
export declare function buildAnalyzedScope(fileChanges: FileChange[]): AnalyzedScope;
/**
 * Check if a comment's file was in the analyzed scope.
 * Only comments on files that were analyzed should be considered for resolution.
 */
export declare function isInAnalyzedScope(comment: ExistingComment, scope: AnalyzedScope): boolean;
/**
 * Find comments that no longer have matching findings (stale comments).
 * Only considers comments on files that were in the analyzed scope.
 */
export declare function findStaleComments(existingComments: ExistingComment[], allFindings: Finding[], scope: AnalyzedScope): ExistingComment[];
/**
 * Resolve stale comment threads via GraphQL.
 * Returns the number of threads successfully resolved.
 * Limited to MAX_STALE_RESOLUTIONS per run as a safeguard.
 */
export declare function resolveStaleComments(octokit: Octokit, staleComments: ExistingComment[]): Promise<number>;
//# sourceMappingURL=stale.d.ts.map