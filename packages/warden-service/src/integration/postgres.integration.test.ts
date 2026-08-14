import { randomUUID } from 'node:crypto';
import { neonConfig } from '@neondatabase/serverless';
import type { CodeRunEnvelope, FindingsRunEnvelope, MetricsRunEnvelope } from '@sentry/warden-service-api';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createWardenService } from '../app.js';
import type { ServiceContext } from '../context.js';
import { createDatabase, type DatabaseDriver, type WardenDatabase } from '../db/database.js';
import { migrateDatabase } from '../db/migrations.js';
import { getRunDetail } from '../history/store.js';
import { createMemory } from '../memory/store.js';
import { ingestRun } from '../runs/ingest.js';
import type { RunIngestionError } from '../runs/ingest.js';
import { createTenant } from '../tenants.js';
import {
  authenticateServiceToken,
  createPersonalToken,
  createServiceToken,
  revokePersonalToken,
  revokeServiceToken,
} from '../tokens.js';

const neonWebSocketProxy = process.env['WARDEN_TEST_NEON_WS_PROXY'];
if (neonWebSocketProxy) {
  neonConfig.wsProxy = neonWebSocketProxy;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineConnect = false;
}

function counts(total = 0) {
  return { total, bySeverity: { high: total, medium: 0, low: 0 } };
}

function metricsEnvelope(clientRunId: string, fullName = 'acme/widgets'): MetricsRunEnvelope {
  const [owner, name] = fullName.split('/') as [string, string];
  return {
    protocolVersion: 1,
    clientRunId,
    source: 'action',
    wardenVersion: '1.2.3',
    dataProfile: 'metrics',
    startedAt: '2026-08-12T10:00:00.000Z',
    completedAt: '2026-08-12T10:00:03.000Z',
    outcome: 'success',
    repository: { provider: 'github', owner, name, fullName },
    features: { memory: false },
    findingCounts: counts(),
    skills: [{
      executionId: 'skill-security', skill: 'security', status: 'success', findingCounts: counts(),
      model: 'example-model', runtime: 'example-runtime',
      usage: [
        { lane: 'scan', inputTokens: 100, outputTokens: 20, costUsd: 0.01, costBasis: 'reported' },
        { lane: 'verification', inputTokens: 10, outputTokens: 2, costUsd: null, costBasis: 'unknown' },
      ],
    }, {
      executionId: 'skill-performance', skill: 'performance', status: 'success', findingCounts: counts(),
      usage: [{ lane: 'dedup', inputTokens: 5, outputTokens: 1, costUsd: 0.001, costBasis: 'reported' }],
    }],
  };
}

function findingsEnvelope(clientRunId: string): FindingsRunEnvelope {
  return {
    ...metricsEnvelope(clientRunId),
    dataProfile: 'findings',
    features: { memory: true },
    findingCounts: counts(1),
    skills: [{
      ...metricsEnvelope(clientRunId).skills[0]!,
      findingCounts: counts(1),
    }],
    findings: [{
      id: 'finding-1', skillExecutionId: 'skill-security', severity: 'high',
      title: 'Unsafe sink', description: 'Untrusted input reaches a sensitive sink.',
      location: { path: 'src/query.ts', startLine: 10 },
    }],
    observations: [{
      findingId: 'finding-1', skillExecutionId: 'skill-security', outcome: 'resolved',
      observedAt: '2026-08-12T10:05:00.000Z',
    }],
  };
}

function codeEnvelope(clientRunId: string): CodeRunEnvelope {
  return {
    ...findingsEnvelope(clientRunId),
    dataProfile: 'code',
    features: { memory: true },
    findings: [{
      ...findingsEnvelope(clientRunId).findings[0]!,
      sourceEvidence: {
        path: 'src/query.ts', language: 'typescript', startLine: 10, endLine: 10,
        targetStartLine: 10, targetEndLine: 10, content: 'sink(userInput)',
      },
    }],
  };
}

