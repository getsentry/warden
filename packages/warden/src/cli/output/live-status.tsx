/**
 * Shared transient status renderers for command-level CLI orchestration.
 *
 * Terminal output design guide: `specs/terminal-output.md`
 */

import React, { useEffect, useState } from 'react';
import { render, Box, Text } from 'ink';
import type { OutputMode } from './tty.js';
import { Verbosity } from './verbosity.js';
import { ICON_CHECK, ICON_ERROR, ICON_PENDING, SPINNER_FRAMES } from './icons.js';
import { formatDuration } from './formatters.js';
import { runPool } from '../../utils/index.js';

interface LiveStatusProps {
  message: string;
  detail?: string;
  startedAt: number;
}

function Spinner(): React.ReactElement {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((current) => (current + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return <Text color="yellow">{SPINNER_FRAMES[frame]}</Text>;
}

function LiveStatus({ message, detail, startedAt }: LiveStatusProps): React.ReactElement {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 250);
    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <Box flexDirection="column">
      <Box>
        <Spinner />
        <Text> {message}</Text>
        <Text dimColor> [{formatDuration(elapsed)}]</Text>
      </Box>
      {detail ? <Text dimColor>{detail}</Text> : null}
    </Box>
  );
}

interface LiveStatusListItemState {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
  startedAt?: number;
  durationMs?: number;
  showRunningDuration?: boolean;
  error?: string;
}

function LiveStatusListItem(args: {
  item: LiveStatusListItemState;
  now: number;
}): React.ReactElement {
  const { item, now } = args;
  if (item.status === 'done') {
    return (
      <Text>
        <Text color="green">{ICON_CHECK}</Text> {item.label}
        {item.detail ? <Text dimColor>  {item.detail}</Text> : null}
        {item.durationMs !== undefined ? <Text dimColor> [{formatDuration(item.durationMs)}]</Text> : null}
      </Text>
    );
  }

  if (item.status === 'error') {
    return (
      <Text>
        <Text color="red">{ICON_ERROR}</Text> {item.label}
        {item.durationMs !== undefined ? <Text dimColor> [{formatDuration(item.durationMs)}]</Text> : null}
        {item.error ? <Text dimColor>  {item.error}</Text> : null}
      </Text>
    );
  }

  if (item.status === 'running') {
    return (
      <Box>
        <Spinner />
        <Text> {item.label}</Text>
        {item.showRunningDuration && item.startedAt !== undefined
          ? <Text dimColor> [{formatDuration(Math.max(0, now - item.startedAt))}]</Text>
          : null}
      </Box>
    );
  }

  return (
    <Text dimColor>
      {ICON_PENDING} {item.label}
    </Text>
  );
}

/** Render the transient list UI used for concurrent build progress. */
export function LiveStatusList({ items }: { items: LiveStatusListItemState[] }): React.ReactElement {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const hasRunningItems = items.some((item) => item.status === 'running' && item.showRunningDuration);
    if (!hasRunningItems) {
      return undefined;
    }

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => clearInterval(timer);
  }, [items]);

  const completed = items.filter((item) => item.status === 'done' || item.status === 'error');
  const running = items.filter((item) => item.status === 'running');
  const pending = items.filter((item) => item.status === 'pending');

  return (
    <Box flexDirection="column">
      {completed.map((item, index) => (
        <LiveStatusListItem key={`done:${index}:${item.label}`} item={item} now={now} />
      ))}
      {running.map((item, index) => (
        <LiveStatusListItem key={`running:${index}:${item.label}`} item={item} now={now} />
      ))}
      {pending.map((item, index) => (
        <LiveStatusListItem key={`pending:${index}:${item.label}`} item={item} now={now} />
      ))}
    </Box>
  );
}

