import {
  APIError,
  RateLimitError,
  InternalServerError,
  APIConnectionError,
  APIConnectionTimeoutError,
} from '@anthropic-ai/sdk';

export class SkillRunnerError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SkillRunnerError';
  }
}

/** Patterns that indicate an authentication failure */
const AUTH_ERROR_PATTERNS = [
  'authentication',
  'unauthorized',
  'invalid.*api.*key',
  'invalid.*key',
  'not.*logged.*in',
  'login.*required',
  'api key',
];

/**
 * Check if an error message indicates an authentication failure.
 */
export function isAuthenticationErrorMessage(message: string): boolean {
  return AUTH_ERROR_PATTERNS.some((pattern) => new RegExp(pattern, 'i').test(message));
}

/** User-friendly error message for authentication failures */
const AUTH_ERROR_GUIDANCE = `
  claude login                             # Use Claude Code subscription
  export WARDEN_ANTHROPIC_API_KEY=sk-...   # Or use API key

https://console.anthropic.com/ for API keys`;

/** IPC/subprocess failure error codes (EPIPE, ECONNRESET, etc.) */
const IPC_ERROR_CODES = ['EPIPE', 'ECONNRESET', 'ECONNREFUSED', 'ENOTCONN'];

/**
 * Check if an error is an IPC/subprocess failure.
 * These occur when the Claude Code subprocess can't communicate (e.g., sandbox restrictions).
 */
export function isSubprocessError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  // Check error.code property (Node.js ErrnoException) first
  const errorCode = (error as NodeJS.ErrnoException).code;
  if (errorCode && IPC_ERROR_CODES.includes(errorCode)) return true;
  // Fallback: check the original error message only, not appended stderr content.
  // executeQuery appends "\nClaude Code stderr: ..." which could contain IPC codes
  // from debug output, causing false positives.
  const stderrIdx = error.message.indexOf('\nClaude Code stderr:');
  const message = stderrIdx >= 0 ? error.message.slice(0, stderrIdx) : error.message;
  return IPC_ERROR_CODES.some((code) => message.includes(code));
}

export class WardenAuthenticationError extends Error {
  constructor(sdkError?: string) {
    const message = sdkError
      ? `Authentication failed: ${sdkError}\n${AUTH_ERROR_GUIDANCE}`
      : `Authentication required.${AUTH_ERROR_GUIDANCE}`;
    super(message);
    this.name = 'WardenAuthenticationError';
  }
}

/**
 * Check if an error is retryable.
 * Retries on: rate limits (429), server errors (5xx), connection errors, timeouts.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof RateLimitError) return true;
  if (error instanceof InternalServerError) return true;
  if (error instanceof APIConnectionError) return true;
  if (error instanceof APIConnectionTimeoutError) return true;

  // Check for generic APIError with retryable status codes
  if (error instanceof APIError) {
    const status = error.status;
    if (status === 429) return true;
    if (status !== undefined && status >= 500 && status < 600) return true;
  }

  return false;
}

/**
 * Check if an error is an authentication failure.
 * These require user action (login or API key) and should not be retried.
 */
export function isAuthenticationError(error: unknown): boolean {
  if (error instanceof APIError && error.status === 401) {
    return true;
  }

  // Check error message for common auth failure patterns
  const message = error instanceof Error ? error.message : String(error);
  return isAuthenticationErrorMessage(message);
}
