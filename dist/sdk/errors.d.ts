export declare class SkillRunnerError extends Error {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
/**
 * Check if an error message indicates an authentication failure.
 */
export declare function isAuthenticationErrorMessage(message: string): boolean;
export declare class WardenAuthenticationError extends Error {
    constructor(sdkError?: string);
}
/**
 * Check if an error is retryable.
 * Retries on: rate limits (429), server errors (5xx), connection errors, timeouts.
 */
export declare function isRetryableError(error: unknown): boolean;
/**
 * Check if an error is an authentication failure.
 * These require user action (login or API key) and should not be retried.
 */
export declare function isAuthenticationError(error: unknown): boolean;
//# sourceMappingURL=errors.d.ts.map