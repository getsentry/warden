import type { SourceSnippetLine } from '../types/index.js';
import type { HunkWithContext } from './context.js';
import { formatHunkForAnalysis } from './context.js';

export type ReviewChunkContentMode = 'whole-file' | 'stitched-file' | 'raw-hunks';

export interface ChangedLineRange {
  path: string;
  start: number;
  end: number;
}

export interface ReviewChunkFile {
  path: string;
  language: string;
  changedRanges: ChangedLineRange[];
  content: string;
  contentMode: ReviewChunkContentMode;
  sourceLines: SourceSnippetLine[];
}

export interface ReviewChunk {
  id: string;
  title: string;
  summary?: string;
  files: ReviewChunkFile[];
  changedLineMap: ChangedLineRange[];
}

function changedRangesFromHunk(path: string, hunkCtx: HunkWithContext): ChangedLineRange[] {
  const ranges: ChangedLineRange[] = [];
  let newLine = hunkCtx.hunk.newStart;
  let currentStart: number | undefined;
  let currentEnd: number | undefined;

  function flush(): void {
    if (currentStart === undefined || currentEnd === undefined) return;
    ranges.push({ path, start: currentStart, end: currentEnd });
    currentStart = undefined;
    currentEnd = undefined;
  }

  for (const diffLine of hunkCtx.hunk.lines) {
    if (diffLine.startsWith('+')) {
      if (currentStart === undefined) {
        currentStart = newLine;
      }
      currentEnd = newLine;
      newLine += 1;
      continue;
    }

    flush();
    if (diffLine.startsWith(' ') || !diffLine.startsWith('-')) {
      newLine += 1;
    }
  }

  flush();
  if (
    ranges.length === 0
    && hunkCtx.hunk.lines.some((line) => line.startsWith('-'))
  ) {
    const start = hunkCtx.hunk.newStart;
    const end = Math.max(start, hunkCtx.hunk.newStart + hunkCtx.hunk.newCount - 1);
    return [{ path, start, end }];
  }

  return ranges;
}

function hunkSourceLines(hunkCtx: HunkWithContext): SourceSnippetLine[] {
  const lines: SourceSnippetLine[] = [];
  for (const [index, content] of hunkCtx.contextBefore.entries()) {
    lines.push({ line: hunkCtx.contextStartLine + index, content });
  }

  let newLine = hunkCtx.hunk.newStart;
  for (const diffLine of hunkCtx.hunk.lines) {
    if (diffLine.startsWith('-')) continue;
    if (!diffLine.startsWith('+') && !diffLine.startsWith(' ')) continue;
    const content = diffLine.slice(1);
    lines.push({ line: newLine, content });
    newLine += 1;
  }

  const afterStart = hunkCtx.hunk.newStart + hunkCtx.hunk.newCount;
  for (const [index, content] of hunkCtx.contextAfter.entries()) {
    lines.push({ line: afterStart + index, content });
  }

  return lines;
}

/** Convert an expanded git hunk into Warden's scanner-facing review chunk. */
export function reviewChunkFromHunk(hunkCtx: HunkWithContext): ReviewChunk {
  const changedRanges = changedRangesFromHunk(hunkCtx.filename, hunkCtx);
  const hasAddedLines = hunkCtx.hunk.lines.some((line) => line.startsWith('+'));
  const lineRange = changedRanges
    .map((range) => range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`)
    .join(',');
  const hunkCoordinate = [
    `old${hunkCtx.hunk.oldStart}-${hunkCtx.hunk.oldStart + hunkCtx.hunk.oldCount - 1}`,
    `new${hunkCtx.hunk.newStart}-${hunkCtx.hunk.newStart + hunkCtx.hunk.newCount - 1}`,
  ].join(':');
  const chunkKey = hasAddedLines ? lineRange : hunkCoordinate;

  return {
    id: `${hunkCtx.filename}:${chunkKey}`,
    title: `${hunkCtx.filename}:${chunkKey}`,
    files: [{
      path: hunkCtx.filename,
      language: hunkCtx.language,
      changedRanges,
      content: formatHunkForAnalysis(hunkCtx),
      contentMode: 'raw-hunks',
      sourceLines: hunkSourceLines(hunkCtx),
    }],
    changedLineMap: changedRanges,
  };
}
