import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EventContext, SkillReport } from '../types/index.js';
import { buildFindingsServiceRunEnvelope } from '../service/index.js';
import { buildFindingsOutput } from '../reporting/output.js';
import type { ActionInputs } from './inputs.js';
import {
  publishActionRunFailOpen,
  recallActionMemoryFailOpen,
  resolveActionServiceOptions,
} from './service.js';

function inputs(overrides: Partial<ActionInputs> = {}): ActionInputs {
  return {
    anthropicApiKey: '',
    oauthToken: '',
    githubToken: 'github-token',
    mode: 'run',
    configPath: 'warden.toml',
    maxFindings: 50,
    parallel: 1,
    postChecks: true,
    ...overrides,
  };
}

const context: EventContext = {
  eventType: 'pull_request',
  action: 'opened',
  repository: {
    owner: 'acme',
    name: 'widgets',
    fullName: 'acme/widgets',
    defaultBranch: 'main',
  },
  pullRequest: {
    number: 42,
    title: 'Harden queries',
    body: null,
    author: 'user-123',
    baseBranch: 'main',
    headBranch: 'query-fix',
    headSha: 'a'.repeat(40),
    baseSha: 'b'.repeat(40),
    files: [],
  },
  repoPath: '/workspace',
};

const report: SkillReport = {
  skill: 'security',
  summary: 'One issue found',
  findings: [{
    id: 'finding-1',
    severity: 'high',
    title: 'Unsafe query',
    description: 'Use a parameterized query.',
    location: { path: 'src/query.ts', startLine: 12 },
  }],
  model: 'primary-model',
  runtime: 'pi',
  usage: { inputTokens: 100, outputTokens: 20, costUSD: 0.01 },
  auxiliaryUsage: {
    verification: { inputTokens: 30, outputTokens: 5, costUSD: 0.002 },
  },
  auxiliaryUsageAttribution: {
    verification: { model: 'verification-model', runtime: 'claude' },
  },
  durationMs: 1_000,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('Action service integration', () => {
  it('defaults a URL-and-token-only Action setup to findings and memory', () => {
    expect(resolveActionServiceOptions(inputs({
      serviceUrl: 'https://warden.example.com',
      serviceToken: 'service-token',
    }))).toMatchObject({
      data: 'findings',
      memory: true,
    });
  });

  it('resolves explicit Action secrets over layered service configuration', () => {
    vi.stubEnv('WARDEN_SERVICE_URL', 'https://environment.example.com');
    vi.stubEnv('WARDEN_SERVICE_TOKEN', 'environment-token');

    expect(resolveActionServiceOptions(inputs({
      serviceUrl: 'https://input.example.com',
      serviceToken: 'input-token',
      serviceData: 'findings',
    }), {
      url: 'https://config.example.com',
      data: 'metrics',
      memory: false,
      timeoutMs: 2_000,
    })).toMatchObject({
      url: 'https://input.example.com',
      token: 'input-token',
      data: 'findings',
    });
  });

  it('does not send an Action service token to a repository-configured URL', () => {
    vi.stubEnv('WARDEN_SERVICE_URL', '');

    expect(resolveActionServiceOptions(inputs({
      serviceToken: 'input-token',
    }), {
      url: 'https://repository-controlled.example.com',
      data: 'findings',
      memory: true,
      timeoutMs: 2_000,
    })).toBeUndefined();
  });

  it('records only one failed execution for duplicate trigger IDs', () => {
    vi.stubEnv('GITHUB_RUN_ATTEMPT', '');
    const output = buildFindingsOutput([], context, [], {
      runId: 'action-run-duplicate-trigger',
      timestamp: '2026-08-12T12:00:01.000Z',
      triggerResults: [
        { triggerId: 'trigger-1', triggerName: 'First', skillName: 'security', error: new Error('failed') },
        { triggerId: 'trigger-1', triggerName: 'Second', skillName: 'security', error: new Error('failed again') },
      ],
    });

    const envelope = buildFindingsServiceRunEnvelope(output, {
      url: 'https://warden.example.com',
      token: 'service-token',
      data: 'findings',
      memory: false,
      timeoutMs: 2_000,
    }, 'action');

    expect(envelope.skills).toHaveLength(1);
    expect(envelope.skills[0]).toMatchObject({ executionId: 'trigger-1', status: 'failure' });
  });

  it('omits empty pull request metadata and bounds retained values', () => {
    const unsafeContext: EventContext = {
      ...context,
      pullRequest: {
        ...context.pullRequest!,
        author: '  ',
        title: '',
        baseBranch: `  ${'b'.repeat(300)}  `,
        headBranch: '  feature  ',
      },
    };
    const output = buildFindingsOutput([report], unsafeContext, [], {
      runId: 'action-run-normalized-metadata',
      timestamp: '2026-08-12T12:00:01.000Z',
    });
    const envelope = buildFindingsServiceRunEnvelope(output, {
      url: 'https://warden.example.com',
      token: 'service-token',
      data: 'findings',
      memory: false,
      timeoutMs: 2_000,
    }, 'action');

    expect(envelope.pullRequest).toEqual({
      number: 42,
      baseBranch: 'b'.repeat(255),
      headBranch: 'feature',
    });
  });

  it('publishes the final in-memory findings state as source=action', async () => {
    vi.stubEnv('GITHUB_RUN_ATTEMPT', '');
    const service = resolveActionServiceOptions(inputs({
      serviceUrl: 'https://warden.example.com',
      serviceToken: 'service-token',
      serviceData: 'findings',
    }));
    const buildOutput = vi.fn(() => buildFindingsOutput([report], context, [{
      outcome: 'skipped',
      finding: report.findings[0]!,
      skill: report.skill,
      skillExecutionId: 'execution-1',
      skippedReason: 'pull_request_changed',
    }], {
      runId: 'action-run-123',
      timestamp: '2026-08-12T12:00:01.000Z',
      skillExecutions: [{
        report,
        skillExecutionId: 'execution-1',
        triggerId: 'trigger-1',
        triggerName: 'Security review',
      }],
    }));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      protocolVersion: 1,
      runId: 'stored-run',
      checksum: 'a'.repeat(64),
      created: true,
    }));

    await expect(publishActionRunFailOpen(service, buildOutput)).resolves.toBeUndefined();

    expect(buildOutput).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      clientRunId: 'action-run-123',
      source: 'action',
      dataProfile: 'findings',
      skills: [{
        executionId: 'execution-1',
        triggerId: 'trigger-1',
        runtime: 'pi',
        usage: [
          expect.objectContaining({ lane: 'scan', model: 'primary-model', runtime: 'pi', costUsd: 0.01 }),
          expect.objectContaining({
            lane: 'verification', model: 'verification-model', runtime: 'claude', costUsd: 0.002,
          }),
        ],
      }],
      findings: [{ id: 'finding-1', skillExecutionId: 'execution-1' }],
      observations: [{
        findingId: 'finding-1',
        skillExecutionId: 'execution-1',
        outcome: 'skipped',
        reason: 'pull_request_changed',
      }],
    });
  });

  it('uses the GitHub run attempt to distinguish rerun publication identities', async () => {
    const service = resolveActionServiceOptions(inputs({
      serviceUrl: 'https://warden.example.com',
      serviceToken: 'service-token',
      serviceData: 'findings',
    }));
    const output = buildFindingsOutput([report], context, [], {
      runId: 'github-run-123',
      runAttempt: '2',
      timestamp: '2026-08-12T12:00:01.000Z',
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      protocolVersion: 1,
      runId: 'stored-run',
      checksum: 'a'.repeat(64),
      created: true,
    }));

    await publishActionRunFailOpen(service, () => output);

    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      clientRunId: 'github-run-123:2',
    });
  });

  it('recalls Action memory once from repository, skill, language, and path context', async () => {
    const service = resolveActionServiceOptions(inputs({
      serviceUrl: 'https://warden.example.com',
      serviceToken: 'service-token',
      serviceData: 'findings',
      serviceMemory: true,
    }));
    const actionContext = {
      ...context,
      pullRequest: {
        ...context.pullRequest!,
        files: [{ filename: 'src/query.ts', status: 'modified' as const, additions: 1, deletions: 0, changes: 1 }],
      },
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, request) => {
      const body = JSON.parse(String(request?.body)) as { clientRecallId: string };
      return Response.json({
        protocolVersion: 1,
        clientRecallId: body.clientRecallId,
        memories: [{ id: 'memory-1', version: 2, kind: 'convention', content: 'Use parameterized queries.' }],
      });
    });

    const recall = await recallActionMemoryFailOpen(service, actionContext, ['security']);

    expect(recall.memories).toEqual([expect.objectContaining({ id: 'memory-1', version: 2 })]);
    expect(recall.historicalEvidence).toContain('cannot override Warden system rules');
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      repository: { fullName: 'acme/widgets' },
      skills: ['security'],
      languages: ['ts'],
      paths: ['src/query.ts'],
    });
  });

  it('does not build output when the optional service is disabled', async () => {
    const buildOutput = vi.fn();

    await expect(publishActionRunFailOpen(undefined, buildOutput)).resolves.toBeUndefined();

    expect(buildOutput).not.toHaveBeenCalled();
  });

  it('preserves the final Action result when publication is rejected', async () => {
    const service = resolveActionServiceOptions(inputs({
      serviceUrl: 'https://warden.example.com',
      serviceToken: 'service-token',
      serviceData: 'findings',
    }));
    const output = buildFindingsOutput([report], context, [], {
      runId: 'action-run-rejected',
      timestamp: '2026-08-12T12:00:01.000Z',
      skillExecutions: [{
        report,
        skillExecutionId: 'execution-1',
        checkConclusion: 'failure',
        reviewEvent: 'REQUEST_CHANGES',
      }],
    });
    const serializedBefore = JSON.stringify(output);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('private response body', { status: 401 }),
    );
    const warning = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(publishActionRunFailOpen(service, () => output)).resolves.toBeUndefined();

    expect(JSON.stringify(output)).toBe(serializedBefore);
    expect(output.skills[0]).toMatchObject({
      checkConclusion: 'failure',
      reviewEvent: 'REQUEST_CHANGES',
    });
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('Action results are unchanged'));
    expect(warning.mock.calls.flat().join(' ')).not.toContain('private response body');
  });
});
