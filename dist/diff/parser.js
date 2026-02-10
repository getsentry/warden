/**
 * Unified diff parser - extracts hunks from patch strings
 */
/**
 * Parse a unified diff hunk header.
 * Format: @@ -oldStart,oldCount +newStart,newCount @@ optional header
 */
function parseHunkHeader(line) {
    const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
    if (!match || !match[1] || !match[3])
        return null;
    return {
        oldStart: parseInt(match[1], 10),
        oldCount: parseInt(match[2] ?? '1', 10),
        newStart: parseInt(match[3], 10),
        newCount: parseInt(match[4] ?? '1', 10),
        header: match[5]?.trim() || undefined,
    };
}
/**
 * Parse a unified diff patch into hunks.
 */
export function parsePatch(patch) {
    const lines = patch.split('\n');
    const hunks = [];
    let currentHunk = null;
    for (const line of lines) {
        const header = parseHunkHeader(line);
        if (header) {
            // Save previous hunk if exists
            if (currentHunk) {
                hunks.push({
                    ...currentHunk,
                    content: currentHunk.contentParts.join('\n'),
                });
            }
            // Start new hunk with array-based content builder
            currentHunk = {
                ...header,
                contentParts: [line],
                lines: [],
            };
        }
        else if (currentHunk) {
            // Add line to current hunk (skip diff metadata lines)
            if (!line.startsWith('diff --git') &&
                !line.startsWith('index ') &&
                !line.startsWith('--- ') &&
                !line.startsWith('+++ ') &&
                !line.startsWith('\\ No newline')) {
                currentHunk.contentParts.push(line);
                currentHunk.lines.push(line);
            }
        }
    }
    // Don't forget the last hunk
    if (currentHunk) {
        hunks.push({
            ...currentHunk,
            content: currentHunk.contentParts.join('\n'),
        });
    }
    return hunks;
}
/**
 * Parse a file's patch into a structured diff object.
 */
export function parseFileDiff(filename, patch, status = 'modified') {
    return {
        filename,
        status,
        hunks: parsePatch(patch),
        rawPatch: patch,
    };
}
/**
 * Get the line range covered by a hunk (in the new file).
 */
export function getHunkLineRange(hunk) {
    return {
        start: hunk.newStart,
        end: hunk.newStart + hunk.newCount - 1,
    };
}
/**
 * Get an expanded line range for context.
 */
export function getExpandedLineRange(hunk, contextLines = 20) {
    const range = getHunkLineRange(hunk);
    return {
        start: Math.max(1, range.start - contextLines),
        end: range.end + contextLines,
    };
}
//# sourceMappingURL=parser.js.map