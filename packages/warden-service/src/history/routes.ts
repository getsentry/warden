import {
  CostAggregateResponseSchema,
  FindingListResponseSchema,
  OutcomeSummaryResponseSchema,
  RepositoryListResponseSchema,
  RunDetailResponseSchema,
  RunListResponseSchema,
  SkillListResponseSchema,
} from '@sentry/warden-service-api';
import type { Hono } from 'hono';
import { z } from 'zod';
import { requireRole } from '../auth.js';
import type { ServiceVariables } from '../auth.js';
import type { WardenDatabase } from '../db/database.js';
import {
  aggregateCosts,
  getRunDetail,
  listFindings,
  listRepositories,
  listRuns,
  listSkills,
  summarizeOutcomes,
  HistoryCursorSchema,
} from './store.js';
import type { CostDimension, HistoryFilters } from './store.js';

const QuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  repositoryId: z.string().uuid().optional(),
  skill: z.string().trim().min(1).max(512).optional(),
  model: z.string().trim().min(1).max(255).optional(),
  runtime: z.string().trim().min(1).max(128).optional(),
  provider: z.string().trim().min(1).max(128).optional(),
  lane: z.string().trim().min(1).max(64).optional(),
  source: z.enum(['cli', 'action', 'sdk', 'replay']).optional(),
  outcome: z.enum(['success', 'failure', 'cancelled', 'skipped']).optional(),
  errorCode: z.string().trim().min(1).max(128).optional(),
}).strict();

const RunQuerySchema = QuerySchema.extend({
  cursor: HistoryCursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).strict();

const FindingQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  repositoryId: z.string().uuid().optional(),
  skill: z.string().trim().min(1).max(512).optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  outcome: z.enum(['posted', 'deduped', 'skipped', 'resolved', 'failed', 'rejected', 'revised']).optional(),
  query: z.string().trim().min(1).max(256).optional(),
  cursor: HistoryCursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).strict();

const CostDimensionSchema = z.enum(['day', 'repository', 'skill', 'model', 'runtime', 'provider', 'lane', 'source', 'outcome']);

function parseQuery<TSchema extends z.ZodType>(schema: TSchema, query: Record<string, string>): z.output<TSchema> | null {
  const result = schema.safeParse(query);
  return result.success ? result.data : null;
}

/** Register tenant-scoped history and reporting routes. */
export function registerHistoryRoutes(app: Hono<{ Variables: ServiceVariables }>, database: WardenDatabase): void {
  app.get('/api/v1/runs', requireRole('read'), async (context) => {
    const query = parseQuery(RunQuerySchema, context.req.query());
    if (!query) return context.json({ error: { code: 'invalid_query', message: 'Run filters are not valid.' } }, 400);
    return context.json(RunListResponseSchema.parse(await listRuns(database, context.get('serviceContext'), query)));
  });

  app.get('/api/v1/runs/:id', requireRole('read'), async (context) => {
    const id = z.string().uuid().safeParse(context.req.param('id'));
    if (!id.success) return context.json({ error: { code: 'not_found', message: 'Run not found.' } }, 404);
    const detail = await getRunDetail(database, context.get('serviceContext'), id.data);
    if (!detail) return context.json({ error: { code: 'not_found', message: 'Run not found.' } }, 404);
    return context.json(RunDetailResponseSchema.parse(detail));
  });

  app.get('/api/v1/findings', requireRole('read'), async (context) => {
    const query = parseQuery(FindingQuerySchema, context.req.query());
    if (!query) return context.json({ error: { code: 'invalid_query', message: 'Finding filters are not valid.' } }, 400);
    return context.json(FindingListResponseSchema.parse(await listFindings(
      database,
      context.get('serviceContext'),
      query,
    )));
  });

  app.get('/api/v1/repositories', requireRole('read'), async (context) => context.json(
    RepositoryListResponseSchema.parse(await listRepositories(database, context.get('serviceContext'))),
  ));

  app.get('/api/v1/skills', requireRole('read'), async (context) => context.json(
    SkillListResponseSchema.parse(await listSkills(database, context.get('serviceContext'))),
  ));

  app.get('/api/v1/costs', requireRole('read'), async (context) => {
    const raw = context.req.query();
    const groups = (raw['groupBy'] ?? 'day').split(',');
    const dimensions = z.array(CostDimensionSchema).min(1).max(4).safeParse(groups);
    const { groupBy: _groupBy, ...filterInput } = raw;
    const filters = parseQuery(QuerySchema, filterInput);
    if (!dimensions.success || !filters) {
      return context.json({ error: { code: 'invalid_query', message: 'Cost filters are not valid.' } }, 400);
    }
    return context.json(CostAggregateResponseSchema.parse(await aggregateCosts(
      database,
      context.get('serviceContext'),
      filters,
      dimensions.data as CostDimension[],
    )));
  });

  app.get('/api/v1/outcomes/summary', requireRole('read'), async (context) => {
    const filters = parseQuery(QuerySchema, context.req.query());
    if (!filters) return context.json({ error: { code: 'invalid_query', message: 'Outcome filters are not valid.' } }, 400);
    return context.json(OutcomeSummaryResponseSchema.parse(await summarizeOutcomes(
      database,
      context.get('serviceContext'),
      filters as HistoryFilters,
    )));
  });
}
