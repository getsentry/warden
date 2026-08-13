import { describe, expect, it } from 'vitest';
import type { DatabaseClient, QueryResult, WardenDatabase } from '../db/database.js';
import type { ClaimedJob } from '../jobs/runner.js';
import { createMemoryJobHandlers } from './handlers.js';

function databaseFixture() {
  const statements: string[] = [];
  const evidence = [1, 2].map((index) => ({
    finding_id: `finding-${index}`,
    observation_id: `observation-${index}`,
    run_id: `run-${index}`,
    skill: 'security', title: 'Unsafe sink', description: 'Unsafe input.',
    outcome: 'resolved', observed_at: new Date(`2026-08-0${index}T10:00:00.000Z`),
  }));
  const client: DatabaseClient = {
    async query<TRow extends Record<string, unknown>>(sql: string): Promise<QueryResult<TRow>> {
      statements.push(sql.replace(/\s+/g, ' ').trim());
      if (sql.includes('FROM finding_observations fo')) return { rows: evidence as unknown as TRow[], rowCount: 2 };
      return { rows: [], rowCount: 0 };
    },
  };
  return {
    statements,
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
    const { database, statements } = databaseFixture();
    const handler = createMemoryJobHandlers(database, {
      extractor: { async extract() { throw new Error('model response with private content'); } },
    }).memory_extract;

    await expect(handler?.(job, { deadline: Date.now() + 5_000 })).rejects.toThrow();
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
});
