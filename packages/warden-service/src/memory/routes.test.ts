import { describe, expect, it } from 'vitest';
import { createWardenService } from '../app.js';
import type { DatabaseClient, QueryResult, WardenDatabase } from '../db/database.js';
import { hashServiceToken } from '../tokens.js';

const token = 'wds_public_secret';

function result<TRow extends Record<string, unknown>>(rows: TRow[]): QueryResult<TRow> {
  return { rows, rowCount: rows.length };
}

function conflictDatabase(): WardenDatabase {
  const client: DatabaseClient = {
    async query<TRow extends Record<string, unknown>>(sql: string) {
      if (sql.includes('FROM service_tokens')) {
        return result([{
          id: 'token-id',
          tenant_id: 'tenant-id',
          token_hash: hashServiceToken(token),
          roles: ['admin'],
          repository_allowlist: ['acme/widgets'],
        }] as unknown as TRow[]);
      }
      if (sql.includes('FROM repositories')) {
        return result([{
          id: 'repository-id',
          provider: 'github',
          owner: 'acme',
          name: 'widgets',
          full_name: 'acme/widgets',
          memory_enabled: true,
        }] as unknown as TRow[]);
      }
      return result([]);
    },
  };
  return {
    query: client.query,
    async withClient<T>(operation: (connection: DatabaseClient) => Promise<T>) {
      return operation(client);
    },
    async transaction<T>(operation: (connection: DatabaseClient) => Promise<T>) {
      return operation(client);
    },
  } as unknown as WardenDatabase;
}

function createRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/v1/memories', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

const memory = {
  repository: {
    provider: 'github',
    owner: 'acme',
    name: 'widgets',
    fullName: 'acme/widgets',
  },
  kind: 'convention',
  content: 'Use parameterized queries.',
};

describe('POST /api/v1/memories', () => {
  it('requires a caller-provided idempotency key', async () => {
    const response = await createWardenService({ database: conflictDatabase() })
      .fetch(createRequest(memory));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'invalid_request' },
    });
  });

  it('returns conflict when an idempotency key belongs to different immutable content', async () => {
    const response = await createWardenService({ database: conflictDatabase() })
      .fetch(createRequest({ ...memory, idempotencyKey: 'admin-memory-1' }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'conflict' },
    });
  });
});
