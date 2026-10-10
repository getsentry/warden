import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { serve } from '@hono/node-server';
import { createTenant, createServiceToken, getWarmDatabase, migrateDatabase, revokeServiceToken } from '@sentry/warden-service';
import { createVercelWardenService } from './create-app.js';

export interface LocalMemoryServiceOptions {
  databaseUrl: string;
  environment?: NodeJS.ProcessEnv;
  port?: number;
  namespace?: string;
}

/** Start the production app and job route against an explicitly local Postgres database. */
export async function startLocalMemoryService(options: LocalMemoryServiceOptions) {
  const url = new URL(options.databaseUrl);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    throw new Error('Local memory testing requires a loopback Postgres database.');
  }
  const database = getWarmDatabase({ url: options.databaseUrl, driver: 'postgres', maxConnections: 3, statementTimeoutMs: 15_000 });
  await migrateDatabase(database);
  const vector = await database.query("SELECT 1 FROM pg_extension WHERE extname = 'vector'");
  if (!vector.rowCount) throw new Error('Local memory testing requires pgvector. Start compose.local.yml.');
  const tenantId = await createTenant(database, { slug: options.namespace ?? 'local-memory', name: 'Local memory testing' });
  const token = await createServiceToken(database, { tenantId, name: 'Local reviewer', roles: ['read', 'ingest'] });
  const cronSecret = randomBytes(32).toString('hex');
  const app = createVercelWardenService({
    ...options.environment, DATABASE_URL: options.databaseUrl, WARDEN_SERVICE_DATABASE_DRIVER: 'postgres',
    WARDEN_SERVICE_DATABASE_MAX_CONNECTIONS: '3', WARDEN_SERVICE_DATABASE_STATEMENT_TIMEOUT_MS: '15000',
    WARDEN_SERVICE_TENANT_ID: tenantId, WARDEN_SERVICE_SESSION_SECRET: randomBytes(32).toString('hex'),
    CRON_SECRET: cronSecret, DISABLE_AUTH: 'true', WARDEN_SENTRY_DSN: '',
  });
  let server: ReturnType<typeof serve>;
  try {
    server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: options.port ?? 0 });
    await new Promise<void>((resolve, reject) => {
      if (server.listening) resolve();
      else server.once('listening', resolve);
      server.once('error', reject);
    });
  } catch (error) {
    await revokeServiceToken(database, { tenantId, tokenId: token.id, roles: ['admin'], repositoryAllowlist: null }, token.id);
    throw error;
  }
  const address = server.address() as AddressInfo;
  let stopped = false;
  let running: Promise<void> | undefined;
  let stopping: Promise<void> | undefined;
  async function tick() {
    if (stopped) return;
    if (running) return running;
    running = (async () => {
      const response = await app.request('/api/internal/jobs/tick', { method: 'POST', headers: { authorization: `Bearer ${cronSecret}` } });
      if (!response.ok) throw new Error(`Local memory worker failed (${response.status}).`);
    })().finally(() => { running = undefined; });
    return running;
  }
  const timer = setInterval(() => { if (!stopped) void tick().catch(() => console.error('Local memory job slice failed.')); }, 1_000);
  timer.unref();
  return {
    url: `http://127.0.0.1:${address.port}`, token: token.token, tenantId, database, tick,
    stop() {
      if (stopping) return stopping;
      stopped = true;
      clearInterval(timer);
      stopping = (async () => {
        try { await running; }
        finally {
          try { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
          finally { await revokeServiceToken(database, { tenantId, tokenId: token.id, roles: ['admin'], repositoryAllowlist: null }, token.id); }
        }
      })();
      // The shared app factory owns the warm pool; the caller closes it when finished.
      return stopping;
    },
  };
}
