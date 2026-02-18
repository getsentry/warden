/**
 * Task execution for skills.
 * Callback-based state updates for CLI and Ink rendering.
 *
 * Reporter spec: specs/reporters.md
 */

import type { SkillReport, SeverityThreshold, Finding, UsageStats, EventContext } from '../../types/index.js';
import type { SkillDefinition } from '../../config/schema.js';
import { Sentry, emitSkillMetrics, emitDedupMetrics, logger } from '../../sentry.js';
import {
  prepareFiles,
  analyzeFile,
  aggregateUsage,
  aggregateAuxiliaryUsage,
  deduplicateFindings,
  mergeCrossLocationFindings,
  generateSummary,
  type AuxiliaryUsageEntry,
  type SkillRunnerOptions,
  type FileAnalysisCallbacks,
  type PreparedFile,
  type PRPromptContext,
} from '../../sdk/runner.js';
import chalk from 'chalk';
import figures from 'figures';
import { Verbosity } from './verbosity.js';
import type { OutputMode } from './tty.js';
import { ICON_CHECK, ICON_SKIPPED } from './icons.js';
import { timestamp } from './tty.js';
import { formatDuration, formatCost, formatLocation, formatSeverityPlain, formatFindingCountsPlain, countBySeverity, pluralize } from './formatters.js';
import { runPool, Semaphore } from '../../utils/index.js';

/**
 * Result from processing a single file within a skill task.
 */
interface FileProcessResult {
  findings: Finding[];
  usage?: UsageStats;
  durationMs: number;
  failedHunks: number;
  failedExtractions: number;
  auxiliaryUsage?: AuxiliaryUsageEntry[];
}

/**
 * Write a log-mode message to stderr with timestamp prefix.
 * Used for non-TTY / plain output.
 */
function logPlain(message: string): void {
  console.error(`[${timestamp()}] warden: ${message}`);
}

/**
 * Write a debug-level message to stderr.
 * Uses chalk.dim formatting in TTY mode, timestamped "DEBUG:" prefix otherwise.
 */
function debugLog(mode: OutputMode, message: string): void {
  if (mode.isTTY) {
    console.error(chalk.dim(`[debug] ${message}`));
  } else {
    logPlain(`DEBUG: ${message}`);
  }
}

/**
 * Format a finding's location as a compact string, falling back to 'unknown'.
 */
function findingLocation(finding: Finding): string {
  if (!finding.location) return 'unknown';
  return formatLocation(finding.location.path, finding.location.startLine, finding.location.endLine);
}

/**
 * State of a file being processed by a skill.
 */
export interface FileState {
  filename: string;
  status: 'pending' | 'running' | 'done' | 'skipped';
  currentHunk: number;
  totalHunks: number;
  findings: Finding[];
  usage?: UsageStats;
  durationMs?: number;
}

/**
 * State of a skill being executed.
 */
export interface SkillState {
  name: string;
  displayName: string;
  status: 'pending' | 'running' | 'done' | 'skipped' | 'error';
  startTime?: number;
  durationMs?: number;
  files: FileState[];
  findings: Finding[];
  usage?: UsageStats;
  error?: string;
}

/**
 * Result from running a skill task.
 */
export interface SkillTaskResult {
  name: string;
  report?: SkillReport;
  failOn?: SeverityThreshold;
  error?: unknown;
}

/**
 * Options for creating a skill task.
 */
export interface SkillTaskOptions {
  name: string;
  displayName?: string;
  failOn?: SeverityThreshold;
  /** Resolve the skill definition (may be async for loading) */
  resolveSkill: () => Promise<SkillDefinition>;
  /** The event context with files to analyze */
  context: EventContext;
  /** Options passed to the runner */
  runnerOptions?: SkillRunnerOptions;
}

/**
 * Options for running skill tasks.
 */
export interface RunTasksOptions {
  mode: OutputMode;
  verbosity: Verbosity;
  concurrency: number;
}

/**
 * Callbacks for reporting skill execution progress to the UI.
 */
