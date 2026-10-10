import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { startLocalMemoryService } from './local.js';

if (!process.env['AI_GATEWAY_API_KEY']) throw new Error('Set AI_GATEWAY_API_KEY for the same embedding and extraction providers used by production.');
const directory = resolve('../../.warden/local-service');
mkdirSync(directory, { recursive: true, mode: 0o700 });
const service = await startLocalMemoryService({
  databaseUrl: process.env['WARDEN_LOCAL_DATABASE_URL'] ?? 'postgresql://warden:warden_local@127.0.0.1:55432/warden_memory',
  environment: process.env,
  port: Number(process.env['WARDEN_LOCAL_SERVICE_PORT'] ?? 4141),
});
writeFileSync(resolve(directory, 'client.env'), [
  `export WARDEN_SERVICE_URL=${service.url}`,
  `export WARDEN_SERVICE_TOKEN=${service.token}`,
  'export WARDEN_SERVICE_MEMORY=true', 'export WARDEN_SERVICE_DATA=code',
  'export WARDEN_SERVICE_TIMEOUT_MS=30000', '',
].join('\n'), { mode: 0o600 });
console.log(`Local memory service: ${service.url}. Client settings: ${resolve(directory, 'client.env')}`);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
  void service.stop().finally(() => service.database.close()).catch(() => { process.exitCode = 1; });
});
