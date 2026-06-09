/**
 * File classification for chunking - determines how files should be processed
 */

import { matchGlob } from '../triggers/matcher.js';
import type { FilePattern } from '../config/schema.js';

/** Processing mode for a file */
export type FileMode = 'per-hunk' | 'whole-file' | 'skip';

/**
 * Built-in patterns that are always applied before user patterns.
 * These skip common lock files, minified code, and build artifacts.
 */
export const BUILTIN_SKIP_PATTERNS = [
  // Package manager lock files
  '**/pnpm-lock.yaml',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/Cargo.lock',
  '**/go.sum',
  '**/poetry.lock',
  '**/composer.lock',
  '**/Gemfile.lock',
  '**/Pipfile.lock',
  '**/bun.lockb',

  // Minified/bundled code
  '**/*.min.js',
  '**/*.min.css',
  '**/*.bundle.js',
  '**/*.bundle.css',

  // Build artifacts
  '**/dist/**',
  '**/build/**',
  '**/node_modules/**',
  '**/.next/**',
  '**/out/**',
  '**/coverage/**',

  // Generated code
  '**/*.generated.*',
  '**/*.g.ts',
  '**/*.g.dart',
  '**/generated/**',
  '**/__generated__/**',
];

/**
 * Classify a file to determine how it should be processed.
 *
 * @param filename - The file path to classify
 * @param userPatterns - Optional user-defined patterns (can override built-ins)
 * @returns The processing mode: 'per-hunk', 'whole-file', or 'skip'
 *
 * Order of precedence:
 * 1. User patterns are checked first (higher priority, allows overriding built-ins)
 * 2. Built-in skip patterns are checked second
 * 3. Default is 'per-hunk' if no patterns match
 */
export function classifyFile(
  filename: string,
  userPatterns?: FilePattern[]
): FileMode {
  // Check user patterns first (allows overriding built-in skips)
  for (const { pattern, mode } of userPatterns ?? []) {
    if (matchGlob(pattern, filename)) {
      return mode;
    }
  }

  // Check built-in skip patterns
  for (const pattern of BUILTIN_SKIP_PATTERNS) {
    if (matchGlob(pattern, filename)) {
      return 'skip';
    }
  }

  // Default: process per-hunk
  return 'per-hunk';
}

/**
 * Check if a file should be skipped based on classification.
 */
export function shouldSkipFile(
  filename: string,
  userPatterns?: FilePattern[]
): boolean {
  return classifyFile(filename, userPatterns) === 'skip';
}
