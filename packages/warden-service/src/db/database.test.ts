import { describe, expect, it } from 'vitest';
import { createDatabase } from './database.js';

describe('createDatabase', () => {
  it.each(['neon', 'postgres'] as const)('creates a bounded %s adapter without connecting eagerly', async (driver) => {
    const database = createDatabase({
      url: 'postgresql://user:password@localhost:5432/warden',
      driver,
      maxConnections: 4,
      statementTimeoutMs: 2_500,
    });

    expect(database.driver).toBe(driver);
    expect(database.maxConnections).toBe(4);
    expect(database.statementTimeoutMs).toBe(2_500);
    await database.close();
  });

  it('rejects unbounded pool and timeout settings', () => {
    expect(() => createDatabase({
      url: 'postgresql://user:password@localhost:5432/warden',
      maxConnections: 100,
    })).toThrow();
  });
});
