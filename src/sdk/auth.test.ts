import { describe, it, expect, vi } from 'vitest';
import { verifyAuth } from './auth.js';
import { WardenAuthenticationError } from './errors.js';
import { ExecError } from '../utils/exec.js';

vi.mock('../utils/exec.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as Record<string, unknown>),
    execFileNonInteractive: vi.fn(),
  };
});

import { execFileNonInteractive } from '../utils/exec.js';

const mockExec = vi.mocked(execFileNonInteractive);

describe('verifyAuth', () => {
  it('returns immediately when API key is provided', () => {
    verifyAuth({ apiKey: 'sk-test-key' });
    expect(mockExec).not.toHaveBeenCalled();
  });

  it('checks for claude binary when no API key', () => {
    mockExec.mockReturnValue('1.0.0');
    verifyAuth({ apiKey: undefined });
    expect(mockExec).toHaveBeenCalledWith('claude', ['--version'], { timeout: 5000 });
  });

  it('throws WardenAuthenticationError when claude binary is missing', () => {
    mockExec.mockImplementation(() => {
      throw new ExecError('claude --version', null, 'spawn claude ENOENT', null);
    });
    expect(() => verifyAuth({ apiKey: undefined })).toThrow(WardenAuthenticationError);
  });

  it('includes actionable guidance in error message for missing binary', () => {
    mockExec.mockImplementation(() => {
      throw new ExecError('claude --version', null, 'spawn claude ENOENT', null);
    });
    try {
      verifyAuth({ apiKey: undefined });
      expect.fail('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(WardenAuthenticationError);
      expect((error as Error).message).toContain('Claude Code CLI not found');
      expect((error as Error).message).toContain('WARDEN_ANTHROPIC_API_KEY');
    }
  });

  it('reports distinct error when binary exists but fails to execute', () => {
    mockExec.mockImplementation(() => {
      throw new ExecError('claude --version', 1, 'Permission denied', null);
    });
    try {
      verifyAuth({ apiKey: undefined });
      expect.fail('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(WardenAuthenticationError);
      expect((error as Error).message).toContain('failed to execute');
      expect((error as Error).message).toContain('Permission denied');
    }
  });
});
