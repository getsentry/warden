import { describe, expect, it } from 'vitest';
import type { ServiceContext } from '../context.js';
import type { DatabaseClient, QueryResult, WardenDatabase } from '../db/database.js';
import {
  createMemory,
  getMemoryDetail,
  listMemories,
  MemoryIdempotencyConflictError,
  recallMemories,
  recordMemoryFeedback,
  transitionMemory,
} from './store.js';
import type { MemoryRelevanceCandidate } from './store.js';

const context: ServiceContext = {
  tenantId: '00000000-0000-0000-0000-000000000001',
  tokenId: '00000000-0000-0000-0000-000000000002',
  roles: ['read', 'ingest'],
  repositoryAllowlist: ['acme/widgets'],
};

function memoryRow(index: number, content = `Memory ${index}`) {
  return {
    id: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    version: 1,
    kind: 'convention',
    lifecycle: 'active',
    content,
    skill: 'security',
    language: 'typescript',
    path_family: 'src',
    created_at: new Date('2026-08-12T10:00:00.000Z'),
    observed_at: new Date('2026-08-12T10:00:00.000Z'),
    expires_at: null,
    provider: 'github',
    owner: 'acme',
    name: 'widgets',
    full_name: 'acme/widgets',
  };
}

function databaseFor(query: (sql: string, values: readonly unknown[]) => QueryResult<Record<string, unknown>>): WardenDatabase {
  const client: DatabaseClient = {
    async query(sql, values = []) { return query(sql, values) as never; },
  };
  return {
    query: client.query,
    async withClient<T>(operation: (connection: DatabaseClient) => Promise<T>) { return operation(client); },
    async transaction<T>(operation: (connection: DatabaseClient) => Promise<T>) { return operation(client); },
  } as unknown as WardenDatabase;
}

