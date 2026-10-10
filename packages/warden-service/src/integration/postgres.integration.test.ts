import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { neonConfig } from '@neondatabase/serverless';
import type { CodeRunEnvelope, FindingsRunEnvelope, MetricsRunEnvelope } from '@sentry/warden-service-api';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createWardenService } from '../app.js';
import type { ServiceContext } from '../context.js';
import { createDatabase, type DatabaseDriver, type WardenDatabase } from '../db/database.js';
import { migrateDatabase } from '../db/migrations.js';
import {
  aggregateCostBreakdowns,
  aggregateCosts,
  getFindingDetail,
  getRunDetail,
  listFindings,
  listHistoryDimensions,
  listRepositories,
  listRuns,
  listSkills,
  summarizeOutcomes,
} from '../history/store.js';
import { createMemory } from '../memory/store.js';
import { persistPassiveMemoryCandidate } from '../memory/passive-store.js';
import type { PassiveEvidence } from '../memory/passive.js';
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
      verification: '- `handleRequest` passes user input to `query`.\n- The sink accepts the input without validation.',
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

function shortFindingEnvelope(
  title: string,
  completedAt = '2026-08-12T12:00:00.000Z',
  fullName = 'acme/widgets',
  reported = true,
): FindingsRunEnvelope {
  const base = findingsEnvelope(`short-${randomUUID()}`);
  const [owner, name] = fullName.split('/') as [string, string];
  return {
    ...base,
    completedAt,
    repository: { provider: 'github', owner, name, fullName },
    findings: [{
      ...base.findings[0]!,
      id: reported ? 'HID-DEN' : '7MV-5V7',
      ...(reported ? { reportedId: '7MV-5V7' } : {}),
      title,
    }],
    observations: [],
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

    it('keeps short URLs tied to one finding across repeats, repositories, and tenants', async () => {
      const tenantA = await createTenant(database, { slug: `short-a-${randomUUID()}`, name: 'Short ID Tenant A' });
      const tenantB = await createTenant(database, { slug: `short-b-${randomUUID()}`, name: 'Short ID Tenant B' });
      tenantIds.push(tenantA, tenantB);
      const contextA: ServiceContext = { tenantId: tenantA, tokenId: randomUUID(), roles: ['admin'], repositoryAllowlist: null };
      const contextB = { ...contextA, tenantId: tenantB };
      const first = await ingestRun(database, contextA, shortFindingEnvelope('Original finding', '2026-08-12T11:00:00.000Z', 'acme/widgets', false));
      const original = await getFindingDetail(database, contextA, '7MV-5V7');
      expect(original?.finding.title).toBe('Original finding');
      const repeated = shortFindingEnvelope('Repeated finding');
      await ingestRun(database, contextA, repeated);
      expect((await ingestRun(database, contextA, repeated)).created).toBe(false);
      await ingestRun(database, contextA, shortFindingEnvelope('Other repository', '2026-08-12T13:00:00.000Z', 'acme/other'));
      await ingestRun(database, contextB, shortFindingEnvelope('Other tenant'));

      expect((await getFindingDetail(database, contextA, '7MV-5V7'))?.finding.id).toBe(original!.finding.id);
      expect((await getFindingDetail(database, contextA, '7MV-5V7-2'))?.finding.title).toBe('Repeated finding');
      expect((await getFindingDetail(database, contextA, '7MV-5V7-3'))?.finding.title).toBe('Other repository');
      expect((await getFindingDetail(database, contextB, '7MV-5V7'))?.finding.title).toBe('Other tenant');
      expect(await getFindingDetail(database, contextB, original!.finding.id)).toBeNull();
      const scoped = { ...contextA, repositoryAllowlist: ['acme/widgets'] };
      expect(await getFindingDetail(database, scoped, '7MV-5V7-3')).toBeNull();
      expect(await getFindingDetail(database, scoped, 'HID-DEN')).toBeNull();
      expect(await getFindingDetail(database, { ...contextA, repositoryAllowlist: ['acme/unavailable'] }, '7MV-5V7')).toBeNull();

      await Promise.all(Array.from({ length: 3 }, (_, i) =>
        ingestRun(database, contextA, shortFindingEnvelope(`Concurrent finding ${i}`)),
      ));
      const page = await listFindings(database, contextA, {});
      expect(new Set(page.items.map((item) => item.displayId)).size).toBe(6);
      for (const item of page.items) {
        expect((await getFindingDetail(database, contextA, item.displayId))?.finding.id).toBe(item.id);
      }

      const app = createWardenService({
        database,
        disableAuth: { tenantId: tenantA },
        dashboard: { html: '<!doctype html><title>Warden</title>', script: '', stylesheet: '' },
      });
      const uuidResponse = await app.request(`/api/v1/findings/${original!.finding.id}`);
      await expect(uuidResponse.json()).resolves.toMatchObject({ finding: { id: original!.finding.id, displayId: '7MV-5V7' } });
      const redirect = await app.request(`/findings/${original!.finding.id}?range=7&severity=high`);
      expect(redirect.status).toBe(302);
      expect(redirect.headers.get('location')).toBe('/findings/7MV-5V7?range=7&severity=high');
      expect((await app.request(redirect.headers.get('location')!)).headers.get('content-type')).toContain('text/html');
      const scopedToken = await createServiceToken(database, {
        tenantId: tenantA, name: 'Scoped reader', roles: ['read'], repositoryAllowlist: ['acme/widgets'],
      });
      const restrictedApp = createWardenService({ database });
      const headers = { authorization: `Bearer ${scopedToken.token}` };
      await expect((await restrictedApp.request('/api/v1/findings/7MV-5V7-2', { headers })).json())
        .resolves.toMatchObject({ finding: { title: 'Repeated finding', displayId: '7MV-5V7-2' } });
      expect((await restrictedApp.request('/api/v1/findings/7MV-5V7-3', { headers })).status).toBe(404);
      expect((await app.request('/api/v1/findings/ZZZ-ZZZ')).status).toBe(404);

      await database.query('DELETE FROM runs WHERE tenant_id = $1 AND id = $2', [tenantA, first.runId]);
      await ingestRun(database, contextA, shortFindingEnvelope('After retention'));
      expect(await getFindingDetail(database, contextA, '7MV-5V7')).toBeNull();
      expect((await getFindingDetail(database, contextA, '7MV-5V7-7'))?.finding.title).toBe('After retention');
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

    it('executes typed Drizzle history reads against PostgreSQL', async () => {
      const tenantId = await createTenant(database, {
        slug: `history-${randomUUID()}`,
        name: 'History Tenant',
      });
      tenantIds.push(tenantId);
      const reader = await createServiceToken(database, {
        tenantId,
        name: 'History reader',
        roles: ['ingest', 'read'],
      });
      const context = await authenticateServiceToken(database, reader.token);
      if (!context) throw new Error('history token did not authenticate');
      const stored = await ingestRun(database, context, findingsEnvelope(`history-${randomUUID()}`));

      await expect(listRuns(database, context, {})).resolves.toMatchObject({
        items: [{ id: stored.runId, repository: { fullName: 'acme/widgets' }, costUsd: 0.01 }],
      });
      const findingPage = await listFindings(database, context, { query: 'unsafe' });
      expect(findingPage.items).toHaveLength(1);
      await expect(getFindingDetail(database, context, findingPage.items[0]!.id)).resolves.toMatchObject({
        finding: { title: 'Unsafe sink', outcome: 'resolved' },
        verification: '- `handleRequest` passes user input to `query`.\n- The sink accepts the input without validation.',
      });
      await expect(listRepositories(database, context)).resolves.toMatchObject({
        items: [{ repository: { fullName: 'acme/widgets' }, runs: 1, findings: 1, costUsd: 0.01 }],
      });
      await expect(listSkills(database, context)).resolves.toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({ skill: 'security', executions: 1 }),
        ]),
      });
      await expect(listHistoryDimensions(database, context)).resolves.toMatchObject({
        repositories: [{ repository: { fullName: 'acme/widgets' } }],
        skills: expect.arrayContaining(['security']),
      });
      await expect(summarizeOutcomes(database, context, {})).resolves.toMatchObject({
        totals: { runs: 1, successful: 1, findings: 1, costUsd: 0.01 },
      });
      await expect(aggregateCosts(database, context, {}, ['repository', 'skill'])).resolves.toMatchObject({
        groups: expect.arrayContaining([
          expect.objectContaining({ dimensions: { repository: 'acme/widgets', skill: 'security' } }),
        ]),
        totals: { runs: 1, inputTokens: 110, outputTokens: 22, costUsd: 0.01 },
      });
      await expect(aggregateCostBreakdowns(database, context, {}, ['day', 'repository', 'skill'])).resolves.toMatchObject({
        breakdowns: [
          { dimension: 'day', groups: expect.any(Array) },
          { dimension: 'repository', groups: expect.any(Array) },
          { dimension: 'skill', groups: expect.any(Array) },
        ],
      });
    }, 30_000);

    it('persists multiple passive evidence rows in one transaction', async () => {
      const tenantId = await createTenant(database, { slug: `evidence-${randomUUID()}`, name: 'Evidence Tenant' });
      tenantIds.push(tenantId);
      const token = await createServiceToken(database, { tenantId, name: 'Admin', roles: ['admin'] });
      const context = await authenticateServiceToken(database, token.token);
      if (!context) throw new Error('admin token did not authenticate');
      const first = await ingestRun(database, context, findingsEnvelope(`evidence-a-${randomUUID()}`));
      const second = await ingestRun(database, context, findingsEnvelope(`evidence-b-${randomUUID()}`));
      const stored = await database.query<{
        repository_id: string;
        finding_id: string;
        observation_id: string;
        run_id: string;
        skill: string;
        title: string;
        description: string;
        outcome: PassiveEvidence['outcome'];
        observed_at: Date;
      }>(`
        SELECT r.repository_id, f.id AS finding_id, fo.id AS observation_id,
          r.id AS run_id, se.skill, f.title, f.description, fo.outcome, fo.observed_at
        FROM finding_observations fo
        JOIN findings f ON f.id = fo.finding_id AND f.tenant_id = fo.tenant_id
        JOIN runs r ON r.id = fo.run_id AND r.tenant_id = fo.tenant_id
        JOIN skill_executions se ON se.id = f.skill_execution_id AND se.tenant_id = f.tenant_id
        WHERE fo.tenant_id = $1 AND r.id = ANY($2::uuid[])
        ORDER BY r.id
      `, [tenantId, [first.runId, second.runId]]);
      const source = stored.rows.map((row): PassiveEvidence => ({
        findingId: row.finding_id,
        observationId: row.observation_id,
        runId: row.run_id,
        skill: row.skill,
        title: row.title,
        description: row.description,
        outcome: row.outcome,
        observedAt: row.observed_at.toISOString(),
      }));
      const memory = await persistPassiveMemoryCandidate(database, {
        tenantId,
        repositoryId: stored.rows[0]!.repository_id,
        proposal: {
          kind: 'confirmed_pattern',
          content: 'Use parameterized queries for user-controlled values.',
          evidenceIds: source.map((item) => item.observationId),
          skill: 'security',
          confidence: 0.9,
        },
        evidence: source,
        modelVersion: 'integration-test',
      });

      expect(memory).toMatchObject({ created: true });
      const evidenceRows = await database.query<{ count: number }>(
        'SELECT count(*)::integer AS count FROM memory_evidence WHERE tenant_id = $1 AND memory_id = $2',
        [tenantId, memory!.id],
      );
      expect(evidenceRows.rows[0]?.count).toBe(2);
    }, 30_000);
  });
}

