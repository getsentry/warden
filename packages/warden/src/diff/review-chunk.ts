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

export type ReviewChunkFiles = [ReviewChunkFile, ...ReviewChunkFile[]];

export interface ReviewChunk {
  id: string;
  title: string;
  summary?: string;
  files: ReviewChunkFiles;
  changedLineMap: ChangedLineRange[];
}

function parseEmbeddedHunkHeader(line: string): { newStart: number; newCount: number } | undefined {
  const match = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
  if (!match?.[1]) return undefined;
  return {
    newStart: parseInt(match[1], 10),
    newCount: parseInt(match[2] ?? '1', 10),
  };
}

function linesWithHunkBoundaries(hunkCtx: HunkWithContext): string[] {
  const contentLines = hunkCtx.hunk.content.split('\n');
  const hunkHeaderCount = contentLines.filter((line) => parseEmbeddedHunkHeader(line)).length;
  return hunkHeaderCount > 1 ? contentLines : hunkCtx.hunk.lines;
}

function changedRangesFromHunk(path: string, hunkCtx: HunkWithContext): ChangedLineRange[] {
  const ranges: ChangedLineRange[] = [];
  let newLine = hunkCtx.hunk.newStart;
  let currentStart: number | undefined;
  let currentEnd: number | undefined;
  let segmentStart = hunkCtx.hunk.newStart;
  let segmentEnd = Math.max(segmentStart, segmentStart + hunkCtx.hunk.newCount - 1);
  let segmentHasAddedLine = false;
  let segmentHasDeletedLine = false;

  function flush(): void {
    if (currentStart === undefined || currentEnd === undefined) return;
    ranges.push({ path, start: currentStart, end: currentEnd });
    currentStart = undefined;
    currentEnd = undefined;
  }

  function flushDeletionOnlySegment(): void {
    flush();
    if (!segmentHasAddedLine && segmentHasDeletedLine) {
      ranges.push({ path, start: segmentStart, end: segmentEnd });
    }
    segmentHasAddedLine = false;
    segmentHasDeletedLine = false;
  }

  for (const diffLine of linesWithHunkBoundaries(hunkCtx)) {
    const embeddedHeader = parseEmbeddedHunkHeader(diffLine);
    if (embeddedHeader) {
      flushDeletionOnlySegment();
      newLine = embeddedHeader.newStart;
      segmentStart = embeddedHeader.newStart;
      segmentEnd = Math.max(segmentStart, segmentStart + embeddedHeader.newCount - 1);
      continue;
    }

    if (diffLine.startsWith('+')) {
      segmentHasAddedLine = true;
      if (currentStart === undefined) {
        currentStart = newLine;
      }
      currentEnd = newLine;
      newLine += 1;
      continue;
    }

    flush();
    if (diffLine.startsWith('-')) {
      segmentHasDeletedLine = true;
    } else if (diffLine.startsWith(' ')) {
      newLine += 1;
    }
  }

  flushDeletionOnlySegment();
  return ranges;
}

function hunkSourceLines(hunkCtx: HunkWithContext): SourceSnippetLine[] {
  const lines: SourceSnippetLine[] = [];
  for (const [index, content] of hunkCtx.contextBefore.entries()) {
    lines.push({ line: hunkCtx.contextStartLine + index, content });
  }

  let newLine = hunkCtx.hunk.newStart;
  for (const diffLine of linesWithHunkBoundaries(hunkCtx)) {
    const embeddedHeader = parseEmbeddedHunkHeader(diffLine);
    if (embeddedHeader) {
      newLine = embeddedHeader.newStart;
      continue;
    }

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
