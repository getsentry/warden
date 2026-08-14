import { timingSafeEqual } from 'node:crypto';
import type { Context, Hono } from 'hono';
import type { ServiceVariables } from '../auth.js';
import type { WardenDatabase } from '../db/database.js';
import { processJobSlice } from './runner.js';
import type { JobHandlers } from './runner.js';

function authorized(header: string | undefined, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(header ?? '');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

/** Enqueue one idempotent daily retention job for every tenant before a worker slice runs. */
export async function enqueueDailyRetention(database: WardenDatabase): Promise<void> {
  await database.query(`
    INSERT INTO jobs (
      tenant_id, type, input_version, idempotency_key, payload_ref,
      max_attempts, max_age_seconds
    )
    SELECT id, 'retention', 1,
      'retention:' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
      '{}'::jsonb, 5, 172800
    FROM tenants
    ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
  `);
}

/** Register the Vercel Cron-compatible signed durable-job tick. */
export function registerJobRoutes(
  app: Hono<{ Variables: ServiceVariables }>,
  database: WardenDatabase,
  cronSecret: string,
  handlers: JobHandlers,
): void {
  const tick = async (context: Context<{ Variables: ServiceVariables }>) => {
    if (!authorized(context.req.header('authorization'), cronSecret)) {
      return context.json({ error: { code: 'unauthorized', message: 'Authentication required.' } }, 401);
    }
    await enqueueDailyRetention(database);
    const result = await processJobSlice(database, handlers, {
      deadline: Date.now() + 25_000,
      batchSize: 10,
    });
    return context.json(result);
  };
  app.get('/api/internal/jobs/tick', tick);
  app.post('/api/internal/jobs/tick', tick);
}
