/**
 * Hunk coalescing - merges nearby hunks into fewer, larger chunks
 * to reduce the number of LLM API calls while keeping chunk sizes manageable.
 */

import type { DiffHunk } from './parser.js';

/** Default maximum gap in lines between hunks to merge */
export const DEFAULT_MAX_GAP_LINES = 30;

/** Default maximum chunk size in characters */
export const DEFAULT_MAX_CHUNK_SIZE = 8000;

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
 * Merge two adjacent hunks into one.
 *
 * The merged hunk spans from the start of the first hunk to the end of the second,
 * with content combined using '...' as a visual separator.
 */
function mergeHunks(a: DiffHunk, b: DiffHunk): DiffHunk {
  // Calculate the new range that spans both hunks
  const newStart = Math.min(a.newStart, b.newStart);
  const newEnd = Math.max(a.newStart + a.newCount, b.newStart + b.newCount);
  const oldStart = Math.min(a.oldStart, b.oldStart);
  const oldEnd = Math.max(a.oldStart + a.oldCount, b.oldStart + b.oldCount);

  return {
    oldStart,
    oldCount: oldEnd - oldStart,
    newStart,
    newCount: newEnd - newStart,
    header: a.header, // Keep first hunk's header
    content: a.content + '\n...\n' + b.content,
    lines: [...a.lines, ...b.lines],
  };
}

/**
 * Calculate the gap in lines between two hunks.
 * Returns the number of lines between the end of hunk A and the start of hunk B.
 */
function calculateGap(a: DiffHunk, b: DiffHunk): number {
  const aEnd = a.newStart + a.newCount;
  return b.newStart - aEnd;
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
export function coalesceHunks(
  hunks: DiffHunk[],
  options: CoalesceOptions = {}
): DiffHunk[] {
  const { maxGapLines = DEFAULT_MAX_GAP_LINES, maxChunkSize = DEFAULT_MAX_CHUNK_SIZE } = options;

  // Nothing to coalesce with 0 or 1 hunks
  if (hunks.length <= 1) {
    return hunks;
  }

  // Sort hunks by start line to ensure we process them in order
  const sorted = [...hunks].sort((a, b) => a.newStart - b.newStart);

  const result: DiffHunk[] = [];
  const first = sorted[0];
  if (!first) {
    return hunks;
  }
  let current = first;

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (!next) continue;
    const gap = calculateGap(current, next);
    const combinedSize = current.content.length + next.content.length;

    // Merge if: close enough AND combined size under limit
    if (gap <= maxGapLines && combinedSize <= maxChunkSize) {
      current = mergeHunks(current, next);
    } else {
      // Can't merge - save current and start a new chunk
      result.push(current);
      current = next;
    }
  }

  // Don't forget the last chunk
  result.push(current);

  return result;
}

/**
 * Check if coalescing would reduce the number of hunks.
 * Useful for deciding whether to show coalescing stats.
 */
export function wouldCoalesceReduce(
  hunks: DiffHunk[],
  options: CoalesceOptions = {}
): boolean {
  if (hunks.length <= 1) return false;
  const coalesced = coalesceHunks(hunks, options);
  return coalesced.length < hunks.length;
}
