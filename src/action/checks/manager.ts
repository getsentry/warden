/**
 * Check Manager
 *
 * Manages GitHub Check runs for Warden triggers.
 * Wraps the core github-checks module with action-specific logic.
 */

import type { SkillReport, UsageStats, AuxiliaryUsageMap } from '../../types/index.js';
import {
  aggregateSeverityCounts,
  determineConclusion,
} from '../../output/github-checks.js';
import { mergeAuxiliaryUsage } from '../../sdk/usage.js';
import type { TriggerResult } from '../triggers/executor.js';

// Re-export types and functions that are used directly
export {
  createCoreCheck,
  updateCoreCheck,
  createSkillCheck,
  updateSkillCheck,
  failSkillCheck,
  aggregateSeverityCounts,
  determineConclusion,
} from '../../output/github-checks.js';

export type {
  CheckOptions,
  UpdateSkillCheckOptions,
  CreateCheckResult,
  CoreCheckSummaryData,
  CheckConclusion,
} from '../../output/github-checks.js';

// -----------------------------------------------------------------------------
// Aggregate Functions
// -----------------------------------------------------------------------------

/**
 * Aggregate usage stats from multiple reports.
 */
export function aggregateUsage(reports: SkillReport[]): UsageStats | undefined {
  const reportsWithUsage = reports.filter((r) => r.usage);
  if (reportsWithUsage.length === 0) return undefined;

  const seed: UsageStats = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    costUSD: 0,
  };

  return reportsWithUsage.reduce((acc, r) => {
    acc.inputTokens += r.usage?.inputTokens ?? 0;
    acc.outputTokens += r.usage?.outputTokens ?? 0;
    acc.cacheReadInputTokens = (acc.cacheReadInputTokens ?? 0) + (r.usage?.cacheReadInputTokens ?? 0);
    acc.cacheCreationInputTokens = (acc.cacheCreationInputTokens ?? 0) + (r.usage?.cacheCreationInputTokens ?? 0);
    acc.costUSD += r.usage?.costUSD ?? 0;
    return acc;
  }, seed);
}

/**
 * Build core check summary data from trigger results.
 */
export function buildCoreSummaryData(
  results: TriggerResult[],
  reports: SkillReport[]
): {
  totalSkills: number;
  totalFindings: number;
  findingsBySeverity: Record<string, number>;
  totalDurationMs?: number;
  totalUsage?: UsageStats;
  totalAuxiliaryUsage?: AuxiliaryUsageMap;
  findings: SkillReport['findings'];
  skillResults: {
    name: string;
    findingCount: number;
    conclusion: 'success' | 'failure' | 'neutral' | 'cancelled';
    durationMs?: number;
    usage?: UsageStats;
  }[];
} {
  // Aggregate auxiliary usage across all reports
  let totalAuxiliaryUsage: AuxiliaryUsageMap | undefined;
  for (const r of reports) {
    if (r.auxiliaryUsage) {
      totalAuxiliaryUsage = mergeAuxiliaryUsage(totalAuxiliaryUsage, r.auxiliaryUsage);
    }
  }

  return {
    totalSkills: results.length,
    totalFindings: reports.reduce((sum, r) => sum + r.findings.length, 0),
    findingsBySeverity: aggregateSeverityCounts(reports),
    totalDurationMs: reports.some((r) => r.durationMs !== undefined)
      ? reports.reduce((sum, r) => sum + (r.durationMs ?? 0), 0)
      : undefined,
    totalUsage: aggregateUsage(reports),
    totalAuxiliaryUsage,
    findings: reports.flatMap((r) => r.findings),
    skillResults: results.map((r) => ({
      name: r.triggerName,
      findingCount: r.report?.findings.length ?? 0,
      conclusion: r.report
        ? determineConclusion(r.report.findings, r.failOn, r.failCheck)
        : ('failure' as const),
      durationMs: r.report?.durationMs,
      usage: r.report?.usage,
    })),
  };
}

/**
 * Determine overall core check conclusion.
 */
export function determineCoreConclusion(
  shouldFailAction: boolean,
  totalFindings: number
): 'success' | 'failure' | 'neutral' {
  if (shouldFailAction) {
    return 'failure';
  }
  if (totalFindings > 0) {
    return 'neutral';
  }
  return 'success';
}
