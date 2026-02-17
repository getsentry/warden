import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mergeCrossLocationFindings, mergeGroupLocations } from './extract.js';
import type { Finding } from '../types/index.js';

// Mock callHaiku to avoid real API calls
vi.mock('./haiku.js', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    callHaiku: vi.fn(),
  };
});

import { callHaiku } from './haiku.js';
const mockCallHaiku = vi.mocked(callHaiku);

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'f1',
    severity: 'medium',
    title: 'Test Issue',
    description: 'Test description',
    ...overrides,
  };
}

describe('mergeCrossLocationFindings', () => {
  let tempDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = join(tmpdir(), `warden-extract-test-${Date.now()}`);
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    writeFileSync(join(tempDir, 'src/a.ts'), 'line1\nline2\nline3\nline4\nline5\n');
    writeFileSync(join(tempDir, 'src/b.ts'), 'line1\nline2\nline3\nline4\nline5\n');
  });

  it('returns unchanged when fewer than 2 findings have locations', async () => {
    const findings = [
      makeFinding({ id: 'f1', location: { path: 'src/a.ts', startLine: 1 } }),
    ];

    const result = await mergeCrossLocationFindings(findings, { apiKey: 'test-key', repoPath: tempDir });
    expect(result.findings).toEqual(findings);
    expect(result.mergedCount).toBe(0);
    expect(result.usage).toBeUndefined();
  });

  it('returns unchanged when no API key', async () => {
    const findings = [
      makeFinding({ id: 'f1', location: { path: 'src/a.ts', startLine: 1 } }),
      makeFinding({ id: 'f2', location: { path: 'src/b.ts', startLine: 1 } }),
    ];

    const result = await mergeCrossLocationFindings(findings);
    expect(result.findings).toEqual(findings);
    expect(result.mergedCount).toBe(0);
  });

  it('returns unchanged when 0 findings', async () => {
    const result = await mergeCrossLocationFindings([], { apiKey: 'test-key' });
    expect(result.findings).toEqual([]);
    expect(result.mergedCount).toBe(0);
  });

  it('returns unchanged when LLM says no groups', async () => {
    const findings = [
      makeFinding({ id: 'f1', title: 'Issue A', location: { path: 'src/a.ts', startLine: 1 } }),
      makeFinding({ id: 'f2', title: 'Issue B', location: { path: 'src/b.ts', startLine: 1 } }),
    ];

    mockCallHaiku.mockResolvedValue({
      success: true,
      data: [],
      usage: { inputTokens: 100, outputTokens: 10, costUSD: 0.001 },
    });

    const result = await mergeCrossLocationFindings(findings, { apiKey: 'test-key', repoPath: tempDir });
    expect(result.findings).toHaveLength(2);
    expect(result.mergedCount).toBe(0);
  });

  it('merges two findings into one with additionalLocations', async () => {
    const findings = [
      makeFinding({
        id: 'f1',
        severity: 'high',
        title: 'Missing null check',
        location: { path: 'src/a.ts', startLine: 3 },
      }),
      makeFinding({
        id: 'f2',
        severity: 'medium',
        title: 'Missing null check',
        location: { path: 'src/b.ts', startLine: 2 },
      }),
    ];

    mockCallHaiku.mockResolvedValue({
      success: true,
      data: [[1, 2]],
      usage: { inputTokens: 100, outputTokens: 10, costUSD: 0.001 },
    });

    const result = await mergeCrossLocationFindings(findings, { apiKey: 'test-key', repoPath: tempDir });
    expect(result.findings).toHaveLength(1);
    expect(result.mergedCount).toBe(1);
    // Winner is the one with higher severity
    expect(result.findings[0]!.id).toBe('f1');
    expect(result.findings[0]!.additionalLocations).toEqual([
      { path: 'src/b.ts', startLine: 2 },
    ]);
  });

  it('merges 3+ locations in one group', async () => {
    const findings = [
      makeFinding({ id: 'f1', severity: 'medium', location: { path: 'src/a.ts', startLine: 1 } }),
      makeFinding({ id: 'f2', severity: 'high', location: { path: 'src/b.ts', startLine: 2 } }),
      makeFinding({ id: 'f3', severity: 'medium', location: { path: 'src/a.ts', startLine: 5 } }),
    ];

    mockCallHaiku.mockResolvedValue({
      success: true,
      data: [[1, 2, 3]],
      usage: { inputTokens: 100, outputTokens: 10, costUSD: 0.001 },
    });

    const result = await mergeCrossLocationFindings(findings, { apiKey: 'test-key', repoPath: tempDir });
    expect(result.findings).toHaveLength(1);
    expect(result.mergedCount).toBe(2);
    // f2 wins (high severity)
    expect(result.findings[0]!.id).toBe('f2');
    expect(result.findings[0]!.additionalLocations).toHaveLength(2);
  });

  it('winner selection: severity > confidence > path > line', async () => {
    const findings = [
      makeFinding({
        id: 'f1',
        severity: 'medium',
        confidence: 'high',
        location: { path: 'src/a.ts', startLine: 10 },
      }),
      makeFinding({
        id: 'f2',
        severity: 'medium',
        confidence: 'high',
        location: { path: 'src/b.ts', startLine: 5 },
      }),
    ];

    mockCallHaiku.mockResolvedValue({
      success: true,
      data: [[1, 2]],
      usage: { inputTokens: 100, outputTokens: 10, costUSD: 0.001 },
    });

    const result = await mergeCrossLocationFindings(findings, { apiKey: 'test-key', repoPath: tempDir });
    // Same severity, same confidence, a.ts < b.ts alphabetically
    expect(result.findings[0]!.id).toBe('f1');
  });

  it('carries over existing additionalLocations from losers', async () => {
    const findings = [
      makeFinding({
        id: 'f1',
        severity: 'high',
        location: { path: 'src/a.ts', startLine: 1 },
      }),
      makeFinding({
        id: 'f2',
        severity: 'medium',
        location: { path: 'src/b.ts', startLine: 2 },
        additionalLocations: [{ path: 'src/c.ts', startLine: 3 }],
      }),
    ];

    mockCallHaiku.mockResolvedValue({
      success: true,
      data: [[1, 2]],
      usage: { inputTokens: 100, outputTokens: 10, costUSD: 0.001 },
    });

    const result = await mergeCrossLocationFindings(findings, { apiKey: 'test-key', repoPath: tempDir });
    expect(result.findings[0]!.additionalLocations).toEqual([
      { path: 'src/b.ts', startLine: 2 },
      { path: 'src/c.ts', startLine: 3 },
    ]);
  });

  it('passes through findings without locations unchanged', async () => {
    const findings = [
      makeFinding({ id: 'f1', location: { path: 'src/a.ts', startLine: 1 } }),
      makeFinding({ id: 'f2' }), // no location
      makeFinding({ id: 'f3', location: { path: 'src/b.ts', startLine: 2 } }),
    ];

    mockCallHaiku.mockResolvedValue({
      success: true,
      data: [[1, 2]], // groups the two with-location findings (indices 1,2 from withLocations array)
      usage: { inputTokens: 100, outputTokens: 10, costUSD: 0.001 },
    });

    const result = await mergeCrossLocationFindings(findings, { apiKey: 'test-key', repoPath: tempDir });
    // f1 absorbs f3, f2 (no location) passes through
    expect(result.findings).toHaveLength(2);
    expect(result.findings.find((f) => f.id === 'f2')).toBeDefined();
  });

  it('returns unchanged when LLM fails', async () => {
    const findings = [
      makeFinding({ id: 'f1', location: { path: 'src/a.ts', startLine: 1 } }),
      makeFinding({ id: 'f2', location: { path: 'src/b.ts', startLine: 2 } }),
    ];

    mockCallHaiku.mockResolvedValue({
      success: false,
      error: 'API error',
      usage: { inputTokens: 100, outputTokens: 0, costUSD: 0.001 },
    });

    const result = await mergeCrossLocationFindings(findings, { apiKey: 'test-key', repoPath: tempDir });
    expect(result.findings).toHaveLength(2);
    expect(result.mergedCount).toBe(0);
    expect(result.usage).toBeDefined();
  });

  it('does not mutate the original finding objects', async () => {
    const f1 = makeFinding({
      id: 'f1',
      severity: 'high',
      title: 'Missing null check',
      location: { path: 'src/a.ts', startLine: 3 },
    });
    const f2 = makeFinding({
      id: 'f2',
      severity: 'medium',
      title: 'Missing null check',
      location: { path: 'src/b.ts', startLine: 2 },
    });

    mockCallHaiku.mockResolvedValue({
      success: true,
      data: [[1, 2]],
      usage: { inputTokens: 100, outputTokens: 10, costUSD: 0.001 },
    });

    await mergeCrossLocationFindings([f1, f2], { apiKey: 'test-key', repoPath: tempDir });
    // Original f1 should NOT have additionalLocations added
    expect(f1.additionalLocations).toBeUndefined();
  });

  it('handles overlapping LLM groups without losing locations', async () => {
    const findings = [
      makeFinding({ id: 'f1', severity: 'high', location: { path: 'src/a.ts', startLine: 1 } }),
      makeFinding({ id: 'f2', severity: 'medium', location: { path: 'src/a.ts', startLine: 2 } }),
      makeFinding({ id: 'f3', severity: 'medium', location: { path: 'src/b.ts', startLine: 1 } }),
    ];

    // LLM returns overlapping groups: [1,2] and [2,3]
    mockCallHaiku.mockResolvedValue({
      success: true,
      data: [[1, 2], [2, 3]],
      usage: { inputTokens: 100, outputTokens: 10, costUSD: 0.001 },
    });

    const result = await mergeCrossLocationFindings(findings, { apiKey: 'test-key', repoPath: tempDir });
    // f2 is absorbed by group [1,2]. Group [2,3] should skip f2 (already absorbed),
    // leaving f3 as a singleton that passes through.
    expect(result.findings).toHaveLength(2);
    expect(result.findings.find((f) => f.id === 'f1')).toBeDefined();
    expect(result.findings.find((f) => f.id === 'f3')).toBeDefined();
    expect(result.mergedCount).toBe(1);
  });

  it('deduplicates identical additional locations', async () => {
    const findings = [
      makeFinding({
        id: 'f1',
        severity: 'high',
        location: { path: 'src/a.ts', startLine: 1 },
        additionalLocations: [{ path: 'src/b.ts', startLine: 2 }],
      }),
      makeFinding({
        id: 'f2',
        severity: 'medium',
        location: { path: 'src/b.ts', startLine: 2 },
      }),
    ];

    mockCallHaiku.mockResolvedValue({
      success: true,
      data: [[1, 2]],
      usage: { inputTokens: 100, outputTokens: 10, costUSD: 0.001 },
    });

    const result = await mergeCrossLocationFindings(findings, { apiKey: 'test-key', repoPath: tempDir });
    // src/b.ts:2 should only appear once in additionalLocations (deduped)
    expect(result.findings[0]!.additionalLocations).toEqual([
      { path: 'src/b.ts', startLine: 2 },
    ]);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });
});

