import { Listr } from 'listr2';
import type { ListrTask, ListrRendererValue } from 'listr2';
import type { SkillReport, Severity, Finding, UsageStats, EventContext } from '../../types/index.js';
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
import { Verbosity } from './verbosity.js';
import type { OutputMode } from './tty.js';
import { truncate, countBySeverity, formatSeverityDot } from './formatters.js';

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

/** Spinner frames for animation */
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Format compact severity annotation for file display.
 */
function formatFileAnnotation(findings: Finding[]): string {
  if (findings.length === 0) return '';

  const counts = countBySeverity(findings);
  const parts: string[] = [];

  // Show only severities with findings, in order of severity
  if (counts.critical > 0) parts.push(`${formatSeverityDot('critical')} ${counts.critical}`);
  if (counts.high > 0) parts.push(`${formatSeverityDot('high')} ${counts.high}`);
  if (counts.medium > 0) parts.push(`${formatSeverityDot('medium')} ${counts.medium}`);
  if (counts.low > 0) parts.push(`${formatSeverityDot('low')} ${counts.low}`);
  if (counts.info > 0) parts.push(`${formatSeverityDot('info')} ${counts.info}`);

  return parts.length > 0 ? '  ' + parts.join('  ') : '';
}

/** File processing state */
interface FileState {
  file: PreparedFile;
  status: 'pending' | 'running' | 'done';
  currentHunk: number;
  totalHunks: number;
  findings: Finding[];
  usage?: UsageStats;
}

/**
 * Render file states as multi-line output.
 * Only shows files that have started (running or done).
 */
function renderFileStates(states: FileState[], spinnerFrame: number): string {
  const lines: string[] = [];
  const spinner = SPINNER_FRAMES[spinnerFrame % SPINNER_FRAMES.length];

  for (const state of states) {
    // Skip pending files
    if (state.status === 'pending') continue;

    const filename = truncate(state.file.filename, 50);

    if (state.status === 'done') {
      const annotation = formatFileAnnotation(state.findings);
      lines.push(`✓ ${filename}${annotation}`);
    } else {
      // Running - show animated spinner
      const hunkInfo = `[${state.currentHunk}/${state.totalHunks}]`;
      lines.push(`${spinner} ${filename} ${hunkInfo}`);
    }
  }

  return lines.join('\n');
}

/**
 * Create a Listr task for a skill.
 */
function createSkillTask(
  options: SkillTaskOptions,
  fileConcurrency: number
): ListrTask<SkillTaskContext> {
  const { name, displayName = name, failOn, resolveSkill, context, runnerOptions = {} } = options;

  return {
    title: displayName,
    task: async (ctx, task) => {
      const startTime = Date.now();

      // Resolve the skill
      const skill = await resolveSkill();

      // Prepare files (parse patches into hunks)
      const preparedFiles = prepareFiles(context, {
        contextLines: runnerOptions.contextLines,
      });

      if (preparedFiles.length === 0) {
        task.skip('No files to analyze');
        ctx.results.push({
          name,
          report: {
            skill: skill.name,
            summary: 'No code changes to analyze',
            findings: [],
            usage: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
          },
          failOn,
        });
        return;
      }

      // Initialize file states
      const fileStates: FileState[] = preparedFiles.map((file) => ({
        file,
        status: 'pending',
        currentHunk: 0,
        totalHunks: file.hunks.length,
        findings: [],
      }));

      // Spinner animation state
      let spinnerFrame = 0;
      let isRunning = true;

      // Update display
      function updateOutput(): void {
        task.output = renderFileStates(fileStates, spinnerFrame);
      }

      // Start spinner animation
      const spinnerInterval = setInterval(() => {
        if (!isRunning) return;
        spinnerFrame++;
        // Only update if there are running files
        if (fileStates.some((s) => s.status === 'running')) {
          updateOutput();
        }
      }, 80);

      // Process files with concurrency
      const processFile = async (state: FileState): Promise<void> => {
        state.status = 'running';
        updateOutput();

        const callbacks: FileAnalysisCallbacks = {
          skillStartTime: startTime,
          onHunkStart: (hunkNum, totalHunks) => {
            state.currentHunk = hunkNum;
            state.totalHunks = totalHunks;
            updateOutput();
          },
          onHunkComplete: (_hunkNum, findings) => {
            state.findings.push(...findings);
          },
        };

        const result = await analyzeFile(
          skill,
          state.file,
          context.repoPath,
          runnerOptions,
          callbacks
        );

        state.status = 'done';
        state.findings = result.findings;
        state.usage = result.usage;
        updateOutput();
      };

      // Process in batches with concurrency
      try {
        for (let i = 0; i < fileStates.length; i += fileConcurrency) {
          const batch = fileStates.slice(i, i + fileConcurrency);
          await Promise.all(batch.map(processFile));
        }
      } finally {
        // Stop spinner animation
        isRunning = false;
        clearInterval(spinnerInterval);
      }

      // Build report
      const duration = Date.now() - startTime;
      const allFindings = fileStates.flatMap((s) => s.findings);
      const allUsage = fileStates.map((s) => s.usage).filter((u): u is UsageStats => u !== undefined);

      const uniqueFindings = deduplicateFindings(allFindings);

      const report: SkillReport = {
        skill: skill.name,
        summary: generateSummary(skill.name, uniqueFindings),
        findings: uniqueFindings,
        usage: aggregateUsage(allUsage),
        durationMs: duration,
      };

      ctx.results.push({ name, report, failOn });
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

  // File-level concurrency (within each skill)
  const fileConcurrency = 5;

  const listrTasks = tasks.map((t) => createSkillTask(t, fileConcurrency));

  const listr = new Listr<SkillTaskContext, ListrRendererValue, ListrRendererValue>(listrTasks, {
    concurrent: concurrency > 1 ? concurrency : false,
    exitOnError: false,
    renderer,
  });

  const ctx: SkillTaskContext = { results: [] };

  try {
    await listr.run(ctx);
  } catch {
    // Errors are captured in ctx.results, don't rethrow
  }

  return ctx.results;
}
