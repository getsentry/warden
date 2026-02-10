/**
 * Unified diff parser - extracts hunks from patch strings
 */
export interface DiffHunk {
    /** Original file start line */
    oldStart: number;
    /** Original file line count */
    oldCount: number;
    /** New file start line */
    newStart: number;
    /** New file line count */
    newCount: number;
    /** Optional header (function/class name) */
    header?: string;
    /** The raw hunk content including the @@ line */
    content: string;
    /** Just the changed lines (without @@ header) */
    lines: string[];
}
export interface ParsedDiff {
    /** File path */
    filename: string;
    /** File status */
    status: 'added' | 'removed' | 'modified' | 'renamed';
    /** Individual hunks in this file */
    hunks: DiffHunk[];
    /** The full patch string */
    rawPatch: string;
}
/**
 * Parse a unified diff patch into hunks.
 */
export declare function parsePatch(patch: string): DiffHunk[];
/**
 * Parse a file's patch into a structured diff object.
 */
export declare function parseFileDiff(filename: string, patch: string, status?: 'added' | 'removed' | 'modified' | 'renamed'): ParsedDiff;
/**
 * Get the line range covered by a hunk (in the new file).
 */
export declare function getHunkLineRange(hunk: DiffHunk): {
    start: number;
    end: number;
};
/**
 * Get an expanded line range for context.
 */
export declare function getExpandedLineRange(hunk: DiffHunk, contextLines?: number): {
    start: number;
    end: number;
};
//# sourceMappingURL=parser.d.ts.map