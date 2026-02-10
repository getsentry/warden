/**
 * Hunk coalescing and splitting - manages hunk sizes for LLM analysis.
 *
 * - splitLargeHunks: Breaks large hunks into smaller chunks at logical breakpoints
 * - coalesceHunks: Merges nearby small hunks into fewer, larger chunks
 *
 * Pipeline: parsePatch() → splitLargeHunks() → coalesceHunks() → expandDiffContext()
 */
import type { DiffHunk } from './parser.js';
/** Default maximum gap in lines between hunks to merge */
export declare const DEFAULT_MAX_GAP_LINES = 30;
/** Default maximum chunk size in characters */
export declare const DEFAULT_MAX_CHUNK_SIZE = 8000;
/**
 * Options for coalescing hunks.
 */
export interface CoalesceOptions {
    /** Max lines gap between hunks to merge (default: 30) */
    maxGapLines?: number;
    /** Target max size per chunk in characters (default: 8000) */
    maxChunkSize?: number;
}
/**
 * Coalesce hunks that are close together into larger chunks.
 *
 * This reduces the number of LLM API calls by merging nearby hunks,
 * while respecting size limits to keep chunks manageable.
 *
 * @param hunks - Array of hunks to coalesce
 * @param options - Coalescing options (maxGapLines, maxChunkSize)
 * @returns Array of coalesced hunks (may be smaller than input)
 *
 * Algorithm:
 * 1. Sort hunks by start line
 * 2. For each hunk, check if it can be merged with the previous:
 *    - Gap between hunks <= maxGapLines
 *    - Combined size <= maxChunkSize
 * 3. If both conditions are met, merge; otherwise start a new chunk
 */
export declare function coalesceHunks(hunks: DiffHunk[], options?: CoalesceOptions): DiffHunk[];
/**
 * Check if coalescing would reduce the number of hunks.
 * Useful for deciding whether to show coalescing stats.
 */
export declare function wouldCoalesceReduce(hunks: DiffHunk[], options?: CoalesceOptions): boolean;
/**
 * Options for splitting large hunks.
 */
export interface SplitOptions {
    /** Target max size per chunk in characters (default: 8000) */
    maxChunkSize?: number;
}
/**
 * Split large hunks into smaller chunks for LLM analysis.
 *
 * Large files (1000+ lines) that become single hunks in file-based analysis
 * can generate prompts exceeding practical limits. This function splits
 * such hunks at logical breakpoints (blank lines, function definitions)
 * to keep chunk sizes manageable.
 *
 * @param hunks - Array of hunks to potentially split
 * @param options - Split options (maxChunkSize)
 * @returns Array of hunks (may be larger than input if splits occurred)
 *
 * @example
 * // Pipeline usage:
 * const diff = parseFileDiff(filename, patch, status);
 * const splitHunks = splitLargeHunks(diff.hunks, { maxChunkSize: 8000 });
 * const coalescedHunks = coalesceHunks(splitHunks, { maxGapLines: 30 });
 */
export declare function splitLargeHunks(hunks: DiffHunk[], options?: SplitOptions): DiffHunk[];
//# sourceMappingURL=coalesce.d.ts.map