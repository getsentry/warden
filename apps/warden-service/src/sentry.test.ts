import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initServiceTelemetry, Sentry } from './sentry.js';

beforeAll(() => {
  initServiceTelemetry({
    WARDEN_SENTRY_DSN: 'https://public@example.com/1',
    VERCEL_ENV: 'production',
    VERCEL_GIT_COMMIT_SHA: 'abc123',
  });
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
});
