import type { EventContext, FileChange } from '../types/index.js';
export interface ScheduleContextOptions {
    /** Glob patterns from trigger's filters.paths */
    patterns: string[];
    /** Glob patterns from trigger's filters.ignorePaths */
    ignorePatterns?: string[];
    /** Repository root path (GITHUB_WORKSPACE) */
    repoPath: string;
    /** Repository owner (from GITHUB_REPOSITORY) */
    owner: string;
    /** Repository name */
    name: string;
    /** Default branch name */
    defaultBranch: string;
    /** Current commit SHA */
    headSha: string;
}
/**
 * Build an EventContext for scheduled runs.
 *
 * Creates a synthetic pullRequest context from file globs using real repo info.
 * The runner processes this normally because the files have patch data.
 */
export declare function buildScheduleEventContext(options: ScheduleContextOptions): Promise<EventContext>;
/**
 * Filter file changes to only include files matching the given patterns.
 * Used when a schedule trigger has specific path filters.
 */
export declare function filterFilesByPatterns(files: FileChange[], patterns: string[], ignorePatterns?: string[]): FileChange[];
//# sourceMappingURL=schedule-context.d.ts.map