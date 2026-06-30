import type { EventContext, SkippedFile } from '../types/index.js';
import {
  parseFileDiff,
  expandDiffContext,
  classifyFile,
  coalesceHunks,
  splitLargeHunks,
  reviewChunkFromHunk,
  type ReviewChunk,
} from '../diff/index.js';
import type { PreparedFile, PrepareFilesOptions, PrepareFilesResult } from './types.js';
import { applyScanPolicy } from './scan-policy.js';

function matchingChunkingSkipPattern(
  filename: string,
  patterns: NonNullable<PrepareFilesOptions['chunking']>['filePatterns']
): string | undefined {
  return patterns?.find((pattern) => classifyFile(filename, [pattern]) === 'skip')?.pattern;
}

/** Adapt atomic review chunks into the per-file shape used before semantic planning. */
export function groupChunksByFile(chunks: ReviewChunk[]): PreparedFile[] {
  const fileMap = new Map<string, ReviewChunk[]>();

  for (const chunk of chunks) {
    const filename = chunk.files[0]?.path;
    if (!filename) continue;
    const existing = fileMap.get(filename);
    if (existing) {
      existing.push(chunk);
    } else {
      fileMap.set(filename, [chunk]);
    }
  }

  return Array.from(fileMap, ([filename, chunks]) => ({ filename, chunks }));
}

/**
 * Prepare files for analysis by parsing patches into review chunks with context.
 * Returns files that have changes to analyze and files that were skipped.
 */
export function prepareFiles(
  context: EventContext,
  options: PrepareFilesOptions = {}
): PrepareFilesResult {
  const { contextLines = 20, chunking } = options;

  if (!context.pullRequest) {
    return { files: [], skippedFiles: [] };
  }

  const pr = context.pullRequest;
  const allChunks: ReviewChunk[] = [];
  const skippedFiles: SkippedFile[] = [];

  const scanPolicy = applyScanPolicy(pr.files, {
    repoPath: context.repoPath,
    ignore: options.ignore,
    scan: options.scan,
    diffContextSource: context.diffContextSource,
  });
  skippedFiles.push(...scanPolicy.skippedFiles);

  for (const file of scanPolicy.files) {
    const mode = classifyFile(file.filename, chunking?.filePatterns);
    if (mode === 'skip') {
      skippedFiles.push({
        filename: file.filename,
        reason: 'pattern',
        pattern: matchingChunkingSkipPattern(file.filename, chunking?.filePatterns),
      });
      continue;
    }

    const statusMap: Record<string, 'added' | 'removed' | 'modified' | 'renamed'> = {
      added: 'added',
      removed: 'removed',
      modified: 'modified',
      renamed: 'renamed',
      copied: 'added',
      changed: 'modified',
      unchanged: 'modified',
    };
    const status = statusMap[file.status] ?? 'modified';

    const diff = parseFileDiff(file.filename, file.patch, status);

    // Skip files with no meaningful diff content (e.g., empty files)
    if (diff.hunks.length === 0 || diff.hunks.every((h) => h.newCount === 0 && h.oldCount === 0)) {
      skippedFiles.push({ filename: file.filename, reason: 'builtin' });
      continue;
    }

    // Split large hunks first (handles large files becoming single hunks)
    const splitHunks = splitLargeHunks(diff.hunks, {
      maxChunkSize: chunking?.coalesce?.maxChunkSize,
    });

    // Then coalesce nearby small ones if enabled (default: enabled)
    const coalesceEnabled = chunking?.coalesce?.enabled !== false;
    const hunks = coalesceEnabled
      ? coalesceHunks(splitHunks, {
          maxGapLines: chunking?.coalesce?.maxGapLines,
          maxChunkSize: chunking?.coalesce?.maxChunkSize,
        })
      : splitHunks;

    const hunksWithContext = expandDiffContext(context.repoPath, { ...diff, hunks }, {
      contextLines,
      contentSource: context.diffContextSource,
    });
    const rawChunks = hunksWithContext.map(reviewChunkFromHunk);
    allChunks.push(...rawChunks);
  }

  return {
    files: groupChunksByFile(allChunks),
    skippedFiles,
  };
}
