/**
 * Hunk coalescing and splitting - manages hunk sizes for LLM analysis.
 *
 * - splitLargeHunks: Breaks large hunks into smaller chunks at logical breakpoints
 * - coalesceHunks: Merges nearby small hunks into fewer, larger chunks
 *
 * Pipeline: parsePatch() → splitLargeHunks() → coalesceHunks() → expandDiffContext()
 */
/** Default maximum gap in lines between hunks to merge */
export const DEFAULT_MAX_GAP_LINES = 30;
/** Default maximum chunk size in characters */
export const DEFAULT_MAX_CHUNK_SIZE = 8000;
/**
 * Merge two adjacent hunks into one.
 *
 * The merged hunk spans from the start of the first hunk to the end of the second,
 * with content combined using '...' as a visual separator. When both hunks have
 * different headers (indicating different function/class scopes), both are preserved.
 */
function mergeHunks(a, b) {
    // Calculate the new range that spans both hunks
    const newStart = Math.min(a.newStart, b.newStart);
    const newEnd = Math.max(a.newStart + a.newCount, b.newStart + b.newCount);
    const oldStart = Math.min(a.oldStart, b.oldStart);
    const oldEnd = Math.max(a.oldStart + a.oldCount, b.oldStart + b.oldCount);
    // Combine headers when both exist and are different
    let header;
    if (a.header && b.header && a.header !== b.header) {
        header = `${a.header} → ${b.header}`;
    }
    else {
        header = a.header ?? b.header;
    }
    return {
        oldStart,
        oldCount: oldEnd - oldStart,
        newStart,
        newCount: newEnd - newStart,
        header,
        content: a.content + '\n...\n' + b.content,
        lines: [...a.lines, ...b.lines],
    };
}
/**
 * Calculate the gap in lines between two hunks.
 * Returns the number of lines between the end of hunk A and the start of hunk B.
 */
