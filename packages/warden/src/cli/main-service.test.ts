import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupArtifacts } from './log-cleanup.js';
import { main } from './main.js';

vi.mock('./log-cleanup.js', () => ({
  cleanupArtifacts: vi.fn(async () => undefined),
}));

const cleanupArtifactsMock = vi.mocked(cleanupArtifacts);

function git(cwd: string, args: string[]): void {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

function initializeRepository(repoPath: string): void {
  git(repoPath, ['init', '--initial-branch=main']);
  writeFileSync(join(repoPath, 'warden.toml'), [
    'version = 1',
    '',
    '[service]',
    'url = "https://warden.example.com"',
    'data = "findings"',
    'memory = false',
    '',
    '[[skills]]',
    'name = "security-review"',
    'paths = ["src/**/*.ts"]',
    '',
    '[[skills.triggers]]',
    'type = "local"',
    '',
  ].join('\n'));
  git(repoPath, ['add', 'warden.toml']);
  git(repoPath, [
    '-c', 'user.name=Warden Test',
    '-c', 'user.email=warden@example.com',
    'commit', '-m', 'Initial commit',
  ]);
}

describe('config-mode service publication', () => {
  const originalArgv = process.argv.slice();
  const originalCwd = process.cwd();
  const originalEnv = { ...process.env };
  const originalExit = process.exit;
  let repoPath: string;

  beforeEach(() => {
    repoPath = mkdtempSync(join(tmpdir(), 'warden-main-service-'));
    initializeRepository(repoPath);
    process.chdir(repoPath);
    process.argv = ['node', 'warden', '--staged', '--quiet'];
    process.exit = vi.fn() as never;
    process.env = {
      ...originalEnv,
      WARDEN_SERVICE_TOKEN: 'service-token',
    };
    delete process.env['WARDEN_SERVICE_URL'];
    delete process.env['WARDEN_SERVICE_DATA'];
    delete process.env['WARDEN_SERVICE_MEMORY'];
    delete process.env['WARDEN_SERVICE_TIMEOUT_MS'];
    delete process.env['WARDEN_SENTRY_DSN'];
    cleanupArtifactsMock.mockReset();
    cleanupArtifactsMock.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.argv = originalArgv.slice();
    process.chdir(originalCwd);
    process.env = { ...originalEnv };
    process.exit = originalExit;
    rmSync(repoPath, { recursive: true, force: true });
  });

  function mockSuccessfulPublish() {
    return vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      protocolVersion: 1,
      runId: 'stored-run',
      checksum: 'a'.repeat(64),
      created: true,
    }));
  }

  it('publishes a skipped run when no files changed', async () => {
    const fetchMock = mockSuccessfulPublish();

    await main();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      source: 'cli',
      outcome: 'skipped',
      skills: [],
    });
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('publishes a skipped run when changed files match no trigger', async () => {
    writeFileSync(join(repoPath, 'README.md'), 'Documentation only.\n');
    git(repoPath, ['add', 'README.md']);
    const fetchMock = mockSuccessfulPublish();

    await main();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      source: 'cli',
      outcome: 'skipped',
      skills: [],
    });
    expect(process.exit).toHaveBeenCalledWith(0);
  });
});
