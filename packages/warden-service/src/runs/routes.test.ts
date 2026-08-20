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
      if (sql.includes('INSERT INTO findings')) {
        return result([{ id: 'finding-row-1', client_finding_id: 'finding-1' }] as unknown as TRow[]);
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
    expect(statements.some((statement) => (
      statement.startsWith('INSERT INTO skill_executions') && statement.includes('clock_timestamp()')
    ))).toBe(true);
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

  it('enqueues memory extraction only for outcomes that provide memory evidence', async () => {
    const finding = {
      id: 'finding-1',
      skillExecutionId: 'skill-1',
      severity: 'high' as const,
      title: 'Unsafe sink',
      description: 'Untrusted input reaches a sensitive sink.',
    };
    const findingsEnvelope = (outcome: 'posted' | 'deduped') => RunEnvelopeV1Schema.parse({
      ...envelope,
      clientRunId: `run-${outcome}`,
      dataProfile: 'findings',
      features: { memory: true },
      findingCounts: { total: 1, bySeverity: { high: 1, medium: 0, low: 0 } },
      skills: [{ ...envelope.skills[0]!, findingCounts: { total: 1, bySeverity: { high: 1, medium: 0, low: 0 } } }],
      findings: [finding],
      observations: [{
        findingId: finding.id,
        skillExecutionId: finding.skillExecutionId,
        outcome,
        observedAt: envelope.completedAt,
      }],
    });

    const eligible = fakeDatabase();
    expect((await request(eligible.database, findingsEnvelope('posted'))).status).toBe(201);
    expect(eligible.statements.some((statement) => statement.startsWith('INSERT INTO jobs'))).toBe(true);
    expect(eligible.statements.some((statement) => (
      statement.startsWith('INSERT INTO findings') && statement.includes('clock_timestamp()')
    ))).toBe(true);

    const ineligible = fakeDatabase();
    expect((await request(ineligible.database, findingsEnvelope('deduped'))).status).toBe(201);
    expect(ineligible.statements.some((statement) => statement.startsWith('INSERT INTO jobs'))).toBe(false);
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

const reviewItem = {
  skill: 'security',
  findingId: 'finding-1',
  occurrence: 1,
  verdict: 'false_positive' as const,
  comment: 'Test fixture, not a real leak.',
  updatedAt: '2026-08-19T10:00:00.000Z',
};

type ReviewFindingRow = {
  id: string;
  client_finding_id: string;
  reported_id: string | null;
  skill: string;
  created_at?: string;
};

function orderReviewFindings(findings: ReviewFindingRow[], sql: string): ReviewFindingRow[] {
  const ordered = [...findings];
  if (sql.includes('ORDER BY se.created_at ASC, f.created_at ASC')) {
    ordered.sort((left, right) => (left.created_at ?? '').localeCompare(right.created_at ?? ''));
  }
  return ordered;
}

function reviewDatabase(options: {
  allowlist?: string[] | null;
  run?: {
    id: string;
    clientRunId: string;
    repositoryId: string;
    envelopeVersion: number;
    fullName: string;
  } | null;
  findings?: {
    id: string;
    client_finding_id: string;
    reported_id: string | null;
    skill: string;
    created_at?: string;
  }[];
} = {}) {
  const statements: string[] = [];
  const reviews = new Map<string, {
    verdict: string;
    comment: string;
    updatedAt: string;
  }>();
  const jobs: string[] = [];
  const run = options.run === undefined
    ? {
      id: 'stored-run-id',
      clientRunId: 'run-123',
      repositoryId: 'repository-id',
      envelopeVersion: 1,
      fullName: 'acme/widgets',
    }
    : options.run;
  const findings = options.findings ?? [{
    id: 'finding-row-1',
    client_finding_id: 'finding-1',
    reported_id: null,
    skill: 'security',
  }];
  const client: DatabaseClient = {
    async query<TRow extends Record<string, unknown>>(sql: string, values?: readonly unknown[]) {
      statements.push(sql.replace(/\s+/g, ' ').trim());
      if (sql.includes('FROM service_tokens')) {
        return result([{
          id: 'token-id',
          tenant_id: 'tenant-id',
          token_hash: hashServiceToken(token),
          roles: ['ingest', 'read'],
          repository_allowlist: options.allowlist ?? ['acme/widgets'],
        }] as unknown as TRow[]);
      }
      if (sql.includes('FROM runs r')) {
        return result((run ? [{
          id: run.id,
          client_run_id: run.clientRunId,
          repository_id: run.repositoryId,
          envelope_version: run.envelopeVersion,
          full_name: run.fullName,
        }] : []) as unknown as TRow[]);
      }
      if (sql.includes('FROM findings f')) {
        return result(orderReviewFindings(findings, sql) as unknown as TRow[]);
      }
      if (sql.includes('INSERT INTO finding_reviews')) {
        const findingId = String(values?.[2]);
        const incoming = {
          verdict: String(values?.[3]),
          comment: String(values?.[4]),
          updatedAt: String(values?.[8]),
        };
        const stored = reviews.get(findingId);
        if (stored && stored.updatedAt >= incoming.updatedAt) {
          return result([]);
        }
        reviews.set(findingId, incoming);
        return result([{ id: `review-${reviews.size}` }] as unknown as TRow[]);
      }
      if (sql.includes('INSERT INTO jobs')) {
        jobs.push(String(values?.[5]));
        return result([]);
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
  return { database, statements, reviews, jobs };
}

async function reviewRequest(
  database: WardenDatabase,
  body: unknown,
  clientRunId = 'run-123',
): Promise<Response> {
  return createWardenService({ database }).request(`/api/v1/runs/${clientRunId}/reviews`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'idempotency-key': clientRunId,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/v1/runs/:clientRunId/reviews', () => {
  it('upserts matched reviews, lists unmatched, and enqueues a reviews extract', async () => {
    const { database, statements, reviews, jobs } = reviewDatabase();
    const missing = {
      skill: 'security',
      findingId: 'missing-finding',
      occurrence: 1,
      verdict: 'true_positive' as const,
      comment: '',
      updatedAt: '2026-08-19T10:00:00.000Z',
    };
    const response = await reviewRequest(database, { reviews: [reviewItem, missing] });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      runId: 'stored-run-id',
      clientRunId: 'run-123',
      applied: 1,
      unmatched: [{
        skill: 'security',
        findingId: 'missing-finding',
        occurrence: 1,
        reason: 'finding_not_found',
      }],
    });
    expect(reviews.size).toBe(1);
    expect(reviews.get('finding-row-1')).toMatchObject({
      verdict: 'false_positive',
      comment: 'Test fixture, not a real leak.',
    });
    expect(jobs).toEqual([
      `memory_extract:finding_reviews:stored-run-id:${await sha256Checksum([reviewItem])}`,
    ]);
    expect(statements.some((statement) => statement.includes('finding_observations'))).toBe(false);
    expect(statements.some((statement) => statement.includes('envelope_checksum'))).toBe(false);
    expect(statements.some((statement) => statement.startsWith('INSERT INTO runs'))).toBe(false);
    expect(statements.some((statement) => statement.startsWith('INSERT INTO findings'))).toBe(false);
  });

  it('returns 404 for an unknown clientRunId without writing reviews', async () => {
    const { database, statements, reviews, jobs } = reviewDatabase({ run: null });
    const response = await reviewRequest(database, { reviews: [reviewItem] }, 'missing-run');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'not_found' },
    });
    expect(reviews.size).toBe(0);
    expect(jobs).toEqual([]);
    expect(statements.some((statement) => statement.startsWith('INSERT INTO finding_reviews'))).toBe(false);
    expect(statements.some((statement) => statement.startsWith('INSERT INTO runs'))).toBe(false);
  });

  it('overwrites one current review and enqueues a later relabel despite a static HTTP key', async () => {
    const { database, reviews, jobs } = reviewDatabase();
    const newer = {
      ...reviewItem,
      verdict: 'true_positive' as const,
      comment: 'Confirmed after a second look.',
      updatedAt: '2026-08-19T11:00:00.000Z',
    };
    const older = {
      ...reviewItem,
      verdict: 'mitigated' as const,
      comment: 'Stale sidecar write.',
      updatedAt: '2026-08-19T09:00:00.000Z',
    };

    expect((await reviewRequest(database, { reviews: [reviewItem] })).status).toBe(200);
    const relabel = await reviewRequest(database, { reviews: [newer] });
    expect(relabel.status).toBe(200);
    await expect(relabel.json()).resolves.toMatchObject({ applied: 1, unmatched: [] });
    const stale = await reviewRequest(database, { reviews: [older] });
    expect(stale.status).toBe(200);
    await expect(stale.json()).resolves.toMatchObject({ applied: 0, unmatched: [] });

    expect(reviews.size).toBe(1);
    expect(reviews.get('finding-row-1')).toEqual({
      verdict: 'true_positive',
      comment: 'Confirmed after a second look.',
      updatedAt: newer.updatedAt,
    });
    expect(jobs).toEqual([
      `memory_extract:finding_reviews:stored-run-id:${await sha256Checksum([reviewItem])}`,
      `memory_extract:finding_reviews:stored-run-id:${await sha256Checksum([newer])}`,
    ]);
  });

  it('matches Action-rewritten ids by reported_id and 1-based occurrence', async () => {
    const { database, reviews, statements } = reviewDatabase({
      findings: [{
        id: 'ffffffff-0000-4000-8000-000000000002',
        client_finding_id: 'internal-1',
        reported_id: '7MV-5V7',
        skill: 'security',
        created_at: '2026-08-19T10:00:00.000001Z',
      }, {
        id: '00000000-0000-4000-8000-000000000001',
        client_finding_id: 'internal-2',
        reported_id: '7MV-5V7',
        skill: 'security',
        created_at: '2026-08-19T10:00:00.000002Z',
      }],
    });
    const second = {
      skill: 'security',
      findingId: '7MV-5V7',
      occurrence: 2,
      verdict: 'mitigated' as const,
      comment: '',
      updatedAt: '2026-08-19T10:00:00.000Z',
    };
    const response = await reviewRequest(database, { reviews: [second] });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ applied: 1, unmatched: [] });
    expect(statements.some((statement) => (
      statement.includes('FROM findings f') && statement.includes('ORDER BY se.created_at ASC, f.created_at ASC')
    ))).toBe(true);
    expect(reviews.has('ffffffff-0000-4000-8000-000000000002')).toBe(false);
    expect(reviews.get('00000000-0000-4000-8000-000000000001')).toMatchObject({ verdict: 'mitigated' });
  });
});
