import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SkillDefinition } from '../config/schema.js';
import type { Finding, UsageStats } from '../types/index.js';
import { WardenAuthenticationError } from './errors.js';
import { verifyFindings } from './verify.js';
import { getRuntime, type Runtime, type SkillRunResponse } from './runtimes/index.js';

vi.mock('./runtimes/index.js', () => ({
  getRuntime: vi.fn(),
  getRuntimeProviderOptions: vi.fn(() => undefined),
}));

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'ABC-123',
    severity: 'high',
    confidence: 'high',
    title: 'Candidate issue',
    description: 'Something may be wrong.',
    location: { path: 'src/app.ts', startLine: 10 },
    ...overrides,
  };
}

function makeSkill(): SkillDefinition {
  return {
    name: 'test-skill',
    description: 'test',
    prompt: 'Only report real issues.',
  };
}

function makeUsage(): UsageStats {
  return { inputTokens: 10, outputTokens: 5, costUSD: 0.001 };
}

function mockRuntimeResponse(response: SkillRunResponse): Runtime {
  return {
    name: 'claude',
    runSkill: vi.fn().mockResolvedValue(response),
    runAuxiliary: vi.fn(),
    runSynthesis: vi.fn(),
  } as unknown as Runtime;
}

function mockRuntime(text: string): Runtime {
  return mockRuntimeResponse({
    result: {
      status: 'success',
      text,
      errors: [],
      usage: makeUsage(),
    },
  });
}

function mockRuntimeError(error: unknown): Runtime {
  return {
    name: 'claude',
    runSkill: vi.fn().mockRejectedValue(error),
    runAuxiliary: vi.fn(),
    runSynthesis: vi.fn(),
  } as unknown as Runtime;
}

function makeErrorResult(errors: string[]): SkillRunResponse {
  return {
    result: {
      status: 'provider_error',
      text: '',
      errors,
      usage: makeUsage(),
    },
  };
}

