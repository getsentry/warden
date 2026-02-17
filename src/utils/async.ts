/**
 * A counting semaphore for limiting concurrent access to a shared resource.
 * Callers acquire a permit before starting work and release it when done.
 * If no permits are available, acquire() blocks until one is released.
 */
export class Semaphore {
  private permits: number;
  private waiters: (() => void)[] = [];
  /** The initial permit count this semaphore was created with. */
  readonly initialPermits: number;

  constructor(permits: number) {
    this.permits = permits;
    this.initialPermits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  release(): void {
    const next = this.waiters.shift();
    if (next) {
      next();
    } else {
      this.permits++;
    }
  }
}

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
export async function runPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
  options?: { shouldAbort?: () => boolean }
): Promise<R[]> {
  const results: { index: number; value: R }[] = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      if (options?.shouldAbort?.()) break;
      const index = nextIndex++;
      const item = items[index] as T;
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
export async function processInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize: number
): Promise<R[]> {
  return runPool(items, batchSize, fn);
}
