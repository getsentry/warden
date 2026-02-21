import { describe, it, expect } from 'vitest';
import { isSubprocessError } from './errors.js';

describe('isSubprocessError', () => {
  it('detects EPIPE errors', () => {
    expect(isSubprocessError(new Error('write EPIPE'))).toBe(true);
  });

  it('detects ECONNRESET errors', () => {
    expect(isSubprocessError(new Error('read ECONNRESET'))).toBe(true);
  });

  it('detects ECONNREFUSED errors', () => {
    expect(isSubprocessError(new Error('connect ECONNREFUSED 127.0.0.1:443'))).toBe(true);
  });

  it('detects ENOTCONN errors', () => {
    expect(isSubprocessError(new Error('socket ENOTCONN'))).toBe(true);
  });

  it('detects IPC codes in enhanced messages with stderr', () => {
    expect(
      isSubprocessError(
        new Error('write EPIPE\nClaude Code stderr: some debug output')
      )
    ).toBe(true);
  });

  it('detects Node.js ErrnoException with code property', () => {
    const err = new Error('write EPIPE') as NodeJS.ErrnoException;
    err.code = 'EPIPE';
    expect(isSubprocessError(err)).toBe(true);
  });

  it('detects ErrnoException code even without code in message', () => {
    const err = new Error('some generic message') as NodeJS.ErrnoException;
    err.code = 'ECONNRESET';
    expect(isSubprocessError(err)).toBe(true);
  });

  it('returns false for non-Error values', () => {
    expect(isSubprocessError('EPIPE')).toBe(false);
    expect(isSubprocessError(null)).toBe(false);
    expect(isSubprocessError(undefined)).toBe(false);
    expect(isSubprocessError(42)).toBe(false);
  });

  it('does not false-positive on IPC codes in appended stderr', () => {
    // executeQuery appends stderr to error messages — the message check should
    // only look at the original error, not the stderr content
    expect(
      isSubprocessError(
        new Error(
          'some unrelated error\nClaude Code stderr: retry after ECONNRESET from upstream'
        )
      )
    ).toBe(false);
  });

  it('returns false for unrelated errors', () => {
    expect(isSubprocessError(new Error('timeout'))).toBe(false);
    expect(isSubprocessError(new Error('rate limit exceeded'))).toBe(false);
    expect(isSubprocessError(new Error('authentication failed'))).toBe(false);
  });
});
