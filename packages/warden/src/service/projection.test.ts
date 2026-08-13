import { describe, expect, it, vi } from 'vitest';
import type { SkillReport } from '../types/index.js';
import { publishRunFailOpen, recallMemoryFailOpen } from './client.js';
import type { BuildServiceRunProjectionInput } from './projection.js';
import { buildServiceRunEnvelope } from './projection.js';

const report: SkillReport = {
  skill: 'security',
  summary: 'One issue found',
  findings: [{
    id: 'finding-1',
    severity: 'high',
    confidence: 'high',
    title: 'Unsafe interpolation',
    description: 'A value reaches a query without parameterization.',
    location: { path: 'src/query.ts', startLine: 10 },
    sourceSnippet: {
      path: 'src/query.ts',
      language: 'typescript',
      startLine: 9,
      endLine: 11,
      targetStartLine: 10,
      targetEndLine: 10,
      lines: [{ line: 10, content: 'db.query(`SELECT ${value}`)', highlighted: true }],
    },
  }],
  model: 'example-model',
  runtime: 'claude-code',
  durationMs: 1_200,
  usage: { inputTokens: 100, outputTokens: 20, costUSD: 0.01 },
  auxiliaryUsage: {
    verification: { inputTokens: 30, outputTokens: 5, costUSD: 0.002 },
  },
  auxiliaryUsageAttribution: {
    verification: { model: 'verifier-model', runtime: 'verifier-runtime' },
  },
};

function input(data: 'metrics' | 'findings' | 'code'): BuildServiceRunProjectionInput {
  return {
    service: { data, memory: data !== 'metrics' },
    clientRunId: 'run-123',
    source: 'sdk',
    wardenVersion: '1.2.3',
    startedAt: new Date('2026-08-12T10:00:00.000Z'),
    completedAt: new Date('2026-08-12T10:00:03.000Z'),
    outcome: 'success',
    repository: { provider: 'github', owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
    reports: [{ executionId: 'skill-1', report }],
  };
}

describe('buildServiceRunEnvelope', () => {
  it('maps scan and auxiliary usage to independently attributed lanes', () => {
    const envelope = buildServiceRunEnvelope(input('metrics'));

    expect(envelope.skills[0]?.usage).toEqual([
      expect.objectContaining({ lane: 'scan', model: 'example-model', runtime: 'claude-code', costUsd: 0.01 }),
      expect.objectContaining({ lane: 'verification', model: 'verifier-model', runtime: 'verifier-runtime', costUsd: 0.002 }),
    ]);
    expect(envelope.findingCounts.total).toBe(1);
  });

  it('redacts finding and code data at the final pre-fetch boundary', () => {
    const metrics = JSON.stringify(buildServiceRunEnvelope(input('metrics')));
    const findings = JSON.stringify(buildServiceRunEnvelope(input('findings')));
    const code = JSON.stringify(buildServiceRunEnvelope(input('code')));

    expect(metrics).not.toContain('Unsafe interpolation');
    expect(metrics).not.toContain('src/query.ts');
    expect(findings).toContain('Unsafe interpolation');
    expect(findings).not.toContain('SELECT');
    expect(code).toContain('SELECT');
    for (const serialized of [metrics, findings, code]) {
      expect(serialized).not.toContain('summary');
      expect(serialized).not.toContain('traces');
      expect(serialized).not.toContain('prompt');
      expect(serialized).not.toContain('transcript');
      expect(serialized).not.toContain('tools');
      expect(serialized).not.toContain('diff');
    }
  });
});

describe('publishRunFailOpen', () => {
  it('serializes only the redacted envelope and does not expose failures', async () => {
    const envelope = buildServiceRunEnvelope(input('metrics'));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      protocolVersion: 1,
      runId: 'stored-run',
      checksum: 'a'.repeat(64),
      created: true,
    }));
    const warning = vi.fn();

    await expect(publishRunFailOpen({
      url: 'https://warden.example.com',
      token: 'service-secret',
      data: 'metrics',
      memory: false,
      timeoutMs: 1_000,
    }, envelope, warning)).resolves.toBe(true);

    const body = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(body).not.toContain('Unsafe interpolation');
    expect(body).not.toContain('src/query.ts');
    expect(body).not.toContain('service-secret');
    expect(warning).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('returns false with a content-safe warning on network failure', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('token=private response body'));
    const warning = vi.fn();

    await expect(publishRunFailOpen({
      url: 'https://warden.example.com',
      token: 'service-secret',
      data: 'metrics',
      memory: false,
      timeoutMs: 50,
    }, buildServiceRunEnvelope(input('metrics')), warning)).resolves.toBe(false);
    expect(warning).toHaveBeenCalledOnce();
    expect(warning.mock.calls[0]?.[0]).not.toContain('private');
    expect(warning.mock.calls[0]?.[0]).not.toContain('service-secret');
    fetchMock.mockRestore();
  });

  it('returns false when deferred envelope construction fails', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const warning = vi.fn();

    await expect(publishRunFailOpen({
      url: 'https://warden.example.com',
      token: 'service-secret',
      data: 'findings',
      memory: false,
      timeoutMs: 50,
    }, {
      clientRunId: 'run-oversized',
      build() {
        throw new Error('private finding content');
      },
    }, warning)).resolves.toBe(false);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(
      'Warden service could not publish run run-oversized. Local results are unchanged.',
    );
  });
});

describe('recallMemoryFailOpen', () => {
  const service = {
    url: 'https://warden.example.com',
    token: 'service-secret',
    data: 'findings' as const,
    memory: true,
    timeoutMs: 50,
  };

  it('returns admitted memory from one bounded request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      protocolVersion: 1,
      clientRecallId: 'recall-123',
      memories: [{
        id: 'memory-1',
        version: 2,
        kind: 'convention',
        content: 'Use the shared query builder.',
      }],
    }));

    await expect(recallMemoryFailOpen(service, {
      protocolVersion: 1,
      clientRecallId: 'recall-123',
      repository: { provider: 'github', owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
      skills: ['security'],
      languages: ['typescript'],
      paths: ['src/query.ts'],
    })).resolves.toEqual(expect.objectContaining({
      clientRecallId: 'recall-123',
      memories: [expect.objectContaining({ id: 'memory-1', version: 2 })],
    }));
    expect(fetchMock).toHaveBeenCalledOnce();
    fetchMock.mockRestore();
  });

  it('returns no memory when recall fails or returns malformed data', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      content: 'untrusted response body',
    }));

    await expect(recallMemoryFailOpen(service, {
      protocolVersion: 1,
      clientRecallId: 'recall-456',
      repository: { provider: 'github', owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
      skills: ['security'],
      languages: [],
      paths: [],
    })).resolves.toBeUndefined();
    fetchMock.mockRestore();
  });
});
