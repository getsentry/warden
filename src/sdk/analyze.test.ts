import { describe, it, expect, vi, afterEach } from 'vitest';
import { APIError } from '@anthropic-ai/sdk';
import type { SkillDefinition } from '../config/schema.js';
import type { HunkWithContext } from '../diff/index.js';
import type { EventContext, Finding, UsageStats } from '../types/index.js';
import { analyzeFile, filterOutOfRangeFindings, runSkill } from './analyze.js';
import type { PreparedFile } from './types.js';
import { getRuntime, type Runtime } from './runtimes/index.js';
import { ProviderFailureCircuitBreaker } from './circuit-breaker.js';

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

function makeUsage(): UsageStats {
  return { inputTokens: 10, outputTokens: 5, costUSD: 0.001 };
}

function makeAbortError(): Error {
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';
  return error;
}

function makePreparedFile(hunkCount = 1): PreparedFile {
  const hunks: HunkWithContext[] = Array.from({ length: hunkCount }, (_, index) => {
    const line = index + 1;
    return {
      filename: 'src/example.ts',
      hunk: {
        oldStart: line,
        oldCount: 1,
        newStart: line,
        newCount: 1,
        content: `@@ -${line},1 +${line},1 @@\n-old\n+new`,
        lines: ['-old', '+new'],
      },
      contextBefore: [],
      contextAfter: [],
      contextStartLine: line,
      language: 'typescript',
    };
  });
  return {
    filename: 'src/example.ts',
    hunks,
  };
}

function makeContextWithThreeHunks(): EventContext {
  return {
    eventType: 'pull_request',
    action: 'opened',
    repository: { owner: 'o', name: 'r', fullName: 'o/r', defaultBranch: 'main' },
    repoPath: '/tmp/repo',
    pullRequest: {
      number: 1,
      title: 'Test PR',
      body: '',
      author: 'test',
      baseBranch: 'main',
      headBranch: 'feature',
      headSha: 'head',
      baseSha: 'base',
      files: [{
        filename: 'src/example.ts',
        status: 'modified',
        additions: 3,
        deletions: 3,
        patch: [
          '@@ -10,1 +10,1 @@',
          '-old10',
          '+new10',
          '@@ -100,1 +100,1 @@',
          '-old100',
          '+new100',
          '@@ -200,1 +200,1 @@',
          '-old200',
          '+new200',
        ].join('\n'),
        chunks: 3,
      }],
    },
  };
}

function makeContextWithTwoHunks(): EventContext {
  return {
    eventType: 'pull_request',
    action: 'opened',
    repository: { owner: 'o', name: 'r', fullName: 'o/r', defaultBranch: 'main' },
    repoPath: '/tmp/repo',
    pullRequest: {
      number: 1,
      title: 'Test PR',
      body: '',
      author: 'test',
      baseBranch: 'main',
      headBranch: 'feature',
      headSha: 'head',
      baseSha: 'base',
      files: [{
        filename: 'src/example.ts',
        status: 'modified',
        additions: 2,
        deletions: 2,
        patch: [
          '@@ -10,1 +10,1 @@',
          '-old10',
          '+new10',
          '@@ -100,1 +100,1 @@',
          '-old100',
          '+new100',
        ].join('\n'),
        chunks: 2,
      }],
    },
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

  it('opens the shared circuit after consecutive provider failures', async () => {
    const controller = new AbortController();
    const circuitBreaker = new ProviderFailureCircuitBreaker({
      maxConsecutiveProviderFailures: 2,
      abortController: controller,
    });
    const runSkill = vi.fn(async () => {
      throw new Error('Claude Code process exited with code 1');
    });
    vi.mocked(getRuntime).mockReturnValue({
      name: 'claude',
      runSkill,
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
    } as unknown as Runtime);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onChunkComplete = vi.fn();
    const skill: SkillDefinition = {
      name: 'security-review',
      description: 'Security review.',
      prompt: 'Return findings as JSON.',
    };

    const result = await analyzeFile(
      skill,
      makePreparedFile(3),
      '/tmp/repo',
      {
        abortController: controller,
        circuitBreaker,
        retry: {
          maxRetries: 0,
          initialDelayMs: 1,
          backoffMultiplier: 1,
          maxDelayMs: 1,
        },
      },
      { onChunkComplete },
    );

    expect(runSkill).toHaveBeenCalledTimes(2);
    expect(controller.signal.aborted).toBe(true);
    expect(circuitBreaker.reason?.code).toBe('provider_unavailable');
    expect(result.failedHunks).toBe(2);
    expect(result.hunkFailures.map((failure) => failure.code)).toEqual([
      'provider_unavailable',
      'provider_unavailable',
    ]);
    expect(result.hunkFailures[1]!.message).toContain('Provider unavailable after 2 consecutive failures');
    expect(onChunkComplete).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });

  it('counts provider failures once per hunk after retries are exhausted', async () => {
    const controller = new AbortController();
    const circuitBreaker = new ProviderFailureCircuitBreaker({
      maxConsecutiveProviderFailures: 2,
      abortController: controller,
    });
    const runSkill = vi.fn(async () => {
      throw new APIError(
        529,
        { error: { type: 'overloaded_error', message: 'overloaded' } },
        'overloaded',
        undefined
      );
    });
    vi.mocked(getRuntime).mockReturnValue({
      name: 'claude',
      runSkill,
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
    } as unknown as Runtime);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
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
        circuitBreaker,
        retry: {
          maxRetries: 2,
          initialDelayMs: 1,
          backoffMultiplier: 1,
          maxDelayMs: 1,
        },
      },
    );

    expect(runSkill).toHaveBeenCalledTimes(3);
    expect(controller.signal.aborted).toBe(false);
    expect(circuitBreaker.reason).toBeUndefined();
    expect(result.failedHunks).toBe(1);
    expect(result.hunkFailures[0]?.code).toBe('provider_unavailable');
    consoleSpy.mockRestore();
  });

  it('preserves non-circuit failure codes when another hunk opens the circuit', async () => {
    const controller = new AbortController();
    const circuitBreaker = new ProviderFailureCircuitBreaker({
      maxConsecutiveProviderFailures: 1,
      abortController: controller,
    });
    const runSkill = vi.fn(async () => {
      circuitBreaker.recordFailure('provider_unavailable', 'provider outage');
      return {
        result: {
          status: 'turn_limit',
          text: '',
          errors: ['max turns reached'],
          usage: makeUsage(),
        },
      };
    });
    vi.mocked(getRuntime).mockReturnValue({
      name: 'claude',
      runSkill,
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
    } as unknown as Runtime);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
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
        circuitBreaker,
        retry: {
          maxRetries: 0,
          initialDelayMs: 1,
          backoffMultiplier: 1,
          maxDelayMs: 1,
        },
      },
    );

    expect(circuitBreaker.reason?.code).toBe('provider_unavailable');
    expect(result.failedHunks).toBe(1);
    expect(result.hunkFailures[0]?.code).toBe('max_turns');
    expect(result.hunkFailures[0]?.message).toContain('max turns reached');
    consoleSpy.mockRestore();
  });
});

