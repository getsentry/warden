/** Default retry configuration */
export const DEFAULT_RETRY_CONFIG = {
    maxRetries: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 30000,
};
/**
 * Calculate delay for a retry attempt using exponential backoff.
 */
export function calculateRetryDelay(attempt, config) {
    const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
    return Math.min(delay, config.maxDelayMs);
}
/**
 * Sleep for a specified duration, respecting abort signal.
 */
export async function sleep(ms, abortSignal) {
    return new Promise((resolve, reject) => {
        if (abortSignal?.aborted) {
            reject(new Error('Aborted'));
            return;
        }
        const timeout = setTimeout(resolve, ms);
        abortSignal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Aborted'));
        }, { once: true });
    });
}
//# sourceMappingURL=retry.js.map