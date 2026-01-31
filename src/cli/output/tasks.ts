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
} from '../../sdk/runner.js';
import chalk from 'chalk';
import { Verbosity } from './verbosity.js';
import type { OutputMode } from './tty.js';
import { ICON_CHECK, ICON_SKIPPED } from './icons.js';
import { formatDuration } from './formatters.js';

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
  onSkillComplete: (name: string, report: SkillReport) => void;
  onSkillSkipped: (name: string) => void;
  onSkillError: (name: string, error: string) => void;
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

    // Process files with concurrency
    const processFile = async (prepared: PreparedFile, index: number): Promise<{ findings: Finding[]; usage?: UsageStats }> => {
      const filename = prepared.filename;

      // Update file state to running
      callbacks.onFileUpdate(name, filename, { status: 'running' });

      const fileCallbacks: FileAnalysisCallbacks = {
        skillStartTime: startTime,
        onHunkStart: (hunkNum, totalHunks) => {
          callbacks.onFileUpdate(name, filename, {
            currentHunk: hunkNum,
            totalHunks,
          });
        },
        onHunkComplete: (_hunkNum, findings) => {
          // Accumulate findings for this file
          const current = fileStates[index];
          if (current) {
            current.findings.push(...findings);
          }
        },
      };

      const result = await analyzeFile(
        skill,
        prepared,
        context.repoPath,
        runnerOptions,
        fileCallbacks
      );

      // Update file state to done
      callbacks.onFileUpdate(name, filename, {
        status: 'done',
        findings: result.findings,
      });

      return result;
    };

    // Process files in batches with concurrency
    const allResults: { findings: Finding[]; usage?: UsageStats }[] = [];

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

  // Create default callbacks that output to console
  const defaultCallbacks: SkillProgressCallbacks = {
    onSkillStart: (_skill) => {
      // We don't log start - we'll log completion with duration
    },
    onSkillUpdate: () => { /* no-op for default callbacks */ },
    onFileUpdate: () => { /* no-op for default callbacks */ },
    onSkillComplete: (name, report) => {
      if (verbosity === Verbosity.Quiet) return;
      const task = tasks.find((t) => t.name === name);
      const displayName = task?.displayName ?? name;
      const duration = report.durationMs ? ` ${chalk.dim(`[${formatDuration(report.durationMs)}]`)}` : '';
      if (mode.isTTY) {
        console.error(`${chalk.green(ICON_CHECK)} ${displayName}${duration}`);
      } else {
        console.log(`${ICON_CHECK} ${displayName}`);
      }
    },
    onSkillSkipped: (name) => {
      if (verbosity === Verbosity.Quiet) return;
      const task = tasks.find((t) => t.name === name);
      const displayName = task?.displayName ?? name;
      if (mode.isTTY) {
        console.error(`${chalk.yellow(ICON_SKIPPED)} ${displayName} ${chalk.dim('[skipped]')}`);
      } else {
        console.log(`${ICON_SKIPPED} ${displayName} [skipped]`);
      }
    },
    onSkillError: (name, error) => {
      if (verbosity === Verbosity.Quiet) return;
      const task = tasks.find((t) => t.name === name);
      const displayName = task?.displayName ?? name;
      if (mode.isTTY) {
        console.error(`${chalk.red('\u2717')} ${displayName} - ${chalk.red(error)}`);
      } else {
        console.error(`\u2717 ${displayName} - Error: ${error}`);
      }
    },
  };

  const effectiveCallbacks = callbacks ?? defaultCallbacks;

  // Output SKILLS header
  if (verbosity !== Verbosity.Quiet && tasks.length > 0) {
    if (mode.isTTY) {
      console.error(chalk.bold('SKILLS'));
    } else {
      console.error('SKILLS');
    }
  }

  const results: SkillTaskResult[] = [];

  if (concurrency <= 1) {
    // Sequential execution
    for (const task of tasks) {
      const result = await runSkillTask(task, fileConcurrency, effectiveCallbacks);
      results.push(result);
    }
  } else {
    // Parallel execution with concurrency limit
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((task) => runSkillTask(task, fileConcurrency, effectiveCallbacks))
      );
      results.push(...batchResults);
    }
  }

  return results;
}
