import { createHash } from 'node:crypto';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { ReviewMemoryWriteRequestSchema } from '@sentry/warden-service-api';
import type { MemoryRecord, ReviewMemoryWriteRequest, ReviewMemoryWriteResponse } from '@sentry/warden-service-api';
import { canAccessRepository, hasRole, requireServiceContext } from '../context.js';
import type { ServiceContext } from '../context.js';
import type { WardenDatabase } from '../db/database.js';
import { getQueryDatabase } from '../db/query.js';
import { memories, memoryEmbeddings, memoryEvidence, memoryLifecycleEvents, repositories, reviewMemoryRevisions, jobs } from '../db/schema.js';

function record(row: typeof memories.$inferSelect, repository: MemoryRecord['repository']): MemoryRecord {
  return {
    id: row.id, version: row.version, kind: row.kind, lifecycle: row.lifecycle,
    ...(row.judgment ? { judgment: row.judgment } : {}),
    content: row.content, repository, createdAt: row.createdAt.toISOString(), observedAt: row.observedAt.toISOString(),
    ...(row.skill ? { skill: row.skill } : {}), ...(row.language ? { language: row.language } : {}),
    ...(row.pathFamily ? { pathFamily: row.pathFamily } : {}), ...(row.expiresAt ? { expiresAt: row.expiresAt.toISOString() } : {}),
  };
}

