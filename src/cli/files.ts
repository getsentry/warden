import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import fg from 'fast-glob';
import type { FileChange } from '../types/index.js';

/**
 * Expand glob patterns to a list of file paths.
 */
export async function expandFileGlobs(
  patterns: string[],
  cwd: string = process.cwd()
): Promise<string[]> {
  const files = await fg(patterns, {
    cwd,
    onlyFiles: true,
    absolute: true,
    dot: false,
  });

  return files.sort();
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

  return {
    filename: relativePath,
    status: 'added',
    additions: lineCount,
    deletions: 0,
    patch: createPatchFromContent(content),
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
