export { processInBatches } from './async.js';
/** Default concurrency for parallel trigger/skill execution */
export declare const DEFAULT_CONCURRENCY = 4;
/**
 * Get the Anthropic API key from environment variables.
 * Checks WARDEN_ANTHROPIC_API_KEY first, then falls back to ANTHROPIC_API_KEY.
 */
export declare function getAnthropicApiKey(): string | undefined;
//# sourceMappingURL=index.d.ts.map