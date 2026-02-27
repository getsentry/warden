import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Finding } from '../types/index.js';
import { sanitizeFindingsSuggestedFixes } from './fix-quality.js';

vi.mock('./haiku.js', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    callHaiku: vi.fn(),
  };
});

import { callHaiku } from './haiku.js';
const mockCallHaiku = vi.mocked(callHaiku);

function makeFinding(diff: string, path = 'src/test.ts', startLine = 2): Finding {
  return {
    id: 'f1',
    severity: 'medium',
    title: 'Issue',
    description: 'desc',
    location: { path, startLine },
    suggestedFix: {
      description: 'fix',
      diff,
    },
  };
}

describe('sanitizeFindingsSuggestedFixes', () => {
  let repoPath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    repoPath = join(tmpdir(), `warden-fix-quality-${Date.now()}`);
    mkdirSync(join(repoPath, 'src'), { recursive: true });
    writeFileSync(join(repoPath, 'src/test.ts'), 'a\nb\nc\n');
  });

  it('strips suggestion when diff is unparseable', async () => {
    const finding = makeFinding('this is not a diff');

    const result = await sanitizeFindingsSuggestedFixes([finding], { repoPath, apiKey: 'k' });
    expect(result.findings[0]?.suggestedFix).toBeUndefined();
    expect(result.stats.strippedDeterministic).toBe(1);
  });

  it('strips suggestion on path mismatch', async () => {
    const finding = makeFinding(`--- a/src/other.ts
+++ b/src/other.ts
@@ -2,1 +2,1 @@
-b
+B`);

    const result = await sanitizeFindingsSuggestedFixes([finding], { repoPath, apiKey: 'k' });
    expect(result.findings[0]?.suggestedFix).toBeUndefined();
    expect(result.stats.strippedDeterministic).toBe(1);
  });

  it('strips suggestion when hunk does not overlap finding line', async () => {
    const finding = makeFinding(`--- a/src/test.ts
+++ b/src/test.ts
@@ -1,1 +1,1 @@
-a
+A`, 'src/test.ts', 3);

    const result = await sanitizeFindingsSuggestedFixes([finding], { repoPath, apiKey: 'k' });
    expect(result.findings[0]?.suggestedFix).toBeUndefined();
    expect(result.stats.strippedDeterministic).toBe(1);
  });

  it('keeps suggestion when old-side hunk overlaps finding after deletions', async () => {
    const finding = makeFinding(`--- a/src/test.ts
+++ b/src/test.ts
@@ -2,2 +2,1 @@
-b
-c
+B`, 'src/test.ts', 3);

    const result = await sanitizeFindingsSuggestedFixes([finding], { repoPath });
    expect(result.findings[0]?.suggestedFix).toBeDefined();
    expect(result.stats.strippedDeterministic).toBe(0);
    expect(result.stats.semanticUnavailable).toBe(1);
  });

  it('strips suggestion when apply fails', async () => {
    const finding = makeFinding(`--- a/src/test.ts
+++ b/src/test.ts
@@ -2,1 +2,1 @@
-wrong
+B`);

    const result = await sanitizeFindingsSuggestedFixes([finding], { repoPath, apiKey: 'k' });
    expect(result.findings[0]?.suggestedFix).toBeUndefined();
    expect(result.stats.strippedDeterministic).toBe(1);
  });

  it('strips suggestion when semantic judge fails', async () => {
    const finding = makeFinding(`--- a/src/test.ts
+++ b/src/test.ts
@@ -2,1 +2,1 @@
-b
+B`);
    mockCallHaiku.mockResolvedValue({
      success: true,
      data: { verdict: 'fail', reason: 'incorrect fix' },
      usage: { inputTokens: 10, outputTokens: 4, costUSD: 0.0001 },
    });

    const result = await sanitizeFindingsSuggestedFixes([finding], { repoPath, apiKey: 'k' });
    expect(result.findings[0]?.suggestedFix).toBeUndefined();
    expect(result.stats.strippedSemantic).toBe(1);
  });

  it('keeps suggestion when semantic gate is unavailable', async () => {
    const finding = makeFinding(`--- a/src/test.ts
+++ b/src/test.ts
@@ -2,1 +2,1 @@
-b
+B`);
    mockCallHaiku.mockResolvedValue({
      success: false,
      error: 'timeout',
      usage: { inputTokens: 10, outputTokens: 0, costUSD: 0 },
    });

    const result = await sanitizeFindingsSuggestedFixes([finding], { repoPath, apiKey: 'k' });
    expect(result.findings[0]?.suggestedFix).toBeDefined();
    expect(result.stats.semanticUnavailable).toBe(1);
  });

  it('keeps suggestion when all gates pass', async () => {
    const finding = makeFinding(`--- a/src/test.ts
+++ b/src/test.ts
@@ -2,1 +2,1 @@
-b
+B`);
    mockCallHaiku.mockResolvedValue({
      success: true,
      data: { verdict: 'pass', reason: 'good fix' },
      usage: { inputTokens: 10, outputTokens: 4, costUSD: 0.0001 },
    });

    const result = await sanitizeFindingsSuggestedFixes([finding], { repoPath, apiKey: 'k' });
    expect(result.findings[0]?.suggestedFix).toBeDefined();
    expect(result.stats.strippedDeterministic).toBe(0);
    expect(result.stats.strippedSemantic).toBe(0);
  });

  it('ignores findings without suggestions', async () => {
    const finding: Finding = {
      id: 'f2',
      severity: 'low',
      title: 'No fix',
      description: 'desc',
    };

    const result = await sanitizeFindingsSuggestedFixes([finding], { repoPath, apiKey: 'k' });
    expect(result.findings[0]).toEqual(finding);
    expect(result.stats.checked).toBe(0);
  });

  afterEach(() => {
    rmSync(repoPath, { recursive: true, force: true });
  });
});
