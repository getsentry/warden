/**
 * Ink-based skill runner with real-time progress display.
 *
 * While skills run, the dynamic Ink area shows running skills and active files.
 * After Ink unmounts, the full per-skill + per-file breakdown is printed to
 * stderr, followed by the normal findings report.
 *
 * UI updates are batched via setImmediate() to prevent rapid consecutive
 * rerender() calls from producing duplicate output lines.
 *
 * Reporter spec: specs/reporters.md
 */

import React, { useState, useEffect } from 'react';
import { render, Box, Text, Static } from 'ink';
import chalk from 'chalk';
import {
  runSkillTask,
  type SkillTaskOptions,
  type SkillTaskResult,
  type RunTasksOptions,
  type SkillProgressCallbacks,
  type SkillState,
  type FileState,
} from './tasks.js';
import { formatDuration, formatCost, truncate, countBySeverity, formatSeverityDot, pluralize } from './formatters.js';
import { runPool, Semaphore } from '../../utils/index.js';
import { Verbosity } from './verbosity.js';
import { ICON_CHECK, ICON_SKIPPED, ICON_PENDING, ICON_ERROR, SPINNER_FRAMES } from './icons.js';
import figures from 'figures';

interface SkillRunnerProps {
  skills: SkillState[];
  warnings: string[];
  interrupted: boolean;
}

function Spinner(): React.ReactElement {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return <Text color="yellow">{SPINNER_FRAMES[frame]}</Text>;
}

function FileProgress({ file }: { file: FileState }): React.ReactElement {
  const filename = truncate(file.filename, 50);
  return (
    <Box>
      <Spinner />
      <Text> {filename} [{file.currentHunk}/{file.totalHunks}]</Text>
    </Box>
  );
}

function RunningSkill({ skill }: { skill: SkillState }): React.ReactElement {
  const activeFiles = skill.files.filter((f) => f.status === 'running');
  const doneCount = skill.files.filter((f) => f.status === 'done' || f.status === 'skipped').length;
  const totalCount = skill.files.length;
  const findingCount = skill.files.reduce((sum, f) => sum + f.findings.length, 0);
  const cost = skill.files.reduce((sum, f) => sum + (f.usage?.costUSD ?? 0), 0);

  return (
    <Box flexDirection="column">
      <Box>
        <Spinner />
        <Text> {skill.displayName}</Text>
        {totalCount > 0 && <Text dimColor>  [{doneCount}/{totalCount} files]</Text>}
        {findingCount > 0 && <Text>  {findingCount} {findingCount === 1 ? 'finding' : 'findings'}</Text>}
        {cost > 0 && <Text dimColor>  {formatCost(cost)}</Text>}
      </Box>
      {activeFiles.map((file) => (
        <Box key={file.filename} marginLeft={2}>
          <FileProgress file={file} />
        </Box>
      ))}
    </Box>
  );
}

function CompletedSkill({ skill }: { skill: SkillState }): React.ReactElement {
  if (skill.status === 'skipped') {
    return (
      <Text>
        <Text color="yellow">{ICON_SKIPPED}</Text> {skill.displayName} <Text dimColor>[skipped]</Text>
      </Text>
    );
  }

  const findingCount = skill.findings.length;
  const cost = skill.usage?.costUSD;
  const duration = skill.durationMs ? formatDuration(skill.durationMs) : undefined;

  if (skill.status === 'error') {
    return (
      <Text>
        <Text color="red">{ICON_ERROR}</Text> {skill.displayName}
        {duration && <Text dimColor> [{duration}]</Text>}
      </Text>
    );
  }

  return (
    <Text>
      <Text color="green">{ICON_CHECK}</Text> {skill.displayName}
      {duration && <Text dimColor> [{duration}]</Text>}
      {findingCount > 0 && <Text>  {findingCount} {findingCount === 1 ? 'finding' : 'findings'}</Text>}
      {cost !== undefined && cost > 0 && <Text dimColor>  {formatCost(cost)}</Text>}
    </Text>
  );
}

function SkillRunner({ skills, warnings, interrupted }: SkillRunnerProps): React.ReactElement {
  const completed = skills.filter((s) => s.status === 'done' || s.status === 'skipped' || s.status === 'error');
  const running = skills.filter((s) => s.status === 'running');
  const pending = skills.filter((s) => s.status === 'pending');

  return (
    <Box flexDirection="column">
      <Static items={warnings}>
        {(warning, index) => (
          <Text key={index}>{warning}</Text>
        )}
      </Static>
      {completed.map((skill) => (
        <CompletedSkill key={skill.name} skill={skill} />
      ))}
      {running.map((skill) => (
        <RunningSkill key={skill.name} skill={skill} />
      ))}
      {pending.map((skill) => (
        <Text key={skill.name} dimColor>
          {ICON_PENDING} {skill.displayName}
        </Text>
      ))}
      {interrupted && (
        <Text color="yellow" dimColor>
          {figures.warning} Interrupted, finishing up... (press Ctrl+C again to force exit)
        </Text>
      )}
    </Box>
  );
}

