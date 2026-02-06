/**
 * Task execution for skills.
 * Callback-based state updates for CLI and Ink rendering.
 */

import type { SkillReport, SeverityThreshold, Finding, UsageStats, EventContext } from '../../types/index.js';
import type { SkillDefinition } from '../../config/schema.js';
import {
  prepareFiles,
  analyzeFile,
  aggregateUsage,
  deduplicateFindings,
  generateSummary,
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
import { formatDuration, formatLocation, formatSeverityPlain, formatFindingCountsPlain, countBySeverity, pluralize } from './formatters.js';

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
  status: 'pending' | 'running' | 'done';
  currentHunk: number;
  totalHunks: number;
  findings: Finding[];
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
}

/**
 * Run a single skill task.
 */
export async function runSkillTask(
  options: SkillTaskOptions,
  fileConcurrency: number,
  callbacks: SkillProgressCallbacks
): Promise<SkillTaskResult> {
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
    const prContext: PRPromptContext | undefined = context.pullRequest
      ? {
          changedFiles: context.pullRequest.files.map((f) => f.filename),
          title: context.pullRequest.title,
          body: context.pullRequest.body,
        }
      : undefined;

    // Process files with concurrency
    const processFile = async (prepared: PreparedFile, index: number): Promise<{ findings: Finding[]; usage?: UsageStats; failedHunks: number; failedExtractions: number }> => {
      const filename = prepared.filename;

      // Update file state to running
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

      const result = await analyzeFile(
        skill,
        prepared,
        context.repoPath,
        runnerOptions,
        fileCallbacks,
        prContext
      );

      // Update file state to done
      callbacks.onFileUpdate(name, filename, {
        status: 'done',
        findings: result.findings,
      });

      return { findings: result.findings, usage: result.usage, failedHunks: result.failedHunks, failedExtractions: result.failedExtractions };
    };

    // Process files in batches with concurrency
    const allResults: { findings: Finding[]; usage?: UsageStats; failedHunks: number; failedExtractions: number }[] = [];

    for (let i = 0; i < preparedFiles.length; i += fileConcurrency) {
      const batch = preparedFiles.slice(i, i + fileConcurrency);
      const batchResults = await Promise.all(
        batch.map((file, batchIndex) => processFile(file, i + batchIndex))
      );
      allResults.push(...batchResults);
    }

    // Build report
    const duration = Date.now() - startTime;
    const allFindings = allResults.flatMap((r) => r.findings);
    const allUsage = allResults.map((r) => r.usage).filter((u): u is UsageStats => u !== undefined);
    const totalFailedHunks = allResults.reduce((sum, r) => sum + r.failedHunks, 0);
    const totalFailedExtractions = allResults.reduce((sum, r) => sum + r.failedExtractions, 0);
    const uniqueFindings = deduplicateFindings(allFindings);

    const report: SkillReport = {
      skill: skill.name,
      summary: generateSummary(skill.name, uniqueFindings),
      findings: uniqueFindings,
      usage: aggregateUsage(allUsage),
      durationMs: duration,
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

    // Notify skill complete
    callbacks.onSkillUpdate(name, {
      status: 'done',
      durationMs: duration,
      findings: uniqueFindings,
      usage: report.usage,
    });
    callbacks.onSkillComplete(name, report);

    return { name, report, failOn };
  } catch (err) {
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
export function createDefaultCallbacks(
  tasks: SkillTaskOptions[],
  mode: OutputMode,
  verbosity: Verbosity
): SkillProgressCallbacks {
  /** Resolve the display name for a skill, falling back to the raw name. */
  function displayNameFor(name: string): string {
    return tasks.find((t) => t.name === name)?.displayName ?? name;
  }

  return {
    onSkillStart: (skill) => {
      if (verbosity === Verbosity.Quiet) return;
      if (!mode.isTTY) {
        const fileCount = skill.files.length;
        logPlain(`Running ${displayNameFor(skill.name)} (${fileCount} ${pluralize(fileCount, 'file')})...`);
      }
    },
    onSkillUpdate: () => { /* no-op for default callbacks */ },
    onFileUpdate: () => { /* no-op for default callbacks */ },
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

        // Show per-finding lines at Normal+ verbosity in log mode
        for (const finding of report.findings) {
          logPlain(`  ${formatSeverityPlain(finding.severity)} ${findingLocation(finding)}: ${finding.title}`);
          if (verbosity >= Verbosity.Debug && finding.suggestedFix) {
            logPlain(`    fix: ${finding.suggestedFix.description}`);
          }
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

  const results: SkillTaskResult[] = [];

  if (concurrency <= 1) {
    // Sequential execution
    for (const task of tasks) {
      // Skip remaining tasks if abort was signaled (graceful interrupt)
      if (task.runnerOptions?.abortController?.signal.aborted) break;
      const result = await runSkillTask(task, fileConcurrency, effectiveCallbacks);
      results.push(result);
    }
  } else {
    // Parallel execution with concurrency limit
    for (let i = 0; i < tasks.length; i += concurrency) {
      // Skip remaining batches if abort was signaled (graceful interrupt)
      if (tasks[i]?.runnerOptions?.abortController?.signal.aborted) break;
      const batch = tasks.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((task) => runSkillTask(task, fileConcurrency, effectiveCallbacks))
      );
      results.push(...batchResults);
    }
  }

  return results;
}
