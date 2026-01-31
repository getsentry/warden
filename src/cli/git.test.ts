import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { getDefaultBranch } from './git.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

const mockExecSync = vi.mocked(execSync);

describe('getDefaultBranch', () => {
  beforeEach(() => {
    mockExecSync.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns main when main branch exists locally', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd === 'git rev-parse --verify main') {
        return 'abc123\n';
      }
      throw new Error('Command failed');
    });

    expect(getDefaultBranch()).toBe('main');
  });

  it('returns master when main does not exist but master does', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd === 'git rev-parse --verify main') {
        throw new Error('Not found');
      }
      if (cmd === 'git rev-parse --verify master') {
        return 'abc123\n';
      }
      throw new Error('Command failed');
    });

    expect(getDefaultBranch()).toBe('master');
  });

  it('returns develop when main and master do not exist but develop does', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd === 'git rev-parse --verify main') {
        throw new Error('Not found');
      }
      if (cmd === 'git rev-parse --verify master') {
        throw new Error('Not found');
      }
      if (cmd === 'git rev-parse --verify develop') {
        return 'abc123\n';
      }
      throw new Error('Command failed');
    });

    expect(getDefaultBranch()).toBe('develop');
  });

  it('returns git config init.defaultBranch when no common branches exist', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd === 'git rev-parse --verify main') {
        throw new Error('Not found');
      }
      if (cmd === 'git rev-parse --verify master') {
        throw new Error('Not found');
      }
      if (cmd === 'git rev-parse --verify develop') {
        throw new Error('Not found');
      }
      if (cmd === 'git config init.defaultBranch') {
        return 'trunk\n';
      }
      throw new Error('Command failed');
    });

    expect(getDefaultBranch()).toBe('trunk');
  });

  it('returns hardcoded main when no branches exist and no config is set', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd === 'git rev-parse --verify main') {
        throw new Error('Not found');
      }
      if (cmd === 'git rev-parse --verify master') {
        throw new Error('Not found');
      }
      if (cmd === 'git rev-parse --verify develop') {
        throw new Error('Not found');
      }
      if (cmd === 'git config init.defaultBranch') {
        throw new Error('Config not set');
      }
      throw new Error('Command failed');
    });

    expect(getDefaultBranch()).toBe('main');
  });
});
