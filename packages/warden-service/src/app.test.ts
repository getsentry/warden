import { describe, expect, it } from 'vitest';
import { createWardenService } from './app.js';
import type { DatabaseClient, WardenDatabase } from './db/database.js';
import type { GoogleAuthBridge, GoogleAuthSession } from './google-auth.js';

function readyDatabase(): WardenDatabase {
  return {
    driver: 'postgres',
    maxConnections: 3,
    statementTimeoutMs: 15_000,
    async query(sql: string) {
      return sql.includes('_warden_service_migrations')
        ? { rows: [{ version: '0004_dazzling_vermin' }], rowCount: 1 } as never
        : { rows: [], rowCount: 0 } as never;
    },
    async withClient<T>(operation: (client: DatabaseClient) => Promise<T>) {
      return operation({ query: this.query });
    },
    async transaction<T>(operation: (client: DatabaseClient) => Promise<T>) {
      return operation({
        async query() { return { rows: [], rowCount: 0 }; },
      });
    },
    async close() { return undefined; },
  };
}

describe('createWardenService', () => {
  it('serves content-safe health and readiness responses with no-store caching', async () => {
    const app = createWardenService({ database: readyDatabase() });

    const health = await app.request('/health');
    expect(health.status).toBe(200);
    expect(health.headers.get('cache-control')).toBe('no-store');
    await expect(health.json()).resolves.toEqual({ status: 'ok', service: 'warden-service' });

    const ready = await app.request('/ready');
    expect(ready.status).toBe(200);
    await expect(ready.json()).resolves.toMatchObject({ status: 'ready', database: 'ready' });
  });

  it('reports an unavailable database without trying to migrate', async () => {
    const response = await createWardenService().request('/ready');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: 'not_ready', database: 'unavailable' });
  });

  it('runs explicit migrations only with the cron secret', async () => {
    const app = createWardenService({
      database: readyDatabase(),
      cronSecret: 'cron-secret',
      jobHandlers: { retention: async () => ({ complete: true }) },
    });

    expect((await app.request('/api/internal/db/migrate', { method: 'POST' })).status).toBe(401);
    const response = await app.request('/api/internal/db/migrate', {
      method: 'POST',
      headers: { authorization: 'Bearer cron-secret' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ready: true,
      currentVersion: '0004_dazzling_vermin',
      requiredVersion: '0004_dazzling_vermin',
    });
  });

  it('distinguishes a missing migration table from other database failures', async () => {
    const missingTable = readyDatabase();
    missingTable.query = async () => { throw Object.assign(new Error('missing table'), { code: '42P01' }); };
    const missingResponse = await createWardenService({ database: missingTable }).request('/ready');

    expect(missingResponse.status).toBe(503);
    await expect(missingResponse.json()).resolves.toMatchObject({
      status: 'not_ready',
      database: 'migration_required',
      currentVersion: null,
    });

    const unavailable = readyDatabase();
    unavailable.query = async () => { throw Object.assign(new Error('permission denied'), { code: '42501' }); };
    const unavailableResponse = await createWardenService({ database: unavailable }).request('/ready');

    expect(unavailableResponse.status).toBe(503);
    await expect(unavailableResponse.json()).resolves.toEqual({ status: 'not_ready', database: 'unavailable' });
  });

  it('returns safe not-found and error responses', async () => {
    const app = createWardenService({
      rateLimit() { throw new Error('sql contains private finding'); },
    });

    const missing = await app.request('/missing');
    expect(missing.status).toBe(404);
    expect(await missing.text()).not.toContain('missing');

    const failed = await app.request('/api/explode');
    expect(failed.status).toBe(500);
    expect(await failed.text()).not.toContain('private finding');
  });

  it('applies payload and rate-limit hooks before API handlers', async () => {
    const limited = createWardenService({ rateLimit: () => false });
    expect((await limited.request('/api/v1/example')).status).toBe(429);

    const bounded = createWardenService({
      maxRequestBytes: 8,
    });
    const response = await bounded.request('/api/example', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'too large' }),
    });
    expect(response.status).toBe(413);
  });

  it('buffers request bodies before asynchronous authentication', async () => {
    const encoded = new TextEncoder().encode('{}');
    let bodyRead = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        bodyRead = true;
        controller.enqueue(encoded);
        controller.close();
      },
    }, { highWaterMark: 0 });
    const app = createWardenService({
      database: readyDatabase(),
      dashboardAuth: {
        async authenticate() {
          if (!bodyRead) throw new Error('request body was not buffered');
          return {
            tenantId: '00000000-0000-4000-8000-000000000001',
            tokenId: null,
            roles: ['ingest'],
            repositoryAllowlist: null,
            credentialKind: 'browser',
          };
        },
      },
    });
    const request = new Request('http://localhost/api/v1/runs', {
      method: 'POST',
      headers: {
        'content-length': String(encoded.byteLength),
        'content-type': 'application/json',
        origin: 'http://localhost',
      },
      body,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });

    const response = await app.request(request);

    expect(bodyRead).toBe(true);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: 'invalid_envelope', message: 'Run envelope is not valid.' },
    });
  });

  it('never passes bearer credentials to rate-limit hooks or reflects thrown content', async () => {
    const inputs: unknown[] = [];
    const app = createWardenService({
      rateLimit(input) {
        inputs.push(input);
        throw new Error('token=private finding=/src/private.ts memory=ignore-rules');
      },
    });
    const response = await app.request('/api/leak', {
      headers: { authorization: 'Bearer wds_private_secret' },
    });

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('{"error":{"code":"internal_error","message":"The service could not complete the request."}}');
    expect(inputs).toEqual([{ operation: 'GET /api/leak', credentialPresent: true }]);
    expect(JSON.stringify(inputs)).not.toContain('wds_private_secret');
  });

  it('maps only verified Google-domain sessions to the configured tenant', async () => {
    const tenantId = '00000000-0000-4000-8000-000000000001';
    let session: GoogleAuthSession | null = {
      user: { email: 'WARDEN@SENTRY.IO', emailVerified: true },
    };
    let callbackURL: string | undefined;
    const auth: GoogleAuthBridge = {
      async handler() { return new Response('handled'); },
      async getSession() { return session; },
      async signInWithGoogle(_request, callback) {
        callbackURL = callback;
        return Response.redirect('https://accounts.google.com/');
      },
    };
    const app = createWardenService({
      database: readyDatabase(),
      googleAuth: { auth, tenantId, allowedDomain: 'sentry.io' },
      dashboard: {
        html: '<!doctype html><title>Warden</title>',
        script: 'console.log("warden")',
        stylesheet: 'body { color: white; }',
      },
    });

    const page = await app.request('https://warden.example/');
    expect(page.status).toBe(200);
    expect(page.headers.get('content-type')).toContain('text/html');
    expect((await app.request('https://warden.example/findings/00000000-0000-4000-8000-000000000001')).status).toBe(200);

    const authenticated = await app.request('https://warden.example/api/v1/auth/context');
    expect(authenticated.status).toBe(200);
    await expect(authenticated.json()).resolves.toEqual({
      roles: ['read'],
      repositoryRestricted: false,
      credentialKind: 'browser',
      canManagePersonalTokens: true,
      authDisabled: false,
    });

    session = { user: { email: 'warden@example.com', emailVerified: true } };
    expect((await app.request('/api/v1/auth/context')).status).toBe(401);
    session = { user: { email: 'warden@sentry.io', emailVerified: false } };
    expect((await app.request('/api/v1/auth/context')).status).toBe(401);

    session = null;
    const protectedPage = await app.request('https://warden.example/');
    expect(protectedPage.status).toBe(302);
    expect(protectedPage.headers.get('location')).toBe('/api/auth/login');
    expect((await app.request('https://warden.example/assets/app.js')).status).toBe(302);
    const protectedFinding = await app.request(
      'https://warden.example/findings/00000000-0000-4000-8000-000000000001',
    );
    expect(protectedFinding.headers.get('location')).toBe(
      '/api/auth/login?returnTo=%2Ffindings%2F00000000-0000-4000-8000-000000000001',
    );
    expect((await app.request('https://warden.example/api/auth/login')).headers.get('location'))
      .toBe('https://accounts.google.com/');
    expect(callbackURL).toBe('https://warden.example/');

    await app.request(
      'https://warden.example/api/auth/login?returnTo=%2Ffindings%2F00000000-0000-4000-8000-000000000001',
    );
    expect(callbackURL).toBe(
      'https://warden.example/findings/00000000-0000-4000-8000-000000000001',
    );

    await app.request('https://warden.example/api/auth/login?returnTo=https%3A%2F%2Fexample.com');
    expect(callbackURL).toBe('https://warden.example/');
    expect(await (await app.request('/api/auth/sign-out', { method: 'POST' })).text()).toBe('handled');
  });

  it('bypasses browser auth with read-only authority only when explicitly disabled', async () => {
    const app = createWardenService({
      database: readyDatabase(),
      disableAuth: { tenantId: '00000000-0000-4000-8000-000000000001' },
    });

    const response = await app.request('/api/v1/auth/context');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      roles: ['read'],
      repositoryRestricted: false,
      credentialKind: 'browser',
      canManagePersonalTokens: false,
      authDisabled: true,
    });
    expect((await app.request('http://localhost/api/v1/personal-tokens', {
      method: 'POST',
      headers: { origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Persistent access' }),
    })).status).toBe(403);
    expect((await app.request('/api/v1/memories', {
      method: 'POST',
      headers: { origin: 'http://localhost' },
    })).status).toBe(403);
    expect((await app.request('/api/v1/auth/context', {
      headers: { authorization: 'Bearer wds_invalid' },
    })).status).toBe(401);
  });

  it('serves filtered findings and grouped costs through the authenticated read API', async () => {
    const database = {
      ...readyDatabase(),
      async query<TRow extends Record<string, unknown>>(sql: string, values: readonly unknown[] = []) {
        if (sql.includes('FROM findings f')) return { rows: [{
          id: '00000000-0000-4000-8000-000000000010',
          client_finding_id: '7MV-5V7', reported_id: null,
          run_id: '00000000-0000-4000-8000-000000000011',
          client_run_id: 'run-11',
          head_sha: 'abc123def456', source_evidence: null,
          verification: 'The query interpolates untrusted input.',
          provider: 'github', owner: 'acme', name: 'widgets', full_name: 'acme/widgets',
          skill: 'security', severity: 'high', confidence: 'high',
          title: 'Unsafe query', description: 'Use parameters.',
          path: 'src/query.ts', start_line: 12, end_line: 12,
          observation_outcome: 'posted', observed_at: '2026-08-12T10:01:00.000Z',
          completed_at: '2026-08-12T10:01:00.000Z',
        }] as unknown as TRow[], rowCount: 1 };
        if (sql.includes('FROM runs r') && sql.includes('SUM(u.input_tokens)')) {
          const grouped = sql.includes('GROUP BY');
          return { rows: [{
            ...(grouped ? { dimension_0: 'security' } : {}),
            runs: 1, input_tokens: '100', output_tokens: '20', cost_usd: '0.012',
          }] as unknown as TRow[], rowCount: 1 };
        }
        throw new Error(`unexpected query: ${sql} ${JSON.stringify(values)}`);
      },
    } satisfies WardenDatabase;
    const app = createWardenService({
      database,
      disableAuth: { tenantId: '00000000-0000-4000-8000-000000000001' },
    });

    const findings = await app.request('/api/v1/findings?skill=security&query=unsafe');
    expect(findings.status).toBe(200);
    await expect(findings.json()).resolves.toMatchObject({
      items: [{ displayId: '7MV-5V7', title: 'Unsafe query', skill: 'security', repository: { fullName: 'acme/widgets' } }],
    });

    const detail = await app.request('/api/v1/findings/00000000-0000-4000-8000-000000000010');
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toMatchObject({
      finding: {
        id: '00000000-0000-4000-8000-000000000010',
        displayId: '7MV-5V7',
        observedAt: '2026-08-12T10:01:00.000Z',
      },
      verification: 'The query interpolates untrusted input.',
    });
    expect((await app.request('/api/v1/findings/not-a-uuid')).status).toBe(404);

    const costs = await app.request('/api/v1/costs?groupBy=skill&skill=security');
    expect(costs.status).toBe(200);
    await expect(costs.json()).resolves.toEqual({
      groups: [{ dimensions: { skill: 'security' }, runs: 1, inputTokens: 100, outputTokens: 20, costUsd: 0.012 }],
      totals: { runs: 1, inputTokens: 100, outputTokens: 20, costUsd: 0.012 },
    });

    expect((await app.request('/api/v1/runs?cursor=not-a-cursor')).status).toBe(400);
  });
});
