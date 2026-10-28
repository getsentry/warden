import { describe, expect, it, vi } from 'vitest';
import { runDeployMigrations } from './migrate-database.mjs';

function dependencies() {
  const close = vi.fn().mockResolvedValue(undefined);
  return {
    close,
    value: {
      createDatabase: vi.fn(() => ({ close })),
      migrateDatabase: vi.fn().mockResolvedValue({
        ready: true,
        currentVersion: '0005_large_mattie_franklin',
        requiredVersion: '0005_large_mattie_franklin',
      }),
      parseServiceDatabaseEnvironment: vi.fn(() => ({
        DATABASE_URL: 'postgresql://example.invalid/warden',
        WARDEN_SERVICE_DATABASE_DRIVER: 'neon',
        WARDEN_SERVICE_DATABASE_MAX_CONNECTIONS: 3,
        WARDEN_SERVICE_DATABASE_STATEMENT_TIMEOUT_MS: 15_000,
      })),
      write: vi.fn(),
    },
  };
}

describe('production deploy migrations', () => {
  it('applies migrations and closes the database before the production build continues', async () => {
    const test = dependencies();

    await runDeployMigrations({ VERCEL_ENV: 'production' }, test.value);

    expect(test.value.migrateDatabase).toHaveBeenCalledOnce();
    expect(test.close).toHaveBeenCalledOnce();
    expect(test.value.write).toHaveBeenCalledWith('Database schema ready at 0005_large_mattie_franklin.\n');
  });

  it('does not mutate a database during preview or local builds', async () => {
    const test = dependencies();

    await runDeployMigrations({ VERCEL_ENV: 'preview' }, test.value);

    expect(test.value.createDatabase).not.toHaveBeenCalled();
    expect(test.value.migrateDatabase).not.toHaveBeenCalled();
  });
});
