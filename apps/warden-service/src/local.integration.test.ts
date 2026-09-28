import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createWardenServiceClient } from '../../../packages/warden-service-api/src/client.js';
import { createServiceReviewMemory } from '../../../packages/warden/src/service/review-memory.js';
import { startLocalMemoryService } from './local.js';

// External inference is fixed; HTTP, auth, jobs, SQL ranking and pgvector are real.
const inference = vi.hoisted(() => ({ queries: [] as string[], extractions: [] as unknown[] }));
vi.mock('@vercel/oidc', () => ({ getVercelOidcToken: async () => undefined }));
vi.mock('@ai-sdk/gateway', () => ({ createGatewayProvider: () => ({ chat: () => 'test', embeddingModel: () => 'test' }) }));
vi.mock('ai', () => ({
  embed: async ({ value }: { value: string }) => {
    inference.queries.push(value);
    const vector = Array<number>(1536).fill(0);
    vector[/webhook|reused/.test(value) ? 0 : 1] = 1;
    return { embedding: vector, usage: { tokens: 10 } };
  },
  generateObject: async ({ prompt }: { prompt: string }) => {
    const input = JSON.parse(prompt);
    if (input.evidence) {
      inference.extractions.push(input);
      return { object: { proposals: [] }, usage: { inputTokens: 20, outputTokens: 5 } };
    }
    return { object: { admittedIds: input.candidates.slice(0, 1).map((item: { id: string }) => item.id), uncertain: false },
      usage: { inputTokens: 20, outputTokens: 5 } };
  },
}));

