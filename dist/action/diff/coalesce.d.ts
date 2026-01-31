/**
 * Hunk coalescing - merges nearby hunks into fewer, larger chunks
 * to reduce the number of LLM API calls while keeping chunk sizes manageable.
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
//# sourceMappingURL=coalesce.d.ts.map