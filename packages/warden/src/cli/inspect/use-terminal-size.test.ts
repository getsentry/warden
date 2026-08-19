import { afterEach, describe, expect, it } from 'vitest';
import { getTerminalSize } from './use-terminal-size.js';

describe('getTerminalSize', () => {
  const originalStdoutColumns = process.stdout.columns;
  const originalStdoutRows = process.stdout.rows;
  const originalStderrColumns = process.stderr.columns;
  const originalStderrRows = process.stderr.rows;
  const originalStdoutGetWindowSize = process.stdout.getWindowSize;
  const originalStderrGetWindowSize = process.stderr.getWindowSize;

  afterEach(() => {
    process.stdout.columns = originalStdoutColumns;
    process.stdout.rows = originalStdoutRows;
    process.stderr.columns = originalStderrColumns;
    process.stderr.rows = originalStderrRows;
    process.stdout.getWindowSize = originalStdoutGetWindowSize;
    process.stderr.getWindowSize = originalStderrGetWindowSize;
  });

  it('uses a live stdout ioctl when it returns a positive size', () => {
    process.stdout.getWindowSize = () => [120, 40];
    process.stderr.getWindowSize = () => [0, 0];
    expect(getTerminalSize()).toEqual({ columns: 120, rows: 40 });
    expect(process.stdout.columns).toBe(120);
    expect(process.stdout.rows).toBe(40);
  });

  it('falls back to stderr when stdout has no size', () => {
    process.stdout.getWindowSize = () => [0, 0];
    process.stderr.getWindowSize = () => [100, 30];
    process.stdout.columns = 0;
    process.stdout.rows = 0;
    expect(getTerminalSize()).toEqual({ columns: 100, rows: 30 });
  });

  it('clamps tiny terminals to the inspect minimum', () => {
    process.stdout.getWindowSize = () => [10, 5];
    process.stderr.getWindowSize = () => [10, 5];
    expect(getTerminalSize()).toEqual({ columns: 40, rows: 12 });
  });
});
