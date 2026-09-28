import { describe, expect, it, vi } from 'vitest';
import type { DatabaseClient, QueryResult, WardenDatabase } from '../db/database.js';
import type { ClaimedJob } from '../jobs/runner.js';
import { createMemoryJobHandlers } from './handlers.js';

function databaseFixture() {
  const statements: string[] = [];
  const statementValues: (readonly unknown[])[] = [];
  const evidence = [1, 2].map((index) => ({
    finding_id: `finding-${index}`,
    observation_id: `observation-${index}`,
    run_id: `run-${index}`,
    skill: 'security', title: 'Unsafe sink', description: 'Unsafe input.',
    outcome: 'resolved', observed_at: new Date(`2026-08-0${index}T10:00:00.000Z`),
    verification: 'Concrete path through executeQuery.', reason: 'Confirmed missing escaping.', head_sha: 'abcdef123', path: 'src/query.ts',
  }));
  const client: DatabaseClient = {
    async query<TRow extends Record<string, unknown>>(sql: string, values: readonly unknown[] = []): Promise<QueryResult<TRow>> {
      statements.push(sql.replace(/\s+/g, ' ').trim());
      statementValues.push(values);
      if (sql.includes('from "finding_observations"') || sql.includes('FROM finding_observations fo')) return { rows: evidence as unknown as TRow[], rowCount: 2 };
      return { rows: [], rowCount: 0 };
    },
  };
  return {
    statements,
    statementValues,
    database: {
      query: client.query,
      async withClient<T>(operation: (connection: DatabaseClient) => Promise<T>) { return operation(client); },
      async transaction<T>(operation: (connection: DatabaseClient) => Promise<T>) { return operation(client); },
    } as unknown as WardenDatabase,
  };
}

const job: ClaimedJob = {
  id: 'job-1', tenantId: 'tenant-1', repositoryId: 'repository-1', type: 'memory_extract',
  entityId: 'run-2', inputVersion: 1, attempts: 1, maxAttempts: 5, maxAgeSeconds: 86_400,
  continuation: null, createdAt: new Date(),
};

