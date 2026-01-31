import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { query, type SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import Anthropic from '@anthropic-ai/sdk';
import type { SkillDefinition, ChunkingConfig } from '../config/schema.js';
import { FindingSchema } from '../types/index.js';
import type { EventContext, SkillReport, Finding, UsageStats, SkippedFile, RetryConfig } from '../types/index.js';
import {
  APIError,
  RateLimitError,
  InternalServerError,
  APIConnectionError,
  APIConnectionTimeoutError,
} from '@anthropic-ai/sdk';
import {
  parseFileDiff,
  expandDiffContext,
  formatHunkForAnalysis,
  classifyFile,
  coalesceHunks,
  type HunkWithContext,
} from '../diff/index.js';

export class SkillRunnerError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SkillRunnerError';
  }
}

/** Default concurrency for file-level parallel processing */
const DEFAULT_FILE_CONCURRENCY = 5;

/** Pattern to match the start of findings JSON (allows whitespace after brace) */
const FINDINGS_JSON_START = /\{\s*"findings"/;

/** Threshold in characters above which to warn about large prompts (~25k tokens) */
const LARGE_PROMPT_THRESHOLD_CHARS = 100000;

/**
 * Estimate token count from character count.
 * Uses chars/4 as a rough approximation for English text.
 */
export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

/** Result from analyzing a single hunk */
interface HunkAnalysisResult {
  findings: Finding[];
  usage: UsageStats;
  /** Whether the hunk analysis failed (SDK error, API error, etc.) */
  failed: boolean;
}

/**
 * Extract usage stats from an SDK result message.
 */
function extractUsage(result: SDKResultMessage): UsageStats {
  return {
    inputTokens: result.usage['input_tokens'],
    outputTokens: result.usage['output_tokens'],
    cacheReadInputTokens: result.usage['cache_read_input_tokens'] ?? 0,
    cacheCreationInputTokens: result.usage['cache_creation_input_tokens'] ?? 0,
    costUSD: result.total_cost_usd,
  };
}

/**
 * Create empty usage stats.
 */
function emptyUsage(): UsageStats {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    costUSD: 0,
  };
}

/**
 * Aggregate multiple usage stats into one.
 */
export function aggregateUsage(usages: UsageStats[]): UsageStats {
  return usages.reduce(
    (acc, u) => ({
      inputTokens: acc.inputTokens + u.inputTokens,
      outputTokens: acc.outputTokens + u.outputTokens,
      cacheReadInputTokens: (acc.cacheReadInputTokens ?? 0) + (u.cacheReadInputTokens ?? 0),
      cacheCreationInputTokens: (acc.cacheCreationInputTokens ?? 0) + (u.cacheCreationInputTokens ?? 0),
      costUSD: acc.costUSD + u.costUSD,
    }),
    emptyUsage()
  );
}

/** Default retry configuration */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
};

/**
 * Check if an error is retryable.
 * Retries on: rate limits (429), server errors (5xx), connection errors, timeouts.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof RateLimitError) return true;
  if (error instanceof InternalServerError) return true;
  if (error instanceof APIConnectionError) return true;
  if (error instanceof APIConnectionTimeoutError) return true;

  // Check for generic APIError with retryable status codes
  if (error instanceof APIError) {
    const status = error.status;
    if (status === 429) return true;
    if (status !== undefined && status >= 500 && status < 600) return true;
  }

  return false;
}

/**
 * Calculate delay for a retry attempt using exponential backoff.
 */
