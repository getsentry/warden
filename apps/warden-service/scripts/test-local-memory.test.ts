import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it, vi } from 'vitest';

it('removes only its temporary Compose project after SIGTERM', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'warden-memory-interrupt-'));
  const log = join(directory, 'docker.log');
  const ready = join(directory, 'ready');
  writeFileSync(join(directory, 'docker'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TEST_DOCKER_LOG, JSON.stringify(args) + '\\n');
if (args.includes('port')) console.log('127.0.0.1:12345');
`, { mode: 0o700 });
  writeFileSync(join(directory, 'pnpm'), `#!/usr/bin/env node
require('node:fs').writeFileSync(process.env.TEST_READY, 'ready');
setInterval(() => {}, 1000);
`, { mode: 0o700 });
  const child = spawn(process.execPath, [fileURLToPath(new URL('./test-local-memory.mjs', import.meta.url))], {
    env: { ...process.env, PATH: `${directory}:${process.env['PATH']}`, TEST_DOCKER_LOG: log, TEST_READY: ready },
    stdio: 'ignore',
  });
  const exited = new Promise<number | null>((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  try {
    await vi.waitFor(() => expect(readFileSync(ready, 'utf8')).toBe('ready'), { timeout: 5000 });
    child.kill('SIGTERM');
    expect(await exited).toBe(143);
    const calls: string[][] = readFileSync(log, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    expect(calls.at(-1)?.slice(-2)).toEqual(['down', '--volumes']);
    expect(new Set(calls.map((args) => args[2]))).toEqual(new Set([`warden-memory-test-${child.pid}`]));
  } finally {
    child.kill('SIGTERM');
    await exited;
    rmSync(directory, { recursive: true, force: true });
  }
}, 10_000);
