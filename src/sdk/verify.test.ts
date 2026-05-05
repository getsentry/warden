import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SkillDefinition } from '../config/schema.js';
import type { Finding, UsageStats } from '../types/index.js';
import { verifyFindings } from './verify.js';
import { getRuntime, type Runtime } from './runtimes/index.js';

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

function mockRuntime(text: string): Runtime {
  return {
    name: 'claude',
    runSkill: vi.fn().mockResolvedValue({
      result: {
        status: 'success',
        text,
        errors: [],
        usage: makeUsage(),
      },
    }),
    runAuxiliary: vi.fn(),
    runSynthesis: vi.fn(),
  } as unknown as Runtime;
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

  it('accepts verifier JSON when verdict is not the first key', async () => {
    const runtime = mockRuntime('{"reason":"guarded upstream","verdict":"reject"}');
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
});
