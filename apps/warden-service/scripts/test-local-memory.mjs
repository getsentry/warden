import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const project = `warden-memory-test-${process.pid}`;
const compose = ['compose', '-p', project, '-f', 'apps/warden-service/compose.local.yml'];
const environment = { ...process.env, WARDEN_LOCAL_DATABASE_PORT: '0' };
let child;
let interrupted;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  interrupted ??= signal;
  child?.kill(signal);
});
async function run(command, args, env, capture = false, cleanup = false) {
  if (interrupted && !cleanup) throw new Error('Memory tests interrupted');
  let output = '';
  child = spawn(command, args, { cwd: root, env, stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit' });
  child.stdout?.on('data', (chunk) => { output += chunk; });
  try {
    const code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => resolve(code ?? (signal === 'SIGINT' ? 130 : 143)));
    });
    if (code !== 0) throw new Error(`${command} exited with code ${code}`);
    return output;
  } finally { child = undefined; }
}
const docker = (args, capture = false, cleanup = false) => run('docker', [...compose, ...args], environment, capture, cleanup);
try {
  await docker(['up', '-d', '--wait']);
  const address = (await docker(['port', 'postgres', '5432'], true)).trim();
  const databaseUrl = `postgresql://warden:warden_local@${address}/warden_memory`;
  for (const args of [
    ['--filter', '@sentry/warden-service', 'test'],
    ['--filter', 'warden-service-app', 'exec', 'vitest', 'run', 'src/local.integration.test.ts'],
  ]) {
    await run('pnpm', args, {
      ...process.env, WARDEN_TEST_DATABASE_URL: databaseUrl, WARDEN_TEST_POSTGRES_URL: databaseUrl,
    });
  }
} catch (error) {
  process.exitCode = interrupted === 'SIGINT' ? 130 : interrupted ? 143 : 1;
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  // This project and volume were created exclusively for this invocation.
  await docker(['down', '--volumes'], false, true);
}
