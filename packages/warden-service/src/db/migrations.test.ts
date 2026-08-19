import { describe, expect, it } from 'vitest';
import type { DatabaseClient, QueryResult, WardenDatabase } from './database.js';
import { migrateDatabase } from './migrations.js';

function result<TRow extends Record<string, unknown>>(rows: TRow[] = []): QueryResult<TRow> {
  return { rows, rowCount: rows.length };
}

describe('migrateDatabase', () => {
  it('uses a transaction-scoped lock that cannot survive a disconnected migrator', async () => {
    const queries: string[] = [];
    const client: DatabaseClient = {
      async query<TRow extends Record<string, unknown>>(text: string): Promise<QueryResult<TRow>> {
        queries.push(text.trim());
        if (text.includes('SELECT version FROM _warden_service_migrations')) {
          return result([
            { version: '0000_nifty_frog_thor' },
            { version: '0001_magical_puppet_master' },
            { version: '0002_hosted_memory_costs' },
            { version: '0003_hosted_memory_vectors' },
            { version: '0004_dazzling_vermin' },
            { version: '0005_large_mattie_franklin' },
            { version: '0006_tiny_garia' },
            { version: '0007_finding_reviews' },
          ]) as unknown as QueryResult<TRow>;
        }
        return result();
      },
    };
    const database: WardenDatabase = {
      driver: 'postgres',
      maxConnections: 1,
      statementTimeoutMs: 15_000,
      withClient: (operation) => operation(client),
      query: async <TRow extends Record<string, unknown>>() => (
        result([{ version: '0007_finding_reviews' }]) as unknown as QueryResult<TRow>
      ),
      transaction: (operation) => operation(client),
      close: () => Promise.resolve(),
    };

    await expect(migrateDatabase(database)).resolves.toMatchObject({ ready: true });
    expect(queries[0]).toBe('BEGIN');
    expect(queries).toContain('SELECT pg_advisory_xact_lock($1)');
    expect(queries).not.toContain('SELECT pg_advisory_lock($1)');
    expect(queries.at(-1)).toBe('COMMIT');
  });
});
