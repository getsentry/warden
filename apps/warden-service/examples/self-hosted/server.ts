import { serve } from '@hono/node-server';
import {
  createDatabase,
  createGoogleAuth,
  createMemoryJobHandlers,
  createWardenService,
  parseServiceEnvironment,
} from '@sentry/warden-service';
import { readFileSync } from 'node:fs';

const environment = parseServiceEnvironment(process.env);
function requiredAuthValue(value: string | undefined, name: string): string {
  if (!value) throw new TypeError(`${name} is required when auth is enabled`);
  return value;
}

const database = createDatabase({
  url: environment.DATABASE_URL,
  driver: 'postgres',
  maxConnections: environment.WARDEN_SERVICE_DATABASE_MAX_CONNECTIONS,
  statementTimeoutMs: environment.WARDEN_SERVICE_DATABASE_STATEMENT_TIMEOUT_MS,
});
const service = createWardenService({
  database,
  dashboard: {
    html: readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8'),
    script: readFileSync(new URL('../../public/assets/app.js', import.meta.url), 'utf8'),
    stylesheet: readFileSync(new URL('../../public/assets/styles.css', import.meta.url), 'utf8'),
  },
  cronSecret: environment.CRON_SECRET,
  jobHandlers: createMemoryJobHandlers(database),
  ...(environment.DISABLE_AUTH
    ? { disableAuth: { tenantId: environment.WARDEN_SERVICE_TENANT_ID } }
    : {
        googleAuth: {
          auth: createGoogleAuth({
            baseURL: requiredAuthValue(environment.WARDEN_SERVICE_BASE_URL, 'WARDEN_SERVICE_BASE_URL'),
            secret: environment.WARDEN_SERVICE_SESSION_SECRET,
            clientId: requiredAuthValue(environment.GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID'),
            clientSecret: requiredAuthValue(environment.GOOGLE_CLIENT_SECRET, 'GOOGLE_CLIENT_SECRET'),
            hostedDomain: environment.WARDEN_SERVICE_GOOGLE_DOMAIN,
          }),
          tenantId: environment.WARDEN_SERVICE_TENANT_ID,
          allowedDomain: environment.WARDEN_SERVICE_GOOGLE_DOMAIN,
        },
      }),
});
const port = Number(process.env['PORT'] ?? 3000);
const server = serve({ fetch: service.fetch, port });

async function stop(): Promise<void> {
  server.close();
  await database.close();
}

process.once('SIGINT', stop);
process.once('SIGTERM', stop);
