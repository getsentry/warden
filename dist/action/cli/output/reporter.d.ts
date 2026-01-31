import type { SkillReport, Finding, FileChange } from '../../types/index.js';
import { Verbosity } from './verbosity.js';
import { type OutputMode } from './tty.js';
/**
 * Callbacks for skill runner progress reporting.
 */
export interface SkillRunnerCallbacks {
    /** Start time of the skill execution (for elapsed time calculations) */
    skillStartTime?: number;
    onFileStart?: (file: string, index: number, total: number) => void;
    onHunkStart?: (file: string, hunkNum: number, total: number, lineRange: string) => void;
    onHunkComplete?: (file: string, hunkNum: number, findings: Finding[]) => void;
    onFileComplete?: (file: string, index: number, total: number) => void;
}
/**
 * Main reporter class for CLI output.
 * Handles different verbosity levels and TTY/non-TTY modes.
 */
export declare class Reporter {
    readonly mode: OutputMode;
    readonly verbosity: Verbosity;
    constructor(mode: OutputMode, verbosity: Verbosity);
    /**
     * Output to stderr (status messages).
     */
    private log;
    /**
     * Output to stderr with timestamp (CI mode).
     */
    private logCI;
    /**
     * Print the header with logo and version.
     */
    header(): void;
    /**
     * Start the context section (e.g., "Analyzing changes from HEAD~3...")
     */
    startContext(description: string): void;
    /**
     * Display the list of files being analyzed.
     */
    contextFiles(files: FileChange[]): void;
    /**
     * Aggregate usage stats from multiple reports.
     */
    private aggregateUsage;
    /**
     * Render the summary section.
     */
    renderSummary(reports: SkillReport[], totalDuration: number): void;
    /**
     * Display the configuration section with triggers.
     */
    configTriggers(loaded: number, matched: number, triggers: {
        name: string;
        skill: string;
    }[]): void;
    /**
     * Log a step message.
     */
    step(message: string): void;
    /**
     * Log a success message.
     */
    success(message: string): void;
    /**
     * Log a file creation message (green "Created" prefix, no icon).
     */
    created(filename: string): void;
    /**
     * Log a skipped file message (yellow "Skipped" prefix with reason).
     */
    skipped(filename: string, reason?: string): void;
    /**
     * Log a warning message.
     */
    warning(message: string): void;
    /**
     * Log an error message.
     * Errors are always shown, even in quiet mode.
     */
    error(message: string): void;
    /**
     * Log a debug message.
     */
    debug(message: string): void;
    /**
     * Log a hint/tip message.
     */
    tip(message: string): void;
    /**
     * Log plain text (no prefix).
     */
    text(message: string): void;
    /**
     * Log bold text.
     */
    bold(message: string): void;
    /**
     * Output a blank line.
     */
    blank(): void;
    /**
     * Render an empty state box (e.g., "No changes found").
     */
    renderEmptyState(message: string, tip?: string): void;
}
//# sourceMappingURL=reporter.d.ts.map