describe('verifyFindings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects findings when the verifier returns reject', async () => {
    const runtime = mockRuntime('{"verdict":"reject","reason":"guarded upstream"}');
    vi.mocked(getRuntime).mockReturnValue(runtime);
    const onFindingProcessing = vi.fn();

    const finding = makeFinding();
    const result = await verifyFindings([finding], {
      repoPath: '/repo',
      skill: makeSkill(),
      model: 'claude-haiku-4-5',
      prContext: {
        title: 'Fix guarded path',
        body: 'Adds a guard before the call.',
        changedFiles: ['src/app.ts', 'src/guard.ts'],
      },
      onFindingProcessing,
    });

    expect(result.findings).toEqual([]);
    expect(onFindingProcessing).toHaveBeenCalledWith({
      stage: 'verification',
      action: 'rejected',
      finding,
      reason: 'guarded upstream',
    });
    expect(result.usage).toEqual(expect.objectContaining(makeUsage()));
    expect(runtime.runSkill).toHaveBeenCalledWith(expect.objectContaining({
      repoPath: '/repo',
      skillName: 'test-skill:verification',
      options: expect.objectContaining({ model: 'claude-haiku-4-5' }),
      userPrompt: expect.stringContaining('<pull_request_context>'),
    }));
    expect(runtime.runSkill).toHaveBeenCalledWith(expect.objectContaining({
      userPrompt: expect.stringContaining('<candidate_finding>'),
    }));
    expect(runtime.runSkill).toHaveBeenCalledWith(expect.objectContaining({
      userPrompt: expect.stringContaining('- src/guard.ts'),
    }));
  });

  it('keeps the original id when revising a finding', async () => {
    const revised = makeFinding({
      id: 'DIFFERENT',
      severity: 'medium',
      confidence: 'medium',
      title: 'Narrower issue',
    });
    const runtime = mockRuntime(JSON.stringify({
      verdict: 'revise',
      finding: revised,
      reason: 'impact is narrower',
    }));
    vi.mocked(getRuntime).mockReturnValue(runtime);
    const onFindingProcessing = vi.fn();

    const finding = makeFinding();
    const result = await verifyFindings([finding], {
      repoPath: '/repo',
      skill: makeSkill(),
      onFindingProcessing,
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toEqual(expect.objectContaining({
      id: 'ABC-123',
      severity: 'medium',
      confidence: 'medium',
      title: 'Narrower issue',
    }));
    expect(onFindingProcessing).toHaveBeenCalledWith(expect.objectContaining({
      stage: 'verification',
      action: 'revised',
      finding,
      replacement: expect.objectContaining({ id: 'ABC-123', title: 'Narrower issue' }),
      reason: 'impact is narrower',
    }));
  });

  it('pins revised findings to the original validated anchor', async () => {
    const revised = makeFinding({
      id: 'DIFFERENT',
      severity: 'medium',
      title: 'Narrower issue',
      location: { path: 'src/other.ts', startLine: 99 },
      additionalLocations: [{ path: 'src/other.ts', startLine: 100 }],
      suggestedFix: {
        description: 'new fix',
        diff: 'diff --git a/src/other.ts b/src/other.ts',
      },
    });
    const runtime = mockRuntime(JSON.stringify({
      verdict: 'revise',
      finding: revised,
      reason: 'impact is narrower',
    }));
    vi.mocked(getRuntime).mockReturnValue(runtime);

    const finding = makeFinding({
      suggestedFix: {
        description: 'original fix',
        diff: 'diff --git a/src/app.ts b/src/app.ts',
      },
    });
    const result = await verifyFindings([finding], {
      repoPath: '/repo',
      skill: makeSkill(),
    });

    const verified = result.findings[0];
    expect(verified).toEqual(expect.objectContaining({
      id: 'ABC-123',
      severity: 'medium',
      title: 'Narrower issue',
      location: { path: 'src/app.ts', startLine: 10 },
      suggestedFix: {
        description: 'original fix',
        diff: 'diff --git a/src/app.ts b/src/app.ts',
      },
    }));
    expect(verified?.additionalLocations).toBeUndefined();
  });

  it('accepts verifier JSON when verdict is not the first key', async () => {
    const runtime = mockRuntime('{"reason":"guarded upstream","verdict":"reject"}');
    vi.mocked(getRuntime).mockReturnValue(runtime);

    const result = await verifyFindings([makeFinding()], {
      repoPath: '/repo',
      skill: makeSkill(),
    });

    expect(result.findings).toEqual([]);
  });

  it('accepts reject verdicts with a null finding', async () => {
    const runtime = mockRuntime(JSON.stringify({
      verdict: 'reject',
      finding: null,
      reason: 'guarded upstream',
    }));
    vi.mocked(getRuntime).mockReturnValue(runtime);

    const result = await verifyFindings([makeFinding()], {
      repoPath: '/repo',
      skill: makeSkill(),
    });

    expect(result.findings).toEqual([]);
  });

  it('keeps the original finding when verifier output is unusable', async () => {
    const finding = makeFinding();
    const runtime = mockRuntime('not json');
    vi.mocked(getRuntime).mockReturnValue(runtime);

    const result = await verifyFindings([finding], {
      repoPath: '/repo',
      skill: makeSkill(),
    });

    expect(result.findings).toEqual([finding]);
  });

  it('propagates authentication errors reported by the verifier runtime', async () => {
    vi.mocked(getRuntime).mockReturnValue(mockRuntimeResponse({ authError: 'login required' }));

    await expect(verifyFindings([makeFinding()], {
      repoPath: '/repo',
      skill: makeSkill(),
    })).rejects.toBeInstanceOf(WardenAuthenticationError);
  });

  it('propagates authentication errors thrown by the verifier runtime', async () => {
    vi.mocked(getRuntime).mockReturnValue(mockRuntimeError(new WardenAuthenticationError('bad key')));

    await expect(verifyFindings([makeFinding()], {
      repoPath: '/repo',
      skill: makeSkill(),
    })).rejects.toBeInstanceOf(WardenAuthenticationError);
  });

  it('propagates authentication errors returned in verifier result errors', async () => {
    vi.mocked(getRuntime).mockReturnValue(mockRuntimeResponse(makeErrorResult(['invalid api key'])));

    await expect(verifyFindings([makeFinding()], {
      repoPath: '/repo',
      skill: makeSkill(),
    })).rejects.toBeInstanceOf(WardenAuthenticationError);
  });
});
