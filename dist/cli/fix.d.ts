/**
 * Fix application functionality for the warden CLI.
 */
import type { Finding, SkillReport } from '../types/index.js';
import { type Reporter } from './output/index.js';
export interface FixResult {
    success: boolean;
    finding: Finding;
    error?: string;
}
export interface FixSummary {
    applied: number;
    skipped: number;
    failed: number;
    results: FixResult[];
}
/**
 * Apply a unified diff to a file.
 * Hunks are applied in reverse order by line number to prevent line shift issues.
 */
export declare function applyUnifiedDiff(filePath: string, diff: string): void;
/**
 * Collect all fixable findings from skill reports.
 * A finding is fixable if it has both a suggestedFix.diff and a location.path.
 * Findings are sorted by file, then by line number (descending).
 */
export declare function collectFixableFindings(reports: SkillReport[]): Finding[];
/**
 * Apply all fixes without prompting.
 */
export declare function applyAllFixes(findings: Finding[]): FixSummary;
/**
 * Run the interactive fix flow.
 * Displays each fix with a colored diff and prompts the user.
 */
export declare function runInteractiveFixFlow(findings: Finding[], reporter: Reporter): Promise<FixSummary>;
/**
 * Render the fix summary.
 */
export declare function renderFixSummary(summary: FixSummary, reporter: Reporter): void;
//# sourceMappingURL=fix.d.ts.map