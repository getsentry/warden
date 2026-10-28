import {
  IngestRunResponseSchema,
  RunEnvelopeV1Schema,
  SERVICE_PROTOCOL_VERSION,
  sha256Checksum,
} from '@sentry/warden-service-api';
import type { Hono } from 'hono';
import type { ServiceVariables } from '../auth.js';
import { requireRole } from '../auth.js';
import type { WardenDatabase } from '../db/database.js';
import { ingestRun, RunIngestionError } from './ingest.js';

/** Register versioned authenticated run ingestion routes. */
export function registerRunRoutes(app: Hono<{ Variables: ServiceVariables }>, database: WardenDatabase): void {
  app.post('/api/v1/runs', requireRole('ingest'), async (context) => {
    let body: unknown;
    try {
      body = await context.req.json();
    } catch {
      return context.json({ error: { code: 'invalid_json', message: 'Request body must be JSON.' } }, 400);
    }
    const parsed = RunEnvelopeV1Schema.safeParse(body);
    if (!parsed.success) {
      return context.json({ error: { code: 'invalid_envelope', message: 'Run envelope is not valid.' } }, 400);
    }
    const declaredChecksum = context.req.header('warden-envelope-checksum');
    const checksum = await sha256Checksum(parsed.data);
    if (!declaredChecksum || declaredChecksum !== checksum) {
      return context.json({ error: { code: 'checksum_mismatch', message: 'Envelope checksum does not match.' } }, 400);
    }
    try {
      const result = await ingestRun(database, context.get('serviceContext'), parsed.data);
      return context.json(IngestRunResponseSchema.parse({
        protocolVersion: SERVICE_PROTOCOL_VERSION,
        ...result,
      }), result.created ? 201 : 200);
    } catch (error) {
      if (error instanceof RunIngestionError) {
        if (error.code === 'repository_forbidden') {
          return context.json({ error: { code: error.code, message: 'Repository is not authorized.' } }, 403);
        }
        if (error.code === 'checksum_conflict') {
          return context.json({ error: { code: error.code, message: 'Run ID already has different content.' } }, 409);
        }
        return context.json({ error: { code: error.code, message: 'Envelope references are not valid.' } }, 400);
      }
      throw error;
    }
  });
}
