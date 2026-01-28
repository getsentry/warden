import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config as dotenvConfig } from 'dotenv';

/**
 * Load environment variables for integration tests.
 * Loads in order (later files override earlier):
 * 1. .env (base config)
 * 2. .env.local (local overrides)
 * 3. .env.test (test-specific overrides)
 */
function loadTestEnv(): void {
  const root = join(import.meta.dirname, '..', '..');

  const envFiles = ['.env', '.env.local', '.env.test'];

  for (const file of envFiles) {
    const path = join(root, file);
    if (existsSync(path)) {
      dotenvConfig({ path, override: true });
    }
  }
}

loadTestEnv();
