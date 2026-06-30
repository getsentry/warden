import type { Span } from '@sentry/node';
import type { SkillDefinition } from '../config/schema.js';
import type { ErrorCode, Finding, RetryConfig } from '../types/index.js';
import type { ChangedLineRange, ReviewChunk } from '../diff/index.js';
import { Sentry, emitExtractionMetrics, emitRetryMetric, emitSkillMetrics, ensureLocalTracing } from '../sentry.js';
import { SkillRunnerError, WardenAuthenticationError, isRetryableError, isAuthenticationError, isAuthenticationErrorMessage, isSubprocessError, classifyError, mapExtractionErrorCode, sanitizeErrorMessage } from './errors.js';
import type { CircuitBreakerReason } from './circuit-breaker.js';
import { DEFAULT_RETRY_CONFIG, calculateRetryDelay, sleep } from './retry.js';
import { aggregateUsage, emptyUsage, estimateTokens, aggregateAuxiliaryUsage, aggregateAuxiliaryUsageAttribution } from './usage.js';
import { buildHunkSystemPrompt, buildReviewChunkUserPrompt, type PRPromptContext } from './prompt.js';
import { extractFindingsJson, extractFindingsWithLLM, validateFindings } from './extract.js';
import type { FindingPathResolver } from './extract.js';
import { postProcessFindings } from './post-process.js';
import { buildFileReports } from './report-files.js';
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
  type ReviewChunkGroup,
  type FileAnalysisCallbacks,
  type FileAnalysisResult,
  type ChunkAnalysisResult,
} from './types.js';
import { prepareFiles } from './prepare.js';
import { planSemanticReviewChunks } from '../semantic/index.js';
import type { EventContext, SkillReport, UsageStats, HunkFailure, HunkTrace } from '../types/index.js';
import type { SourceSnippet } from '../types/index.js';
import { runPool } from '../utils/index.js';
import { getSpanContext, startTraceRecorder, withTraceRecorder, type TraceRecorder } from '../sentry-trace.js';

/** Result from parsing review chunk output */
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
  return code === 'auth_failed' || code === 'provider_unavailable' || code === 'invalid_model_selector';
}

