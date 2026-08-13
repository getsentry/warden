import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SkillDefinition } from '../config/schema.js';
import type { EventContext, Finding, SkillReport } from '../types/index.js';
import { buildLocalEventContext } from '../cli/context.js';
import { resolveSkillAsync } from '../skills/loader.js';
import { runSkill } from './analyze.js';
import { SkillRunnerError } from './errors.js';
import { verifyFindings } from './verify.js';
import { runLocalSkill, verifyLocalFindings } from './local.js';

vi.mock('../cli/context.js', () => ({
  buildLocalEventContext: vi.fn(),
}));

vi.mock('../skills/loader.js', () => ({
  resolveSkillAsync: vi.fn(),
}));

vi.mock('./analyze.js', () => ({
  runSkill: vi.fn(),
}));

vi.mock('./verify.js', () => ({
  verifyFindings: vi.fn(),
}));

const skill: SkillDefinition = {
  name: 'security-review',
  description: 'Find security issues',
  prompt: 'Review the diff.',
};

const context: EventContext = {
  eventType: 'pull_request',
  action: 'opened',
  repository: { owner: 'getsentry', name: 'warden', fullName: 'getsentry/warden', defaultBranch: 'main' },
  repoPath: '/tmp/repo',
  pullRequest: {
    number: 1,
    title: 'Test PR',
    body: '',
    author: 'dev',
    baseBranch: 'main',
    headBranch: 'feature',
    headSha: 'abc1234',
    baseSha: 'def456',
    files: [],
  },
};

