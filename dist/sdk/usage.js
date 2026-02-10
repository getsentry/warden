/**
 * Extract usage stats from an SDK result message.
 */
export function extractUsage(result) {
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
export function emptyUsage() {
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
export function aggregateUsage(usages) {
    return usages.reduce((acc, u) => ({
        inputTokens: acc.inputTokens + u.inputTokens,
        outputTokens: acc.outputTokens + u.outputTokens,
        cacheReadInputTokens: (acc.cacheReadInputTokens ?? 0) + (u.cacheReadInputTokens ?? 0),
        cacheCreationInputTokens: (acc.cacheCreationInputTokens ?? 0) + (u.cacheCreationInputTokens ?? 0),
        costUSD: acc.costUSD + u.costUSD,
    }), emptyUsage());
}
/**
 * Aggregate auxiliary usage entries by agent name.
 * Merges multiple entries for the same agent into a single UsageStats.
 * Returns undefined if no entries are provided.
 */
export function aggregateAuxiliaryUsage(entries) {
    if (entries.length === 0)
        return undefined;
    const map = {};
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
        }
        else {
            map[agent] = { ...usage };
        }
    }
    return map;
}
/**
 * Merge two AuxiliaryUsageMaps together.
 * Entries for the same agent are summed.
 */
export function mergeAuxiliaryUsage(a, b) {
    if (!a && !b)
        return undefined;
    if (!a)
        return b;
    if (!b)
        return a;
    const entries = [];
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
export function estimateTokens(chars) {
    return Math.ceil(chars / 4);
}
//# sourceMappingURL=usage.js.map