import { describe, expect, it } from 'vitest';
import type { Finding } from '../types/index.js';
import { filterOutOfRangeFindings } from './analyze.js';

function makeFinding(id: string, title: string, startLine = 10): Finding {
  return {
    id,
    severity: 'medium',
    confidence: 'high',
    title,
    description: `${title} description`,
    location: { path: 'src/test.ts', startLine },
  };
}

function makeGeneralFinding(id = 'general'): Finding {
  return {
    id,
    severity: 'low',
    title: 'General finding',
    description: 'no location',
  };
}

describe('filterOutOfRangeFindings', () => {
  const hunkRange = { start: 10, end: 20 };

  it('preserves finding within hunk range', () => {
    const findings = [makeFinding('in-range', 'In range', 15)];
    const { filtered, dropped } = filterOutOfRangeFindings(findings, hunkRange);
    expect(filtered).toEqual(findings);
    expect(dropped).toEqual([]);
  });

  it('preserves findings at range boundaries', () => {
    const findings = [makeFinding('at-start', 'At start', 10), makeFinding('at-end', 'At end', 20)];
    const { filtered, dropped } = filterOutOfRangeFindings(findings, hunkRange);
    expect(filtered).toHaveLength(2);
    expect(dropped).toEqual([]);
  });

  it('drops finding below hunk start', () => {
    const findings = [makeFinding('below', 'Below', 5)];
    const { filtered, dropped } = filterOutOfRangeFindings(findings, hunkRange);
    expect(filtered).toEqual([]);
    expect(dropped).toEqual(findings);
  });

  it('drops finding above hunk end', () => {
    const findings = [makeFinding('above', 'Above', 25)];
    const { filtered, dropped } = filterOutOfRangeFindings(findings, hunkRange);
    expect(filtered).toEqual([]);
    expect(dropped).toEqual(findings);
  });

  it('preserves finding with no location', () => {
    const findings = [makeGeneralFinding()];
    const { filtered, dropped } = filterOutOfRangeFindings(findings, hunkRange);
    expect(filtered).toEqual(findings);
    expect(dropped).toEqual([]);
  });

  it('filters mixed set correctly', () => {
    const inRange = makeFinding('in-range', 'In range', 15);
    const belowRange = makeFinding('below', 'Below', 3);
    const aboveRange = makeFinding('above', 'Above', 50);
    const general = makeGeneralFinding('general');

    const { filtered, dropped } = filterOutOfRangeFindings([inRange, belowRange, aboveRange, general], hunkRange);
    expect(filtered).toEqual([inRange, general]);
    expect(dropped).toEqual([belowRange, aboveRange]);
  });

  it('returns empty arrays for empty input', () => {
    const { filtered, dropped } = filterOutOfRangeFindings([], hunkRange);
    expect(filtered).toEqual([]);
    expect(dropped).toEqual([]);
  });
});
