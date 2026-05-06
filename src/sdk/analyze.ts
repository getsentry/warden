import type { SkillDefinition } from '../config/schema.js';
import type { ErrorCode, Finding, RetryConfig } from '../types/index.js';
import { getHunkLineRange, type HunkWithContext } from '../diff/index.js';
import { Sentry, emitExtractionMetrics, emitRetryMetric } from '../sentry.js';
import { SkillRunnerError, WardenAuthenticationError, isRetryableError, isAuthenticationError, isAuthenticationErrorMessage, isSubprocessError, classifyError, mapExtractionErrorCode, sanitizeErrorMessage } from './errors.js';
import type { CircuitBreakerReason } from './circuit-breaker.js';
import { DEFAULT_RETRY_CONFIG, calculateRetryDelay, sleep } from './retry.js';
import { aggregateUsage, emptyUsage, estimateTokens, aggregateAuxiliaryUsage } from './usage.js';
import { buildHunkSystemPrompt, buildHunkUserPrompt, type PRPromptContext } from './prompt.js';
import { extractFindingsJson, extractFindingsWithLLM, validateFindings } from './extract.js';
import { postProcessFindings } from './post-process.js';
import { getRuntime, getRuntimeProviderOptions } from './runtimes/index.js';
import type { SkillRunResult } from './runtimes/index.js';
import {
  LARGE_PROMPT_THRESHOLD_CHARS,
  DEFAULT_FILE_CONCURRENCY,
  type AuxiliaryUsageEntry,
  type HunkAnalysisResult,
  type HunkAnalysisCallbacks,
  type SkillRunnerOptions,
  type PreparedFile,
  type FileAnalysisCallbacks,
  type FileAnalysisResult,
  type ChunkAnalysisResult,
} from './types.js';
import { prepareFiles } from './prepare.js';
import type { EventContext, SkillReport, UsageStats, HunkFailure } from '../types/index.js';
import { runPool } from '../utils/index.js';

/** Result from parsing hunk output */
interface ParseHunkOutputResult {
  findings: Finding[];
  /** Whether extraction failed (both regex and LLM fallback) */
  extractionFailed: boolean;
  /** Which extraction method succeeded */
  extractionMethod: 'regex' | 'llm' | 'none';
  /** Error message if extraction failed */
  extractionError?: string;
  /** Preview of the output that failed to parse */
  extractionPreview?: string;
  /** Usage from LLM extraction fallback, if invoked */
  extractionUsage?: UsageStats;
}

function notifyHunkFailed(
  callbacks: HunkAnalysisCallbacks | undefined,
  lineRange: string,
  message: string,
): void {
  if (callbacks) {
    callbacks.onHunkFailed?.(lineRange, message);
    return;
  }
  console.error(`Hunk analysis failed for ${lineRange}.`);
}

function isAbortRequested(error: unknown, abortController?: AbortController): boolean {
  return (abortController?.signal.aborted ?? false) || classifyError(error).code === 'aborted';
}

function isCircuitBreakerCode(code: ErrorCode | undefined): code is CircuitBreakerReason['code'] {
  return code === 'auth_failed' || code === 'provider_unavailable';
}

function hunkFailureFromCircuit(
  reason: CircuitBreakerReason,
  usage: UsageStats[],
  attempts: number,
): HunkAnalysisResult {
  return {
    findings: [],
    usage: aggregateUsage(usage),
    failed: true,
    extractionFailed: false,
    failureCode: reason.code,
    failureMessage: reason.message,
    attempts,
  };
}

function recordCircuitFailure(
  options: SkillRunnerOptions,
  code: ErrorCode,
  message: string,
): CircuitBreakerReason | undefined {
  if (!isCircuitBreakerCode(code)) return undefined;
  options.circuitBreaker?.recordFailure(code, message);
  return options.circuitBreaker?.reason;
}

/**
 * Parse findings from a hunk analysis result.
 * Uses a two-tier extraction strategy:
 * 1. Regex-based extraction (fast, handles well-formed output)
 * 2. LLM fallback using haiku (handles malformed output gracefully)
 */
