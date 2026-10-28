import { describe, expect, it, vi } from 'vitest';
import { createWardenServiceClient, ServiceClientError } from './client.js';
import type { MetricsRunEnvelope } from './protocol.js';

const envelope: MetricsRunEnvelope = {
  protocolVersion: 1,
  clientRunId: 'run-123',
  source: 'sdk',
  wardenVersion: '1.2.3',
  dataProfile: 'metrics',
  startedAt: '2026-08-12T10:00:00.000Z',
  completedAt: '2026-08-12T10:00:03.000Z',
  outcome: 'success',
  repository: {
    provider: 'github',
    owner: 'acme',
    name: 'widgets',
    fullName: 'acme/widgets',
  },
  features: { memory: false },
  findingCounts: {
    total: 0,
    bySeverity: { high: 0, medium: 0, low: 0 },
  },
  skills: [],
};

const ingestResponse = {
  protocolVersion: 1,
  runId: 'stored-run-123',
  checksum: 'a'.repeat(64),
  created: true,
};

describe('createWardenServiceClient', () => {
  it('publishes with authentication, idempotency, checksum, and no-store headers', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json(ingestResponse));
    const client = createWardenServiceClient({
      baseUrl: 'https://warden.example.com',
      token: 'secret-token',
      fetch: fetchMock,
    });

    await expect(client.publishRun(envelope)).resolves.toEqual(ingestResponse);
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://warden.example.com/api/v1/runs');
    expect(init?.headers).toMatchObject({
      authorization: 'Bearer secret-token',
      'cache-control': 'no-store',
      'idempotency-key': 'run-123',
      'warden-envelope-checksum': expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(JSON.parse(String(init?.body))).toEqual(envelope);
  });

  it('performs one bounded retry for a retryable status', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('private failure body', { status: 503 }))
      .mockResolvedValueOnce(Response.json(ingestResponse));
    const client = createWardenServiceClient({
      baseUrl: 'https://warden.example.com',
      token: 'secret-token',
      fetch: fetchMock,
    });

    await expect(client.publishRun(envelope)).resolves.toEqual(ingestResponse);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([401, 409])('returns an allowlisted HTTP %s error without exposing response content', async (status) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('token=do-not-log finding=private', { status }),
    );
    const client = createWardenServiceClient({
      baseUrl: 'https://warden.example.com',
      token: 'secret-token',
      fetch: fetchMock,
    });

    const error = await client.publishRun(envelope).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ServiceClientError);
    expect(error).toMatchObject({ kind: 'http', status, runId: 'run-123' });
    expect(String(error)).not.toContain('do-not-log');
    expect(String(error)).not.toContain('private');
  });

  it.each([429, 500])('bounds retries when HTTP %s remains unavailable', async (status) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('private retry body', { status }),
    );
    const client = createWardenServiceClient({
      baseUrl: 'https://warden.example.com',
      token: 'secret-token',
      fetch: fetchMock,
    });

    await expect(client.publishRun(envelope)).rejects.toMatchObject({ kind: 'http', status });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('classifies DNS and network failures after one bounded retry', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('getaddrinfo ENOTFOUND private-host'));
    const client = createWardenServiceClient({
      baseUrl: 'https://warden.example.com',
      token: 'secret-token',
      fetch: fetchMock,
    });

    await expect(client.publishRun(envelope)).rejects.toMatchObject({ kind: 'network' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('classifies malformed success responses without returning response content', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ secret: 'private' }));
    const client = createWardenServiceClient({
      baseUrl: 'https://warden.example.com',
      token: 'secret-token',
      fetch: fetchMock,
    });

    await expect(client.publishRun(envelope)).rejects.toMatchObject({
      kind: 'invalid_response',
      status: 200,
    });
  });

  it('uses one total timeout across attempts', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('request body must stay private', 'AbortError'));
      });
    }));
    const client = createWardenServiceClient({
      baseUrl: 'https://warden.example.com',
      token: 'secret-token',
      timeoutMs: 10,
      fetch: fetchMock,
    });

    await expect(client.publishRun(envelope)).rejects.toMatchObject({ kind: 'timeout' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('recalls memory through the versioned endpoint', async () => {
    const response = {
      protocolVersion: 1,
      clientRecallId: 'recall-123',
      memories: [{
        id: 'memory-1',
        version: 2,
        kind: 'convention',
        content: 'Use parameterized queries.',
      }],
    };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json(response));
    const client = createWardenServiceClient({
      baseUrl: 'https://warden.example.com',
      token: 'secret-token',
      fetch: fetchMock,
    });

    await expect(client.recallMemory({
      protocolVersion: 1,
      clientRecallId: 'recall-123',
      repository: envelope.repository,
      skills: ['security'],
      languages: ['typescript'],
      paths: ['src/query.ts'],
    })).resolves.toEqual(response);
  });

  it('rejects a recall response for a different client request', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      protocolVersion: 1,
      clientRecallId: 'recall-other',
      memories: [],
    }));
    const client = createWardenServiceClient({
      baseUrl: 'https://warden.example.com',
      token: 'secret-token',
      fetch: fetchMock,
    });

    await expect(client.recallMemory({
      protocolVersion: 1,
      clientRecallId: 'recall-123',
      repository: envelope.repository,
      skills: [],
      languages: [],
      paths: [],
    })).rejects.toMatchObject({
      operation: 'recall_memory',
      kind: 'invalid_response',
    });
  });
});
