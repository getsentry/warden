import { describe, expect, it } from 'vitest';
import type { ServiceContext } from '../context.js';
import type { DatabaseClient, QueryResult, WardenDatabase } from '../db/database.js';
import { applyTenantRetention, deleteRun, deleteTenant, exportServiceData } from './store.js';

const context: ServiceContext = {
  tenantId: 'tenant-1', tokenId: 'token-1', roles: ['admin'], repositoryAllowlist: ['acme/widgets'],
};

function databaseFor(query: (sql: string, values: readonly unknown[]) => QueryResult<Record<string, unknown>>): WardenDatabase {
  const client: DatabaseClient = { async query(sql, values = []) { return query(sql, values) as never; } };
  return {
    query: client.query,
    async withClient<T>(operation: (connection: DatabaseClient) => Promise<T>) { return operation(client); },
    async transaction<T>(operation: (connection: DatabaseClient) => Promise<T>) { return operation(client); },
  } as unknown as WardenDatabase;
}

describe('service administration store', () => {
  it('applies independent content-class retention windows', async () => {
    const statements: { sql: string; values: readonly unknown[] }[] = [];
    const database = databaseFor((sql, values) => {
      statements.push({ sql, values });
      if (sql.includes('FROM tenants WHERE id')) return { rows: [{
        metrics_retention_days: 365,
        findings_retention_days: 90,
        code_retention_days: 30,
        lifecycle_retention_days: 180,
      }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });

    await applyTenantRetention(database, context.tenantId);
    expect(statements.find((item) => item.sql.includes('source_evidence = NULL'))?.values).toEqual([context.tenantId, 30]);
    expect(statements.find((item) => item.sql.includes("title = '[retained finding]'"))?.values).toEqual([context.tenantId, 90]);
    expect(statements.find((item) => item.sql.includes('DELETE FROM runs'))?.values).toEqual([context.tenantId, 365]);
    expect(statements.find((item) => item.sql.includes('DELETE FROM memories'))?.values).toEqual([context.tenantId, 180]);
  });

  it('deletes an authorized run, job payload references, and unsupported derived indexes', async () => {
    const statements: string[] = [];
    const database = databaseFor((sql) => {
      statements.push(sql);
      if (sql.includes('SELECT r.id FROM runs')) return { rows: [{ id: 'run-1' }], rowCount: 1 };
      if (sql.includes('UPDATE memories m')) return { rows: [{ id: 'memory-1' }], rowCount: 1 };
      return { rows: [], rowCount: sql.includes('DELETE FROM runs') ? 1 : 0 };
    });

    await expect(deleteRun(database, context, 'run-1')).resolves.toBe(true);
    expect(statements.find((sql) => sql.includes('SELECT r.id FROM runs'))).toContain('repo.full_name = ANY');
    expect(statements.some((sql) => sql.includes("payload_ref->>'runId'"))).toBe(true);
    expect(statements.some((sql) => sql.startsWith('DELETE FROM memory_embeddings'))).toBe(true);
  });

  it('exports only explicitly selected fields for authorized repositories', async () => {
    const statements: string[] = [];
    const database = databaseFor((sql) => {
      statements.push(sql);
      if (sql.includes('FROM repositories WHERE')) return { rows: [{
        id: 'repository-1', provider: 'github', owner: 'acme', name: 'widgets', full_name: 'acme/widgets',
        memory_enabled: true,
      }], rowCount: 1 };
      if (sql.includes('FROM runs WHERE')) return { rows: [{
        id: 'run-1', repository_id: 'repository-1', data: { clientRunId: 'client-run-1', dataProfile: 'metrics' },
      }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });

    const records = await exportServiceData(database, context, 'repository-1');
    expect(records).toMatchObject([
      { type: 'repository', id: 'repository-1' },
      { type: 'run', id: 'run-1', data: { dataProfile: 'metrics' } },
    ]);
    expect(statements.find((sql) => sql.includes('FROM repositories WHERE'))).toContain('full_name = ANY');
    expect(JSON.stringify(records)).not.toMatch(/token|authorization|prompt|transcript/i);
  });

  it('does not let a repository-restricted administrator delete the tenant', async () => {
    let queried = false;
    const database = databaseFor(() => {
      queried = true;
      return { rows: [], rowCount: 0 };
    });

    await expect(deleteTenant(database, context)).resolves.toBe(false);
    expect(queried).toBe(false);
  });
});
