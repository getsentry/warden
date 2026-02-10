/**
 * File classification for chunking - determines how files should be processed
 */
import type { FilePattern } from '../config/schema.js';
/** Processing mode for a file */
export type FileMode = 'per-hunk' | 'whole-file' | 'skip';
/**
 * Built-in patterns that are always applied before user patterns.
 * These skip common lock files, minified code, and build artifacts.
 */
export declare const BUILTIN_SKIP_PATTERNS: string[];
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
export declare function classifyFile(filename: string, userPatterns?: FilePattern[]): FileMode;
/**
 * Check if a file should be skipped based on classification.
 */
export declare function shouldSkipFile(filename: string, userPatterns?: FilePattern[]): boolean;
//# sourceMappingURL=classify.d.ts.map