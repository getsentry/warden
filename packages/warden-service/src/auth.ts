import { createMiddleware } from 'hono/factory';
import type { ServiceContext, ServiceRole } from './context.js';
import { hasRole } from './context.js';
import type { WardenDatabase } from './db/database.js';
import { authenticateServiceToken } from './tokens.js';

export interface ServiceVariables {
  serviceContext: ServiceContext;
  authenticationMethod: 'bearer' | 'session';
}

export interface DashboardAuthenticationAdapter {
  authenticate(request: Request): Promise<ServiceContext | null>;
}

function bearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

/** Authenticate bearer credentials and attach runtime-derived authority to Hono context. */
export function authenticate(database: WardenDatabase, dashboardAuth?: DashboardAuthenticationAdapter) {
  return createMiddleware<{ Variables: ServiceVariables }>(async (context, next) => {
    const token = bearerToken(context.req.header('authorization'));
    const serviceContext = token
      ? await authenticateServiceToken(database, token)
      : await dashboardAuth?.authenticate(context.req.raw) ?? null;
    if (!serviceContext) {
      return context.json({ error: { code: 'unauthorized', message: 'Authentication required.' } }, 401);
    }
    context.set('serviceContext', serviceContext);
    context.set('authenticationMethod', token ? 'bearer' : 'session');
    if (
      token
      && serviceContext.credentialKind === 'personal'
      && (
        !['GET', 'HEAD'].includes(context.req.method)
        || context.req.path.startsWith('/api/v1/personal-tokens')
      )
    ) {
      return context.json({ error: { code: 'forbidden', message: 'Permission denied.' } }, 403);
    }
    if (context.get('authenticationMethod') === 'session' && !['GET', 'HEAD', 'OPTIONS'].includes(context.req.method)) {
      const origin = context.req.header('origin');
      if (!origin || origin !== new URL(context.req.url).origin) {
        return context.json({ error: { code: 'forbidden', message: 'Permission denied.' } }, 403);
      }
    }
    await next();
  });
}

/** Require one role after authentication; administrators inherit all roles. */
export function requireRole(role: ServiceRole) {
  return createMiddleware<{ Variables: ServiceVariables }>(async (context, next) => {
    if (!hasRole(context.get('serviceContext'), role)) {
      return context.json({ error: { code: 'forbidden', message: 'Permission denied.' } }, 403);
    }
    await next();
  });
}