export function calculateRetryDelay(
  attempt: number,
  config: Required<RetryConfig>
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Sleep for a specified duration, respecting abort signal.
 */
async function sleep(ms: number, abortSignal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }

    const timeout = setTimeout(resolve, ms);

    abortSignal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Aborted'));
    }, { once: true });
  });
}

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
function buildHunkSystemPrompt(skill: SkillDefinition): string {
  const sections = [
    `<role>
You are a code analysis agent for Warden. You evaluate code changes against specific skill criteria and report findings ONLY when the code violates or conflicts with those criteria. You do not perform general code review or report issues outside the skill's scope.
</role>`,

    `<tools>
You have access to these tools to gather context:
- **Read**: Check related files to understand context
- **Grep**: Search for patterns to trace data flow or find related code
</tools>`,

    `<skill_instructions>
The following defines the ONLY criteria you should evaluate. Do not report findings outside this scope:

${skill.prompt}
</skill_instructions>`,

    `<output_format>
IMPORTANT: Your response must be ONLY a valid JSON object. No markdown, no explanation, no code fences.

Example response format:
{"findings": [{"id": "example-1", "severity": "medium", "confidence": "high", "title": "Issue title", "description": "Description", "location": {"path": "file.ts", "startLine": 10}}]}

Full schema:
{
  "findings": [
    {
      "id": "unique-identifier",
      "severity": "critical|high|medium|low|info",
      "confidence": "high|medium|low",
      "title": "Short descriptive title",
      "description": "Detailed explanation of the issue",
      "location": {
        "path": "path/to/file.ts",
        "startLine": 10,
        "endLine": 15
      },
      "suggestedFix": {
        "description": "How to fix this issue",
        "diff": "unified diff format"
      }
    }
  ]
}

Requirements:
- Return ONLY valid JSON starting with {"findings":
- "findings" array can be empty if no issues found
- "location.path" is auto-filled from context - just provide startLine (and optionally endLine). Omit location entirely for general findings not about a specific line.
- "confidence" reflects how certain you are this is a real issue given the codebase context
- "suggestedFix" is optional - only include when you can provide a complete, correct fix **to the file being analyzed**. Omit suggestedFix if:
  - The fix would be incomplete or you're uncertain about the correct solution
  - The fix requires changes to a different file or a new file (describe the fix in the description field instead)
- Keep descriptions SHORT (1-2 sentences max) - avoid lengthy explanations
- Be concise - focus only on the changes shown
</output_format>`,
  ];

  const { rootDir } = skill;
  if (rootDir) {
    const resourceDirs = ['scripts', 'references', 'assets'].filter((dir) =>
      existsSync(join(rootDir, dir))
    );
    if (resourceDirs.length > 0) {
      const dirList = resourceDirs.map((d) => `${d}/`).join(', ');
      sections.push(`<skill_resources>
This skill is located at: ${rootDir}
You can read files from ${dirList} subdirectories using the Read tool with the full path.
</skill_resources>`);
    }
  }

  return sections.join('\n\n');
}

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
 * Builds the user prompt for a single hunk.
 */
function buildHunkUserPrompt(
  skill: SkillDefinition,
  hunkCtx: HunkWithContext,
  prContext?: PRPromptContext
): string {
  const sections: string[] = [];

  sections.push(`Analyze this code change according to the "${skill.name}" skill criteria.`);

  // Include PR title and description for context on intent
  if (prContext?.title) {
    let prSection = `## Pull Request Context\n**Title:** ${prContext.title}`;
    if (prContext.body) {
      // Truncate very long PR descriptions to avoid bloating prompts
      const maxBodyLength = 1000;
      const body = prContext.body.length > maxBodyLength
        ? prContext.body.slice(0, maxBodyLength) + '...'
        : prContext.body;
      prSection += `\n\n**Description:**\n${body}`;
    }
    sections.push(prSection);
  }

  // Include list of other files being changed in the PR for context
  const otherFiles = prContext?.changedFiles.filter((f) => f !== hunkCtx.filename) ?? [];
  if (otherFiles.length > 0) {
    sections.push(`## Other Files in This PR
The following files are also being changed in this PR (may provide useful context):
${otherFiles.map((f) => `- ${f}`).join('\n')}`);
  }

  sections.push(formatHunkForAnalysis(hunkCtx));

  sections.push(
    `IMPORTANT: Only report findings that are explicitly covered by the skill instructions. Do not report general code quality issues, bugs, or improvements unless the skill specifically asks for them. Return an empty findings array if no issues match the skill's criteria.`
  );

  return sections.join('\n\n');
}

