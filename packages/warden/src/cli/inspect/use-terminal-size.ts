/**
 * Live terminal dimensions for the inspect TUI.
 *
 * Ink's root Yoga node only receives a width, so percentage heights collapse
 * to content.  This hook returns concrete columns/rows and updates on resize
 * and SIGWINCH so the layout can stay fullscreen.
 */

import { useEffect, useState } from 'react';

const MIN_COLUMNS = 40;
const MIN_ROWS = 12;
const FALLBACK_COLUMNS = 80;
const FALLBACK_ROWS = 24;

export interface TerminalSize {
  columns: number;
  rows: number;
}

function streamSize(stream: NodeJS.WriteStream | undefined): Partial<TerminalSize> {
  if (!stream) return {};

  // Prefer a fresh ioctl. Node caches `.columns` / `.rows` and they go stale
  // when the host resizes without SIGWINCH (alternate screen, multiplexer).
  // Writing the live size back keeps Ink's root width on the same numbers.
  if (typeof stream.getWindowSize === 'function') {
    try {
      const [c, r] = stream.getWindowSize();
      if (c > 0) stream.columns = c;
      if (r > 0) stream.rows = r;
      if (c > 0 && r > 0) return { columns: c, rows: r };
    } catch {
      // Fall through to the cached properties.
    }
  }

  const columns = stream.columns && stream.columns > 0 ? stream.columns : undefined;
  const rows = stream.rows && stream.rows > 0 ? stream.rows : undefined;
  return { columns, rows };
}

/**
 * Read the current terminal size from stdout, then stderr, then defaults.
 */
export function getTerminalSize(): TerminalSize {
  const fromStdout = streamSize(process.stdout);
  const fromStderr = streamSize(process.stderr);
  return {
    columns: Math.max(fromStdout.columns ?? fromStderr.columns ?? FALLBACK_COLUMNS, MIN_COLUMNS),
    rows: Math.max(fromStdout.rows ?? fromStderr.rows ?? FALLBACK_ROWS, MIN_ROWS),
  };
}

/**
 * Subscribe to terminal resizes.  Listens on stdout/stderr `resize` and
 * `SIGWINCH`, and polls as a fallback for hosts that emit neither.
 */
export function useTerminalSize(pollMs = 250): TerminalSize {
  const [size, setSize] = useState(getTerminalSize);

  useEffect(() => {
    const update = (): void => {
      const next = getTerminalSize();
      setSize((prev) => (
        prev.columns === next.columns && prev.rows === next.rows ? prev : next
      ));
    };

    process.stdout.on('resize', update);
    process.stderr.on('resize', update);
    process.on('SIGWINCH', update);
    const timer = setInterval(update, pollMs);
    update();

    return () => {
      process.stdout.off('resize', update);
      process.stderr.off('resize', update);
      process.off('SIGWINCH', update);
      clearInterval(timer);
    };
  }, [pollMs]);

  return size;
}
