import { parsePatch } from './parser.js';

/**
 * Apply a unified diff to file content.
 * Returns the modified content.
 */
export function applyDiffToContent(content: string, diff: string): string {
  const hunks = parsePatch(diff);
  if (hunks.length === 0) {
    throw new Error('No valid hunks found in diff');
  }

  const lines = content.split('\n');

  // Apply from bottom to top to avoid shifting line indices.
  const sortedHunks = [...hunks].sort((a, b) => b.oldStart - a.oldStart);

  for (const hunk of sortedHunks) {
    const oldLines: string[] = [];
    const newLines: string[] = [];

    for (const line of hunk.lines) {
      if (line.startsWith('-')) {
        oldLines.push(line.slice(1));
      } else if (line.startsWith('+')) {
        newLines.push(line.slice(1));
      } else if (line.startsWith(' ') || line === '') {
        const contextLine = line.startsWith(' ') ? line.slice(1) : line;
        oldLines.push(contextLine);
        newLines.push(contextLine);
      }
    }

    const startIndex = hunk.oldStart - 1;

    for (let i = 0; i < oldLines.length; i++) {
      const lineIndex = startIndex + i;
      if (lineIndex >= lines.length) {
        throw new Error(`Hunk context mismatch: line ${lineIndex + 1} doesn't exist`);
      }
      if (lines[lineIndex] !== oldLines[i]) {
        throw new Error(
          `Hunk context mismatch at line ${lineIndex + 1}: expected "${oldLines[i]}", got "${lines[lineIndex]}"`
        );
      }
    }

    lines.splice(startIndex, oldLines.length, ...newLines);
  }

  return lines.join('\n');
}
