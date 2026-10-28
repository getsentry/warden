import { describe, expect, it } from 'vitest';
import { createWardenService } from '../app.js';
import type { DatabaseClient, WardenDatabase } from '../db/database.js';
import { hashServiceToken } from '../tokens.js';

const tenantId = '00000000-0000-4000-8000-000000000001';
const tokenId = '00000000-0000-4000-8000-000000000002';

function personalTokenDatabase(tokenHash: string): WardenDatabase {
  return {
    async query() {
      throw new Error('route handler must not run');
    },
    async transaction<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T> {
      const client = {
        async query(text: string) {
          if (text.includes('SELECT id, tenant_id, token_hash')) {
            return {
              rows: [{
                id: tokenId,
                tenant_id: tenantId,
                token_hash: tokenHash,
                roles: ['admin'],
                repository_allowlist: null,
                credential_kind: 'personal',
                owner_subject: 'browser:owner',
              }],
              rowCount: 1,
            };
          }
          return { rows: [], rowCount: 1 };
        },
      } as unknown as DatabaseClient;
      return callback(client);
    },
  } as unknown as WardenDatabase;
}

describe('personal API token routes', () => {
  it('rejects a personal bearer token before mutation and token-management handlers', async () => {
    const token = 'wds_pat_public_secret';
    const database = personalTokenDatabase(hashServiceToken(token));
    const app = createWardenService({ database, sessionSecret: 's'.repeat(32) });
    const headers = { authorization: `Bearer ${token}` };

    expect((await app.request('/api/v1/memory/recall', { method: 'POST', headers })).status).toBe(403);
    expect((await app.request('/api/v1/personal-tokens', { headers })).status).toBe(403);
    expect((await app.request('/api/auth/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    })).status).toBe(401);

    const context = await app.request('/api/v1/auth/context', { headers });
    expect(context.status).toBe(200);
    await expect(context.json()).resolves.toMatchObject({
      roles: ['read'],
      credentialKind: 'personal',
      canManagePersonalTokens: false,
    });
  });

  it('creates a token for an authenticated browser identity and returns it once', async () => {
    const createdAt = new Date('2026-08-13T10:00:00.000Z');
    const values: unknown[][] = [];
    const database = {
      async query(_text: string, queryValues?: readonly unknown[]) {
        values.push([...(queryValues ?? [])]);
        return { rows: [{ id: tokenId, created_at: createdAt }], rowCount: 1 };
      },
    } as unknown as WardenDatabase;
    const app = createWardenService({
      database,
      sessionOrigin: 'https://warden.example',
      dashboardAuth: {
        async authenticate() {
          return {
            tenantId,
            tokenId: null,
            roles: ['read'],
            repositoryAllowlist: null,
            credentialKind: 'browser',
            principalSubject: 'browser:owner-1234567890',
          };
        },
      },
    });

    const response = await app.request('http://internal.vercel/api/v1/personal-tokens', {
      method: 'POST',
      headers: { origin: 'https://warden.example', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Codex' }),
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ id: tokenId, name: 'Codex', tokenSuffix: expect.any(String) });
    expect(body.token).toMatch(/^wds_pat_/);
    expect(values.flat()).not.toContain(body.token);
    expect(values.flat()).toContain('browser:owner-1234567890');

    const crossOrigin = await app.request('http://internal.vercel/api/v1/personal-tokens', {
      method: 'POST',
      headers: { origin: 'https://attacker.example', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Blocked' }),
    });
    expect(crossOrigin.status).toBe(403);
  });
});
