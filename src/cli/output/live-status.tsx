import React, { useEffect, useState } from 'react';
import { render, Box, Text } from 'ink';
import type { OutputMode } from './tty.js';
import { Verbosity } from './verbosity.js';
import { SPINNER_FRAMES } from './icons.js';
import { formatDuration } from './formatters.js';

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

export async function runWithLiveStatus<T>(args: {
  mode: OutputMode;
  verbosity: Verbosity;
  message: string;
  detail?: string;
  task: () => Promise<T>;
}): Promise<T> {
  if (!args.mode.isTTY || args.verbosity === Verbosity.Quiet) {
    return args.task();
  }

  const startedAt = Date.now();
  const { clear, unmount } = render(
    <LiveStatus message={args.message} detail={args.detail} startedAt={startedAt} />,
    { stdout: process.stderr },
  );

  try {
    return await args.task();
  } finally {
    await new Promise((resolve) => setImmediate(resolve));
    clear();
    unmount();
  }
}
