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

  it('stores reviews the service accepts and drops ones it would reject', async () => {
    const fetchMock = vi.fn(async () => Response.json({ recorded: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    const cache = createServiceHunkReviewCache(service, repository, 'abc123');
    const read = { tool: 'read', params: { path: 'src/auth.py' }, outputHash: 'b'.repeat(64), isError: false };

    await cache.record([
      { key: 'a'.repeat(64), skill: 'security-review', evidence: [read] },
      { key: 'c'.repeat(64), skill: 'security-review', evidence: [{ ...read, params: { path: 'x', mode: 'raw' } }] },
    ]);

    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.reviews.map((review: { key: string }) => review.key)).toEqual(['a'.repeat(64)]);
    vi.unstubAllGlobals();
  });
});
