import type { UsageStats, AuxiliaryUsageMap } from '../types/index.js';
import type { AuxiliaryUsageEntry } from './types.js';

export interface RuntimeUsageResult {
  usage?: {
    input_tokens?: number | null;
    output_tokens?: number | null;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
    cache_creation?: {
      ephemeral_1h_input_tokens?: number | null;
      ephemeral_5m_input_tokens?: number | null;
    } | null;
    server_tool_use?: {
      web_search_requests?: number | null;
    } | null;
  } | null;
  total_cost_usd?: number | null;
}

/**
 * Extract usage stats from a runtime result message.
 *
 * The Anthropic API reports `input_tokens` as only the non-cached portion.
 * We normalize so that `inputTokens` is the total input token count
 * (non-cached + cache_read + cache_creation), with cache fields reported
 * separately as subsets of that total.
 */
export function extractUsage(result: RuntimeUsageResult): UsageStats {
  const usage = result.usage;
  const rawInput = usage?.input_tokens ?? 0;
  const cacheRead = usage?.cache_read_input_tokens ?? 0;
  const rawCacheCreation = usage?.cache_creation_input_tokens ?? 0;
  const cacheCreation1h = usage?.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const tieredCacheCreation5m = usage?.cache_creation?.ephemeral_5m_input_tokens ?? 0;
  const hasTieredCacheCreation = usage?.cache_creation !== undefined && usage.cache_creation !== null;
  const tieredCacheCreation = tieredCacheCreation5m + cacheCreation1h;
  const cacheCreation = Math.max(rawCacheCreation, tieredCacheCreation);
  const cacheCreation5m = hasTieredCacheCreation ? tieredCacheCreation5m : rawCacheCreation;
  return {
    inputTokens: rawInput + cacheRead + cacheCreation,
    outputTokens: usage?.output_tokens ?? 0,
    cacheReadInputTokens: cacheRead,
    cacheCreationInputTokens: cacheCreation,
    cacheCreation5mInputTokens: cacheCreation5m,
    cacheCreation1hInputTokens: cacheCreation1h,
    webSearchRequests: usage?.server_tool_use?.web_search_requests ?? 0,
    costUSD: result.total_cost_usd ?? 0,
  };
}

/**
 * Create empty usage stats.
 */
export function emptyUsage(): UsageStats {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheCreation5mInputTokens: 0,
    cacheCreation1hInputTokens: 0,
    webSearchRequests: 0,
    costUSD: 0,
  };
}

function addUsage(a: UsageStats, b: UsageStats): UsageStats {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadInputTokens: (a.cacheReadInputTokens ?? 0) + (b.cacheReadInputTokens ?? 0),
    cacheCreationInputTokens: (a.cacheCreationInputTokens ?? 0) + (b.cacheCreationInputTokens ?? 0),
    cacheCreation5mInputTokens: (a.cacheCreation5mInputTokens ?? 0) + (b.cacheCreation5mInputTokens ?? 0),
    cacheCreation1hInputTokens: (a.cacheCreation1hInputTokens ?? 0) + (b.cacheCreation1hInputTokens ?? 0),
    webSearchRequests: (a.webSearchRequests ?? 0) + (b.webSearchRequests ?? 0),
    costUSD: a.costUSD + b.costUSD,
  };
}

/**
 * Aggregate multiple usage stats into one.
 */
export function aggregateUsage(usages: UsageStats[]): UsageStats {
  return usages.reduce(addUsage, emptyUsage());
}

/**
 * Aggregate auxiliary usage entries by agent name.
 * Merges multiple entries for the same agent into a single UsageStats.
 * Returns undefined if no entries are provided.
 */
export function aggregateAuxiliaryUsage(
  entries: AuxiliaryUsageEntry[]
): AuxiliaryUsageMap | undefined {
  if (entries.length === 0) return undefined;

  const map: AuxiliaryUsageMap = {};
  for (const { agent, usage } of entries) {
    const existing = map[agent];
    if (existing) {
      map[agent] = addUsage(existing, usage);
    } else {
      map[agent] = { ...usage };
    }
  }

  return map;
}

/**
 * Merge two AuxiliaryUsageMaps together.
 * Entries for the same agent are summed.
 */
export function mergeAuxiliaryUsage(
  a: AuxiliaryUsageMap | undefined,
  b: AuxiliaryUsageMap | undefined
): AuxiliaryUsageMap | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;

  const entries: { agent: string; usage: UsageStats }[] = [];
  for (const [agent, usage] of Object.entries(a)) {
    entries.push({ agent, usage });
  }
  for (const [agent, usage] of Object.entries(b)) {
    entries.push({ agent, usage });
  }
  return aggregateAuxiliaryUsage(entries);
}

/**
 * Estimate token count from character count.
 * Uses chars/4 as a rough approximation for English text.
 */
export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}