function defineDriverIntegration(driver: DatabaseDriver, environmentName: string): void {
  const url = process.env[environmentName];
  describe.skipIf(!url)(`${driver} Postgres integration`, () => {
    let database: WardenDatabase;
    const tenantIds: string[] = [];

    beforeAll(async () => {
      database = createDatabase({ url: url!, driver, maxConnections: 3, statementTimeoutMs: 15_000 });
      const statuses = await Promise.all([migrateDatabase(database), migrateDatabase(database)]);
      expect(statuses.every((status) => status.ready)).toBe(true);
    }, 60_000);

    afterAll(async () => {
      if (tenantIds.length > 0) await database.query('DELETE FROM tenants WHERE id = ANY($1::uuid[])', [tenantIds]);
      await database.close();
    });

    it('enforces token expiry, revocation, roles, allowlists, tenant isolation, and guessed IDs', async () => {
      const tenantA = await createTenant(database, { slug: `tenant-a-${randomUUID()}`, name: 'Tenant A' });
      const tenantB = await createTenant(database, { slug: `tenant-b-${randomUUID()}`, name: 'Tenant B' });
      tenantIds.push(tenantA, tenantB);
      const expired = await createServiceToken(database, {
        tenantId: tenantA, name: 'Expired', roles: ['ingest'], expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      });
      expect(await authenticateServiceToken(database, expired.token)).toBeNull();

      const active = await createServiceToken(database, {
        tenantId: tenantA, name: 'Scoped', roles: ['ingest'], repositoryAllowlist: ['acme/widgets'],
      });
      const authority = await authenticateServiceToken(database, active.token);
      expect(authority).toMatchObject({ tenantId: tenantA, roles: ['ingest'] });
      const contextA = authority!;
      await expect(ingestRun(database, contextA, metricsEnvelope(`forbidden-${randomUUID()}`, 'acme/other')))
        .rejects.toMatchObject({ code: 'repository_forbidden' });
      const reader = await createServiceToken(database, { tenantId: tenantA, name: 'Reader', roles: ['read'] });
      const roleDenied = await createWardenService({ database }).request('/api/v1/runs', {
        method: 'POST', headers: { authorization: `Bearer ${reader.token}` },
      });
      expect(roleDenied.status).toBe(403);

      const contextB: ServiceContext = { tenantId: tenantB, tokenId: randomUUID(), roles: ['admin'], repositoryAllowlist: null };
      const runA = await ingestRun(database, contextA, metricsEnvelope(`run-a-${randomUUID()}`));
      const runB = await ingestRun(database, contextB, metricsEnvelope(`run-b-${randomUUID()}`));
      expect(await getRunDetail(database, contextA, runB.runId)).toBeNull();
      expect(await getRunDetail(database, contextB, runA.runId)).toBeNull();

      const admin = await createServiceToken(database, { tenantId: tenantA, name: 'Admin', roles: ['admin'] });
      const adminContext = await authenticateServiceToken(database, admin.token);
      if (!adminContext) throw new Error('admin token did not authenticate');
      const personal = await createPersonalToken(database, {
        tenantId: tenantA,
        ownerSubject: adminContext.principalSubject!,
        name: 'Agent read access',
      });
      expect(await authenticateServiceToken(database, personal.token)).toMatchObject({
        tenantId: tenantA,
        roles: ['read'],
        credentialKind: 'personal',
      });
      const personalWrite = await createWardenService({ database }).request('/api/v1/memory/recall', {
        method: 'POST',
        headers: { authorization: `Bearer ${personal.token}` },
      });
      expect(personalWrite.status).toBe(403);
      expect(await revokePersonalToken(database, adminContext, personal.id)).toBe(true);
      expect(await authenticateServiceToken(database, personal.token)).toBeNull();
      expect(await revokeServiceToken(database, adminContext, active.id)).toBe(true);
      expect(await authenticateServiceToken(database, active.token)).toBeNull();
    }, 30_000);

    it('persists every profile, multi-skill lanes and early failures, and rolls back invalid references', async () => {
      const tenantId = await createTenant(database, { slug: `ingest-${randomUUID()}`, name: 'Ingestion Tenant' });
      tenantIds.push(tenantId);
      const admin = await createServiceToken(database, { tenantId, name: 'Admin', roles: ['admin'] });
      const context = await authenticateServiceToken(database, admin.token);
      if (!context) throw new Error('admin token did not authenticate');
      const metrics = metricsEnvelope(`metrics-${randomUUID()}`);
      const stored = await ingestRun(database, context, metrics);
      expect((await ingestRun(database, context, metrics)).created).toBe(false);
      await expect(ingestRun(database, context, { ...metrics, outcome: 'failure' }))
        .rejects.toMatchObject({ code: 'checksum_conflict' } satisfies Partial<RunIngestionError>);

      await ingestRun(database, context, findingsEnvelope(`findings-${randomUUID()}`));
      const code = await ingestRun(database, context, codeEnvelope(`code-${randomUUID()}`));
      await ingestRun(database, context, metricsEnvelope(`memory-disabled-${randomUUID()}`));
      const detail = await getRunDetail(database, context, stored.runId);
      expect(detail?.skills).toHaveLength(2);
      expect(detail?.skills.flatMap((skill) => skill.usage).map((usage) => usage.lane).sort()).toEqual(['dedup', 'scan', 'verification']);
      expect(await database.query('SELECT 1 FROM findings WHERE tenant_id = $1 AND run_id = $2 AND source_evidence IS NOT NULL', [tenantId, code.runId]))
        .toMatchObject({ rowCount: 1 });
      expect(await database.query('SELECT memory_enabled FROM repositories WHERE tenant_id = $1 AND full_name = $2', [tenantId, 'acme/widgets']))
        .toMatchObject({ rows: [{ memory_enabled: true }] });

      const idempotencyKey = `memory-${randomUUID()}`;
      const memoryInput = {
        repository: { provider: 'github' as const, owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
        kind: 'convention' as const,
        content: 'Use parameterized queries.',
        idempotencyKey,
      };
      const firstMemory = await createMemory(database, context, memoryInput);
      const replayedMemory = await createMemory(database, context, memoryInput);
      expect(replayedMemory?.id).toBe(firstMemory?.id);
      const lifecycle = await database.query(`
        SELECT COUNT(*)::integer AS count
        FROM memory_lifecycle_events mle
        JOIN memories m ON m.id = mle.memory_id AND m.tenant_id = mle.tenant_id
        WHERE m.tenant_id = $1 AND m.idempotency_key = $2 AND mle.reason = 'admin_create'
      `, [tenantId, idempotencyKey]);
      expect(lifecycle.rows[0]).toMatchObject({ count: 1 });
      await expect(createMemory(database, context, {
        ...memoryInput,
        content: 'Different immutable content.',
      })).rejects.toThrow('memory_idempotency_conflict');

      await ingestRun(database, context, {
        ...metricsEnvelope(`early-${randomUUID()}`), outcome: 'failure', skills: [],
      });
      const invalidId = `rollback-${randomUUID()}`;
      const invalid = {
        ...findingsEnvelope(invalidId),
        findings: [{ ...findingsEnvelope(invalidId).findings[0]!, skillExecutionId: 'missing-skill' }],
      };
      await expect(ingestRun(database, context, invalid)).rejects.toThrow();
      const rolledBack = await database.query('SELECT 1 FROM runs WHERE tenant_id = $1 AND client_run_id = $2', [tenantId, invalidId]);
      expect(rolledBack.rowCount).toBe(0);
    }, 30_000);
  });
}

defineDriverIntegration('postgres', 'WARDEN_TEST_POSTGRES_URL');
defineDriverIntegration('neon', 'WARDEN_TEST_NEON_URL');

describe.skipIf(!process.env['WARDEN_TEST_POSTGRES_URL'])('Postgres query plans', () => {
  it('uses tenant/history, usage, full-text memory, and job claim indexes', async () => {
    const database = createDatabase({ url: process.env['WARDEN_TEST_POSTGRES_URL']!, driver: 'postgres' });
    await migrateDatabase(database);
    const tenantId = await createTenant(database, { slug: `plans-${randomUUID()}`, name: 'Plan Tenant' });
    const token = await createServiceToken(database, { tenantId, name: 'Plan admin', roles: ['admin'] });
    const context = (await authenticateServiceToken(database, token.token))!;
    await ingestRun(database, context, findingsEnvelope(`plans-${randomUUID()}`));
    await createMemory(database, context, {
      repository: { provider: 'github', owner: 'acme', name: 'widgets', fullName: 'acme/widgets' },
      kind: 'convention', content: 'Use parameterized queries.', skill: 'security',
      idempotencyKey: `plan-memory-${tenantId}`,
    });
    try {
      await database.withClient(async (client) => {
        await client.query('SET enable_seqscan = off');
        for (const [sql, indexName, values] of [
          ['SELECT * FROM runs WHERE tenant_id = $1 ORDER BY completed_at DESC LIMIT 10', 'runs_tenant_completed_idx', [tenantId]],
          ["SELECT * FROM usage_line_items WHERE tenant_id = $1 AND lane = 'scan'", 'usage_tenant_dimensions_idx', [tenantId]],
          ["SELECT * FROM memories WHERE to_tsvector('simple', search_document) @@ plainto_tsquery('simple', 'security')", 'memories_search_idx', []],
          ["SELECT id FROM jobs WHERE state IN ('pending', 'retry') AND next_attempt_at <= now() ORDER BY next_attempt_at LIMIT 10", 'jobs_claim_idx', []],
        ] as const) {
          const plan = await client.query<{ 'QUERY PLAN': unknown }>(`EXPLAIN (FORMAT JSON) ${sql}`, values);
          expect(JSON.stringify(plan.rows)).toContain(indexName);
        }
      });
    } finally {
      await database.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
      await database.close();
    }
  }, 30_000);
});
