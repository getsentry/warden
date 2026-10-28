import { z } from 'zod';
import {
  UsageAttributionSchema,
  UsageStatsSchema,
} from '../../types/index.js';
import type {
  AuxiliaryUsageAttributionMap,
  AuxiliaryUsageMap,
  SkillReport,
  UsageAttribution,
  UsageStats,
} from '../../types/index.js';
import { mergeAuxiliaryUsageAttribution } from '../../sdk/usage.js';

/** Usage plus model/runtime attribution for one billable JSONL component. */
export const JsonlUsageBreakdownEntrySchema = UsageAttributionSchema.extend({
  usage: UsageStatsSchema,
});
export type JsonlUsageBreakdownEntry = z.infer<typeof JsonlUsageBreakdownEntrySchema>;

/** Detailed usage accounting for one durable JSONL record. */
export const JsonlUsageBreakdownSchema = z.object({
  /** Primary hunk/scan usage for this record. */
  scan: JsonlUsageBreakdownEntrySchema.optional(),
  /** Auxiliary agent usage, keyed by stage/agent name. */
  auxiliary: z.record(z.string(), JsonlUsageBreakdownEntrySchema).optional(),
  /** Total usage for this record: scan plus all auxiliary agents. */
  total: JsonlUsageBreakdownEntrySchema,
}).superRefine((breakdown, ctx) => {
  const hasScan = usageStatsHaveValue(breakdown.scan?.usage);
  const hasAuxiliary = usageBreakdownEntriesHaveValue(breakdown.auxiliary);
  if (!hasScan && !hasAuxiliary) {
    ctx.addIssue({
      code: 'custom',
      message: 'usageBreakdown requires scan or auxiliary usage',
    });
    return;
  }

  const auxiliaryTotal = aggregateUsageBreakdownEntries(breakdown.auxiliary);
  const expected = aggregateUsageStatsPreservingOptional(
    [breakdown.scan?.usage, auxiliaryTotal].filter((usage): usage is UsageStats => usage !== undefined),
  );
  if (!usageStatsMatch(breakdown.total.usage, expected)) {
    ctx.addIssue({
      code: 'custom',
      path: ['total', 'usage'],
      message: 'usageBreakdown.total must equal scan plus auxiliary usage',
    });
  }
});
export type JsonlUsageBreakdown = z.infer<typeof JsonlUsageBreakdownSchema>;

/** Return true when usage contains non-zero token, tool, or cost data. */
export function usageStatsHaveValue(usage: UsageStats | undefined): usage is UsageStats {
  if (!usage) return false;
  return usage.inputTokens > 0
    || usage.outputTokens > 0
    || (usage.cacheReadInputTokens ?? 0) > 0
    || (usage.cacheCreationInputTokens ?? 0) > 0
    || (usage.cacheCreation5mInputTokens ?? 0) > 0
    || (usage.cacheCreation1hInputTokens ?? 0) > 0
    || (usage.webSearchRequests ?? 0) > 0
    || usage.costUSD > 0;
}

function auxiliaryUsageHasValue(auxiliaryUsage: AuxiliaryUsageMap | undefined): auxiliaryUsage is AuxiliaryUsageMap {
  if (!auxiliaryUsage) return false;
  return Object.values(auxiliaryUsage).some(usageStatsHaveValue);
}

function usageBreakdownEntriesHaveValue(
  entries: Record<string, JsonlUsageBreakdownEntry> | undefined
): entries is Record<string, JsonlUsageBreakdownEntry> {
  if (!entries) return false;
  return Object.values(entries).some((entry) => usageStatsHaveValue(entry.usage));
}

function aggregateUsageBreakdownEntries(
  entries: Record<string, JsonlUsageBreakdownEntry> | undefined
): UsageStats | undefined {
  if (!usageBreakdownEntriesHaveValue(entries)) return undefined;
  return aggregateUsageStatsPreservingOptional(Object.values(entries).map((entry) => entry.usage));
}

