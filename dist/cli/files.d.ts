import type { FileChange } from '../types/index.js';
export interface ExpandGlobOptions {
    /** Working directory for glob expansion (default: process.cwd()) */
    cwd?: string;
    /** Respect .gitignore files (default: true) */
    gitignore?: boolean;
}
/**
 * Expand glob patterns to a list of file paths.
 *
 * By default, respects .gitignore files to automatically exclude ignored
 * directories like node_modules/. This can be disabled by setting
 * gitignore: false.
 */
export declare function expandFileGlobs(patterns: string[], cwdOrOptions?: string | ExpandGlobOptions): Promise<string[]>;
/**
 * Create a unified diff patch for a file, treating entire content as added.
 */
export declare function createPatchFromContent(content: string): string;
/**
 * Read a file and create a synthetic FileChange treating it as newly added.
 */
export declare function createSyntheticFileChange(absolutePath: string, basePath: string): FileChange;
/**
 * Process a list of file paths into FileChange objects.
 */
export declare function createSyntheticFileChanges(absolutePaths: string[], basePath: string): FileChange[];
/**
 * Expand glob patterns and create FileChange objects for all matching files.
 */
export declare function expandAndCreateFileChanges(patterns: string[], cwd?: string): Promise<FileChange[]>;
//# sourceMappingURL=files.d.ts.map