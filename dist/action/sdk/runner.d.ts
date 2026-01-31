import type { SkillDefinition, ChunkingConfig } from '../config/schema.js';
import type { EventContext, SkillReport, Finding, UsageStats, SkippedFile, RetryConfig } from '../types/index.js';
import { type HunkWithContext } from '../diff/index.js';
export declare class SkillRunnerError extends Error {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
/**
 * Estimate token count from character count.
 * Uses chars/4 as a rough approximation for English text.
 */
export declare function estimateTokens(chars: number): number;
/**
 * Aggregate multiple usage stats into one.
 */
export declare function aggregateUsage(usages: UsageStats[]): UsageStats;
/**
 * Check if an error is retryable.
 * Retries on: rate limits (429), server errors (5xx), connection errors, timeouts.
 */
export declare function isRetryableError(error: unknown): boolean;
/**
 * Check if an error is an authentication failure.
 * These require user action (login or API key) and should not be retried.
 */
export declare function isAuthenticationError(error: unknown): boolean;
export declare class WardenAuthenticationError extends Error {
    constructor();
}
/**
 * Calculate delay for a retry attempt using exponential backoff.
 */
export declare function calculateRetryDelay(attempt: number, config: Required<RetryConfig>): number;
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
    /** Called when a prompt exceeds the large prompt threshold */
    onLargePrompt?: (file: string, lineRange: string, chars: number, estimatedTokens: number) => void;
    /** Called with prompt size info in debug mode */
    onPromptSize?: (file: string, lineRange: string, systemChars: number, userChars: number, totalChars: number, estimatedTokens: number) => void;
    /** Called when a retry attempt is made (verbose mode) */
    onRetry?: (file: string, lineRange: string, attempt: number, maxRetries: number, error: string, delayMs: number) => void;
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
    /** Delay in milliseconds between batch starts when parallel=true (default: 0) */
    batchDelayMs?: number;
    /** Model to use for analysis (e.g., 'claude-sonnet-4-20250514'). Uses SDK default if not specified. */
    model?: string;
    /** Progress callbacks */
    callbacks?: SkillRunnerCallbacks;
    /** Abort controller for cancellation on SIGINT */
    abortController?: AbortController;
    /** Path to Claude Code CLI executable. Required in CI environments. */
    pathToClaudeCodeExecutable?: string;
    /** Retry configuration for transient API failures */
    retry?: RetryConfig;
    /** Enable verbose logging for retry attempts */
    verbose?: boolean;
}
/**
 * Builds the system prompt for hunk-based analysis.
 *
 * Future enhancement: Could have the agent output a structured `contextAssessment`
 * (applicationType, trustBoundaries, filesChecked) to cache across hunks, allow
 * user overrides, or build analytics. Not implemented since we don't consume it yet.
 */
declare function buildHunkSystemPrompt(skill: SkillDefinition): string;
/**
 * Context about the PR being analyzed, for inclusion in prompts.
 *
 * The title and body (like a commit message) help explain the _intent_ of the
 * changes to the agent, enabling it to better understand what the author was
 * trying to accomplish and identify issues that conflict with that intent.
 */
export interface PRPromptContext {
    /** All files being changed in the PR */
    changedFiles: string[];
    /** PR title - explains what the change does */
    title?: string;
    /** PR description/body - explains why and provides additional context */
    body?: string | null;
}
/**
 * Result from extracting findings JSON from text.
 */
export type ExtractFindingsResult = {
    success: true;
    findings: unknown[];
} | {
    success: false;
    error: string;
    preview: string;
};
/**
 * Extract JSON object from text, handling nested braces correctly.
 * Starts from the given position and returns the balanced JSON object.
 */
export declare function extractBalancedJson(text: string, startIndex: number): string | null;
/**
 * Extract findings JSON from model output text.
 * Handles markdown code fences, prose before JSON, and nested objects.
 */
export declare function extractFindingsJson(rawText: string): ExtractFindingsResult;
/**
 * Truncate text for LLM fallback while preserving the findings JSON.
 *
 * Caller must ensure findings JSON exists in the text before calling.
 */
export declare function truncateForLLMFallback(rawText: string, maxChars: number): string;
/**
 * Extract findings from malformed output using LLM as a fallback.
 * Uses claude-haiku-4-5 for lightweight, fast extraction.
 */
export declare function extractFindingsWithLLM(rawText: string, apiKey?: string): Promise<ExtractFindingsResult>;
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
    /** Chunking configuration for file patterns and coalescing */
    chunking?: ChunkingConfig;
}
/**
 * Result from preparing files for analysis.
 */
export interface PrepareFilesResult {
    /** Files prepared for analysis */
    files: PreparedFile[];
    /** Files that were skipped due to chunking patterns */
    skippedFiles: SkippedFile[];
}
/**
 * Prepare files for analysis by parsing patches into hunks with context.
 * Returns files that have changes to analyze and files that were skipped.
 */
export declare function prepareFiles(context: EventContext, options?: PrepareFilesOptions): PrepareFilesResult;
/**
 * Callbacks for per-file analysis progress.
 */
export interface FileAnalysisCallbacks {
    skillStartTime?: number;
    onHunkStart?: (hunkNum: number, totalHunks: number, lineRange: string) => void;
    onHunkComplete?: (hunkNum: number, findings: Finding[]) => void;
    /** Called when a prompt exceeds the large prompt threshold */
    onLargePrompt?: (lineRange: string, chars: number, estimatedTokens: number) => void;
    /** Called with prompt size info in debug mode */
    onPromptSize?: (lineRange: string, systemChars: number, userChars: number, totalChars: number, estimatedTokens: number) => void;
    /** Called when a retry attempt is made (verbose mode) */
    onRetry?: (lineRange: string, attempt: number, maxRetries: number, error: string, delayMs: number) => void;
}
/**
 * Result from analyzing a single file.
 */
export interface FileAnalysisResult {
    filename: string;
    findings: Finding[];
    usage: UsageStats;
    /** Number of hunks that failed to analyze */
    failedHunks: number;
}
/**
 * Analyze a single prepared file's hunks.
 */
export declare function analyzeFile(skill: SkillDefinition, file: PreparedFile, repoPath: string, options?: SkillRunnerOptions, callbacks?: FileAnalysisCallbacks, prContext?: PRPromptContext): Promise<FileAnalysisResult>;
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