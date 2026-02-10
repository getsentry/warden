/**
 * Task execution for skills.
 * Callback-based state updates for CLI and Ink rendering.
 */
import { prepareFiles, analyzeFile, aggregateUsage, aggregateAuxiliaryUsage, deduplicateFindings, generateSummary, } from '../../sdk/runner.js';
import chalk from 'chalk';
import figures from 'figures';
import { Verbosity } from './verbosity.js';
import { ICON_CHECK, ICON_SKIPPED } from './icons.js';
import { timestamp } from './tty.js';
import { formatDuration, formatCost, formatLocation, formatSeverityPlain, formatFindingCountsPlain, countBySeverity, pluralize } from './formatters.js';
import { runPool } from '../../utils/index.js';
/**
 * Write a log-mode message to stderr with timestamp prefix.
 * Used for non-TTY / plain output.
 */
function logPlain(message) {
    console.error(`[${timestamp()}] warden: ${message}`);
}
/**
 * Write a debug-level message to stderr.
 * Uses chalk.dim formatting in TTY mode, timestamped "DEBUG:" prefix otherwise.
 */
function debugLog(mode, message) {
    if (mode.isTTY) {
        console.error(chalk.dim(`[debug] ${message}`));
    }
    else {
        logPlain(`DEBUG: ${message}`);
    }
}
/**
 * Format a finding's location as a compact string, falling back to 'unknown'.
 */
function findingLocation(finding) {
    if (!finding.location)
        return 'unknown';
    return formatLocation(finding.location.path, finding.location.startLine, finding.location.endLine);
}
/**
 * Run a single skill task.
 */