describe('mergeGroupLocations', () => {
  function makeFinding(overrides: Partial<Finding> = {}): Finding {
    return {
      id: 'f1',
      severity: 'medium',
      title: 'Test Issue',
      description: 'Test description',
      ...overrides,
    };
  }

  it('returns undefined for empty group', () => {
    expect(mergeGroupLocations([])).toBeUndefined();
  });

  it('returns winner unchanged for single-element group', () => {
    const f = makeFinding({ location: { path: 'a.ts', startLine: 1 } });
    const result = mergeGroupLocations([f]);
    expect(result).toBe(f); // Same reference when no losers
  });

  it('returns a new object (not the original) when merging', () => {
    const winner = makeFinding({ id: 'w', location: { path: 'a.ts', startLine: 1 } });
    const loser = makeFinding({ id: 'l', location: { path: 'b.ts', startLine: 2 } });
    const result = mergeGroupLocations([winner, loser]);
    expect(result).not.toBe(winner);
    expect(result!.id).toBe('w');
    expect(result!.additionalLocations).toEqual([{ path: 'b.ts', startLine: 2 }]);
  });

  it('deduplicates locations by path:startLine:endLine', () => {
    const winner = makeFinding({
      id: 'w',
      location: { path: 'a.ts', startLine: 1 },
      additionalLocations: [{ path: 'b.ts', startLine: 2 }],
    });
    const loser = makeFinding({ id: 'l', location: { path: 'b.ts', startLine: 2 } });
    const result = mergeGroupLocations([winner, loser]);
    // b.ts:2 appears in both winner.additionalLocations and loser.location - should be deduped
    expect(result!.additionalLocations).toEqual([{ path: 'b.ts', startLine: 2 }]);
  });
});
