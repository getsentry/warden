import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { DatabaseClient, WardenDatabase } from '@sentry/warden-service';
import {
  initServiceTelemetry,
  Sentry,
  traceDatabase,
  traceRequest,
} from './sentry.js';

type InitOptions = NonNullable<Parameters<typeof initServiceTelemetry>[1]>;
type BeforeSendTransaction = NonNullable<InitOptions['beforeSendTransaction']>;
type Transaction = Parameters<BeforeSendTransaction>[0];

const transactions: Transaction[] = [];

beforeAll(() => {
  initServiceTelemetry({
    WARDEN_SENTRY_DSN: 'https://public@example.com/1',
    VERCEL_ENV: 'production',
    VERCEL_GIT_COMMIT_SHA: 'abc123',
  }, {
    beforeSendTransaction(event) {
      transactions.push(event);
      return event;
    },
    transport: () => ({
      send: async () => ({}),
      flush: async () => true,
    }),
  });
});

afterEach(() => {
  transactions.length = 0;
});

afterAll(async () => {
  await Sentry.close(0);
});

describe('Warden Service telemetry', () => {
  it('removes Drizzle parameters before spans leave the process', () => {
    const beforeSendSpan = Sentry.getClient()?.getOptions().beforeSendSpan;
    if (!beforeSendSpan) throw new Error('Sentry span sanitizer was not initialized');
    const span = {
      data: {
        'drizzle.query.text': 'select * from repositories where tenant_id = $1',
        'drizzle.query.params': '["private-tenant-id"]',
      },
    } as unknown as Parameters<typeof beforeSendSpan>[0];

    const sanitized = beforeSendSpan(span);

    expect(sanitized.data).toMatchObject({
      'drizzle.query.text': 'select * from repositories where tenant_id = $1',
    });
    expect(sanitized.data).not.toHaveProperty('drizzle.query.params');
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

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      transaction: 'GET /api/v1/findings/:id',
      contexts: {
        trace: {
          op: 'http.server',
          status: 'ok',
          data: {
            'http.request.method': 'GET',
            'http.route': '/api/v1/findings/:id',
            'http.response.status_code': 200,
            'service.name': 'warden-service',
          },
        },
      },
    });
    expect(JSON.stringify(transactions[0])).not.toContain('private');
    expect(JSON.stringify(transactions[0])).not.toContain('not-a-valid-id');
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
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.spans).toEqual(expect.arrayContaining([
      expect.objectContaining({
        op: 'db.query',
        description: 'SELECT id, full_name FROM repositories WHERE tenant_id = $1',
        data: expect.objectContaining({
          'db.system.name': 'postgresql',
          'db.operation.name': 'SELECT',
          'db.query.text': 'SELECT id, full_name FROM repositories WHERE tenant_id = $1',
        }),
      }),
    ]));
    expect(JSON.stringify(transactions[0])).not.toContain('private-tenant-id');
  });
});
