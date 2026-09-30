import { afterEach, describe, expect, it, vi } from 'vitest';
import { startLocalMemoryService } from './local.js';

const state = vi.hoisted(() => ({
  nextToken: 0,
  job: undefined as Promise<Response> | undefined,
  revoke: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue({ rowCount: 1, rows: [{}] }),
}));
vi.mock('@sentry/warden-service', () => ({
  getWarmDatabase: () => ({ query: state.query }),
  migrateDatabase: vi.fn(),
  createTenant: async () => 'tenant',
  createServiceToken: async () => ({ id: `token-${++state.nextToken}`, token: 'test-token' }),
  revokeServiceToken: state.revoke,
}));
vi.mock('./create-app.js', () => ({
  createVercelWardenService: () => ({
    fetch: () => Response.json({ ready: true }),
    request: () => state.job ?? Promise.resolve(new Response(null)),
  }),
}));

const active: Awaited<ReturnType<typeof startLocalMemoryService>>[] = [];
const start = async (port?: number) => {
  const service = await startLocalMemoryService({ databaseUrl: 'postgres://test:test@127.0.0.1/memory', port });
  active.push(service);
  return service;
};
afterEach(async () => {
  await Promise.allSettled(active.splice(0).map((service) => service.stop()));
  state.job = undefined;
  vi.clearAllMocks();
});

describe('local service lifecycle', () => {
  it('revokes the newly created token when its port is already occupied', async () => {
    const service = await start();
    await expect(start(Number(new URL(service.url).port))).rejects.toMatchObject({ code: 'EADDRINUSE' });
    expect(state.revoke).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ tenantId: 'tenant' }), `token-${state.nextToken}`);
    expect((await fetch(service.url)).status).toBe(200);
  });

  it('closes the listener and revokes its token even when an in-flight job fails', async () => {
    const service = await start();
    let release!: (response: Response) => void;
    state.job = new Promise((resolve) => { release = resolve; });
    const tick = service.tick();
    const stopping = service.stop();
    expect(service.stop()).toBe(stopping);
    const tickFailure = expect(tick).rejects.toThrow('Local memory worker failed');
    const stopFailure = expect(stopping).rejects.toThrow('Local memory worker failed');
    release(new Response(null, { status: 500 }));
    await Promise.all([tickFailure, stopFailure]);
    await expect(fetch(service.url)).rejects.toThrow();
    expect(state.revoke).toHaveBeenCalledOnce();
  });
});
