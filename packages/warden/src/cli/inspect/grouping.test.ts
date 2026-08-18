/**
 * Tests for the pure grouping / pane-title / marked-line helpers.
 *
 * No Ink or React dependency: these are plain TypeScript functions.
 */

import { describe, it, expect } from 'vitest';
import type { InspectFinding } from './session.js';
import type { ResolvedSource } from './source.js';
import {
  groupBySeverity,
  flatFindingList,
  sourcePaneTitle,
  isMarkedLine,
  scrollToMarked,
  DISPLAY_SEVERITY_ORDER,
} from './grouping.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFinding(id: string, severity: 'high' | 'medium' | 'low'): InspectFinding {
  return {
    finding: { id, severity, title: `Finding ${id}`, description: '' },
    skill: 'test-skill',
    reviewKey: `test-skill:${id}:1`,
    review: undefined,
  };
}

// ---------------------------------------------------------------------------
// groupBySeverity
// ---------------------------------------------------------------------------

describe('groupBySeverity', () => {
  it('returns groups in DISPLAY_SEVERITY_ORDER (high → medium → low)', () => {
    const findings = [
      makeFinding('l1', 'low'),
      makeFinding('h1', 'high'),
      makeFinding('m1', 'medium'),
    ];
    const groups = groupBySeverity(findings);
    expect(groups.map((g) => g.severity)).toEqual(['high', 'medium', 'low']);
  });

  it('omits empty severity groups', () => {
    const findings = [makeFinding('h1', 'high')];
    const groups = groupBySeverity(findings);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.severity).toBe('high');
  });

  it('returns an empty array for empty input', () => {
    expect(groupBySeverity([])).toHaveLength(0);
  });

  it('preserves order within each severity group', () => {
    const findings = [
      makeFinding('h1', 'high'),
      makeFinding('h2', 'high'),
    ];
    const groups = groupBySeverity(findings);
    expect(groups[0]!.findings.map((f) => f.finding.id)).toEqual(['h1', 'h2']);
  });
});

// ---------------------------------------------------------------------------
// flatFindingList
// ---------------------------------------------------------------------------

describe('flatFindingList', () => {
  it('puts unreviewed before reviewed', () => {
    const reviewed = [makeFinding('r1', 'low')];
    const unreviewed = [makeFinding('u1', 'high')];
    const flat = flatFindingList(unreviewed, reviewed);
    expect(flat[0]!.finding.id).toBe('u1');
    expect(flat[1]!.finding.id).toBe('r1');
  });

  it('groups unreviewed by severity in display order', () => {
    const unreviewed = [
      makeFinding('l1', 'low'),
      makeFinding('h1', 'high'),
      makeFinding('m1', 'medium'),
    ];
    const flat = flatFindingList(unreviewed, []);
    expect(flat.map((f) => f.finding.severity)).toEqual(['high', 'medium', 'low']);
  });
});

// ---------------------------------------------------------------------------
// sourcePaneTitle
// ---------------------------------------------------------------------------

describe('sourcePaneTitle', () => {
  it('returns "Source" when source is null', () => {
    expect(sourcePaneTitle(null)).toBe('Source');
  });

  it('returns "Source" for empty source', () => {
    const empty: ResolvedSource = { kind: 'empty', reason: 'test' };
    expect(sourcePaneTitle(empty)).toBe('Source');
  });

  it('returns snippet title verbatim', () => {
    const snippet: ResolvedSource = {
      kind: 'snippet',
      title: 'Source - Snippet',
      snippet: {
        path: 'src/foo.ts',
        startLine: 1,
        endLine: 10,
        targetStartLine: 3,
        targetEndLine: 5,
        lines: [],
      },
    };
    expect(sourcePaneTitle(snippet)).toBe('Source - Snippet');
  });

  it('returns file title verbatim', () => {
    const file: ResolvedSource = {
      kind: 'file',
      title: 'Source - File: src/bar.ts',
      absolutePath: '/repo/src/bar.ts',
      relativePath: 'src/bar.ts',
      lines: [],
    };
    expect(sourcePaneTitle(file)).toBe('Source - File: src/bar.ts');
  });
});

// ---------------------------------------------------------------------------
// isMarkedLine
// ---------------------------------------------------------------------------

describe('isMarkedLine', () => {
  it('returns false when startLine is undefined', () => {
    expect(isMarkedLine(5, undefined, undefined)).toBe(false);
  });

  it('marks a single-line range', () => {
    expect(isMarkedLine(5, 5, 5)).toBe(true);
    expect(isMarkedLine(4, 5, 5)).toBe(false);
    expect(isMarkedLine(6, 5, 5)).toBe(false);
  });

  it('marks a multi-line range', () => {
    expect(isMarkedLine(3, 2, 5)).toBe(true);
    expect(isMarkedLine(1, 2, 5)).toBe(false);
    expect(isMarkedLine(6, 2, 5)).toBe(false);
  });

  it('treats undefined endLine as a single-line mark', () => {
    expect(isMarkedLine(4, 4, undefined)).toBe(true);
    expect(isMarkedLine(5, 4, undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// scrollToMarked
// ---------------------------------------------------------------------------

describe('scrollToMarked', () => {
  it('returns current offset when startLine is undefined', () => {
    expect(scrollToMarked(undefined, 100, 20, 5)).toBe(5);
  });

  it('returns current offset when totalLines is 0', () => {
    expect(scrollToMarked(10, 0, 20, 0)).toBe(0);
  });

  it('scrolls up when target is above the viewport', () => {
    // target line 2 (0-based: 1) is above currentOffset=5
    const offset = scrollToMarked(2, 100, 20, 5);
    expect(offset).toBe(1); // max(0, 2-1)
  });

  it('keeps current offset when target is already visible', () => {
    // target line 10 (0-based: 9) within viewport [5, 25)
    const offset = scrollToMarked(10, 100, 20, 5);
    expect(offset).toBe(5);
  });

  it('scrolls down when target is below the viewport', () => {
    // target line 50 (0-based: 49) is outside viewport [0, 20)
    const offset = scrollToMarked(50, 100, 20, 0);
    // max(0, 49 - floor(20/2)) = 49 - 10 = 39
    expect(offset).toBe(39);
  });

  it('never returns a negative offset', () => {
    const offset = scrollToMarked(1, 100, 20, 10);
    expect(offset).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// DISPLAY_SEVERITY_ORDER
// ---------------------------------------------------------------------------

describe('DISPLAY_SEVERITY_ORDER', () => {
  it('is [high, medium, low]', () => {
    expect(DISPLAY_SEVERITY_ORDER).toEqual(['high', 'medium', 'low']);
  });
});
