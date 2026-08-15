import { describe, expect, it } from 'vitest';
import type { WardenDatabase } from './db/database.js';
import { runServiceCli } from './cli-runner.js';

describe('warden-service CLI', () => {
  it('reports schema status and closes the database', async () => {
    let closed = false;
    let output = '';
    const database = {
      async query() {
        return { rows: [{ version: '0006_tiny_garia' }], rowCount: 1 };
      },
      async close() { closed = true; },
    } as unknown as WardenDatabase;

    const exitCode = await runServiceCli(['db', 'status'], database, (chunk) => { output += chunk; });

    expect(exitCode).toBe(0);
    expect(JSON.parse(output)).toEqual({
      ready: true,
      currentVersion: '0006_tiny_garia',
      requiredVersion: '0006_tiny_garia',
    });
    expect(closed).toBe(true);
  });
});
