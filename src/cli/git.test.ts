import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import { getDefaultBranch, getCurrentBranch } from './git.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

const mockExecSync = vi.mocked(execSync);

beforeEach(() => {
  mockExecSync.mockReset();
});

describe('git error handling', () => {
  it('includes stderr in error message when git command fails', () => {
    const error = new Error('Command failed') as Error & { stderr: string };
    error.stderr = 'fatal: not a git repository';
    mockExecSync.mockImplementation(() => {
      throw error;
    });

    expect(() => getCurrentBranch()).toThrow(
      'Git command failed: git rev-parse --abbrev-ref HEAD\nfatal: not a git repository'
    );
  });

  it('includes command in error message when stderr is empty', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('Command failed');
    });

    expect(() => getCurrentBranch()).toThrow(
      'Git command failed: git rev-parse --abbrev-ref HEAD\nCommand failed'
    );
  });
});

/**
 * Creates a mock that simulates git branch detection.
 * Returns success for branches in existingBranches, and optionally a config value.
 */
function mockBranchDetection(
  existingBranches: string[],
  configDefault?: string
): (cmd: string) => string {
  return (cmd: string) => {
    for (const branch of existingBranches) {
      if (cmd === `git rev-parse --verify ${branch}`) {
        return 'abc123\n';
      }
    }
    if (cmd === 'git config init.defaultBranch' && configDefault) {
      return `${configDefault}\n`;
    }
    throw new Error('Not found');
  };
}

describe('getDefaultBranch', () => {
  it('returns main when main branch exists locally', () => {
    mockExecSync.mockImplementation(mockBranchDetection(['main']));
    expect(getDefaultBranch()).toBe('main');
  });

  it('returns master when main does not exist but master does', () => {
    mockExecSync.mockImplementation(mockBranchDetection(['master']));
    expect(getDefaultBranch()).toBe('master');
  });

  it('returns develop when main and master do not exist but develop does', () => {
    mockExecSync.mockImplementation(mockBranchDetection(['develop']));
    expect(getDefaultBranch()).toBe('develop');
  });

  it('returns git config init.defaultBranch when no common branches exist', () => {
    mockExecSync.mockImplementation(mockBranchDetection([], 'trunk'));
    expect(getDefaultBranch()).toBe('trunk');
  });

  it('returns hardcoded main when no branches exist and no config is set', () => {
    mockExecSync.mockImplementation(mockBranchDetection([]));
    expect(getDefaultBranch()).toBe('main');
  });
});
