import type { Hono } from 'hono';
import { z } from 'zod';
import { requireRole } from '../auth.js';
import type { ServiceVariables } from '../auth.js';
import type { WardenDatabase } from '../db/database.js';
import {
  deleteRepository,
  deleteRun,
  deleteTenant,
  exportServiceData,
  getRetentionSettings,
  updateRetentionSettings,
} from './store.js';

const RetentionSettingsSchema = z.object({
  metricsDays: z.number().int().min(1).max(3_650),
  findingsDays: z.number().int().min(1).max(3_650),
  codeDays: z.number().int().min(1).max(3_650),
  lifecycleDays: z.number().int().min(1).max(3_650),
}).strict();

const ExportResponseSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  records: z.array(z.object({
    type: z.enum(['repository', 'run', 'skill', 'usage', 'finding', 'memory']),
    id: z.string().min(1).max(128),
    repositoryId: z.string().min(1).max(128).optional(),
    data: z.record(z.string(), z.unknown()),
  }).strict()).max(151_000),
}).strict();

/** Register tenant-scoped retention, deletion, and export administration routes. */
export function registerAdministrationRoutes(
  app: Hono<{ Variables: ServiceVariables }>,
  database: WardenDatabase,
): void {
  app.get('/api/v1/admin/retention', requireRole('admin'), async (context) => {
    const settings = await getRetentionSettings(database, context.get('serviceContext'));
    if (!settings) return context.json({ error: { code: 'not_found', message: 'Tenant not found.' } }, 404);
    return context.json(RetentionSettingsSchema.parse(settings));
  });
  app.put('/api/v1/admin/retention', requireRole('admin'), async (context) => {
    const body = RetentionSettingsSchema.safeParse(await context.req.json().catch(() => null));
    if (!body.success) return context.json({ error: { code: 'invalid_request', message: 'Retention settings are not valid.' } }, 400);
    const settings = await updateRetentionSettings(database, context.get('serviceContext'), body.data);
    if (!settings) return context.json({ error: { code: 'not_found', message: 'Tenant not found.' } }, 404);
    return context.json(RetentionSettingsSchema.parse(settings));
  });
  app.delete('/api/v1/admin/runs/:id', requireRole('admin'), async (context) => {
    const id = z.string().uuid().safeParse(context.req.param('id'));
    if (!id.success || !await deleteRun(database, context.get('serviceContext'), id.data)) {
      return context.json({ error: { code: 'not_found', message: 'Run not found.' } }, 404);
    }
    return context.json({ deleted: true });
  });
  app.delete('/api/v1/admin/repositories/:id', requireRole('admin'), async (context) => {
    const id = z.string().uuid().safeParse(context.req.param('id'));
    if (!id.success || !await deleteRepository(database, context.get('serviceContext'), id.data)) {
      return context.json({ error: { code: 'not_found', message: 'Repository not found.' } }, 404);
    }
    return context.json({ deleted: true });
  });
  app.delete('/api/v1/admin/tenant', requireRole('admin'), async (context) => {
    if (!await deleteTenant(database, context.get('serviceContext'))) {
      return context.json({ error: { code: 'not_found', message: 'Tenant not found.' } }, 404);
    }
    return context.json({ deleted: true });
  });
  app.get('/api/v1/export', requireRole('read'), async (context) => {
    const rawRepositoryId = context.req.query('repositoryId');
    const repositoryId = rawRepositoryId ? z.string().uuid().safeParse(rawRepositoryId) : undefined;
    if (repositoryId && !repositoryId.success) {
      return context.json({ error: { code: 'invalid_query', message: 'Repository is not valid.' } }, 400);
    }
    const records = await exportServiceData(
      database,
      context.get('serviceContext'),
      repositoryId?.success ? repositoryId.data : undefined,
    );
    return context.json(ExportResponseSchema.parse({ version: 1, exportedAt: new Date().toISOString(), records }));
  });
}
