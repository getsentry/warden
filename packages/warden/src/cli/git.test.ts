import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDefaultBranch, getCurrentBranch, getCommitMessage } from './git.js';

vi.mock('../utils/exec.js', () => ({
  execGitNonInteractive: vi.fn(),
}));

import { execGitNonInteractive } from '../utils/exec.js';

const mockExecGit = vi.mocked(execGitNonInteractive);

beforeEach(() => {
  mockExecGit.mockReset();
});

describe('git error handling', () => {
  it('includes error message when git command fails', () => {
    mockExecGit.mockImplementation(() => {
      throw new Error('Command failed: git rev-parse --abbrev-ref HEAD\nfatal: not a git repository');
    });

    expect(() => getCurrentBranch()).toThrow(
      'Git command failed: git rev-parse --abbrev-ref HEAD\nCommand failed: git rev-parse --abbrev-ref HEAD\nfatal: not a git repository'
    );
  });

  it('includes command in error message when error is simple', () => {
    mockExecGit.mockImplementation(() => {
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
 * remoteHead simulates the output of `git symbolic-ref refs/remotes/origin/HEAD`.
 */
function mockBranchDetection(
  existingBranches: string[],
  options?: { configDefault?: string; remoteHead?: string }
): (args: string[]) => string {
  return (args: string[]) => {
    const cmd = args.join(' ');
    for (const branch of existingBranches) {
      if (cmd === `rev-parse --verify ${branch}`) {
        return 'abc123';
      }
    }
    if (cmd === 'symbolic-ref refs/remotes/origin/HEAD' && options?.remoteHead) {
      return options.remoteHead;
    }
    if (cmd === 'config init.defaultBranch' && options?.configDefault) {
      return options.configDefault;
    }
    throw new Error('Not found');
  };
}

describe('getDefaultBranch', () => {
  it('returns main when main branch exists locally', () => {
    mockExecGit.mockImplementation(mockBranchDetection(['main']));
    expect(getDefaultBranch()).toBe('main');
  });

  it('returns master when main does not exist but master does', () => {
    mockExecGit.mockImplementation(mockBranchDetection(['master']));
    expect(getDefaultBranch()).toBe('master');
  });

  it('returns develop when main and master do not exist but develop does', () => {
    mockExecGit.mockImplementation(mockBranchDetection(['develop']));
    expect(getDefaultBranch()).toBe('develop');
  });

  it('returns origin/main in shallow clone where only remote tracking refs exist', () => {
    mockExecGit.mockImplementation(mockBranchDetection(['origin/main']));
    expect(getDefaultBranch()).toBe('origin/main');
  });

  it('returns origin/master when origin/main does not exist', () => {
    mockExecGit.mockImplementation(mockBranchDetection(['origin/master']));
    expect(getDefaultBranch()).toBe('origin/master');
  });

  it('prefers local branch over remote tracking ref', () => {
    mockExecGit.mockImplementation(mockBranchDetection(['main', 'origin/main']));
    expect(getDefaultBranch()).toBe('main');
  });

  it('returns remote HEAD symbolic ref when no branches exist', () => {
    mockExecGit.mockImplementation(
      mockBranchDetection([], { remoteHead: 'refs/remotes/origin/main' })
    );
    expect(getDefaultBranch()).toBe('origin/main');
  });

  it('returns git config init.defaultBranch when no common branches exist', () => {
    mockExecGit.mockImplementation(mockBranchDetection([], { configDefault: 'trunk' }));
    expect(getDefaultBranch()).toBe('trunk');
  });

  it('returns hardcoded main when no branches exist and no config is set', () => {
    mockExecGit.mockImplementation(mockBranchDetection([]));
    expect(getDefaultBranch()).toBe('main');
  });
});

describe('getCommitMessage', () => {
  it('returns subject and body from commit', () => {
    mockExecGit.mockImplementation((args: string[]) => {
      const cmd = args.join(' ');
      if (cmd === 'log -1 --format=%s HEAD') {
        return 'feat: Add new feature';
      }
      if (cmd === 'log -1 --format=%b HEAD') {
        return 'This is the commit body.\n\nWith multiple paragraphs.';
      }
      throw new Error('Unexpected command');
    });

    const result = getCommitMessage('HEAD');
    expect(result.subject).toBe('feat: Add new feature');
    expect(result.body).toBe('This is the commit body.\n\nWith multiple paragraphs.');
  });

  it('returns empty body when commit has no body', () => {
    mockExecGit.mockImplementation((args: string[]) => {
      const cmd = args.join(' ');
      if (cmd === 'log -1 --format=%s abc123') {
        return 'fix: Quick fix';
      }
      if (cmd === 'log -1 --format=%b abc123') {
        return '';
      }
      throw new Error('Unexpected command');
    });

    const result = getCommitMessage('abc123');
    expect(result.subject).toBe('fix: Quick fix');
    expect(result.body).toBe('');
  });
});
