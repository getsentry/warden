import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createWardenService } from '../app.js';
import { hashServiceToken } from '../tokens.js';
import type { DatabaseClient, WardenDatabase } from '../db/database.js';
import type { ServiceContext } from '../context.js';
import { updateReviewMemory } from './review.js';

const repository = { provider: 'github' as const, owner: 'acme', name: 'widgets', fullName: 'acme/widgets' };
const context: ServiceContext = { tenantId: '00000000-0000-4000-8000-000000000001', tokenId: '00000000-0000-4000-8000-000000000002', roles: ['read', 'ingest'], repositoryAllowlist: ['acme/widgets'] };
const id = '00000000-0000-4000-8000-000000000003';
const input = { repository, skill: 'security', content: 'Guard checks tenant ownership.', paths: ['src/auth.ts'], reason: 'Read the guard.' };
const content = `${input.content}\n\nSources: src/auth.ts`;
const row = { id, tenant_id: context.tenantId, repository_id: 'repo', version: 1, kind: 'review_guidance', lifecycle: 'active', content,
  content_hash: createHash('sha256').update(content).digest('hex'), skill: 'security', observed_at: '2026-09-24T00:00:00Z', created_at: '2026-09-24T00:00:00Z' };

function databaseFixture(current = row) {
  const calls: { sql: string; values: readonly unknown[] }[] = [];
  const client: DatabaseClient = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (sql.includes('FROM service_tokens')) return { rows: [{ id: context.tokenId, tenant_id: context.tenantId, token_hash: hashServiceToken('wds_public_secret'), roles: context.roles, repository_allowlist: context.repositoryAllowlist }], rowCount: 1 } as never;
      let source: Record<string, unknown> | undefined;
      if (sql.includes('from "repositories"')) source = { id: 'repo', tenant_id: context.tenantId, ...repository, full_name: repository.fullName, memory_enabled: true };
      if (sql.includes('from "memories"') || sql.startsWith('insert into "memories"')) source = current;
      if (sql.startsWith('update "memories"')) source = { ...current, version: 2, content: 'Guard removed.\n\nSources: src/auth.ts' };
      if (!source) return { rows: [], rowCount: 0 };
      // Emulate PostgreSQL column order at the real Drizzle database boundary.
      const selection = sql.includes(' returning ') ? sql.split(' returning ')[1] : sql.split(' from ')[0]?.slice(7);
      const names = [...(selection ?? '').matchAll(/"([^"]+)"/g)].map((match) => match[1] ?? '');
      return { rows: [Object.fromEntries(names.map((name) => [name, source?.[name] ?? null]))], rowCount: 1 } as never;
    },
  };
  const database = { query: client.query, withClient: async (fn: (db: DatabaseClient) => Promise<unknown>) => fn(client), transaction: async (fn: (db: DatabaseClient) => Promise<unknown>) => fn(client) } as WardenDatabase;
  return { database, calls };
}

describe('review memory updates', () => {
  it('creates a provisional note through the authenticated route', async () => {
    const { database } = databaseFixture();
    const response = await createWardenService({ database }).request('/api/v1/memory/update', {
      method: 'POST', headers: { authorization: 'Bearer wds_public_secret', 'content-type': 'application/json' }, body: JSON.stringify(input),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'saved', memory: { id, version: 1, content } });
  });

  it('preserves a caller-authored Sources paragraph when appending location metadata', async () => {
    const submitted = 'Guard checks ownership.\n\nSources: docs/security.md';
    const stored = `${submitted}\n\nSources: src/auth.ts`;
    const { database, calls } = databaseFixture({ ...row, content: stored,
      content_hash: createHash('sha256').update(stored).digest('hex') });
    expect(await updateReviewMemory(database, context, { ...input, content: submitted }))
      .toMatchObject({ status: 'saved', memory: { content: stored } });
    expect(calls.find(({ sql }) => sql.startsWith('insert into "memories"'))?.values).toContain(stored);
  });

  it('archives old content and support before correcting a note', async () => {
    const { database, calls } = databaseFixture();
    const response = await updateReviewMemory(database, context, { ...input, id, expectedVersion: 1, content: 'Guard removed.' });
    expect(response).toMatchObject({ status: 'saved', memory: { id, version: 2, content: 'Guard removed.\n\nSources: src/auth.ts' } });
    const revision = calls.find((call) => call.sql.startsWith('insert into "review_memory_revisions"'));
    expect(revision?.values.some((value) => typeof value === 'string' && value.includes(content.replaceAll('\n', '\\n')))).toBe(true);
    expect(calls.some((call) => call.sql.startsWith('delete from "memory_evidence"'))).toBe(true);
    expect(calls.some((call) => call.sql.startsWith('delete from "memory_embeddings"'))).toBe(true);
    const locked = calls.find((call) => call.sql.includes('for update'));
    expect(locked?.values).toEqual(expect.arrayContaining([context.tenantId, 'repo', id]));
  });

  it('returns the newer note without overwriting it on conflict', async () => {
    const { database, calls } = databaseFixture({ ...row, version: 2 });
    expect(await updateReviewMemory(database, context, { ...input, id, expectedVersion: 1, content: 'Another correction.' })).toMatchObject({ status: 'conflict', current: { version: 2 } });
    expect(calls.some((call) => call.sql.startsWith('update '))).toBe(false);
  });

  it('acknowledges an already-applied correction retried after a lost response', async () => {
    const { database, calls } = databaseFixture({ ...row, version: 2 });
    expect(await updateReviewMemory(database, context, { ...input, id, expectedVersion: 1 }))
      .toMatchObject({ status: 'saved', memory: { version: 2, content } });
    expect(calls.some((call) => call.sql.startsWith('update '))).toBe(false);
  });

  it('rejects another repository before touching the database', async () => {
    const { database, calls } = databaseFixture();
    expect(await updateReviewMemory(database, { ...context, repositoryAllowlist: ['other/repo'] }, input)).toEqual({ status: 'unavailable' });
    expect(calls).toHaveLength(0);
  });

  it('does not accumulate generated source suffixes on unchanged corrections', async () => {
    const { database, calls } = databaseFixture();
    expect(await updateReviewMemory(database, context, { ...input, id, expectedVersion: 1, content })).toMatchObject({ status: 'saved', memory: { version: 1 } });
    expect(calls.some((call) => call.sql.startsWith('update '))).toBe(false);
  });
});
