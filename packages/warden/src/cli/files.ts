import { readFileSync, realpathSync, statSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import fg from 'fast-glob';
import ignore, { type Ignore } from 'ignore';
import { countPatchChunks } from '../types/index.js';
import type { FileChange } from '../types/index.js';
import type { IgnoreConfig, ScanConfig } from '../config/schema.js';
import { getPrePatchFileSkip } from '../sdk/scan-policy.js';
import { execGitNonInteractive } from '../utils/exec.js';
import { isRepoRelativePath, normalizePath } from '../utils/path.js';

/**
 * Directory patterns that are safe to prune at traversal time — before fast-glob
 * returns results. These are the same large dependency / generated-output
 * directories that BUILTIN_IGNORE_PATTERNS in scan-policy blocks after the fact.
 * Pruning them early prevents fast-glob from traversing tens-of-thousands of
 * files inside a vendor/ or node_modules/ tree when a broad glob like
 * `dieter/**\/*.php` is used against a new Laravel app.
 *
 * Exported so the gitignore fallback scan can reuse the list consistently.
 */
export const BUILTIN_PRUNE_DIRECTORY_PATTERNS = [
  '**/node_modules/**',
  '**/vendor/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/out/**',
  '**/coverage/**',
  '**/.cache/**',
] as const;

/**
 * Compute the fast-glob ignore list, starting from BUILTIN_PRUNE_DIRECTORY_PATTERNS
 * and removing any directory whose name is explicitly un-ignored by a user
 * negation pattern (e.g. `!vendor/**`).  This lets advanced users opt a
 * dependency directory back in without breaking the default safety behaviour.
 */
export function getEffectivePrunePatterns(userIgnorePaths?: string[]): string[] {
  const negations = (userIgnorePaths ?? [])
    .filter((p) => p.startsWith('!'))
    .map((p) => p.slice(1));

  if (!negations.length) {
    return [...BUILTIN_PRUNE_DIRECTORY_PATTERNS];
  }

  return BUILTIN_PRUNE_DIRECTORY_PATTERNS.filter((prunePattern) => {
    // Extract the bare directory name from a pattern like '**/vendor/**'
    const match = prunePattern.match(/\*\*\/([^/]+)\/\*\*/);
    if (!match) return true;
    const dirName = match[1];
    // Drop this prune entry if any negation path mentions the directory
    return !negations.some((neg) => neg.includes(`${dirName}/`) || neg.includes(`/${dirName}`));
  });
}

export interface ExpandGlobOptions {
  /** Working directory for glob expansion (default: process.cwd()) */
  cwd?: string;
  /** Respect .gitignore files (default: true) */
  gitignore?: boolean;
  /**
   * User-configured ignore rules from warden config.  Negation patterns inside
   * `paths` (e.g. `!vendor/**`) override the built-in directory prune list so
   * that users who intentionally want to scan dependency trees can do so.
   */
  ignore?: IgnoreConfig;
}

export interface SyntheticFileChangeOptions {
  ignore?: IgnoreConfig;
  scan?: ScanConfig;
}

function hasGlobCharacters(pattern: string): boolean {
  return pattern.includes('*') || pattern.includes('?');
}

function expandDirectoryPattern(pattern: string, cwd: string): string {
  if (hasGlobCharacters(pattern)) {
    return pattern;
  }

  try {
    if (!statSync(resolve(cwd, pattern)).isDirectory()) {
      return pattern;
    }
  } catch {
    return pattern;
  }

  const normalized = normalizePath(pattern).replace(/\/+$/, '');
  if (normalized === '' || normalized === '.') {
    return '**';
  }
  return `${normalized}/**`;
}

/**
 * Find the git root directory by walking up from the given path.
 * Returns the git root path, or null if not in a git repository.
 */
function findGitRoot(startPath: string): string | null {
  try {
    const root = execGitNonInteractive(['rev-parse', '--show-toplevel'], {
      cwd: resolve(startPath),
    });
    return root ? resolve(root) : null;
  } catch {
    return null;
  }
}

/**
 * Prefix gitignore patterns with a directory path.
 * Handles negation patterns, leading slashes, and preserves comments/empty lines.
 *
 * Note: Patterns without slashes (like *.log) are intentionally NOT prefixed
 * with **\/ because the ignore package handles them correctly - they match
 * at any depth relative to the .gitignore location when the path being tested
 * is relative to the git root with the subdir prefix included.
 */
function prefixGitignorePatterns(content: string, prefix: string): string {
  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return line;
      }

      // Handle negation patterns
      const isNegation = trimmed.startsWith('!');
      const pattern = isNegation ? trimmed.slice(1) : trimmed;

      // Handle patterns with leading slash (anchored to .gitignore location)
      // Remove leading slash to avoid double slashes: /build -> subdir/build
      const cleanPattern = pattern.startsWith('/') ? pattern.slice(1) : pattern;

      const prefixedPattern = `${prefix}/${cleanPattern}`;
      return isNegation ? `!${prefixedPattern}` : prefixedPattern;
    })
    .join('\n');
}

