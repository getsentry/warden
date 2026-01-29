export { processInBatches } from './async.js';

/** Default concurrency for parallel trigger/skill execution */
export const DEFAULT_CONCURRENCY = 4;

/**
 * Get the Anthropic API key from environment variables.
 * Checks WARDEN_ANTHROPIC_API_KEY first, then falls back to ANTHROPIC_API_KEY.
 */
export function getAnthropicApiKey(): string | undefined {
  return process.env['WARDEN_ANTHROPIC_API_KEY'] ?? process.env['ANTHROPIC_API_KEY'];
}