/** Create a terminal skill state for skills that were skipped or errored before starting. */
function makeTerminalSkillState(
  tasks: SkillTaskOptions[],
  name: string,
  overrides: Partial<SkillState>
): SkillState {
  const task = tasks.find((t) => t.name === name);
  return {
    name,
    displayName: task?.displayName ?? name,
    status: 'pending',
    files: [],
    findings: [],
    ...overrides,
  };
}

/** No-op callbacks for quiet mode. */
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};
const noopCallbacks: SkillProgressCallbacks = {
  onSkillStart: noop,
  onSkillUpdate: noop,
  onFileUpdate: noop,
  onSkillComplete: noop,
  onSkillSkipped: noop,
  onSkillError: noop,
};

/** Severity levels in display order. */
const SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low', 'info'] as const;

/** Print the per-file line within a skill summary. */
function printFileSummary(file: FileState): void {
  if (file.status === 'done') {
    const filename = truncate(file.filename, 50);
    const counts = countBySeverity(file.findings);
    let line = `  ${chalk.green(ICON_CHECK)} ${filename} ${chalk.dim(`[${file.totalHunks}/${file.totalHunks}]`)}`;

    const severityParts = SEVERITY_LEVELS
      .filter((s) => counts[s] > 0)
      .map((s) => `${formatSeverityDot(s)} ${counts[s]}`);
    if (severityParts.length > 0) line += `  ${severityParts.join('  ')}`;

    if (file.durationMs !== undefined) line += chalk.dim(`  ${formatDuration(file.durationMs)}`);
    if (file.usage !== undefined) line += chalk.dim(`  ${formatCost(file.usage.costUSD)}`);
    process.stderr.write(`${line}\n`);
  }
}

/** Print the full skill + file breakdown to stderr after Ink unmounts. */
function printSkillSummary(skillStates: SkillState[]): void {
  for (const skill of skillStates) {
    const duration = skill.durationMs ? chalk.dim(` [${formatDuration(skill.durationMs)}]`) : '';

    if (skill.status === 'done') {
      process.stderr.write(`${chalk.green(ICON_CHECK)} ${skill.displayName}${duration}\n`);
    } else if (skill.status === 'skipped') {
      process.stderr.write(`${chalk.yellow(ICON_SKIPPED)} ${skill.displayName} ${chalk.dim('[skipped]')}\n`);
    } else if (skill.status === 'error') {
      process.stderr.write(`${chalk.red(ICON_ERROR)} ${skill.displayName}${duration}\n`);
      if (skill.error) {
        process.stderr.write(`${chalk.red(`  Error: ${skill.error}`)}\n`);
      }
    }

    if (skill.status === 'done' || skill.status === 'error') {
      for (const file of skill.files) {
        printFileSummary(file);
      }
      const skippedCount = skill.files.filter((f) => f.status === 'skipped').length;
      if (skippedCount > 0) {
        process.stderr.write(`  ${chalk.dim(`${skippedCount} ${pluralize(skippedCount, 'file')} skipped`)}\n`);
      }
    }
  }
}

/**
 * Run skill tasks with Ink-based real-time progress display.
 */