/**
 * Load all .gitignore files in the repository.
 * Returns an ignore instance that can check if a file path should be ignored.
 *
 * The ignore package handles the complexity of gitignore semantics:
 * - Patterns are applied relative to their .gitignore location
 * - Negation patterns (!) work correctly
 * - Directory patterns with trailing / work correctly
 */
function loadGitignoreRules(gitRoot: string): Ignore {
  const ig = ignore();

  // Always ignore .git directory
  ig.add('.git');

  // Use git to discover .gitignore files. This naturally skips ignored
  // directories (node_modules, .venv, vendor, etc.) without maintaining
  // a hardcoded exclusion list.
  let gitignoreFiles: string[];
  try {
    const output = execGitNonInteractive(
      ['ls-files', '--cached', '--others', '--exclude-standard', '.gitignore', '**/.gitignore'],
      { cwd: gitRoot }
    );
    gitignoreFiles = output
      ? output.split('\n').map((f) => resolve(gitRoot, f))
      : [];
  } catch {
    // Not a real git repo or git not available. Walk directories manually,
    // skipping large directories that would never contain relevant .gitignore
    // files.  Reuse the same prune list used by expandFileGlobs() so behaviour
    // is consistent across both code paths.
    gitignoreFiles = fg.sync('**/.gitignore', {
      cwd: gitRoot,
      absolute: true,
      dot: true,
      ignore: ['**/.git/**', ...BUILTIN_PRUNE_DIRECTORY_PATTERNS],
    });
  }

  // Sort by path depth (root first, then nested).
  // Normalize to forward slashes so depth counting works on Windows too.
  gitignoreFiles.sort(
    (a, b) => normalizePath(a).split('/').length - normalizePath(b).split('/').length
  );

  // Process gitignore files from root down (parent rules apply first)
  for (const gitignorePath of gitignoreFiles) {
    try {
      const content = readFileSync(gitignorePath, 'utf-8');
      // Use normalized paths for relative calculation
      const relativeDir = normalizePath(relative(gitRoot, dirname(gitignorePath)));

      if (relativeDir) {
        ig.add(prefixGitignorePatterns(content, relativeDir));
      } else {
        ig.add(content);
      }
    } catch {
      // Ignore read errors (e.g., permission issues)
    }
  }

  return ig;
}

/**
 * Expand glob patterns to a list of file paths.
 *
 * By default, respects .gitignore files to automatically exclude ignored
 * directories like node_modules/. This can be disabled by setting
 * gitignore: false.
 *
 * Large dependency and generated-output directories (vendor/, node_modules/,
 * dist/, …) are also pruned at traversal time via BUILTIN_PRUNE_DIRECTORY_PATTERNS
 * so that broad globs like `dieter/**\/*.php` against a Laravel app do not
 * cause fast-glob to enumerate tens-of-thousands of files before the
 * post-enumeration scan policy has a chance to skip them.
 */
