import {
  MemoryKindSchema,
  MemoryDetailResponseSchema,
  MemoryLifecycleSchema,
  MemoryListResponseSchema,
  MemoryMutationResponseSchema,
  MemoryRecallRequestSchema,
  MemoryRecallResponseSchema,
  RepositoryIdentitySchema,
} from '@sentry/warden-service-api';
import type { Hono } from 'hono';
import { z } from 'zod';
import { requireRole } from '../auth.js';
import type { ServiceVariables } from '../auth.js';
import type { WardenDatabase } from '../db/database.js';
import {
  createMemory,
  getMemoryDetail,
  listMemories,
  MemoryIdempotencyConflictError,
  recallMemories,
  recordMemoryFeedback,
  transitionMemory,
} from './store.js';
import type { RecallMemoryOptions } from './store.js';

const CreateMemorySchema = z.object({
  repository: RepositoryIdentitySchema,
  kind: MemoryKindSchema,
  content: z.string().trim().min(1).max(4_000),
  skill: z.string().trim().min(1).max(512).optional(),
  language: z.string().trim().min(1).max(64).optional(),
  pathFamily: z.string().trim().min(1).max(512).optional(),
  expiresAt: z.string().datetime().optional(),
  idempotencyKey: z.string().trim().min(1).max(256),
}).strict();

const TransitionMemorySchema = z.object({
  reason: z.string().trim().min(1).max(1_000).optional(),
}).strict();

const MemoryFeedbackSchema = z.object({
  outcome: z.enum(['support', 'contradict', 'review']),
  reason: z.string().trim().min(1).max(1_000).optional(),
}).strict();

/** Register authenticated recall and administrator memory lifecycle routes. */
export function registerMemoryRoutes(
  app: Hono<{ Variables: ServiceVariables }>,
  database: WardenDatabase,
  recallOptions: RecallMemoryOptions = {},
): void {
  app.post('/api/v1/memory/recall', requireRole('ingest'), async (context) => {
    const body = MemoryRecallRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!body.success) return context.json({ error: { code: 'invalid_request', message: 'Recall request is not valid.' } }, 400);
    return context.json(MemoryRecallResponseSchema.parse(await recallMemories(
      database,
      context.get('serviceContext'),
      body.data,
      recallOptions,
    )));
  });

  app.get('/api/v1/memories', requireRole('read'), async (context) => {
    const lifecycle = MemoryLifecycleSchema.safeParse(context.req.query('lifecycle'));
    if (context.req.query('lifecycle') && !lifecycle.success) {
      return context.json({ error: { code: 'invalid_query', message: 'Memory lifecycle is not valid.' } }, 400);
    }
    const items = await listMemories(database, context.get('serviceContext'), lifecycle.success ? lifecycle.data : undefined);
    return context.json(MemoryListResponseSchema.parse({ items }));
  });

  app.get('/api/v1/memories/:id', requireRole('read'), async (context) => {
    const id = z.string().uuid().safeParse(context.req.param('id'));
    if (!id.success) return context.json({ error: { code: 'not_found', message: 'Memory not found.' } }, 404);
    const detail = await getMemoryDetail(database, context.get('serviceContext'), id.data);
    if (!detail) return context.json({ error: { code: 'not_found', message: 'Memory not found.' } }, 404);
    return context.json(MemoryDetailResponseSchema.parse(detail));
  });

  app.post('/api/v1/memories', requireRole('admin'), async (context) => {
    const body = CreateMemorySchema.safeParse(await context.req.json().catch(() => null));
    if (!body.success) return context.json({ error: { code: 'invalid_request', message: 'Memory is not valid.' } }, 400);
    let memory: Awaited<ReturnType<typeof createMemory>>;
    try {
      memory = await createMemory(database, context.get('serviceContext'), body.data);
    } catch (error) {
      if (error instanceof MemoryIdempotencyConflictError) {
        return context.json({ error: { code: 'conflict', message: 'Idempotency key is already in use.' } }, 409);
      }
      throw error;
    }
    if (!memory) return context.json({ error: { code: 'not_found', message: 'Repository not found.' } }, 404);
    return context.json(MemoryMutationResponseSchema.parse({ memory }), 201);
  });

  for (const lifecycle of ['active', 'archived'] as const) {
    app.post(`/api/v1/memories/:id/${lifecycle === 'active' ? 'approve' : 'archive'}`, requireRole('admin'), async (context) => {
      const id = z.string().uuid().safeParse(context.req.param('id'));
      const body = TransitionMemorySchema.safeParse(await context.req.json().catch(() => ({})));
      if (!id.success || !body.success) return context.json({ error: { code: 'invalid_request', message: 'Memory update is not valid.' } }, 400);
      const memory = await transitionMemory(database, context.get('serviceContext'), id.data, lifecycle, body.data.reason);
      if (!memory) return context.json({ error: { code: 'not_found', message: 'Memory not found.' } }, 404);
      return context.json(MemoryMutationResponseSchema.parse({ memory }));
    });
  }

  app.post('/api/v1/memories/:id/feedback', requireRole('admin'), async (context) => {
    const id = z.string().uuid().safeParse(context.req.param('id'));
    const body = MemoryFeedbackSchema.safeParse(await context.req.json().catch(() => null));
    if (!id.success || !body.success) return context.json({ error: { code: 'invalid_request', message: 'Memory feedback is not valid.' } }, 400);
    const memory = await recordMemoryFeedback(
      database,
      context.get('serviceContext'),
      id.data,
      body.data.outcome,
      body.data.reason,
    );
    if (!memory) return context.json({ error: { code: 'not_found', message: 'Memory not found.' } }, 404);
    return context.json(MemoryMutationResponseSchema.parse({ memory }));
  });
}
