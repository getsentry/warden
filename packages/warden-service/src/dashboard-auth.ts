import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import type { DashboardAuthenticationAdapter, ServiceVariables } from './auth.js';
import { hasRole } from './context.js';
import type { WardenDatabase } from './db/database.js';
import { authenticateServiceToken, authenticateServiceTokenId } from './tokens.js';

const SESSION_COOKIE = '__Host-warden_session';
const LoginSchema = z.object({
  token: z.string().trim().min(1).max(512),
}).strict();

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function createSessionValue(tokenId: string, secret: string, expiresAt: number): string {
  const payload = Buffer.from(JSON.stringify({ tokenId, expiresAt }), 'utf8').toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

function parseSessionValue(value: string, secret: string, now: number): string | null {
  const separator = value.lastIndexOf('.');
  if (separator <= 0) return null;
  const payload = value.slice(0, separator);
  const supplied = Buffer.from(value.slice(separator + 1), 'base64url');
  const expected = Buffer.from(sign(payload, secret), 'base64url');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const parsed = z.object({
      tokenId: z.string().uuid(),
      expiresAt: z.number().int().positive(),
    }).strict().parse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')));
    return parsed.expiresAt > now ? parsed.tokenId : null;
  } catch {
    return null;
  }
}

function cookieValue(request: Request): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === SESSION_COOKIE) return value.join('=') || null;
  }
  return null;
}

/** Create the built-in signed-cookie adapter while rechecking token authority on every request. */
export function createTokenSessionAdapter(
  database: WardenDatabase,
  sessionSecret: string,
  now: () => number = Date.now,
): DashboardAuthenticationAdapter {
  if (sessionSecret.length < 32) throw new TypeError('Dashboard session secret must contain at least 32 characters');
  return {
    async authenticate(request) {
      const encoded = cookieValue(request);
      if (!encoded) return null;
      const tokenId = parseSessionValue(encoded, sessionSecret, now());
      return tokenId ? authenticateServiceTokenId(database, tokenId) : null;
    },
  };
}

/** Register built-in token login/logout endpoints for the static dashboard. */
export function registerDashboardSessionRoutes(
  app: Hono<{ Variables: ServiceVariables }>,
  database: WardenDatabase,
  sessionSecret: string,
  ttlSeconds = 900,
): void {
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 3_600) {
    throw new TypeError('Dashboard session lifetime must be between 60 and 3600 seconds');
  }
  app.post('/api/auth/session', async (context) => {
    const body = LoginSchema.safeParse(await context.req.json().catch(() => null));
    if (!body.success) return context.json({ error: { code: 'invalid_request', message: 'Sign-in request is not valid.' } }, 400);
    const serviceContext = await authenticateServiceToken(database, body.data.token);
    if (
      !serviceContext
      || serviceContext.credentialKind === 'personal'
      || !serviceContext.tokenId
      || !hasRole(serviceContext, 'read')
    ) {
      return context.json({ error: { code: 'unauthorized', message: 'Authentication required.' } }, 401);
    }
    setCookie(context, SESSION_COOKIE, createSessionValue(
      serviceContext.tokenId,
      sessionSecret,
      Date.now() + ttlSeconds * 1_000,
    ), {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: ttlSeconds,
    });
    return context.json({ authenticated: true, roles: serviceContext.roles });
  });

  app.delete('/api/auth/session', (context) => {
    deleteCookie(context, SESSION_COOKIE, {
      path: '/',
      secure: true,
    });
    return context.json({ authenticated: false });
  });
}
