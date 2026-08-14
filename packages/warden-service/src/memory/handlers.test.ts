import { describe, expect, it } from 'vitest';
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
  }));
  const client: DatabaseClient = {
    async query<TRow extends Record<string, unknown>>(sql: string, values: readonly unknown[] = []): Promise<QueryResult<TRow>> {
      statements.push(sql.replace(/\s+/g, ' ').trim());
      statementValues.push(values);
      if (sql.includes('FROM finding_observations fo')) return { rows: evidence as unknown as TRow[], rowCount: 2 };
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
    expect(statements[0]).toContain('ORDER BY (r.id = $3) DESC, fo.observed_at DESC, fo.id DESC');
    expect(statementValues[0]).toEqual([job.tenantId, job.repositoryId, job.entityId]);
    expect(statements.some((sql) => sql.includes('INSERT INTO memories'))).toBe(false);
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
