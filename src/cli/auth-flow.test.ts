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

  it('checks auth before returning success for no matching skills', async () => {
    verifyAuthMock.mockImplementation(() => {
      throw new Error('bad auth');
    });

    const exitCode = await runSkills(
      makeContext(tempDir),
      CLIOptionsSchema.parse({ targets: ['src/example.ts'], quiet: true }),
      new Reporter({ isTTY: false, supportsColor: false, columns: 80 }, Verbosity.Quiet)
    );

    expect(exitCode).toBe(1);
    expect(verifyAuthMock).toHaveBeenCalledWith({ apiKey: undefined });
  });
});