describe('memory store', () => {
  it('reuses an idempotency key only for the same repository and immutable memory', async () => {
    const statements: string[] = [];
    const database = databaseFor((sql) => {
      statements.push(sql);
      if (sql.includes('FROM repositories')) return { rows: [{
        id: 'repository-id', provider: 'github', owner: 'acme', name: 'widgets',
        full_name: 'acme/widgets', memory_enabled: true,
      }], rowCount: 1 };
      if (sql.includes('INSERT INTO memories')) return {
        rows: [{ id: memoryRow(1).id, created: true }], rowCount: 1,
      };
      if (sql.includes('SELECT m.*, repo.provider')) return { rows: [memoryRow(1)], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });

    await expect(createMemory(database, context, {
      repository: { provider: 'github', owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
      kind: 'convention',
      content: 'Memory 1',
      skill: 'security',
      idempotencyKey: 'admin-memory-1',
    })).resolves.toMatchObject({ id: memoryRow(1).id });
    const insert = statements.find((sql) => sql.includes('INSERT INTO memories')) ?? '';
    expect(insert).toContain('memories.repository_id = EXCLUDED.repository_id');
    expect(insert).toContain('memories.content_hash = EXCLUDED.content_hash');
    expect(insert).toContain('(xmax = 0) AS created');
  });

  it('rejects an idempotency key reused for different immutable memory', async () => {
    const database = databaseFor((sql) => {
      if (sql.includes('FROM repositories')) return { rows: [{
        id: 'repository-id', provider: 'github', owner: 'acme', name: 'widgets',
        full_name: 'acme/widgets', memory_enabled: true,
      }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });

    await expect(createMemory(database, context, {
      repository: { provider: 'github', owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
      kind: 'convention',
      content: 'Different content',
      idempotencyKey: 'admin-memory-1',
    })).rejects.toBeInstanceOf(MemoryIdempotencyConflictError);
  });

  it('recalls at most five active, unexpired repository memories', async () => {
    const statements: string[] = [];
    const database = databaseFor((sql, values) => {
      statements.push(sql);
      if (sql.includes('FROM repositories')) {
        expect(values[0]).toBe(context.tenantId);
        return { rows: [{
          id: 'repository-id',
          provider: 'github',
          owner: 'acme',
          name: 'widgets',
          full_name: 'acme/widgets',
          memory_enabled: true,
        }], rowCount: 1 };
      }
      if (sql.includes('FROM memory_recall_batches')) return { rows: [], rowCount: 0 };
      if (sql.includes('INSERT INTO memory_recall_batches')) return { rows: [{ id: 'batch-id' }], rowCount: 1 };
      if (sql.includes('INSERT INTO memory_recalls')) return { rows: [], rowCount: 0 };
      return { rows: Array.from({ length: 8 }, (_, index) => memoryRow(index + 1)), rowCount: 8 };
    });

    const response = await recallMemories(database, context, {
      protocolVersion: 1,
      clientRecallId: 'recall-123',
      repository: { provider: 'github', owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
      skills: ['security'],
      languages: ['typescript'],
      paths: ['src/query.ts'],
    });

    expect(response.memories).toHaveLength(5);
    expect(response.clientRecallId).toBe('recall-123');
    expect(statements.join('\n')).toContain("m.lifecycle = 'active'");
    expect(statements.join('\n')).toContain('m.expires_at > now()');
    expect(statements.join('\n')).toContain("to_tsvector('simple'");
    expect(statements.filter((statement) => statement.includes('INSERT INTO memory_recall_batches'))).toHaveLength(1);
    expect(statements.filter((statement) => statement.includes('INSERT INTO memory_recalls'))).toHaveLength(5);
  });

  it('returns no memory when repository memory is disabled', async () => {
    const database = databaseFor(() => ({ rows: [{
      id: 'repository-id',
      provider: 'github',
      owner: 'acme',
      name: 'widgets',
      full_name: 'acme/widgets',
      memory_enabled: false,
    }], rowCount: 1 }));

    await expect(recallMemories(database, context, {
      protocolVersion: 1,
      clientRecallId: 'recall-disabled',
      repository: { provider: 'github', owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
      skills: [],
      languages: [],
      paths: [],
    })).resolves.toEqual({ protocolVersion: 1, clientRecallId: 'recall-disabled', memories: [] });
  });

  it('uses compatible vector ranks and schedules stale embedding regeneration', async () => {
    const statements: string[] = [];
    let relevanceCandidates: readonly MemoryRelevanceCandidate[] = [];
    const database = databaseFor((sql) => {
      statements.push(sql);
      if (sql.includes('FROM repositories')) return { rows: [{
        id: 'repository-id', provider: 'github', owner: 'acme', name: 'widgets',
        full_name: 'acme/widgets', memory_enabled: true,
      }], rowCount: 1 };
      if (sql.includes('FROM memory_recall_batches')) return { rows: [], rowCount: 0 };
      if (sql.includes('FROM memory_embeddings me')) return { rows: [memoryRow(2), memoryRow(1)], rowCount: 2 };
      if (sql.includes("INSERT INTO jobs")) return { rows: [], rowCount: 1 };
      if (sql.includes('INSERT INTO memory_recall_batches')) return { rows: [{ id: 'batch-id' }], rowCount: 1 };
      if (sql.includes('INSERT INTO memory_recalls') || /SAVEPOINT|RELEASE/.test(sql)) return { rows: [], rowCount: 0 };
      return { rows: [memoryRow(1), memoryRow(2)], rowCount: 2 };
    });

    const response = await recallMemories(database, context, {
      protocolVersion: 1,
      clientRecallId: 'recall-vector',
      repository: { provider: 'github', owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
      skills: ['security'], languages: ['typescript'], paths: ['src/query.ts'],
    }, {
      embedding: {
        provider: 'example', model: 'embedding-v2', dimensions: 3,
        async embed() { return { vector: [0.1, 0.2, 0.3] }; },
      },
      relevance: {
        async classify(input) {
          relevanceCandidates = input.candidates;
          return { admittedIds: input.candidates.map((candidate) => candidate.id) };
        },
      },
    });

    expect(response.memories).toHaveLength(2);
    const vectorSql = statements.find((sql) => sql.includes('FROM memory_embeddings me')) ?? '';
    expect(vectorSql).toContain('me.content_hash = m.content_hash');
    expect(vectorSql).toContain('me.dimensions = $10');
    expect(statements.some((sql) => sql.includes("'memory_embed'"))).toBe(true);
    expect(relevanceCandidates[0]).toMatchObject({ pathFamily: 'src' });
    expect(relevanceCandidates[0]).not.toHaveProperty('path_family');
  });

  it('admits no memories when optional relevance classification fails or is uncertain', async () => {
    const memoryCounts: unknown[] = [];
    const database = databaseFor((sql, values) => {
      if (sql.includes('FROM repositories')) return { rows: [{
        id: 'repository-id', provider: 'github', owner: 'acme', name: 'widgets',
        full_name: 'acme/widgets', memory_enabled: true,
      }], rowCount: 1 };
      if (sql.includes('FROM memory_recall_batches')) return { rows: [], rowCount: 0 };
      if (sql.includes('INSERT INTO memory_recall_batches')) {
        memoryCounts.push(values[3]);
        return { rows: [{ id: `batch-${memoryCounts.length}` }], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO memory_recalls')) return { rows: [], rowCount: 0 };
      return { rows: [memoryRow(1)], rowCount: 1 };
    });
    const request = {
      protocolVersion: 1 as const,
      clientRecallId: 'recall-classifier',
      repository: { provider: 'github' as const, owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
      skills: ['security'], languages: ['typescript'], paths: ['src/query.ts'],
    };

    await expect(recallMemories(database, context, request, {
      relevance: { async classify() { throw new Error('private model response'); } },
    })).resolves.toMatchObject({ memories: [] });
    await expect(recallMemories(database, context, { ...request, clientRecallId: 'recall-uncertain' }, {
      relevance: { async classify() { return { admittedIds: [memoryRow(1).id], uncertain: true }; } },
    })).resolves.toMatchObject({ memories: [] });
    expect(memoryCounts).toEqual([0, 0]);
  });

  it('returns empty recall and excludes every inactive lifecycle and other repository in SQL', async () => {
    const statements: { sql: string; values: readonly unknown[] }[] = [];
    const database = databaseFor((sql, values) => {
      statements.push({ sql, values });
      if (sql.includes('FROM repositories')) return { rows: [{
        id: 'repository-id', provider: 'github', owner: 'acme', name: 'widgets',
        full_name: 'acme/widgets', memory_enabled: true,
      }], rowCount: 1 };
      if (sql.includes('FROM memory_recall_batches')) return { rows: [], rowCount: 0 };
      if (sql.includes('INSERT INTO memory_recall_batches')) return { rows: [{ id: 'batch-id' }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });

    await expect(recallMemories(database, context, {
      protocolVersion: 1,
      clientRecallId: 'recall-empty',
      repository: { provider: 'github', owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
      skills: [], languages: [], paths: [],
    })).resolves.toEqual({ protocolVersion: 1, clientRecallId: 'recall-empty', memories: [] });
    const recallQuery = statements.find((item) => item.sql.includes("m.lifecycle = 'active'"));
    expect(recallQuery?.sql).toContain('m.repository_id = $2');
    expect(recallQuery?.values[1]).toBe('repository-id');
    for (const inactive of ['candidate', 'superseded', 'archived', 'expired']) {
      expect(recallQuery?.sql).not.toContain(`m.lifecycle = '${inactive}'`);
    }
  });

  it('applies repository allowlists at the memory list store boundary', async () => {
    const database = databaseFor((sql, values) => {
      expect(sql).toContain('repo.full_name = ANY');
      expect(values).toContain(context.repositoryAllowlist);
      return { rows: [memoryRow(1)], rowCount: 1 };
    });

    await expect(listMemories(database, context)).resolves.toHaveLength(1);
  });

  it('loads authorized evidence and lifecycle history for memory detail', async () => {
    const database = databaseFor((sql) => {
      if (sql.includes('FROM memory_evidence')) return { rows: [{
        evidence_kind: 'finding_observation',
        finding_id: 'finding-1',
        observation_id: 'observation-1',
        created_at: new Date('2026-08-12T10:01:00.000Z'),
      }], rowCount: 1 };
      if (sql.includes('FROM memory_lifecycle_events')) return { rows: [{
        from_state: 'candidate',
        to_state: 'active',
        reason: 'approved',
        created_at: new Date('2026-08-12T10:02:00.000Z'),
      }], rowCount: 1 };
      return { rows: [memoryRow(1)], rowCount: 1 };
    });

    await expect(getMemoryDetail(database, context, memoryRow(1).id)).resolves.toMatchObject({
      memory: { id: memoryRow(1).id },
      evidence: [{ kind: 'finding_observation', findingId: 'finding-1', observationId: 'observation-1' }],
      lifecycle: [{ from: 'candidate', to: 'active', reason: 'approved' }],
    });
  });

  it('approves candidates and deactivates contradicted active memory without rewriting evidence', async () => {
    let lifecycle: 'candidate' | 'active' = 'candidate';
    const statements: string[] = [];
    const database = databaseFor((sql) => {
      statements.push(sql);
      if (sql.includes('UPDATE memories SET lifecycle') && sql.includes('archive_reason')) lifecycle = 'active';
      if (sql.includes('UPDATE memories SET') && sql.includes('contradiction_count')) lifecycle = 'candidate';
      if (sql.includes('SELECT m.*, repo.provider')) return {
        rows: [{ ...memoryRow(1), lifecycle }], rowCount: 1,
      };
      return { rows: [], rowCount: 0 };
    });

    await expect(transitionMemory(database, context, memoryRow(1).id, 'active', 'approved'))
      .resolves.toMatchObject({ lifecycle: 'active' });
    await expect(recordMemoryFeedback(database, context, memoryRow(1).id, 'contradict', 'Not applicable here'))
      .resolves.toMatchObject({ lifecycle: 'candidate' });
    expect(statements.some((sql) => sql.includes('INSERT INTO memory_feedback'))).toBe(true);
    expect(statements.some((sql) => sql.includes('UPDATE finding_observations'))).toBe(false);
  });
});