function calculateGap(a, b) {
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
export function coalesceHunks(hunks, options = {}) {
    const { maxGapLines = DEFAULT_MAX_GAP_LINES, maxChunkSize = DEFAULT_MAX_CHUNK_SIZE } = options;
    // Nothing to coalesce with 0 or 1 hunks
    if (hunks.length <= 1) {
        return hunks;
    }
    // Sort hunks by start line to ensure we process them in order
    const sorted = [...hunks].sort((a, b) => a.newStart - b.newStart);
    const result = [];
    // sorted[0] is guaranteed to exist since we checked hunks.length > 1 above
    let current = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        const gap = calculateGap(current, next);
        const combinedSize = current.content.length + next.content.length;
        // Merge if: close enough AND combined size under limit
        if (gap <= maxGapLines && combinedSize <= maxChunkSize) {
            current = mergeHunks(current, next);
        }
        else {
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
export function wouldCoalesceReduce(hunks, options = {}) {
    if (hunks.length <= 1)
        return false;
    const coalesced = coalesceHunks(hunks, options);
    return coalesced.length < hunks.length;
}
/**
 * Patterns that indicate logical breakpoints for splitting.
 * Prioritized in order: blank lines are best, then function/class definitions.
 */
const LOGICAL_BREAKPOINT_PATTERNS = [
    // Blank lines (highest priority - natural paragraph breaks)
    /^[ ]?$/,
    // Function/method definitions (various languages)
    /^[ ]?(export\s+)?(async\s+)?function\s+\w+/,
    /^[ ]?(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/,
    /^[ ]?(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?function/,
    /^[ ]?(public|private|protected)?\s*(static\s+)?(async\s+)?\w+\s*\([^)]*\)\s*[:{]/,
    /^[ ]?def\s+\w+/,
    /^[ ]?fn\s+\w+/,
    /^[ ]?func\s+\w+/,
    // Class/struct/interface definitions
    /^[ ]?(export\s+)?(abstract\s+)?class\s+\w+/,
    /^[ ]?(export\s+)?interface\s+\w+/,
    /^[ ]?(export\s+)?type\s+\w+\s*=/,
    /^[ ]?struct\s+\w+/,
    /^[ ]?impl\s+/,
    // Block comments (often precede logical sections)
    /^[ ]?\/\*\*/,
    /^[ ]?\/\//,
    /^[ ]?#\s/,
];
/**
 * Check if a line is a good logical breakpoint for splitting.
 * Returns a priority score (lower is better) or -1 if not a breakpoint.
 */
function getBreakpointPriority(line) {
    const index = LOGICAL_BREAKPOINT_PATTERNS.findIndex((pattern) => pattern.test(line));
    return index;
}
/**
 * Find the best split point in a range of lines.
 * Prefers logical breakpoints; falls back to midpoint if none found.
 *
 * @param lines - Array of lines to search
 * @param startIdx - Start index in the lines array
 * @param endIdx - End index (exclusive) in the lines array
 * @param targetIdx - Ideal split point (used for fallback)
 * @returns Index of the best split point
 */
function findBestSplitPoint(lines, startIdx, endIdx, targetIdx) {
    // Search window: look within 20% of chunk size from target
    const windowSize = Math.max(10, Math.floor((endIdx - startIdx) * 0.2));
    const searchStart = Math.max(startIdx + 1, targetIdx - windowSize);
    const searchEnd = Math.min(endIdx - 1, targetIdx + windowSize);
    let bestIdx = targetIdx;
    let bestPriority = Infinity;
    for (let i = searchStart; i <= searchEnd; i++) {
        const line = lines[i];
        if (line === undefined)
            continue;
        const priority = getBreakpointPriority(line);
        if (priority >= 0 && priority < bestPriority) {
            bestPriority = priority;
            bestIdx = i;
        }
    }
    return bestIdx;
}
/**
 * Create a sub-hunk from a portion of lines.
 *
 * @param originalHunk - The original hunk being split
 * @param lines - The lines for this sub-hunk
 * @param lineOffset - How many lines into the original hunk this sub-hunk starts
 */
function createSubHunk(originalHunk, lines, lineOffset) {
    // Calculate how many "new" lines we've passed to get the new start position
    // We need to count actual new-file lines, not just array indices
    let newLinesBeforeOffset = 0;
    let oldLinesBeforeOffset = 0;
    for (let i = 0; i < lineOffset && i < originalHunk.lines.length; i++) {
        const line = originalHunk.lines[i];
        if (line === undefined)
            continue;
        if (!line.startsWith('-')) {
            newLinesBeforeOffset++;
        }
        if (!line.startsWith('+')) {
            oldLinesBeforeOffset++;
        }
    }
    // Count lines in this sub-hunk (lines without '-' are in new file, without '+' are in old file)
    const newCount = lines.filter((line) => !line.startsWith('-')).length;
    const oldCount = lines.filter((line) => !line.startsWith('+')).length;
    // Build the @@ header for this sub-hunk
    const newStart = originalHunk.newStart + newLinesBeforeOffset;
    const oldStart = originalHunk.oldStart + oldLinesBeforeOffset;
    const header = originalHunk.header;
    const headerSuffix = header ? ` ${header}` : '';
    const hunkHeader = `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@${headerSuffix}`;
    return {
        oldStart,
        oldCount,
        newStart,
        newCount,
        header,
        content: [hunkHeader, ...lines].join('\n'),
        lines,
    };
}
/**
 * Split a single large hunk into smaller chunks.
 *
 * @param hunk - The hunk to split
 * @param maxChunkSize - Maximum size in characters per chunk
 * @returns Array of smaller hunks (may be single element if no split needed)
 */
function splitHunk(hunk, maxChunkSize) {
    // If hunk is small enough, return as-is
    if (hunk.content.length <= maxChunkSize) {
        return [hunk];
    }
    const result = [];
    const lines = hunk.lines;
    let currentStart = 0;
    while (currentStart < lines.length) {
        // Estimate how many lines fit in maxChunkSize
        // Use average line length as a rough guide
        const avgLineLength = hunk.content.length / Math.max(1, lines.length);
        const estimatedLines = Math.floor(maxChunkSize / avgLineLength);
        const targetEnd = Math.min(currentStart + estimatedLines, lines.length);
        // Calculate remaining content size
        const remainingLines = lines.slice(currentStart);
        const remainingSize = remainingLines.join('\n').length;
        // If remaining content fits in maxChunkSize, take it all
        if (remainingSize <= maxChunkSize) {
            result.push(createSubHunk(hunk, remainingLines, currentStart));
            break;
        }
        // Find best split point, ensuring we advance by at least one line
        let splitIdx = findBestSplitPoint(lines, currentStart, lines.length, targetEnd);
        if (splitIdx <= currentStart) {
            splitIdx = currentStart + 1;
        }
        // Extract lines for this chunk
        const chunkLines = lines.slice(currentStart, splitIdx);
        result.push(createSubHunk(hunk, chunkLines, currentStart));
        currentStart = splitIdx;
    }
    return result;
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
export function splitLargeHunks(hunks, options = {}) {
    const { maxChunkSize = DEFAULT_MAX_CHUNK_SIZE } = options;
    return hunks.flatMap((hunk) => splitHunk(hunk, maxChunkSize));
}
//# sourceMappingURL=coalesce.js.map