import { describe, it, expect } from 'vitest';
import { APIError } from '@anthropic-ai/sdk';
import {
  classifyError,
  isSubprocessError,
  mapExtractionErrorCode,
  sanitizeErrorMessage,
  SkillRunnerError,
  WardenAuthenticationError,
} from './errors.js';

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

describe('classifyError', () => {
  it('maps WardenAuthenticationError to auth_failed', () => {
    const result = classifyError(new WardenAuthenticationError('bad key'));
    expect(result.code).toBe('auth_failed');
    expect(result.message).toContain('bad key');
  });

  it('respects SkillRunnerError.code when set', () => {
    const err = new SkillRunnerError('all chunks failed', { code: 'all_hunks_failed' });
    expect(classifyError(err)).toEqual({ code: 'all_hunks_failed', message: 'all chunks failed' });
  });

  it('tags subprocess errors as subprocess_failure', () => {
    const err = new Error('write EPIPE') as NodeJS.ErrnoException;
    err.code = 'EPIPE';
    expect(classifyError(err).code).toBe('subprocess_failure');
  });

  it('tags 401 APIError as auth_failed', () => {
    const err = new APIError(
      401,
      { error: { type: 'authentication_error', message: 'invalid key' } },
      'invalid key',
      undefined
    );
    expect(classifyError(err).code).toBe('auth_failed');
  });

  it('tags retryable API errors as provider_unavailable', () => {
    const err = new APIError(
      529,
      { error: { type: 'overloaded_error', message: 'overloaded' } },
      'overloaded',
      undefined
    );
    expect(classifyError(err).code).toBe('provider_unavailable');
  });

  it('tags Claude Code process exits as provider_unavailable', () => {
    expect(classifyError(new Error('Claude Code process exited with code 1')).code).toBe('provider_unavailable');
  });

  it('tags AbortError as aborted', () => {
    const err = new Error('The operation was aborted');
    err.name = 'AbortError';
    expect(classifyError(err).code).toBe('aborted');
  });

  it('sniffs "aborted" in the message as aborted', () => {
    expect(classifyError(new Error('Analysis aborted during retry delay')).code).toBe('aborted');
  });

  it('falls back to unknown with the raw message', () => {
    expect(classifyError(new Error('kaboom'))).toEqual({ code: 'unknown', message: 'kaboom' });
  });

  it('stringifies non-Error values', () => {
    expect(classifyError(null).message).toContain('unknown error');
    expect(classifyError('boom').message).toBe('boom');
    expect(classifyError(undefined).message).toContain('unknown error');
  });
});

describe('sanitizeErrorMessage', () => {
  it('redacts Anthropic and generic secret-looking keys', () => {
    const sanitized = sanitizeErrorMessage(
      'request failed for apiKey=sk-ant-api03-secret and backup sk-abcdefghijklmnop'
    );
    expect(sanitized).not.toContain('sk-ant-api03-secret');
    expect(sanitized).not.toContain('sk-abcdefghijklmnop');
    expect(sanitized).toContain('[redacted]');
  });

  it('redacts authorization tokens', () => {
    expect(sanitizeErrorMessage('Authorization: Bearer secret.token-value')).toBe(
      'Authorization: Bearer [redacted]'
    );
    expect(sanitizeErrorMessage('oauth_token=abc123')).toBe('oauth_token=[redacted]');
  });
});

describe('mapExtractionErrorCode', () => {
  it('maps known extraction strings to public codes', () => {
    expect(mapExtractionErrorCode('invalid_json')).toBe('extraction_invalid_json');
    expect(mapExtractionErrorCode('unbalanced_json')).toBe('extraction_unbalanced_json');
    expect(mapExtractionErrorCode('no_findings_json')).toBe('extraction_no_findings_json');
    expect(mapExtractionErrorCode('no_findings_to_extract')).toBe('extraction_no_findings_json');
    expect(mapExtractionErrorCode('missing_findings_key')).toBe('extraction_missing_findings_key');
    expect(mapExtractionErrorCode('findings_not_array')).toBe('extraction_findings_not_array');
    expect(mapExtractionErrorCode('no_api_key_for_fallback')).toBe('extraction_no_api_key');
  });

  it('maps llm_extraction_failed prefix and timeout variant', () => {
    expect(mapExtractionErrorCode('llm_extraction_failed: rate limit')).toBe('extraction_llm_failed');
    expect(mapExtractionErrorCode('llm_extraction_failed: Request timed out')).toBe('extraction_llm_timeout');
  });

  it('returns unknown for unfamiliar strings', () => {
    expect(mapExtractionErrorCode('something_new')).toBe('unknown');
    expect(mapExtractionErrorCode(undefined)).toBe('unknown');
  });
});
