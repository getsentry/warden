/**
 * Pure diff application functions.
 * Apply unified diffs to file content without side effects beyond file I/O.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parsePatch, type DiffHunk } from '../diff/index.js';

/**
 * Apply a single hunk to the file content lines.
 */
export function applyHunk(lines: string[], hunk: DiffHunk): string[] {
  const result = [...lines];
  const oldLines: string[] = [];
  const newLines: string[] = [];

  for (const line of hunk.lines) {
    const prefix = line[0] ?? '';
    const content = line.slice(1);

    switch (prefix) {
      case '-':
        oldLines.push(content);
        break;
      case '+':
        newLines.push(content);
        break;
      case ' ':
      case '':
        // Context line appears in both old and new
        oldLines.push(content);
        newLines.push(content);
        break;
    }
  }

  // Convert 1-based line number to 0-based index.
  // New file diffs use @@ -0,0 +1,N @@, so clamp to 0.
  const startIndex = Math.max(0, hunk.oldStart - 1);

  for (let i = 0; i < oldLines.length; i++) {
    const lineIndex = startIndex + i;
    if (lineIndex >= result.length) {
      throw new Error(`Hunk context mismatch: line ${lineIndex + 1} doesn't exist`);
    }
    if (result[lineIndex] !== oldLines[i]) {
      throw new Error(
        `Hunk context mismatch at line ${lineIndex + 1}: ` +
          `expected "${oldLines[i]}", got "${result[lineIndex]}"`
      );
    }
  }

  result.splice(startIndex, oldLines.length, ...newLines);
  return result;
}

/**
 * Apply a unified diff to a file.
 * Hunks are applied in reverse order by line number to prevent line shift issues.
 */
export function applyUnifiedDiff(filePath: string, diff: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const hunks = parsePatch(diff);
  if (hunks.length === 0) {
    throw new Error('No valid hunks found in diff');
  }

  const content = readFileSync(filePath, 'utf-8');
  let lines = content.split('\n');

  // Sort hunks by oldStart in descending order to apply from bottom to top
  const sortedHunks = [...hunks].sort((a, b) => b.oldStart - a.oldStart);

  for (const hunk of sortedHunks) {
    lines = applyHunk(lines, hunk);
  }

  writeFileSync(filePath, lines.join('\n'));
}
