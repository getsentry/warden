import { APIError, RateLimitError, InternalServerError, APIConnectionError, APIConnectionTimeoutError, } from '@anthropic-ai/sdk';
export class SkillRunnerError extends Error {
    constructor(message, options) {
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
export function isAuthenticationErrorMessage(message) {
    return AUTH_ERROR_PATTERNS.some((pattern) => new RegExp(pattern, 'i').test(message));
}
/** User-friendly error message for authentication failures */
const AUTH_ERROR_GUIDANCE = `
  claude login                             # Use Claude Code subscription
  export WARDEN_ANTHROPIC_API_KEY=sk-...   # Or use API key

https://console.anthropic.com/ for API keys`;
export class WardenAuthenticationError extends Error {
    constructor(sdkError) {
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
export function isRetryableError(error) {
    if (error instanceof RateLimitError)
        return true;
    if (error instanceof InternalServerError)
        return true;
    if (error instanceof APIConnectionError)
        return true;
    if (error instanceof APIConnectionTimeoutError)
        return true;
    // Check for generic APIError with retryable status codes
    if (error instanceof APIError) {
        const status = error.status;
        if (status === 429)
            return true;
        if (status !== undefined && status >= 500 && status < 600)
            return true;
    }
    return false;
}
/**
 * Check if an error is an authentication failure.
 * These require user action (login or API key) and should not be retried.
 */
export function isAuthenticationError(error) {
    if (error instanceof APIError && error.status === 401) {
        return true;
    }
    // Check error message for common auth failure patterns
    const message = error instanceof Error ? error.message : String(error);
    return isAuthenticationErrorMessage(message);
}
//# sourceMappingURL=errors.js.map