import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config as dotenvConfig } from 'dotenv';
import { bridgeWardenProviderApiKeyEnv } from '../../warden/src/utils/index.js';

// Same env files as packages/evals, later files win.
const root = join(import.meta.dirname, '..', '..', '..');
for (const file of ['.env', '.env.local', '.env.test']) {
  const path = join(root, file);
  if (existsSync(path)) {
    dotenvConfig({ path, override: true });
  }
}
bridgeWardenProviderApiKeyEnv();
