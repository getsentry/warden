import { ApiErrorSchema } from '@sentry/warden-service-api';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { authenticate, requireRole } from './auth.js';
import type { DashboardAuthenticationAdapter, ServiceVariables } from './auth.js';
import { createTokenSessionAdapter, registerDashboardSessionRoutes } from './dashboard-auth.js';
import type { WardenDatabase } from './db/database.js';
import { getSchemaStatus } from './db/migrations.js';
import { registerRunRoutes } from './runs/routes.js';
import { registerHistoryRoutes } from './history/routes.js';
import { registerJobRoutes } from './jobs/routes.js';
import type { JobHandlers } from './jobs/runner.js';
import { registerMemoryRoutes } from './memory/routes.js';
import type { RecallMemoryOptions } from './memory/store.js';
import { registerAdministrationRoutes } from './administration/routes.js';
import { registerPersonalTokenRoutes } from './personal-tokens/routes.js';
import {
  createGoogleAuthenticationAdapter,
  registerGoogleAuthRoutes,
} from './google-auth.js';
import type { GoogleBrowserAuthOptions } from './google-auth.js';

const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('warden-service'),
}).strict();

const ReadinessResponseSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  database: z.enum(['ready', 'unavailable', 'migration_required']),
  currentVersion: z.string().nullable().optional(),
  requiredVersion: z.string().nullable().optional(),
}).strict();

export type RateLimitHook = (input: {
  operation: string;
  credentialPresent: boolean;
}) => boolean | Promise<boolean>;

export interface CreateWardenServiceOptions {
  database?: WardenDatabase;
  rateLimit?: RateLimitHook;
  maxRequestBytes?: number;
  cronSecret?: string;
  jobHandlers?: JobHandlers;
  sessionSecret?: string;
  sessionTtlSeconds?: number;
  dashboardAuth?: DashboardAuthenticationAdapter;
  googleAuth?: GoogleBrowserAuthOptions;
  disableAuth?: { tenantId: string };
  memoryRecall?: RecallMemoryOptions;
}

function createDisabledAuthenticationAdapter(tenantId: string): DashboardAuthenticationAdapter {
  return {
    async authenticate() {
      return {
        tenantId,
        tokenId: null,
        roles: ['read'],
        repositoryAllowlist: null,
        credentialKind: 'browser',
        principalSubject: 'local:auth-disabled',
      };
    },
  };
}

function validatedJson<TSchema extends z.ZodType>(
  context: { json: (value: z.output<TSchema>, status?: 200 | 503) => Response },
  schema: TSchema,
  value: z.input<TSchema>,
  status?: 200 | 503,
): Response {
  return context.json(schema.parse(value), status);
}

