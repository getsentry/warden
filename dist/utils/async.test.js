import { describe, it, expect, vi } from 'vitest';
import { runPool, processInBatches } from './async.js';
describe('runPool', () => {
    it('processes all items and returns results in input order', async () => {
        const items = [10, 20, 30, 40, 50];
        const results = await runPool(items, 3, async (item) => item * 2);
        expect(results).toEqual([20, 40, 60, 80, 100]);
    });
    it('provides correct index to the callback', async () => {
        const items = ['a', 'b', 'c'];
        const indices = [];
        await runPool(items, 2, async (_item, index) => {
            indices.push(index);
            return index;
        });
        expect(indices.sort()).toEqual([0, 1, 2]);
    });
    it('limits concurrency to the specified level', async () => {
        let active = 0;
        let maxActive = 0;
        const items = [1, 2, 3, 4, 5, 6];
        await runPool(items, 2, async (item) => {
            active++;
            maxActive = Math.max(maxActive, active);
            // Simulate async work
            await new Promise((resolve) => setTimeout(resolve, 10));
            active--;
            return item;
        });
        expect(maxActive).toBe(2);
    });
    it('uses sliding window (does not wait for whole batch)', async () => {
        // Simulate: item 0 takes 100ms, items 1-4 take 10ms each
        // With batch pattern (concurrency=2): [0,1] then [2,3] then [4] => ~120ms
        // With pool (concurrency=2): 0 starts, 1 starts, 1 finishes->2 starts, 2 finishes->3 starts, etc.
        const starts = [];
        const t0 = Date.now();
        const items = [100, 10, 10, 10, 10];
        await runPool(items, 2, async (delayMs, index) => {
            starts.push(Date.now() - t0);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            return index;
        });
        // Item 2 should start after item 1 finishes (~10ms), not after item 0 finishes (~100ms)
        // In a batch model, item 2 would start at ~100ms. In a pool model, ~10ms.
        expect(starts[2]).toBeLessThan(50);
    });
    it('returns results in input order even when items complete out of order', async () => {
        // Items with decreasing delays so they complete in reverse order
        const items = [30, 20, 10];
        const results = await runPool(items, 3, async (delayMs, index) => {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            return `item-${index}`;
        });
        expect(results).toEqual(['item-0', 'item-1', 'item-2']);
    });
    it('stops picking up new items when shouldAbort returns true', async () => {
        let aborted = false;
        const processed = [];
        const items = [1, 2, 3, 4, 5];
        const results = await runPool(items, 1, async (item) => {
            processed.push(item);
            if (item === 2)
                aborted = true;
            return item * 10;
        }, {
            shouldAbort: () => aborted,
        });
        // Items 1 and 2 were processed; item 3 was skipped because shouldAbort fires before it starts
        expect(processed).toEqual([1, 2]);
        expect(results).toEqual([10, 20]);
    });
    it('returns empty array when shouldAbort is true from the start', async () => {
        const fn = vi.fn(async (item) => item);
        const results = await runPool([1, 2, 3], 2, fn, {
            shouldAbort: () => true,
        });
        expect(results).toEqual([]);
        expect(fn).not.toHaveBeenCalled();
    });
    it('handles empty items array', async () => {
        const fn = vi.fn(async (item) => item);
        const results = await runPool([], 5, fn);
        expect(results).toEqual([]);
        expect(fn).not.toHaveBeenCalled();
    });
    it('handles concurrency greater than items count', async () => {
        const items = [1, 2];
        const results = await runPool(items, 10, async (item) => item + 1);
        expect(results).toEqual([2, 3]);
    });
    it('handles concurrency of 1 (sequential)', async () => {
        const order = [];
        const items = [1, 2, 3];
        const results = await runPool(items, 1, async (item) => {
            order.push(item);
            await new Promise((resolve) => setTimeout(resolve, 5));
            return item;
        });
        expect(order).toEqual([1, 2, 3]);
        expect(results).toEqual([1, 2, 3]);
    });
});
describe('processInBatches', () => {
    it('delegates to runPool and returns results in order', async () => {
        const items = [1, 2, 3, 4, 5];
        const results = await processInBatches(items, async (item) => item * 3, 2);
        expect(results).toEqual([3, 6, 9, 12, 15]);
    });
});
//# sourceMappingURL=async.test.js.map