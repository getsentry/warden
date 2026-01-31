import type { DiffHunk, ParsedDiff } from './parser.js';
/** Clear the file cache (useful for testing or long-running processes) */
export declare function clearFileCache(): void;
export interface HunkWithContext {
    /** File path */
    filename: string;
    /** The hunk being analyzed */
    hunk: DiffHunk;
    /** Lines before the hunk (from actual file) */
    contextBefore: string[];
    /** Lines after the hunk (from actual file) */
    contextAfter: string[];
    /** Start line of contextBefore */
    contextStartLine: number;
    /** Detected language from file extension */
    language: string;
}
/**
 * Expand a hunk with surrounding context from the actual file.
 */
export declare function expandHunkContext(repoPath: string, filename: string, hunk: DiffHunk, contextLines?: number): HunkWithContext;
/**
 * Expand all hunks in a parsed diff with context.
 */
export declare function expandDiffContext(repoPath: string, diff: ParsedDiff, contextLines?: number): HunkWithContext[];
/**
 * Format a hunk with context for LLM analysis.
 */
export declare function formatHunkForAnalysis(hunkCtx: HunkWithContext): string;
//# sourceMappingURL=context.d.ts.map