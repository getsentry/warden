import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { DiffHunk, ParsedDiff } from './parser.js';
import { getExpandedLineRange } from './parser.js';
import type { DiffContextSource } from '../types/index.js';
import { GIT_NON_INTERACTIVE_ENV } from '../utils/exec.js';

/** Cache for file contents to avoid repeated reads */
const fileCache = new Map<string, string[] | null>();

export interface ExpandContextOptions {
  /** Number of context lines to read before and after each hunk */
  contextLines?: number;
  /** Source tree to read hunk context from */
  contentSource?: DiffContextSource;
}

/** Clear the file cache (useful for testing or long-running processes) */
export function clearFileCache(): void {
  fileCache.clear();
}

/** Get cached file lines or read and cache them */
function normalizeOptions(options: number | ExpandContextOptions): Required<ExpandContextOptions> {
  if (typeof options === 'number') {
    return {
      contextLines: options,
      contentSource: { type: 'working-tree' },
    };
  }

  return {
    contextLines: options.contextLines ?? 20,
    contentSource: options.contentSource ?? { type: 'working-tree' },
  };
}

function cacheKey(repoPath: string, filename: string, source: DiffContextSource): string {
  const sourceKey = source.type === 'git-ref' ? `${source.type}:${source.ref}` : source.type;
  return `${sourceKey}:${repoPath}:${filename}`;
}

function isInsideRepo(repoPath: string, filename: string): boolean {
  const resolvedRepo = resolve(repoPath);
  const resolvedFile = resolve(join(repoPath, filename));
  return resolvedFile === resolvedRepo || resolvedFile.startsWith(resolvedRepo + '/');
}

function readWorkingTreeLines(repoPath: string, filename: string): string[] | null {
  const filePath = join(repoPath, filename);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return content.split('\n');
  } catch {
    // Binary file or read error
    return null;
  }
}

function readGitSourceLines(
  repoPath: string,
  filename: string,
  source: Extract<DiffContextSource, { type: 'git-index' | 'git-ref' }>
): string[] | null {
  const refPath = source.type === 'git-index'
    ? `:${filename}`
    : `${source.ref}:${filename}`;

  const result = spawnSync('git', ['show', refPath], {
    cwd: repoPath,
    encoding: 'utf-8',
    env: { ...process.env, ...GIT_NON_INTERACTIVE_ENV },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error || result.status !== 0 || typeof result.stdout !== 'string') {
    return null;
  }

  return result.stdout.split('\n');
}

/** Get cached file lines or read and cache them */
function getCachedFileLines(
  repoPath: string,
  filename: string,
  source: DiffContextSource
): string[] | null {
  const key = cacheKey(repoPath, filename, source);
  if (fileCache.has(key)) {
    return fileCache.get(key) ?? null;
  }

  if (!isInsideRepo(repoPath, filename)) {
    fileCache.set(key, null);
    return null;
  }

  const lines = source.type === 'working-tree'
    ? readWorkingTreeLines(repoPath, filename)
    : readGitSourceLines(repoPath, filename, source);

  fileCache.set(key, lines);
  return lines;
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
  repoPath: string,
  filename: string,
  source: DiffContextSource,
  startLine: number,
  endLine: number
): string[] {
  const lines = getCachedFileLines(repoPath, filename, source);
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
  options: number | ExpandContextOptions = 20
): HunkWithContext {
  const { contextLines, contentSource } = normalizeOptions(options);

  // Defense-in-depth: ensure filename doesn't escape repo directory
  if (!isInsideRepo(repoPath, filename)) {
    return { filename, hunk, contextBefore: [], contextAfter: [], contextStartLine: 1, language: detectLanguage(filename) };
  }

  const expandedRange = getExpandedLineRange(hunk, contextLines);

  // Read context before the hunk
  const contextBefore = readFileLines(
    repoPath,
    filename,
    contentSource,
    expandedRange.start,
    hunk.newStart - 1
  );

  // Read context after the hunk
  const contextAfter = readFileLines(
    repoPath,
    filename,
    contentSource,
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
  options: number | ExpandContextOptions = 20
): HunkWithContext[] {
  return diff.hunks.map((hunk) =>
    expandHunkContext(repoPath, diff.filename, hunk, options)
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
