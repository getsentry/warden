/**
 * Ink-based skill runner with real-time progress display.
 *
 * ## Ink Rendering Constraints
 *
 * This file uses Ink (React for CLIs) which has specific constraints that,
 * if violated, cause duplicate output lines or corrupted display:
 *
 * 1. **Single Static component**: Ink's Static uses `position: 'absolute'`.
 *    Multiple Static components cause layout conflicts. We print the header
 *    before Ink starts to avoid needing a second Static.
 *
 * 2. **Stable item references**: Static tracks items by reference equality.
 *    Never wrap items in new objects (e.g., `{ type: 'skill', skill }`) on
 *    each render. Pass the original objects directly.
 *
 * 3. **Batched updates**: Rapid consecutive rerender() calls cause duplicate
 *    output. The updateUI() function batches updates using setImmediate().
 *
 * 4. **No direct writes to stderr**: Writing to process.stderr while Ink is
 *    running corrupts cursor tracking. The onLargePrompt/onPromptSize callbacks
 *    are exceptions that may cause minor display glitches in edge cases.
 */

import React, { useState, useEffect } from 'react';
import { render, Box, Text, Static } from 'ink';
import {
  runSkillTask,
  type SkillTaskOptions,
  type SkillTaskResult,
  type RunTasksOptions,
  type SkillProgressCallbacks,
  type SkillState,
  type FileState,
} from './tasks.js';
import { formatDuration, formatCost, truncate, countBySeverity, formatSeverityDot } from './formatters.js';
import { runPool } from '../../utils/index.js';
import { Verbosity } from './verbosity.js';
import { ICON_CHECK, ICON_SKIPPED, ICON_PENDING, ICON_ERROR, SPINNER_FRAMES } from './icons.js';
import figures from 'figures';