/** Create the portable Hono application used by Vercel and Node hosts. */
export function createWardenService(options: CreateWardenServiceOptions = {}) {
  const jobHandlers = options.jobHandlers;
  if (options.cronSecret && (!jobHandlers || Object.keys(jobHandlers).length === 0)) {
    throw new TypeError('cronSecret requires at least one job handler');
  }
  if (options.googleAuth && options.disableAuth) {
    throw new TypeError('googleAuth and disableAuth cannot both be enabled');
  }
  const app = new Hono<{ Variables: ServiceVariables }>();
  const maxRequestBytes = options.maxRequestBytes ?? 1_048_576;

  app.use('*', async (context, next) => {
    await next();
    context.header('Cache-Control', 'no-store');
    context.header('X-Content-Type-Options', 'nosniff');
  });

  app.use('/api/*', bodyLimit({
    maxSize: maxRequestBytes,
    onError: (context) => context.json({
      error: { code: 'payload_too_large', message: 'Request is too large.' },
    }, 413),
  }));

  app.use('/api/*', async (context, next) => {
    if (options.rateLimit && !await options.rateLimit({
      operation: `${context.req.method} ${context.req.path}`,
      credentialPresent: context.req.header('authorization') !== undefined,
    })) {
      return context.json({ error: { code: 'rate_limited', message: 'Try again later.' } }, 429);
    }
    await next();
  });

  for (const path of ['/health', '/api/health']) {
    app.get(path, (context) => validatedJson(context, HealthResponseSchema, {
      status: 'ok',
      service: 'warden-service',
    }));
  }

  for (const path of ['/ready', '/api/ready']) {
    app.get(path, async (context) => {
      if (!options.database) {
        return validatedJson(context, ReadinessResponseSchema, {
          status: 'not_ready',
          database: 'unavailable',
        }, 503);
      }
      try {
        const status = await getSchemaStatus(options.database);
        return validatedJson(context, ReadinessResponseSchema, {
          status: status.ready ? 'ready' : 'not_ready',
          database: status.ready ? 'ready' : 'migration_required',
          currentVersion: status.currentVersion,
          requiredVersion: status.requiredVersion,
        }, status.ready ? 200 : 503);
      } catch {
        return validatedJson(context, ReadinessResponseSchema, {
          status: 'not_ready',
          database: 'unavailable',
        }, 503);
      }
    });
  }

  if (options.database) {
    const builtInDashboardAuth = options.sessionSecret
      ? createTokenSessionAdapter(options.database, options.sessionSecret)
      : undefined;
    const googleDashboardAuth = options.googleAuth
      ? createGoogleAuthenticationAdapter(options.googleAuth)
      : undefined;
    const disabledDashboardAuth = options.disableAuth
      ? createDisabledAuthenticationAdapter(options.disableAuth.tenantId)
      : undefined;
    const dashboardAdapters = [
      options.dashboardAuth,
      googleDashboardAuth,
      disabledDashboardAuth,
      builtInDashboardAuth,
    ]
      .filter((adapter): adapter is DashboardAuthenticationAdapter => adapter !== undefined);
    const dashboardAuth = dashboardAdapters.length > 0 ? {
      async authenticate(request: Request) {
        for (const adapter of dashboardAdapters) {
          const authenticated = await adapter.authenticate(request);
          if (authenticated) return authenticated;
        }
        return null;
      },
    } : undefined;
    if (options.sessionSecret) {
      registerDashboardSessionRoutes(
        app,
        options.database,
        options.sessionSecret,
        options.sessionTtlSeconds,
      );
    }
    if (options.googleAuth) {
      registerGoogleAuthRoutes(app, options.googleAuth);
    }
    app.use('/api/v1/*', authenticate(options.database, dashboardAuth));
    app.get('/api/v1/auth/context', requireRole('read'), (context) => {
      const serviceContext = context.get('serviceContext');
      return context.json({
        roles: serviceContext.roles,
        repositoryRestricted: serviceContext.repositoryAllowlist !== null,
        credentialKind: serviceContext.credentialKind ?? 'service',
        canManagePersonalTokens: context.get('authenticationMethod') === 'session'
          && serviceContext.principalSubject !== undefined,
        authDisabled: options.disableAuth !== undefined,
      });
    });
    registerRunRoutes(app, options.database);
    registerHistoryRoutes(app, options.database);
    registerMemoryRoutes(app, options.database, options.memoryRecall);
    registerAdministrationRoutes(app, options.database);
    registerPersonalTokenRoutes(app, options.database);
    if (options.cronSecret && jobHandlers) {
      registerJobRoutes(app, options.database, options.cronSecret, jobHandlers);
    }
  }

  app.notFound((context) => context.json(
    ApiErrorSchema.parse({ error: { code: 'not_found', message: 'Route not found.' } }),
    404,
  ));

  app.onError((_error, context) => context.json(
    ApiErrorSchema.parse({ error: { code: 'internal_error', message: 'The service could not complete the request.' } }),
    500,
  ));

  return app;
}

export type WardenServiceApp = ReturnType<typeof createWardenService>;