export interface SkillProgressCallbacks {
  onSkillStart: (skill: SkillState) => void;
  onSkillUpdate: (name: string, updates: Partial<SkillState>) => void;
  onFileUpdate: (skillName: string, filename: string, updates: Partial<FileState>) => void;
  /** Called when a hunk analysis starts (one SDK invocation per hunk) */
  onHunkStart?: (skillName: string, filename: string, hunkNum: number, totalHunks: number, lineRange: string) => void;
  onSkillComplete: (name: string, report: SkillReport) => void;
  onSkillSkipped: (name: string) => void;
  onSkillError: (name: string, error: string) => void;
  /** Called when a prompt exceeds the large prompt threshold */
  onLargePrompt?: (skillName: string, filename: string, lineRange: string, chars: number, estimatedTokens: number) => void;
  /** Called with prompt size info in debug mode */
  onPromptSize?: (skillName: string, filename: string, lineRange: string, systemChars: number, userChars: number, totalChars: number, estimatedTokens: number) => void;
  /** Called with extraction result details (debug mode) */
  onExtractionResult?: (skillName: string, filename: string, lineRange: string, findingsCount: number, method: 'regex' | 'llm' | 'none') => void;
  /** Called when hunk analysis fails (SDK error, API error, abort) */
  onHunkFailed?: (skillName: string, filename: string, lineRange: string, error: string) => void;
  /** Called when findings extraction fails (both regex and LLM fallback failed) */
  onExtractionFailure?: (skillName: string, filename: string, lineRange: string, error: string, preview: string) => void;
  /** Called when a retry attempt is made */
  onRetry?: (skillName: string, filename: string, lineRange: string, attempt: number, maxRetries: number, error: string, delayMs: number) => void;
}

/**
 * Run a single skill task.
 */