/**
 * Result from extracting findings JSON from text.
 */
export type ExtractFindingsResult =
  | { success: true; findings: unknown[] }
  | { success: false; error: string; preview: string };

/**
 * Extract JSON object from text, handling nested braces correctly.
 * Starts from the given position and returns the balanced JSON object.
 */
export function extractBalancedJson(text: string, startIndex: number): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(startIndex, i + 1);
      }
    }
  }

  return null;
}

/**
 * Extract findings JSON from model output text.
 * Handles markdown code fences, prose before JSON, and nested objects.
 */
export function extractFindingsJson(rawText: string): ExtractFindingsResult {
  let text = rawText.trim();

  // Strip markdown code fences if present (handles any language tag: ```json, ```typescript, ```c++, etc.)
  const codeBlockMatch = text.match(/```[\w+#-]*\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    text = codeBlockMatch[1].trim();
  }

  // Find the start of the findings JSON object
  const findingsMatch = text.match(FINDINGS_JSON_START);
  if (!findingsMatch || findingsMatch.index === undefined) {
    return {
      success: false,
      error: 'no_findings_json',
      preview: text.slice(0, 200),
    };
  }
  const findingsStart = findingsMatch.index;

  // Extract the balanced JSON object
  const jsonStr = extractBalancedJson(text, findingsStart);
  if (!jsonStr) {
    return {
      success: false,
      error: 'unbalanced_json',
      preview: text.slice(findingsStart, findingsStart + 200),
    };
  }

  // Parse the JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return {
      success: false,
      error: 'invalid_json',
      preview: jsonStr.slice(0, 200),
    };
  }

  // Validate structure
  if (typeof parsed !== 'object' || parsed === null || !('findings' in parsed)) {
    return {
      success: false,
      error: 'missing_findings_key',
      preview: jsonStr.slice(0, 200),
    };
  }

  const findings = (parsed as { findings: unknown }).findings;
  if (!Array.isArray(findings)) {
    return {
      success: false,
      error: 'findings_not_array',
      preview: jsonStr.slice(0, 200),
    };
  }

  return { success: true, findings };
}

/** Max characters to send to LLM fallback (roughly ~8k tokens) */
const LLM_FALLBACK_MAX_CHARS = 32000;

/** Timeout for LLM fallback API calls in milliseconds */
const LLM_FALLBACK_TIMEOUT_MS = 30000;

/**
 * Truncate text for LLM fallback while preserving the findings JSON.
 *
 * Caller must ensure findings JSON exists in the text before calling.
 */
export function truncateForLLMFallback(rawText: string, maxChars: number): string {
  if (rawText.length <= maxChars) {
    return rawText;
  }

  const findingsIndex = rawText.match(FINDINGS_JSON_START)?.index ?? -1;

  // If findings starts within our budget, simple truncation from start preserves it
  if (findingsIndex < maxChars - 20) {
    return rawText.slice(0, maxChars) + '\n[... truncated]';
  }

  // Findings is beyond our budget - skip to just before it
  // Keep minimal context (10% of budget or 200 chars, whichever is smaller)
  const markerOverhead = 40;
  const usableBudget = maxChars - markerOverhead;
  const contextBefore = Math.min(200, Math.floor(usableBudget * 0.1), findingsIndex);
  const startIndex = findingsIndex - contextBefore;
  const endIndex = startIndex + usableBudget;

  const truncatedContent = rawText.slice(startIndex, endIndex);
  const suffix = endIndex < rawText.length ? '\n[... truncated]' : '';

  return '[... truncated ...]\n' + truncatedContent + suffix;
}

/**
 * Extract findings from malformed output using LLM as a fallback.
 * Uses claude-haiku-4-5 for lightweight, fast extraction.
 */
export async function extractFindingsWithLLM(
  rawText: string,
  apiKey?: string
): Promise<ExtractFindingsResult> {
  if (!apiKey) {
    return {
      success: false,
      error: 'no_api_key_for_fallback',
      preview: rawText.slice(0, 200),
    };
  }

  // If no findings anchor exists, there's nothing to extract
  if (!FINDINGS_JSON_START.test(rawText)) {
    return {
      success: false,
      error: 'no_findings_to_extract',
      preview: rawText.slice(0, 200),
    };
  }

  // Truncate input while preserving JSON boundaries
  const truncatedText = truncateForLLMFallback(rawText, LLM_FALLBACK_MAX_CHARS);

  try {
    const client = new Anthropic({ apiKey, timeout: LLM_FALLBACK_TIMEOUT_MS });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Extract the findings JSON from this model output.
Return ONLY valid JSON in format: {"findings": [...]}
If no findings exist, return: {"findings": []}

Model output:
${truncatedText}`,
        },
      ],
    });

    const content = response.content[0];
    if (!content || content.type !== 'text') {
      return {
        success: false,
        error: 'llm_unexpected_response',
        preview: rawText.slice(0, 200),
      };
    }

    // Parse the LLM response as JSON
    return extractFindingsJson(content.text);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `llm_extraction_failed: ${errorMessage}`,
      preview: rawText.slice(0, 200),
    };
  }
}

