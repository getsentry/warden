import { describe, expect, it, vi } from 'vitest';
import { createMemoryTools } from './memory.js';
import type { ReviewMemoryAccess } from './memory.js';
import type { RuntimeTool } from '../index.js';

function fixture() {
  const judgment = { verdict: 'reject' as const, candidate: { id: 'claim', severity: 'high' as const,
    title: 'Missing tenant check', description: 'The handler might cross tenants.',
    verification: 'The route calls guard() before dispatch.', location: { path: 'guard.ts', startLine: 10 } },
    reason: 'guard() checks tenant membership before reading the object.', observedAt: '2026-09-24T00:00:00Z' };
  const note = { id: 'note', version: 1, content: 'Guard checks tenant membership.', paths: ['guard.ts'],
    judgment, evidence: [{ kind: 'finding', verification: judgment.candidate.verification, createdAt: judgment.observedAt }] };
  const memory: ReviewMemoryAccess = {
    search: vi.fn().mockResolvedValue([note]),
    update: vi.fn().mockResolvedValue({ status: 'unavailable' }),
  };
  const tools: RuntimeTool[] = createMemoryTools(memory, { skill: 'security', paths: ['guard.ts'] })!;
  return { memory, note, tools, tool: (name: string) => tools.find((tool) => tool.name === name)! };
}

describe('review memory tools', () => {
  it('returns full judgment and evidence in one agent-initiated search', async () => {
    const { memory, note, tools, tool } = fixture();
    expect(memory.search).not.toHaveBeenCalled();
    expect(tools.map(({ name }) => name)).toEqual(['find_memories', 'update_memory']);
    expect(JSON.parse(await tool('find_memories').execute({ query: 'Which guard checks membership?' })))
      .toEqual({ memories: [note] });
    expect(memory.search).toHaveBeenCalledExactlyOnceWith({ skill: 'security', paths: ['guard.ts'], query: 'Which guard checks membership?' });
  });

  it('fails open when memory search is unavailable', async () => {
    const { memory, tool } = fixture();
    vi.mocked(memory.search).mockRejectedValue(new Error('unavailable'));
    expect(JSON.parse(await tool('find_memories').execute({ query: 'membership' }))).toEqual({ status: 'unavailable', memories: [] });
  });

  it('does not let a model submit a verifier judgment through update_memory', async () => {
    const { memory, tool } = fixture();
    expect(JSON.parse(await tool('update_memory').execute({ content: 'Safe', paths: ['guard.ts'], reason: 'Assumed', judgment: { verdict: 'reject' } })))
      .toMatchObject({ status: 'invalid' });
    expect(memory.update).not.toHaveBeenCalled();
  });

  it('reports the source budget before saving a long note without silently truncating evidence', async () => {
    const { memory, tool } = fixture();
    const update = { content: 'e'.repeat(4_000), paths: ['guard.ts'], reason: 'Current evidence.' };
    expect(JSON.parse(await tool('update_memory').execute(update))).toMatchObject({
      status: 'invalid', message: expect.stringContaining('Shorten the note or use fewer paths'),
    });
    expect(memory.update).not.toHaveBeenCalled();
    const content = 'e'.repeat(4_000 - '\n\nSources: guard.ts'.length);
    await tool('update_memory').execute({ ...update, content });
    expect(memory.update).toHaveBeenCalledExactlyOnceWith({ ...update, content, skill: 'security' });
  });
});
