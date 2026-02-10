import { query } from '@anthropic-ai/claude-agent-sdk';
import { SkillRunnerError, WardenAuthenticationError, isRetryableError, isAuthenticationError, isAuthenticationErrorMessage } from './errors.js';
import { DEFAULT_RETRY_CONFIG, calculateRetryDelay, sleep } from './retry.js';
import { extractUsage, aggregateUsage, emptyUsage, estimateTokens, aggregateAuxiliaryUsage } from './usage.js';
import { buildHunkSystemPrompt, buildHunkUserPrompt } from './prompt.js';
import { extractFindingsJson, extractFindingsWithLLM, validateFindings, deduplicateFindings } from './extract.js';
import { LARGE_PROMPT_THRESHOLD_CHARS, DEFAULT_FILE_CONCURRENCY, } from './types.js';
import { prepareFiles } from './prepare.js';
import { runPool } from '../utils/index.js';
/**
 * Parse findings from a hunk analysis result.
 * Uses a two-tier extraction strategy:
 * 1. Regex-based extraction (fast, handles well-formed output)
 * 2. LLM fallback using haiku (handles malformed output gracefully)
 */
async function parseHunkOutput(result, filename, apiKey) {
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
    const fallback = await extractFindingsWithLLM(result.result, apiKey);
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
 * Execute a single SDK query attempt.
 * Captures stderr for better error diagnostics when Claude Code fails.
 */
async function executeQuery(systemPrompt, userPrompt, repoPath, options) {
    const { maxTurns = 50, model, abortController, pathToClaudeCodeExecutable } = options;
    // Capture stderr output for better error diagnostics
    const stderrChunks = [];
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
            stderr: (data) => {
                stderrChunks.push(data);
            },
        },
    });
    let resultMessage;
    let authError;
    try {
        for await (const message of stream) {
            if (message.type === 'result') {
                resultMessage = message;
            }
            else if (message.type === 'auth_status' && message.error) {
                // Capture authentication errors from auth_status messages
                authError = message.error;
            }
        }
    }
    catch (error) {
        // Re-throw with stderr info if available
        const stderr = stderrChunks.join('').trim();
        if (stderr) {
            const originalMessage = error instanceof Error ? error.message : String(error);
            const enhancedError = new Error(`${originalMessage}\nClaude Code stderr: ${stderr}`);
            enhancedError.cause = error;
            throw enhancedError;
        }
        throw error;
    }
    const stderr = stderrChunks.join('').trim() || undefined;
    return { result: resultMessage, authError, stderr };
}
/**
 * Analyze a single hunk with retry logic for transient failures.
 */
