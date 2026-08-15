import {
  createWardenService,
  createGoogleAuth,
  createMemoryJobHandlers,
  defaultPassivePromotionPolicy,
  getWarmDatabase,
  parseServiceEnvironment,
} from '@sentry/warden-service';
import { readFileSync } from 'node:fs';
import { createHostedMemoryRuntime } from './memory-ai.js';
import { captureServiceError, traceDatabase } from './sentry.js';

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
  const database = traceDatabase(getWarmDatabase({
    url: config.DATABASE_URL,
    driver: config.WARDEN_SERVICE_DATABASE_DRIVER,
    maxConnections: config.WARDEN_SERVICE_DATABASE_MAX_CONNECTIONS,
    statementTimeoutMs: config.WARDEN_SERVICE_DATABASE_STATEMENT_TIMEOUT_MS,
  }));
  const memory = createHostedMemoryRuntime({
    memoryModel: config.WARDEN_SERVICE_MEMORY_MODEL,
    embeddingModel: config.WARDEN_SERVICE_EMBEDDING_MODEL,
    environment,
  });
  return createWardenService({
    database,
    onError: captureServiceError,
    dashboard,
    cronSecret: config.CRON_SECRET,
    jobHandlers: createMemoryJobHandlers(database, {
      extractor: memory.extractor,
      embedding: memory.embedding,
      promotionPolicy: {
        ...defaultPassivePromotionPolicy,
        autoPromote: config.WARDEN_SERVICE_MEMORY_AUTO_PROMOTE,
      },
    }),
    memoryRecall: {
      embedding: memory.embedding,
      relevance: memory.relevance,
    },
    ...(config.WARDEN_SERVICE_BASE_URL
      ? { sessionOrigin: config.WARDEN_SERVICE_BASE_URL }
      : {}),
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
