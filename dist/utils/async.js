/**
 * Run async work items with a sliding-window concurrency pool.
 * Spawns up to `concurrency` workers that each grab the next
 * queued item as soon as they finish, keeping all slots busy.
 *
 * Results are returned in input order regardless of completion order.
 * When `shouldAbort` is provided and returns true, workers stop
 * picking up new items; already-started items run to completion.
 * Only completed items appear in the returned array.
 */
export async function runPool(items, concurrency, fn, options) {
    const results = [];
    let nextIndex = 0;
    async function worker() {
        while (nextIndex < items.length) {
            if (options?.shouldAbort?.())
                break;
            const index = nextIndex++;
            const item = items[index];
            results.push({ index, value: await fn(item, index) });
        }
    }
    const workerCount = Math.min(concurrency, items.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    // Return results in input order
    results.sort((a, b) => a.index - b.index);
    return results.map((r) => r.value);
}
/**
 * Process items with limited concurrency using a sliding-window pool.
 */
export async function processInBatches(items, fn, batchSize) {
    return runPool(items, batchSize, fn);
}
//# sourceMappingURL=async.js.map