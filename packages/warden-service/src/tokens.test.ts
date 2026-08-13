import { describe, expect, it } from 'vitest';
import type { WardenDatabase } from './db/database.js';
import {
  createPersonalToken,
  createServiceToken,
  hashServiceToken,
  listServiceTokens,
  revokeServiceToken,
} from './tokens.js';

describe('service tokens', () => {
  it('creates a one-time prefixed token while sending only its hash to storage', async () => {
    let storedValues: readonly unknown[] = [];
    const database = {
      async query(_text: string, values?: readonly unknown[]) {
        storedValues = values ?? [];
        return { rows: [{ id: 'token-id' }], rowCount: 1 };
      },
    } as unknown as WardenDatabase;

    const created = await createServiceToken(database, {
      tenantId: '00000000-0000-0000-0000-000000000001',
      name: 'CI',
      roles: ['ingest'],
      repositoryAllowlist: ['acme/widgets'],
    });

    expect(created.token).toMatch(/^wds_[A-Za-z0-9_-]+_[A-Za-z0-9_-]+$/);
    expect(storedValues).not.toContain(created.token);
    expect(storedValues).toContain(hashServiceToken(created.token));
    expect(hashServiceToken(created.token)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('creates a 90-day read-only personal token without storing its plaintext value', async () => {
    let storedValues: readonly unknown[] = [];
    const now = new Date('2026-08-13T10:00:00.000Z');
    const database = {
      async query(_text: string, values?: readonly unknown[]) {
        storedValues = values ?? [];
        return { rows: [{ id: '00000000-0000-4000-8000-000000000009', created_at: now }], rowCount: 1 };
      },
    } as unknown as WardenDatabase;

    const created = await createPersonalToken(database, {
      tenantId: '00000000-0000-4000-8000-000000000001',
      ownerSubject: 'browser:owner-1234567890',
      name: 'Local agent',
      now,
    });

    expect(created.token).toMatch(/^wds_pat_[A-Za-z0-9_-]+_[A-Za-z0-9_-]+$/);
    expect(created.expiresAt).toBe('2026-11-11T10:00:00.000Z');
    expect(storedValues).not.toContain(created.token);
    expect(storedValues).toContain(hashServiceToken(created.token));
    expect(storedValues).toContain('browser:owner-1234567890');
  });

  it('lists safe metadata and revokes tokens only for tenant-wide administrators', async () => {
    const statements: string[] = [];
    const database = {
      async query(text: string) {
        statements.push(text);
        if (text.includes('SELECT id, name, prefix')) return { rows: [{
          id: 'token-id',
          name: 'CI',
          prefix: 'wds_public',
          roles: ['ingest'],
          repository_allowlist: ['acme/widgets'],
          expires_at: null,
          revoked_at: null,
          last_used_at: null,
          created_at: new Date('2026-08-12T10:00:00.000Z'),
        }], rowCount: 1 };
        return { rows: [], rowCount: 1 };
      },
    } as unknown as WardenDatabase;
    const context = {
      tenantId: 'tenant-id', tokenId: 'admin-id', roles: ['admin'] as const, repositoryAllowlist: null,
    };

    await expect(listServiceTokens(database, context)).resolves.toEqual([expect.objectContaining({
      id: 'token-id', prefix: 'wds_public', roles: ['ingest'],
    })]);
    await expect(revokeServiceToken(database, context, 'token-id')).resolves.toBe(true);
    expect(JSON.stringify(statements)).not.toMatch(/token_hash|secret/i);

    const restricted = { ...context, repositoryAllowlist: ['acme/widgets'] };
    await expect(listServiceTokens(database, restricted)).resolves.toEqual([]);
    await expect(revokeServiceToken(database, restricted, 'token-id')).resolves.toBe(false);

    const reader = { ...context, roles: ['read'] as const };
    await expect(listServiceTokens(database, reader)).resolves.toEqual([]);
    await expect(revokeServiceToken(database, reader, 'token-id')).resolves.toBe(false);
  });
});