/** Aggregate usage stats while avoiding optional zero fields unless inputs had them. */
export function aggregateUsageStatsPreservingOptional(usages: UsageStats[]): UsageStats {
  const total: UsageStats = {
    inputTokens: 0,
    outputTokens: 0,
    costUSD: 0,
  };

  for (const usage of usages) {
    total.inputTokens += usage.inputTokens;
    total.outputTokens += usage.outputTokens;
    total.costUSD += usage.costUSD;
    if (usage.cacheReadInputTokens !== undefined || total.cacheReadInputTokens !== undefined) {
      total.cacheReadInputTokens = (total.cacheReadInputTokens ?? 0) + (usage.cacheReadInputTokens ?? 0);
    }
    if (usage.cacheCreationInputTokens !== undefined || total.cacheCreationInputTokens !== undefined) {
      total.cacheCreationInputTokens = (total.cacheCreationInputTokens ?? 0) + (usage.cacheCreationInputTokens ?? 0);
    }
    if (usage.cacheCreation5mInputTokens !== undefined || total.cacheCreation5mInputTokens !== undefined) {
      total.cacheCreation5mInputTokens = (total.cacheCreation5mInputTokens ?? 0) + (usage.cacheCreation5mInputTokens ?? 0);
    }
    if (usage.cacheCreation1hInputTokens !== undefined || total.cacheCreation1hInputTokens !== undefined) {
      total.cacheCreation1hInputTokens = (total.cacheCreation1hInputTokens ?? 0) + (usage.cacheCreation1hInputTokens ?? 0);
    }
    if (usage.webSearchRequests !== undefined || total.webSearchRequests !== undefined) {
      total.webSearchRequests = (total.webSearchRequests ?? 0) + (usage.webSearchRequests ?? 0);
    }
  }

  return total;
}

function usageStatsMatch(actual: UsageStats, expected: UsageStats): boolean {
  return actual.inputTokens === expected.inputTokens
    && actual.outputTokens === expected.outputTokens
    && (actual.cacheReadInputTokens ?? 0) === (expected.cacheReadInputTokens ?? 0)
    && (actual.cacheCreationInputTokens ?? 0) === (expected.cacheCreationInputTokens ?? 0)
    && (actual.cacheCreation5mInputTokens ?? 0) === (expected.cacheCreation5mInputTokens ?? 0)
    && (actual.cacheCreation1hInputTokens ?? 0) === (expected.cacheCreation1hInputTokens ?? 0)
    && (actual.webSearchRequests ?? 0) === (expected.webSearchRequests ?? 0)
    && Math.abs(actual.costUSD - expected.costUSD) < 0.000000001;
}

