import {
  RunEnvelopeV1Schema,
  sha256Checksum,
} from '@sentry/warden-service-api';
import type { MetricsRunEnvelope } from '@sentry/warden-service-api';
import { describe, expect, it } from 'vitest';
import { createWardenService } from '../app.js';
import type {
  DatabaseClient,
  QueryResult,
  WardenDatabase,
} from '../db/database.js';
import { hashServiceToken } from '../tokens.js';

const token = 'wds_public_secret';

const envelope: MetricsRunEnvelope = {
  protocolVersion: 1,
  clientRunId: 'run-123',
  source: 'action',
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
  skills: [{
    executionId: 'skill-1',
    skill: 'security',
    model: 'example-model',
    runtime: 'claude-code',
    status: 'success',
    findingCounts: {
      total: 0,
      bySeverity: { high: 0, medium: 0, low: 0 },
    },
    usage: [{
      lane: 'scan',
      provider: 'anthropic',
      model: 'example-model',
      inputTokens: 100,
      outputTokens: 20,
      costUsd: null,
      costBasis: 'unknown',
    }],
  }],
};

function result<TRow extends Record<string, unknown>>(rows: TRow[]): QueryResult<TRow> {
  return { rows, rowCount: rows.length };
}

function fakeDatabase(repositoryAllowlist: string[] | null = ['acme/widgets'], failPersistence = false) {
  const statements: string[] = [];
  let storedRun: { id: string; checksum: string } | undefined;
  let nextId = 0;
  const client: DatabaseClient = {
    async query<TRow extends Record<string, unknown>>(sql: string, values?: readonly unknown[]) {
      statements.push(sql.replace(/\s+/g, ' ').trim());
      if (sql.includes('FROM service_tokens')) {
        return result([{
          id: 'token-id',
          tenant_id: 'tenant-id',
          token_hash: hashServiceToken(token),
          roles: ['ingest', 'read'],
          repository_allowlist: repositoryAllowlist,
        }] as unknown as TRow[]);
      }
      if (sql.includes('SELECT id, envelope_checksum FROM runs')) {
        return result(storedRun ? [{
          id: storedRun.id,
          envelope_checksum: storedRun.checksum,
        }] as unknown as TRow[] : []);
      }
      if (failPersistence && sql.includes('INSERT INTO repositories')) {
        throw new Error('SQL credential=wds_private finding=secret path=/src/private.ts snippet=ignore memory=private');
      }
      if (sql.includes('INSERT INTO repositories')) return result([{ id: 'repository-id' }] as unknown as TRow[]);
      if (sql.includes('INSERT INTO runs')) {
        storedRun = { id: 'stored-run-id', checksum: String(values?.[4]) };
        return result([{ id: storedRun.id }] as unknown as TRow[]);
      }
      if (sql.includes('INSERT INTO skill_executions')) {
        nextId += 1;
        return result([{ id: `skill-row-${nextId}` }] as unknown as TRow[]);
      }
      if (sql.includes('FROM memory_recall_batches')) {
        return result([{
          id: 'recall-batch-id',
          provider: 'anthropic',
          model: 'example-model',
          runtime: 'service',
          input_tokens: 20,
          output_tokens: 1,
          cost_usd: '0.002',
          cost_basis: 'reported',
        }] as unknown as TRow[]);
      }
      if (sql.includes('SELECT memory_id, lifecycle_version FROM memory_recalls')) {
        return result([{
          memory_id: 'memory-1',
          lifecycle_version: 2,
        }] as unknown as TRow[]);
      }
      return result([]);
    },
  };
  const database = {
    driver: 'postgres',
    maxConnections: 3,
    statementTimeoutMs: 15_000,
    orm: {},
    query: client.query,
    async withClient<T>(operation: (connection: DatabaseClient) => Promise<T>) {
      return operation(client);
    },
    async transaction<T>(operation: (connection: DatabaseClient) => Promise<T>) {
      return operation(client);
    },
    async close() { return undefined; },
  } as unknown as WardenDatabase;
  return { database, statements };
}

async function request(database: WardenDatabase, body: unknown, checksum?: string): Promise<Response> {
  return createWardenService({ database }).request('/api/v1/runs', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'warden-envelope-checksum': checksum ?? await sha256Checksum(body),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/v1/runs', () => {
  it('authenticates, validates, and persists a normalized multi-record run', async () => {
    const { database, statements } = fakeDatabase();
    const response = await request(database, envelope);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      protocolVersion: 1,
      runId: 'stored-run-id',
      created: true,
    });
    expect(statements.some((statement) => statement.startsWith('INSERT INTO skill_executions'))).toBe(true);
    expect(statements.some((statement) => statement.startsWith('INSERT INTO usage_line_items'))).toBe(true);
  });

  it('returns the existing run for identical delivery and conflicts on changed content', async () => {
    const { database } = fakeDatabase();
    expect((await request(database, envelope)).status).toBe(201);
    expect((await request(database, envelope)).status).toBe(200);

    const changed = RunEnvelopeV1Schema.parse({ ...envelope, outcome: 'failure' });
    const conflict = await request(database, changed);
    expect(conflict.status).toBe(409);
    expect(await conflict.text()).not.toContain('example-model');
  });

  it('links a pre-run recall and attributes known relevance usage', async () => {
    const { database, statements } = fakeDatabase();
    const withRecall = RunEnvelopeV1Schema.parse({
      ...envelope,
      memoryRecallId: 'recall-123',
      recalledMemories: [{ id: 'memory-1', version: 2 }],
    });

    expect((await request(database, withRecall)).status).toBe(201);
    expect(statements.some((statement) => statement.startsWith('UPDATE memory_recall_batches SET run_id'))).toBe(true);
    expect(statements.some((statement) => statement.startsWith('UPDATE memory_recalls SET run_id'))).toBe(true);
    expect(statements.some((statement) => statement.startsWith('INSERT INTO usage_line_items'))).toBe(true);
  });

  it('rejects unauthorized repositories and mismatched checksums without writing a run', async () => {
    const { database, statements } = fakeDatabase(['acme/other']);
    const forbidden = await request(database, envelope);
    expect(forbidden.status).toBe(403);
    expect(statements.some((statement) => statement.startsWith('INSERT INTO runs'))).toBe(false);

    const mismatch = await request(fakeDatabase().database, envelope, '0'.repeat(64));
    expect(mismatch.status).toBe(400);
  });

  it('rejects forbidden body fields without reflecting their content', async () => {
    const privateBody = { ...envelope, prompt: 'credential=private-value' };
    const response = await request(fakeDatabase().database, privateBody);

    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain('private-value');
  });

  it('does not reflect credentials, bodies, findings, paths, snippets, memory, or SQL failures', async () => {
    const response = await request(fakeDatabase(['acme/widgets'], true).database, envelope);
    const text = await response.text();

    expect(response.status).toBe(500);
    for (const forbidden of ['wds_private', 'example-model', 'secret', '/src/private.ts', 'ignore', 'memory', 'SQL']) {
      expect(text).not.toContain(forbidden);
    }
    expect(text).toContain('internal_error');
  });
});
