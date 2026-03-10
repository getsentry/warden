import { query, type SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import type { SkillDefinition } from '../config/schema.js';
import type { Finding, RetryConfig } from '../types/index.js';
import { getHunkLineRange, type HunkWithContext } from '../diff/index.js';
import { Sentry, emitExtractionMetrics, emitRetryMetric, emitDedupMetrics, emitFixGateMetrics, logger } from '../sentry.js';
import { SkillRunnerError, WardenAuthenticationError, isRetryableError, isAuthenticationError, isAuthenticationErrorMessage, isSubprocessError } from './errors.js';
import { DEFAULT_RETRY_CONFIG, calculateRetryDelay, sleep } from './retry.js';
import { extractUsage, aggregateUsage, emptyUsage, estimateTokens, aggregateAuxiliaryUsage } from './usage.js';
import { buildHunkSystemPrompt, buildHunkUserPrompt, type PRPromptContext } from './prompt.js';
import { extractFindingsJson, extractFindingsWithLLM, validateFindings, deduplicateFindings, mergeCrossLocationFindings } from './extract.js';
import { sanitizeFindingsSuggestedFixes } from './fix-quality.js';
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
} from './types.js';
import { prepareFiles } from './prepare.js';
import type { EventContext, SkillReport, UsageStats } from '../types/index.js';
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

/**
 * Parse findings from a hunk analysis result.
 * Uses a two-tier extraction strategy:
 * 1. Regex-based extraction (fast, handles well-formed output)
 * 2. LLM fallback using haiku (handles malformed output gracefully)
 */
