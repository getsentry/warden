import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative, dirname, join } from 'node:path';
import fg from 'fast-glob';
import ignore, { type Ignore } from 'ignore';
import { countPatchChunks } from '../types/index.js';
import type { FileChange } from '../types/index.js';

export interface ExpandGlobOptions {
  /** Working directory for glob expansion (default: process.cwd()) */
  cwd?: string;
  /** Respect .gitignore files (default: true) */
  gitignore?: boolean;
}

/**
 * Find the git root directory by walking up from the given path.
 * Returns the git root path, or null if not in a git repository.
 */
function findGitRoot(startPath: string): string | null {
  let current = startPath;

  while (current !== dirname(current)) {
    const gitDir = join(current, '.git');
    if (existsSync(gitDir)) {
      return current;
    }
    current = dirname(current);
  }

  return null;
}

/**
 * Prefix gitignore patterns with a directory path.
 * Handles negation patterns and preserves comments/empty lines.
 */
function prefixGitignorePatterns(content: string, prefix: string): string {
  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return line;
      }
      if (trimmed.startsWith('!')) {
        return `!${prefix}/${trimmed.slice(1)}`;
      }
      return `${prefix}/${trimmed}`;
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
async function loadGitignoreRules(gitRoot: string, cwd: string): Promise<Ignore> {
  const ig = ignore();

  // Always ignore .git directory
  ig.add('.git');

  // Find all .gitignore files in the repository
  const gitignoreFiles = await fg('**/.gitignore', {
    cwd: gitRoot,
    absolute: true,
    dot: true,
    ignore: ['**/.git/**'],
  });

  // Also check from cwd up to git root for any .gitignore files
  // that might be outside the search scope
  let current = cwd;
  while (current !== dirname(current)) {
    const gitignorePath = join(current, '.gitignore');
    if (existsSync(gitignorePath) && !gitignoreFiles.includes(gitignorePath)) {
      gitignoreFiles.push(gitignorePath);
    }

    if (current === gitRoot) {
      break;
    }
    current = dirname(current);
  }

  // Sort by path depth (root first, then nested)
  gitignoreFiles.sort((a, b) => a.split('/').length - b.split('/').length);

  // Process gitignore files from root down (parent rules apply first)
  for (const gitignorePath of gitignoreFiles) {
    try {
      const content = readFileSync(gitignorePath, 'utf-8');
      const relativeDir = relative(gitRoot, dirname(gitignorePath));

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
 */
export async function expandFileGlobs(
  patterns: string[],
  cwdOrOptions: string | ExpandGlobOptions = process.cwd()
): Promise<string[]> {
  const options =
    typeof cwdOrOptions === 'string' ? { cwd: cwdOrOptions } : cwdOrOptions;
  const cwd = options.cwd ?? process.cwd();
  const useGitignore = options.gitignore ?? true;

  // Get all matching files first
  const files = await fg(patterns, {
    cwd,
    onlyFiles: true,
    absolute: true,
    dot: false,
    // Always exclude .git directory
    ignore: ['**/.git/**'],
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
  const ig = await loadGitignoreRules(gitRoot, cwd);

  // Filter files using gitignore rules (paths must be relative to git root)
  const filteredFiles = files.filter((file) => !ig.ignores(relative(gitRoot, file)));

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
 */
export function createSyntheticFileChange(
  absolutePath: string,
  basePath: string
): FileChange {
  const content = readFileSync(absolutePath, 'utf-8');
  const lines = content.split('\n');
  const lineCount = lines.length;
  const relativePath = relative(basePath, absolutePath);
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
  basePath: string
): FileChange[] {
  return absolutePaths.map((filePath) => createSyntheticFileChange(filePath, basePath));
}

/**
 * Expand glob patterns and create FileChange objects for all matching files.
 */
export async function expandAndCreateFileChanges(
  patterns: string[],
  cwd: string = process.cwd()
): Promise<FileChange[]> {
  const resolvedCwd = resolve(cwd);
  const files = await expandFileGlobs(patterns, resolvedCwd);
  return createSyntheticFileChanges(files, resolvedCwd);
}
