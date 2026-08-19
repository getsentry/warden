/**
 * Layout regression: the inspect TUI must stay locked to the terminal
 * rectangle.  Yoga's default min-size is content, so long findings used
 * to stretch the frame and short ones left a gap.
 */

import { render } from 'ink-testing-library';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Finding } from '../../types/index.js';
import { InspectApp } from './app.js';
import type { InspectSession } from './session.js';

const COLUMNS = 100;
const ROWS = 24;

const originalStdoutColumns = process.stdout.columns;
const originalStdoutRows = process.stdout.rows;
const originalStderrColumns = process.stderr.columns;
const originalStderrRows = process.stderr.rows;
const originalStdoutGetWindowSize = process.stdout.getWindowSize;
const originalStderrGetWindowSize = process.stderr.getWindowSize;

function makeSnippet(path: string, lineCount: number, lineWidth: number): Finding['sourceSnippet'] {
  const lines = Array.from({ length: lineCount }, (_, i) => ({
    line: i + 1,
    content: `L${String(i + 1).padStart(4, '0')} ${'x'.repeat(lineWidth)}`,
  }));
  return {
    path,
    language: 'typescript',
    startLine: 1,
    endLine: lineCount,
    targetStartLine: 1,
    targetEndLine: Math.min(3, lineCount),
    lines,
  };
}

function makeFinding(overrides: Partial<Finding> & Pick<Finding, 'id' | 'title'>): Finding {
  return {
    severity: 'high',
    description: 'short description',
    ...overrides,
  };
}

function sessionFor(findings: Finding[]): InspectSession {
  return {
    unreviewed: findings.map((finding) => ({
      finding,
      skill: 'security-review',
      reviewKey: `security-review:${finding.id}:1`,
    })),
    reviewed: [],
  };
}

const ANSI_SGR = new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g');

function visibleWidth(line: string): number {
  // Markers are 1-cell glyphs, so code-point count matches terminal columns
  // after stripping color.
  return [...line.replace(ANSI_SGR, '')].length;
}

function frameSize(frame: string | undefined): { columns: number; rows: number; overflowing: string[] } {
  const lines = (frame ?? '').split('\n');
  const widths = lines.map(visibleWidth);
  return {
    rows: lines.length,
    columns: Math.max(0, ...widths),
    overflowing: lines.filter((_, i) => (widths[i] ?? 0) > COLUMNS),
  };
}

function renderInspect(session: InspectSession) {
  return render(
    <InspectApp
      session={session}
      repoRoot="/tmp/inspect-layout"
      runId="layout-test"
      logPath="/tmp/inspect-layout.jsonl"
    />,
  );
}

describe('InspectApp layout', () => {
  beforeEach(() => {
    process.stdout.columns = COLUMNS;
    process.stdout.rows = ROWS;
    process.stderr.columns = COLUMNS;
    process.stderr.rows = ROWS;
    process.stdout.getWindowSize = () => [COLUMNS, ROWS];
    process.stderr.getWindowSize = () => [COLUMNS, ROWS];
  });

  afterEach(() => {
    process.stdout.columns = originalStdoutColumns;
    process.stdout.rows = originalStdoutRows;
    process.stderr.columns = originalStderrColumns;
    process.stderr.rows = originalStderrRows;
    process.stdout.getWindowSize = originalStdoutGetWindowSize;
    process.stderr.getWindowSize = originalStderrGetWindowSize;
  });

  it('stays terminal-sized for a short finding and a long one', () => {
    const short = renderInspect(sessionFor([
      makeFinding({
        id: 'short',
        title: 'Short',
        description: 'Hi',
        sourceSnippet: makeSnippet('src/short.ts', 3, 8),
      }),
    ]));

    const long = renderInspect(sessionFor([
      makeFinding({
        id: 'long',
        title: 'A'.repeat(120),
        description: Array.from({ length: 40 }, (_, i) => `Paragraph ${i} ${'word '.repeat(30)}`).join('\n'),
        verification: Array.from({ length: 20 }, () => 'check '.repeat(40)).join('\n'),
        location: {
          path: 'packages/warden/src/very/deep/path/to/a/file/with/an/extremely/long/name.ts',
          startLine: 12,
          endLine: 48,
        },
        sourceSnippet: makeSnippet('src/long.ts', 80, 200),
      }),
    ]));

    const shortSize = frameSize(short.lastFrame());
    const longSize = frameSize(long.lastFrame());

    expect(shortSize.rows).toBe(ROWS);
    expect(shortSize.columns).toBe(COLUMNS);
    expect(shortSize.overflowing).toEqual([]);
    expect(longSize.rows).toBe(ROWS);
    expect(longSize.columns).toBe(COLUMNS);
    expect(longSize.overflowing).toEqual([]);

    // Switching findings must not change the outer frame size.
    expect(shortSize.rows).toBe(longSize.rows);
    expect(shortSize.columns).toBe(longSize.columns);

    short.unmount();
    long.unmount();
  });
});
