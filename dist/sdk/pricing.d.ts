import type { UsageStats } from '../types/index.js';
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
export declare function apiUsageToStats(model: string, usage: ApiUsage): UsageStats;
export {};
//# sourceMappingURL=pricing.d.ts.map