async function parseHunkOutput(
  result: SDKResultMessage,
  filename: string,
  apiKey?: string,
  auxiliaryMaxRetries?: number
): Promise<ParseHunkOutputResult> {
  if (result.subtype !== 'success') {
    // SDK error - not an extraction failure, just no findings
    return { findings: [], extractionFailed: false, extractionMethod: 'none' };
  }

  // Tier 1: Try regex-based extraction first (fast)
  const extracted = extractFindingsJson(result.result);

  if (extracted.success) {
    return { findings: validateFindings(extracted.findings, filename), extractionFailed: false, extractionMethod: 'regex' };
  }

  // Tier 2: Try LLM fallback for malformed output
  const fallback = await extractFindingsWithLLM(result.result, apiKey, auxiliaryMaxRetries);

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

/** Buffered data for a single SDK turn, flushed into gen_ai.chat child spans. */
interface TurnData {
  toolUses: { id: string; name: string }[];
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  model: string;
}

/**
 * Result from executing an SDK query, including any captured errors.
 */
interface QueryExecutionResult {
  result?: SDKResultMessage;
  /** Authentication error captured from auth_status message */
  authError?: string;
  /** Captured stderr output from Claude Code process */
  stderr?: string;
}

/**
 * Execute a single SDK query attempt.
 * Captures stderr for better error diagnostics when Claude Code fails.
 */
async function executeQuery(
  systemPrompt: string,
  userPrompt: string,
  repoPath: string,
  options: SkillRunnerOptions,
  skillName: string
): Promise<QueryExecutionResult> {
  const { maxTurns = 50, model, abortController, pathToClaudeCodeExecutable } = options;
  const modelId = model ?? 'unknown';

  return Sentry.startSpan(
    {
      op: 'gen_ai.invoke_agent',
      name: `invoke_agent ${skillName}`,
      attributes: {
        'gen_ai.operation.name': 'invoke_agent',
        'gen_ai.provider.name': 'anthropic',
        'gen_ai.agent.name': skillName,
        'gen_ai.request.model': modelId,
        'warden.request.max_turns': maxTurns,
      },
    },
    async (span) => {
      span.setAttribute('gen_ai.request.messages', JSON.stringify([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]));

      // Capture stderr output for better error diagnostics
      const stderrChunks: string[] = [];

      const stream = query({
        prompt: userPrompt,
        options: {
          maxTurns,
          cwd: repoPath,
          systemPrompt,
          // Only allow read-only tools - context is already provided in the prompt
          allowedTools: ['Read', 'Grep', 'Glob'],
          // Explicitly block modification/side-effect tools as defense-in-depth
          disallowedTools: ['Write', 'Edit', 'Bash', 'WebFetch', 'WebSearch', 'Task', 'TodoWrite'],
          permissionMode: 'bypassPermissions',
          // Prevent SDK from writing session .jsonl files and polluting Claude Code's session index
          persistSession: false,
          model,
          abortController,
          pathToClaudeCodeExecutable,
          stderr: (data: string) => {
            stderrChunks.push(data);
          },
        },
      });

      let resultMessage: SDKResultMessage | undefined;
      let authError: string | undefined;

      // Per-turn tracing: buffer assistant messages and tool progress to create
      // child spans (gen_ai.chat + gen_ai.execute_tool) under the invoke_agent span.
      // We flush the previous turn when a new assistant message or result arrives,
      // ensuring tool_progress events are captured before span creation.
      let turnCount = 0;
      let pendingTurn: TurnData | null = null;
      const pendingToolProgress = new Map<string, number>();

      /** Flush buffered turn data into gen_ai.chat and gen_ai.execute_tool child spans. */
      function flushPendingTurn(): void {
        if (!pendingTurn) return;
        turnCount++;
        const turn = pendingTurn;
        const toolProgress = new Map(pendingToolProgress);
        pendingTurn = null;
        pendingToolProgress.clear();

        try {
          const totalInput = turn.inputTokens + turn.cacheRead + turn.cacheWrite;

          Sentry.startSpan(
            {
              op: 'gen_ai.chat',
              name: `chat ${skillName} turn ${turnCount}`,
              attributes: {
                'gen_ai.operation.name': 'chat',
                'gen_ai.provider.name': 'anthropic',
                'gen_ai.agent.name': skillName,
                'gen_ai.request.model': modelId,
                'gen_ai.response.model': turn.model,
                'gen_ai.usage.input_tokens': totalInput,
                'gen_ai.usage.output_tokens': turn.outputTokens,
                'gen_ai.usage.input_tokens.cached': turn.cacheRead,
                'gen_ai.usage.input_tokens.cache_write': turn.cacheWrite,
                'gen_ai.usage.total_tokens': totalInput + turn.outputTokens,
                'gen_ai.tool_use.count': turn.toolUses.length,
              },
            },
            () => {
              for (const toolUse of turn.toolUses) {
                const elapsed = toolProgress.get(toolUse.id);
                Sentry.startSpan(
                  {
                    op: 'gen_ai.execute_tool',
                    name: toolUse.name,
                    attributes: {
                      'gen_ai.tool.name': toolUse.name,
                      ...(elapsed !== undefined && { 'tool.elapsed_seconds': elapsed }),
                    },
                  },
                  () => { /* point-in-time span */ }
                );
              }
            }
          );
        } catch {
          // Telemetry should never break the workflow
        }
      }

      try {
        for await (const message of stream) {
          if (message.type === 'assistant') {
            flushPendingTurn();
            const msg = message.message;
            const toolUses = msg.content
              .filter((block): block is typeof block & { type: 'tool_use' } => block.type === 'tool_use')
              .map(({ id, name }) => ({ id, name }));
            pendingTurn = {
              toolUses,
              inputTokens: msg.usage?.input_tokens ?? 0,
              outputTokens: msg.usage?.output_tokens ?? 0,
              cacheRead: msg.usage?.cache_read_input_tokens ?? 0,
              cacheWrite: msg.usage?.cache_creation_input_tokens ?? 0,
              model: msg.model,
            };
          } else if (message.type === 'tool_progress') {
            pendingToolProgress.set(message.tool_use_id, message.elapsed_time_seconds);
          } else if (message.type === 'result') {
            flushPendingTurn();
            resultMessage = message;
          } else if (message.type === 'auth_status' && message.error) {
            authError = message.error;
          }
        }
      } catch (error) {
        // Re-throw with stderr info if available
        const stderr = stderrChunks.join('').trim();
        if (stderr) {
          const originalMessage = error instanceof Error ? error.message : String(error);
          const enhancedError = new Error(`${originalMessage}\nClaude Code stderr: ${stderr}`);
          enhancedError.cause = error;
          throw enhancedError;
        }
        throw error;
      } finally {
        // Flush any pending turn data for trace completeness
        flushPendingTurn();
      }

      // Set response attributes from SDK result
      if (resultMessage) {
        const usage = resultMessage.usage;
        if (usage) {
          const inputTokens = usage.input_tokens ?? 0;
          const outputTokens = usage.output_tokens ?? 0;
          const cacheRead = usage.cache_read_input_tokens ?? 0;
          const cacheWrite = usage.cache_creation_input_tokens ?? 0;
          // Anthropic API's input_tokens is only the non-cached portion.
          // OpenTelemetry gen_ai.usage.input_tokens expects the total input tokens.
          const totalInputTokens = inputTokens + cacheRead + cacheWrite;
          span.setAttribute('gen_ai.usage.input_tokens', totalInputTokens);
          span.setAttribute('gen_ai.usage.output_tokens', outputTokens);
          span.setAttribute('gen_ai.usage.input_tokens.cached', cacheRead);
          span.setAttribute('gen_ai.usage.input_tokens.cache_write', cacheWrite);
          span.setAttribute('gen_ai.usage.total_tokens', totalInputTokens + outputTokens);
        }
        if (resultMessage.total_cost_usd !== undefined) {
          span.setAttribute('gen_ai.cost.total_tokens', resultMessage.total_cost_usd);
        }
        if (resultMessage.uuid) {
          span.setAttribute('gen_ai.response.id', resultMessage.uuid);
        }
        if (resultMessage.modelUsage) {
          const models = Object.keys(resultMessage.modelUsage);
          if (models.length === 1 && models[0]) {
            // Single model: set per OTel spec (string, one model)
            span.setAttribute('gen_ai.response.model', models[0]);
          }
          // Multiple models: don't set gen_ai.response.model on the parent.
          // Per-turn gen_ai.chat child spans carry the correct model each.
        }

        if (resultMessage.subtype === 'success' && resultMessage.result) {
          span.setAttribute('gen_ai.response.text', JSON.stringify([resultMessage.result]));
        }

        // Optional SDK metadata attributes
        const optionalAttrs: Record<string, string | number | undefined> = {
          'gen_ai.conversation.id': resultMessage.session_id,
          'sdk.duration_ms': resultMessage.duration_ms,
          'sdk.duration_api_ms': resultMessage.duration_api_ms,
          'sdk.num_turns': resultMessage.num_turns,
        };
        for (const [key, value] of Object.entries(optionalAttrs)) {
          if (value !== undefined) {
            span.setAttribute(key, value);
          }
        }
      }

      const stderr = stderrChunks.join('').trim() || undefined;
      return { result: resultMessage, authError, stderr };
    },
  );
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
      const { apiKey, abortController, retry } = options;

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
        // Check for abort before each attempt
        if (abortController?.signal.aborted) {
          if (callbacks?.onHunkFailed) {
            callbacks.onHunkFailed(callbacks.lineRange, 'Analysis aborted');
          }
          return { findings: [], usage: aggregateUsage(accumulatedUsage), failed: true, extractionFailed: false };
        }

        try {
          const { result: resultMessage, authError } = await executeQuery(systemPrompt, userPrompt, repoPath, options, skill.name);

          // Check for authentication errors from auth_status messages
          // auth_status errors are always auth-related - throw immediately
          if (authError) {
            throw new WardenAuthenticationError(authError);
          }

          if (!resultMessage) {
            if (callbacks?.onHunkFailed) {
              callbacks.onHunkFailed(callbacks.lineRange, 'SDK returned no result');
            } else {
              console.error('SDK returned no result');
            }
            return { findings: [], usage: aggregateUsage(accumulatedUsage), failed: true, extractionFailed: false };
          }

          // Extract usage from the result, regardless of success/error status
          const usage = extractUsage(resultMessage);
          accumulatedUsage.push(usage);

          // Check if the SDK returned an error result (e.g., max turns, budget exceeded)
          const isError = resultMessage.is_error || resultMessage.subtype !== 'success';

          if (isError) {
            // Extract error messages from SDK result
            const errorMessages = 'errors' in resultMessage ? resultMessage.errors : [];

            // Check if any error indicates authentication failure
            for (const err of errorMessages) {
              if (isAuthenticationErrorMessage(err)) {
                throw new WardenAuthenticationError();
              }
            }

            // SDK error - log and return failure with error details
            const errorSummary = errorMessages.length > 0
              ? errorMessages.join('; ')
              : `SDK error: ${resultMessage.subtype}`;
            if (callbacks?.onHunkFailed) {
              callbacks.onHunkFailed(callbacks.lineRange, `SDK execution failed: ${errorSummary}`);
            } else {
              console.error(`SDK execution failed: ${errorSummary}`);
            }
            return {
              findings: [],
              usage: aggregateUsage(accumulatedUsage),
              failed: true,
              extractionFailed: false,
            };
          }

          const parseResult = await parseHunkOutput(resultMessage, hunkCtx.filename, apiKey, options.auxiliaryMaxRetries);

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

          // Re-throw authentication errors (they shouldn't be retried)
          if (error instanceof WardenAuthenticationError) {
            throw error;
          }

          // Subprocess IPC failures (EPIPE, ECONNRESET, etc.) indicate the Claude CLI
          // can't communicate — surface as an auth error with actionable guidance
          if (isSubprocessError(error)) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new WardenAuthenticationError(
              `Claude Code subprocess failed (${errorMessage}).\n` +
              `This usually means the claude CLI cannot run in this environment.`,
              { cause: error }
            );
          }

          // Authentication errors should surface immediately with helpful guidance
          if (isAuthenticationError(error)) {
            throw new WardenAuthenticationError(undefined, { cause: error });
          }

          // Don't retry if not a retryable error or we've exhausted retries
          if (!isRetryableError(error) || attempt >= retryConfig.maxRetries) {
            break;
          }

          // Calculate delay and wait before retry
          const delayMs = calculateRetryDelay(attempt, retryConfig);
          const errorMessage = error instanceof Error ? error.message : String(error);

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
            if (callbacks?.onHunkFailed) {
              callbacks.onHunkFailed(callbacks.lineRange, 'Analysis aborted during retry delay');
            }
            return { findings: [], usage: aggregateUsage(accumulatedUsage), failed: true, extractionFailed: false };
          }
        }
      }

      // All attempts failed - return failure with any accumulated usage
      const finalError = lastError instanceof Error ? lastError.message : String(lastError);

      // Log the final error
      if (lastError) {
        if (callbacks?.onHunkFailed) {
          callbacks.onHunkFailed(callbacks.lineRange, `All retry attempts failed: ${finalError}`);
        } else {
          console.error(`All retry attempts failed: ${finalError}`);
        }
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

      return { findings: [], usage: aggregateUsage(accumulatedUsage), failed: true, extractionFailed: false };
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

        const result = await analyzeHunk(skill, hunk, repoPath, options, hunkCallbacks, prContext);

        if (result.failed) {
          failedHunks++;
        }
        if (result.extractionFailed) {
          failedExtractions++;
        }

        attachElapsedTime(result.findings, callbacks?.skillStartTime);
        callbacks?.onHunkComplete?.(hunkIndex + 1, result.findings, result.usage);

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
  for (const fr of fileResults) {
    allFindings.push(...fr.result.findings);
    allUsage.push(fr.result.usage);
    totalFailedHunks += fr.result.failedHunks;
    totalFailedExtractions += fr.result.failedExtractions;
    if (fr.result.auxiliaryUsage) {
      allAuxiliaryUsage.push(...fr.result.auxiliaryUsage);
    }
  }

  // Check if all analysis failed (indicates a systemic problem like auth failure)
  if (totalFailedHunks > 0 && totalFailedHunks === totalHunks && allFindings.length === 0) {
    throw new SkillRunnerError(
      `All ${totalHunks} chunk${totalHunks === 1 ? '' : 's'} failed to analyze. ` +
      `This usually indicates an authentication problem. ` +
      `Verify WARDEN_ANTHROPIC_API_KEY is set correctly, or run 'claude login' if using Claude Code subscription.`
    );
  }

  // Deduplicate findings
  const uniqueFindings = deduplicateFindings(allFindings);
  emitDedupMetrics(skill.name, allFindings.length, uniqueFindings.length);

  // Merge findings that describe the same issue at different locations
  const mergeResult = await mergeCrossLocationFindings(uniqueFindings, {
    apiKey: options.apiKey,
    repoPath: context.repoPath,
    maxRetries: options.auxiliaryMaxRetries,
  });
  let mergedFindings = mergeResult.findings;
  if (mergeResult.usage) {
    allAuxiliaryUsage.push({ agent: 'merge', usage: mergeResult.usage });
  }
  const sanitized = await sanitizeFindingsSuggestedFixes(mergedFindings, {
    repoPath: context.repoPath,
    apiKey: options.apiKey,
    maxRetries: options.auxiliaryMaxRetries,
  });
  mergedFindings = sanitized.findings;
  if (sanitized.usage) {
    allAuxiliaryUsage.push({ agent: 'fix_gate', usage: sanitized.usage });
  }
  emitFixGateMetrics(
    skill.name,
    sanitized.stats.checked,
    sanitized.stats.strippedDeterministic,
    sanitized.stats.strippedSemantic,
    sanitized.stats.semanticUnavailable
  );
  if (sanitized.stats.checked > 0) {
    logger.info('Suggested fix quality gate', {
      'fix_gate.checked': sanitized.stats.checked,
      'fix_gate.stripped_deterministic': sanitized.stats.strippedDeterministic,
      'fix_gate.stripped_semantic': sanitized.stats.strippedSemantic,
      'fix_gate.semantic_unavailable': sanitized.stats.semanticUnavailable,
    });
  }

  // Generate summary
  const summary = generateSummary(skill.name, mergedFindings);

  // Aggregate usage across all hunks
  const totalUsage = aggregateUsage(allUsage);

  const report: SkillReport = {
    skill: skill.name,
    summary,
    findings: mergedFindings,
    usage: totalUsage,
    durationMs: Date.now() - startTime,
    model: options.model,
    files: fileResults.map((fr) => ({
      filename: fr.filename,
      findingCount: fr.result.findings.length,
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
  const auxUsage = aggregateAuxiliaryUsage(allAuxiliaryUsage);
  if (auxUsage) {
    report.auxiliaryUsage = auxUsage;
  }
  return report;
}