/** Save provisional review guidance or correct a note without losing earlier evidence. */
export async function updateReviewMemory(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  input: ReviewMemoryWriteRequest,
  embedding?: { provider: string; model: string },
): Promise<ReviewMemoryWriteResponse> {
  const context = requireServiceContext(contextInput);
  const request = ReviewMemoryWriteRequestSchema.parse(input);
  if (!hasRole(context, 'read') || !hasRole(context, 'ingest') || context.credentialKind === 'personal'
    || !canAccessRepository(context, request.repository.fullName)) return { status: 'unavailable' };
  if (request.paths.some((path) => path.startsWith('/') || path.includes('\\') || path.split('/').includes('..'))) {
    return { status: 'unavailable' };
  }
  const sourceSuffix = `\n\nSources: ${request.paths.join(', ')}`;
  const content = request.content.endsWith(sourceSuffix) ? request.content : `${request.content}${sourceSuffix}`;
  if (content.length > 4_000) return { status: 'unavailable' };
  return database.transaction<ReviewMemoryWriteResponse>(async (client) => {
    const db = getQueryDatabase(client);
    // Persist the embedding job atomically so a failed enqueue cannot commit a partial write.
    async function saved(memory: MemoryRecord): Promise<ReviewMemoryWriteResponse> {
      if (embedding) {
        await db.insert(jobs).values({
          tenantId: context.tenantId, type: 'memory_embed', entityId: memory.id,
          inputVersion: memory.version,
          idempotencyKey: `memory_embed:${memory.id}:v${memory.version}:${embedding.provider}:${embedding.model}`,
          payloadRef: JSON.stringify({ memoryId: memory.id }),
        }).onConflictDoNothing();
      }
      return { status: 'saved', memory };
    }
    // An authorized first review can save evidence before its final run is published.
    await db.insert(repositories).values({ tenantId: context.tenantId, ...request.repository, memoryEnabled: true })
      .onConflictDoNothing();
    const [repository] = await db.select().from(repositories).where(and(
      eq(repositories.tenantId, context.tenantId), eq(repositories.provider, request.repository.provider),
      eq(repositories.owner, request.repository.owner), eq(repositories.name, request.repository.name),
    )).limit(1);
    if (!repository?.memoryEnabled) return { status: 'unavailable' };
    const contentHash = createHash('sha256').update(content).digest('hex');
    const identityHash = request.judgment ? createHash('sha256').update(JSON.stringify(request.judgment)).digest('hex') : contentHash;
    const now = new Date();
    const pathFamily = request.paths[0]?.split('/')[0];
    if (!pathFamily) return { status: 'unavailable' };
    const values = {
      content, contentHash, judgment: request.judgment ?? null, skill: request.skill, pathFamily,
      searchDocument: `${content} ${request.skill} ${pathFamily}`,
      observedAt: now, updatedAt: now,
    };
    if (!request.id) {
      const references = request.supersedes ?? [];
      // Lock only explicitly linked provisional notes, never every note in the same file.
      const provisional = references.length ? await db.select().from(memories).where(and(
        eq(memories.tenantId, context.tenantId), eq(memories.repositoryId, repository.id),
        eq(memories.skill, request.skill), eq(memories.origin, 'review'),
        eq(memories.kind, 'review_guidance'), isNull(memories.judgment),
        inArray(memories.lifecycle, ['active', 'candidate']),
        inArray(memories.id, references.map(({ id }) => id)),
      )).orderBy(asc(memories.id)).for('update') : [];
      const idempotencyKey = `review:${repository.id}:${request.skill}:${identityHash}`;
      const [created] = await db.insert(memories).values({
        tenantId: context.tenantId, repositoryId: repository.id, idempotencyKey,
        kind: 'review_guidance', lifecycle: 'active', origin: 'review', ...values,
      }).onConflictDoNothing().returning();
      const existing = created ?? (await db.select().from(memories).where(and(
        eq(memories.tenantId, context.tenantId), eq(memories.repositoryId, repository.id), eq(memories.idempotencyKey, idempotencyKey),
      )).limit(1))[0];
      if (!existing || existing.contentHash !== contentHash || existing.lifecycle !== 'active') return { status: 'conflict' };
      if (created) {
        await db.insert(memoryLifecycleEvents).values({
          tenantId: context.tenantId, memoryId: created.id, toState: 'active', actorTokenId: context.tokenId, reason: request.reason,
        });
        for (const note of provisional) {
          if (!references.some(({ id, version }) => id === note.id && version === note.version)) continue;
          const reason = `Superseded by verifier judgment ${created.id}: ${request.reason}`.slice(0, 1_000);
          const evidence = await db.select().from(memoryEvidence).where(and(
            eq(memoryEvidence.tenantId, context.tenantId), eq(memoryEvidence.memoryId, note.id),
          ));
          await db.insert(reviewMemoryRevisions).values({
            tenantId: context.tenantId, memoryId: note.id, version: note.version,
            snapshot: { memory: record(note, request.repository), evidence }, reason,
          });
          await db.update(memories).set({
            lifecycle: 'superseded', supersededById: created.id, version: note.version + 1, updatedAt: now,
          }).where(and(eq(memories.tenantId, context.tenantId), eq(memories.repositoryId, repository.id), eq(memories.id, note.id)));
          await db.insert(memoryLifecycleEvents).values({
            tenantId: context.tenantId, memoryId: note.id, fromState: note.lifecycle, toState: 'superseded',
            actorTokenId: context.tokenId, reason,
          });
        }
      }
      return saved(record(existing, request.repository));
    }
    const [current] = await db.select().from(memories).where(and(
      eq(memories.tenantId, context.tenantId), eq(memories.repositoryId, repository.id), eq(memories.id, request.id),
    )).limit(1).for('update');
    if (!current) return { status: 'conflict' };
    // Final judgments are immutable evidence. Later reviews save their own dated judgment.
    if (current.judgment || request.judgment) return { status: 'conflict', current: record(current, request.repository) };
    if (!['active', 'candidate'].includes(current.lifecycle)
      || (current.skill && current.skill !== request.skill)) return { status: 'conflict', current: record(current, request.repository) };
    // A lost response may retry a correction already committed at the next version.
    if (current.content === content) return saved(record(current, request.repository));
    if (current.version !== request.expectedVersion) return { status: 'conflict', current: record(current, request.repository) };
    const evidence = await db.select().from(memoryEvidence).where(and(eq(memoryEvidence.tenantId, context.tenantId), eq(memoryEvidence.memoryId, current.id)));
    await db.insert(reviewMemoryRevisions).values({
      tenantId: context.tenantId, memoryId: current.id, version: current.version,
      snapshot: { memory: record(current, request.repository), evidence }, reason: request.reason,
    });
    const [updated] = await db.update(memories).set({
      ...values, version: current.version + 1, origin: 'review', kind: 'review_guidance',
      confidence: null, supportCount: 0, contradictionCount: 0,
    }).where(and(eq(memories.tenantId, context.tenantId), eq(memories.id, current.id))).returning();
    // Old support belongs to the saved revision, not to the corrected claim.
    await db.delete(memoryEvidence).where(and(eq(memoryEvidence.tenantId, context.tenantId), eq(memoryEvidence.memoryId, current.id)));
    await db.delete(memoryEmbeddings).where(and(eq(memoryEmbeddings.tenantId, context.tenantId), eq(memoryEmbeddings.memoryId, current.id)));
    if (!updated) throw new Error('memory_update_failed');
    return saved(record(updated, request.repository));
  });
}
