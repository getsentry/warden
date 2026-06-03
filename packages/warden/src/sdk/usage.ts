import type { UsageStats, AuxiliaryUsageMap, AuxiliaryUsageAttributionMap, UsageAttribution } from '../types/index.js';
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

function uniqueSorted(values: (string | undefined)[]): string[] | undefined {
  const unique = [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
  return unique.length > 0 ? unique : undefined;
}

function attributionFromEntries(entries: AuxiliaryUsageEntry[]): UsageAttribution | undefined {
  const models = uniqueSorted(entries.map((entry) => entry.model));
  const runtimes = uniqueSorted(entries.map((entry) => entry.runtime));
  if (!models && !runtimes) return undefined;
  return {
    model: models?.length === 1 ? models[0] : undefined,
    models: models && models.length > 1 ? models : undefined,
    runtime: runtimes?.length === 1 ? runtimes[0] : undefined,
    runtimes: runtimes && runtimes.length > 1 ? runtimes : undefined,
  };
}

function attributionValues(attribution: UsageAttribution | undefined): {
  models: string[];
  runtimes: string[];
} {
  return {
    models: [
      ...(attribution?.model ? [attribution.model] : []),
      ...(attribution?.models ?? []),
    ],
    runtimes: [
      ...(attribution?.runtime ? [attribution.runtime] : []),
      ...(attribution?.runtimes ?? []),
    ],
  };
}

function mergeAttribution(a: UsageAttribution | undefined, b: UsageAttribution | undefined): UsageAttribution | undefined {
  const aValues = attributionValues(a);
  const bValues = attributionValues(b);
  const models = uniqueSorted([...aValues.models, ...bValues.models]);
  const runtimes = uniqueSorted([...aValues.runtimes, ...bValues.runtimes]);
  if (!models && !runtimes) return undefined;
  return {
    model: models?.length === 1 ? models[0] : undefined,
    models: models && models.length > 1 ? models : undefined,
    runtime: runtimes?.length === 1 ? runtimes[0] : undefined,
    runtimes: runtimes && runtimes.length > 1 ? runtimes : undefined,
  };
}

function normalizeAttributionMap(map: AuxiliaryUsageAttributionMap | undefined): AuxiliaryUsageAttributionMap | undefined {
  if (!map) return undefined;
  const normalized: AuxiliaryUsageAttributionMap = {};
  for (const [agent, attribution] of Object.entries(map)) {
    const next = mergeAttribution(undefined, attribution);
    if (next) {
      normalized[agent] = next;
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Aggregate auxiliary usage model/runtime attribution by agent name.
 */
export function aggregateAuxiliaryUsageAttribution(
  entries: AuxiliaryUsageEntry[]
): AuxiliaryUsageAttributionMap | undefined {
  const byAgent = new Map<string, AuxiliaryUsageEntry[]>();
  for (const entry of entries) {
    const agentEntries = byAgent.get(entry.agent) ?? [];
    agentEntries.push(entry);
    byAgent.set(entry.agent, agentEntries);
  }

  const map: AuxiliaryUsageAttributionMap = {};
  for (const [agent, agentEntries] of byAgent) {
    const attribution = attributionFromEntries(agentEntries);
    if (attribution) {
      map[agent] = attribution;
    }
  }

  return Object.keys(map).length > 0 ? map : undefined;
}

/**
 * Merge two auxiliary usage attribution maps.
 */
export function mergeAuxiliaryUsageAttribution(
  a: AuxiliaryUsageAttributionMap | undefined,
  b: AuxiliaryUsageAttributionMap | undefined
): AuxiliaryUsageAttributionMap | undefined {
  const left = normalizeAttributionMap(a);
  const right = normalizeAttributionMap(b);
  if (!left && !right) return undefined;
  if (!left) return right;
  if (!right) return left;

  const merged: AuxiliaryUsageAttributionMap = { ...left };
  for (const [agent, attribution] of Object.entries(right)) {
    const next = mergeAttribution(merged[agent], attribution);
    if (next) {
      merged[agent] = next;
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
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
