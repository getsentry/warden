import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SkillDefinition } from '../config/schema.js';
import type { Finding, UsageStats } from '../types/index.js';
import { WardenAuthenticationError } from './errors.js';
import { verifyFindings } from './verify.js';
import { getRuntime, type Runtime, type SkillRunResponse } from './runtimes/index.js';
import { resolveSkillAsync } from '../skills/loader.js';

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
  it('lets the verifier correct recalled claims while keeping a real finding', async () => {
    const memory = { search: vi.fn().mockResolvedValue([{ id: 'old', version: 1, content: 'All routes check ownership.', paths: ['src/app.ts'] }]), update: vi.fn().mockResolvedValue({ status: 'saved' }) };
    const runtime = mockRuntime('{"verdict":"keep"}');
    vi.mocked(runtime.runSkill).mockImplementation(async (request) => {
      expect(request.systemPrompt).not.toContain('All routes check ownership.');
      expect(memory.search).not.toHaveBeenCalled();
      const found = await request.runtimeTools!.find((tool) => tool.name === 'find_memories')!.execute({ query: 'Which routes check ownership?' });
      expect(JSON.parse(found).memories).toEqual([expect.objectContaining({ id: 'old' })]);
      await request.runtimeTools!.find((tool) => tool.name === 'update_memory')!.execute({
        id: 'old', expectedVersion: 1, content: 'Only wrapped routes check ownership in src/app.ts.', paths: ['src/app.ts'], reason: 'This entrypoint bypasses the wrapper.',
      });
      return { result: { status: 'success', text: '{"verdict":"keep"}', errors: [], usage: makeUsage() } };
    });
    vi.mocked(getRuntime).mockReturnValue(runtime);
    const finding = makeFinding();
    expect((await verifyFindings([finding], { repoPath: '/repo', skill: makeSkill(), memory })).findings).toEqual([finding]);
    expect(memory.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'old', expectedVersion: 1, skill: 'test-skill' }));
  });
  it('persists a rejected claim and exact rationale even when the verifier writes no memory tools', async () => {
    const finding = makeFinding({ verification: 'decode() accepts an attacker-selected algorithm.' });
    const reason = 'loadKey() constructs an asymmetric key object; HS256 cannot use it. The claimed path is unreachable.';
    const memory = { search: vi.fn().mockResolvedValue([]), update: vi.fn(), recordJudgment: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(getRuntime).mockReturnValue(mockRuntime(JSON.stringify({ verdict: 'reject', reason })));
    const result = await verifyFindings([finding], { repoPath: '/repo', skill: makeSkill(), memory });
    expect(result.findings).toEqual([]);
    expect(memory.search).not.toHaveBeenCalled();
    expect(memory.recordJudgment).toHaveBeenCalledExactlyOnceWith({ skill: 'test-skill', judgment: {
      verdict: 'reject', candidate: expect.objectContaining({ ...finding }), reason, observedAt: expect.any(String),
    } });
    memory.recordJudgment.mockRejectedValue(new Error('storage unavailable'));
    expect((await verifyFindings([finding], { repoPath: '/repo', skill: makeSkill(), memory })).findings).toEqual([]);
  });

  it('links only provisional versions retrieved during this verification', async () => {
    const memory = { search: vi.fn().mockResolvedValue([
      { id: 'valid', version: 2, content: 'No guard found.', paths: ['src/app.ts'] },
      { id: 'stale', version: 3, content: 'Earlier investigation.', paths: ['src/app.ts'] },
      { id: 'judged', version: 1, content: 'Previously verified.', paths: ['src/app.ts'], verdict: 'keep' },
    ]), update: vi.fn(), recordJudgment: vi.fn().mockResolvedValue(undefined) };
    const runtime = mockRuntime('');
    vi.mocked(runtime.runSkill).mockImplementation(async (request) => {
      await request.runtimeTools!.find((tool) => tool.name === 'find_memories')!.execute({ query: 'Is this path guarded?' });
      return { result: { status: 'success', errors: [], usage: makeUsage(), text: JSON.stringify({
        verdict: 'reject', reason: 'The wrapper checks ownership.', supersedes: [
          { id: 'valid', version: 2 }, { id: 'stale', version: 2 }, { id: 'unseen', version: 1 }, { id: 'judged', version: 1 },
        ],
      }) } };
    });
    vi.mocked(getRuntime).mockReturnValue(runtime);
    expect((await verifyFindings([makeFinding()], { repoPath: '/repo', skill: makeSkill(), memory })).findings).toEqual([]);
    expect(memory.recordJudgment).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ supersedes: [{ id: 'valid', version: 2 }] }));
  });

  it('does not save an interrupted verification as a historical verdict', async () => {
    const memory = { search: vi.fn().mockResolvedValue([]), update: vi.fn(), recordJudgment: vi.fn() };
    vi.mocked(getRuntime).mockReturnValue(mockRuntimeResponse(makeErrorResult(['stream interrupted'])));
    const finding = makeFinding();
    expect((await verifyFindings([finding], { repoPath: '/repo', skill: makeSkill(), memory })).findings).toEqual([finding]);
    expect(memory.recordJudgment).not.toHaveBeenCalled();
  });

  it.each([
    { verdict: 'reject', supersedes: null },
    { verdict: 'revise', supersedes: [{ id: 'old', version: '1' }] },
  ])('applies $verdict even when memory supersession metadata is malformed', async ({ verdict, supersedes }) => {
    const finding = makeFinding();
    const revised = { ...finding, severity: 'low' as const, description: 'Only the unguarded route is affected.' };
    const memory = { search: vi.fn(), update: vi.fn(), recordJudgment: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(getRuntime).mockReturnValue(mockRuntime(JSON.stringify({
      verdict, supersedes, reason: 'Traced the current route guard.', ...(verdict === 'revise' ? { finding: revised } : {}),
    })));
    const result = await verifyFindings([finding], { repoPath: '/repo', skill: makeSkill(), memory });
    expect(result.findings).toEqual(verdict === 'reject' ? [] : [revised]);
    expect(memory.recordJudgment).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      judgment: expect.objectContaining({ verdict }),
    }));
    expect(memory.recordJudgment.mock.calls[0]?.[0]).not.toHaveProperty('supersedes');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('advertises built-in references and grants the verifier the same resolved skill root', async () => {
    const skill = await resolveSkillAsync('security-review', '/repo');
    const runtime = mockRuntime('{"verdict":"keep"}');
    vi.mocked(getRuntime).mockReturnValue(runtime);

    await verifyFindings([makeFinding()], { repoPath: '/repo', skill, runtime: 'pi' });

    expect(runtime.runSkill).toHaveBeenCalledWith(expect.objectContaining({
      repoPath: '/repo',
      skillRoot: skill.rootDir,
      systemPrompt: expect.stringContaining(`This skill is located at: ${skill.rootDir}`),
    }));
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
        repository: 'getsentry/sentry',
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
    expect(result.verifierRejections).toEqual({ count: 1, reasons: ['guarded upstream'] });
    expect(runtime.runSkill).toHaveBeenCalledWith(expect.objectContaining({
      repoPath: '/repo',
      skillName: 'test-skill:verification',
      options: expect.objectContaining({ model: 'claude-haiku-4-5' }),
      userPrompt: expect.stringContaining('<pull_request_context>'),
    }));
    expect(runtime.runSkill).toHaveBeenCalledWith(expect.objectContaining({
      systemPrompt: expect.stringContaining('public Evidence block'),
    }));
    expect(runtime.runSkill).toHaveBeenCalledWith(expect.objectContaining({
      systemPrompt: expect.stringContaining('Do not use checklist labels'),
    }));
    expect(runtime.runSkill).toHaveBeenCalledWith(expect.objectContaining({
      userPrompt: expect.stringContaining('<candidate_finding>'),
    }));
    expect(runtime.runSkill).toHaveBeenCalledWith(expect.objectContaining({
      userPrompt: expect.stringContaining('<repository>getsentry/sentry</repository>'),
    }));
    expect(runtime.runSkill).toHaveBeenCalledWith(expect.objectContaining({
      userPrompt: expect.stringContaining('- src/guard.ts'),
    }));
  });

  it('lists the finding\'s own file in changed_files', async () => {
    const runtime = mockRuntime('{"verdict":"keep"}');
    vi.mocked(getRuntime).mockReturnValue(runtime);

    await verifyFindings([makeFinding()], {
      repoPath: '/repo',
      skill: makeSkill(),
      prContext: {
        changedFiles: ['src/app.ts', 'src/guard.ts'],
      },
    });

    const { userPrompt } = vi.mocked(runtime.runSkill).mock.calls[0]![0];
    const changedFiles = userPrompt.match(/<changed_files>[\s\S]*?<\/changed_files>/)?.[0];
    expect(changedFiles).toContain('- src/app.ts');
    expect(changedFiles).toContain('- src/guard.ts');
  });

  it('keeps the finding\'s own file in changed_files when the list is truncated', async () => {
    const runtime = mockRuntime('{"verdict":"keep"}');
    vi.mocked(getRuntime).mockReturnValue(runtime);
    const otherFiles = Array.from({ length: 60 }, (_, i) => `src/other-${i}.ts`);

    await verifyFindings([makeFinding()], {
      repoPath: '/repo',
      skill: makeSkill(),
      prContext: {
        changedFiles: [...otherFiles, 'src/app.ts'],
      },
    });

    const { userPrompt } = vi.mocked(runtime.runSkill).mock.calls[0]![0];
    const changedFiles = userPrompt.match(/<changed_files>[\s\S]*?<\/changed_files>/)?.[0];
    expect(changedFiles).toContain('- src/app.ts');
    expect(changedFiles).toContain('- ... and 11 more');
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
    });
    const runtime = mockRuntime(JSON.stringify({
      verdict: 'revise',
      finding: revised,
      reason: 'impact is narrower',
    }));
    vi.mocked(getRuntime).mockReturnValue(runtime);

    const finding = makeFinding({});
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

  it('keeps candidate findings when verification is already aborted', async () => {
    const runtime = mockRuntime('{"verdict":"keep"}');
    vi.mocked(getRuntime).mockReturnValue(runtime);
    const abortController = new AbortController();
    abortController.abort();
    const onFindingProcessing = vi.fn();
    const finding = makeFinding();

    const result = await verifyFindings([finding], {
      repoPath: '/repo',
      skill: makeSkill(),
      abortController,
      onFindingProcessing,
    });

    expect(result.findings).toEqual([finding]);
    expect(runtime.runSkill).not.toHaveBeenCalled();
    expect(onFindingProcessing).not.toHaveBeenCalled();
  });

  it('keeps candidate findings when verification aborts before verdict', async () => {
    const abortController = new AbortController();
    const runtime: Runtime = {
      name: 'claude',
      runSkill: vi.fn(async () => {
        abortController.abort();
        throw new Error('aborted');
      }),
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
    } as unknown as Runtime;
    vi.mocked(getRuntime).mockReturnValue(runtime);
    const onFindingProcessing = vi.fn();
    const finding = makeFinding();

    const result = await verifyFindings([finding], {
      repoPath: '/repo',
      skill: makeSkill(),
      abortController,
      onFindingProcessing,
    });

    expect(result.findings).toEqual([finding]);
    expect(onFindingProcessing).not.toHaveBeenCalled();
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
    })).rejects.toThrow('invalid api key');
  });

  it('verifies multiple findings concurrently', async () => {
    let active = 0;
    let maxActive = 0;
    const runtime: Runtime = {
      name: 'claude',
      runSkill: vi.fn(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return {
          result: {
            status: 'success',
            text: '{"verdict":"keep"}',
            errors: [],
            usage: makeUsage(),
          },
        };
      }),
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
    } as unknown as Runtime;
    vi.mocked(getRuntime).mockReturnValue(runtime);

    const findings = Array.from({ length: 6 }, (_, index) => makeFinding({ id: `ABC-${index}` }));
    const result = await verifyFindings(findings, {
      repoPath: '/repo',
      skill: makeSkill(),
    });

    expect(result.findings.map((finding) => finding.id)).toEqual(findings.map((finding) => finding.id));
    expect(runtime.runSkill).toHaveBeenCalledTimes(6);
    expect(maxActive).toBeGreaterThan(1);
    expect(maxActive).toBeLessThanOrEqual(4);
  });

  it('passes skill tool configuration to the verifier runtime', async () => {
    const runtime = mockRuntime('{"verdict":"keep"}');
    vi.mocked(getRuntime).mockReturnValue(runtime);

    await verifyFindings([makeFinding()], {
      repoPath: '/repo',
      skill: {
        ...makeSkill(),
        tools: { allowed: ['Read', 'Grep', 'WebFetch'] },
      },
    });

    expect(runtime.runSkill).toHaveBeenCalledWith(expect.objectContaining({
      tools: { allowed: ['Read', 'Grep', 'WebFetch'] },
    }));
  });

  it('omits verifierRejections when nothing is rejected', async () => {
    const runtime = mockRuntime('{"verdict":"keep"}');
    vi.mocked(getRuntime).mockReturnValue(runtime);

    const result = await verifyFindings([makeFinding()], {
      repoPath: '/repo',
      skill: makeSkill(),
    });

    expect(result.verifierRejections).toBeUndefined();
  });

  it('falls back to a default reason when the verifier rejects without one', async () => {
    const runtime = mockRuntime('{"verdict":"reject"}');
    vi.mocked(getRuntime).mockReturnValue(runtime);

    const result = await verifyFindings([makeFinding()], {
      repoPath: '/repo',
      skill: makeSkill(),
    });

    expect(result.verifierRejections).toEqual({ count: 1, reasons: ['No reason provided'] });
  });

  it('aggregates rejections across multiple findings', async () => {
    const runtime: Runtime = {
      name: 'claude',
      runSkill: vi.fn()
        .mockResolvedValueOnce({
          result: { status: 'success', text: '{"verdict":"reject","reason":"first"}', errors: [], usage: makeUsage() },
        })
        .mockResolvedValueOnce({
          result: { status: 'success', text: '{"verdict":"keep"}', errors: [], usage: makeUsage() },
        })
        .mockResolvedValueOnce({
          result: { status: 'success', text: '{"verdict":"reject","reason":"second"}', errors: [], usage: makeUsage() },
        }),
      runAuxiliary: vi.fn(),
      runSynthesis: vi.fn(),
    } as unknown as Runtime;
    vi.mocked(getRuntime).mockReturnValue(runtime);

    const findings = [makeFinding({ id: 'A' }), makeFinding({ id: 'B' }), makeFinding({ id: 'C' })];
    const result = await verifyFindings(findings, {
      repoPath: '/repo',
      skill: makeSkill(),
    });

    expect(result.findings).toHaveLength(1);
    expect(result.verifierRejections).toEqual({ count: 2, reasons: ['first', 'second'] });
  });
});
