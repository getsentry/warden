export { processInBatches, runPool, Semaphore } from './async.js';
export { getVersion, getMajorVersion } from './version.js';
export {
  ExecError,
  execNonInteractive,
  execFileNonInteractive,
  execGitNonInteractive,
  GIT_NON_INTERACTIVE_ENV,
} from './exec.js';
export { isPathLike } from './path.js';
export type { ExecOptions } from './exec.js';

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

/**
 * Additional WARDEN-prefixed env vars to bridge for providers that require
 * non-API-key credentials alongside their API key.
 *
 * These cannot be inferred from the WARDEN_X_API_KEY → X_API_KEY pattern
 * because they do not follow the _API_KEY suffix convention.
 *
 * Each entry is [warden-alias, native-env-var].
 */
const WARDEN_PROVIDER_ENV_BRIDGE: ReadonlyArray<readonly [string, string]> = [
  // Cloudflare Workers AI: requires account ID in addition to API key
  ['WARDEN_CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID'],
  // Cloudflare AI Gateway: additionally requires a gateway ID
  ['WARDEN_CLOUDFLARE_GATEWAY_ID', 'CLOUDFLARE_GATEWAY_ID'],
];

/**
 * Mirrors WARDEN-prefixed provider credentials to the env names expected by SDKs.
 *
 * Handles two classes of bridging:
 *
 * 1. Generic API keys: WARDEN_X_API_KEY → X_API_KEY for any provider.
 * 2. Provider-specific non-key vars: explicit list for credentials that
 *    providers require beyond their API key (e.g. Cloudflare account ID).
 *
 * Existing native env vars are never overwritten.
 */
export function bridgeWardenProviderApiKeyEnv(env: NodeJS.ProcessEnv = process.env): void {
  // Bridge WARDEN_X_API_KEY → X_API_KEY for all providers
  for (const [key, value] of Object.entries(env)) {
    if (!value || !key.startsWith('WARDEN_') || !key.endsWith('_API_KEY')) {
      continue;
    }

    const providerKey = key.slice('WARDEN_'.length);
    if (!env[providerKey]) {
      env[providerKey] = value;
    }
  }

  // Bridge provider-specific non-key credentials
  for (const [wardenKey, nativeKey] of WARDEN_PROVIDER_ENV_BRIDGE) {
    const value = env[wardenKey];
    if (value && !env[nativeKey]) {
      env[nativeKey] = value;
    }
  }
}
