import { describe, expect, it } from 'vitest';
import { parseServiceEnvironment } from './environment.js';

const environment = {
  DATABASE_URL: 'postgresql://user:password@example.com/warden',
  WARDEN_SERVICE_SESSION_SECRET: 'a-stable-secret-with-at-least-32-characters',
  CRON_SECRET: 'a-long-random-cron-secret',
  WARDEN_SERVICE_BASE_URL: 'https://warden.example.com',
  WARDEN_SERVICE_TENANT_ID: '00000000-0000-4000-8000-000000000001',
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
};

describe('parseServiceEnvironment', () => {
  it('uses bounded Neon defaults for the Vercel path', () => {
    expect(parseServiceEnvironment(environment)).toMatchObject({
      WARDEN_SERVICE_DATABASE_DRIVER: 'neon',
      WARDEN_SERVICE_DATABASE_MAX_CONNECTIONS: 3,
      WARDEN_SERVICE_DATABASE_STATEMENT_TIMEOUT_MS: 15_000,
      DISABLE_AUTH: false,
      WARDEN_SERVICE_GOOGLE_DOMAIN: 'sentry.io',
    });
  });

  it('requires Google OAuth configuration by default', () => {
    expect(() => parseServiceEnvironment({
      ...environment,
      GOOGLE_CLIENT_ID: undefined,
    })).toThrow();

    expect(() => parseServiceEnvironment({
      ...environment,
      WARDEN_SERVICE_BASE_URL: undefined,
    })).toThrow();
  });

  it('uses the stable Vercel production URL when no base URL override is set', () => {
    expect(parseServiceEnvironment({
      ...environment,
      WARDEN_SERVICE_BASE_URL: undefined,
      VERCEL_PROJECT_PRODUCTION_URL: 'warden-service.vercel.app',
    }).WARDEN_SERVICE_BASE_URL).toBe('https://warden-service.vercel.app');
  });

  it('allows an explicit local auth bypass without Google configuration', () => {
    expect(parseServiceEnvironment({
      ...environment,
      DISABLE_AUTH: 'true',
      WARDEN_SERVICE_BASE_URL: undefined,
      GOOGLE_CLIENT_ID: undefined,
      GOOGLE_CLIENT_SECRET: undefined,
    })).toMatchObject({ DISABLE_AUTH: true });

    expect(parseServiceEnvironment({ ...environment, DISABLE_AUTH: 'false' }).DISABLE_AUTH).toBe(false);
    expect(() => parseServiceEnvironment({ ...environment, DISABLE_AUTH: '1' })).toThrow();
  });

  it('accepts standard Postgres and rejects incomplete secrets', () => {
    expect(parseServiceEnvironment({
      ...environment,
      WARDEN_SERVICE_DATABASE_DRIVER: 'postgres',
      WARDEN_SERVICE_DATABASE_MAX_CONNECTIONS: '5',
    }).WARDEN_SERVICE_DATABASE_DRIVER).toBe('postgres');

    expect(() => parseServiceEnvironment({ ...environment, CRON_SECRET: 'short' })).toThrow();
  });
});