/**
 * Validate and normalize findings from extracted JSON.
 */
function validateFindings(findings: unknown[], filename: string): Finding[] {
  const validated: Finding[] = [];

  for (const f of findings) {
    // Normalize location path before validation
    if (typeof f === 'object' && f !== null && 'location' in f) {
      const loc = (f as Record<string, unknown>)['location'];
      if (loc && typeof loc === 'object') {
        (loc as Record<string, unknown>)['path'] = filename;
      }
    }

    const result = FindingSchema.safeParse(f);
    if (result.success) {
      validated.push({
        ...result.data,
        location: result.data.location ? { ...result.data.location, path: filename } : undefined,
      });
    }
  }

  return validated;
}

/**
 * Parse findings from a hunk analysis result.
 * Uses a two-tier extraction strategy:
 * 1. Regex-based extraction (fast, handles well-formed output)
 * 2. LLM fallback using haiku (handles malformed output gracefully)
 */
async function parseHunkOutput(
  result: SDKResultMessage,
  filename: string,
  apiKey?: string
): Promise<Finding[]> {
  if (result.subtype !== 'success') {
    // Silently return empty - the SDK already handles error reporting
    return [];
  }

  // Tier 1: Try regex-based extraction first (fast)
  const extracted = extractFindingsJson(result.result);

  if (extracted.success) {
    return validateFindings(extracted.findings, filename);
  }

  // Tier 2: Try LLM fallback for malformed output
  const fallback = await extractFindingsWithLLM(result.result, apiKey);

  if (fallback.success) {
    return validateFindings(fallback.findings, filename);
  }

  // Both tiers failed - return empty findings silently
  return [];
}

/**
 * Callbacks for prompt size reporting during hunk analysis.
 */
interface HunkAnalysisCallbacks {
  lineRange: string;
  onLargePrompt?: (lineRange: string, chars: number, estimatedTokens: number) => void;
  onPromptSize?: (lineRange: string, systemChars: number, userChars: number, totalChars: number, estimatedTokens: number) => void;
  onRetry?: (lineRange: string, attempt: number, maxRetries: number, error: string, delayMs: number) => void;
}

/**
 * Execute a single SDK query attempt.
 */
