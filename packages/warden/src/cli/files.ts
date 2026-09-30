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
 * Hard upper bound on the number of files returned by expandFileGlobs after
 * gitignore filtering.  If this limit is hit it almost always means a
 * dependency tree (vendor/, node_modules/, …) is not gitignored and the user
 * is accidentally scanning it.  Fail fast with an actionable message rather
 * than silently passing tens-of-thousands of files to the scan pipeline.
 */
export const MAX_GLOB_FILE_RESULTS = 10_000;

/**
 * Thrown by expandFileGlobs when the post-gitignore result set exceeds
 * MAX_GLOB_FILE_RESULTS.
 */
export class WardenGlobExpansionError extends Error {
  constructor(count: number, limit: number) {
    super(
      `Glob pattern matched ${count.toLocaleString()} files after gitignore filtering (limit is ${limit.toLocaleString()}).\n` +
      `This usually means a dependency directory is not excluded by .gitignore.\n` +
      `\nTry one of:\n` +
      `  • Quote the pattern to avoid shell expansion:  warden 'dieter/**/*.php'\n` +
      `  • Narrow to your application code:            warden dieter/app/**/*.php\n` +
      `  • Add the dependency directory to .gitignore:\n` +
      `      vendor/`,
    );
    this.name = 'WardenGlobExpansionError';
  }
}

export interface ExpandGlobOptions {
  /** Working directory for glob expansion (default: process.cwd()) */
  cwd?: string;
  /** Respect .gitignore files (default: true) */
  gitignore?: boolean;
}

export interface SyntheticFileChangeOptions {
  ignore?: IgnoreConfig;
  scan?: ScanConfig;
}

export interface ExpandAndCreateFileChangesOptions extends SyntheticFileChangeOptions {
  /** Base path used for FileChange filenames and scan policy (default: cwd). */
  basePath?: string;
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

  // Discover .gitignore files via git.  Using --cached + --others without
  // pathspecs and filtering client-side is intentional: pathspec-based queries
  // like `**/.gitignore` may not recurse into brand-new untracked directories
  // (e.g. a freshly-added Laravel app in dieter/) so they can miss the
  // directory's own .gitignore and fail to exclude its vendor/ tree.
  // Without pathspecs, git recurses into all untracked directories and returns
  // every non-gitignored file; we then pick out .gitignore files ourselves.
  let gitignoreFiles: string[];
  try {
    const output = execGitNonInteractive(
      ['ls-files', '--cached', '--others', '--exclude-standard'],
      { cwd: gitRoot }
    );
    gitignoreFiles = output
      ? output
        .split('\n')
        .filter((f) => f === '.gitignore' || f.endsWith('/.gitignore'))
        .map((f) => resolve(gitRoot, f))
      : [];
  } catch {
    // Not a real git repo or git not available. Walk directories manually.
    gitignoreFiles = fg.sync('**/.gitignore', {
      cwd: gitRoot,
      absolute: true,
      dot: true,
      ignore: ['**/.git/**'],
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
 * By default respects .gitignore files to automatically exclude ignored
 * directories like node_modules/ and vendor/.  This can be disabled by setting
 * gitignore: false.
 *
 * Throws WardenGlobExpansionError if the result set after gitignore filtering
 * exceeds MAX_GLOB_FILE_RESULTS, which almost always indicates an ungitignored
 * dependency directory is being scanned.
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

  // Enumerate matching files.  Only .git/ is excluded at traversal time;
  // dependency directories (vendor/, node_modules/, …) are excluded by
  // gitignore filtering below, keeping the approach policy-free and letting
  // each project's own .gitignore determine what is scanned.
  const files = await fg(expandedPatterns, {
    cwd,
    onlyFiles: true,
    absolute: true,
    dot: false,
    ignore: ['**/.git/**'],
  });

  // If gitignore is disabled, check the raw count and return as-is
  if (!useGitignore) {
    if (files.length >= MAX_GLOB_FILE_RESULTS) {
      throw new WardenGlobExpansionError(files.length, MAX_GLOB_FILE_RESULTS);
    }
    return files.sort();
  }

  // Find git root - if not in a git repo, don't apply gitignore rules
  const gitRoot = findGitRoot(cwd);
  if (!gitRoot) {
    if (files.length >= MAX_GLOB_FILE_RESULTS) {
      throw new WardenGlobExpansionError(files.length, MAX_GLOB_FILE_RESULTS);
    }
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

  // Guard after gitignore so that properly gitignored dependency directories
  // do not trigger a false positive — the limit only fires when the project's
  // .gitignore is misconfigured or missing.
  if (filteredFiles.length >= MAX_GLOB_FILE_RESULTS) {
    throw new WardenGlobExpansionError(filteredFiles.length, MAX_GLOB_FILE_RESULTS);
  }

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
  options: ExpandAndCreateFileChangesOptions = {}
): Promise<FileChange[]> {
  const resolvedCwd = resolve(cwd);
  const files = await expandFileGlobs(patterns, resolvedCwd);
  const basePath = resolve(options.basePath ?? resolvedCwd);
  return createSyntheticFileChanges(files, basePath, {
    ignore: options.ignore,
    scan: options.scan,
  });
}
