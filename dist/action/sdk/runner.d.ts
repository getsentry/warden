import type { SkillDefinition } from '../config/schema.js';
import type { EventContext, SkillReport, Finding, UsageStats } from '../types/index.js';
import { type HunkWithContext } from '../diff/index.js';
export declare class SkillRunnerError extends Error {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
/**
 * Aggregate multiple usage stats into one.
 */
export declare function aggregateUsage(usages: UsageStats[]): UsageStats;
/**
 * Callbacks for progress reporting during skill execution.
 */
export interface SkillRunnerCallbacks {
    /** Start time of the skill execution (for elapsed time calculations) */
    skillStartTime?: number;
    onFileStart?: (file: string, index: number, total: number) => void;
    onHunkStart?: (file: string, hunkNum: number, totalHunks: number, lineRange: string) => void;
    onHunkComplete?: (file: string, hunkNum: number, findings: Finding[]) => void;
    onFileComplete?: (file: string, index: number, total: number) => void;
}
export interface SkillRunnerOptions {
    apiKey?: string;
    maxTurns?: number;
    /** Lines of context to include around each hunk */
    contextLines?: number;
    /** Process files in parallel (default: true) */
    parallel?: boolean;
    /** Max concurrent file analyses when parallel=true (default: 5) */
    concurrency?: number;
    /** Model to use for analysis (e.g., 'claude-sonnet-4-20250514'). Uses SDK default if not specified. */
    model?: string;
    /** Progress callbacks */
    callbacks?: SkillRunnerCallbacks;
    /** Abort controller for cancellation on SIGINT */
    abortController?: AbortController;
}
/**
 * Builds the system prompt for hunk-based analysis.
 */
declare function buildHunkSystemPrompt(skill: SkillDefinition): string;
/**
 * Deduplicate findings by id and location.
 */
export declare function deduplicateFindings(findings: Finding[]): Finding[];
/**
 * A file prepared for analysis with its hunks.
 */
export interface PreparedFile {
    filename: string;
    hunks: HunkWithContext[];
}
/**
 * Options for preparing files for analysis.
 */
export interface PrepareFilesOptions {
    /** Lines of context to include around each hunk */
    contextLines?: number;
}
/**
 * Prepare files for analysis by parsing patches into hunks with context.
 * Returns files that have changes to analyze.
 */
export declare function prepareFiles(context: EventContext, options?: PrepareFilesOptions): PreparedFile[];
/**
 * Callbacks for per-file analysis progress.
 */
export interface FileAnalysisCallbacks {
    skillStartTime?: number;
    onHunkStart?: (hunkNum: number, totalHunks: number, lineRange: string) => void;
    onHunkComplete?: (hunkNum: number, findings: Finding[]) => void;
}
/**
 * Result from analyzing a single file.
 */
export interface FileAnalysisResult {
    filename: string;
    findings: Finding[];
    usage: UsageStats;
}
/**
 * Analyze a single prepared file's hunks.
 */
export declare function analyzeFile(skill: SkillDefinition, file: PreparedFile, repoPath: string, options?: SkillRunnerOptions, callbacks?: FileAnalysisCallbacks): Promise<FileAnalysisResult>;
/**
 * Run a skill on a PR, analyzing each hunk separately.
 */
export declare function runSkill(skill: SkillDefinition, context: EventContext, options?: SkillRunnerOptions): Promise<SkillReport>;
/**
 * Generate a summary of findings.
 */
export declare function generateSummary(skillName: string, findings: Finding[]): string;
export { buildHunkSystemPrompt as buildSystemPrompt };
//# sourceMappingURL=runner.d.ts.map