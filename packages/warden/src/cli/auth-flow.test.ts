import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventContext } from '../types/index.js';
import { verifyAuth } from '../sdk/runner.js';
import type * as RunnerModule from '../sdk/runner.js';
import { WardenAuthenticationError } from '../sdk/errors.js';
import { CLIOptionsSchema } from './args.js';
import { runSkills } from './main.js';
import { Reporter, Verbosity } from './output/index.js';

vi.mock('../sdk/runner.js', async (importOriginal) => {
  const actual = await importOriginal<typeof RunnerModule>();
  return {
    ...actual,
    verifyAuth: vi.fn(),
  };
});

const verifyAuthMock = vi.mocked(verifyAuth);

function makeContext(repoPath: string): EventContext {
  return {
    eventType: 'pull_request',
    action: 'opened',
    repository: {
      owner: 'local',
      name: 'repo',
      fullName: 'local/repo',
      defaultBranch: 'main',
    },
    pullRequest: {
      number: 1,
      title: 'File analysis',
      body: null,
      author: 'local',
      baseBranch: 'main',
      headBranch: 'feature',
      headSha: 'head',
      baseSha: 'base',
      files: [],
    },
    repoPath,
    diffContextSource: { type: 'working-tree' },
  };
}

describe('runSkills auth flow', () => {
  const originalEnv = { ...process.env };
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-cli-auth-'));
    process.chdir(tempDir);
    process.env = { ...originalEnv };
    delete process.env['WARDEN_ANTHROPIC_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];
    delete process.env['CLAUDE_CODE_PATH'];
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    verifyAuthMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.chdir(originalCwd);
    process.env = { ...originalEnv };
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('does not check Claude auth when no skills will run', async () => {
    verifyAuthMock.mockImplementation(() => {
      throw new Error('bad auth');
    });

    const exitCode = await runSkills(
      makeContext(tempDir),
      CLIOptionsSchema.parse({ targets: ['src/example.ts'], quiet: true }),
      new Reporter({ isTTY: false, supportsColor: false, columns: 80 }, Verbosity.Quiet)
    );

    expect(exitCode).toBe(0);
    expect(verifyAuthMock).not.toHaveBeenCalled();
  });

  it('publishes a no-skill run as skipped when the service is configured', async () => {
    process.env['WARDEN_SERVICE_TOKEN'] = 'warden-test-token';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      protocolVersion: 1,
      runId: 'stored-run',
      checksum: 'a'.repeat(64),
      created: true,
    }));

    const exitCode = await runSkills(
      makeContext(tempDir),
      CLIOptionsSchema.parse({
        targets: ['src/example.ts'],
        serviceUrl: 'https://warden.example.com',
        quiet: true,
      }),
      new Reporter({ isTTY: false, supportsColor: false, columns: 80 }, Verbosity.Quiet),
    );

    expect(exitCode).toBe(0);
    expect(verifyAuthMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      source: 'cli',
      outcome: 'skipped',
      skills: [],
    });
  });

  it('emits a JSONL error when Pi model validation fails', async () => {
    const writes: string[] = [];
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf-8'));
      return true;
    });

    const exitCode = await runSkills(
      makeContext(tempDir),
      CLIOptionsSchema.parse({
        targets: ['src/example.ts'],
        skill: 'security-review',
        model: 'claude-sonnet-4-5',
        json: true,
        quiet: true,
      }),
      new Reporter({ isTTY: false, supportsColor: false, columns: 80 }, Verbosity.Quiet)
    );

    const [summaryLine] = writes.join('').trim().split('\n');
    const summary = JSON.parse(summaryLine ?? '{}') as { error?: { code?: string; message?: string } };

    expect(exitCode).toBe(1);
    expect(stdoutSpy).toHaveBeenCalled();
    expect(summary.error).toMatchObject({
      code: 'invalid_model_selector',
      message: 'Pi runtime model for security-review must use provider/model format: claude-sonnet-4-5',
    });
    expect(verifyAuthMock).not.toHaveBeenCalled();
  });

  it('checks Claude auth for CLI runtime override and forwards CLAUDE_CODE_PATH', async () => {
    const fakeClaudePath = join(tempDir, 'fake-claude');
    process.env['CLAUDE_CODE_PATH'] = fakeClaudePath;
    verifyAuthMock.mockImplementation(() => {
      throw new WardenAuthenticationError('missing auth');
    });

    const exitCode = await runSkills(
      makeContext(tempDir),
      CLIOptionsSchema.parse({
        targets: ['src/example.ts'],
        skill: 'security-review',
        runtime: 'claude',
        quiet: true,
      }),
      new Reporter({ isTTY: false, supportsColor: false, columns: 80 }, Verbosity.Quiet)
    );

    expect(exitCode).toBe(1);
    expect(verifyAuthMock).toHaveBeenCalledWith({
      apiKey: undefined,
      pathToClaudeCodeExecutable: fakeClaudePath,
    });
  });

  it('publishes a metrics envelope after writing an early authentication failure', async () => {
    process.env['WARDEN_SERVICE_TOKEN'] = 'warden-test-token';
    verifyAuthMock.mockImplementation(() => {
      throw new WardenAuthenticationError('missing auth');
    });
    const writes: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
      return true;
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      expect(writes.join('')).toContain('"error":{"code":"auth_failed"');
      return Response.json({
        protocolVersion: 1,
        runId: 'stored-run',
        checksum: 'a'.repeat(64),
        created: true,
      });
    });

    const exitCode = await runSkills(
      makeContext(tempDir),
      CLIOptionsSchema.parse({
        targets: ['src/example.ts'],
        skill: 'security-review',
        runtime: 'claude',
        serviceUrl: 'https://warden.example.com',
        serviceData: 'findings',
        json: true,
        quiet: true,
      }),
      new Reporter({ isTTY: false, supportsColor: false, columns: 80 }, Verbosity.Quiet),
    );

    expect(exitCode).toBe(1);
    expect(fetchMock).toHaveBeenCalledOnce();
    const summary = JSON.parse(writes.join('').trim()) as { run: { runId: string } };
    const [, request] = fetchMock.mock.calls[0] ?? [];
    const envelope = JSON.parse(String(request?.body)) as {
      clientRunId: string;
      dataProfile: string;
      outcome: string;
      skills: { errorCode?: string }[];
    };
    expect(envelope).toMatchObject({
      clientRunId: summary.run.runId,
      dataProfile: 'metrics',
      outcome: 'failure',
      skills: [{ errorCode: 'auth_failed' }],
    });
  });

  it('preserves CLI exit status and JSONL when early publication fails', async () => {
    process.env['WARDEN_SERVICE_TOKEN'] = 'warden-test-token';
    verifyAuthMock.mockImplementation(() => {
      throw new WardenAuthenticationError('missing auth');
    });
    const writes: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
      return true;
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network unavailable'));

    const exitCode = await runSkills(
      makeContext(tempDir),
      CLIOptionsSchema.parse({
        targets: ['src/example.ts'],
        skill: 'security-review',
        runtime: 'claude',
        serviceUrl: 'https://warden.example.com',
        json: true,
        quiet: true,
      }),
      new Reporter({ isTTY: false, supportsColor: false, columns: 80 }, Verbosity.Quiet),
    );

    expect(exitCode).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(writes.join('').trim())).toMatchObject({
      error: { code: 'auth_failed', message: expect.stringContaining('missing auth') },
      totalFindings: 0,
    });
  });

  it('checks Claude auth for config default runtime', async () => {
    const configPath = join(tempDir, 'warden.toml');
    writeFileSync(configPath, [
      'version = 1',
      '',
      '[defaults]',
      'runtime = "claude"',
      '',
      '[[skills]]',
      'name = "security-review"',
      '',
    ].join('\n'));
    verifyAuthMock.mockImplementation(() => {
      throw new WardenAuthenticationError('missing auth');
    });

    const exitCode = await runSkills(
      makeContext(tempDir),
      CLIOptionsSchema.parse({
        targets: ['src/example.ts'],
        skill: 'security-review',
        configPath,
        quiet: true,
      }),
      new Reporter({ isTTY: false, supportsColor: false, columns: 80 }, Verbosity.Quiet)
    );

    expect(exitCode).toBe(1);
    expect(verifyAuthMock).toHaveBeenCalledWith({
      apiKey: undefined,
      pathToClaudeCodeExecutable: undefined,
    });
  });
});