async function executeQuery(
  systemPrompt: string,
  userPrompt: string,
  repoPath: string,
  options: SkillRunnerOptions
): Promise<SDKResultMessage | undefined> {
  const { maxTurns = 50, model, abortController, pathToClaudeCodeExecutable } = options;

  const stream = query({
    prompt: userPrompt,
    options: {
      maxTurns,
      cwd: repoPath,
      systemPrompt,
      // Only allow read-only tools - context is already provided in the prompt
      allowedTools: ['Read', 'Grep'],
      // Explicitly block modification/side-effect tools as defense-in-depth
      disallowedTools: ['Write', 'Edit', 'Bash', 'WebFetch', 'WebSearch', 'Task', 'TodoWrite'],
      permissionMode: 'bypassPermissions',
      model,
      abortController,
      pathToClaudeCodeExecutable,
    },
  });

  let resultMessage: SDKResultMessage | undefined;

  for await (const message of stream) {
    if (message.type === 'result') {
      resultMessage = message;
    }
  }

  return resultMessage;
}

/**
 * Analyze a single hunk with retry logic for transient failures.
 */
async function analyzeHunk(
  skill: SkillDefinition,
  hunkCtx: HunkWithContext,
  repoPath: string,
  options: SkillRunnerOptions,
  callbacks?: HunkAnalysisCallbacks,
  prContext?: PRPromptContext
): Promise<HunkAnalysisResult> {
  const { apiKey, abortController, retry } = options;

  const systemPrompt = buildHunkSystemPrompt(skill);
  const userPrompt = buildHunkUserPrompt(skill, hunkCtx, prContext);

  // Report prompt size information
  const systemChars = systemPrompt.length;
  const userChars = userPrompt.length;
  const totalChars = systemChars + userChars;
  const estimatedTokens = estimateTokens(totalChars);

  // Always call onPromptSize if provided (for debug mode)
  callbacks?.onPromptSize?.(callbacks.lineRange, systemChars, userChars, totalChars, estimatedTokens);

  // Warn about large prompts
  if (totalChars > LARGE_PROMPT_THRESHOLD_CHARS) {
    callbacks?.onLargePrompt?.(callbacks.lineRange, totalChars, estimatedTokens);
  }

  // Merge retry config with defaults
  const retryConfig: Required<RetryConfig> = {
    ...DEFAULT_RETRY_CONFIG,
    ...retry,
  };

  let lastError: unknown;
  // Track accumulated usage across retry attempts for accurate cost reporting
  const accumulatedUsage: UsageStats[] = [];

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    // Check for abort before each attempt
    if (abortController?.signal.aborted) {
      return { findings: [], usage: aggregateUsage(accumulatedUsage), failed: true };
    }

    try {
      const resultMessage = await executeQuery(systemPrompt, userPrompt, repoPath, options);

      if (!resultMessage) {
        return { findings: [], usage: aggregateUsage(accumulatedUsage), failed: true };
      }

      // Extract usage from the result, regardless of success/error status
      const usage = extractUsage(resultMessage);
      accumulatedUsage.push(usage);

      // Check if the SDK returned an error result (e.g., max turns, budget exceeded)
      const isError = resultMessage.is_error || resultMessage.subtype !== 'success';

      if (isError) {
        // SDK error - we have usage but no valid findings
        return {
          findings: [],
          usage: aggregateUsage(accumulatedUsage),
          failed: true,
        };
      }

      return {
        findings: await parseHunkOutput(resultMessage, hunkCtx.filename, apiKey),
        usage: aggregateUsage(accumulatedUsage),
        failed: false,
      };
    } catch (error) {
      lastError = error;

      // Don't retry if not a retryable error or we've exhausted retries
      if (!isRetryableError(error) || attempt >= retryConfig.maxRetries) {
        break;
      }

      // Calculate delay and wait before retry
      const delayMs = calculateRetryDelay(attempt, retryConfig);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Notify about retry in verbose mode
      callbacks?.onRetry?.(
        callbacks.lineRange,
        attempt + 1,
        retryConfig.maxRetries,
        errorMessage,
        delayMs
      );

      try {
        await sleep(delayMs, abortController?.signal);
      } catch {
        // Aborted during sleep
        return { findings: [], usage: aggregateUsage(accumulatedUsage), failed: true };
      }
    }
  }

  // All attempts failed - return failure with any accumulated usage
  // Log the final error for debugging if verbose
  if (options.verbose && lastError) {
    const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    callbacks?.onRetry?.(
      callbacks.lineRange,
      retryConfig.maxRetries + 1,
      retryConfig.maxRetries,
      `Final failure: ${errorMessage}`,
      0
    );
  }

  return { findings: [], usage: aggregateUsage(accumulatedUsage), failed: true };
}

