/**
 * Process items with limited concurrency using chunked batches.
 */
export declare function processInBatches<T, R>(items: T[], fn: (item: T) => Promise<R>, batchSize: number): Promise<R[]>;
//# sourceMappingURL=async.d.ts.map