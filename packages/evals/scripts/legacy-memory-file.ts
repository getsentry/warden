// Reproduction adapter for the completed JSON-memory experiment only. Current reviews use the service.
import { validateMemoryPaths } from '../../warden/src/sdk/memory-paths.js';
import { randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { MemoryUpdateSchema, ReviewMemorySchema } from '../../warden/src/sdk/memory.js';
import type { MemoryUpdateResult, ReviewMemoryAccess, ReviewMemory, MemorySearch } from '../../warden/src/sdk/memory.js';

const RevisionSchema = ReviewMemorySchema.extend({ reason: z.string() });
const StoredMemorySchema = ReviewMemorySchema.extend({
  history: z.array(RevisionSchema).default([]),
  reason: z.string(),
});
const FileSchema = z.object({
  formatVersion: z.literal(1),
  repository: z.string(),
  memories: z.array(StoredMemorySchema),
});

/** Open an explicit local memory store; updates are atomic and retain prior revisions. */
export function createFileReviewMemory(options: {
  path: string;
  repository: string;
  repoPath: string;
}): ReviewMemoryAccess {
  const path = resolve(options.path);
  const repoPath = realpathSync(options.repoPath);
  function load(): z.infer<typeof FileSchema> {
    const data = existsSync(path)
      ? FileSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
      : { formatVersion: 1 as const, repository: options.repository, memories: [] };
    if (data.repository !== options.repository) throw new Error('Memory file belongs to another repository');
    return data;
  }
  load();
  return {
    async search(input) {
      return selectMemories(load().memories.map((record) => ReviewMemorySchema.parse(record)), input);
    },
    async update(input): Promise<MemoryUpdateResult> {
      const validated = MemoryUpdateSchema.parse({
        id: input.id, expectedVersion: input.expectedVersion, content: input.content,
        paths: input.paths, reason: input.reason,
      });
      if (Boolean(validated.id) !== (validated.expectedVersion !== undefined)) throw new Error('Invalid memory version');
      validateMemoryPaths(repoPath, validated.paths);
      mkdirSync(dirname(path), { recursive: true });
      // A separate process may use the same store. Never silently overwrite its notes.
      let lock: number;
      try { lock = openSync(`${path}.lock`, 'wx', 0o600); } catch { return { status: 'unavailable' }; }
      try {
        const data = load();
        const current = validated.id ? data.memories.find((record) => record.id === validated.id) : undefined;
        if (validated.id && (!current || current.version !== validated.expectedVersion || (current.skill && current.skill !== input.skill))) {
          return { status: 'conflict', ...(current ? { current: ReviewMemorySchema.parse(current) } : {}) };
        }
        const duplicate = !validated.id && data.memories.find((record) => record.content === validated.content
          && record.skill === input.skill && JSON.stringify(record.paths) === JSON.stringify(validated.paths));
        if (duplicate) return { status: 'saved', memory: ReviewMemorySchema.parse(duplicate) };
        if (current?.content === validated.content && JSON.stringify(current.paths) === JSON.stringify(validated.paths)) {
          return { status: 'saved', memory: ReviewMemorySchema.parse(current) };
        }
        const next = StoredMemorySchema.parse({
          id: current?.id ?? randomUUID(), version: (current?.version ?? 0) + 1,
          content: validated.content, paths: validated.paths, skill: input.skill,
          observedAt: new Date().toISOString(), reason: validated.reason,
          history: current ? [...current.history, RevisionSchema.parse(current)] : [],
        });
        if (current) data.memories[data.memories.indexOf(current)] = next;
        else data.memories.push(next);
        const temporary = `${path}.${randomUUID()}.tmp`;
        try {
          writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
          renameSync(temporary, path);
        } finally {
          if (existsSync(temporary)) unlinkSync(temporary);
        }
        return { status: 'saved', memory: ReviewMemorySchema.parse(next) };
      } finally {
        closeSync(lock);
        unlinkSync(`${path}.lock`);
      }
    },
  };
}

/** Rank a bounded set of notes without treating their conclusions as authoritative. */
function selectMemories(memories: readonly ReviewMemory[], input: MemorySearch): ReviewMemory[] {
  const terms = [...new Set(input.query.toLowerCase().split(/[^\p{L}\p{N}_]+/u).filter((term) => term.length > 2))];
  const ranked = memories.filter((memory) => !memory.skill || memory.skill === input.skill).map((memory) => {
    const text = `${memory.content} ${memory.paths.join(' ')}`.toLowerCase();
    const score = terms.filter((term) => text.includes(term)).length
      + (memory.paths.some((path) => input.paths.includes(path)) ? 5 : 0);
    return { memory, score };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || a.memory.id.localeCompare(b.memory.id));
  const selected: ReviewMemory[] = [];
  let characters = 0;
  for (const { memory } of ranked) {
    if (selected.length >= 5 || characters + memory.content.length > 8_000) continue;
    selected.push(memory);
    characters += memory.content.length;
  }
  return selected;
}
