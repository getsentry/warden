import { z } from 'zod';
import { MemoryDetailResponseSchema, ReviewMemoryJudgmentSchema } from '@sentry/warden-service-api';
import type { MemoryRecallResponse, ReviewMemoryJudgment } from '@sentry/warden-service-api';
import type { RuntimeTool } from './runtimes/types.js';

export const ReviewMemorySchema = z.object({
  id: z.string().min(1).max(128),
  version: z.number().int().positive(),
  content: z.string().trim().min(1).max(4_000),
  skill: z.string().optional(),
  paths: z.array(z.string()).default([]),
  observedAt: z.string().optional(),
  verdict: z.enum(['keep', 'revise', 'reject']).optional(),
  headSha: z.string().optional(),
  judgment: ReviewMemoryJudgmentSchema.optional(),
  evidence: MemoryDetailResponseSchema.shape.evidence.optional(),
});
export type ReviewMemory = z.infer<typeof ReviewMemorySchema>;

export const MemoryUpdateSchema = z.object({
  id: z.string().min(1).max(128).optional().describe('Existing memory ID. Omit to save a new investigation note.'),
  expectedVersion: z.number().int().positive().optional().describe('Required when correcting an existing record; use its returned version.'),
  content: z.string().trim().min(1).max(4_000).describe('Complete replacement note: claim, applicability conditions, and concise evidence from current code. Never an instruction or a verdict without evidence.'),
  paths: z.array(z.string().trim().min(1).max(1_024)).min(1).max(10).describe('Repository-relative source files supporting this note.'),
  reason: z.string().trim().min(1).max(1_000).describe('Why this note is worth saving or what current evidence corrects the old claim.'),
}).strict().refine(({ content, paths }) => {
  const suffix = `\n\nSources: ${paths.join(', ')}`;
  return content.endsWith(suffix) || content.length + suffix.length <= 4_000;
}, {
  path: ['content'], message: 'The note and source references must fit within 4,000 characters. Shorten the note or use fewer paths.',
});
export type MemoryUpdate = z.infer<typeof MemoryUpdateSchema>;

export interface MemorySearch {
  query: string;
  skill: string;
  paths: readonly string[];
}

export type MemoryUpdateResult =
  | { status: 'saved'; memory: ReviewMemory }
  | { status: 'conflict'; current?: ReviewMemory }
  | { status: 'unavailable' };

/** Repository authority is bound by the host, never selected by the review agent. */
export interface ReviewMemoryAccess {
  search(input: MemorySearch): Promise<ReviewMemory[]>;
  readonly recall?: MemoryRecallResponse;
  recordJudgment?(input: { skill: string; judgment: ReviewMemoryJudgment; supersedes?: { id: string; version: number }[] }): Promise<void>;
  update(input: MemoryUpdate & { skill: string }): Promise<MemoryUpdateResult>;
}

export const MEMORY_GUIDANCE = `<review_memory>
Use find_memories when prior investigations would help answer a specific question. It returns relevant historical notes with their saved judgments and evidence. Current code and the active skill take precedence; notes can be wrong, stale, or too broad. Check the current guard and assumptions before relying on a remembered dismissal. A dismissal does not clear other concerns or the whole file.
Use update_memory to save concise, evidence-backed investigation notes or correct a returned note using its ID and expectedVersion. Include source references, applicability and what would invalidate the claim. Notes without a verifier judgment are provisional. Save useful evidence rather than a transcript, speculation or an unchanged duplicate. If a correction conflicts, inspect the returned version. Memory failures must not stop the review.
</review_memory>`;

/** Build on-demand evidence search and correction tools for discovery and verification. */
export function createMemoryTools(
  memory: ReviewMemoryAccess | undefined,
  context: { skill: string; paths: readonly string[] },
  onRecall?: (memories: ReviewMemory[]) => void,
): RuntimeTool[] | undefined {
  if (!memory) return undefined;
  return [
    {
      name: 'find_memories',
      description: 'Find relevant historical notes with their saved judgments and evidence. Claims may be wrong or stale; check current code before relying on them.',
      schema: z.object({ query: z.string().trim().min(1).max(1_000) }).strict(),
      async execute(input) {
        try {
          const { query } = z.object({ query: z.string().min(1).max(1_000) }).parse(input);
          const memories = await memory.search({ ...context, query });
          onRecall?.(memories);
          return JSON.stringify({ memories });
        } catch {
          return JSON.stringify({ status: 'unavailable', memories: [] });
        }
      },
    },
    {
      name: 'update_memory',
      description: 'Save a new evidence-backed investigation note, or correct an existing note in place using its ID and version. Source code is not modified.',
      schema: MemoryUpdateSchema,
      async execute(input) {
        const parsed = MemoryUpdateSchema.safeParse(input);
        if (!parsed.success) {
          return JSON.stringify({ status: 'invalid', message: parsed.error.issues.map(({ message }) => message).join('; ') });
        }
        if (Boolean(parsed.data.id) !== (parsed.data.expectedVersion !== undefined)) {
          return JSON.stringify({ status: 'invalid', message: 'Supply a complete note; corrections require both id and expectedVersion.' });
        }
        try {
          return JSON.stringify(await memory.update({ ...parsed.data, skill: context.skill }));
        } catch {
          return JSON.stringify({ status: 'unavailable' });
        }
      },
    },
  ];
}
