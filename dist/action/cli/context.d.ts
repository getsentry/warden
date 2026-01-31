import type { EventContext } from '../types/index.js';
export interface LocalContextOptions {
    base?: string;
    head?: string;
    cwd?: string;
    /** Override auto-detected default branch (from config) */
    defaultBranch?: string;
}
/**
 * Build an EventContext from local git repository state.
 * Creates a synthetic pull_request event from git diff.
 *
 * When analyzing a specific commit (head is set), uses the actual commit
 * message as title/body to provide intent context to the LLM.
 */
export declare function buildLocalEventContext(options?: LocalContextOptions): EventContext;
export interface FileContextOptions {
    patterns: string[];
    cwd?: string;
}
/**
 * Build an EventContext from a list of files or glob patterns.
 * Creates a synthetic pull_request event treating files as newly added.
 * This allows analysis without requiring git or a warden.toml config.
 */
export declare function buildFileEventContext(options: FileContextOptions): Promise<EventContext>;
//# sourceMappingURL=context.d.ts.map