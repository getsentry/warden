import type { UsageStats } from '../types/index.js';

/**
 * Per-token pricing for Anthropic API models (USD per token).
 * The direct API doesn't return total_cost_usd like the Claude Code SDK,
 * so we calculate it from token counts.
 */
interface ModelPricing {
  inputPerToken: number;
  outputPerToken: number;
  cacheReadPerToken: number;
  cacheCreationPerToken: number;
}

/**
 * Pricing constants for models used in auxiliary calls.
 * Source: Anthropic pricing page. Updated as models change.
 */
const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-haiku-4-5': {
    inputPerToken: 0.80 / 1_000_000,
    outputPerToken: 4.00 / 1_000_000,
    cacheReadPerToken: 0.08 / 1_000_000,
    cacheCreationPerToken: 1.00 / 1_000_000,
  },
  'claude-haiku-4-5-20250929': {
    inputPerToken: 0.80 / 1_000_000,
    outputPerToken: 4.00 / 1_000_000,
    cacheReadPerToken: 0.08 / 1_000_000,
    cacheCreationPerToken: 1.00 / 1_000_000,
  },
};

/**
 * Usage shape returned by the Anthropic Messages API.
 */
interface ApiUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/**
 * Convert Anthropic API usage to our UsageStats format.
 * Calculates cost from token counts using model pricing.
 */
export function apiUsageToStats(model: string, usage: ApiUsage): UsageStats {
  const pricing = MODEL_PRICING[model];

  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;
  const cacheReadInputTokens = usage.cache_read_input_tokens ?? 0;
  const cacheCreationInputTokens = usage.cache_creation_input_tokens ?? 0;

  let costUSD = 0;
  if (pricing) {
    costUSD =
      inputTokens * pricing.inputPerToken +
      outputTokens * pricing.outputPerToken +
      cacheReadInputTokens * pricing.cacheReadPerToken +
      cacheCreationInputTokens * pricing.cacheCreationPerToken;
  }

  return {
    inputTokens,
    outputTokens,
    cacheReadInputTokens,
    cacheCreationInputTokens,
    costUSD,
  };
}
