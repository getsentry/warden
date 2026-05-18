import { normalizeMetadata, type UsageSummary } from 'vitest-evals/harness';
import type { UsageStats } from '../../../src/types/index.js';

export interface EvalUsageSummaryInput {
  provider: string;
  model: string;
  usage?: UsageStats;
}

/** Converts Warden runtime usage into the vitest-evals usage summary shape. */
export function usageToSummary({ provider, model, usage }: EvalUsageSummaryInput): UsageSummary {
  if (!usage) {
    return {};
  }

  return {
    provider,
    model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.inputTokens + usage.outputTokens,
    estimatedCost: usage.costUSD,
    metadata: normalizeMetadata({
      cacheReadInputTokens: usage.cacheReadInputTokens,
      cacheCreationInputTokens: usage.cacheCreationInputTokens,
      cacheCreation5mInputTokens: usage.cacheCreation5mInputTokens,
      cacheCreation1hInputTokens: usage.cacheCreation1hInputTokens,
      webSearchRequests: usage.webSearchRequests,
    }),
  };
}
