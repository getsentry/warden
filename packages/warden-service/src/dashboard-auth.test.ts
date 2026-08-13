import { describe, expect, it } from 'vitest';
import { createWardenService } from './app.js';
import type { DatabaseClient, QueryResult, WardenDatabase } from './db/database.js';
import { hashServiceToken } from './tokens.js';

const token = 'wds_public_secret';
const tokenId = '00000000-0000-4000-8000-000000000002';

function result<TRow extends Record<string, unknown>>(rows: TRow[]): QueryResult<TRow> {
  return { rows, rowCount: rows.length };
}

function sessionDatabase(repositoryAllowlist: string[] | null = null) {
  let revoked = false;
  const client: DatabaseClient = {
    async query<TRow extends Record<string, unknown>>(sql: string) {
      if (sql.includes('FROM service_tokens') && !revoked) {
        return result([{
          id: tokenId,
          tenant_id: '00000000-0000-0000-0000-000000000001',
          token_hash: hashServiceToken(token),
          roles: ['admin'],
          repository_allowlist: repositoryAllowlist,
        }] as unknown as TRow[]);
      }
      return result([]);
    },
  };
  const database = {
    driver: 'postgres',
    maxConnections: 3,
    statementTimeoutMs: 15_000,
    orm: {},
    query: client.query,
    async withClient<T>(operation: (connection: DatabaseClient) => Promise<T>) { return operation(client); },
    async transaction<T>(operation: (connection: DatabaseClient) => Promise<T>) { return operation(client); },
    async close() { return undefined; },
  } as unknown as WardenDatabase;
  return { database, revoke() { revoked = true; } };
}

describe('dashboard token sessions', () => {
  it('sets a short-lived hardened cookie and rechecks token authority', async () => {
    const fixture = sessionDatabase();
    const app = createWardenService({
      database: fixture.database,
      sessionSecret: 's'.repeat(32),
    });
    const login = await app.request('/api/auth/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    expect(login.status).toBe(200);
    const setCookie = login.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('__Host-warden_session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).toContain('Max-Age=900');
    const cookie = setCookie.split(';')[0] ?? '';

    const authorized = await app.request('/api/v1/auth/context', { headers: { cookie } });
    expect(authorized.status).toBe(200);
    await expect(authorized.json()).resolves.toEqual({
      roles: ['admin'],
      repositoryRestricted: false,
      credentialKind: 'service',
      canManagePersonalTokens: true,
      authDisabled: false,
    });

    fixture.revoke();
    expect((await app.request('/api/v1/auth/context', { headers: { cookie } })).status).toBe(401);
  });

  it('rejects repository-restricted tokens at the dashboard session boundary', async () => {
    const fixture = sessionDatabase(['acme/widgets']);
    const app = createWardenService({
      database: fixture.database,
      sessionSecret: 's'.repeat(32),
    });

    const login = await app.request('/api/auth/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    expect(login.status).toBe(401);
    expect(login.headers.get('set-cookie')).toBeNull();
  });

  it('rejects cross-origin session mutations while bearer requests remain machine-safe', async () => {
    const fixture = sessionDatabase();
    const app = createWardenService({
      database: fixture.database,
      sessionSecret: 's'.repeat(32),
    });
    const login = await app.request('/api/auth/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0] ?? '';

    expect((await app.request('/api/v1/memories', {
      method: 'POST',
      headers: { cookie, origin: 'https://attacker.example' },
    })).status).toBe(403);
    expect((await app.request('/api/v1/memories', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    })).status).toBe(400);
  });
});
