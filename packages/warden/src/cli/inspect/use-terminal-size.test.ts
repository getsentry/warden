import { afterEach, describe, expect, it } from 'vitest';
import { getTerminalSize } from './use-terminal-size.js';

describe('getTerminalSize', () => {
  const originalStdoutColumns = process.stdout.columns;
  const originalStdoutRows = process.stdout.rows;
  const originalStderrColumns = process.stderr.columns;
  const originalStderrRows = process.stderr.rows;

  afterEach(() => {
    process.stdout.columns = originalStdoutColumns;
    process.stdout.rows = originalStdoutRows;
    process.stderr.columns = originalStderrColumns;
    process.stderr.rows = originalStderrRows;
  });

  it('uses stdout dimensions when they are positive', () => {
    process.stdout.columns = 120;
    process.stdout.rows = 40;
    expect(getTerminalSize()).toEqual({ columns: 120, rows: 40 });
  });

  it('falls back to stderr when stdout has no size', () => {
    process.stdout.columns = 0;
    process.stdout.rows = 0;
    process.stderr.columns = 100;
    process.stderr.rows = 30;
    expect(getTerminalSize()).toEqual({ columns: 100, rows: 30 });
  });

  it('clamps tiny terminals to the inspect minimum', () => {
    process.stdout.columns = 10;
    process.stdout.rows = 5;
    process.stderr.columns = 10;
    process.stderr.rows = 5;
    expect(getTerminalSize()).toEqual({ columns: 40, rows: 12 });
  });
});
