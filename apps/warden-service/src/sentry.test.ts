import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { DatabaseClient, WardenDatabase } from '@sentry/warden-service';
import {
  initServiceTelemetry,
  Sentry,
  traceDatabase,
  traceRequest,
} from './sentry.js';

interface SentSpan {
  name: string;
  status: string;
  is_segment: boolean;
  attributes: Record<string, { value: unknown }>;
}

/** Streamed spans exactly as the transport would send them. */
const sentSpans: SentSpan[] = [];

function attributeValues(span: SentSpan | undefined): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(span?.attributes ?? {}).map(([key, attribute]) => [key, attribute.value]),
  );
}

beforeAll(() => {
  initServiceTelemetry({
    WARDEN_SENTRY_DSN: 'https://public@example.com/1',
    VERCEL_ENV: 'production',
    VERCEL_GIT_COMMIT_SHA: 'abc123',
  }, {
    transport: () => ({
      send: async ([, items]) => {
        for (const [header, payload] of items) {
          if (header.type === 'span') sentSpans.push(...(payload as { items: SentSpan[] }).items);
        }
        return {};
      },
      flush: async () => true,
    }),
  });
});

afterEach(() => {
  sentSpans.length = 0;
});

afterAll(async () => {
  await Sentry.close(0);
});

describe('Warden Service telemetry', () => {
  it('removes Drizzle parameters before spans leave the process', () => {
    const beforeSendSpan = Sentry.getClient()?.getOptions().beforeSendSpan;
    if (!beforeSendSpan) throw new Error('Sentry span sanitizer was not initialized');
    const span = {
      attributes: {
        'drizzle.query.text': 'select * from repositories where tenant_id = $1',
        'drizzle.query.params': '["private-tenant-id"]',
      },
    } as unknown as Parameters<typeof beforeSendSpan>[0];

    const sanitized = beforeSendSpan(span);

    expect(sanitized.attributes).toMatchObject({
      'drizzle.query.text': 'select * from repositories where tenant_id = $1',
    });
    expect(sanitized.attributes).not.toHaveProperty('drizzle.query.params');
  });

  it('records bounded request transactions without trusting query strings, entity IDs, or Host', async () => {
    const handler = traceRequest(async (_request, response) => {
      response.statusCode = 200;
    });

    await handler({
      method: 'GET',
      url: '/api/v1/findings/not-a-valid-id?query=private',
      headers: { host: 'not a valid host %' },
    }, { statusCode: 500 });
    await Sentry.flush(1_000);

    const roots = sentSpans.filter((span) => span.is_segment);
    expect(roots).toHaveLength(1);
    expect(roots[0]).toMatchObject({ name: 'GET /api/v1/findings/:id', status: 'ok' });
    expect(attributeValues(roots[0])).toMatchObject({
      'sentry.op': 'http.server',
      'http.request.method': 'GET',
      'http.route': '/api/v1/findings/:id',
      'http.response.status_code': 200,
      'service.name': 'warden-service',
    });
    expect(JSON.stringify(sentSpans)).not.toContain('private');
    expect(JSON.stringify(sentSpans)).not.toContain('not-a-valid-id');
  });

  it('records raw SQL as a child span without recording parameter values', async () => {
    const receivedValues: (readonly unknown[])[] = [];
    const rawDatabase: WardenDatabase = {
      driver: 'neon',
      maxConnections: 3,
      statementTimeoutMs: 15_000,
      async query<TRow extends Record<string, unknown>>(
        _text: string,
        values: readonly unknown[] = [],
      ) {
        receivedValues.push(values);
        return { rows: [] as TRow[], rowCount: 0 };
      },
      async withClient<T>(operation: (client: DatabaseClient) => Promise<T>) {
        return operation({ query: this.query });
      },
      async transaction<T>(operation: (client: DatabaseClient) => Promise<T>) {
        return operation({ query: this.query });
      },
      async close() { return undefined; },
    };
    const database = traceDatabase(rawDatabase);

    await Sentry.startSpan({
      name: 'GET /api/v1/repositories',
      op: 'http.server',
      forceTransaction: true,
    }, () => database.query(
      'SELECT id, full_name FROM repositories WHERE tenant_id = $1',
      ['private-tenant-id'],
    ));
    await Sentry.flush(1_000);

    expect(receivedValues).toEqual([['private-tenant-id']]);
    expect(sentSpans.filter((span) => span.is_segment)).toHaveLength(1);
    const query = sentSpans.find((span) => attributeValues(span)['sentry.op'] === 'db.query');
    expect(query?.name).toBe('SELECT id, full_name FROM repositories WHERE tenant_id = $1');
    expect(attributeValues(query)).toMatchObject({
      'db.system.name': 'postgresql',
      'db.operation.name': 'SELECT',
      'db.query.text': 'SELECT id, full_name FROM repositories WHERE tenant_id = $1',
    });
    expect(JSON.stringify(sentSpans)).not.toContain('private-tenant-id');
  });
});
