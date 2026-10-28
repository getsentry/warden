import { describe, expect, it, vi } from 'vitest';
import { createWardenService } from '../app.js';
import type { DatabaseClient, QueryResult, WardenDatabase } from '../db/database.js';
import { processJobSlice } from './runner.js';

function durableDatabase(jobOverrides: Record<string, unknown> = {}) {
  const statements: string[] = [];
  const queries: { sql: string; values: readonly unknown[] }[] = [];
  let claimed = false;
  const client: DatabaseClient = {
    async query<TRow extends Record<string, unknown>>(sql: string, values: readonly unknown[] = []): Promise<QueryResult<TRow>> {
      statements.push(sql.replace(/\s+/g, ' ').trim());
      queries.push({ sql: sql.replace(/\s+/g, ' ').trim(), values });
      if (sql.includes('WITH candidates') && !claimed) {
        claimed = true;
        return {
          rows: [{
            id: '00000000-0000-0000-0000-000000000010',
            tenant_id: '00000000-0000-0000-0000-000000000001',
            repository_id: null,
            type: 'retention',
            entity_id: null,
            input_version: 1,
            attempts: 1,
            max_attempts: 5,
            max_age_seconds: 86_400,
            continuation: null,
            created_at: new Date(),
            ...jobOverrides,
          }] as unknown as TRow[],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
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
  return { database, statements, queries };
}

describe('durable job runner', () => {
  it('claims with SKIP LOCKED and completes through the shared handler path', async () => {
    const { database, statements } = durableDatabase();
    const handler = vi.fn().mockResolvedValue({ complete: true });

    const result = await processJobSlice(database, { retention: handler }, {
      deadline: Date.now() + 5_000,
      workerId: 'worker-1',
    });

    expect(result).toMatchObject({ claimed: 1, completed: 1, retried: 0 });
    expect(handler).toHaveBeenCalledOnce();
    expect(statements.some((statement) => statement.includes('FOR UPDATE SKIP LOCKED'))).toBe(true);
    expect(statements.some((statement) => statement.includes("state = 'complete'"))).toBe(true);
  });

  it('authenticates the Vercel Cron bearer secret', async () => {
    const unauthorized = createWardenService({
      database: durableDatabase().database,
      cronSecret: 'cron-secret-123456',
      jobHandlers: { retention: async () => ({ complete: true }) },
    });
    expect((await unauthorized.request('/api/internal/jobs/tick')).status).toBe(401);

    const authorizedFixture = durableDatabase();
    const authorized = createWardenService({
      database: authorizedFixture.database,
      cronSecret: 'cron-secret-123456',
      jobHandlers: { retention: async () => ({ complete: true }) },
    });
    const response = await authorized.request('/api/internal/jobs/tick', {
      headers: { authorization: 'Bearer cron-secret-123456' },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ claimed: 1, completed: 1 });
    expect(authorizedFixture.statements.some((statement) =>
      statement.includes("'retention:'") && statement.includes('FROM tenants')
    )).toBe(true);
  });

  it('allows only one of two competing workers to claim the same job', async () => {
    const { database } = durableDatabase();
    const handler = vi.fn().mockResolvedValue({ complete: true });

    const results = await Promise.all([
      processJobSlice(database, { retention: handler }, { deadline: Date.now() + 5_000, workerId: 'worker-a' }),
      processJobSlice(database, { retention: handler }, { deadline: Date.now() + 5_000, workerId: 'worker-b' }),
    ]);

    expect(results.reduce((total, result) => total + result.claimed, 0)).toBe(1);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('recovers stale leases and releases unstarted work before a soft deadline', async () => {
    const { database, statements } = durableDatabase({ continuation: { cursor: 'page-1' } });
    const handler = vi.fn();

    const result = await processJobSlice(database, { retention: handler }, {
      deadline: Date.now(),
      workerId: 'worker-deadline',
    });

    expect(result).toMatchObject({ claimed: 1, continued: 1, deadlineReached: true });
    expect(handler).not.toHaveBeenCalled();
    expect(statements.some((statement) => statement.includes("safe_error_code = 'stale_lease'"))).toBe(true);
    expect(statements.some((statement) => statement.includes('attempts = GREATEST(0, attempts - 1)'))).toBe(true);
    expect(statements.some((statement) => statement.includes("safe_error_code = 'continuation'"))).toBe(false);
  });

  it('moves terminal attempts to dead with a content-safe error code', async () => {
    const { database, queries } = durableDatabase({ attempts: 5, max_attempts: 5 });
    const handler = vi.fn().mockRejectedValue(new Error('private child content'));

    const result = await processJobSlice(database, { retention: handler }, {
      deadline: Date.now() + 5_000,
      workerId: 'worker-terminal',
    });

    expect(result).toMatchObject({ claimed: 1, retried: 1 });
    const update = queries.find((query) => query.sql.includes('UPDATE jobs SET state = $4::job_state'));
    expect(update?.values[3]).toBe('dead');
    expect(update?.values[5]).toBe('handler_failed');
    expect(JSON.stringify(queries)).not.toContain('private child content');
  });
});
