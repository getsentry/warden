import type { SkillReport, SeverityThreshold } from '../types/index.js';
import type { OutputMode } from './output/tty.js';
/**
 * Render skill reports for terminal output.
 * @param reports - The skill reports to render
 * @param mode - Output mode (TTY vs non-TTY)
 */
export declare function renderTerminalReport(reports: SkillReport[], mode?: OutputMode): string;
/**
 * Filter reports to only include findings at or above the given severity threshold.
 * Returns new report objects with filtered findings; does not mutate the originals.
 * If commentOn is 'off', returns reports with empty findings.
 */
export declare function filterReportsBySeverity(reports: SkillReport[], commentOn?: SeverityThreshold): SkillReport[];
/**
 * Render skill reports as JSON.
 */
export declare function renderJsonReport(reports: SkillReport[]): string;
//# sourceMappingURL=terminal.d.ts.map