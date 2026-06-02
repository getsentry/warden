import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { APIError } from '@anthropic-ai/sdk';
import type { SkillDefinition } from '../config/schema.js';
import type { HunkWithContext } from '../diff/index.js';
import type { EventContext, Finding, UsageStats } from '../types/index.js';
import { analyzeFile, buildSourceSnippet, filterOutOfRangeFindings, runSkill } from './analyze.js';
import type { PreparedFile } from './types.js';
import { getRuntime, type Runtime } from './runtimes/index.js';
import { ProviderFailureCircuitBreaker } from './circuit-breaker.js';
import { Sentry } from '../sentry.js';
import { startTracedSpan } from '../sentry-trace.js';

vi.mock('./runtimes/index.js', () => ({
  getRuntime: vi.fn(),
  getRuntimeProviderOptions: vi.fn(() => undefined),
}));

beforeAll(() => {
  Sentry.init({
    dsn: 'https://public@example.com/1',
    tracesSampleRate: 1,
    transport: () => ({
      send: vi.fn(async () => ({})),
      flush: vi.fn(async () => true),
    }),
  });
});

afterAll(async () => {
  await Sentry.close(0);
});

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

function makeContextWithOneHunk(): EventContext {
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
        additions: 1,
        deletions: 1,
        patch: [
          '@@ -10,1 +10,1 @@',
          '-old10',
          '+new10',
        ].join('\n'),
        chunks: 1,
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

describe('buildSourceSnippet', () => {
  it('captures the target line and surrounding reviewed context', () => {
    const hunk: HunkWithContext = {
      filename: 'src/example.ts',
      hunk: {
        oldStart: 10,
        oldCount: 3,
        newStart: 10,
        newCount: 4,
        content: '@@ -10,3 +10,4 @@\n const before = true;\n-oldCall();\n+newCall(userInput);\n+audit();\n const after = true;',
        lines: [
          ' const before = true;',
          '-oldCall();',
          '+newCall(userInput);',
          '+audit();',
          ' const after = true;',
        ],
      },
      contextBefore: ['function release() {', '  const userInput = title;'],
      contextAfter: ['  return true;', '}'],
      contextStartLine: 8,
      language: 'typescript',
    };

    const snippet = buildSourceSnippet(makeFinding(11), hunk, 2);

    expect(snippet).toEqual({
      path: 'file.ts',
      language: 'typescript',
      startLine: 9,
      endLine: 13,
      targetStartLine: 11,
      targetEndLine: 11,
      lines: [
        { line: 9, content: '  const userInput = title;', highlighted: false },
        { line: 10, content: 'const before = true;', highlighted: false },
        { line: 11, content: 'newCall(userInput);', highlighted: true },
        { line: 12, content: 'audit();', highlighted: false },
        { line: 13, content: 'const after = true;', highlighted: false },
      ],
    });
  });

  it('ignores trailing empty diff parser lines when numbering source snippets', () => {
    const hunk: HunkWithContext = {
      filename: 'src/example.ts',
      hunk: {
        oldStart: 10,
        oldCount: 1,
        newStart: 10,
        newCount: 1,
        content: '@@ -10,1 +10,1 @@\n+newCall();\n',
        lines: ['+newCall();', ''],
      },
      contextBefore: [],
      contextAfter: ['after();'],
      contextStartLine: 10,
      language: 'typescript',
    };

    const snippet = buildSourceSnippet(makeFinding(10), hunk, 1);

    expect(snippet?.lines).toEqual([
      { line: 10, content: 'newCall();', highlighted: true },
      { line: 11, content: 'after();', highlighted: false },
    ]);
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

  it('captures Warden-created Sentry spans for completed hunks when enabled', async () => {
    const runSkill = vi.fn(async () => startTracedSpan(
      {
        op: 'gen_ai.invoke_agent',
        name: 'invoke_agent security-review',
        attributes: {
          'gen_ai.operation.name': 'invoke_agent',
          'gen_ai.agent.name': 'security-review',
        },
      },
      () => {
        startTracedSpan(
          {
            op: 'fs.read',
            name: 'read package.json',
            attributes: { 'file.path': 'package.json' },
          },
          () => undefined,
        );
        return {
          result: {
            status: 'success',
            text: JSON.stringify({ findings: [] }),
            errors: [],
            usage: makeUsage(),
            responseId: 'resp-123',
            responseModel: 'claude-test',
            sessionId: 'session-123',
            durationMs: 1200,
            durationApiMs: 900,
            numTurns: 2,
          },
        };
      },
    ));
    vi.mocked(getRuntime).mockReturnValue({
      name: 'claude',
      runSkill,
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
    } as unknown as Runtime);
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
        runtime: 'claude',
        captureTraces: true,
      },
      { onChunkComplete },
    );

    const trace = result.traces?.[0];
    expect(trace).toEqual(expect.objectContaining({
      filename: 'src/example.ts',
      lineRange: '1',
      runtime: 'claude',
      status: 'success',
      responseId: 'resp-123',
      responseModel: 'claude-test',
      sessionId: 'session-123',
      durationMs: 1200,
      durationApiMs: 900,
      numTurns: 2,
      traceId: expect.any(String),
      spanId: expect.any(String),
      spans: expect.arrayContaining([
        expect.objectContaining({
          op: 'gen_ai.invoke_agent',
          name: 'invoke_agent security-review',
          traceId: expect.any(String),
          spanId: expect.any(String),
          attributes: expect.objectContaining({
            'gen_ai.operation.name': 'invoke_agent',
          }),
        }),
        expect.objectContaining({
          op: 'fs.read',
          name: 'read package.json',
          traceId: expect.any(String),
          spanId: expect.any(String),
          attributes: expect.objectContaining({
            'file.path': 'package.json',
          }),
        }),
      ]),
    }));
    expect(trace?.spans?.map((span) => span.traceId)).toEqual(
      expect.arrayContaining([trace?.traceId, trace?.traceId]),
    );
    expect(onChunkComplete).toHaveBeenCalledWith(expect.objectContaining({
      trace,
    }));
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

  it('records runtime on reports with no hunks to analyze', async () => {
    const context = makeContextWithOneHunk();
    const report = await runSkill(
      {
        name: 'security-review',
        description: 'Security review.',
        prompt: 'Return findings as JSON.',
      },
      {
        ...context,
        pullRequest: {
          ...context.pullRequest!,
          files: [],
        },
      },
      { runtime: 'pi' },
    );

    expect(report.summary).toBe('No code changes to analyze');
    expect(report.runtime).toBe('pi');
  });

  it('preserves candidate findings when verification is interrupted', async () => {
    const controller = new AbortController();
    const runSkillMock = vi.fn()
      .mockResolvedValueOnce({
        result: {
          status: 'success',
          text: JSON.stringify({
            findings: [makeFinding(10, 'candidate-finding')],
          }),
          errors: [],
          usage: makeUsage(),
        },
      })
      .mockImplementationOnce(async () => {
        controller.abort();
        throw makeAbortError();
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
      makeContextWithOneHunk(),
      { abortController: controller },
    );

    expect(runSkillMock).toHaveBeenCalledTimes(2);
    expect(report.findings).toEqual([
      expect.objectContaining({
        title: 'Finding at line 10',
        location: { path: 'src/example.ts', startLine: 10 },
      }),
    ]);
    expect(report.files?.[0]?.findings).toBe(1);
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

  it('includes Warden-created Sentry spans on SkillReport when trace capture is enabled', async () => {
    const runSkillMock = vi.fn(async () => startTracedSpan(
      {
        op: 'gen_ai.invoke_agent',
        name: 'invoke_agent security-review',
        attributes: {
          'gen_ai.operation.name': 'invoke_agent',
          'gen_ai.agent.name': 'security-review',
        },
      },
      () => ({
        result: {
          status: 'success',
          text: JSON.stringify({ findings: [] }),
          errors: [],
          usage: makeUsage(),
          responseId: 'resp-report',
          responseModel: 'claude-report',
          sessionId: 'session-report',
          durationMs: 500,
          numTurns: 1,
        },
      }),
    ));
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
      makeContextWithOneHunk(),
      {
        runtime: 'claude',
        captureTraces: true,
        postProcessFindings: false,
      },
    );

    const trace = report.traces?.[0];
    expect(trace).toEqual(expect.objectContaining({
      filename: 'src/example.ts',
      lineRange: '10',
      runtime: 'claude',
      status: 'success',
      responseId: 'resp-report',
      responseModel: 'claude-report',
      sessionId: 'session-report',
      durationMs: 500,
      numTurns: 1,
      traceId: expect.any(String),
      spanId: expect.any(String),
      spans: expect.arrayContaining([
        expect.objectContaining({
          op: 'gen_ai.invoke_agent',
          traceId: expect.any(String),
          spanId: expect.any(String),
          attributes: expect.objectContaining({
            'gen_ai.operation.name': 'invoke_agent',
          }),
        }),
      ]),
    }));
    expect(trace?.spans?.[0]?.traceId).toBe(trace?.traceId);
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