/**
 * Deduplicate findings by id and location.
 */
export function deduplicateFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.id}:${f.location?.path}:${f.location?.startLine}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * A file prepared for analysis with its hunks.
 */
export interface PreparedFile {
  filename: string;
  hunks: HunkWithContext[];
}

function groupHunksByFile(hunks: HunkWithContext[]): PreparedFile[] {
  const fileMap = new Map<string, HunkWithContext[]>();

  for (const hunk of hunks) {
    const existing = fileMap.get(hunk.filename);
    if (existing) {
      existing.push(hunk);
    } else {
      fileMap.set(hunk.filename, [hunk]);
    }
  }

  return Array.from(fileMap, ([filename, fileHunks]) => ({ filename, hunks: fileHunks }));
}

/**
 * Get line range string for a hunk.
 */
function getHunkLineRange(hunk: HunkWithContext): string {
  const start = hunk.hunk.newStart;
  const end = start + hunk.hunk.newCount - 1;
  return start === end ? `${start}` : `${start}-${end}`;
}

/**
 * Attach elapsed time to findings if skill start time is available.
 */
function attachElapsedTime(findings: Finding[], skillStartTime: number | undefined): void {
  if (skillStartTime === undefined) return;
  const elapsedMs = Date.now() - skillStartTime;
  for (const finding of findings) {
    finding.elapsedMs = elapsedMs;
  }
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
export function prepareFiles(
  context: EventContext,
  options: PrepareFilesOptions = {}
): PrepareFilesResult {
  const { contextLines = 20, chunking } = options;

  if (!context.pullRequest) {
    return { files: [], skippedFiles: [] };
  }

  const pr = context.pullRequest;
  const allHunks: HunkWithContext[] = [];
  const skippedFiles: SkippedFile[] = [];

  for (const file of pr.files) {
    if (!file.patch) continue;

    // Check if this file should be skipped based on chunking patterns
    const mode = classifyFile(file.filename, chunking?.filePatterns);
    if (mode === 'skip') {
      skippedFiles.push({
        filename: file.filename,
        reason: 'builtin', // Could be enhanced to track which pattern matched
      });
      continue;
    }

    const statusMap: Record<string, 'added' | 'removed' | 'modified' | 'renamed'> = {
      added: 'added',
      removed: 'removed',
      modified: 'modified',
      renamed: 'renamed',
      copied: 'added',
      changed: 'modified',
      unchanged: 'modified',
    };
    const status = statusMap[file.status] ?? 'modified';

    const diff = parseFileDiff(file.filename, file.patch, status);

    // Apply hunk coalescing if enabled (default: enabled)
    const coalesceEnabled = chunking?.coalesce?.enabled !== false;
    const hunks = coalesceEnabled
      ? coalesceHunks(diff.hunks, {
          maxGapLines: chunking?.coalesce?.maxGapLines,
          maxChunkSize: chunking?.coalesce?.maxChunkSize,
        })
      : diff.hunks;

    const hunksWithContext = expandDiffContext(context.repoPath, { ...diff, hunks }, contextLines);
    allHunks.push(...hunksWithContext);
  }

  return {
    files: groupHunksByFile(allHunks),
    skippedFiles,
  };
}

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
export async function analyzeFile(
  skill: SkillDefinition,
  file: PreparedFile,
  repoPath: string,
  options: SkillRunnerOptions = {},
  callbacks?: FileAnalysisCallbacks,
  prContext?: PRPromptContext
): Promise<FileAnalysisResult> {
  const { abortController } = options;
  const fileFindings: Finding[] = [];
  const fileUsage: UsageStats[] = [];
  let failedHunks = 0;

  for (const [hunkIndex, hunk] of file.hunks.entries()) {
    if (abortController?.signal.aborted) break;

    const lineRange = getHunkLineRange(hunk);
    callbacks?.onHunkStart?.(hunkIndex + 1, file.hunks.length, lineRange);

    const hunkCallbacks: HunkAnalysisCallbacks | undefined = callbacks
      ? {
          lineRange,
          onLargePrompt: callbacks.onLargePrompt,
          onPromptSize: callbacks.onPromptSize,
          onRetry: callbacks.onRetry,
        }
      : undefined;

    const result = await analyzeHunk(skill, hunk, repoPath, options, hunkCallbacks, prContext);

    if (result.failed) {
      failedHunks++;
    }

    attachElapsedTime(result.findings, callbacks?.skillStartTime);
    callbacks?.onHunkComplete?.(hunkIndex + 1, result.findings);

    fileFindings.push(...result.findings);
    fileUsage.push(result.usage);
  }

  return {
    filename: file.filename,
    findings: fileFindings,
    usage: aggregateUsage(fileUsage),
    failedHunks,
  };
}

/**
 * Run a skill on a PR, analyzing each hunk separately.
 */
export async function runSkill(
  skill: SkillDefinition,
  context: EventContext,
  options: SkillRunnerOptions = {}
): Promise<SkillReport> {
  const { parallel = true, callbacks, abortController } = options;
  const startTime = Date.now();

  if (!context.pullRequest) {
    throw new SkillRunnerError('Pull request context required for skill execution');
  }

  const { files: fileHunks, skippedFiles } = prepareFiles(context, {
    contextLines: options.contextLines,
    // Note: chunking config should come from the caller (e.g., from warden.toml defaults)
    // For now, we use built-in defaults. The caller can pass explicit chunking config.
  });

  if (fileHunks.length === 0) {
    const report: SkillReport = {
      skill: skill.name,
      summary: 'No code changes to analyze',
      findings: [],
      usage: emptyUsage(),
      durationMs: Date.now() - startTime,
    };
    if (skippedFiles.length > 0) {
      report.skippedFiles = skippedFiles;
    }
    return report;
  }

  const totalFiles = fileHunks.length;
  const allFindings: Finding[] = [];

  // Track all usage stats for aggregation
  const allUsage: UsageStats[] = [];

  // Track failed hunks across all files
  let totalFailedHunks = 0;

  // Build PR context for inclusion in prompts (helps LLM understand the full scope of changes)
  const prContext: PRPromptContext = {
    changedFiles: context.pullRequest.files.map((f) => f.filename),
    title: context.pullRequest.title,
    body: context.pullRequest.body,
  };

  /**
   * Process all hunks for a single file sequentially.
   * Wraps analyzeFile with progress callbacks.
   */
  async function processFile(
    fileHunkEntry: PreparedFile,
    fileIndex: number
  ): Promise<FileAnalysisResult> {
    const { filename } = fileHunkEntry;

    callbacks?.onFileStart?.(filename, fileIndex, totalFiles);

    const fileCallbacks: FileAnalysisCallbacks = {
      skillStartTime: callbacks?.skillStartTime,
      onHunkStart: (hunkNum, totalHunks, lineRange) => {
        callbacks?.onHunkStart?.(filename, hunkNum, totalHunks, lineRange);
      },
      onHunkComplete: (hunkNum, findings) => {
        callbacks?.onHunkComplete?.(filename, hunkNum, findings);
      },
      onLargePrompt: callbacks?.onLargePrompt
        ? (lineRange, chars, estimatedTokens) => {
            callbacks.onLargePrompt?.(filename, lineRange, chars, estimatedTokens);
          }
        : undefined,
      onPromptSize: callbacks?.onPromptSize
        ? (lineRange, systemChars, userChars, totalChars, estimatedTokens) => {
            callbacks.onPromptSize?.(filename, lineRange, systemChars, userChars, totalChars, estimatedTokens);
          }
        : undefined,
      onRetry: callbacks?.onRetry
        ? (lineRange, attempt, maxRetries, error, delayMs) => {
            callbacks.onRetry?.(filename, lineRange, attempt, maxRetries, error, delayMs);
          }
        : undefined,
    };

    const result = await analyzeFile(skill, fileHunkEntry, context.repoPath, options, fileCallbacks, prContext);

    callbacks?.onFileComplete?.(filename, fileIndex, totalFiles);

    return result;
  }

  // Process files - parallel or sequential based on options
  if (parallel) {
    // Process files in parallel with concurrency limit
    const fileConcurrency = options.concurrency ?? DEFAULT_FILE_CONCURRENCY;
    const batchDelayMs = options.batchDelayMs ?? 0;

    for (let i = 0; i < fileHunks.length; i += fileConcurrency) {
      // Check for abort before starting new batch
      if (abortController?.signal.aborted) break;

      // Apply rate limiting delay between batches (not before the first batch)
      if (i > 0 && batchDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
      }

      const batch = fileHunks.slice(i, i + fileConcurrency);
      const batchPromises = batch.map((fileHunkEntry, batchIndex) =>
        processFile(fileHunkEntry, i + batchIndex)
      );

      const batchResults = await Promise.all(batchPromises);
      for (const result of batchResults) {
        allFindings.push(...result.findings);
        allUsage.push(result.usage);
        totalFailedHunks += result.failedHunks;
      }
    }
  } else {
    // Process files sequentially
    for (const [fileIndex, fileHunkEntry] of fileHunks.entries()) {
      // Check for abort before starting new file
      if (abortController?.signal.aborted) break;

      const result = await processFile(fileHunkEntry, fileIndex);
      allFindings.push(...result.findings);
      allUsage.push(result.usage);
      totalFailedHunks += result.failedHunks;
    }
  }

  // Deduplicate findings
  const uniqueFindings = deduplicateFindings(allFindings);

  // Generate summary
  const summary = generateSummary(skill.name, uniqueFindings);

  // Aggregate usage across all hunks
  const totalUsage = aggregateUsage(allUsage);

  const report: SkillReport = {
    skill: skill.name,
    summary,
    findings: uniqueFindings,
    usage: totalUsage,
    durationMs: Date.now() - startTime,
  };
  if (skippedFiles.length > 0) {
    report.skippedFiles = skippedFiles;
  }
  if (totalFailedHunks > 0) {
    report.failedHunks = totalFailedHunks;
  }
  return report;
}

/**
 * Generate a summary of findings.
 */
export function generateSummary(skillName: string, findings: Finding[]): string {
  if (findings.length === 0) {
    return `${skillName}: No issues found`;
  }

  const counts: Record<string, number> = {};
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  }

  const parts: string[] = [];
  if (counts['critical']) parts.push(`${counts['critical']} critical`);
  if (counts['high']) parts.push(`${counts['high']} high`);
  if (counts['medium']) parts.push(`${counts['medium']} medium`);
  if (counts['low']) parts.push(`${counts['low']} low`);
  if (counts['info']) parts.push(`${counts['info']} info`);

  return `${skillName}: Found ${findings.length} issue${findings.length === 1 ? '' : 's'} (${parts.join(', ')})`;
}

// Legacy export for backwards compatibility
export { buildHunkSystemPrompt as buildSystemPrompt };