interface SkillRunnerProps {
  skills: SkillState[];
  completedItems: SkillState[];
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

function FileProgress({ file }: { file: FileState }): React.ReactElement | null {
  if (file.status === 'pending') return null;

  const filename = truncate(file.filename, 50);

  if (file.status === 'skipped') {
    return (
      <Box>
        <Text color="yellow">{ICON_SKIPPED}</Text>
        <Text> {filename}</Text>
        <Text dimColor> [skipped]</Text>
      </Box>
    );
  }

  if (file.status === 'done') {
    const counts = countBySeverity(file.findings);
    const hasFindings = file.findings.length > 0;

    return (
      <Box>
        <Text color="green">{ICON_CHECK}</Text>
        <Text> {filename}</Text>
        <Text dimColor> [{file.totalHunks}/{file.totalHunks}]</Text>
        {hasFindings && (
          <Text>
            {'  '}
            {counts.critical > 0 && <Text>{formatSeverityDot('critical')} {counts.critical}  </Text>}
            {counts.high > 0 && <Text>{formatSeverityDot('high')} {counts.high}  </Text>}
            {counts.medium > 0 && <Text>{formatSeverityDot('medium')} {counts.medium}  </Text>}
            {counts.low > 0 && <Text>{formatSeverityDot('low')} {counts.low}  </Text>}
            {counts.info > 0 && <Text>{formatSeverityDot('info')} {counts.info}</Text>}
          </Text>
        )}
        {file.durationMs !== undefined && <Text dimColor>  {formatDuration(file.durationMs)}</Text>}
        {file.usage !== undefined && <Text dimColor>  {formatCost(file.usage.costUSD)}</Text>}
      </Box>
    );
  }

  // Running
  return (
    <Box>
      <Spinner />
      <Text> {filename} [{file.currentHunk}/{file.totalHunks}]</Text>
    </Box>
  );
}

function CompletedSkill({ skill }: { skill: SkillState }): React.ReactElement {
  const duration = skill.durationMs ? formatDuration(skill.durationMs) : '';

  if (skill.status === 'skipped') {
    return (
      <Box>
        <Text color="yellow">{ICON_SKIPPED}</Text>
        <Text> {skill.displayName}</Text>
        <Text dimColor> [skipped]</Text>
      </Box>
    );
  }

  if (skill.status === 'error') {
    return (
      <Box flexDirection="column">
        <Box>
          <Text color="red">{ICON_ERROR}</Text>
          <Text> {skill.displayName}</Text>
          {duration && <Text dimColor> [{duration}]</Text>}
        </Box>
        {skill.error && <Text color="red">  Error: {skill.error}</Text>}
      </Box>
    );
  }

  return (
    <Box>
      <Text color="green">{ICON_CHECK}</Text>
      <Text> {skill.displayName}</Text>
      {duration && <Text dimColor> [{duration}]</Text>}
    </Box>
  );
}

function RunningSkill({ skill }: { skill: SkillState }): React.ReactElement {
  const visibleFiles = skill.files.filter((f) => f.status !== 'pending');

  return (
    <Box flexDirection="column">
      <Box>
        <Spinner />
        <Text> {skill.displayName}</Text>
      </Box>
      {visibleFiles.map((file) => (
        <Box key={file.filename} marginLeft={2}>
          <FileProgress file={file} />
        </Box>
      ))}
    </Box>
  );
}

/**
 * Renders the skill execution UI.
 *
 * IMPORTANT: Ink's Static component tracks items by reference equality.
 * Items passed to Static must have stable references across renders.
 * Creating new wrapper objects causes Static to mishandle its internal
 * state, resulting in duplicate output lines.
 *
 * We use a SINGLE Static component to avoid layout conflicts from multiple
 * absolutely-positioned Static containers.
 */
function SkillRunner({ skills, completedItems, interrupted }: SkillRunnerProps): React.ReactElement {
  const running = skills.filter((s) => s.status === 'running');
  const pending = skills.filter((s) => s.status === 'pending');

  return (
    <Box flexDirection="column">
      {/*
       * Completed skills - passed directly to Static WITHOUT wrapper objects.
       * completedItems elements have stable references (same objects from parent),
       * so Ink can correctly track which items are new vs already rendered.
       */}
      <Static items={completedItems}>
        {(skill) => <CompletedSkill key={skill.name} skill={skill} />}
      </Static>

      {/* Dynamic content - updates in place */}
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

/**
 * Run skill tasks with Ink-based real-time progress display.
 */
export async function runSkillTasksWithInk(
  tasks: SkillTaskOptions[],
  options: RunTasksOptions
): Promise<SkillTaskResult[]> {
  const { verbosity, concurrency } = options;

  if (tasks.length === 0 || verbosity === Verbosity.Quiet) {
    // No tasks or quiet mode - run without UI
    const results: SkillTaskResult[] = [];
    for (const task of tasks) {
      if (task.runnerOptions?.abortController?.signal.aborted) break;
      const result = await runSkillTask(task, 5, noopCallbacks);
      results.push(result);
    }
    return results;
  }

  // Track skill states
  const skillStates: SkillState[] = [];
  const completedItems: SkillState[] = [];
  const completedNames = new Set<string>();

  // Print header before Ink starts - this avoids multiple Static components
  // which can cause layout conflicts due to absolute positioning
  process.stderr.write('\x1b[1mSKILLS\x1b[0m\n');

  // Track interrupt state for rendering in the Ink component
  let interrupted = false;

  // Create Ink instance
  const { rerender, unmount } = render(
    <SkillRunner skills={skillStates} completedItems={completedItems} interrupted={false} />,
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
      rerender(<SkillRunner skills={[...skillStates]} completedItems={[...completedItems]} interrupted={interrupted} />);
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
        const updated = { ...existing, ...updates };
        skillStates[idx] = updated;

        // If skill just completed, add to completedItems (only once)
        if (updates.status === 'done' && !completedNames.has(name)) {
          completedNames.add(name);
          completedItems.push(updated);
        }

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
      const task = tasks.find((t) => t.name === name);
      const state: SkillState = {
        name,
        displayName: task?.displayName ?? name,
        status: 'skipped',
        files: [],
        findings: [],
      };
      skillStates.push(state);

      if (!completedNames.has(name)) {
        completedNames.add(name);
        completedItems.push(state);
      }

      updateUI();
    },
    onSkillError: (name, error) => {
      const idx = skillStates.findIndex((s) => s.name === name);
      const existing = skillStates[idx];
      let state: SkillState;

      if (idx >= 0 && existing) {
        state = { ...existing, status: 'error', error };
        skillStates[idx] = state;
      } else {
        const task = tasks.find((t) => t.name === name);
        state = {
          name,
          displayName: task?.displayName ?? name,
          status: 'error',
          error,
          files: [],
          findings: [],
        };
        skillStates.push(state);
      }

      if (!completedNames.has(name)) {
        completedNames.add(name);
        completedItems.push(state);
      }

      updateUI();
    },
    // CAUTION: Direct stderr writes while Ink is running can cause display glitches.
    // These callbacks are rare (large prompts, debug mode) so the tradeoff is acceptable.
    // If these cause issues, consider queueing messages and printing after unmount().
    onLargePrompt: (_skillName, filename, lineRange, chars, estimatedTokens) => {
      const location = `${filename}:${lineRange}`;
      const size = `${Math.round(chars / 1000)}k chars (~${Math.round(estimatedTokens / 1000)}k tokens)`;
      process.stderr.write(`\x1b[33m${figures.warning}\x1b[0m  Large prompt for ${location}: ${size}\n`);
    },
    onPromptSize: verbosity >= Verbosity.Debug
      ? (_skillName, filename, lineRange, systemChars, userChars, totalChars, estimatedTokens) => {
          const location = `${filename}:${lineRange}`;
          process.stderr.write(`\x1b[2m[debug] Prompt for ${location}: system=${systemChars}, user=${userChars}, total=${totalChars} chars (~${estimatedTokens} tokens)\x1b[0m\n`);
        }
      : undefined,
  };

  const fileConcurrency = 5;
  const results: SkillTaskResult[] = [];

  if (concurrency <= 1) {
    for (const task of tasks) {
      if (task.runnerOptions?.abortController?.signal.aborted) break;
      const result = await runSkillTask(task, fileConcurrency, callbacks);
      results.push(result);
    }
  } else {
    results.push(...await runPool(tasks, concurrency,
      (task) => runSkillTask(task, fileConcurrency, callbacks),
      { shouldAbort: () => tasks[0]?.runnerOptions?.abortController?.signal.aborted ?? false }
    ));
  }

  // Cleanup - set unmounted flag before unmount to prevent pending setImmediate
  // callbacks from calling rerender on the unmounted Ink instance
  unmounted = true;
  unmount();

  return results;
}
