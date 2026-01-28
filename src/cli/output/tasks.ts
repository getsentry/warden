import { Listr } from 'listr2';
import type { ListrTask, ListrRendererValue } from 'listr2';
import type { SkillReport, Severity } from '../../types/index.js';
import type { SkillRunnerCallbacks } from './reporter.js';
import { Verbosity } from './verbosity.js';
import type { OutputMode } from './tty.js';
import { formatProgress, truncate } from './formatters.js';

/**
 * Result from running a skill task.
 */
export interface SkillTaskResult {
  name: string;
  report?: SkillReport;
  failOn?: Severity;
  error?: unknown;
}

/**
 * Context passed to skill task functions.
 */
export interface SkillTaskContext {
  results: SkillTaskResult[];
}

/**
 * Options for creating a skill task.
 */
export interface SkillTaskOptions {
  name: string;
  displayName?: string;
  failOn?: Severity;
  run: (callbacks: SkillRunnerCallbacks) => Promise<SkillReport>;
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
 * Create a Listr task for a skill.
 */
function createSkillTask(options: SkillTaskOptions): ListrTask<SkillTaskContext> {
  const { name, displayName = name, failOn, run } = options;

  return {
    title: displayName,
    task: async (ctx, task) => {
      const startTime = Date.now();
      let currentFile = '';
      let fileIndex = 0;
      let fileTotal = 0;

      // Create callbacks that update the task output
      const callbacks: SkillRunnerCallbacks = {
        skillStartTime: startTime,
        onFileStart: (file, index, total) => {
          currentFile = file;
          fileIndex = index;
          fileTotal = total;
          const progress = formatProgress(index + 1, total);
          const displayFile = truncate(file, 40);
          task.output = `${displayFile} ${progress}`;
        },
        onHunkStart: (file, hunkNum, totalHunks, lineRange) => {
          const progress = formatProgress(fileIndex + 1, fileTotal);
          const displayFile = truncate(file, 30);
          task.output = `${displayFile} ${progress} - hunk ${hunkNum}/${totalHunks} @ ${lineRange}`;
        },
        onHunkComplete: (_file, _hunkNum, findings) => {
          if (findings.length > 0) {
            const progress = formatProgress(fileIndex + 1, fileTotal);
            const displayFile = truncate(currentFile, 30);
            task.output = `${displayFile} ${progress} - found ${findings.length} issue(s)`;
          }
        },
        onFileComplete: () => {
          // Progress updates handled by onFileStart
        },
      };

      try {
        const report = await run(callbacks);
        const duration = Date.now() - startTime;

        // Attach duration to report
        report.durationMs = duration;

        ctx.results.push({ name, report, failOn });
      } catch (error) {
        ctx.results.push({ name, error });
        throw error;
      }
    },
  };
}

/**
 * Run multiple skill tasks with listr2.
 */
export async function runSkillTasks(
  tasks: SkillTaskOptions[],
  options: RunTasksOptions
): Promise<SkillTaskResult[]> {
  const { mode, verbosity, concurrency } = options;

  // Determine renderer based on output mode
  let renderer: ListrRendererValue = 'default';

  if (verbosity === Verbosity.Quiet) {
    renderer = 'silent';
  } else if (!mode.isTTY) {
    renderer = 'simple';
  }

  const listrTasks = tasks.map((t) => createSkillTask(t));

  const listr = new Listr<SkillTaskContext, ListrRendererValue, ListrRendererValue>(listrTasks, {
    concurrent: concurrency > 1 ? concurrency : false,
    exitOnError: false,
    renderer,
    rendererOptions: {
      // Clear the output when tasks complete - results shown in boxes
      clearOutput: true,
    },
  });

  const ctx: SkillTaskContext = { results: [] };

  try {
    await listr.run(ctx);
  } catch {
    // Errors are captured in ctx.results, don't rethrow
  }

  return ctx.results;
}
