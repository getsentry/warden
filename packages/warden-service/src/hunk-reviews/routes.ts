import {
  HunkReviewRecallRequestSchema,
  HunkReviewRecallResponseSchema,
  HunkReviewRecordRequestSchema,
  HunkReviewRecordResponseSchema,
} from '@sentry/warden-service-api';
import type { Hono } from 'hono';
import { requireRole } from '../auth.js';
import type { ServiceVariables } from '../auth.js';
import type { WardenDatabase } from '../db/database.js';
import { recallHunkReviews, recordHunkReviews } from './store.js';

/** Register routes for storing and recalling clean hunk reviews. */
export function registerHunkReviewRoutes(app: Hono<{ Variables: ServiceVariables }>, database: WardenDatabase): void {
  app.post('/api/v1/hunk-reviews', requireRole('ingest'), async (context) => {
    const body = HunkReviewRecordRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!body.success) return context.json({ error: { code: 'invalid_request', message: 'Hunk review request is not valid.' } }, 400);
    return context.json(HunkReviewRecordResponseSchema.parse(await recordHunkReviews(database, context.get('serviceContext'), body.data)));
  });

  app.post('/api/v1/hunk-reviews/recall', requireRole('read'), async (context) => {
    const body = HunkReviewRecallRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!body.success) return context.json({ error: { code: 'invalid_request', message: 'Hunk review recall is not valid.' } }, 400);
    return context.json(HunkReviewRecallResponseSchema.parse(await recallHunkReviews(database, context.get('serviceContext'), body.data)));
  });
}
