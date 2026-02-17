import type { Finding, UsageStats, SkippedFile, RetryConfig } from '../types/index.js';
import type { HunkWithContext } from '../diff/index.js';
import type { ChunkingConfig } from '../config/schema.js';

/** A single auxiliary usage entry, keyed by agent name (e.g. 'extraction', 'dedup'). */
export interface AuxiliaryUsageEntry {
  agent: string;
  usage: UsageStats;
}

/** Default concurrency for file-level parallel processing */
export const DEFAULT_FILE_CONCURRENCY = 5;

/** Threshold in characters above which to warn about large prompts (~25k tokens) */
export const LARGE_PROMPT_THRESHOLD_CHARS = 100000;

/** Result from analyzing a single hunk */
export interface HunkAnalysisResult {
  findings: Finding[];
  usage: UsageStats;
  /** Whether the hunk analysis failed (SDK error, API error, etc.) */
  failed: boolean;
  /** Whether findings extraction failed (JSON parse error, both tiers failed) */
  extractionFailed: boolean;
  /** Error message if extraction failed */
  extractionError?: string;
  /** Preview of the output that failed to parse */
  extractionPreview?: string;
  /** Usage from auxiliary LLM calls (e.g., extraction repair) */
  auxiliaryUsage?: AuxiliaryUsageEntry[];
}

/**
 * Callbacks for progress reporting during skill execution.
 */
export interface SkillRunnerCallbacks {
  /** Start time of the skill execution (for elapsed time calculations) */
  skillStartTime?: number;
  onFileStart?: (file: string, index: number, total: number) => void;
  onHunkStart?: (file: string, hunkNum: number, totalHunks: number, lineRange: string) => void;
  onHunkComplete?: (file: string, hunkNum: number, findings: Finding[], usage: UsageStats) => void;
  onFileComplete?: (file: string, index: number, total: number) => void;
  /** Called when a prompt exceeds the large prompt threshold */
  onLargePrompt?: (file: string, lineRange: string, chars: number, estimatedTokens: number) => void;
  /** Called with prompt size info in debug mode */
  onPromptSize?: (file: string, lineRange: string, systemChars: number, userChars: number, totalChars: number, estimatedTokens: number) => void;
  /** Called when a retry attempt is made (verbose mode) */
  onRetry?: (file: string, lineRange: string, attempt: number, maxRetries: number, error: string, delayMs: number) => void;
  /** Called when findings extraction fails (both regex and LLM fallback failed) */
  onExtractionFailure?: (file: string, lineRange: string, error: string, preview: string) => void;
  /** Called with extraction result details (debug mode) */
  onExtractionResult?: (file: string, lineRange: string, findingsCount: number, method: 'regex' | 'llm' | 'none') => void;
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
 * Callbacks for per-file analysis progress.
 */
export interface FileAnalysisCallbacks {
  skillStartTime?: number;
  onHunkStart?: (hunkNum: number, totalHunks: number, lineRange: string) => void;
  onHunkComplete?: (hunkNum: number, findings: Finding[], usage: UsageStats) => void;
  /** Called when a prompt exceeds the large prompt threshold */
  onLargePrompt?: (lineRange: string, chars: number, estimatedTokens: number) => void;
  /** Called with prompt size info in debug mode */
  onPromptSize?: (lineRange: string, systemChars: number, userChars: number, totalChars: number, estimatedTokens: number) => void;
  /** Called when a retry attempt is made (verbose mode) */
  onRetry?: (lineRange: string, attempt: number, maxRetries: number, error: string, delayMs: number) => void;
  /** Called when findings extraction fails (both regex and LLM fallback failed) */
  onExtractionFailure?: (lineRange: string, error: string, preview: string) => void;
  /** Called with extraction result details (debug mode) */
  onExtractionResult?: (lineRange: string, findingsCount: number, method: 'regex' | 'llm' | 'none') => void;
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
  /** Number of hunks where findings extraction failed */
  failedExtractions: number;
  /** Usage from auxiliary LLM calls across all hunks */
  auxiliaryUsage?: AuxiliaryUsageEntry[];
}

/**
 * Callbacks for prompt size reporting during hunk analysis.
 */
export interface HunkAnalysisCallbacks {
  lineRange: string;
  onLargePrompt?: (lineRange: string, chars: number, estimatedTokens: number) => void;
  onPromptSize?: (lineRange: string, systemChars: number, userChars: number, totalChars: number, estimatedTokens: number) => void;
  onRetry?: (lineRange: string, attempt: number, maxRetries: number, error: string, delayMs: number) => void;
  onExtractionFailure?: (lineRange: string, error: string, preview: string) => void;
  /** Called with extraction result details (debug mode) */
  onExtractionResult?: (lineRange: string, findingsCount: number, method: 'regex' | 'llm' | 'none') => void;
}
