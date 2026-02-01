import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDefaultBranch, getCurrentBranch, getCommitMessage } from './git.js';

vi.mock('../utils/exec.js', () => ({
  execNonInteractive: vi.fn(),
}));

import { execNonInteractive } from '../utils/exec.js';

const mockExecNonInteractive = vi.mocked(execNonInteractive);

beforeEach(() => {
  mockExecNonInteractive.mockReset();
});

describe('git error handling', () => {
  it('includes error message when git command fails', () => {
    mockExecNonInteractive.mockImplementation(() => {
      throw new Error('Command failed: git rev-parse --abbrev-ref HEAD\nfatal: not a git repository');
    });

    expect(() => getCurrentBranch()).toThrow(
      'Git command failed: git rev-parse --abbrev-ref HEAD\nCommand failed: git rev-parse --abbrev-ref HEAD\nfatal: not a git repository'
    );
  });

  it('includes command in error message when error is simple', () => {
    mockExecNonInteractive.mockImplementation(() => {
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
 * Note: execNonInteractive returns trimmed output, so no trailing newlines.
 */
function mockBranchDetection(
  existingBranches: string[],
  configDefault?: string
): (cmd: string) => string {
  return (cmd: string) => {
    for (const branch of existingBranches) {
      if (cmd === `git rev-parse --verify ${branch}`) {
        return 'abc123';
      }
    }
    if (cmd === 'git config init.defaultBranch' && configDefault) {
      return configDefault;
    }
    throw new Error('Not found');
  };
}

describe('getDefaultBranch', () => {
  it('returns main when main branch exists locally', () => {
    mockExecNonInteractive.mockImplementation(mockBranchDetection(['main']));
    expect(getDefaultBranch()).toBe('main');
  });

  it('returns master when main does not exist but master does', () => {
    mockExecNonInteractive.mockImplementation(mockBranchDetection(['master']));
    expect(getDefaultBranch()).toBe('master');
  });

  it('returns develop when main and master do not exist but develop does', () => {
    mockExecNonInteractive.mockImplementation(mockBranchDetection(['develop']));
    expect(getDefaultBranch()).toBe('develop');
  });

  it('returns git config init.defaultBranch when no common branches exist', () => {
    mockExecNonInteractive.mockImplementation(mockBranchDetection([], 'trunk'));
    expect(getDefaultBranch()).toBe('trunk');
  });

  it('returns hardcoded main when no branches exist and no config is set', () => {
    mockExecNonInteractive.mockImplementation(mockBranchDetection([]));
    expect(getDefaultBranch()).toBe('main');
  });
});

describe('getCommitMessage', () => {
  it('returns subject and body from commit', () => {
    mockExecNonInteractive.mockImplementation((cmd: string) => {
      if (cmd === 'git log -1 --format=%s HEAD') {
        return 'feat: Add new feature';
      }
      if (cmd === 'git log -1 --format=%b HEAD') {
        return 'This is the commit body.\n\nWith multiple paragraphs.';
      }
      throw new Error('Unexpected command');
    });

    const result = getCommitMessage('HEAD');
    expect(result.subject).toBe('feat: Add new feature');
    expect(result.body).toBe('This is the commit body.\n\nWith multiple paragraphs.');
  });

  it('returns empty body when commit has no body', () => {
    mockExecNonInteractive.mockImplementation((cmd: string) => {
      if (cmd === 'git log -1 --format=%s abc123') {
        return 'fix: Quick fix';
      }
      if (cmd === 'git log -1 --format=%b abc123') {
        return '';
      }
      throw new Error('Unexpected command');
    });

    const result = getCommitMessage('abc123');
    expect(result.subject).toBe('fix: Quick fix');
    expect(result.body).toBe('');
  });
});