export async function runSkillTasksWithInk(
  tasks: SkillTaskOptions[],
  options: RunTasksOptions
): Promise<SkillTaskResult[]> {
  const { verbosity, concurrency } = options;

  if (tasks.length === 0 || verbosity === Verbosity.Quiet) {
    // No tasks or quiet mode - run without UI using global semaphore
    const semaphore = new Semaphore(concurrency);
    const results = await runPool(tasks, tasks.length,
      (task) => runSkillTask(task, Number.MAX_SAFE_INTEGER, noopCallbacks, semaphore),
      { shouldAbort: () => tasks[0]?.runnerOptions?.abortController?.signal.aborted ?? false }
    );
    return results;
  }

  // Track skill states
  const skillStates: SkillState[] = [];

  // Warnings are rendered via Ink's Static component so they appear above the
  // dynamic spinner area without corrupting it.
  const warnings: string[] = [];

  // Print header before Ink starts
  process.stderr.write('\x1b[1mSKILLS\x1b[0m\n');

  // Track interrupt state for rendering in the Ink component
  let interrupted = false;

  // Create Ink instance
  const { rerender, unmount, clear } = render(
    <SkillRunner skills={skillStates} warnings={[]} interrupted={false} />,
    { stdout: process.stderr }
  );

  // Batch UI updates to prevent rapid consecutive rerenders that cause duplicate lines.
  // Without batching, multiple callbacks firing in quick succession (e.g., 5 files
  // starting simultaneously) trigger 5 immediate rerenders, which Ink cannot
  // process correctly, resulting in the same line appearing multiple times.
  let updatePending = false;
  let unmounted = false;
  const updateUI = () => {
    if (updatePending || unmounted) return;
    updatePending = true;
    setImmediate(() => {
      updatePending = false;
      if (unmounted) return;
      rerender(<SkillRunner skills={[...skillStates]} warnings={[...warnings]} interrupted={interrupted} />);
    });
  };

  // Listen for abort signal to show interrupt message in the Ink UI
  const abortSignal = tasks[0]?.runnerOptions?.abortController?.signal;
  if (abortSignal && !abortSignal.aborted) {
    abortSignal.addEventListener('abort', () => {
      interrupted = true;
      updateUI();
    }, { once: true });
  }

  // Callbacks to update state
  const callbacks: SkillProgressCallbacks = {
    onSkillStart: (skill) => {
      skillStates.push(skill);
      updateUI();
    },
    onSkillUpdate: (name, updates) => {
      const idx = skillStates.findIndex((s) => s.name === name);
      const existing = skillStates[idx];
      if (idx >= 0 && existing) {
        skillStates[idx] = { ...existing, ...updates };
        updateUI();
      }
    },
    onFileUpdate: (skillName, filename, updates) => {
      const skill = skillStates.find((s) => s.name === skillName);
      if (skill) {
        const file = skill.files.find((f) => f.filename === filename);
        if (file) {
          Object.assign(file, updates);
          updateUI();
        }
      }
    },
    onSkillComplete: () => {
      updateUI();
    },
    onSkillSkipped: (name) => {
      skillStates.push(makeTerminalSkillState(tasks, name, { status: 'skipped' }));
      updateUI();
    },
    onSkillError: (name, error) => {
      const idx = skillStates.findIndex((s) => s.name === name);
      const existing = skillStates[idx];

      if (idx >= 0 && existing) {
        skillStates[idx] = { ...existing, status: 'error', error };
      } else {
        skillStates.push(makeTerminalSkillState(tasks, name, { status: 'error', error }));
      }

      updateUI();
    },
    onLargePrompt: (_skillName, filename, lineRange, chars, estimatedTokens) => {
      const location = `${filename}:${lineRange}`;
      const size = `${Math.round(chars / 1000)}k chars (~${Math.round(estimatedTokens / 1000)}k tokens)`;
      warnings.push(`${chalk.yellow(figures.warning)}  Large prompt for ${location}: ${size}`);
      updateUI();
    },
    onPromptSize: verbosity >= Verbosity.Debug
      ? (_skillName, filename, lineRange, systemChars, userChars, totalChars, estimatedTokens) => {
          const location = `${filename}:${lineRange}`;
          warnings.push(chalk.dim(`[debug] Prompt for ${location}: system=${systemChars}, user=${userChars}, total=${totalChars} chars (~${estimatedTokens} tokens)`));
          updateUI();
        }
      : undefined,
    onHunkFailed: verbosity >= Verbosity.Verbose
      ? (_skillName, filename, lineRange, error) => {
          const location = `${filename}:${lineRange}`;
          warnings.push(`${chalk.yellow(figures.warning)}  Chunk failed: ${location} ${chalk.dim(`\u2014 ${error}`)}`);
          updateUI();
        }
      : undefined,
    onExtractionFailure: verbosity >= Verbosity.Verbose
      ? (_skillName, filename, lineRange, error, preview) => {
          const location = `${filename}:${lineRange}`;
          warnings.push(`${chalk.yellow(figures.warning)}  Extraction failed: ${location} ${chalk.dim(`\u2014 ${error}`)}`);
          if (verbosity >= Verbosity.Debug && preview) {
            warnings.push(chalk.dim(`[debug]   Output preview: ${preview.slice(0, 200)}`));
          }
          updateUI();
        }
      : undefined,
    onRetry: verbosity >= Verbosity.Verbose
      ? (_skillName, filename, lineRange, attempt, maxRetries, error, delayMs) => {
          const location = `${filename}:${lineRange}`;
          const retryInfo = `attempt ${attempt}/${maxRetries}`;
          const delay = delayMs > 0 ? `, retrying in ${Math.round(delayMs / 1000)}s` : '';
          warnings.push(chalk.dim(`[debug] Retry ${location} (${retryInfo}${delay}): ${error}`));
          updateUI();
        }
      : undefined,
  };

  // Global semaphore gates file-level work across all skills.
  const semaphore = new Semaphore(concurrency);

  // Launch all skills in parallel; the semaphore is the sole concurrency gate.
  const results = await runPool(tasks, tasks.length,
    (task) => runSkillTask(task, Number.MAX_SAFE_INTEGER, callbacks, semaphore),
    { shouldAbort: () => tasks[0]?.runnerOptions?.abortController?.signal.aborted ?? false }
  );

  // Flush any pending setImmediate from updateUI so last-tick warnings are
  // rendered before we tear down. setImmediate is FIFO, so our callback runs
  // after the queued rerender.
  await new Promise((resolve) => setImmediate(resolve));
  unmounted = true;
  clear();
  unmount();

  printSkillSummary(skillStates);

  return results;
}
