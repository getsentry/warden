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
 * Parse a unified diff hunk header.
 * Format: @@ -oldStart,oldCount +newStart,newCount @@ optional header
 */
function parseHunkHeader(line: string): Omit<DiffHunk, 'content' | 'lines'> | null {
  const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
  if (!match) return null;

  const oldStart = match[1];
  const newStart = match[3];
  if (!oldStart || !newStart) return null;

  return {
    oldStart: parseInt(oldStart, 10),
    oldCount: parseInt(match[2] ?? '1', 10),
    newStart: parseInt(newStart, 10),
    newCount: parseInt(match[4] ?? '1', 10),
    header: match[5]?.trim() || undefined,
  };
}

/**
 * Parse a unified diff patch into hunks.
 */
export function parsePatch(patch: string): DiffHunk[] {
  const lines = patch.split('\n');
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;

  for (const line of lines) {
    const header = parseHunkHeader(line);

    if (header) {
      // Save previous hunk if exists
      if (currentHunk) {
        hunks.push(currentHunk);
      }

      // Start new hunk
      currentHunk = {
        ...header,
        content: line,
        lines: [],
      };
    } else if (currentHunk) {
      // Add line to current hunk (skip diff metadata lines)
      if (!line.startsWith('diff --git') &&
          !line.startsWith('index ') &&
          !line.startsWith('--- ') &&
          !line.startsWith('+++ ') &&
          !line.startsWith('\\ No newline')) {
        currentHunk.content += '\n' + line;
        currentHunk.lines.push(line);
      }
    }
  }

  // Don't forget the last hunk
  if (currentHunk) {
    hunks.push(currentHunk);
  }

  return hunks;
}

/**
 * Parse a file's patch into a structured diff object.
 */
export function parseFileDiff(
  filename: string,
  patch: string,
  status: 'added' | 'removed' | 'modified' | 'renamed' = 'modified'
): ParsedDiff {
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
export function getHunkLineRange(hunk: DiffHunk): { start: number; end: number } {
  return {
    start: hunk.newStart,
    end: hunk.newStart + hunk.newCount - 1,
  };
}

/**
 * Get an expanded line range for context.
 */
export function getExpandedLineRange(
  hunk: DiffHunk,
  contextLines = 20
): { start: number; end: number } {
  const range = getHunkLineRange(hunk);
  return {
    start: Math.max(1, range.start - contextLines),
    end: range.end + contextLines,
  };
}
