import { FindingLinearIssueResponseSchema } from '@sentry/warden-service-api';
import type { Hono } from 'hono';
import { z } from 'zod';
import { requireRole } from '../auth.js';
import type { ServiceVariables } from '../auth.js';
import type { WardenDatabase } from '../db/database.js';
import { getFindingDetail } from '../history/store.js';
import { createLinearIssue, findLinearIssue } from './client.js';
import type { LinearOptions } from './client.js';

/** Register Linear actions for browser users of the configured internal tenant. */
export function registerLinearRoutes(
  app: Hono<{ Variables: ServiceVariables }>,
  database: WardenDatabase,
  options?: LinearOptions,
): void {
  app.on(['GET', 'POST'], '/api/v1/findings/:id/linear-issue', requireRole('read'), async (context) => {
    const authority = context.get('serviceContext');
    if (
      context.get('authenticationMethod') !== 'session'
      || authority.credentialKind !== 'browser'
      || (options && authority.tenantId !== options.tenantId)
    ) {
      return context.json({ error: { code: 'forbidden', message: 'Permission denied.' } }, 403);
    }
    const id = z.uuid().safeParse(context.req.param('id'));
    if (!id.success) return context.json({ error: { code: 'not_found', message: 'Finding not found.' } }, 404);
    const detail = await getFindingDetail(database, authority, id.data);
    if (!detail) return context.json({ error: { code: 'not_found', message: 'Finding not found.' } }, 404);
    if (!options) {
      if (context.req.method === 'POST') {
        return context.json({ error: { code: 'linear_unavailable', message: 'Linear is not configured for this service.' } }, 503);
      }
      return context.json(FindingLinearIssueResponseSchema.parse({ enabled: false, issue: null }));
    }
    try {
      const issue = context.req.method === 'POST'
        ? await createLinearIssue(options, detail)
        : await findLinearIssue(options, detail.finding.id);
      return context.json(FindingLinearIssueResponseSchema.parse({ enabled: true, issue }));
    } catch {
      return context.json({ error: { code: 'linear_error', message: 'Could not reach Linear. Try again.' } }, 502);
    }
  });
}
