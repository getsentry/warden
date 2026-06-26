/**
 * Normalization and auth resolution for custom OpenAI-compatible providers
 * (e.g. self-hosted LiteLLM). Pure functions over a passed-in env object so
 * they are trivially testable and never read process.env implicitly.
 */
import type { ProvidersConfig } from '../../config/schema.js';

const DEFAULT_CONTEXT_WINDOW = 128_000;
const DEFAULT_MAX_TOKENS = 8_192;
const DEFAULT_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } as const;

function sanitizeProviderName(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

export interface PiProviderModel {
  id: string;
  name: string;
  api: 'openai-completions';
  reasoning: boolean;
  input: ('text' | 'image')[];
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
  contextWindow: number;
  maxTokens: number;
}

export interface PiProvider {
  name: string;
  baseUrl: string;
  api: 'openai-completions';
  headers?: Record<string, string>;
  apiKey?: string;
  models: PiProviderModel[];
}

export type PiProviderOptions = { providers: PiProvider[] } | undefined;

/** Resolve a provider API key from the environment. apiKeyEnv wins, then conventional names. */
export function resolveProviderApiKey(
  name: string,
  apiKeyEnv: string | undefined,
  env: NodeJS.ProcessEnv,
): string | undefined {
  const upper = sanitizeProviderName(name);
  const candidates = apiKeyEnv ? [apiKeyEnv] : [`WARDEN_${upper}_API_KEY`, `${upper}_API_KEY`];
  for (const candidate of candidates) {
    const value = env[candidate];
    if (value) return value;
  }
  return undefined;
}

/** Normalize warden.toml providers into Pi registerProvider input with defaults + resolved keys. */
export function buildPiProviderOptions(
  providers: ProvidersConfig | undefined,
  env: NodeJS.ProcessEnv,
): PiProviderOptions {
  if (!providers) return undefined;
  const entries = Object.entries(providers);
  if (entries.length === 0) return undefined;

  const built: PiProvider[] = entries.map(([name, config]) => ({
    name,
    baseUrl: config.baseUrl,
    api: config.api,
    ...(config.headers ? { headers: config.headers } : {}),
    apiKey: resolveProviderApiKey(name, config.apiKeyEnv, env),
    models: config.models.map((model) => ({
      id: model.id,
      name: model.name ?? model.id,
      api: config.api,
      reasoning: model.reasoning ?? false,
      input: model.input ?? ['text'],
      cost: model.cost ?? { ...DEFAULT_COST },
      contextWindow: model.contextWindow ?? DEFAULT_CONTEXT_WINDOW,
      maxTokens: model.maxTokens ?? DEFAULT_MAX_TOKENS,
    })),
  }));

  return { providers: built };
}

/** True when the base URL points at a loopback host (unauthenticated runs allowed). */
export function isLoopbackBaseUrl(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  } catch {
    return false;
  }
}

/** Fail fast when a non-loopback provider has no resolvable API key. */
export function assertCustomProviderAuth(options: PiProviderOptions): void {
  if (!options) return;
  for (const provider of options.providers) {
    if (!provider.apiKey && !isLoopbackBaseUrl(provider.baseUrl)) {
      throw new Error(
        `Custom provider "${provider.name}" has no API key. ` +
        `Set WARDEN_${sanitizeProviderName(provider.name)}_API_KEY ` +
        `(or the configured apiKeyEnv), or use a localhost baseUrl for an unauthenticated endpoint.`,
      );
    }
  }
}
