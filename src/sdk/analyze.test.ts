import { describe, it, expect, vi, afterEach } from 'vitest';
import type { SkillDefinition } from '../config/schema.js';
import type { HunkWithContext } from '../diff/index.js';
import type { Finding } from '../types/index.js';
import { analyzeFile, filterOutOfRangeFindings } from './analyze.js';
import type { PreparedFile } from './types.js';
import { getRuntime, type Runtime } from './runtimes/index.js';

vi.mock('./runtimes/index.js', () => ({
  getRuntime: vi.fn(),
  getRuntimeProviderOptions: vi.fn(() => undefined),
}));

function makeFinding(startLine: number, id = `f-${startLine}`): Finding {
  return {
    id,
    severity: 'medium',
    confidence: 'high',
    title: `Finding at line ${startLine}`,
    description: 'test',
    location: { path: 'file.ts', startLine },
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

function makeAbortError(): Error {
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';
  return error;
}

function makePreparedFile(): PreparedFile {
  const hunk: HunkWithContext = {
    filename: 'src/example.ts',
    hunk: {
      oldStart: 1,
      oldCount: 1,
      newStart: 1,
      newCount: 1,
      content: '@@ -1,1 +1,1 @@\n-old\n+new',
      lines: ['-old', '+new'],
    },
    contextBefore: [],
    contextAfter: [],
    contextStartLine: 1,
    language: 'typescript',
  };
  return {
    filename: 'src/example.ts',
    hunks: [hunk],
  };
}

describe('filterOutOfRangeFindings', () => {
  const hunkRange = { start: 10, end: 20 };

  it('preserves finding within hunk range', () => {
    const findings = [makeFinding(15)];
    const { filtered, dropped } = filterOutOfRangeFindings(findings, hunkRange);
    expect(filtered).toEqual(findings);
    expect(dropped).toEqual([]);
  });

  it('preserves findings at range boundaries', () => {
    const findings = [makeFinding(10, 'at-start'), makeFinding(20, 'at-end')];
    const { filtered, dropped } = filterOutOfRangeFindings(findings, hunkRange);
    expect(filtered).toHaveLength(2);
    expect(dropped).toEqual([]);
  });

  it('drops finding below hunk start', () => {
    const findings = [makeFinding(5)];
    const { filtered, dropped } = filterOutOfRangeFindings(findings, hunkRange);
    expect(filtered).toEqual([]);
    expect(dropped).toEqual(findings);
  });

  it('drops finding above hunk end', () => {
    const findings = [makeFinding(25)];
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
    const inRange = makeFinding(15, 'in-range');
    const belowRange = makeFinding(3, 'below');
    const aboveRange = makeFinding(50, 'above');
    const general = makeGeneralFinding('general');
    const findings = [inRange, belowRange, aboveRange, general];

    const { filtered, dropped } = filterOutOfRangeFindings(findings, hunkRange);
    expect(filtered).toEqual([inRange, general]);
    expect(dropped).toEqual([belowRange, aboveRange]);
  });

  it('returns empty arrays for empty input', () => {
    const { filtered, dropped } = filterOutOfRangeFindings([], hunkRange);
    expect(filtered).toEqual([]);
    expect(dropped).toEqual([]);
  });
});

describe('analyzeFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('treats runtime aborts as interruption instead of retry failures', async () => {
    const controller = new AbortController();
    const runSkill = vi.fn(async () => {
      controller.abort();
      throw makeAbortError();
    });
    vi.mocked(getRuntime).mockReturnValue({
      name: 'claude',
      runSkill,
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
    } as unknown as Runtime);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onRetry = vi.fn();
    const onHunkFailed = vi.fn();
    const onChunkComplete = vi.fn();
    const skill: SkillDefinition = {
      name: 'security-review',
      description: 'Security review.',
      prompt: 'Return findings as JSON.',
    };

    const result = await analyzeFile(
      skill,
      makePreparedFile(),
      '/tmp/repo',
      {
        abortController: controller,
        retry: {
          maxRetries: 3,
          initialDelayMs: 1,
          backoffMultiplier: 1,
          maxDelayMs: 1,
        },
      },
      {
        onRetry,
        onHunkFailed,
        onChunkComplete,
      },
    );

    expect(runSkill).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
    expect(onHunkFailed).toHaveBeenCalledWith('1', 'Analysis aborted');
    expect(onChunkComplete).toHaveBeenCalledWith(expect.objectContaining({
      failed: false,
      failureCode: 'aborted',
      failureMessage: 'Analysis aborted',
    }));
    expect(result.failedHunks).toBe(0);
    expect(result.hunkFailures).toEqual([]);
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('All retry attempts failed'));
    consoleSpy.mockRestore();
  });
});
