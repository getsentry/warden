import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

vi.mock('../utils/exec.js', () => ({
  execGitNonInteractive: vi.fn(),
}));

import { execGitNonInteractive } from '../utils/exec.js';
import { fetchRemote } from './remote.js';

describe('fetchRemote auth behavior', () => {
  const originalStateDir = process.env['WARDEN_STATE_DIR'];
  let stateDir: string;

  beforeEach(() => {
    stateDir = join(tmpdir(), `warden-remote-auth-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    process.env['WARDEN_STATE_DIR'] = stateDir;
    mkdirSync(stateDir, { recursive: true });

    vi.mocked(execGitNonInteractive).mockImplementation((args: string[]) => {
      if (args[0] === 'clone') {
        const targetDir = args[args.length - 1];
        if (typeof targetDir === 'string') {
          mkdirSync(targetDir, { recursive: true });
        }
        return '';
      }
      if (args[0] === 'rev-parse') return 'deadbeef';
      return '';
    });
  });

  afterEach(() => {
    if (originalStateDir === undefined) {
      delete process.env['WARDEN_STATE_DIR'];
    } else {
      process.env['WARDEN_STATE_DIR'] = originalStateDir;
    }
    rmSync(stateDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('uses runtime HTTPS clone URL and auth env for GitHub SSH remotes when token is set', async () => {
    await fetchRemote('git@github.com:owner/repo.git', { githubToken: 'test-token' });

    const cloneCall = vi.mocked(execGitNonInteractive).mock.calls.find((call) => call[0][0] === 'clone');
    expect(cloneCall).toBeDefined();
    expect(cloneCall?.[0]).toEqual(['clone', '--depth=1', '--', 'https://github.com/owner/repo.git', expect.any(String)]);

    const cloneOptions = cloneCall?.[1];
    expect(cloneOptions?.env?.['GIT_CONFIG_COUNT']).toBe('1');
    expect(cloneOptions?.env?.['GIT_CONFIG_KEY_0']).toBe('http.https://github.com/.extraheader');
    expect(cloneOptions?.env?.['GIT_CONFIG_VALUE_0']).toContain('AUTHORIZATION: basic ');
  });

  it('treats whitespace-only tokens as unset', async () => {
    await fetchRemote('git@github.com:owner/repo.git', { githubToken: '   ' });

    const cloneCall = vi.mocked(execGitNonInteractive).mock.calls.find((call) => call[0][0] === 'clone');
    expect(cloneCall).toBeDefined();
    expect(cloneCall?.[0]).toEqual(['clone', '--depth=1', '--', 'git@github.com:owner/repo.git', expect.any(String)]);

    const cloneOptions = cloneCall?.[1];
    expect(cloneOptions?.env?.['GIT_CONFIG_COUNT']).toBeUndefined();
    expect(cloneOptions?.env?.['GIT_CONFIG_KEY_0']).toBeUndefined();
    expect(cloneOptions?.env?.['GIT_CONFIG_VALUE_0']).toBeUndefined();
  });
});
