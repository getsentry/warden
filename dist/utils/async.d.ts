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
export declare function runPool<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>, options?: {
    shouldAbort?: () => boolean;
}): Promise<R[]>;
/**
 * Process items with limited concurrency using a sliding-window pool.
 */
export declare function processInBatches<T, R>(items: T[], fn: (item: T) => Promise<R>, batchSize: number): Promise<R[]>;
//# sourceMappingURL=async.d.ts.map