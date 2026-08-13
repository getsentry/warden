import { describe, expect, it } from 'vitest';
import type { DatabaseClient, QueryResult, WardenDatabase } from '../db/database.js';
import type { PassiveEvidence } from './passive.js';
import { applyMemorySupersessionDecision, persistPassiveMemoryCandidate } from './passive-store.js';

function evidence(index: number): PassiveEvidence {
  return {
    findingId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    observationId: `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    runId: `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    skill: 'security',
    title: 'Unsafe sink',
    description: 'Untrusted input reaches a sink.',
    outcome: 'resolved',
    observedAt: `2026-08-${String(index).padStart(2, '0')}T10:00:00.000Z`,
  };
}

function databaseFor(query: (sql: string, values: readonly unknown[]) => QueryResult<Record<string, unknown>>): WardenDatabase {
  const client: DatabaseClient = { async query(sql, values = []) { return query(sql, values) as never; } };
  return {
    query: client.query,
    async withClient<T>(operation: (connection: DatabaseClient) => Promise<T>) { return operation(client); },
    async transaction<T>(operation: (connection: DatabaseClient) => Promise<T>) { return operation(client); },
  } as unknown as WardenDatabase;
}

describe('passive memory persistence', () => {
  it('creates an inactive candidate with validated immutable evidence by default', async () => {
    const source = [evidence(1), evidence(2)];
    const statements: { sql: string; values: readonly unknown[] }[] = [];
    const database = databaseFor((sql, values) => {
      statements.push({ sql, values });
      if (sql.includes('FROM finding_observations fo')) return {
        rows: source.map((item) => ({ finding_id: item.findingId, observation_id: item.observationId, run_id: item.runId })), rowCount: 2,
      };
      if (sql.includes('SELECT id, lifecycle FROM memories')) return { rows: [], rowCount: 0 };
      if (sql.includes('INSERT INTO memories')) return { rows: [{ id: 'memory-1' }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });

    await expect(persistPassiveMemoryCandidate(database, {
      tenantId: 'tenant-1', repositoryId: 'repository-1',
      proposal: {
        kind: 'confirmed_pattern', content: 'Repeated unsafe sink.',
        evidenceIds: source.map((item) => item.observationId), skill: 'security', confidence: 0.8,
      },
      evidence: source,
      modelVersion: 'model-v1',
      extractionCostUsd: 0.01,
    })).resolves.toEqual({ id: 'memory-1', lifecycle: 'candidate', created: true });
    expect(statements.find((item) => item.sql.includes('INSERT INTO memories'))?.values[4]).toBe('candidate');
    expect(statements.filter((item) => item.sql.includes('INSERT INTO memory_evidence'))).toHaveLength(2);
  });

  it('reuses exact active duplicates and leaves state unchanged on uncertain supersession', async () => {
    const source = [evidence(1), evidence(2)];
    let queries = 0;
    const database = databaseFor((sql) => {
      queries += 1;
      if (sql.includes('FROM finding_observations fo')) return {
        rows: source.map((item) => ({ finding_id: item.findingId, observation_id: item.observationId, run_id: item.runId })), rowCount: 2,
      };
      if (sql.includes('SELECT id, lifecycle FROM memories')) return { rows: [{ id: 'memory-existing', lifecycle: 'active' }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });
    await expect(persistPassiveMemoryCandidate(database, {
      tenantId: 'tenant-1', repositoryId: 'repository-1',
      proposal: {
        kind: 'confirmed_pattern', content: 'Repeated unsafe sink.',
        evidenceIds: source.map((item) => item.observationId), skill: 'security', confidence: 0.8,
      },
      evidence: source,
      modelVersion: 'model-v1',
    })).resolves.toEqual({ id: 'memory-existing', lifecycle: 'active', created: false });
    const afterDuplicate = queries;
    await expect(applyMemorySupersessionDecision(database, {
      tenantId: 'tenant-1', repositoryId: 'repository-1', candidateId: 'candidate-1',
      decision: 'uncertain', targetIds: ['memory-existing'],
    })).resolves.toBe(false);
    expect(queries).toBe(afterDuplicate);
  });

  it('rejects missing or deleted evidence without creating a candidate', async () => {
    const source = [evidence(1), evidence(2)];
    const statements: string[] = [];
    const database = databaseFor((sql) => {
      statements.push(sql);
      if (sql.includes('FROM finding_observations fo')) return {
        rows: [{ finding_id: source[0]!.findingId, observation_id: source[0]!.observationId, run_id: source[0]!.runId }], rowCount: 1,
      };
      return { rows: [], rowCount: 0 };
    });

    await expect(persistPassiveMemoryCandidate(database, {
      tenantId: 'tenant-1', repositoryId: 'repository-1',
      proposal: {
        kind: 'confirmed_pattern', content: 'Repeated unsafe sink.',
        evidenceIds: source.map((item) => item.observationId), skill: 'security', confidence: 0.8,
      },
      evidence: source,
      modelVersion: 'model-v1',
    })).resolves.toBeNull();
    expect(statements.some((sql) => sql.includes('INSERT INTO memories'))).toBe(false);
  });

  it('activates a candidate and supersedes only validated active memories atomically', async () => {
    const statements: string[] = [];
    const database = databaseFor((sql) => {
      statements.push(sql);
      if (sql.includes("id = $3 AND lifecycle = 'candidate'")) return { rows: [{ id: 'candidate-1' }], rowCount: 1 };
      if (sql.includes("id = ANY($3::uuid[]) AND lifecycle = 'active'")) return { rows: [{ id: 'memory-1' }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });

    await expect(applyMemorySupersessionDecision(database, {
      tenantId: 'tenant-1', repositoryId: 'repository-1', candidateId: 'candidate-1',
      decision: 'supersede', targetIds: ['memory-1'],
    })).resolves.toBe(true);
    expect(statements.some((sql) => sql.includes("lifecycle = 'active'"))).toBe(true);
    expect(statements.some((sql) => sql.includes("lifecycle = 'superseded'"))).toBe(true);
  });
});