const databaseUrl = process.env['WARDEN_TEST_DATABASE_URL'];
describe.skipIf(!databaseUrl)('local production memory stack', () => {
  let service: Awaited<ReturnType<typeof startLocalMemoryService>> | undefined;
  beforeAll(async () => {
    service = await startLocalMemoryService({ databaseUrl: databaseUrl!, namespace: `memory-test-${randomUUID()}`,
      environment: { AI_GATEWAY_API_KEY: 'mock-key' } });
  });
  afterAll(async () => {
    if (!service) return;
    await service.stop();
    await service.database.query('DELETE FROM tenants WHERE id = $1', [service.tenantId]);
    await service.database.close();
  });

  it('retrieves full historical judgments through on-demand semantic search', async () => {
    if (!service) throw new Error('Expected local service');
    const client = createWardenServiceClient({ baseUrl: service.url, token: service.token, timeoutMs: 30_000 });
    const repository = { provider: 'local' as const, owner: 'acme', name: 'webhooks', fullName: 'acme/webhooks' };
    const memory = createServiceReviewMemory({ url: service.url, token: service.token, timeoutMs: 30_000, memory: true, data: 'code' }, repository, process.cwd())!;
    expect(memory.recall).toBeUndefined();
    const search = (query: string) => memory.search({ query, skill: 'security', paths: [] });
    expect(await search('old requests can be reused')).toEqual([]);
    const initial = memory.recall!;
    const judgment = { verdict: 'keep' as const, candidate: { id: 'mailgun', severity: 'high' as const,
      title: 'Webhook replay', description: 'A signed payload remains accepted indefinitely.',
      verification: 'handlers/webhook.ts verifies the signature but never compares its timestamp to the clock.',
      location: { path: 'handlers/webhook.ts', startLine: 20 } },
      reason: 'Signature integrity does not establish freshness. No timestamp window or nonce store is checked.',
      headSha: 'abcdef012345', observedAt: '2026-09-25T10:00:00.000Z' };
    const saved = await client.updateMemory({ repository, skill: 'security', paths: ['handlers/webhook.ts'],
      content: 'Webhook signatures lack freshness validation.', reason: 'Final verifier evidence', judgment });
    expect(saved.status).toBe('saved');
    if (saved.status !== 'saved') throw new Error('Expected saved memory');
    await service.tick();
    const embeddedRows = await service.database.query('SELECT count(*)::int AS count FROM memory_embeddings WHERE tenant_id = $1 AND embedding_vector IS NOT NULL', [service.tenantId]);
    expect(embeddedRows.rows).toEqual([{ count: 1 }]);
    const response = await search('old requests can be reused');
    expect(response).toMatchObject([{ id: saved.memory.id, verdict: 'keep', headSha: judgment.headSha, judgment, evidence: [] }]);
    expect(inference.queries).toContain('old requests can be reused');
    const queryOnly = await client.recallMemory({ protocolVersion: 1, clientRecallId: randomUUID(), repository,
      skills: [], languages: [], paths: [], query: 'old requests can be reused' });
    expect(queryOnly.memories.map(({ id }) => id)).toContain(saved.memory.id);
    expect((await client.getMemory(saved.memory.id)).memory.judgment).toEqual(judgment);
    await service.database.query(`INSERT INTO memory_evidence (tenant_id, memory_id, evidence_kind)
      SELECT $1, $2, 'manual' FROM generate_series(1, 12)`, [service.tenantId, saved.memory.id]);
    expect((await client.getMemory(saved.memory.id)).evidence).toHaveLength(12);
    expect((await search('old requests can be reused'))[0]?.evidence).toHaveLength(10);
    expect(await client.updateMemory({ repository, skill: 'security', paths: ['handlers/webhook.ts'],
      id: saved.memory.id, expectedVersion: 1, content: 'Previously reviewed, so safe.', reason: 'An unsupported reversal' }))
      .toMatchObject({ status: 'conflict' });
    expect((await client.getMemory(saved.memory.id)).memory.judgment).toEqual(judgment);
    const fixed = await client.updateMemory({ repository, skill: 'security', paths: ['handlers/webhook.ts'],
      content: 'The webhook now rejects timestamps outside the allowed window.', reason: 'A later review observed a fix.',
      judgment: { ...judgment, verdict: 'reject', headSha: 'fedcba987654',
        reason: 'The current handler checks timestamp freshness before dispatch.', observedAt: '2026-09-25T11:00:00.000Z' } });
    if (fixed.status !== 'saved') throw new Error('Expected a new historical judgment');
    expect(fixed.memory.id).not.toBe(saved.memory.id);
    expect((await client.getMemory(saved.memory.id)).memory.judgment?.verdict).toBe('keep');
    expect((await client.getMemory(fixed.memory.id)).memory.judgment).toMatchObject({ verdict: 'reject', headSha: 'fedcba987654' });
    const other = await client.recallMemory({ protocolVersion: 1, clientRecallId: randomUUID(),
      repository: { ...repository, name: 'other', fullName: 'acme/other' }, skills: ['security'], languages: [], paths: [], query: 'old requests can be reused' });
    expect(other.memories).toEqual([]);
    const provisional = await client.updateMemory({ repository, skill: 'security', paths: ['handlers/webhook.ts'],
      content: 'The webhook enforces a time window.', reason: 'Initial investigation.' });
    if (provisional.status !== 'saved') throw new Error('Expected provisional note');
    await client.updateMemory({ repository, skill: 'security', paths: ['handlers/webhook.ts'],
      id: provisional.memory.id, expectedVersion: 1, content: 'Only the signature is checked.', reason: 'Timestamp check was absent.' });
    expect((await client.getMemory(provisional.memory.id)).history).toMatchObject([
      { memory: { version: 1, content: expect.stringContaining('enforces a time window') }, reason: 'Timestamp check was absent.' },
    ]);
    const findingCounts = { total: 1, bySeverity: { high: 1, medium: 0, low: 0 } };
    const clientRunId = randomUUID();
    await client.publishRun({ protocolVersion: 1, clientRunId, source: 'sdk', wardenVersion: 'test', dataProfile: 'findings',
      startedAt: judgment.observedAt, completedAt: judgment.observedAt, outcome: 'success', repository,
      headSha: judgment.headSha, features: { memory: true }, findingCounts,
      memoryRecallId: initial.clientRecallId, recalledMemories: [],
      skills: [{ executionId: 'security-1', skill: 'security', status: 'success', findingCounts, usage: [] }],
      findings: [{ ...judgment.candidate, skillExecutionId: 'security-1' }],
      observations: [{ findingId: judgment.candidate.id, skillExecutionId: 'security-1', outcome: 'posted',
        reason: 'Signature integrity does not establish freshness.', observedAt: judgment.observedAt }],
    });
    const searchCosts = await service.database.query("SELECT operation, cost_usd FROM usage_line_items WHERE tenant_id = $1 AND operation LIKE 'memory_search:%'", [service.tenantId]);
    expect(searchCosts.rowCount).toBeGreaterThan(0);
    expect(Number(searchCosts.rows[0]?.['cost_usd'])).toBeGreaterThan(0);
    await service.tick();
    expect(inference.extractions).toEqual(expect.arrayContaining([expect.objectContaining({
      evidence: [expect.objectContaining({ verification: judgment.candidate.verification, headSha: judgment.headSha,
        reason: 'Signature integrity does not establish freshness.', path: 'handlers/webhook.ts' })],
    })]));
    const indexed = await service.database.query('SELECT count(*)::int AS count FROM memory_embeddings WHERE tenant_id = $1 AND embedding_vector IS NOT NULL', [service.tenantId]);
    expect(indexed.rows[0]?.['count']).toBe(3);
    expect(inference.queries.filter((value) => value.startsWith('Only the signature is checked.'))).toHaveLength(1);
  }, 60_000);

  it('rolls back a correction and its history when embedding enqueue fails', async () => {
    if (!service) throw new Error('Expected local service');
    const client = createWardenServiceClient({ baseUrl: service.url, token: service.token, timeoutMs: 30_000 });
    const input = { repository: { provider: 'local' as const, owner: 'acme', name: 'atomic', fullName: 'acme/atomic' },
      skill: 'security', paths: ['src/auth.ts'], content: 'Original guard evidence.', reason: 'Read current code.' };
    const saved = await client.updateMemory(input);
    if (saved.status !== 'saved') throw new Error('Expected saved memory');
    const constraint = `test_embed_${randomUUID().replaceAll('-', '')}`;
    // Inject a real database enqueue failure for only this note's next revision.
    await service.database.query(`ALTER TABLE jobs ADD CONSTRAINT ${constraint}
      CHECK (entity_id <> '${saved.memory.id}' OR input_version <> 2) NOT VALID`);
    try {
      await expect(client.updateMemory({ ...input, id: saved.memory.id, expectedVersion: 1,
        content: 'Corrected guard evidence.' })).rejects.toThrow();
      const detail = await client.getMemory(saved.memory.id);
      expect(detail.memory).toMatchObject({ version: 1, content: saved.memory.content });
      expect(detail.history).toEqual([]);
    } finally {
      await service.database.query(`ALTER TABLE jobs DROP CONSTRAINT ${constraint}`);
    }
    expect(await client.updateMemory({ ...input, id: saved.memory.id, expectedVersion: 1,
      content: 'Corrected guard evidence.' })).toMatchObject({ status: 'saved', memory: { version: 2 } });
  }, 30_000);

  it('supersedes only explicit matching provisional versions and preserves their history', async () => {
    if (!service) throw new Error('Expected local service');
    const client = createWardenServiceClient({ baseUrl: service.url, token: service.token, timeoutMs: 30_000 });
    const repository = { provider: 'local' as const, owner: 'acme', name: 'guards', fullName: 'acme/guards' };
    const otherRepository = { ...repository, name: 'elsewhere', fullName: 'acme/elsewhere' };
    const base = { repository, skill: 'security', paths: ['handlers/auth.ts'], reason: 'Read the current handler.' };
    const save = async (content: string, overrides = {}) => {
      const result = await client.updateMemory({ ...base, content, ...overrides });
      if (result.status !== 'saved') throw new Error('Expected saved note');
      return result.memory;
    };
    const linked = await save('No ownership guard was found.');
    await save('Only direct calls appear unguarded.', { id: linked.id, expectedVersion: 1 });
    const unrelated = await save('A separate query has an injection risk.');
    const stale = await save('A different handler is missing a guard.');
    await save('That different handler is now guarded.', { id: stale.id, expectedVersion: 1 });
    const crossRepo = await save('Another repository has this concern.', { repository: otherRepository });
    const crossSkill = await save('This concern belongs to a different skill.', { skill: 'performance' });
    const judgment = { verdict: 'reject' as const, candidate: { id: 'ownership', severity: 'high' as const,
      title: 'Missing ownership guard', description: 'Direct calls may bypass the wrapper.',
      verification: 'handlers/auth.ts uses requireOwner() before dispatch.', location: { path: 'handlers/auth.ts', startLine: 20 } },
      reason: 'requireOwner() rejects non-owners before the handler is invoked.', observedAt: '2026-09-28T10:00:00Z' };
    const priorJudgment = await save('Previously verified at another revision.', { judgment: { ...judgment, headSha: '1234567' } });
    const input = { ...base, content: 'The wrapper checks ownership.', judgment, supersedes: [
      { id: linked.id, version: 2 }, { id: stale.id, version: 1 }, { id: crossRepo.id, version: 1 },
      { id: crossSkill.id, version: 1 }, { id: priorJudgment.id, version: 1 },
    ] };
    const final = await client.updateMemory(input);
    if (final.status !== 'saved') throw new Error('Expected saved judgment');
    expect(await client.updateMemory(input)).toMatchObject({ status: 'saved', memory: { id: final.memory.id } });
    const detail = await client.getMemory(linked.id);
    expect(detail.memory).toMatchObject({ version: 3, lifecycle: 'superseded' });
    expect(detail.history).toHaveLength(2);
    expect(detail.history).toEqual(expect.arrayContaining([
      expect.objectContaining({ memory: expect.objectContaining({ version: 2, content: expect.stringContaining('Only direct calls') }) }),
    ]));
    expect(detail.lifecycle.filter(({ to }) => to === 'superseded')).toHaveLength(1);
    expect(detail.lifecycle).toEqual(expect.arrayContaining([expect.objectContaining({ to: 'superseded', reason: expect.stringContaining(final.memory.id) })]));
    const stored = await service.database.query('SELECT superseded_by_id FROM memories WHERE tenant_id = $1 AND id = $2', [service.tenantId, linked.id]);
    expect(stored.rows).toEqual([{ superseded_by_id: final.memory.id }]);
    for (const note of [unrelated, stale, crossRepo, crossSkill, priorJudgment]) {
      expect((await client.getMemory(note.id)).memory.lifecycle).toBe('active');
    }
    expect((await client.getMemory(priorJudgment.id)).memory.judgment).toEqual({ ...judgment, headSha: '1234567' });
    await expect(client.updateMemory({ ...base, content: 'Invalid provisional retirement', supersedes: [{ id: unrelated.id, version: 1 }] })).rejects.toThrow('Only a new verifier judgment');
    await service.tick();
    const recalled = await client.recallMemory({ protocolVersion: 1, clientRecallId: randomUUID(), repository,
      skills: ['security'], languages: [], paths: ['handlers/auth.ts'], query: 'ownership guard' });
    expect(recalled.memories.map(({ id }) => id)).not.toContain(linked.id);
  }, 60_000);

});