async function analyzeHunk(skill, hunkCtx, repoPath, options, callbacks, prContext) {
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
    const retryConfig = {
        ...DEFAULT_RETRY_CONFIG,
        ...retry,
    };
    let lastError;
    // Track accumulated usage across retry attempts for accurate cost reporting
    const accumulatedUsage = [];
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
        // Check for abort before each attempt
        if (abortController?.signal.aborted) {
            return { findings: [], usage: aggregateUsage(accumulatedUsage), failed: true, extractionFailed: false };
        }
        try {
            const { result: resultMessage, authError } = await executeQuery(systemPrompt, userPrompt, repoPath, options);
            // Check for authentication errors from auth_status messages
            // auth_status errors are always auth-related - throw immediately
            if (authError) {
                throw new WardenAuthenticationError(authError);
            }
            if (!resultMessage) {
                console.error('SDK returned no result');
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
                console.error(`SDK execution failed: ${errorSummary}`);
                return {
                    findings: [],
                    usage: aggregateUsage(accumulatedUsage),
                    failed: true,
                    extractionFailed: false,
                };
            }
            const parseResult = await parseHunkOutput(resultMessage, hunkCtx.filename, apiKey);
            // Notify about extraction result (debug mode)
            callbacks?.onExtractionResult?.(callbacks.lineRange, parseResult.findings.length, parseResult.extractionMethod);
            // Notify about extraction failure if callback provided
            if (parseResult.extractionFailed) {
                callbacks?.onExtractionFailure?.(callbacks.lineRange, parseResult.extractionError ?? 'unknown_error', parseResult.extractionPreview ?? '');
            }
            return {
                findings: parseResult.findings,
                usage: aggregateUsage(accumulatedUsage),
                failed: false,
                extractionFailed: parseResult.extractionFailed,
                extractionError: parseResult.extractionError,
                extractionPreview: parseResult.extractionPreview,
                auxiliaryUsage: parseResult.extractionUsage
                    ? [{ agent: 'extraction', usage: parseResult.extractionUsage }]
                    : undefined,
            };
        }
        catch (error) {
            lastError = error;
            // Re-throw authentication errors (they shouldn't be retried)
            if (error instanceof WardenAuthenticationError) {
                throw error;
            }
            // Authentication errors should surface immediately with helpful guidance
            if (isAuthenticationError(error)) {
                throw new WardenAuthenticationError();
            }
            // Don't retry if not a retryable error or we've exhausted retries
            if (!isRetryableError(error) || attempt >= retryConfig.maxRetries) {
                break;
            }
            // Calculate delay and wait before retry
            const delayMs = calculateRetryDelay(attempt, retryConfig);
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Notify about retry in verbose mode
            callbacks?.onRetry?.(callbacks.lineRange, attempt + 1, retryConfig.maxRetries, errorMessage, delayMs);
            try {
                await sleep(delayMs, abortController?.signal);
            }
            catch {
                // Aborted during sleep
                return { findings: [], usage: aggregateUsage(accumulatedUsage), failed: true, extractionFailed: false };
            }
        }
    }
    // All attempts failed - return failure with any accumulated usage
    const finalError = lastError instanceof Error ? lastError.message : String(lastError);
    // Log the final error
    if (lastError) {
        console.error(`All retry attempts failed: ${finalError}`);
    }
    // Also notify via callback if verbose
    if (options.verbose) {
        callbacks?.onRetry?.(callbacks.lineRange, retryConfig.maxRetries + 1, retryConfig.maxRetries, `Final failure: ${finalError}`, 0);
    }
    return { findings: [], usage: aggregateUsage(accumulatedUsage), failed: true, extractionFailed: false };
}
/**
 * Get line range string for a hunk.
 */
function getHunkLineRange(hunk) {
    const start = hunk.hunk.newStart;
    const end = start + hunk.hunk.newCount - 1;
    return start === end ? `${start}` : `${start}-${end}`;
}
/**
 * Attach elapsed time to findings if skill start time is available.
 */
function attachElapsedTime(findings, skillStartTime) {
    if (skillStartTime === undefined)
        return;
    const elapsedMs = Date.now() - skillStartTime;
    for (const finding of findings) {
        finding.elapsedMs = elapsedMs;
    }
}
/**
 * Analyze a single prepared file's hunks.
 */