describe('memory job handlers', () => {
  it('performs no candidate mutation when the optional extraction model fails', async () => {
    const { database, statements, statementValues } = databaseFixture();
    const handler = createMemoryJobHandlers(database, {
      extractor: { async extract() { throw new Error('model response with private content'); } },
    }).memory_extract;

    await expect(handler?.(job, { deadline: Date.now() + 5_000 })).rejects.toThrow();
    expect(statements[0]).toContain('order by "runs"."id" =');
    expect(statementValues[0]).toEqual(expect.arrayContaining([job.tenantId, job.repositoryId, job.entityId]));
    expect(statements.some((sql) => sql.includes('INSERT INTO memories'))).toBe(false);
  });

  it('records one extraction usage line even when the call returns multiple proposals', async () => {
    const { database, statements, statementValues } = databaseFixture();
    let memories = 0;
    const original = database.transaction.bind(database);
    database.transaction = async (operation) => original(async (client) => {
      const query = client.query.bind(client);
      client.query = async <TRow extends Record<string, unknown>>(sql: string, values?: readonly unknown[]) => {
        const result = await query<TRow>(sql, values);
        return sql.includes('INSERT INTO memories')
          ? { rows: [{ id: `memory-${++memories}` } as unknown as TRow], rowCount: 1 }
          : result;
      };
      return operation(client);
    });
    const handler = createMemoryJobHandlers(database, {
      extractor: {
        async extract(input) {
          expect(input.evidence[0]).toMatchObject({ verification: 'Concrete path through executeQuery.', reason: 'Confirmed missing escaping.', headSha: 'abcdef123', path: 'src/query.ts' });
          return {
            proposals: ['Use parameterized queries.', 'Validate query identifiers.'].map((content) => ({
              kind: 'confirmed_pattern' as const,
              content,
              evidenceIds: input.evidence.map((item) => item.observationId),
              skill: 'security',
              confidence: 0.9,
            })),
            modelVersion: 'test-model',
            usage: {
              provider: 'test', model: 'test-model', runtime: 'test',
              inputTokens: 101, outputTokens: 21, costUsd: 0.011, costBasis: 'estimated' as const,
            },
          };
        },
      },
    }).memory_extract;

    await expect(handler?.(job, { deadline: Date.now() + 5_000 })).resolves.toEqual({ complete: true });
    const usage = statements.flatMap((sql, index) => (
      sql.includes('INSERT INTO usage_line_items') ? [statementValues[index]!] : []
    ));
    expect(usage).toEqual([[
      job.tenantId,
      job.entityId,
      `memory_extract:${job.id}:attempt:${job.attempts}`,
      'test',
      'test-model',
      'test',
      101,
      21,
      0.011,
      'estimated',
    ]]);
    const memoriesUsage = statements.flatMap((sql, index) => (
      sql.includes('INSERT INTO memories') ? [statementValues[index]!] : []
    ));
    expect(memoriesUsage.map((values) => values.slice(18, 22))).toEqual([
      [null, null, null, null],
      [null, null, null, null],
    ]);
  });

  it('expires inactive memory indexes through the retention handler', async () => {
    const { database, statements } = databaseFixture();
    const original = database.transaction.bind(database);
    database.transaction = async (operation) => original(async (client) => {
      const query = client.query.bind(client);
      client.query = async (sql, values) => {
        if (sql.includes("UPDATE memories SET lifecycle = 'expired'")) {
          statements.push(sql.replace(/\s+/g, ' ').trim());
          return { rows: [{ id: 'memory-1' }], rowCount: 1 } as never;
        }
        return query(sql, values);
      };
      return operation(client);
    });
    const handler = createMemoryJobHandlers(database).retention;

    await expect(handler?.({ ...job, type: 'retention', entityId: null }, { deadline: Date.now() + 5_000 }))
      .resolves.toEqual({ complete: true });
    expect(statements.some((sql) => sql.startsWith('DELETE FROM memory_embeddings'))).toBe(true);
    expect(statements.some((sql) => sql.includes("'retention_expired'"))).toBe(true);
  });

  it('embeds the current version when passive evidence promotes an existing candidate', async () => {
    const { database, statements, statementValues } = databaseFixture();
    const baseQuery = database.query.bind(database);
    const query: DatabaseClient['query'] = async (sql, values) => {
      const result = await baseQuery(sql, values);
      if (sql.includes('SELECT id, lifecycle FROM memories')) return { rows: [{ id: 'memory-1', lifecycle: 'candidate' }], rowCount: 1 } as never;
      if (sql.includes('AS independent_runs')) return { rows: [{ support_count: 3, contradiction_count: 0, independent_runs: 3 }], rowCount: 1 } as never;
      if (sql.includes('from "memories"')) return { rows: [{ version: 2 }], rowCount: 1 } as never;
      if (sql.includes('SELECT id, repository_id, version, content, content_hash')) return { rows: [{ id: 'memory-1', version: 2, content: 'Confirmed pattern.', content_hash: 'hash-1' }], rowCount: 1 } as never;
      return result;
    };
    database.query = query;
    database.transaction = async (operation) => operation({ query });
    const embed = vi.fn().mockResolvedValue({ vector: [0.1, 0.2] });
    const handlers = createMemoryJobHandlers(database, {
      promotionPolicy: { autoPromote: true, minimumIndependentEvidence: 3, version: 'test' },
      embedding: { provider: 'test', model: 'test', dimensions: 2, embed },
    });
    await handlers.memory_extract!(job, { deadline: Date.now() + 5_000 });
    const enqueued = statements.findIndex((sql) => sql.startsWith('insert into "jobs"'));
    expect(enqueued).toBeGreaterThanOrEqual(0);
    expect(statementValues[enqueued]).toEqual(expect.arrayContaining([2, 'memory_embed:memory-1:v2:test:test']));
    await handlers.memory_embed!({ ...job, type: 'memory_embed', entityId: 'memory-1', inputVersion: 2 }, { deadline: Date.now() + 5_000 });
    expect(embed).toHaveBeenCalledExactlyOnceWith('Confirmed pattern.');
  });

  it('skips an obsolete embedding job after the note was revised', async () => {
    const { database } = databaseFixture();
    database.query = async () => ({ rows: [{ id: 'memory-1', version: 2, content: 'Revised evidence.', content_hash: 'v2' }], rowCount: 1 }) as never;
    const embed = vi.fn();
    const handler = createMemoryJobHandlers(database, { embedding: { provider: 'test', model: 'test', dimensions: 1536, embed } }).memory_embed;
    expect(await handler?.({ ...job, type: 'memory_embed', entityId: 'memory-1', inputVersion: 1 }, { deadline: Date.now() + 5_000 })).toEqual({ complete: true });
    expect(embed).not.toHaveBeenCalled();
  });

  it('does not hide non-vector database failures while storing embeddings', async () => {
    const { database } = databaseFixture();
    database.query = async (sql) => {
      if (sql.includes('FROM memories')) {
        return {
          rows: [{
            id: 'memory-1', repository_id: 'repository-1', version: 1,
            content: 'Use the established parser.', content_hash: 'hash-1',
          }],
          rowCount: 1,
        } as never;
      }
      const error = new Error('connection lost') as Error & { code: string };
      error.code = '08006';
      throw error;
    };
    const handler = createMemoryJobHandlers(database, {
      embedding: {
        provider: 'test', model: 'test-embedding', dimensions: 2,
        async embed() { return { vector: [0.1, 0.2] }; },
      },
    }).memory_embed;

    await expect(handler?.({ ...job, type: 'memory_embed', entityId: 'memory-1' }, { deadline: Date.now() + 5_000 }))
      .rejects.toThrow('connection lost');
  });

  it('uses JSON embeddings when pgvector is unavailable', async () => {
    const { database, statements } = databaseFixture();
    database.query = async (sql) => {
      statements.push(sql.replace(/\s+/g, ' ').trim());
      if (sql.includes('FROM memories')) {
        return {
          rows: [{
            id: 'memory-1', repository_id: 'repository-1', version: 1,
            content: 'Use the established parser.', content_hash: 'hash-1',
          }],
          rowCount: 1,
        } as never;
      }
      if (sql.includes('embedding_vector')) {
        const error = new Error('column does not exist') as Error & { code: string };
        error.code = '42703';
        throw error;
      }
      return { rows: [], rowCount: 0 } as never;
    };
    const handler = createMemoryJobHandlers(database, {
      embedding: {
        provider: 'test', model: 'test-embedding', dimensions: 2,
        async embed() { return { vector: [0.1, 0.2] }; },
      },
    }).memory_embed;

    await expect(handler?.({ ...job, type: 'memory_embed', entityId: 'memory-1' }, { deadline: Date.now() + 5_000 }))
      .resolves.toEqual({ complete: true });
    expect(statements.some((sql) => sql.includes('embedding, input_tokens'))).toBe(true);
  });
});
