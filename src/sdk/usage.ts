import type { SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import type { UsageStats } from '../types/index.js';

/**
 * Extract usage stats from an SDK result message.
 */
export function extractUsage(result: SDKResultMessage): UsageStats {
  return {
    inputTokens: result.usage['input_tokens'],
    outputTokens: result.usage['output_tokens'],
    cacheReadInputTokens: result.usage['cache_read_input_tokens'] ?? 0,
    cacheCreationInputTokens: result.usage['cache_creation_input_tokens'] ?? 0,
    costUSD: result.total_cost_usd,
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
 * Estimate token count from character count.
 * Uses chars/4 as a rough approximation for English text.
 */
export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}
