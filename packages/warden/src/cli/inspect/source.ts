/**
 * Source resolver for `warden inspect`.
 *
 * Preference order (ISC-6, ISC-11, ISC-12):
 *   1. Readable `finding.location.path` on disk                → `kind: 'file'`
 *   2. `finding.sourceSnippet` already attached to the finding → `kind: 'snippet'`
 *   3. Everything else                                         → `kind: 'empty'`
 *
 * The working-tree file is preferred so the pane can show surrounding context.
 * The logged snippet is a fallback when the file is missing or unreadable.
 *
 * This module is pure TypeScript — no Ink, no CLI dispatch.
 */

import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import type { Finding, SourceSnippet } from '../../types/index.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** The source came from `finding.sourceSnippet`. Title: `Source - Snippet` */
export interface SnippetSource {
  kind: 'snippet';
  /** Exact title string required by ISC-6. */
  title: 'Source - Snippet';
  snippet: SourceSnippet;
}

/** The source was hydrated from the working tree. Title: `Source - File: <rel>` */
export interface FileSource {
  kind: 'file';
  /** Exact title string required by ISC-6, e.g. `Source - File: src/foo.ts` */
  title: string;
  /** Absolute path that was read. */
  absolutePath: string;
  /** Relative path used in the title (relative to repoRoot). */
  relativePath: string;
  /** Full file content split into lines (1-indexed via `lines[lineNo - 1]`). */
  lines: string[];
  /** 1-based start of the finding range, or undefined when location is absent. */
  startLine?: number;
  /** 1-based end of the finding range, or undefined when location is absent. */
  endLine?: number;
  /** Language hint from `finding.location.path` extension, or undefined. */
  language?: string;
}

/** No source is available (no snippet, unreadable/absent file, no location). */
export interface EmptySource {
  kind: 'empty';
  reason: string;
}

export type ResolvedSource = SnippetSource | FileSource | EmptySource;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface ResolveSourceOptions {
  /**
   * Repo root used to resolve relative `location.path` values.
   * Falls back to `cwd` when omitted.
   */
  repoRoot?: string;
  /**
   * Working directory recorded in the JSONL log (`run.cwd`).
   * Used as a secondary base when the path cannot be found under `repoRoot`.
   */
  cwd?: string;
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

/**
 * Resolve the source view for a single finding.
 *
 * Never throws — if anything goes wrong the result is `kind: 'empty'`.
 */
export function resolveSource(
  finding: Finding,
  options: ResolveSourceOptions = {},
): ResolvedSource {
  // 1. Prefer the working-tree file so the pane has full surrounding context.
  if (finding.location?.path) {
    const fileSource = hydrateFromDisk(finding, options);
    if (fileSource) return fileSource;
  }

  // 2. Fall back to the logged snippet when the file is missing or unreadable.
  if (finding.sourceSnippet) {
    return {
      kind: 'snippet',
      title: 'Source - Snippet',
      snippet: finding.sourceSnippet,
    };
  }

  if (!finding.location?.path) {
    return { kind: 'empty', reason: 'No source location available.' };
  }

  return {
    kind: 'empty',
    reason: `Source file not found: ${finding.location.path}`,
  };
}

function hydrateFromDisk(
  finding: Finding,
  options: ResolveSourceOptions,
): FileSource | undefined {
  const location = finding.location;
  if (!location?.path) return undefined;

  const resolved = resolvePath(location.path, options.repoRoot, options.cwd);
  if (!resolved) return undefined;

  let content: string;
  try {
    content = readFileSync(resolved.absolutePath, 'utf-8');
  } catch {
    return undefined;
  }

  const lines = content.split('\n');
  // Remove a trailing empty element caused by a final newline.
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return {
    kind: 'file',
    title: `Source - File: ${resolved.relativePath}`,
    absolutePath: resolved.absolutePath,
    relativePath: resolved.relativePath,
    lines,
    startLine: location.startLine,
    endLine: location.endLine,
    language: languageFromPath(location.path),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Candidate relative paths for a logged location.
 *
 * Some logs store a path that already includes a parent of the repo
 * (`packages/warden/src/foo.ts` while repoRoot is the monorepo root, or
 * `warden/src/foo.ts` while cwd is `packages/warden`). Walk suffixes until
 * one exists under a known base.
 */
function locationCandidates(locationPath: string): string[] {
  const normalized = locationPath.replace(/\\/g, '/').replace(/^\.\/+/, '');
  const parts = normalized.split('/').filter(Boolean);
  const candidates: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    candidates.push(parts.slice(i).join('/'));
  }
  return candidates;
}

function resolvePath(
  locationPath: string,
  repoRoot?: string,
  cwd?: string,
): { absolutePath: string; relativePath: string } | undefined {
  // Absolute paths are used as-is.
  if (isAbsolute(locationPath)) {
    if (!existsSync(locationPath)) return undefined;
    const base = repoRoot ?? cwd ?? process.cwd();
    return {
      absolutePath: locationPath,
      relativePath: relative(base, locationPath),
    };
  }

  // Try bases in preference order: repoRoot → cwd → process.cwd().
  const bases = [repoRoot, cwd, process.cwd()].filter((b): b is string => Boolean(b));
  const seen = new Set<string>();
  for (const base of bases) {
    for (const candidateRel of locationCandidates(locationPath)) {
      const candidate = join(base, candidateRel);
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      if (existsSync(candidate)) {
        return {
          absolutePath: candidate,
          relativePath: relative(base, candidate) || candidateRel,
        };
      }
    }
  }

  return undefined;
}

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
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
  xml: 'xml',
};

function languageFromPath(filePath: string): string | undefined {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (!ext) return undefined;
  return EXTENSION_LANGUAGE_MAP[ext];
}