async function parseHunkOutput(
  result: SkillRunResult,
  filename: string,
  options: SkillRunnerOptions
): Promise<ParseHunkOutputResult> {
  if (result.status !== 'success') {
    // SDK error - not an extraction failure, just no findings
    return { findings: [], extractionFailed: false, extractionMethod: 'none' };
  }

  // Tier 1: Try regex-based extraction first (fast)
  const extracted = extractFindingsJson(result.text);

  if (extracted.success) {
    return { findings: validateFindings(extracted.findings, filename), extractionFailed: false, extractionMethod: 'regex' };
  }

  // Tier 2: Try LLM fallback for malformed output
  const fallback = await extractFindingsWithLLM(result.text, {
    apiKey: options.apiKey,
    runtime: options.runtime,
    model: options.auxiliaryModel,
    maxRetries: options.auxiliaryMaxRetries,
  });

  if (fallback.success) {
    return { findings: validateFindings(fallback.findings, filename), extractionFailed: false, extractionMethod: 'llm', extractionUsage: fallback.usage };
  }

  // Both tiers failed - return extraction failure info
  return {
    findings: [],
    extractionFailed: true,
    extractionMethod: 'none',
    extractionError: fallback.error,
    extractionPreview: fallback.preview,
    extractionUsage: fallback.usage,
  };
}

/**
 * Filter findings whose startLine falls outside the hunk line range.
 * Findings without a location are kept (general findings).
 */