export async function analyzeFile(skill, file, repoPath, options = {}, callbacks, prContext) {
    const { abortController } = options;
    const fileFindings = [];
    const fileUsage = [];
    const fileAuxiliaryUsage = [];
    let failedHunks = 0;
    let failedExtractions = 0;
    for (const [hunkIndex, hunk] of file.hunks.entries()) {
        if (abortController?.signal.aborted)
            break;
        const lineRange = getHunkLineRange(hunk);
        callbacks?.onHunkStart?.(hunkIndex + 1, file.hunks.length, lineRange);
        const hunkCallbacks = callbacks
            ? {
                lineRange,
                onLargePrompt: callbacks.onLargePrompt,
                onPromptSize: callbacks.onPromptSize,
                onRetry: callbacks.onRetry,
                onExtractionFailure: callbacks.onExtractionFailure,
                onExtractionResult: callbacks.onExtractionResult,
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
        callbacks?.onHunkComplete?.(hunkIndex + 1, result.findings);
        fileFindings.push(...result.findings);
        fileUsage.push(result.usage);
        if (result.auxiliaryUsage) {
            fileAuxiliaryUsage.push(...result.auxiliaryUsage);
        }
    }
    return {
        filename: file.filename,
        findings: fileFindings,
        usage: aggregateUsage(fileUsage),
        failedHunks,
        failedExtractions,
        auxiliaryUsage: fileAuxiliaryUsage.length > 0 ? fileAuxiliaryUsage : undefined,
    };
}
/**
 * Generate a summary of findings.
 */
export function generateSummary(skillName, findings) {
    if (findings.length === 0) {
        return `${skillName}: No issues found`;
    }
    const counts = {};
    for (const f of findings) {
        counts[f.severity] = (counts[f.severity] ?? 0) + 1;
    }
    const parts = [];
    if (counts['critical'])
        parts.push(`${counts['critical']} critical`);
    if (counts['high'])
        parts.push(`${counts['high']} high`);
    if (counts['medium'])
        parts.push(`${counts['medium']} medium`);
    if (counts['low'])
        parts.push(`${counts['low']} low`);
    if (counts['info'])
        parts.push(`${counts['info']} info`);
    return `${skillName}: Found ${findings.length} issue${findings.length === 1 ? '' : 's'} (${parts.join(', ')})`;
}
/**
 * Run a skill on a PR, analyzing each hunk separately.
 */
export async function runSkill(skill, context, options = {}) {
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
        const report = {
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
    const totalHunks = fileHunks.reduce((sum, file) => sum + file.hunks.length, 0);
    const allFindings = [];
    // Track all usage stats for aggregation
    const allUsage = [];
    const allAuxiliaryUsage = [];
    // Track failed hunks across all files
    let totalFailedHunks = 0;
    let totalFailedExtractions = 0;
    // Build PR context for inclusion in prompts (helps LLM understand the full scope of changes)
    const prContext = {
        changedFiles: context.pullRequest.files.map((f) => f.filename),
        title: context.pullRequest.title,
        body: context.pullRequest.body,
    };
    /**
     * Process all hunks for a single file sequentially.
     * Wraps analyzeFile with progress callbacks.
     */
    async function processFile(fileHunkEntry, fileIndex) {
        const { filename } = fileHunkEntry;
        callbacks?.onFileStart?.(filename, fileIndex, totalFiles);
        const fileCallbacks = {
            skillStartTime: callbacks?.skillStartTime,
            onHunkStart: (hunkNum, totalHunks, lineRange) => {
                callbacks?.onHunkStart?.(filename, hunkNum, totalHunks, lineRange);
            },
            onHunkComplete: (hunkNum, findings) => {
                callbacks?.onHunkComplete?.(filename, hunkNum, findings);
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
        };
        const result = await analyzeFile(skill, fileHunkEntry, context.repoPath, options, fileCallbacks, prContext);
        callbacks?.onFileComplete?.(filename, fileIndex, totalFiles);
        return result;
    }
    /** Process a file with timing, returning a self-contained result. */
    async function processFileWithTiming(fileHunkEntry, fileIndex) {
        const fileStart = Date.now();
        const result = await processFile(fileHunkEntry, fileIndex);
        const durationMs = Date.now() - fileStart;
        return { filename: fileHunkEntry.filename, result, durationMs };
    }
    // Collect results in input order (Promise.all preserves order)
    const fileResults = [];
    // Process files - parallel or sequential based on options
    if (parallel) {
        // Process files with sliding-window concurrency pool
        const fileConcurrency = options.concurrency ?? DEFAULT_FILE_CONCURRENCY;
        const batchDelayMs = options.batchDelayMs ?? 0;
        fileResults.push(...await runPool(fileHunks, fileConcurrency, async (fileHunkEntry, index) => {
            // Rate-limit: delay items beyond the first concurrent wave
            if (index >= fileConcurrency && batchDelayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
            }
            return processFileWithTiming(fileHunkEntry, index);
        }, { shouldAbort: () => abortController?.signal.aborted ?? false }));
    }
    else {
        // Process files sequentially
        for (const [fileIndex, fileHunkEntry] of fileHunks.entries()) {
            // Check for abort before starting new file
            if (abortController?.signal.aborted)
                break;
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
        throw new SkillRunnerError(`All ${totalHunks} chunk${totalHunks === 1 ? '' : 's'} failed to analyze. ` +
            `This usually indicates an authentication problem. ` +
            `Verify WARDEN_ANTHROPIC_API_KEY is set correctly, or run 'claude login' if using Claude Code subscription.`);
    }
    // Deduplicate findings
    const uniqueFindings = deduplicateFindings(allFindings);
    // Generate summary
    const summary = generateSummary(skill.name, uniqueFindings);
    // Aggregate usage across all hunks
    const totalUsage = aggregateUsage(allUsage);
    const report = {
        skill: skill.name,
        summary,
        findings: uniqueFindings,
        usage: totalUsage,
        durationMs: Date.now() - startTime,
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
//# sourceMappingURL=analyze.js.map