function hunkFailureFromCircuit(
  reason: CircuitBreakerReason,
  usage: UsageStats[],
  attempts: number,
  trace?: HunkTrace,
): HunkAnalysisResult {
  return {
    findings: [],
    usage: aggregateUsage(usage),
    failed: true,
    extractionFailed: false,
    failureCode: reason.code,
    failureMessage: reason.message,
    attempts,
    trace,
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

function allHunksFailedGuidance(runtime: SkillRunnerOptions['runtime'] | undefined): string {
  if ((runtime ?? 'pi') === 'pi') {
    return 'Verify Pi has credentials for the selected provider/model, or choose a configured Pi model.';
  }

  return "Verify WARDEN_ANTHROPIC_API_KEY is set correctly, or run 'claude login' when using the Claude runtime without an API key.";
}

function normalizeReviewChunkGroup(input: PreparedFile | ReviewChunkGroup): ReviewChunkGroup {
  if ('filenames' in input) {
    return input;
  }

  return {
    displayName: input.filename,
    filenames: [input.filename],
    chunks: input.chunks,
  };
}

function fileReportInputsFromGroup(args: {
  group: ReviewChunkGroup;
  durationMs?: number;
  usage?: UsageStats;
}) {
  return args.group.filenames.map((filename, index) => ({
    filename,
    durationMs: index === 0 ? args.durationMs : undefined,
    usage: index === 0 ? args.usage : undefined,
  }));
}

function buildHunkTrace(args: {
  enabled: boolean | undefined;
  span: Span;
  filename: string;
  lineRange: string;
  runtime: NonNullable<SkillRunnerOptions['runtime']>;
  status: string;
  result?: SkillRunResult;
  traceRecorder?: TraceRecorder;
}): HunkTrace | undefined {
  if (!args.enabled) return undefined;

  const spanContext = getSpanContext(args.span);
  const spans = args.traceRecorder?.snapshot();
  const childTraceId = spans?.find((span) => span.traceId)?.traceId;

  const trace: HunkTrace = {
    filename: args.filename,
    lineRange: args.lineRange,
    runtime: args.runtime,
    status: args.status,
    traceId: spanContext?.traceId ?? childTraceId,
    spanId: spanContext?.spanId,
    responseId: args.result?.responseId,
    responseModel: args.result?.responseModel,
    sessionId: args.result?.sessionId,
    durationMs: args.result?.durationMs,
    durationApiMs: args.result?.durationApiMs,
    numTurns: args.result?.numTurns,
    spans,
  };
  return trace;
}

/**
 * Parse findings from a review chunk analysis result.
 * Uses a two-tier extraction strategy:
 * 1. Regex-based extraction (fast, handles well-formed output)
 * 2. LLM fallback using haiku (handles malformed output gracefully)
 */
async function parseHunkOutput(
  result: SkillRunResult,
  defaultFilename: string | FindingPathResolver | undefined,
  skillName: string,
  options: SkillRunnerOptions
): Promise<ParseHunkOutputResult> {
  if (result.status !== 'success') {
    // SDK error - not an extraction failure, just no findings
    return { findings: [], extractionFailed: false, extractionMethod: 'none' };
  }

  // Tier 1: Try regex-based extraction first (fast)
  const extracted = extractFindingsJson(result.text);
  const filenameOrResolver = defaultFilename ?? (() => undefined);

  if (extracted.success) {
    return { findings: validateFindings(extracted.findings, filenameOrResolver), extractionFailed: false, extractionMethod: 'regex' };
  }

  // Tier 2: Try LLM fallback for malformed output
  const fallback = await extractFindingsWithLLM(result.text, {
    apiKey: options.apiKey,
    runtime: options.runtime,
    model: options.auxiliaryModel,
    maxRetries: options.auxiliaryMaxRetries,
    agentName: skillName,
  });

  if (fallback.success) {
    return { findings: validateFindings(fallback.findings, filenameOrResolver), extractionFailed: false, extractionMethod: 'llm', extractionUsage: fallback.usage };
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

function numberFromRecord(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

function resolveFindingPathFromChangedLines(
  changedLineMap: ChangedLineRange[],
  fallbackFilename: string | undefined,
  finding: Record<string, unknown>
): string | undefined {
  const location = finding['location'];
  if (!location || typeof location !== 'object') {
    return fallbackFilename;
  }

  const locationRecord = location as Record<string, unknown>;
  const explicitPath = locationRecord['path'];
  if (typeof explicitPath === 'string' && explicitPath.length > 0) {
    return explicitPath;
  }

  if (fallbackFilename) {
    return fallbackFilename;
  }

  const startLine = numberFromRecord(locationRecord, 'startLine');
  if (!startLine) {
    return undefined;
  }

  const endLine = numberFromRecord(locationRecord, 'endLine') ?? startLine;
  const matchingPaths = new Set<string>();
  for (const range of changedLineMap) {
    if (startLine >= range.start && endLine <= range.end) {
      matchingPaths.add(range.path);
    }
  }

  return matchingPaths.size === 1 ? [...matchingPaths][0] : undefined;
}

/**
 * Filter findings whose location falls outside the changed line map.
 * Findings without a location are kept (general findings).
 */
export function filterOutOfRangeFindings(
  findings: Finding[],
  changedLineMap: ChangedLineRange[] | { start: number; end: number }
): { filtered: Finding[]; dropped: Finding[] } {
  const ranges: (ChangedLineRange | { path?: undefined; start: number; end: number })[] = Array.isArray(changedLineMap)
    ? changedLineMap
    : [{ start: changedLineMap.start, end: changedLineMap.end }];
  const filtered: Finding[] = [];
  const dropped: Finding[] = [];

  function isWithinHunk(finding: Finding): boolean {
    if (!finding.location) return true;
    const { path, startLine } = finding.location;
    const endLine = finding.location.endLine ?? startLine;
    const lineInRange = (line: number): boolean => ranges.some((range) =>
      (range.path === undefined || range.path === path)
      && line >= range.start
      && line <= range.end
    );
    return lineInRange(startLine) && lineInRange(endLine);
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

/** Build a source snippet for a finding from the matching review chunk file. */
export function buildSourceSnippet(
  finding: Finding,
  chunk: ReviewChunk,
  contextLines = 3
): SourceSnippet | undefined {
  if (!finding.location) return undefined;
  const chunkFile = chunk.files.find((file) => file.path === finding.location?.path);
  if (!chunkFile) return undefined;

  const targetStartLine = finding.location.startLine;
  const targetEndLine = finding.location.endLine ?? targetStartLine;
  const startLine = Math.max(1, targetStartLine - contextLines);
  const endLine = targetEndLine + contextLines;
  const lines = chunkFile.sourceLines
    .filter((line) => line.line >= startLine && line.line <= endLine)
    .map((line) => ({
      ...line,
      highlighted: line.line >= targetStartLine && line.line <= targetEndLine,
    }));

  if (lines.length === 0) return undefined;
  const firstLine = lines[0];
  const lastLine = lines.at(-1);
  if (!firstLine || !lastLine) return undefined;

  return {
    path: finding.location.path,
    language: chunkFile.language,
    startLine: firstLine.line,
    endLine: lastLine.line,
    targetStartLine,
    targetEndLine,
    lines,
  };
}

function attachSourceSnippets(findings: Finding[], chunk: ReviewChunk): Finding[] {
  return findings.map((finding) => {
    if (!finding.location) return finding;
    const sourceSnippet = buildSourceSnippet(finding, chunk);
    return sourceSnippet ? { ...finding, sourceSnippet } : finding;
  });
}

/**
 * Analyze a single review chunk with retry logic for transient failures.
 */
async function analyzeReviewChunk(
  skill: SkillDefinition,
  chunk: ReviewChunk,
  repoPath: string,
  options: SkillRunnerOptions,
  callbacks?: HunkAnalysisCallbacks,
  prContext?: PRPromptContext
): Promise<HunkAnalysisResult> {
  if (options.captureTraces) {
    ensureLocalTracing();
  }

  const lineRange = callbacks?.lineRange ?? formatChunkLineRange(chunk);
  const primaryFile = chunk.files[0]?.path ?? 'unknown';

  return Sentry.startSpan(
    {
      op: 'skill.analyze_hunk',
      name: `analyze chunk ${primaryFile}:${lineRange}`,
      attributes: {
        'gen_ai.agent.name': skill.name,
        'code.file.path': primaryFile,
        'warden.hunk.line_range': lineRange,
      },
    },
    async (span) => {
      const { abortController, retry } = options;
      const runtimeName = options.runtime ?? 'pi';
      const traceRecorder = options.captureTraces ? startTraceRecorder(span) : undefined;

      const systemPrompt = buildHunkSystemPrompt(skill);
      const userPrompt = buildReviewChunkUserPrompt(skill, chunk, prContext);

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
          return hunkFailureFromCircuit(
            circuitReason,
            accumulatedUsage,
            attempt,
            buildHunkTrace({
              enabled: options.captureTraces,
              span,
              filename: primaryFile,
              lineRange,
              runtime: runtimeName,
              status: circuitReason.code,
              traceRecorder,
            }),
          );
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
            trace: buildHunkTrace({
              enabled: options.captureTraces,
              span,
              filename: primaryFile,
              lineRange,
              runtime: runtimeName,
              status: 'aborted',
              traceRecorder,
            }),
          };
        }

        try {
          const runtime = getRuntime(runtimeName);
          const { result: resultMessage, authError } = await withTraceRecorder(traceRecorder, () => runtime.runSkill({
            apiKey: options.apiKey,
            systemPrompt,
            userPrompt,
            repoPath,
            skillName: skill.name,
            tools: skill.tools,
            parentSpan: span,
            traceRecorder,
            options: {
              maxTurns: options.maxTurns,
              model: options.model,
              effort: options.effort,
              abortController: options.abortController,
            },
            providerOptions: getRuntimeProviderOptions(runtimeName, {
              pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
            }),
          }));

          // Check for authentication errors from auth_status messages
          // auth_status errors are always auth-related - throw immediately
          if (authError) {
            throw new WardenAuthenticationError(authError, { runtime: runtimeName });
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
              trace: buildHunkTrace({
                enabled: options.captureTraces,
                span,
                filename: primaryFile,
                lineRange,
                runtime: runtimeName,
                status: 'missing_result',
                traceRecorder,
              }),
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
                throw new WardenAuthenticationError(undefined, { runtime: runtimeName });
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
              return hunkFailureFromCircuit(
                openReason,
                accumulatedUsage,
                attempt + 1,
                buildHunkTrace({
                  enabled: options.captureTraces,
                  span,
                  filename: primaryFile,
                  lineRange,
                  runtime: runtimeName,
                  status: resultMessage.status,
                  result: resultMessage,
                  traceRecorder,
                }),
              );
            }
            return {
              findings: [],
              usage: aggregateUsage(accumulatedUsage),
              failed: true,
              extractionFailed: false,
              failureCode,
              failureMessage,
              attempts: attempt + 1,
              trace: buildHunkTrace({
                enabled: options.captureTraces,
                span,
                filename: primaryFile,
                lineRange,
                runtime: runtimeName,
                status: resultMessage.status,
                result: resultMessage,
                traceRecorder,
              }),
            };
          }

          options.circuitBreaker?.recordSuccess();
          const parseResult = await withTraceRecorder(
            traceRecorder,
            () => parseHunkOutput(
              resultMessage,
              (finding) => resolveFindingPathFromChangedLines(
                chunk.changedLineMap,
                chunk.files.length === 1 ? primaryFile : undefined,
                finding,
              ),
              skill.name,
              options,
            ),
          );

          // Filter findings outside changed line ranges (defense-in-depth)
          const { filtered, dropped } = filterOutOfRangeFindings(parseResult.findings, chunk.changedLineMap);
          const filteredFindings = attachSourceSnippets(filtered, chunk);
          if (dropped.length > 0) {
            Sentry.addBreadcrumb({
              category: 'finding.out_of_range',
              message: `Dropped ${dropped.length} finding(s) outside changed line map`,
              level: 'warning',
              data: {
                skill: skill.name,
                filename: primaryFile,
                changedLineMap: chunk.changedLineMap,
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

          span.setAttribute('warden.hunk.failed', false);
          span.setAttribute('warden.finding.count', filteredFindings.length);

          return {
            findings: filteredFindings,
            usage: aggregateUsage(accumulatedUsage),
            failed: false,
            extractionFailed: parseResult.extractionFailed,
            extractionError: parseResult.extractionError,
            extractionPreview: parseResult.extractionPreview,
            auxiliaryUsage: parseResult.extractionUsage
              ? [{
                  agent: 'extraction',
                  usage: parseResult.extractionUsage,
                  model: options.auxiliaryModel,
                  runtime: runtimeName,
                }]
              : undefined,
            trace: buildHunkTrace({
              enabled: options.captureTraces,
              span,
              filename: primaryFile,
              lineRange,
              runtime: runtimeName,
              status: resultMessage.status,
              result: resultMessage,
              traceRecorder,
            }),
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
              trace: buildHunkTrace({
                enabled: options.captureTraces,
                span,
                filename: primaryFile,
                lineRange,
                runtime: runtimeName,
                status: 'aborted',
                traceRecorder,
              }),
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
            throw new WardenAuthenticationError(undefined, { runtime: options.runtime ?? 'pi', cause: error });
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
            message: `Retrying review chunk analysis`,
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
              trace: buildHunkTrace({
                enabled: options.captureTraces,
                span,
                filename: primaryFile,
                lineRange,
                runtime: runtimeName,
                status: 'aborted',
                traceRecorder,
              }),
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

      span.setAttribute('warden.hunk.failed', true);
      span.setAttribute('warden.finding.count', 0);

      const { code: retryCode, message } = classifyError(lastError);
      const retryMsg = sanitizeErrorMessage(message);
      const openReason = recordCircuitFailure(options, retryCode, retryMsg);
      if (openReason) {
        return hunkFailureFromCircuit(
          openReason,
          accumulatedUsage,
          retryConfig.maxRetries + 1,
          buildHunkTrace({
            enabled: options.captureTraces,
            span,
            filename: primaryFile,
            lineRange,
            runtime: runtimeName,
            status: retryCode,
            traceRecorder,
          }),
        );
      }
      return {
        findings: [],
        usage: aggregateUsage(accumulatedUsage),
        failed: true,
        extractionFailed: false,
        failureCode: retryCode,
        failureMessage: `All retry attempts failed: ${retryMsg}`,
        attempts: retryConfig.maxRetries + 1,
        trace: buildHunkTrace({
          enabled: options.captureTraces,
          span,
          filename: primaryFile,
          lineRange,
          runtime: runtimeName,
          status: retryCode,
          traceRecorder,
        }),
      };
    },
  );
}

/**
 * Format a review chunk's changed ranges as a display string.
 */
function formatChunkLineRange(chunk: ReviewChunk): string {
  return chunk.changedLineMap
    .map((range) => {
      const lineRange = range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`;
      return chunk.files.length === 1 ? lineRange : `${range.path}:${lineRange}`;
    })
    .join(', ');
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
 * Analyze a single prepared file's review chunks.
 */
export async function analyzeFile(
  skill: SkillDefinition,
  file: PreparedFile | ReviewChunkGroup,
  repoPath: string,
  options: SkillRunnerOptions = {},
  callbacks?: FileAnalysisCallbacks,
  prContext?: PRPromptContext
): Promise<FileAnalysisResult> {
  const group = normalizeReviewChunkGroup(file);
  return Sentry.startSpan(
    {
      op: 'skill.analyze_file',
      name: `analyze chunk group ${group.displayName}`,
      attributes: {
        'gen_ai.agent.name': skill.name,
        'code.file.path': group.displayName,
        'warden.hunk.count': group.chunks.length,
      },
    },
    async (span) => {
      const { abortController } = options;
      const fileFindings: Finding[] = [];
      const fileUsage: UsageStats[] = [];
      const fileAuxiliaryUsage: AuxiliaryUsageEntry[] = [];
      const hunkFailures: HunkFailure[] = [];
      const hunkTraces: HunkTrace[] = [];
      let failedHunks = 0;
      let failedExtractions = 0;

      for (const [chunkIndex, chunk] of group.chunks.entries()) {
        if (abortController?.signal.aborted) break;

        const lineRange = formatChunkLineRange(chunk);
        callbacks?.onHunkStart?.(chunkIndex + 1, group.chunks.length, lineRange);

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
        const result = await analyzeReviewChunk(skill, chunk, repoPath, options, hunkCallbacks, prContext);
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
            filename: group.displayName,
            lineRange,
            code: result.failureCode ?? 'unknown',
            message: result.failureMessage ?? 'unknown error',
            ...(result.attempts !== undefined ? { attempts: result.attempts } : {}),
          });
        } else if (result.extractionFailed) {
          failedExtractions++;
          hunkFailures.push({
            type: 'extraction',
            filename: group.displayName,
            lineRange,
            code: mapExtractionErrorCode(result.extractionError),
            message: result.extractionError ?? 'unknown extraction error',
            ...(result.extractionPreview !== undefined ? { preview: result.extractionPreview } : {}),
          });
        }

        attachElapsedTime(result.findings, callbacks?.skillStartTime);
        callbacks?.onHunkComplete?.(chunkIndex + 1, result.findings, result.usage);
        if (result.trace) {
          hunkTraces.push(result.trace);
        }
        const chunkResult: ChunkAnalysisResult = {
          filename: group.displayName,
          model: options.model,
          index: chunkIndex + 1,
          total: group.chunks.length,
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
          trace: result.trace,
        };
        callbacks?.onChunkComplete?.(chunkResult);

        fileFindings.push(...result.findings);
        fileUsage.push(result.usage);
        if (result.auxiliaryUsage) {
          fileAuxiliaryUsage.push(...result.auxiliaryUsage);
        }
      }

      span.setAttribute('warden.finding.count', fileFindings.length);
      span.setAttribute('warden.hunk.failed_count', failedHunks);
      span.setAttribute('warden.extraction.failed_count', failedExtractions);

      return {
        filename: group.displayName,
        filenames: group.filenames,
        findings: fileFindings,
        usage: aggregateUsage(fileUsage),
        failedHunks,
        failedExtractions,
        hunkFailures,
        auxiliaryUsage: fileAuxiliaryUsage.length > 0 ? fileAuxiliaryUsage : undefined,
        traces: hunkTraces.length > 0 ? hunkTraces : undefined,
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
 * Run a skill on a PR, analyzing each prepared review chunk separately.
 */
export async function runSkill(
  skill: SkillDefinition,
  context: EventContext,
  options: SkillRunnerOptions = {}
): Promise<SkillReport> {
  return Sentry.startSpan(
    {
      op: 'skill.run',
      name: `run ${skill.name}`,
      attributes: {
        'gen_ai.agent.name': skill.name,
        ...(options.telemetryTriggerName ? { 'warden.trigger.name': options.telemetryTriggerName } : {}),
        'warden.file.count': context.pullRequest?.files.length ?? 0,
      },
    },
    async (span) => {
      try {
        const report = await runSkillAnalysis(skill, context, options);
        span.setAttribute('warden.finding.count', report.findings.length);
        emitSkillMetrics(report);
        return report;
      } catch (error) {
        span.setAttribute('warden.finding.count', 0);
        throw error;
      }
    },
  );
}

async function runSkillAnalysis(
  skill: SkillDefinition,
  context: EventContext,
  options: SkillRunnerOptions = {}
): Promise<SkillReport> {
  const { parallel = true, callbacks, abortController } = options;
  const startTime = Date.now();

  if (!context.pullRequest) {
    throw new SkillRunnerError('Pull request context required for skill execution');
  }

  const { files: initialPreparedFiles, skippedFiles } = prepareFiles(context, {
    contextLines: options.contextLines,
    ignore: options.ignore,
    scan: options.scan,
    chunking: options.chunking,
  });
  const semanticPlan = await planSemanticReviewChunks(initialPreparedFiles, context, {
    enabled: options.chunking?.semantic?.enabled,
    apiKey: options.apiKey,
    runtime: options.runtime,
    model: options.model,
    maxChunks: options.chunking?.semantic?.maxChunks,
    maxChunkChars: options.chunking?.semantic?.maxChunkChars,
    maxHunksPerChunk: options.chunking?.semantic?.maxHunksPerChunk,
    maxChangedRangesPerChunk: options.chunking?.semantic?.maxChangedRangesPerChunk,
    maxEmbeddedDiffChars: options.chunking?.semantic?.maxEmbeddedDiffChars,
    maxEmbeddedDiffChunks: options.chunking?.semantic?.maxEmbeddedDiffChunks,
    maxEmbeddedDiffRanges: options.chunking?.semantic?.maxEmbeddedDiffRanges,
  });
  const chunkGroups = semanticPlan.groups;

  if (chunkGroups.length === 0) {
    const report: SkillReport = {
      skill: skill.name,
      summary: 'No code changes to analyze',
      findings: [],
      usage: emptyUsage(),
      durationMs: Date.now() - startTime,
      model: options.model,
      runtime: options.runtime ?? 'pi',
    };
    if (skippedFiles.length > 0) {
      report.skippedFiles = skippedFiles;
    }
    return report;
  }

  const totalFiles = chunkGroups.length;
  const totalHunks = chunkGroups.reduce((sum, group) => sum + group.chunks.length, 0);
  const allFindings: Finding[] = [];

  // Track all usage stats for aggregation
  const allUsage: UsageStats[] = [];
  const allAuxiliaryUsage: AuxiliaryUsageEntry[] = [];
  if (semanticPlan.usage) {
    allAuxiliaryUsage.push({
      agent: 'semantic-chunk-planner',
      usage: semanticPlan.usage,
      model: options.model,
      runtime: options.runtime,
    });
  }
  const allTraces: HunkTrace[] = [];

  // Track failed hunks across all files
  let totalFailedHunks = 0;
  let totalFailedExtractions = 0;

  // Build PR context for inclusion in prompts (helps LLM understand the full scope of changes)
  // For non-PR contexts (CLI file/diff mode), skip the "Other Files" list to avoid
  // bloating every chunk prompt with thousands of filenames.
  const isPullRequest = context.pullRequest.number !== 0;
  const prContext: PRPromptContext = {
    repository: context.repository.fullName,
    changedFiles: isPullRequest ? context.pullRequest.files.map((f) => f.filename) : [],
    title: context.pullRequest.title,
    body: context.pullRequest.body,
    maxContextFiles: options.maxContextFiles,
  };

  /**
   * Process all review chunks for a single file sequentially.
   * Wraps analyzeFile with progress callbacks.
   */
  async function processFile(
    group: ReviewChunkGroup,
    fileIndex: number
  ): Promise<FileAnalysisResult> {
    const filename = group.displayName;

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

    const result = await analyzeFile(skill, group, context.repoPath, options, fileCallbacks, prContext);

    callbacks?.onFileComplete?.(filename, fileIndex, totalFiles);

    return result;
  }

  /** Process a file with timing, returning a self-contained result. */
  async function processFileWithTiming(group: ReviewChunkGroup, fileIndex: number) {
    const fileStart = Date.now();
    const result = await processFile(group, fileIndex);
    const durationMs = Date.now() - fileStart;
    return { group, result, durationMs };
  }

  // Collect results in input order (Promise.all preserves order)
  const fileResults: { group: ReviewChunkGroup; result: FileAnalysisResult; durationMs: number }[] = [];

  // Process files - parallel or sequential based on options
  if (parallel) {
    // Process files with sliding-window concurrency pool
    const fileConcurrency = options.concurrency ?? DEFAULT_FILE_CONCURRENCY;
    const batchDelayMs = options.batchDelayMs ?? 0;

    fileResults.push(...await runPool(chunkGroups, fileConcurrency,
      async (group, index) => {
        // Rate-limit: delay items beyond the first concurrent wave
        if (index >= fileConcurrency && batchDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
        }
        return processFileWithTiming(group, index);
      },
      { shouldAbort: () => abortController?.signal.aborted ?? false }
    ));
  } else {
    // Process files sequentially
    for (const [fileIndex, group] of chunkGroups.entries()) {
      // Check for abort before starting new file
      if (abortController?.signal.aborted) break;

      fileResults.push(await processFileWithTiming(group, fileIndex));
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
    if (fr.result.traces) {
      allTraces.push(...fr.result.traces);
    }
  }

  // All chunks failed — typically a systemic problem (auth, subprocess, etc).
  // Throw so direct SDK consumers (evals, scheduled workflows) keep their
  // prior exception-based contract. The CLI path (tasks.ts) has its own
  // all-hunks-fail detection that emits a structured JSONL record instead.
  // Count both analysis and extraction failures: each chunk contributes to
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
      && analysisFailures.every((failure) => failure.code === 'invalid_model_selector')
    ) {
      throw new SkillRunnerError(
        analysisFailures[0]?.message ?? 'Invalid Pi model selector.',
        { code: 'invalid_model_selector' },
      );
    }
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
      `This usually indicates an authentication problem. ${allHunksFailedGuidance(options.runtime)}`,
      { code: 'all_hunks_failed' },
    );
  }

  let finalFindings = allFindings;
  if (options.postProcessFindings !== false) {
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
      effort: options.effort,
      abortController: options.abortController,
      pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
      prContext,
      onFindingProcessing: options.callbacks?.onFindingProcessing,
    });
    finalFindings = processed.findings;
    allAuxiliaryUsage.push(...processed.auxiliaryUsage);
  }

  // Generate summary
  const summary = generateSummary(skill.name, finalFindings);

  // Aggregate usage across all chunks
  const totalUsage = aggregateUsage(allUsage);

  const report: SkillReport = {
    skill: skill.name,
    summary,
    findings: finalFindings,
    usage: totalUsage,
    durationMs: Date.now() - startTime,
    model: options.model,
    files: buildFileReports(
      fileResults.flatMap((fr) => fileReportInputsFromGroup({
        group: fr.group,
        durationMs: fr.durationMs,
        usage: fr.result.usage,
      })),
      finalFindings,
    ),
  };
  report.runtime = options.runtime ?? 'pi';
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
  if (options.captureTraces && allTraces.length > 0) {
    report.traces = allTraces;
  }
  const auxUsage = aggregateAuxiliaryUsage(allAuxiliaryUsage);
  if (auxUsage) {
    report.auxiliaryUsage = auxUsage;
  }
  const auxAttribution = aggregateAuxiliaryUsageAttribution(allAuxiliaryUsage);
  if (auxAttribution) {
    report.auxiliaryUsageAttribution = auxAttribution;
  }
  return report;
}