export async function runSkillTask(
  options: SkillTaskOptions,
  fileConcurrency: number,
  callbacks: SkillProgressCallbacks,
  semaphore?: Semaphore
): Promise<SkillTaskResult> {
  const { name, displayName = name, failOn, resolveSkill, context, runnerOptions = {} } = options;

  return Sentry.startSpan(
    { op: 'skill.run', name: `run ${displayName}` },
    async (span) => {
      span.setAttribute('skill.name', name);
      const files = context.pullRequest?.files ?? [];
      span.setAttribute('file.count', files.length);
      logger.info(logger.fmt`Skill execution started: ${displayName}`, {
        'file.count': files.length,
      });

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
        const fileStates: FileState[] = preparedFiles.map((file) => ({
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
        // For non-PR contexts (CLI file/diff mode), skip the "Other Files" list to avoid
        // bloating every hunk prompt with thousands of filenames.
        const isPullRequest = context.pullRequest ? context.pullRequest.number !== 0 : false;
        const prContext: PRPromptContext | undefined = context.pullRequest
          ? {
              changedFiles: isPullRequest ? context.pullRequest.files.map((f) => f.filename) : [],
              title: context.pullRequest.title,
              body: context.pullRequest.body,
              maxContextFiles: runnerOptions.maxContextFiles,
            }
          : undefined;

        // Process files with concurrency
        const processFile = async (prepared: PreparedFile, index: number): Promise<FileProcessResult> => {
          const filename = prepared.filename;
          const fileStartTime = Date.now();

          // Update file state to running (local + callback)
          const localState = fileStates[index];
          if (localState) localState.status = 'running';
          callbacks.onFileUpdate(name, filename, { status: 'running' });

          const fileCallbacks: FileAnalysisCallbacks = {
            skillStartTime: startTime,
            onHunkStart: (hunkNum, totalHunks, lineRange) => {
              callbacks.onFileUpdate(name, filename, {
                currentHunk: hunkNum,
                totalHunks,
              });
              callbacks.onHunkStart?.(name, filename, hunkNum, totalHunks, lineRange);
            },
            onHunkComplete: (_hunkNum, findings, usage) => {
              // Accumulate findings and usage for this file
              const current = fileStates[index];
              if (current) {
                current.findings.push(...findings);
                if (current.usage) {
                  current.usage.inputTokens += usage.inputTokens;
                  current.usage.outputTokens += usage.outputTokens;
                  current.usage.costUSD += usage.costUSD;
                  if (usage.cacheReadInputTokens) {
                    current.usage.cacheReadInputTokens = (current.usage.cacheReadInputTokens ?? 0) + usage.cacheReadInputTokens;
                  }
                  if (usage.cacheCreationInputTokens) {
                    current.usage.cacheCreationInputTokens = (current.usage.cacheCreationInputTokens ?? 0) + usage.cacheCreationInputTokens;
                  }
                } else {
                  current.usage = { ...usage };
                }
                callbacks.onFileUpdate(name, filename, { usage: current.usage });
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
            onHunkFailed: callbacks.onHunkFailed
              ? (lineRange, error) => {
                  callbacks.onHunkFailed?.(name, filename, lineRange, error);
                }
              : undefined,
            onExtractionFailure: callbacks.onExtractionFailure
              ? (lineRange, error, preview) => {
                  callbacks.onExtractionFailure?.(name, filename, lineRange, error, preview);
                }
              : undefined,
            onRetry: callbacks.onRetry
              ? (lineRange, attempt, maxRetries, error, delayMs) => {
                  callbacks.onRetry?.(name, filename, lineRange, attempt, maxRetries, error, delayMs);
                }
              : undefined,
          };

          const result = await analyzeFile(
            skill,
            prepared,
            context.repoPath,
            runnerOptions,
            fileCallbacks,
            prContext
          );

          // Detect if this file was aborted before any real work happened
          const fileDurationMs = Date.now() - fileStartTime;
          const aborted = runnerOptions.abortController?.signal.aborted ?? false;
          const noWork = !result.usage || (result.usage.inputTokens === 0 && result.usage.outputTokens === 0);
          const fileStatus = (aborted && noWork) ? 'skipped' : 'done';

          if (localState) localState.status = fileStatus;
          callbacks.onFileUpdate(name, filename, {
            status: fileStatus,
            findings: result.findings,
            usage: result.usage,
            durationMs: fileDurationMs,
          });

          return {
            findings: result.findings,
            usage: result.usage,
            durationMs: fileDurationMs,
            failedHunks: result.failedHunks,
            failedExtractions: result.failedExtractions,
            auxiliaryUsage: result.auxiliaryUsage,
          };
        };

        // Return an empty result for files skipped due to abort
        const processSkippedFile = (index: number): FileProcessResult => {
          const localState = fileStates[index];
          if (localState) localState.status = 'skipped';
          const filename = preparedFiles[index]?.filename ?? 'unknown';
          callbacks.onFileUpdate(name, filename, { status: 'skipped' });
          return { findings: [], durationMs: 0, failedHunks: 0, failedExtractions: 0 };
        };

        // Process files with sliding-window concurrency pool
        const batchDelayMs = runnerOptions.batchDelayMs ?? 0;
        const shouldAbort = () => runnerOptions.abortController?.signal.aborted ?? false;
        // The effective concurrency for batch delay: when a semaphore gates work,
        // use its permit count (the actual concurrency limit) rather than fileConcurrency.
        const effectiveConcurrency = semaphore ? semaphore.initialPermits : fileConcurrency;
        const allResults = await runPool(preparedFiles, fileConcurrency,
          async (file, index) => {
            if (semaphore) await semaphore.acquire();
            try {
              // Check abort after acquiring the semaphore -- the file may have
              // been queued behind others and a SIGINT could have arrived while waiting.
              if (shouldAbort()) return processSkippedFile(index);
              // Rate-limit: delay items beyond the first concurrent wave
              if (index >= effectiveConcurrency && batchDelayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
              }
              return await processFile(file, index);
            } finally {
              if (semaphore) semaphore.release();
            }
          },
          { shouldAbort }
        );

        // Mark never-dispatched files as skipped
        for (const fileState of fileStates) {
          if (fileState.status === 'pending') {
            callbacks.onFileUpdate(name, fileState.filename, { status: 'skipped' });
          }
        }

        // Build report
        const duration = Date.now() - startTime;
        const allFindings = allResults.flatMap((r) => r.findings);
        const allUsage = allResults.map((r) => r.usage).filter((u): u is UsageStats => u !== undefined);
        const allAuxEntries = allResults.flatMap((r) => r.auxiliaryUsage ?? []);
        const totalFailedHunks = allResults.reduce((sum, r) => sum + r.failedHunks, 0);
        const totalFailedExtractions = allResults.reduce((sum, r) => sum + r.failedExtractions, 0);
        const uniqueFindings = deduplicateFindings(allFindings);
        emitDedupMetrics(allFindings.length, uniqueFindings.length);

        // Merge findings that describe the same issue at different locations
        const mergeResult = await mergeCrossLocationFindings(uniqueFindings, {
          apiKey: runnerOptions.apiKey,
          repoPath: context.repoPath,
          maxRetries: runnerOptions.auxiliaryMaxRetries,
        });
        const mergedFindings = mergeResult.findings;
        if (mergeResult.usage) {
          allAuxEntries.push({ agent: 'merge', usage: mergeResult.usage });
        }

        const report: SkillReport = {
          skill: skill.name,
          summary: generateSummary(skill.name, mergedFindings),
          findings: mergedFindings,
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

        // Emit metrics and log completion
        emitSkillMetrics(report);
        logger.info(logger.fmt`Skill execution complete: ${displayName}`, {
          'finding.count': report.findings.length,
          'duration_ms': report.durationMs,
        });

        // Notify skill complete
        callbacks.onSkillUpdate(name, {
          status: 'done',
          durationMs: duration,
          findings: mergedFindings,
          usage: report.usage,
        });
        callbacks.onSkillComplete(name, report);

        return { name, report, failOn };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        callbacks.onSkillError(name, errorMessage);
        return { name, error: err, failOn };
      }
    },
  );
}

/**
 * Create default progress callbacks for console output.
 * In TTY mode: colored icons, chalk formatting.
 * In non-TTY/log mode: timestamped lines with finding details.
 */
export function createDefaultCallbacks(
  tasks: SkillTaskOptions[],
  mode: OutputMode,
  verbosity: Verbosity
): SkillProgressCallbacks {
  /** Resolve the display name for a skill, falling back to the raw name. */
  function displayNameFor(name: string): string {
    return tasks.find((t) => t.name === name)?.displayName ?? name;
  }

  /** Track per-skill skipped file counts for collapsed summary in non-TTY mode. */
  const skippedCounts = new Map<string, number>();

  return {
    onSkillStart: (skill) => {
      if (verbosity === Verbosity.Quiet) return;
      if (!mode.isTTY) {
        const fileCount = skill.files.length;
        logPlain(`Running ${displayNameFor(skill.name)} (${fileCount} ${pluralize(fileCount, 'file')})...`);
      }
    },
    onSkillUpdate: () => { /* no-op for default callbacks */ },
    onFileUpdate: (_skillName, filename, updates) => {
      if (updates.status === 'skipped') {
        skippedCounts.set(_skillName, (skippedCounts.get(_skillName) ?? 0) + 1);
        return;
      }
      if (verbosity === Verbosity.Quiet || mode.isTTY) return;
      if (updates.status !== 'done') return;
      const duration = updates.durationMs !== undefined ? formatDuration(updates.durationMs) : '?';
      const cost = updates.usage ? ` ${formatCost(updates.usage.costUSD)}` : '';
      const n = updates.findings?.length ?? 0;
      const suffix = n > 0 ? ` ${n} ${pluralize(n, 'finding')}` : '';
      logPlain(`  ${displayNameFor(_skillName)} > ${filename} done ${duration}${cost}${suffix}`);
    },
    onHunkStart: (skillName, filename, hunkNum, totalHunks, lineRange) => {
      if (verbosity === Verbosity.Quiet || mode.isTTY) return;
      logPlain(`  ${displayNameFor(skillName)} > ${filename} [${hunkNum}/${totalHunks}] ${lineRange}`);
    },
    onSkillComplete: (name, report) => {
      if (verbosity === Verbosity.Quiet) return;
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
      } else {
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

        const skipped = skippedCounts.get(name) ?? 0;
        if (skipped > 0) {
          logPlain(`  ${skipped} ${pluralize(skipped, 'file')} skipped`);
        }
      }
    },
    onSkillSkipped: (name) => {
      if (verbosity === Verbosity.Quiet) return;
      const displayName = displayNameFor(name);
      if (mode.isTTY) {
        console.error(`${chalk.yellow(ICON_SKIPPED)} ${displayName} ${chalk.dim('[skipped]')}`);
      } else {
        logPlain(`${displayName} skipped`);
      }
    },
    onSkillError: (name, error) => {
      if (verbosity === Verbosity.Quiet) return;
      const displayName = displayNameFor(name);
      if (mode.isTTY) {
        console.error(`${chalk.red('\u2717')} ${displayName} - ${chalk.red(error)}`);
      } else {
        logPlain(`ERROR: ${displayName} - ${error}`);
        const skipped = skippedCounts.get(name) ?? 0;
        if (skipped > 0) {
          logPlain(`  ${skipped} ${pluralize(skipped, 'file')} skipped`);
        }
      }
    },
    // Warn about large prompts (always shown unless quiet)
    onLargePrompt: (_skillName, filename, lineRange, chars, estimatedTokens) => {
      if (verbosity === Verbosity.Quiet) return;
      const location = `${filename}:${lineRange}`;
      const size = `${Math.round(chars / 1000)}k chars (~${Math.round(estimatedTokens / 1000)}k tokens)`;
      if (mode.isTTY) {
        console.error(`${chalk.yellow(figures.warning)}  Large prompt for ${location}: ${size}`);
      } else {
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
    // Verbose mode: show per-hunk analysis failures (spec: event #16 hunk_failed)
    onHunkFailed: verbosity >= Verbosity.Verbose
      ? (_skillName, filename, lineRange, error) => {
          const location = `${filename}:${lineRange}`;
          if (mode.isTTY) {
            console.error(`${chalk.yellow(figures.warning)}  Chunk failed: ${location} ${chalk.dim(`\u2014 ${error}`)}`);
          } else {
            logPlain(`WARN: Chunk failed: ${location} \u2014 ${error}`);
          }
        }
      : undefined,
    // Verbose mode: show per-hunk extraction failures (spec: event #17 extraction_failure)
    onExtractionFailure: verbosity >= Verbosity.Verbose
      ? (_skillName, filename, lineRange, error, preview) => {
          const location = `${filename}:${lineRange}`;
          if (mode.isTTY) {
            console.error(`${chalk.yellow(figures.warning)}  Extraction failed: ${location} ${chalk.dim(`\u2014 ${error}`)}`);
            if (verbosity >= Verbosity.Debug && preview) {
              debugLog(mode, `  Output preview: ${preview.slice(0, 200)}`);
            }
          } else {
            logPlain(`WARN: Extraction failed: ${location} \u2014 ${error}`);
            if (verbosity >= Verbosity.Debug && preview) {
              logPlain(`DEBUG: Output preview: ${preview.slice(0, 200)}`);
            }
          }
        }
      : undefined,
    // Verbose mode: show retry attempts (spec: event #18 retry)
    onRetry: verbosity >= Verbosity.Verbose
      ? (_skillName, filename, lineRange, attempt, maxRetries, error, delayMs) => {
          const location = `${filename}:${lineRange}`;
          const retryInfo = `attempt ${attempt}/${maxRetries}`;
          const delay = delayMs > 0 ? `, retrying in ${Math.round(delayMs / 1000)}s` : '';
          if (mode.isTTY) {
            debugLog(mode, `Retry ${location} (${retryInfo}${delay}): ${error}`);
          } else {
            logPlain(`WARN: Retry ${location} (${retryInfo}${delay}): ${error}`);
          }
        }
      : undefined,
  };
}

/**
 * Run multiple skill tasks with optional concurrency.
 * Uses callbacks to report progress for Ink rendering.
 */
export async function runSkillTasks(
  tasks: SkillTaskOptions[],
  options: RunTasksOptions,
  callbacks?: SkillProgressCallbacks
): Promise<SkillTaskResult[]> {
  const { mode, verbosity, concurrency } = options;

  // Global semaphore gates file-level work across all skills.
  // All skills launch immediately so the UI shows them as "running",
  // but only `concurrency` files will be analysed at any time.
  const semaphore = new Semaphore(concurrency);

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

  // Launch all skills in parallel; the semaphore is the sole concurrency gate.
  const results = await runPool(tasks, tasks.length,
    (task) => runSkillTask(task, Number.MAX_SAFE_INTEGER, effectiveCallbacks, semaphore),
    { shouldAbort: () => tasks[0]?.runnerOptions?.abortController?.signal.aborted ?? false }
  );

  return results;
}