export async function expandFileGlobs(
  patterns: string[],
  cwdOrOptions: string | ExpandGlobOptions = process.cwd()
): Promise<string[]> {
  const options =
    typeof cwdOrOptions === 'string' ? { cwd: cwdOrOptions } : cwdOrOptions;
  // Resolve to absolute path to handle relative paths like '.' or 'src'
  const cwd = resolve(options.cwd ?? process.cwd());
  const useGitignore = options.gitignore ?? true;
  const expandedPatterns = patterns.map((pattern) => expandDirectoryPattern(pattern, cwd));

  // Compute directory prune list, honouring user negation overrides.
  const prunePatterns = getEffectivePrunePatterns(options.ignore?.paths);

  // Enumerate matching files.  Built-in directory prune patterns are applied at
  // this stage so fast-glob never descends into vendor/ or node_modules/ trees,
  // preventing excessive memory use when scanning broad globs.  Gitignore-based
  // filtering and the full BUILTIN_IGNORE_PATTERNS check happen afterward.
  const files = await fg(expandedPatterns, {
    cwd,
    onlyFiles: true,
    absolute: true,
    dot: false,
    ignore: ['**/.git/**', ...prunePatterns],
  });

  // If gitignore is disabled, return files as-is
  if (!useGitignore) {
    return files.sort();
  }

  // Find git root - if not in a git repo, don't apply gitignore rules
  const gitRoot = findGitRoot(cwd);
  if (!gitRoot) {
    return files.sort();
  }

  // Load and apply gitignore rules
  const ig = loadGitignoreRules(gitRoot);
  const cwdRelativeToGitRoot = normalizePath(relative(gitRoot, realpathSync(cwd)));

  // Filter files using gitignore rules
  // Normalize paths to forward slashes for consistent matching
  const filteredFiles = files.filter((file) => {
    const fileRelativeToCwd = normalizePath(relative(cwd, file));
    const relativePath = cwdRelativeToGitRoot
      ? normalizePath(`${cwdRelativeToGitRoot}/${fileRelativeToCwd}`)
      : fileRelativeToCwd;
    if (!isRepoRelativePath(relativePath)) {
      return true;
    }
    return !ig.ignores(relativePath);
  });

  return filteredFiles.sort();
}

/**
 * Create a unified diff patch for a file, treating entire content as added.
 */
export function createPatchFromContent(content: string): string {
  const lines = content.split('\n');
  const lineCount = lines.length;

  // Handle empty files
  if (lineCount === 0 || (lineCount === 1 && lines[0] === '')) {
    return '@@ -0,0 +0,0 @@\n';
  }

  // Create patch header showing all lines as additions
  const patchLines = [`@@ -0,0 +1,${lineCount} @@`];

  for (const line of lines) {
    patchLines.push(`+${line}`);
  }

  return patchLines.join('\n');
}

/**
 * Read a file and create a synthetic FileChange treating it as newly added.
 * Scan limits can return a patchless placeholder without reading file content.
 */
export function createSyntheticFileChange(
  absolutePath: string,
  basePath: string,
  options: SyntheticFileChangeOptions = {}
): FileChange {
  const relativePath = normalizePath(relative(basePath, absolutePath));
  const prePatchSkip = getPrePatchFileSkip(relativePath, {
    repoPath: basePath,
    ignore: options.ignore,
    scan: options.scan,
  });
  if (prePatchSkip) {
    return {
      filename: relativePath,
      status: 'added',
      additions: 0,
      deletions: 0,
      chunks: 0,
    };
  }

  const content = readFileSync(absolutePath, 'utf-8');
  const lines = content.split('\n');
  const lineCount = lines.length;
  const patch = createPatchFromContent(content);

  return {
    filename: relativePath,
    status: 'added',
    additions: lineCount,
    deletions: 0,
    patch,
    chunks: countPatchChunks(patch),
  };
}

/**
 * Process a list of file paths into FileChange objects.
 */
export function createSyntheticFileChanges(
  absolutePaths: string[],
  basePath: string,
  options: SyntheticFileChangeOptions = {}
): FileChange[] {
  return absolutePaths.map((filePath) => createSyntheticFileChange(filePath, basePath, options));
}

/**
 * Expand glob patterns and create FileChange objects for all matching files.
 */
export async function expandAndCreateFileChanges(
  patterns: string[],
  cwd: string = process.cwd(),
  options: SyntheticFileChangeOptions = {}
): Promise<FileChange[]> {
  const resolvedCwd = resolve(cwd);
  // Pass the ignore config so that user negation patterns can override built-in
  // prune directories at traversal time (e.g. `!vendor/**` re-includes vendor).
  const files = await expandFileGlobs(patterns, { cwd: resolvedCwd, ignore: options.ignore });
  return createSyntheticFileChanges(files, resolvedCwd, options);
}
