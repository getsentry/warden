interface QueuedWork<T> {
  work: () => Promise<T>;
  delayMs: number;
  signal?: AbortSignal;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

export interface QueueWorkOptions {
  /** Delay before starting work after the queue's first concurrent wave. */
  delayMs?: number;
  /** Stop waiting for the start delay when cancellation is requested. */
  signal?: AbortSignal;
}

/**
 * A FIFO queue for dynamically submitted asynchronous work.
 *
 * The queue owns concurrency bookkeeping so callers cannot leak permits or
 * accidentally bypass the shared limit. Work starts as capacity becomes
 * available, and each returned promise settles with its submitted task.
 */
export class AsyncWorkQueue {
  private readonly pending: QueuedWork<unknown>[] = [];
  private active = 0;
  private started = 0;
  readonly concurrency: number;

  constructor(concurrency: number) {
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new RangeError('Queue concurrency must be a positive integer');
    }
    this.concurrency = concurrency;
  }

  /** Enqueue work under the queue's shared concurrency and delayed-dispatch limits. */
  run<T>(work: () => Promise<T>, options: QueueWorkOptions = {}): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.push({
        work,
        delayMs: options.delayMs ?? 0,
        signal: options.signal,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.dispatch();
    });
  }

  private dispatch(): void {
    while (this.active < this.concurrency) {
      const item = this.pending.shift();
      if (!item) return;

      const delayMs = this.started >= this.concurrency ? item.delayMs : 0;
      this.started++;
      this.active++;

      void this.execute(item, delayMs).finally(() => {
        this.active--;
        this.dispatch();
      });
    }
  }

  private async execute(item: QueuedWork<unknown>, delayMs: number): Promise<void> {
    try {
      if (delayMs > 0) {
        await waitForDelay(delayMs, item.signal);
      }
      item.resolve(await item.work());
    } catch (error) {
      item.reject(error);
    }
  }
}

function waitForDelay(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    const finish = () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', finish);
      resolve();
    };

    const timeout = setTimeout(finish, delayMs);
    signal?.addEventListener('abort', finish, { once: true });
  });
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
