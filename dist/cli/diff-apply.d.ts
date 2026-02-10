/**
 * Pure diff application functions.
 * Apply unified diffs to file content without side effects beyond file I/O.
 */
import { type DiffHunk } from '../diff/index.js';
/**
 * Apply a single hunk to the file content lines.
 */
export declare function applyHunk(lines: string[], hunk: DiffHunk): string[];
/**
 * Apply a unified diff to a file.
 * Hunks are applied in reverse order by line number to prevent line shift issues.
 */
export declare function applyUnifiedDiff(filePath: string, diff: string): void;
//# sourceMappingURL=diff-apply.d.ts.map