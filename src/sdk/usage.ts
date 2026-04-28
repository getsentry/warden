import type { UsageStats, AuxiliaryUsageMap } from '../types/index.js';
import type { AuxiliaryUsageEntry } from './types.js';

export interface RuntimeUsageResult {
  usage?: {
    input_tokens?: number | null;
    output_tokens?: number | null;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
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
  const cacheCreation = usage?.cache_creation_input_tokens ?? 0;
  return {
    inputTokens: rawInput + cacheRead + cacheCreation,
    outputTokens: usage?.output_tokens ?? 0,
    cacheReadInputTokens: cacheRead,
    cacheCreationInputTokens: cacheCreation,
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
    costUSD: 0,
  };
}

/**
 * Aggregate multiple usage stats into one.
 */
export function aggregateUsage(usages: UsageStats[]): UsageStats {
  return usages.reduce(
    (acc, u) => ({
      inputTokens: acc.inputTokens + u.inputTokens,
      outputTokens: acc.outputTokens + u.outputTokens,
      cacheReadInputTokens: (acc.cacheReadInputTokens ?? 0) + (u.cacheReadInputTokens ?? 0),
      cacheCreationInputTokens: (acc.cacheCreationInputTokens ?? 0) + (u.cacheCreationInputTokens ?? 0),
      costUSD: acc.costUSD + u.costUSD,
    }),
    emptyUsage()
  );
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
      map[agent] = {
        inputTokens: existing.inputTokens + usage.inputTokens,
        outputTokens: existing.outputTokens + usage.outputTokens,
        cacheReadInputTokens: (existing.cacheReadInputTokens ?? 0) + (usage.cacheReadInputTokens ?? 0),
        cacheCreationInputTokens: (existing.cacheCreationInputTokens ?? 0) + (usage.cacheCreationInputTokens ?? 0),
        costUSD: existing.costUSD + usage.costUSD,
      };
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
