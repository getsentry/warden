import {
  createWardenService,
  createGoogleAuth,
  createMemoryJobHandlers,
  getWarmDatabase,
  parseServiceEnvironment,
} from '@sentry/warden-service';
import { readFileSync } from 'node:fs';

const dashboard = {
  html: readFileSync(new URL('../public/index.html', import.meta.url), 'utf8'),
  script: readFileSync(new URL('../public/assets/app.js', import.meta.url), 'utf8'),
  stylesheet: readFileSync(new URL('../public/assets/styles.css', import.meta.url), 'utf8'),
};

function requiredAuthValue(value: string | undefined, name: string): string {
  if (!value) throw new TypeError(`${name} is required when auth is enabled`);
  return value;
}

/** Build the Vercel app from an explicitly validated environment. */
export function createVercelWardenService(environment: NodeJS.ProcessEnv) {
  const config = parseServiceEnvironment(environment);
  const database = getWarmDatabase({
    url: config.DATABASE_URL,
    driver: config.WARDEN_SERVICE_DATABASE_DRIVER,
    maxConnections: config.WARDEN_SERVICE_DATABASE_MAX_CONNECTIONS,
    statementTimeoutMs: config.WARDEN_SERVICE_DATABASE_STATEMENT_TIMEOUT_MS,
  });
  return createWardenService({
    database,
    dashboard,
    cronSecret: config.CRON_SECRET,
    jobHandlers: {
      ...createMemoryJobHandlers(database),
    },
    ...(config.DISABLE_AUTH
      ? { disableAuth: { tenantId: config.WARDEN_SERVICE_TENANT_ID } }
      : {
          googleAuth: {
            auth: createGoogleAuth({
              baseURL: requiredAuthValue(config.WARDEN_SERVICE_BASE_URL, 'WARDEN_SERVICE_BASE_URL'),
              secret: config.WARDEN_SERVICE_SESSION_SECRET,
              clientId: requiredAuthValue(config.GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID'),
              clientSecret: requiredAuthValue(config.GOOGLE_CLIENT_SECRET, 'GOOGLE_CLIENT_SECRET'),
              hostedDomain: config.WARDEN_SERVICE_GOOGLE_DOMAIN,
            }),
            tenantId: config.WARDEN_SERVICE_TENANT_ID,
            allowedDomain: config.WARDEN_SERVICE_GOOGLE_DOMAIN,
          },
        }),
  });
}
