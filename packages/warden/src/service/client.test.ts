import { describe, expect, it, vi } from 'vitest';
import { createServiceHunkReviewCache } from './client.js';

const service = { url: 'https://warden.example.com', token: 'token', data: 'findings' as const, memory: false, timeoutMs: 1_000 };
const repository = { provider: 'github' as const, owner: 'acme', name: 'widgets', fullName: 'acme/widgets' };

describe('createServiceHunkReviewCache', () => {
  it('falls back to a full review when the service is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network down'); }));
    const warn = vi.fn();
    const cache = createServiceHunkReviewCache(service, repository, 'abc123', warn);

    await expect(cache.recall(['a'.repeat(64)])).resolves.toEqual(new Map());
    await expect(cache.record([{ key: 'a'.repeat(64), skill: 'security-review', evidence: [] }])).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not store hunk reviews'));
    vi.unstubAllGlobals();
  });
});