export function filterOutOfRangeFindings(
  findings: Finding[],
  hunkRange: { start: number; end: number }
): { filtered: Finding[]; dropped: Finding[] } {
  const filtered: Finding[] = [];
  const dropped: Finding[] = [];

  function isWithinHunk(finding: Finding): boolean {
    if (!finding.location) return true;
    const { startLine } = finding.location;
    return startLine >= hunkRange.start && startLine <= hunkRange.end;
  }

  for (const finding of findings) {
    if (isWithinHunk(finding)) {
      filtered.push(finding);
    } else {
      dropped.push(finding);
    }
  }
  return { filtered, dropped };
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
  const lineRange = callbacks?.lineRange ?? formatHunkLineRange(hunkCtx);

  return Sentry.startSpan(
    {
      op: 'skill.analyze_hunk',
      name: `analyze hunk ${hunkCtx.filename}:${lineRange}`,
      attributes: {
        'code.filepath': hunkCtx.filename,
        'hunk.line_range': lineRange,
      },
    },
    async (span) => {
      const { abortController, retry } = options;

      const systemPrompt = buildHunkSystemPrompt(skill);
      const userPrompt = buildHunkUserPrompt(skill, hunkCtx, prContext);

      // Report prompt size information
      const systemChars = systemPrompt.length;
      const userChars = userPrompt.length;
      const totalChars = systemChars + userChars;
      const estimatedTokensCount = estimateTokens(totalChars);

      // Always call onPromptSize if provided (for debug mode)
      callbacks?.onPromptSize?.(callbacks.lineRange, systemChars, userChars, totalChars, estimatedTokensCount);

      // Warn about large prompts
      if (totalChars > LARGE_PROMPT_THRESHOLD_CHARS) {
        callbacks?.onLargePrompt?.(callbacks.lineRange, totalChars, estimatedTokensCount);
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
        const circuitReason = options.circuitBreaker?.reason;
        if (circuitReason) {
          return hunkFailureFromCircuit(circuitReason, accumulatedUsage, attempt);
        }

        // Check for abort before each attempt
        if (abortController?.signal.aborted) {
          callbacks?.onHunkFailed?.(callbacks.lineRange, 'Analysis aborted');
          return {
            findings: [],
            usage: aggregateUsage(accumulatedUsage),
            failed: true,
            extractionFailed: false,
            failureCode: 'aborted',
            failureMessage: 'Analysis aborted',
            attempts: attempt,
          };
        }

        try {
          const runtimeName = options.runtime ?? 'claude';
          const runtime = getRuntime(runtimeName);
          const { result: resultMessage, authError } = await runtime.runSkill({
            systemPrompt,
            userPrompt,
            repoPath,
            skillName: skill.name,
            tools: skill.tools,
            options: {
              maxTurns: options.maxTurns,
              model: options.model,
              abortController: options.abortController,
            },
            providerOptions: getRuntimeProviderOptions(runtimeName, {
              pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
            }),
          });

          // Check for authentication errors from auth_status messages
          // auth_status errors are always auth-related - throw immediately
          if (authError) {
            throw new WardenAuthenticationError(authError);
          }

          if (!resultMessage) {
            notifyHunkFailed(callbacks, callbacks?.lineRange ?? lineRange, 'SDK returned no result');
            return {
              findings: [],
              usage: aggregateUsage(accumulatedUsage),
              failed: true,
              extractionFailed: false,
              failureCode: 'sdk_error',
              failureMessage: 'SDK returned no result',
              attempts: attempt + 1,
            };
          }

          // Extract usage from the result, regardless of success/error status
          const usage = resultMessage.usage;
          accumulatedUsage.push(usage);

          // Check if the SDK returned an error result (e.g., max turns, budget exceeded)
          const isError = resultMessage.status !== 'success';

          if (isError) {
            // Extract error messages from SDK result
            const errorMessages = resultMessage.errors;

            // Check if any error indicates authentication failure
            for (const err of errorMessages) {
              if (isAuthenticationErrorMessage(err)) {
                throw new WardenAuthenticationError();
              }
            }

            // SDK error - log and return failure with error details
            const errorSummary = errorMessages.length > 0
              ? sanitizeErrorMessage(errorMessages.join('; '))
              : `Runtime error: ${resultMessage.status}`;
            const failureCode =
              resultMessage.status === 'turn_limit'
                ? 'max_turns'
                : resultMessage.status === 'provider_error'
                  ? 'provider_unavailable'
                  : 'sdk_error';
            const failureMessage = `Runtime execution failed: ${errorSummary}`;
            const openReason = recordCircuitFailure(options, failureCode, failureMessage);
            notifyHunkFailed(callbacks, callbacks?.lineRange ?? lineRange, failureMessage);
            if (openReason) {
              return hunkFailureFromCircuit(openReason, accumulatedUsage, attempt + 1);
            }
            return {
              findings: [],
              usage: aggregateUsage(accumulatedUsage),
              failed: true,
              extractionFailed: false,
              failureCode,
              failureMessage,
              attempts: attempt + 1,
            };
          }

          options.circuitBreaker?.recordSuccess();
          const parseResult = await parseHunkOutput(resultMessage, hunkCtx.filename, options);

          // Filter findings outside hunk line range (defense-in-depth)
          const hunkRange = getHunkLineRange(hunkCtx.hunk);
          const { filtered: filteredFindings, dropped } = filterOutOfRangeFindings(parseResult.findings, hunkRange);
          if (dropped.length > 0) {
            Sentry.addBreadcrumb({
              category: 'finding.out_of_range',
              message: `Dropped ${dropped.length} finding(s) outside hunk range ${hunkRange.start}-${hunkRange.end}`,
              level: 'warning',
              data: {
                skill: skill.name,
                filename: hunkCtx.filename,
                hunkRange,
                droppedLines: dropped.map((f) => f.location?.startLine),
              },
            });
          }

          // Emit extraction metrics
          emitExtractionMetrics(skill.name, parseResult.extractionMethod, filteredFindings.length);

          // Notify about extraction result (debug mode)
          callbacks?.onExtractionResult?.(
            callbacks.lineRange,
            filteredFindings.length,
            parseResult.extractionMethod
          );

          // Notify about extraction failure if callback provided
          if (parseResult.extractionFailed) {
            callbacks?.onExtractionFailure?.(
              callbacks.lineRange,
              parseResult.extractionError ?? 'unknown_error',
              parseResult.extractionPreview ?? ''
            );
          }

          span.setAttribute('hunk.failed', false);
          span.setAttribute('finding.count', filteredFindings.length);

          return {
            findings: filteredFindings,
            usage: aggregateUsage(accumulatedUsage),
            failed: false,
            extractionFailed: parseResult.extractionFailed,
            extractionError: parseResult.extractionError,
            extractionPreview: parseResult.extractionPreview,
            auxiliaryUsage: parseResult.extractionUsage
              ? [{ agent: 'extraction', usage: parseResult.extractionUsage }]
              : undefined,
          };
        } catch (error) {
          lastError = error;

          if (isAbortRequested(error, abortController)) {
            callbacks?.onHunkFailed?.(callbacks.lineRange, 'Analysis aborted');
            return {
              findings: [],
              usage: aggregateUsage(accumulatedUsage),
              failed: true,
              extractionFailed: false,
              failureCode: 'aborted',
              failureMessage: 'Analysis aborted',
              attempts: attempt + 1,
            };
          }

          // Re-throw authentication errors (they shouldn't be retried)
          if (error instanceof WardenAuthenticationError) {
            const message = sanitizeErrorMessage(error.message);
            options.circuitBreaker?.recordFailure('auth_failed', message);
            throw error;
          }

          // Subprocess IPC failures (EPIPE, ECONNRESET, etc.) indicate the Claude CLI
          // can't communicate — surface as an auth error with actionable guidance
          if (isSubprocessError(error)) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            options.circuitBreaker?.recordFailure('auth_failed', sanitizeErrorMessage(errorMessage));
            throw new WardenAuthenticationError(
              `Claude Code subprocess failed (${errorMessage}).\n` +
              `This usually means the claude CLI cannot run in this environment.`,
              { cause: error }
            );
          }

          // Authentication errors should surface immediately with helpful guidance
          if (isAuthenticationError(error)) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            options.circuitBreaker?.recordFailure('auth_failed', sanitizeErrorMessage(errorMessage));
            throw new WardenAuthenticationError(undefined, { cause: error });
          }

          // Don't retry if not a retryable error or we've exhausted retries
          const shouldRetry = isRetryableError(error) && attempt < retryConfig.maxRetries;
          if (!shouldRetry) {
            break;
          }

          // Calculate delay and wait before retry
          const delayMs = calculateRetryDelay(attempt, retryConfig);
          const errorMessage = sanitizeErrorMessage(error instanceof Error ? error.message : String(error));

          Sentry.addBreadcrumb({
            category: 'retry',
            message: `Retrying hunk analysis`,
            data: { attempt: attempt + 1, error: errorMessage, delayMs },
            level: 'warning',
          });
          emitRetryMetric(skill.name, attempt + 1);

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
            callbacks?.onHunkFailed?.(callbacks.lineRange, 'Analysis aborted during retry delay');
            return {
              findings: [],
              usage: aggregateUsage(accumulatedUsage),
              failed: true,
              extractionFailed: false,
              failureCode: 'aborted',
              failureMessage: 'Analysis aborted during retry delay',
              attempts: attempt + 1,
            };
          }
        }
      }

      // All attempts failed - return failure with any accumulated usage
      const finalError = sanitizeErrorMessage(lastError instanceof Error ? lastError.message : String(lastError));

      // Log the final error
      if (lastError) {
        notifyHunkFailed(callbacks, callbacks?.lineRange ?? lineRange, `All retry attempts failed: ${finalError}`);
      }

      // Also notify via callback if verbose
      if (options.verbose) {
        callbacks?.onRetry?.(
          callbacks.lineRange,
          retryConfig.maxRetries + 1,
          retryConfig.maxRetries,
          `Final failure: ${finalError}`,
          0
        );
      }

      span.setAttribute('hunk.failed', true);
      span.setAttribute('finding.count', 0);

      const { code: retryCode, message } = classifyError(lastError);
      const retryMsg = sanitizeErrorMessage(message);
      const openReason = recordCircuitFailure(options, retryCode, retryMsg);
      if (openReason) {
        return hunkFailureFromCircuit(openReason, accumulatedUsage, retryConfig.maxRetries + 1);
      }
      return {
        findings: [],
        usage: aggregateUsage(accumulatedUsage),
        failed: true,
        extractionFailed: false,
        failureCode: retryCode,
        failureMessage: `All retry attempts failed: ${retryMsg}`,
        attempts: retryConfig.maxRetries + 1,
      };
    },
  );
}

