import { z } from 'zod';
import { DatabaseDriverSchema } from './db/database.js';

export const ServiceDatabaseEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  WARDEN_SERVICE_DATABASE_DRIVER: DatabaseDriverSchema.default('neon'),
  WARDEN_SERVICE_DATABASE_MAX_CONNECTIONS: z.coerce.number().int().min(1).max(20).default(3),
  WARDEN_SERVICE_DATABASE_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(100).max(120_000).default(15_000),
}).strict();
export type ServiceDatabaseEnvironment = z.infer<typeof ServiceDatabaseEnvironmentSchema>;

export const ServiceEnvironmentSchema = ServiceDatabaseEnvironmentSchema.extend({
  WARDEN_SERVICE_SESSION_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(16),
  DISABLE_AUTH: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  WARDEN_SERVICE_BASE_URL: z.string().url().transform((value) => new URL(value).origin).optional(),
  WARDEN_SERVICE_TENANT_ID: z.string().uuid(),
  WARDEN_SERVICE_GOOGLE_DOMAIN: z.string().trim().toLowerCase().min(1).default('sentry.io'),
  GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().min(1).optional(),
  WARDEN_SERVICE_MEMORY_MODEL: z.string().trim().min(1).default('openai/gpt-5.6-luna'),
  WARDEN_SERVICE_EMBEDDING_MODEL: z.string().trim().min(1).default('openai/text-embedding-3-small'),
  WARDEN_SERVICE_MEMORY_AUTO_PROMOTE: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
}).strict().superRefine((value, context) => {
  if (!value.DISABLE_AUTH) {
    for (const name of ['WARDEN_SERVICE_BASE_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] as const) {
      if (!value[name]) {
        context.addIssue({
          code: 'custom',
          path: [name],
          message: `${name} is required unless DISABLE_AUTH=true`,
        });
      }
    }
  }
});
export type ServiceEnvironment = z.infer<typeof ServiceEnvironmentSchema>;

function resolveServiceBaseURL(environment: NodeJS.ProcessEnv): string | undefined {
  const value = environment['WARDEN_SERVICE_BASE_URL']
    ?? environment['VERCEL_PROJECT_PRODUCTION_URL'];
  if (!value) return undefined;
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

/** Validate only the database settings needed by migration and administration commands. */
export function parseServiceDatabaseEnvironment(
  environment: NodeJS.ProcessEnv,
): ServiceDatabaseEnvironment {
  return ServiceDatabaseEnvironmentSchema.parse({
    DATABASE_URL: environment['DATABASE_URL'],
    WARDEN_SERVICE_DATABASE_DRIVER: environment['WARDEN_SERVICE_DATABASE_DRIVER'],
    WARDEN_SERVICE_DATABASE_MAX_CONNECTIONS: environment['WARDEN_SERVICE_DATABASE_MAX_CONNECTIONS'],
    WARDEN_SERVICE_DATABASE_STATEMENT_TIMEOUT_MS: environment['WARDEN_SERVICE_DATABASE_STATEMENT_TIMEOUT_MS'],
  });
}

/** Validate the complete Vercel/service runtime environment once at startup. */
export function parseServiceEnvironment(environment: NodeJS.ProcessEnv): ServiceEnvironment {
  return ServiceEnvironmentSchema.parse({
    DATABASE_URL: environment['DATABASE_URL'],
    WARDEN_SERVICE_DATABASE_DRIVER: environment['WARDEN_SERVICE_DATABASE_DRIVER'],
    WARDEN_SERVICE_DATABASE_MAX_CONNECTIONS: environment['WARDEN_SERVICE_DATABASE_MAX_CONNECTIONS'],
    WARDEN_SERVICE_DATABASE_STATEMENT_TIMEOUT_MS: environment['WARDEN_SERVICE_DATABASE_STATEMENT_TIMEOUT_MS'],
    WARDEN_SERVICE_SESSION_SECRET: environment['WARDEN_SERVICE_SESSION_SECRET'],
    CRON_SECRET: environment['CRON_SECRET'],
    DISABLE_AUTH: environment['DISABLE_AUTH'],
    WARDEN_SERVICE_BASE_URL: resolveServiceBaseURL(environment),
    WARDEN_SERVICE_TENANT_ID: environment['WARDEN_SERVICE_TENANT_ID'],
    WARDEN_SERVICE_GOOGLE_DOMAIN: environment['WARDEN_SERVICE_GOOGLE_DOMAIN'],
    GOOGLE_CLIENT_ID: environment['GOOGLE_CLIENT_ID'],
    GOOGLE_CLIENT_SECRET: environment['GOOGLE_CLIENT_SECRET'],
    WARDEN_SERVICE_MEMORY_MODEL: environment['WARDEN_SERVICE_MEMORY_MODEL'],
    WARDEN_SERVICE_EMBEDDING_MODEL: environment['WARDEN_SERVICE_EMBEDDING_MODEL'],
    WARDEN_SERVICE_MEMORY_AUTO_PROMOTE: environment['WARDEN_SERVICE_MEMORY_AUTO_PROMOTE'],
  });
}
