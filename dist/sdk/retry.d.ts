import type { RetryConfig } from '../types/index.js';
/** Default retry configuration */
export declare const DEFAULT_RETRY_CONFIG: Required<RetryConfig>;
/**
 * Calculate delay for a retry attempt using exponential backoff.
 */
export declare function calculateRetryDelay(attempt: number, config: Required<RetryConfig>): number;
/**
 * Sleep for a specified duration, respecting abort signal.
 */
export declare function sleep(ms: number, abortSignal?: AbortSignal): Promise<void>;
//# sourceMappingURL=retry.d.ts.map