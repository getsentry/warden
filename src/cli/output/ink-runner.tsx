/**
 * Ink-based skill runner with real-time progress display.
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
import { formatDuration, truncate, countBySeverity, formatSeverityDot } from './formatters.js';
import { Verbosity } from './verbosity.js';
import { ICON_CHECK, ICON_SKIPPED, SPINNER_FRAMES } from './icons.js';

type StaticItem = { type: 'header' } | { type: 'skill'; skill: SkillState };

interface SkillRunnerProps {
  skills: SkillState[];
  completedItems: SkillState[];
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

  if (file.status === 'done') {
    const counts = countBySeverity(file.findings);
    const hasFindings = file.findings.length > 0;

    return (
      <Box>
        <Text color="green">{ICON_CHECK}</Text>
        <Text> {filename}</Text>
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
          <Text color="red">{'\u2717'}</Text>
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

function SkillRunner({ skills, completedItems }: SkillRunnerProps): React.ReactElement {
  const running = skills.filter((s) => s.status === 'running');
  const pending = skills.filter((s) => s.status === 'pending');

  // Build static items: header first, then completed skills
  const staticItems: StaticItem[] = [
    { type: 'header' },
    ...completedItems.map((skill) => ({ type: 'skill' as const, skill })),
  ];

  return (
    <>
      {/* Static content: header + completed skills */}
      <Static items={staticItems}>
        {(item) => {
          switch (item.type) {
            case 'header':
              return (
                <Text key="header" bold>
                  SKILLS
                </Text>
              );
            case 'skill':
              return <CompletedSkill key={item.skill.name} skill={item.skill} />;
          }
        }}
      </Static>

      {/* Dynamic content: running + pending */}
      <Box flexDirection="column">
        {running.map((skill) => (
          <RunningSkill key={skill.name} skill={skill} />
        ))}
        {pending.map((skill) => (
          <Text key={skill.name} dimColor>
            {'\u25CB'} {skill.displayName}
          </Text>
        ))}
      </Box>
    </>
  );
}

/** No-op callbacks for quiet mode. */
const noopCallbacks: SkillProgressCallbacks = {
  onSkillStart: () => {},
  onSkillUpdate: () => {},
  onFileUpdate: () => {},
  onSkillComplete: () => {},
  onSkillSkipped: () => {},
  onSkillError: () => {},
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
      const result = await runSkillTask(task, 5, noopCallbacks);
      results.push(result);
    }
    return results;
  }

  // Track skill states
  const skillStates: SkillState[] = [];
  const completedItems: SkillState[] = [];
  const completedNames = new Set<string>();

  // Create Ink instance
  const { rerender, unmount } = render(
    <SkillRunner skills={skillStates} completedItems={completedItems} />,
    { stdout: process.stderr }
  );

  const updateUI = () => {
    rerender(<SkillRunner skills={[...skillStates]} completedItems={[...completedItems]} />);
  };

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
  };

  const fileConcurrency = 5;
  const results: SkillTaskResult[] = [];

  if (concurrency <= 1) {
    for (const task of tasks) {
      const result = await runSkillTask(task, fileConcurrency, callbacks);
      results.push(result);
    }
  } else {
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((task) => runSkillTask(task, fileConcurrency, callbacks))
      );
      results.push(...batchResults);
    }
  }

  // Cleanup
  unmount();

  return results;
}