defineDriverIntegration('postgres', 'WARDEN_TEST_POSTGRES_URL');
defineDriverIntegration('neon', 'WARDEN_TEST_NEON_URL');

describe.skipIf(!process.env['WARDEN_TEST_POSTGRES_URL'])('Finding URL migration', () => {
  it('backfills existing findings and accepts writes from the previous deployment', async () => {
    const server = createDatabase({ url: process.env['WARDEN_TEST_POSTGRES_URL']!, driver: 'postgres' });
    const name = `warden_short_urls_${randomUUID().replaceAll('-', '')}`;
    const url = new URL(process.env['WARDEN_TEST_POSTGRES_URL']!);
    url.pathname = `/${name}`;
    let legacy: WardenDatabase | undefined;
    try {
      await server.query(`CREATE DATABASE "${name}"`);
      legacy = createDatabase({ url: url.toString(), driver: 'postgres' });
      const directory = new URL('../../drizzle/', import.meta.url);
      await legacy.query('CREATE TABLE _warden_service_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
      const files = (await readdir(directory)).filter((file) => /^000[0-7]_.*\.sql$/.test(file)).sort();
      for (const file of files) {
        await legacy.query(await readFile(new URL(file, directory), 'utf8'));
        await legacy.query('INSERT INTO _warden_service_migrations (version) VALUES ($1)', [file.replace(/\.sql$/, '')]);
      }
      const tenantId = await createTenant(legacy, { slug: 'migration', name: 'Migration Tenant' });
      const context: ServiceContext = { tenantId, tokenId: randomUUID(), roles: ['admin'], repositoryAllowlist: null };
      const older = await ingestRun(legacy, context, shortFindingEnvelope('Older finding', '2026-08-12T11:00:00.000Z', 'acme/widgets', false));
      const newer = await ingestRun(legacy, context, shortFindingEnvelope('Newer finding'));
      const fallback = await ingestRun(legacy, context, findingsEnvelope('no-reported-code'));
      expect((await migrateDatabase(legacy)).ready).toBe(true);
      const items = (await listFindings(legacy, context, {})).items;
      expect(items.find((item) => item.runId === older.runId)?.displayId).toBe('7MV-5V7-2');
      expect(items.find((item) => item.runId === newer.runId)?.displayId).toBe('7MV-5V7');
      const withoutCode = items.find((item) => item.runId === fallback.runId)!;
      expect(withoutCode.displayId).toMatch(/^[A-F0-9]{3}-[A-F0-9]{3}$/);
      expect((await getFindingDetail(legacy, context, withoutCode.displayId))?.finding.id).toBe(withoutCode.id);

      // Ingestion still uses the previous INSERT shape, without a short_id column.
      await ingestRun(legacy, context, shortFindingEnvelope('Old deployment write'));
      expect((await getFindingDetail(legacy, context, '7MV-5V7-3'))?.finding.title).toBe('Old deployment write');
      expect((await getFindingDetail(legacy, context, '7MV-5V7'))?.finding.runId).toBe(newer.runId);
      expect((await getFindingDetail(legacy, context, '7MV-5V7-2'))?.finding.runId).toBe(older.runId);
    } finally {
      await legacy?.close();
      await server.query(`DROP DATABASE IF EXISTS "${name}"`);
      await server.close();
    }
  }, 30_000);
});

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
