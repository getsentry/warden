import type { SkillDefinition } from '../config/schema.js';
import type { EventContext, SkillReport, SkippedFile } from '../types/index.js';
import {
  parseFileDiff,
  expandDiffContext,
  classifyFile,
  coalesceHunks,
  splitLargeHunks,
  type HunkWithContext,
} from '../diff/index.js';
import type { PreparedFile, PrepareFilesOptions, PrepareFilesResult } from './types.js';
import { applyScanPolicy } from './scan-policy.js';
import { applyIntegrityGate, integrityGateAlwaysScans } from './integrity-gate.js';

function matchingChunkingSkipPattern(
  filename: string,
  patterns: NonNullable<PrepareFilesOptions['chunking']>['filePatterns']
): string | undefined {
  return patterns?.find((pattern) => classifyFile(filename, [pattern]) === 'skip')?.pattern;
}

/**
 * Group hunks by filename into PreparedFile entries.
 */
export function groupHunksByFile(hunks: HunkWithContext[]): PreparedFile[] {
  const fileMap = new Map<string, HunkWithContext[]>();

  for (const hunk of hunks) {
    const existing = fileMap.get(hunk.filename);
    if (existing) {
      existing.push(hunk);
    } else {
      fileMap.set(hunk.filename, [hunk]);
    }
  }

  return Array.from(fileMap, ([filename, fileHunks]) => ({ filename, hunks: fileHunks }));
}

/**
 * Prepare files for analysis by parsing patches into hunks with context.
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
  const allHunks: HunkWithContext[] = [];
  const skippedFiles: SkippedFile[] = [];

  const scanPolicy = applyScanPolicy(pr.files, {
    repoPath: context.repoPath,
    ignore: options.ignore,
    scan: options.scan,
    diffContextSource: context.diffContextSource,
    enforceChangedLineBudget: context.explicitFileTargets !== true,
    alwaysScan: options.alwaysScan,
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
    allHunks.push(...hunksWithContext);
  }

  return {
    files: groupHunksByFile(allHunks),
    skippedFiles,
  };
}

export interface PrepareSkillFilesResult extends PrepareFilesResult {
  /** Set when the skill has a deterministic gate that ran on the prepared hunks. */
  hunkGate?: NonNullable<SkillReport['hunkGate']>;
}

/**
 * Prepare files for one skill: parse the diff, then apply the skill's
 * deterministic hunk gate when it has one.
 */
export function prepareSkillFiles(
  skill: SkillDefinition,
  context: EventContext,
  options: PrepareFilesOptions = {}
): PrepareSkillFilesResult {
  const prepared = prepareFiles(context, { ...options, alwaysScan: integrityGateAlwaysScans(skill) });
  const gate = applyIntegrityGate(skill, context, prepared.files);
  if (!gate) return prepared;
  return {
    files: gate.files,
    skippedFiles: prepared.skippedFiles,
    hunkGate: { skippedHunks: gate.skippedHunks, pushScoped: gate.pushScoped },
  };
}

/** Summary for a skill run with nothing left to analyze. */
export function emptyRunSummary(hunkGate: PrepareSkillFilesResult['hunkGate']): string {
  return hunkGate && hunkGate.skippedHunks > 0
    ? 'No changes matched the skill gate'
    : 'No code changes to analyze';
}
