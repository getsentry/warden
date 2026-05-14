import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventContext } from '../types/index.js';
import { verifyAuth } from '../sdk/runner.js';
import type * as RunnerModule from '../sdk/runner.js';
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
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-cli-auth-'));
    process.chdir(tempDir);
    process.env = { ...originalEnv };
    delete process.env['WARDEN_ANTHROPIC_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    verifyAuthMock.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
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
      code: 'unknown',
      message: 'Pi runtime model for security-review must use provider/model format: claude-sonnet-4-5',
    });
    expect(verifyAuthMock).not.toHaveBeenCalled();
  });
});
