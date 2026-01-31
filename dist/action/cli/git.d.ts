export interface GitFileChange {
    filename: string;
    status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied';
    additions: number;
    deletions: number;
    patch?: string;
    chunks?: number;
}
/**
 * Get the current branch name.
 */
export declare function getCurrentBranch(cwd?: string): string;
/**
 * Get the HEAD commit SHA.
 */
export declare function getHeadSha(cwd?: string): string;
/**
 * Detect the default branch by checking common branch names locally.
 * Does not perform any remote operations to avoid SSH prompts.
 */
export declare function getDefaultBranch(cwd?: string): string;
/**
 * Get the repository root path.
 */
export declare function getRepoRoot(cwd?: string): string;
/**
 * Get the repository name from the git remote or directory name.
 */
export declare function getRepoName(cwd?: string): {
    owner: string;
    name: string;
};
/**
 * Get the GitHub repository URL if the remote is on GitHub.
 * Returns null if the remote is not GitHub or not configured.
 */
export declare function getGitHubRepoUrl(cwd?: string): string | null;
/**
 * Get list of changed files between two refs.
 * If head is undefined, compares against the working tree.
 */
export declare function getChangedFiles(base: string, head?: string, cwd?: string): GitFileChange[];
/**
 * Get the patch for a specific file.
 */
export declare function getFilePatch(base: string, head: string | undefined, filename: string, cwd?: string): string | undefined;
/**
 * Get patches for all changed files in a single git command.
 */
export declare function getChangedFilesWithPatches(base: string, head?: string, cwd?: string): GitFileChange[];
/**
 * Check if there are uncommitted changes in the working tree.
 */
export declare function hasUncommittedChanges(cwd?: string): boolean;
/**
 * Check if a ref exists.
 */
export declare function refExists(ref: string, cwd?: string): boolean;
/**
 * Commit message with subject and body separated.
 */
export interface CommitMessage {
    /** First line of the commit message */
    subject: string;
    /** Remaining lines after the subject (may be empty) */
    body: string;
}
/**
 * Get the commit message for a specific ref.
 * Returns subject (first line) and body (remaining lines) separately.
 */
export declare function getCommitMessage(ref: string, cwd?: string): CommitMessage;
//# sourceMappingURL=git.d.ts.map