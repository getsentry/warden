export { processInBatches } from './async.js';
export { getVersion, getMajorVersion } from './version.js';
/** Default concurrency for parallel trigger/skill execution */
export declare const DEFAULT_CONCURRENCY = 4;
/**
 * Escape HTML special characters to prevent them from being interpreted as HTML.
 * Preserves content inside markdown code blocks (```) and inline code (`).
 * Used when rendering finding titles/descriptions in GitHub comments.
 */
export declare function escapeHtml(text: string): string;
/**
 * Get the Anthropic API key from environment variables.
 * Checks WARDEN_ANTHROPIC_API_KEY first, then falls back to ANTHROPIC_API_KEY.
 */
export declare function getAnthropicApiKey(): string | undefined;
//# sourceMappingURL=index.d.ts.map