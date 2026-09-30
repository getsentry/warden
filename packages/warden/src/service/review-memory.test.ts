import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServiceReviewMemory } from './review-memory.js';

const repository = { provider: 'github' as const, owner: 'acme', name: 'widgets', fullName: 'acme/widgets' };
const id = '00000000-0000-4000-8000-000000000001';
const judgmentId = '00000000-0000-4000-8000-000000000002';
const observedAt = '2026-09-24T00:00:00Z';
const summary = { id, version: 1, kind: 'review_guidance', content: 'Membership guards are absent.', skill: 'security' };
const record = { ...summary, lifecycle: 'active', repository, createdAt: observedAt, observedAt };
const judgment = { verdict: 'reject' as const, candidate: { id: 'claim', severity: 'high' as const,
  title: 'Missing tenant check', description: 'Objects may be read across tenants.',
  verification: 'The handler dispatches to loadObject().', location: { path: 'auth.ts', startLine: 10 } },
  reason: 'loadObject checks membership before returning data.', observedAt };
const search = { query: 'can credentials cross tenants?', paths: ['auth.ts'], skill: 'security' };
const directories: string[] = [];
afterEach(() => { vi.restoreAllMocks(); for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });

function setup() {
  const directory = mkdtempSync(join(tmpdir(), 'memory-service-'));
  directories.push(directory);
  writeFileSync(join(directory, 'auth.ts'), 'guard();');
  return createServiceReviewMemory({ url: 'https://service.example.com', token: 'test', memory: true, data: 'code', timeoutMs: 1000 }, repository, directory)!;
}

function mockSearch(detail = record, evidence: unknown[] = []) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
    if (init?.method === 'GET') return Response.json({ memory: detail, evidence, lifecycle: [] });
    const body = JSON.parse(String(init?.body));
    return Response.json({ protocolVersion: 1, clientRecallId: body.clientRecallId, memories: [summary] });
  });
}

describe('service review memory', () => {
  it('projects event repository context to the strict service identity', async () => {
    const fetch = mockSearch();
    const eventRepository = { ...repository, defaultBranch: 'main' };
    const memory = createServiceReviewMemory({ url: 'https://service.example.com', token: 'test', memory: true, data: 'code', timeoutMs: 1000 }, eventRepository, process.cwd())!;
    await memory.search(search);
    const [, options] = fetch.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(JSON.parse(String(options?.body)).repository).toEqual(repository);
  });

  it('fetches full judgment and evidence only when the agent searches', async () => {
    const evidence = [{ kind: 'finding', verification: 'guard() checks membership.', createdAt: observedAt }];
    const fetch = mockSearch({ ...record, judgment } as typeof record, evidence);
    const memory = setup();
    expect(fetch).not.toHaveBeenCalled();
    expect(memory.recall).toBeUndefined();
    expect(await memory.search(search)).toMatchObject([{ id, version: 1, judgment, evidence }]);
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toMatchObject({ repository, query: search.query, paths: search.paths, skills: ['security'] });
    expect(fetch.mock.calls[1]?.[1]?.method).toBe('GET');
    expect(memory.recall?.memories).toEqual([summary]);
  });

  it('bounds judgment summaries including source metadata without truncating saved evidence', async () => {
    const longJudgment = { ...judgment, candidate: { ...judgment.candidate, title: 'Long title '.repeat(500),
      additionalLocations: Array.from({ length: 10 }, (_, i) => ({ path: `${i}/` + 'a'.repeat(900) + '.ts', startLine: 1 })) } };
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      status: 'saved', memory: { ...record, id: judgmentId, judgment: longJudgment },
    }));
    const memory = setup();
    await memory.recordJudgment!({ skill: 'security', judgment: longJudgment });
    const input = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect((input.content + `\n\nSources: ${input.paths.join(', ')}`).length).toBeLessThanOrEqual(4_000);
    expect(input.judgment).toEqual(longJudgment);
  });

  it('binds corrections to admitted notes and the authorized repository', async () => {
    const fetch = mockSearch();
    const memory = setup();
    const update = { id, expectedVersion: 1, content: 'Only wrapped routes check ownership.', paths: ['auth.ts'], reason: 'Read current code.', skill: 'security' };
    expect(await memory.update(update)).toEqual({ status: 'conflict' });
    expect(fetch).not.toHaveBeenCalled();
    await memory.search(search);
    fetch.mockResolvedValue(Response.json({ status: 'saved', memory: { ...record, version: 2, content: update.content } }));
    expect(await memory.update(update)).toMatchObject({ status: 'saved', memory: { id, version: 2 } });
    expect(JSON.parse(String(fetch.mock.calls.at(-1)?.[1]?.body))).toMatchObject({ repository, ...update });
    fetch.mockResolvedValue(Response.json({ status: 'conflict', current: { ...record, version: 3 } }));
    expect(await memory.update({ ...update, expectedVersion: 2 })).toMatchObject({ status: 'conflict', current: { version: 3 } });
  });

  it('groups simultaneous searches under the first requested recall for publication', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      if (init?.method === 'GET') return Response.json({ memory: record, evidence: [], lifecycle: [] });
      const body = JSON.parse(String(init?.body));
      if (!body.parentRecallId) await gate;
      return Response.json({ protocolVersion: 1, clientRecallId: body.clientRecallId, memories: body.parentRecallId ? [] : [summary] });
    });
    const memory = setup();
    const first = memory.search(search);
    const second = memory.search({ ...search, query: 'other concern' });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    release();
    await Promise.all([first, second]);
    const calls = fetch.mock.calls.filter(([, init]) => init?.method !== 'GET').map(([, init]) => JSON.parse(String(init?.body)));
    expect(calls).toHaveLength(2);
    expect(calls[0]).not.toHaveProperty('parentRecallId');
    expect(calls[1]?.parentRecallId).toBe(calls[0]?.clientRecallId);
    expect(memory.recall).toEqual({ protocolVersion: 1, clientRecallId: calls[0]?.clientRecallId, memories: [summary] });
  });

  it.each([
    { version: 2 }, { lifecycle: 'superseded' }, { id: judgmentId },
    { repository: { ...repository, name: 'other', fullName: 'acme/other' } },
  ])('does not serve detail changed since ranking: %j', async (change) => {
    mockSearch({ ...record, ...change });
    expect(await setup().search(search)).toEqual([]);
  });

  it('links only admitted provisional versions when saving a verifier judgment', async () => {
    const fetch = mockSearch();
    const memory = setup();
    await memory.search(search);
    fetch.mockResolvedValue(Response.json({ status: 'saved', memory: { ...record, id: judgmentId, judgment } }));
    await memory.recordJudgment!({ skill: 'security', judgment, supersedes: [
      { id, version: 1 }, { id, version: 2 }, { id: judgmentId, version: 1 },
    ] });
    expect(JSON.parse(String(fetch.mock.calls.at(-1)?.[1]?.body))).toMatchObject({
      repository, judgment, supersedes: [{ id, version: 1 }],
    });
    expect(await memory.update({ id, expectedVersion: 1, skill: 'security', content: 'Old note', paths: ['auth.ts'], reason: 'Stale' }))
      .toEqual({ status: 'conflict' });
  });
});
