export { processInBatches } from './async.js';
export { getVersion, getMajorVersion } from './version.js';

/** Default concurrency for parallel trigger/skill execution */
export const DEFAULT_CONCURRENCY = 4;

/**
 * Escape HTML special characters to prevent them from being interpreted as HTML.
 * Preserves content inside markdown code blocks (```) and inline code (`).
 * Used when rendering finding titles/descriptions in GitHub comments.
 */
export function escapeHtml(text: string): string {
  // Extract code blocks and inline code, escape HTML in the rest
  const codeBlocks: string[] = [];

  // Replace code blocks (``` ... ```) and inline code (` ... `) with indexed placeholders
  // Process triple backticks first (they may contain single backticks)
  let processed = text.replace(/```[\s\S]*?```/g, (match) => {
    const idx = codeBlocks.length;
    codeBlocks.push(match);
    return `\0CODE${idx}\0`;
  });

  // Then process inline code (single backticks)
  processed = processed.replace(/`[^`]+`/g, (match) => {
    const idx = codeBlocks.length;
    codeBlocks.push(match);
    return `\0CODE${idx}\0`;
  });

  // Escape HTML in the non-code portions
  processed = processed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Restore code blocks by index
  codeBlocks.forEach((block, i) => {
    processed = processed.replace(`\0CODE${i}\0`, block);
  });

  return processed;
}

/**
 * Get the Anthropic API key from environment variables.
 * Checks WARDEN_ANTHROPIC_API_KEY first, then falls back to ANTHROPIC_API_KEY.
 */
export function getAnthropicApiKey(): string | undefined {
  return process.env['WARDEN_ANTHROPIC_API_KEY'] ?? process.env['ANTHROPIC_API_KEY'];
}