const report: SkillReport = {
  skill: 'security-review',
  summary: 'No findings.',
  findings: [],
  usage: {
    inputTokens: 0,
    outputTokens: 0,
    costUSD: 0,
  },
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('local SDK entrypoints', () => {
  it('runs a resolved skill against a local diff', async () => {
    vi.mocked(buildLocalEventContext).mockReturnValue(context);
    vi.mocked(resolveSkillAsync).mockResolvedValue(skill);
    vi.mocked(runSkill).mockResolvedValue(report);

    const callbacks = {};
    const result = await runLocalSkill({
      skillPath: '.warden/skills/security-review',
      cwd: '/tmp/repo',
      base: 'main',
      head: 'eval',
      defaultBranch: 'main',
      apiKey: 'test-key',
      model: 'claude-sonnet-4-6',
      runtime: 'claude',
      parallel: false,
      maxTurns: 7,
      callbacks,
    });

    expect(buildLocalEventContext).toHaveBeenCalledWith(expect.objectContaining({
      cwd: '/tmp/repo',
      base: 'main',
      head: 'eval',
      defaultBranch: 'main',
    }));
    expect(resolveSkillAsync).toHaveBeenCalledWith('.warden/skills/security-review', '/tmp/repo');
    expect(runSkill).toHaveBeenCalledWith(skill, context, expect.objectContaining({
      apiKey: 'test-key',
      model: 'claude-sonnet-4-6',
      runtime: 'claude',
      parallel: false,
      maxTurns: 7,
      callbacks,
    }));
    expect(result).toEqual({ skill, context, report });
  });

  it('returns the unchanged SDK result when final service publication fails', async () => {
    vi.mocked(buildLocalEventContext).mockReturnValue(context);
    vi.mocked(resolveSkillAsync).mockResolvedValue(skill);
    vi.mocked(runSkill).mockResolvedValue(report);
    const warning = vi.fn();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ responseBody: 'not the service schema' }),
    );

    const result = await runLocalSkill({
      skillPath: '.warden/skills/security-review',
      cwd: '/tmp/repo',
      base: 'main',
      head: 'eval',
      service: {
        url: 'https://warden.example.com',
        token: 'service-token',
        data: 'metrics',
        timeoutMs: 100,
        onWarning: warning,
      },
    });

    expect(result).toEqual({ skill, context, report });
    expect(result.report).toBe(report);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('Local results are unchanged'));
  });

  it('publishes findings after bounding oversized service fields', async () => {
    const oversizedReport: SkillReport = {
      ...report,
      findings: [{
        id: 'finding-oversized',
        severity: 'high',
        title: 'Oversized service finding',
        description: 'x'.repeat(20_000),
      }],
    };
    vi.mocked(buildLocalEventContext).mockReturnValue(context);
    vi.mocked(resolveSkillAsync).mockResolvedValue(skill);
    vi.mocked(runSkill).mockResolvedValue(oversizedReport);
    const warning = vi.fn();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      protocolVersion: 1,
      runId: 'stored-run',
      checksum: 'a'.repeat(64),
      created: true,
    }));

    const result = await runLocalSkill({
      skillPath: '.warden/skills/security-review',
      cwd: '/tmp/repo',
      base: 'main',
      head: 'eval',
      service: {
        url: 'https://warden.example.com',
        token: 'service-token',
        data: 'findings',
        memory: false,
        timeoutMs: 100,
        onWarning: warning,
      },
    });

    expect(result).toEqual({ skill, context, report: oversizedReport });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, request] = fetchMock.mock.calls[0] ?? [];
    const envelope = JSON.parse(String(request?.body)) as {
      findings: { description: string }[];
    };
    expect(envelope.findings[0]?.description).toHaveLength(8_000);
    expect(warning).not.toHaveBeenCalled();
  });

  it('appends recalled memory to caller-provided historical evidence', async () => {
    vi.mocked(buildLocalEventContext).mockReturnValue(context);
    vi.mocked(resolveSkillAsync).mockResolvedValue(skill);
    vi.mocked(runSkill).mockResolvedValue(report);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, request) => {
      const body = JSON.parse(String(request?.body)) as { clientRecallId?: string };
      if (String(url).endsWith('/api/v1/memory/recall')) {
        return Response.json({
          protocolVersion: 1,
          clientRecallId: body.clientRecallId,
          memories: [{
            id: 'memory-1',
            version: 1,
            kind: 'convention',
            content: 'Use the shared query builder.',
          }],
        });
      }
      return Response.json({
        protocolVersion: 1,
        runId: 'stored-run',
        checksum: 'a'.repeat(64),
        created: true,
      });
    });

    await runLocalSkill({
      skillPath: '.warden/skills/security-review',
      cwd: '/tmp/repo',
      base: 'main',
      head: 'eval',
      historicalEvidence: '<caller_evidence>Keep public APIs stable.</caller_evidence>',
      service: {
        url: 'https://warden.example.com',
        token: 'service-token',
        data: 'findings',
        memory: true,
        timeoutMs: 100,
      },
    });

    const runnerOptions = vi.mocked(runSkill).mock.calls[0]?.[2];
    expect(runnerOptions?.historicalEvidence).toContain('Keep public APIs stable.');
    expect(runnerOptions?.historicalEvidence).toContain('Use the shared query builder.');
  });

  it('publishes a metrics-only failure before rethrowing a failed SDK run', async () => {
    vi.mocked(buildLocalEventContext).mockReturnValue(context);
    vi.mocked(resolveSkillAsync).mockResolvedValue(skill);
    vi.mocked(runSkill).mockRejectedValue(new SkillRunnerError('analysis failed', {
      code: 'all_hunks_failed',
    }));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      protocolVersion: 1,
      runId: 'stored-run',
      checksum: 'a'.repeat(64),
      created: true,
    }));

    await expect(runLocalSkill({
      skillPath: '.warden/skills/security-review',
      cwd: '/tmp/repo',
      base: 'main',
      head: 'eval',
      service: {
        url: 'https://warden.example.com',
        token: 'service-token',
        data: 'findings',
        memory: false,
        timeoutMs: 100,
      },
    })).rejects.toThrow('analysis failed');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      source: 'sdk',
      dataProfile: 'metrics',
      outcome: 'failure',
      skills: [{ skill: 'security-review', status: 'failure', errorCode: 'all_hunks_failed' }],
    });
  });

  it('verifies findings with a resolved skill', async () => {
    const findings: Finding[] = [{
      id: 'finding-1',
      title: 'Unsafe input',
      description: 'User input reaches a sink.',
      severity: 'high',
      location: { path: 'src/app.ts', startLine: 10 },
    }];
    vi.mocked(resolveSkillAsync).mockResolvedValue(skill);
    vi.mocked(verifyFindings).mockResolvedValue({ findings });

    const result = await verifyLocalFindings({
      findings,
      skillPath: '.warden/skills/security-review',
      repoPath: '/tmp/repo',
      apiKey: 'test-key',
      runtime: 'pi',
      model: 'anthropic/claude-sonnet-4-6',
    });

    expect(resolveSkillAsync).toHaveBeenCalledWith('.warden/skills/security-review', '/tmp/repo');
    expect(verifyFindings).toHaveBeenCalledWith(findings, expect.objectContaining({
      repoPath: '/tmp/repo',
      skill,
      apiKey: 'test-key',
      runtime: 'pi',
      model: 'anthropic/claude-sonnet-4-6',
    }));
    expect(result).toEqual({ skill, findings });
  });
});
