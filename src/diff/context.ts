import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DiffHunk, ParsedDiff } from './parser.js';
import { getExpandedLineRange } from './parser.js';

/** Cache for file contents to avoid repeated reads */
const fileCache = new Map<string, string[] | null>();

/** Clear the file cache (useful for testing or long-running processes) */
export function clearFileCache(): void {
  fileCache.clear();
}

/** Get cached file lines or read and cache them */
function getCachedFileLines(filePath: string): string[] | null {
  if (fileCache.has(filePath)) {
    return fileCache.get(filePath) ?? null;
  }

  if (!existsSync(filePath)) {
    fileCache.set(filePath, null);
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    fileCache.set(filePath, lines);
    return lines;
  } catch {
    // Binary file or read error
    fileCache.set(filePath, null);
    return null;
  }
}

export interface HunkWithContext {
  /** File path */
  filename: string;
  /** The hunk being analyzed */
  hunk: DiffHunk;
  /** Lines before the hunk (from actual file) */
  contextBefore: string[];
  /** Lines after the hunk (from actual file) */
  contextAfter: string[];
  /** Start line of contextBefore */
  contextStartLine: number;
  /** Detected language from file extension */
  language: string;
}

/**
 * Detect language from filename.
 */
function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    cs: 'csharp',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    swift: 'swift',
    php: 'php',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    yml: 'yaml',
    yaml: 'yaml',
    json: 'json',
    toml: 'toml',
    md: 'markdown',
    sql: 'sql',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
  };
  return languageMap[ext] ?? ext;
}

/**
 * Read specific lines from a file using the cache.
 * Returns empty array if file doesn't exist or is binary.
 */
function readFileLines(
  filePath: string,
  startLine: number,
  endLine: number
): string[] {
  const lines = getCachedFileLines(filePath);
  if (!lines) {
    return [];
  }
  // Lines are 1-indexed, arrays are 0-indexed
  return lines.slice(startLine - 1, endLine);
}

/**
 * Expand a hunk with surrounding context from the actual file.
 */
export function expandHunkContext(
  repoPath: string,
  filename: string,
  hunk: DiffHunk,
  contextLines = 20
): HunkWithContext {
  const filePath = join(repoPath, filename);
  const expandedRange = getExpandedLineRange(hunk, contextLines);

  // Read context before the hunk
  const contextBefore = readFileLines(
    filePath,
    expandedRange.start,
    hunk.newStart - 1
  );

  // Read context after the hunk
  const contextAfter = readFileLines(
    filePath,
    hunk.newStart + hunk.newCount,
    expandedRange.end
  );

  return {
    filename,
    hunk,
    contextBefore,
    contextAfter,
    contextStartLine: expandedRange.start,
    language: detectLanguage(filename),
  };
}

/**
 * Expand all hunks in a parsed diff with context.
 */
export function expandDiffContext(
  repoPath: string,
  diff: ParsedDiff,
  contextLines = 20
): HunkWithContext[] {
  return diff.hunks.map((hunk) =>
    expandHunkContext(repoPath, diff.filename, hunk, contextLines)
  );
}

/**
 * Format a hunk with context for LLM analysis.
 */
export function formatHunkForAnalysis(hunkCtx: HunkWithContext): string {
  const lines: string[] = [];

  lines.push(`## File: ${hunkCtx.filename}`);
  lines.push(`## Language: ${hunkCtx.language}`);
  lines.push(`## Hunk: lines ${hunkCtx.hunk.newStart}-${hunkCtx.hunk.newStart + hunkCtx.hunk.newCount - 1}`);

  if (hunkCtx.hunk.header) {
    lines.push(`## Scope: ${hunkCtx.hunk.header}`);
  }

  lines.push('');

  // Context before
  if (hunkCtx.contextBefore.length > 0) {
    lines.push(`### Context Before (lines ${hunkCtx.contextStartLine}-${hunkCtx.hunk.newStart - 1})`);
    lines.push('```' + hunkCtx.language);
    lines.push(hunkCtx.contextBefore.join('\n'));
    lines.push('```');
    lines.push('');
  }

  // The actual changes
  lines.push(`### Changes`);
  lines.push('```diff');
  lines.push(hunkCtx.hunk.content);
  lines.push('```');
  lines.push('');

  // Context after
  if (hunkCtx.contextAfter.length > 0) {
    const afterStart = hunkCtx.hunk.newStart + hunkCtx.hunk.newCount;
    const afterEnd = afterStart + hunkCtx.contextAfter.length - 1;
    lines.push(`### Context After (lines ${afterStart}-${afterEnd})`);
    lines.push('```' + hunkCtx.language);
    lines.push(hunkCtx.contextAfter.join('\n'));
    lines.push('```');
  }

  return lines.join('\n');
}