export async function runWithLiveStatus<T>(args: {
  mode: OutputMode;
  verbosity: Verbosity;
  message: string;
  detail?: string;
  task: (controls: { setDetail: (detail: string | undefined) => void }) => Promise<T>;
}): Promise<T> {
  if (!args.mode.isTTY || args.verbosity === Verbosity.Quiet) {
    return args.task({ setDetail: () => undefined });
  }

  const startedAt = Date.now();
  let detail = args.detail;
  const { rerender, clear, unmount } = render(
    <LiveStatus message={args.message} detail={detail} startedAt={startedAt} />,
    { stdout: process.stderr },
  );

  let updatePending = false;
  let unmounted = false;
  const updateUI = () => {
    if (updatePending || unmounted) return;
    updatePending = true;
    setImmediate(() => {
      updatePending = false;
      if (unmounted) return;
      rerender(<LiveStatus message={args.message} detail={detail} startedAt={startedAt} />);
    });
  };

  try {
    return await args.task({
      setDetail: (nextDetail) => {
        if (detail === nextDetail) {
          return;
        }
        detail = nextDetail;
        updateUI();
      },
    });
  } finally {
    await new Promise((resolve) => setImmediate(resolve));
    unmounted = true;
    clear();
    unmount();
  }
}

/**
 * Run concurrent work items with a live TTY list that mirrors Warden's normal
 * multi-item progress rendering instead of collapsing active work into one line.
 */
export async function runWithLiveStatusList<TItem, TResult>(args: {
  mode: OutputMode;
  verbosity: Verbosity;
  items: TItem[];
  concurrency: number;
  getLabel: (item: TItem, index: number) => string;
  task: (item: TItem, index: number) => Promise<TResult>;
  getDoneDetail?: (result: TResult, item: TItem, index: number) => string | undefined;
  showRunningDuration?: (item: TItem, index: number) => boolean;
  showDoneDuration?: (result: TResult, item: TItem, index: number) => boolean;
  shouldAbort?: () => boolean;
}): Promise<TResult[]> {
  const run = () => runPool(args.items, args.concurrency, args.task, {
    shouldAbort: args.shouldAbort,
  });

  if (!args.mode.isTTY || args.verbosity === Verbosity.Quiet || args.items.length === 0) {
    return run();
  }

  const itemStates: LiveStatusListItemState[] = args.items.map((item, index) => ({
    label: args.getLabel(item, index),
    status: 'pending',
  }));

  const { rerender, clear, unmount } = render(
    <LiveStatusList items={itemStates} />,
    { stdout: process.stderr },
  );

  let updatePending = false;
  let unmounted = false;
  const updateUI = () => {
    if (updatePending || unmounted) return;
    updatePending = true;
    setImmediate(() => {
      updatePending = false;
      if (unmounted) return;
      rerender(<LiveStatusList items={[...itemStates]} />);
    });
  };

  try {
    return await runPool(args.items, args.concurrency, async (item, index) => {
      const itemState = itemStates[index];
      if (itemState) {
        itemState.status = 'running';
        itemState.startedAt = Date.now();
        itemState.showRunningDuration = args.showRunningDuration?.(item, index) ?? false;
        updateUI();
      }

      const startedAt = itemState?.startedAt ?? Date.now();
      try {
        const result = await args.task(item, index);
        if (itemState) {
          itemState.status = 'done';
          itemState.detail = args.getDoneDetail?.(result, item, index);
          itemState.durationMs = args.showDoneDuration?.(result, item, index) === false
            ? undefined
            : Date.now() - startedAt;
          updateUI();
        }
        return result;
      } catch (error) {
        if (itemState) {
          itemState.status = 'error';
          itemState.durationMs = Date.now() - startedAt;
          itemState.error = error instanceof Error ? error.message : String(error);
          updateUI();
        }
        throw error;
      }
    }, { shouldAbort: args.shouldAbort });
  } finally {
    await new Promise((resolve) => setImmediate(resolve));
    unmounted = true;
    clear();
    unmount();
  }
}