/**
 * Format a hunk's line range as a display string (e.g. "10-20" or "10").
 */
function formatHunkLineRange(hunk: HunkWithContext): string {
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
  return Sentry.startSpan(
    {
      op: 'skill.analyze_file',
      name: `analyze file ${file.filename}`,
      attributes: {
        'code.filepath': file.filename,
        'hunk.count': file.hunks.length,
      },
    },
    async (span) => {
      const { abortController } = options;
      const fileFindings: Finding[] = [];
      const fileUsage: UsageStats[] = [];
      const fileAuxiliaryUsage: AuxiliaryUsageEntry[] = [];
      const hunkFailures: HunkFailure[] = [];
      let failedHunks = 0;
      let failedExtractions = 0;

      for (const [hunkIndex, hunk] of file.hunks.entries()) {
        if (abortController?.signal.aborted) break;

        const lineRange = formatHunkLineRange(hunk);
        callbacks?.onHunkStart?.(hunkIndex + 1, file.hunks.length, lineRange);

        const hunkCallbacks: HunkAnalysisCallbacks | undefined = callbacks
          ? {
              lineRange,
              onLargePrompt: callbacks.onLargePrompt,
              onPromptSize: callbacks.onPromptSize,
              onRetry: callbacks.onRetry,
              onExtractionFailure: callbacks.onExtractionFailure,
              onExtractionResult: callbacks.onExtractionResult,
              onHunkFailed: callbacks.onHunkFailed,
            }
          : undefined;

        const hunkStartTime = Date.now();
        const result = await analyzeHunk(skill, hunk, repoPath, options, hunkCallbacks, prContext);
        const hunkDurationMs = Date.now() - hunkStartTime;

        // `failed` and `extractionFailed` are conceptually mutually exclusive:
        // if analysis failed (no output produced), there's nothing to extract.
        // Use else-if so a future change that violates this invariant doesn't
        // silently double-count (one hunk → two hunkFailures entries +
        // failedHunks AND failedExtractions both incremented).
        if (result.failed && result.failureCode !== 'aborted') {
          failedHunks++;
          hunkFailures.push({
            type: 'analysis',
            filename: file.filename,
            lineRange,
            code: result.failureCode ?? 'unknown',
            message: result.failureMessage ?? 'unknown error',
            ...(result.attempts !== undefined ? { attempts: result.attempts } : {}),
          });
        } else if (result.extractionFailed) {
          failedExtractions++;
          hunkFailures.push({
            type: 'extraction',
            filename: file.filename,
            lineRange,
            code: mapExtractionErrorCode(result.extractionError),
            message: result.extractionError ?? 'unknown extraction error',
            ...(result.extractionPreview !== undefined ? { preview: result.extractionPreview } : {}),
          });
        }

        attachElapsedTime(result.findings, callbacks?.skillStartTime);
        callbacks?.onHunkComplete?.(hunkIndex + 1, result.findings, result.usage);
        const chunkResult: ChunkAnalysisResult = {
          filename: file.filename,
          model: options.model,
          index: hunkIndex + 1,
          total: file.hunks.length,
          lineRange,
          findings: result.findings,
          usage: result.usage,
          durationMs: hunkDurationMs,
          failed: result.failed && result.failureCode !== 'aborted',
          extractionFailed: result.extractionFailed,
          failureCode: result.failureCode,
          failureMessage: result.failureMessage,
          extractionError: result.extractionError,
          extractionPreview: result.extractionPreview,
          auxiliaryUsage: result.auxiliaryUsage,
        };
        callbacks?.onChunkComplete?.(chunkResult);

        fileFindings.push(...result.findings);
        fileUsage.push(result.usage);
        if (result.auxiliaryUsage) {
          fileAuxiliaryUsage.push(...result.auxiliaryUsage);
        }
      }

      span.setAttribute('finding.count', fileFindings.length);
      span.setAttribute('hunk.failed_count', failedHunks);
      span.setAttribute('extraction.failed_count', failedExtractions);

      return {
        filename: file.filename,
        findings: fileFindings,
        usage: aggregateUsage(fileUsage),
        failedHunks,
        failedExtractions,
        hunkFailures,
        auxiliaryUsage: fileAuxiliaryUsage.length > 0 ? fileAuxiliaryUsage : undefined,
      };
    },
  );
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
  if (counts['high']) parts.push(`${counts['high']} high`);
  if (counts['medium']) parts.push(`${counts['medium']} medium`);
  if (counts['low']) parts.push(`${counts['low']} low`);

  return `${skillName}: Found ${findings.length} issue${findings.length === 1 ? '' : 's'} (${parts.join(', ')})`;
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
      model: options.model,
    };
    if (skippedFiles.length > 0) {
      report.skippedFiles = skippedFiles;
    }
    return report;
  }

  const totalFiles = fileHunks.length;
  const totalHunks = fileHunks.reduce((sum, file) => sum + file.hunks.length, 0);
  const allFindings: Finding[] = [];

  // Track all usage stats for aggregation
  const allUsage: UsageStats[] = [];
  const allAuxiliaryUsage: AuxiliaryUsageEntry[] = [];

  // Track failed hunks across all files
  let totalFailedHunks = 0;
  let totalFailedExtractions = 0;

  // Build PR context for inclusion in prompts (helps LLM understand the full scope of changes)
  // For non-PR contexts (CLI file/diff mode), skip the "Other Files" list to avoid
  // bloating every hunk prompt with thousands of filenames.
  const isPullRequest = context.pullRequest.number !== 0;
  const prContext: PRPromptContext = {
    changedFiles: isPullRequest ? context.pullRequest.files.map((f) => f.filename) : [],
    title: context.pullRequest.title,
    body: context.pullRequest.body,
    maxContextFiles: options.maxContextFiles,
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
      onHunkComplete: (hunkNum, findings, usage) => {
        callbacks?.onHunkComplete?.(filename, hunkNum, findings, usage);
      },
      onLargePrompt: callbacks?.onLargePrompt
        ? (lineRange, chars, estTokens) => {
            callbacks.onLargePrompt?.(filename, lineRange, chars, estTokens);
          }
        : undefined,
      onPromptSize: callbacks?.onPromptSize
        ? (lineRange, systemChars, userChars, totalCharsVal, estTokens) => {
            callbacks.onPromptSize?.(filename, lineRange, systemChars, userChars, totalCharsVal, estTokens);
          }
        : undefined,
      onRetry: callbacks?.onRetry
        ? (lineRange, attemptNum, maxRetries, error, delayMs) => {
            callbacks.onRetry?.(filename, lineRange, attemptNum, maxRetries, error, delayMs);
          }
        : undefined,
      onExtractionFailure: callbacks?.onExtractionFailure
        ? (lineRange, error, preview) => {
            callbacks.onExtractionFailure?.(filename, lineRange, error, preview);
          }
        : undefined,
      onExtractionResult: callbacks?.onExtractionResult
        ? (lineRange, findingsCount, method) => {
            callbacks.onExtractionResult?.(filename, lineRange, findingsCount, method);
          }
        : undefined,
      onHunkFailed: callbacks?.onHunkFailed
        ? (lineRange, error) => {
            callbacks.onHunkFailed?.(filename, lineRange, error);
          }
        : undefined,
    };

    const result = await analyzeFile(skill, fileHunkEntry, context.repoPath, options, fileCallbacks, prContext);

    callbacks?.onFileComplete?.(filename, fileIndex, totalFiles);

    return result;
  }

  /** Process a file with timing, returning a self-contained result. */
  async function processFileWithTiming(fileHunkEntry: PreparedFile, fileIndex: number) {
    const fileStart = Date.now();
    const result = await processFile(fileHunkEntry, fileIndex);
    const durationMs = Date.now() - fileStart;
    return { filename: fileHunkEntry.filename, result, durationMs };
  }

  // Collect results in input order (Promise.all preserves order)
  const fileResults: { filename: string; result: FileAnalysisResult; durationMs: number }[] = [];

  // Process files - parallel or sequential based on options
  if (parallel) {
    // Process files with sliding-window concurrency pool
    const fileConcurrency = options.concurrency ?? DEFAULT_FILE_CONCURRENCY;
    const batchDelayMs = options.batchDelayMs ?? 0;

    fileResults.push(...await runPool(fileHunks, fileConcurrency,
      async (fileHunkEntry, index) => {
        // Rate-limit: delay items beyond the first concurrent wave
        if (index >= fileConcurrency && batchDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
        }
        return processFileWithTiming(fileHunkEntry, index);
      },
      { shouldAbort: () => abortController?.signal.aborted ?? false }
    ));
  } else {
    // Process files sequentially
    for (const [fileIndex, fileHunkEntry] of fileHunks.entries()) {
      // Check for abort before starting new file
      if (abortController?.signal.aborted) break;

      fileResults.push(await processFileWithTiming(fileHunkEntry, fileIndex));
    }
  }

  // Accumulate results from ordered fileResults
  const allHunkFailures: HunkFailure[] = [];
  for (const fr of fileResults) {
    allFindings.push(...fr.result.findings);
    allUsage.push(fr.result.usage);
    totalFailedHunks += fr.result.failedHunks;
    totalFailedExtractions += fr.result.failedExtractions;
    if (fr.result.hunkFailures.length > 0) {
      allHunkFailures.push(...fr.result.hunkFailures);
    }
    if (fr.result.auxiliaryUsage) {
      allAuxiliaryUsage.push(...fr.result.auxiliaryUsage);
    }
  }

  // All hunks failed — typically a systemic problem (auth, subprocess, etc).
  // Throw so direct SDK consumers (evals, scheduled workflows) keep their
  // prior exception-based contract. The CLI path (tasks.ts) has its own
  // all-hunks-fail detection that emits a structured JSONL record instead.
  // Count both analysis and extraction failures: each hunk contributes to
  // at most one (analyzeFile makes them mutually exclusive), and an
  // extraction-only failure scenario would otherwise slip through silently.
  const totalAttemptFailures = totalFailedHunks + totalFailedExtractions;
  const circuitReason = options.circuitBreaker?.reason;
  if (circuitReason && totalAttemptFailures > 0 && allFindings.length === 0) {
    throw new SkillRunnerError(circuitReason.message, { code: circuitReason.code });
  }
  if (totalAttemptFailures > 0 && totalAttemptFailures === totalHunks && allFindings.length === 0) {
    const analysisFailures = allHunkFailures.filter((failure) => failure.type === 'analysis');
    if (
      analysisFailures.length > 0
      && analysisFailures.every((failure) => failure.code === 'provider_unavailable')
    ) {
      throw new SkillRunnerError(
        `Provider unavailable: all ${totalHunks} chunk${totalHunks === 1 ? '' : 's'} failed to analyze. Warden stopped early.`,
        { code: 'provider_unavailable' },
      );
    }
    throw new SkillRunnerError(
      `All ${totalHunks} chunk${totalHunks === 1 ? '' : 's'} failed to analyze. ` +
      `This usually indicates an authentication problem. ` +
      `Verify WARDEN_ANTHROPIC_API_KEY is set correctly, or run 'claude login' if using Claude Code subscription.`,
      { code: 'all_hunks_failed' },
    );
  }

  const processed = await postProcessFindings(allFindings, {
    skill,
    repoPath: context.repoPath,
    apiKey: options.apiKey,
    runtime: options.runtime,
    auxiliaryModel: options.auxiliaryModel,
    synthesisModel: options.synthesisModel,
    auxiliaryMaxRetries: options.auxiliaryMaxRetries,
    verifyFindings: options.verifyFindings,
    maxTurns: options.maxTurns,
    abortController: options.abortController,
    pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
    prContext,
    onFindingProcessing: options.callbacks?.onFindingProcessing,
  });
  const finalFindings = processed.findings;
  allAuxiliaryUsage.push(...processed.auxiliaryUsage);

  // Generate summary
  const summary = generateSummary(skill.name, finalFindings);

  // Aggregate usage across all hunks
  const totalUsage = aggregateUsage(allUsage);

  const report: SkillReport = {
    skill: skill.name,
    summary,
    findings: finalFindings,
    usage: totalUsage,
    durationMs: Date.now() - startTime,
    model: options.model,
    files: fileResults.map((fr) => ({
      filename: fr.filename,
      findings: fr.result.findings.length,
      durationMs: fr.durationMs,
      usage: fr.result.usage,
    })),
  };
  if (skippedFiles.length > 0) {
    report.skippedFiles = skippedFiles;
  }
  if (totalFailedHunks > 0) {
    report.failedHunks = totalFailedHunks;
  }
  if (totalFailedExtractions > 0) {
    report.failedExtractions = totalFailedExtractions;
  }
  if (allHunkFailures.length > 0) {
    report.hunkFailures = allHunkFailures;
  }
  const auxUsage = aggregateAuxiliaryUsage(allAuxiliaryUsage);
  if (auxUsage) {
    report.auxiliaryUsage = auxUsage;
  }
  return report;
}