function uniqueSorted(values: (string | undefined)[]): string[] | undefined {
  const unique = [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
  return unique.length > 0 ? unique : undefined;
}

function attributionModels(attribution: UsageAttribution | undefined): string[] {
  return [
    ...(attribution?.model ? [attribution.model] : []),
    ...(attribution?.models ?? []),
  ];
}

function attributionRuntimes(attribution: UsageAttribution | undefined): string[] {
  return [
    ...(attribution?.runtime ? [attribution.runtime] : []),
    ...(attribution?.runtimes ?? []),
  ];
}

function buildUsageBreakdownEntry(
  usage: UsageStats | undefined,
  attribution: UsageAttribution | undefined,
): JsonlUsageBreakdownEntry | undefined {
  if (!usageStatsHaveValue(usage)) return undefined;
  return {
    usage,
    ...attribution,
  };
}

function buildAuxiliaryUsageBreakdownEntries(
  auxiliaryUsage: AuxiliaryUsageMap | undefined,
  attribution: AuxiliaryUsageAttributionMap | undefined,
): Record<string, JsonlUsageBreakdownEntry> | undefined {
  if (!auxiliaryUsageHasValue(auxiliaryUsage)) return undefined;

  const entries: Record<string, JsonlUsageBreakdownEntry> = {};
  for (const [agent, usage] of Object.entries(auxiliaryUsage)) {
    const entry = buildUsageBreakdownEntry(usage, attribution?.[agent]);
    if (entry) {
      entries[agent] = entry;
    }
  }

  return Object.keys(entries).length > 0 ? entries : undefined;
}

function buildTotalUsageBreakdownEntry(
  usage: UsageStats,
  scan: JsonlUsageBreakdownEntry | undefined,
  auxiliary: Record<string, JsonlUsageBreakdownEntry> | undefined,
): JsonlUsageBreakdownEntry {
  const componentAttributions = [
    scan,
    ...Object.values(auxiliary ?? {}),
  ];
  const models = uniqueSorted(componentAttributions.flatMap((entry) => attributionModels(entry)));
  const runtimes = uniqueSorted(componentAttributions.flatMap((entry) => attributionRuntimes(entry)));
  return {
    usage,
    model: models?.length === 1 ? models[0] : undefined,
    models: models && models.length > 1 ? models : undefined,
    runtime: runtimes?.length === 1 ? runtimes[0] : undefined,
    runtimes: runtimes && runtimes.length > 1 ? runtimes : undefined,
  };
}

/** Build detailed usage accounting for a JSONL record. */
export function buildJsonlUsageBreakdown(
  usage: UsageStats | undefined,
  auxiliaryUsage: AuxiliaryUsageMap | undefined,
  options: {
    scan?: UsageAttribution;
    auxiliary?: AuxiliaryUsageAttributionMap;
  } = {},
): JsonlUsageBreakdown | undefined {
  const scan = buildUsageBreakdownEntry(usage, options.scan);
  const auxiliary = buildAuxiliaryUsageBreakdownEntries(auxiliaryUsage, options.auxiliary);

  if (!scan && !auxiliary) return undefined;
  const auxiliaryTotal = aggregateUsageBreakdownEntries(auxiliary);
  const total = aggregateUsageStatsPreservingOptional(
    [scan?.usage, auxiliaryTotal].filter((u): u is UsageStats => u !== undefined),
  );

  return {
    scan,
    auxiliary,
    total: buildTotalUsageBreakdownEntry(total, scan, auxiliary),
  };
}

/** Return only the primary scan usage from a usage breakdown. */
export function scanUsageFromBreakdown(breakdown: JsonlUsageBreakdown | undefined): UsageStats | undefined {
  return breakdown?.scan?.usage;
}

/** Return auxiliary usage from a usage breakdown in the legacy map shape. */
export function auxiliaryUsageFromBreakdown(
  breakdown: JsonlUsageBreakdown | undefined
): AuxiliaryUsageMap | undefined {
  const auxiliary = breakdown?.auxiliary;
  if (!auxiliary) return undefined;

  const usage: AuxiliaryUsageMap = {};
  for (const [agent, entry] of Object.entries(auxiliary)) {
    usage[agent] = entry.usage;
  }
  return Object.keys(usage).length > 0 ? usage : undefined;
}

/** Return auxiliary model/runtime attribution from a usage breakdown. */
export function auxiliaryUsageAttributionFromBreakdown(
  breakdown: JsonlUsageBreakdown | undefined
): AuxiliaryUsageAttributionMap | undefined {
  const auxiliary = breakdown?.auxiliary;
  if (!auxiliary) return undefined;

  const attribution: AuxiliaryUsageAttributionMap = {};
  for (const [agent, entry] of Object.entries(auxiliary)) {
    const { usage: _usage, ...entryAttribution } = entry;
    if (Object.keys(entryAttribution).length > 0) {
      attribution[agent] = entryAttribution;
    }
  }

  return Object.keys(attribution).length > 0 ? attribution : undefined;
}

/** Aggregate model/runtime attribution across scan reports. */
export function usageAttributionFromReports(reports: SkillReport[]): UsageAttribution | undefined {
  const models = uniqueSorted(reports.map((report) => report.model));
  const runtimes = uniqueSorted(reports.map((report) => report.runtime));
  if (!models && !runtimes) return undefined;
  return {
    model: models?.length === 1 ? models[0] : undefined,
    models: models && models.length > 1 ? models : undefined,
    runtime: runtimes?.length === 1 ? runtimes[0] : undefined,
    runtimes: runtimes && runtimes.length > 1 ? runtimes : undefined,
  };
}

/** Aggregate auxiliary model/runtime attribution across reports. */
export function aggregateReportAuxiliaryUsageAttribution(reports: SkillReport[]): AuxiliaryUsageAttributionMap | undefined {
  return reports.reduce<AuxiliaryUsageAttributionMap | undefined>(
    (acc, report) => mergeAuxiliaryUsageAttribution(acc, report.auxiliaryUsageAttribution),
    undefined,
  );
}
