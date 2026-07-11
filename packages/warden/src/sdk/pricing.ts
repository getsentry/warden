import { calculateCost, type Usage } from '@earendil-works/pi-ai';
import { anthropicProvider } from '@earendil-works/pi-ai/providers/anthropic';
import type { UsageStats } from '../types/index.js';

const WEB_SEARCH_PER_REQUEST_USD = 0.01;

export interface UsageCostBreakdown {
  freshInputUSD: number;
  outputUSD: number;
  cacheReadUSD: number;
  cacheCreationUSD: number;
  cacheCreation5mUSD: number;
  cacheCreation1hUSD: number;
  webSearchUSD: number;
  totalUSD: number;
}

const ANTHROPIC_MODELS = new Map(
  anthropicProvider().getModels().map((model) => [model.id, model]),
);

/** Resolve exact Pi IDs or dated API response IDs whose base model Pi owns. */
function findAnthropicModel(model: string) {
  return ANTHROPIC_MODELS.get(model)
    ?? ANTHROPIC_MODELS.get(model.replace(/-\d{8}$/, ''));
}

function createPiUsage(input: number, output: number, cacheRead: number, cacheWrite: number, cacheWrite1h: number): Usage {
  return {
    input,
    output,
    cacheRead,
    cacheWrite,
    cacheWrite1h,
    totalTokens: input + output + cacheRead + cacheWrite,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

/** Return categorized costs when the Anthropic model resolves to Pi's catalog. */
export function estimateUsageCostBreakdown(
  model: string | undefined,
  usage: UsageStats,
): UsageCostBreakdown | undefined {
  if (!model) return undefined;
  const cacheReadInputTokens = usage.cacheReadInputTokens ?? 0;
  const cacheCreation5mInputTokens = usage.cacheCreation5mInputTokens ?? 0;
  const cacheCreation1hInputTokens = usage.cacheCreation1hInputTokens ?? 0;
  const cacheCreationInputTokens = Math.max(
    usage.cacheCreationInputTokens ?? 0,
    cacheCreation5mInputTokens + cacheCreation1hInputTokens,
  );
  const cacheCreationInputTokensByTier = cacheCreation5mInputTokens + cacheCreation1hInputTokens;
  const uncategorizedCacheCreationInputTokens = Math.max(
    0,
    cacheCreationInputTokens - cacheCreationInputTokensByTier,
  );
  const freshInputTokens = Math.max(
    0,
    usage.inputTokens - cacheReadInputTokens - cacheCreationInputTokens,
  );
  const webSearchRequests = usage.webSearchRequests ?? 0;
  const piModel = findAnthropicModel(model);
  if (!piModel) return undefined;

  const piUsage = createPiUsage(
    freshInputTokens,
    usage.outputTokens,
    cacheReadInputTokens,
    cacheCreationInputTokens,
    cacheCreation1hInputTokens,
  );
  const piCost = calculateCost(piModel, piUsage);
  const shortCacheCreationInputTokens = uncategorizedCacheCreationInputTokens + cacheCreation5mInputTokens;
  let cacheCreation1hUSD = 0;
  if (cacheCreation1hInputTokens > 0) {
    // Keep total input constant so Pi selects the same pricing tier while isolating 1h writes.
    const longWriteUsage = createPiUsage(
      freshInputTokens + shortCacheCreationInputTokens,
      0,
      cacheReadInputTokens,
      cacheCreation1hInputTokens,
      cacheCreation1hInputTokens,
    );
    cacheCreation1hUSD = calculateCost(piModel, longWriteUsage).cacheWrite;
  }
  const shortCacheCreationUSD = piCost.cacheWrite - cacheCreation1hUSD;
  const cacheCreationUSD = shortCacheCreationInputTokens > 0
    ? shortCacheCreationUSD * uncategorizedCacheCreationInputTokens / shortCacheCreationInputTokens
    : 0;
  const cacheCreation5mUSD = shortCacheCreationUSD - cacheCreationUSD;

  // Pi calculates token costs; Anthropic's server-side web search charge is separate.
  const webSearchUSD = webSearchRequests * WEB_SEARCH_PER_REQUEST_USD;

  return {
    freshInputUSD: piCost.input,
    outputUSD: piCost.output,
    cacheReadUSD: piCost.cacheRead,
    cacheCreationUSD,
    cacheCreation5mUSD,
    cacheCreation1hUSD,
    webSearchUSD,
    totalUSD:
      piCost.total + webSearchUSD,
  };
}

/**
 * Usage shape returned by the Anthropic Messages API.
 */
export interface AnthropicApiUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_creation?: {
    ephemeral_1h_input_tokens?: number | null;
    ephemeral_5m_input_tokens?: number | null;
  } | null;
  server_tool_use?: {
    web_search_requests?: number | null;
  } | null;
}

/**
 * Convert Anthropic API usage to our UsageStats format.
 * Calculates cost from token counts using model pricing.
 *
 * The Anthropic API reports `input_tokens` as only the non-cached portion.
 * We normalize so that `inputTokens` is the *total* input tokens
 * (non-cached + cache_read + cache_creation), with the cache fields
 * being subsets of that total.
 */
export function anthropicUsageToStats(model: string, usage: AnthropicApiUsage): UsageStats {
  const outputTokens = usage.output_tokens;
  const cacheReadInputTokens = usage.cache_read_input_tokens ?? 0;
  const rawCacheCreationInputTokens = usage.cache_creation_input_tokens ?? 0;
  const tieredCacheCreation5mInputTokens = usage.cache_creation?.ephemeral_5m_input_tokens ?? 0;
  const cacheCreation1hInputTokens = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const hasTieredCacheCreation = usage.cache_creation !== undefined && usage.cache_creation !== null;
  const tieredCacheCreationInputTokens = tieredCacheCreation5mInputTokens + cacheCreation1hInputTokens;
  const cacheCreationInputTokens = Math.max(rawCacheCreationInputTokens, tieredCacheCreationInputTokens);
  const cacheCreation5mInputTokens = hasTieredCacheCreation
    ? tieredCacheCreation5mInputTokens
    : rawCacheCreationInputTokens;
  const uncategorizedCacheCreationInputTokens = Math.max(
    0,
    cacheCreationInputTokens - cacheCreation5mInputTokens - cacheCreation1hInputTokens,
  );
  const webSearchRequests = usage.server_tool_use?.web_search_requests ?? 0;

  // inputTokens is the total: raw API input_tokens + cache subsets.
  const inputTokens = usage.input_tokens + cacheReadInputTokens + cacheCreationInputTokens;
  const stats: UsageStats = {
    inputTokens,
    outputTokens,
    cacheReadInputTokens,
    cacheCreationInputTokens,
    cacheCreation5mInputTokens: cacheCreation5mInputTokens + uncategorizedCacheCreationInputTokens,
    cacheCreation1hInputTokens,
    webSearchRequests,
    costUSD: 0,
  };
  const breakdown = estimateUsageCostBreakdown(model, stats);
  stats.costUSD = breakdown?.totalUSD ?? 0;
  return stats;
}

/** @deprecated Use anthropicUsageToStats. */
export const apiUsageToStats = anthropicUsageToStats;
