/**
 * Process items with limited concurrency using chunked batches.
 */
export async function processInBatches(items, fn, batchSize) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fn));
        results.push(...batchResults);
    }
    return results;
}
//# sourceMappingURL=async.js.map