describe('runSkill', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves partial findings when the shared circuit opens mid-run', async () => {
    const controller = new AbortController();
    const circuitBreaker = new ProviderFailureCircuitBreaker({
      maxConsecutiveProviderFailures: 2,
      abortController: controller,
    });
    const runSkillMock = vi.fn()
      .mockResolvedValueOnce({
        result: {
          status: 'success',
          text: JSON.stringify({
            findings: [makeFinding(10, 'first-finding')],
          }),
          errors: [],
          usage: makeUsage(),
        },
      })
      .mockRejectedValue(new Error('Claude Code process exited with code 1'));
    vi.mocked(getRuntime).mockReturnValue({
      name: 'claude',
      runSkill: runSkillMock,
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
    } as unknown as Runtime);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const report = await runSkill(
      {
        name: 'security-review',
        description: 'Security review.',
        prompt: 'Return findings as JSON.',
      },
      makeContextWithThreeHunks(),
      {
        abortController: controller,
        circuitBreaker,
        retry: {
          maxRetries: 0,
          initialDelayMs: 1,
          backoffMultiplier: 1,
          maxDelayMs: 1,
        },
        verifyFindings: false,
      },
    );

    expect(runSkillMock).toHaveBeenCalledTimes(3);
    expect(circuitBreaker.reason?.code).toBe('provider_unavailable');
    expect(report.findings).toEqual([
      expect.objectContaining({
        title: 'Finding at line 10',
        location: { path: 'src/example.ts', startLine: 10 },
      }),
    ]);
    expect(report.failedHunks).toBe(2);
    expect(report.hunkFailures?.map((failure) => failure.code)).toEqual([
      'provider_unavailable',
      'provider_unavailable',
    ]);
    expect(report.error).toBeUndefined();
    consoleSpy.mockRestore();
  });

  it('ignores unrelated circuit state when this skill completed without failures', async () => {
    const circuitBreaker = new ProviderFailureCircuitBreaker({
      maxConsecutiveProviderFailures: 1,
    });
    const successResult = {
      result: {
        status: 'success',
        text: JSON.stringify({ findings: [] }),
        errors: [],
        usage: makeUsage(),
      },
    };
    const runSkillMock = vi.fn()
      .mockResolvedValueOnce(successResult)
      .mockImplementationOnce(async () => {
        circuitBreaker.recordFailure('provider_unavailable', 'temporary outage');
        return successResult;
      });
    vi.mocked(getRuntime).mockReturnValue({
      name: 'claude',
      runSkill: runSkillMock,
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
    } as unknown as Runtime);

    const report = await runSkill(
      {
        name: 'security-review',
        description: 'Security review.',
        prompt: 'Return findings as JSON.',
      },
      makeContextWithTwoHunks(),
      {
        circuitBreaker,
        verifyFindings: false,
      },
    );

    expect(runSkillMock).toHaveBeenCalledTimes(2);
    expect(report.findings).toEqual([]);
    expect(report.failedHunks).toBeUndefined();
    expect(report.failedExtractions).toBeUndefined();
    expect(report.error).toBeUndefined();
  });

  it('classifies mixed provider and extraction failures as provider unavailable', async () => {
    const runSkillMock = vi.fn()
      .mockResolvedValueOnce({
        result: {
          status: 'provider_error',
          text: '',
          errors: ['provider overloaded'],
          usage: makeUsage(),
        },
      })
      .mockResolvedValueOnce({
        result: {
          status: 'success',
          text: 'not json',
          errors: [],
          usage: makeUsage(),
        },
      });
    vi.mocked(getRuntime).mockReturnValue({
      name: 'claude',
      runSkill: runSkillMock,
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
    } as unknown as Runtime);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(runSkill(
      {
        name: 'security-review',
        description: 'Security review.',
        prompt: 'Return findings as JSON.',
      },
      makeContextWithTwoHunks(),
      {
        retry: {
          maxRetries: 0,
          initialDelayMs: 1,
          backoffMultiplier: 1,
          maxDelayMs: 1,
        },
        verifyFindings: false,
      },
    )).rejects.toMatchObject({ code: 'provider_unavailable' });
    expect(runSkillMock).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });
});
