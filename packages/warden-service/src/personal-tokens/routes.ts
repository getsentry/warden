import type { Hono } from 'hono';
import { z } from 'zod';
import { requireRole } from '../auth.js';
import type { ServiceVariables } from '../auth.js';
import type { WardenDatabase } from '../db/database.js';
import {
  createPersonalToken,
  listPersonalTokens,
  revokePersonalToken,
} from '../tokens.js';

const TokenMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
  tokenSuffix: z.string().length(8),
  expiresAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
}).strict();

const CreateTokenBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
}).strict();

function requireBrowserIdentity(
  context: { get(name: 'authenticationMethod'): 'bearer' | 'session'; get(name: 'serviceContext'): ServiceVariables['serviceContext'] },
): string | null {
  if (context.get('authenticationMethod') !== 'session') return null;
  return context.get('serviceContext').principalSubject ?? null;
}

/** Register owner-scoped personal token routes for authenticated dashboard sessions. */
export function registerPersonalTokenRoutes(
  app: Hono<{ Variables: ServiceVariables }>,
  database: WardenDatabase,
): void {
  app.get('/api/v1/personal-tokens', requireRole('read'), async (context) => {
    if (!requireBrowserIdentity(context)) {
      return context.json({ error: { code: 'forbidden', message: 'Permission denied.' } }, 403);
    }
    const tokens = await listPersonalTokens(database, context.get('serviceContext'));
    return context.json({ tokens: z.array(TokenMetadataSchema).parse(tokens) });
  });

  app.post('/api/v1/personal-tokens', requireRole('read'), async (context) => {
    const ownerSubject = requireBrowserIdentity(context);
    if (!ownerSubject) {
      return context.json({ error: { code: 'forbidden', message: 'Permission denied.' } }, 403);
    }
    const body = CreateTokenBodySchema.safeParse(await context.req.json().catch(() => null));
    if (!body.success) {
      return context.json({ error: { code: 'invalid_request', message: 'Token name is not valid.' } }, 400);
    }
    const serviceContext = context.get('serviceContext');
    const token = await createPersonalToken(database, {
      tenantId: serviceContext.tenantId,
      ownerSubject,
      name: body.data.name,
    });
    return context.json(TokenMetadataSchema.extend({ token: z.string().startsWith('wds_pat_') }).parse(token), 201);
  });

  app.delete('/api/v1/personal-tokens/:id', requireRole('read'), async (context) => {
    if (!requireBrowserIdentity(context)) {
      return context.json({ error: { code: 'forbidden', message: 'Permission denied.' } }, 403);
    }
    const id = z.string().uuid().safeParse(context.req.param('id'));
    if (!id.success || !await revokePersonalToken(database, context.get('serviceContext'), id.data)) {
      return context.json({ error: { code: 'not_found', message: 'Personal token not found.' } }, 404);
    }
    return context.json({ revoked: true as const });
  });
}