export async function runSkillTask(options, fileConcurrency, callbacks) {
    const { name, displayName = name, failOn, resolveSkill, context, runnerOptions = {} } = options;
    const startTime = Date.now();
    try {
        // Resolve the skill
        const skill = await resolveSkill();
        // Prepare files (parse patches into hunks)
        const { files: preparedFiles, skippedFiles } = prepareFiles(context, {
            contextLines: runnerOptions.contextLines,
        });
        if (preparedFiles.length === 0) {
            // No files to analyze - skip
            callbacks.onSkillSkipped(name);
            return {
                name,
                report: {
                    skill: skill.name,
                    summary: 'No code changes to analyze',
                    findings: [],
                    usage: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
                    skippedFiles: skippedFiles.length > 0 ? skippedFiles : undefined,
                },
                failOn,
            };
        }
        // Initialize file states
        const fileStates = preparedFiles.map((file) => ({
            filename: file.filename,
            status: 'pending',
            currentHunk: 0,
            totalHunks: file.hunks.length,
            findings: [],
        }));
        // Notify skill start
        callbacks.onSkillStart({
            name,
            displayName,
            status: 'running',
            startTime,
            files: fileStates,
            findings: [],
        });
        // Build PR context for inclusion in prompts (if available)
        const prContext = context.pullRequest
            ? {
                changedFiles: context.pullRequest.files.map((f) => f.filename),
                title: context.pullRequest.title,
                body: context.pullRequest.body,
            }
            : undefined;
        // Process files with concurrency
        const processFile = async (prepared, index) => {
            const filename = prepared.filename;
            const fileStartTime = Date.now();
            // Update file state to running (local + callback)
            const localState = fileStates[index];
            if (localState)
                localState.status = 'running';
            callbacks.onFileUpdate(name, filename, { status: 'running' });
            const fileCallbacks = {
                skillStartTime: startTime,
                onHunkStart: (hunkNum, totalHunks, lineRange) => {
                    callbacks.onFileUpdate(name, filename, {
                        currentHunk: hunkNum,
                        totalHunks,
                    });
                    callbacks.onHunkStart?.(name, filename, hunkNum, totalHunks, lineRange);
                },
                onHunkComplete: (_hunkNum, findings) => {
                    // Accumulate findings for this file
                    const current = fileStates[index];
                    if (current) {
                        current.findings.push(...findings);
                    }
                },
                onLargePrompt: callbacks.onLargePrompt
                    ? (lineRange, chars, estimatedTokens) => {
                        callbacks.onLargePrompt?.(name, filename, lineRange, chars, estimatedTokens);
                    }
                    : undefined,
                onPromptSize: callbacks.onPromptSize
                    ? (lineRange, systemChars, userChars, totalChars, estimatedTokens) => {
                        callbacks.onPromptSize?.(name, filename, lineRange, systemChars, userChars, totalChars, estimatedTokens);
                    }
                    : undefined,
                onExtractionResult: callbacks.onExtractionResult
                    ? (lineRange, findingsCount, method) => {
                        callbacks.onExtractionResult?.(name, filename, lineRange, findingsCount, method);
                    }
                    : undefined,
            };
            const result = await analyzeFile(skill, prepared, context.repoPath, runnerOptions, fileCallbacks, prContext);
            // Detect if this file was aborted before any real work happened
            const fileDurationMs = Date.now() - fileStartTime;
            const aborted = runnerOptions.abortController?.signal.aborted ?? false;
            const noWork = !result.usage || (result.usage.inputTokens === 0 && result.usage.outputTokens === 0);
            const fileStatus = (aborted && noWork) ? 'skipped' : 'done';
            if (localState)
                localState.status = fileStatus;
            callbacks.onFileUpdate(name, filename, {
                status: fileStatus,
                findings: result.findings,
                usage: result.usage,
                durationMs: fileDurationMs,
            });
            return { findings: result.findings, usage: result.usage, durationMs: fileDurationMs, failedHunks: result.failedHunks, failedExtractions: result.failedExtractions, auxiliaryUsage: result.auxiliaryUsage };
        };
        // Process files with sliding-window concurrency pool
        const batchDelayMs = runnerOptions.batchDelayMs ?? 0;
        const shouldAbort = () => runnerOptions.abortController?.signal.aborted ?? false;
        const allResults = await runPool(preparedFiles, fileConcurrency, async (file, index) => {
            // Rate-limit: delay items beyond the first concurrent wave
            if (index >= fileConcurrency && batchDelayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
            }
            return processFile(file, index);
        }, { shouldAbort });
        // Mark never-dispatched files as skipped
        for (const fileState of fileStates) {
            if (fileState.status === 'pending') {
                callbacks.onFileUpdate(name, fileState.filename, { status: 'skipped' });
            }
        }
        // Build report
        const duration = Date.now() - startTime;
        const allFindings = allResults.flatMap((r) => r.findings);
        const allUsage = allResults.map((r) => r.usage).filter((u) => u !== undefined);
        const allAuxEntries = allResults.flatMap((r) => r.auxiliaryUsage ?? []);
        const totalFailedHunks = allResults.reduce((sum, r) => sum + r.failedHunks, 0);
        const totalFailedExtractions = allResults.reduce((sum, r) => sum + r.failedExtractions, 0);
        const uniqueFindings = deduplicateFindings(allFindings);
        const report = {
            skill: skill.name,
            summary: generateSummary(skill.name, uniqueFindings),
            findings: uniqueFindings,
            usage: aggregateUsage(allUsage),
            durationMs: duration,
            files: preparedFiles.map((file, i) => {
                const r = allResults[i];
                return {
                    filename: file.filename,
                    findingCount: r?.findings.length ?? 0,
                    durationMs: r?.durationMs,
                    usage: r?.usage,
                };
            }),
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
        const auxUsage = aggregateAuxiliaryUsage(allAuxEntries);
        if (auxUsage) {
            report.auxiliaryUsage = auxUsage;
        }
        // Notify skill complete
        callbacks.onSkillUpdate(name, {
            status: 'done',
            durationMs: duration,
            findings: uniqueFindings,
            usage: report.usage,
        });
        callbacks.onSkillComplete(name, report);
        return { name, report, failOn };
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        callbacks.onSkillError(name, errorMessage);
        return { name, error: err, failOn };
    }
}
/**
 * Create default progress callbacks for console output.
 * In TTY mode: colored icons, chalk formatting.
 * In non-TTY/log mode: timestamped lines with finding details.
 */
export function createDefaultCallbacks(tasks, mode, verbosity) {
    /** Resolve the display name for a skill, falling back to the raw name. */
    function displayNameFor(name) {
        return tasks.find((t) => t.name === name)?.displayName ?? name;
    }
    return {
        onSkillStart: (skill) => {
            if (verbosity === Verbosity.Quiet)
                return;
            if (!mode.isTTY) {
                const fileCount = skill.files.length;
                logPlain(`Running ${displayNameFor(skill.name)} (${fileCount} ${pluralize(fileCount, 'file')})...`);
            }
        },
        onSkillUpdate: () => { },
        onFileUpdate: (_skillName, filename, updates) => {
            if (verbosity === Verbosity.Quiet || mode.isTTY)
                return;
            if (updates.status === 'skipped') {
                logPlain(`  ${displayNameFor(_skillName)} > ${filename} skipped`);
                return;
            }
            if (updates.status !== 'done')
                return;
            const duration = updates.durationMs !== undefined ? formatDuration(updates.durationMs) : '?';
            const cost = updates.usage ? ` ${formatCost(updates.usage.costUSD)}` : '';
            const n = updates.findings?.length ?? 0;
            const suffix = n > 0 ? ` ${n} ${pluralize(n, 'finding')}` : '';
            logPlain(`  ${displayNameFor(_skillName)} > ${filename} done ${duration}${cost}${suffix}`);
        },
        onHunkStart: (skillName, filename, hunkNum, totalHunks, lineRange) => {
            if (verbosity === Verbosity.Quiet || mode.isTTY)
                return;
            logPlain(`  ${displayNameFor(skillName)} > ${filename} [${hunkNum}/${totalHunks}] ${lineRange}`);
        },
        onSkillComplete: (name, report) => {
            if (verbosity === Verbosity.Quiet)
                return;
            const displayName = displayNameFor(name);
            if (mode.isTTY) {
                const duration = report.durationMs !== undefined ? ` ${chalk.dim(`[${formatDuration(report.durationMs)}]`)}` : '';
                console.error(`${chalk.green(ICON_CHECK)} ${displayName}${duration}`);
                // Debug: log finding details
                if (verbosity >= Verbosity.Debug && report.findings.length > 0) {
                    for (const finding of report.findings) {
                        debugLog(mode, `${formatSeverityPlain(finding.severity)} ${findingLocation(finding)}: ${finding.title}`);
                        if (finding.suggestedFix) {
                            debugLog(mode, `  fix: ${finding.suggestedFix.description}`);
                        }
                    }
                }
            }
            else {
                // Log mode: timestamped completion with duration and finding summary
                const duration = report.durationMs !== undefined ? formatDuration(report.durationMs) : '?';
                const counts = countBySeverity(report.findings);
                const summary = formatFindingCountsPlain(counts);
                logPlain(`${displayName} completed in ${duration} - ${summary}`);
                // Show per-finding lines at Verbose+ verbosity in log mode
                // (the final report already shows findings with full detail)
                if (verbosity >= Verbosity.Verbose) {
                    for (const finding of report.findings) {
                        logPlain(`  ${formatSeverityPlain(finding.severity)} ${findingLocation(finding)}: ${finding.title}`);
                        if (verbosity >= Verbosity.Debug && finding.suggestedFix) {
                            logPlain(`    fix: ${finding.suggestedFix.description}`);
                        }
                    }
                }
            }
        },
        onSkillSkipped: (name) => {
            if (verbosity === Verbosity.Quiet)
                return;
            const displayName = displayNameFor(name);
            if (mode.isTTY) {
                console.error(`${chalk.yellow(ICON_SKIPPED)} ${displayName} ${chalk.dim('[skipped]')}`);
            }
            else {
                logPlain(`${displayName} skipped`);
            }
        },
        onSkillError: (name, error) => {
            if (verbosity === Verbosity.Quiet)
                return;
            const displayName = displayNameFor(name);
            if (mode.isTTY) {
                console.error(`${chalk.red('\u2717')} ${displayName} - ${chalk.red(error)}`);
            }
            else {
                logPlain(`ERROR: ${displayName} - ${error}`);
            }
        },
        // Warn about large prompts (always shown unless quiet)
        onLargePrompt: (_skillName, filename, lineRange, chars, estimatedTokens) => {
            if (verbosity === Verbosity.Quiet)
                return;
            const location = `${filename}:${lineRange}`;
            const size = `${Math.round(chars / 1000)}k chars (~${Math.round(estimatedTokens / 1000)}k tokens)`;
            if (mode.isTTY) {
                console.error(`${chalk.yellow(figures.warning)}  Large prompt for ${location}: ${size}`);
            }
            else {
                logPlain(`WARN: Large prompt for ${location}: ${size}`);
            }
        },
        // Debug mode: show prompt sizes
        onPromptSize: verbosity >= Verbosity.Debug
            ? (_skillName, filename, lineRange, systemChars, userChars, totalChars, estimatedTokens) => {
                const location = `${filename}:${lineRange}`;
                debugLog(mode, `Prompt for ${location}: system=${systemChars}, user=${userChars}, total=${totalChars} chars (~${estimatedTokens} tokens)`);
            }
            : undefined,
        // Debug mode: show extraction results
        onExtractionResult: verbosity >= Verbosity.Debug
            ? (_skillName, filename, lineRange, findingsCount, method) => {
                debugLog(mode, `Extracted ${findingsCount} ${pluralize(findingsCount, 'finding')} from ${filename}:${lineRange} via ${method}`);
            }
            : undefined,
    };
}
/**
 * Run multiple skill tasks with optional concurrency.
 * Uses callbacks to report progress for Ink rendering.
 */
export async function runSkillTasks(tasks, options, callbacks) {
    const { mode, verbosity, concurrency } = options;
    // File-level concurrency (within each skill)
    const fileConcurrency = 5;
    const effectiveCallbacks = callbacks ?? createDefaultCallbacks(tasks, mode, verbosity);
    // Output SKILLS header (TTY only - in log mode, "Running..." lines are sufficient)
    if (verbosity !== Verbosity.Quiet && tasks.length > 0 && mode.isTTY) {
        console.error(chalk.bold('SKILLS'));
    }
    // Listen for abort signal to show interrupt message (non-TTY only; Ink handles TTY)
    const abortSignal = tasks[0]?.runnerOptions?.abortController?.signal;
    if (abortSignal && !abortSignal.aborted && !mode.isTTY && verbosity !== Verbosity.Quiet) {
        abortSignal.addEventListener('abort', () => {
            logPlain('Interrupted, finishing up... (press Ctrl+C again to force exit)');
        }, { once: true });
    }
    const results = [];
    if (concurrency <= 1) {
        // Sequential execution
        for (const task of tasks) {
            if (task.runnerOptions?.abortController?.signal.aborted)
                break;
            const result = await runSkillTask(task, fileConcurrency, effectiveCallbacks);
            results.push(result);
        }
    }
    else {
        // Parallel execution with sliding-window concurrency pool
        results.push(...await runPool(tasks, concurrency, (task) => runSkillTask(task, fileConcurrency, effectiveCallbacks), { shouldAbort: () => tasks[0]?.runnerOptions?.abortController?.signal.aborted ?? false }));
    }
    return results;
}
//# sourceMappingURL=tasks.js.map