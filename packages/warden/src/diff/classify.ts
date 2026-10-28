/**
 * File classification for chunking - determines how files should be processed
 */

import { matchGlob } from '../triggers/matcher.js';
import type { FilePattern } from '../config/schema.js';

/** Processing mode for a file */
export type FileMode = 'per-hunk' | 'whole-file' | 'skip';

/**
 * Classify a file to determine how it should be processed.
 *
 * @param filename - The file path to classify
 * @param userPatterns - Optional user-defined chunking patterns
 * @returns The processing mode: 'per-hunk', 'whole-file', or 'skip'
 */
export function classifyFile(
  filename: string,
  userPatterns?: FilePattern[]
): FileMode {
  for (const { pattern, mode } of userPatterns ?? []) {
    if (matchGlob(pattern, filename)) {
      return mode;
    }
  }

  return 'per-hunk';
}
