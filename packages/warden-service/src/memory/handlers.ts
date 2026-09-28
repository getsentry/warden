import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { getQueryDatabase } from '../db/query.js';
import { findings, findingObservations, findingLocations, runs, repositories, skillExecutions, memories, jobs } from '../db/schema.js';
import type { JobHandlers } from '../jobs/runner.js';
import type { WardenDatabase } from '../db/database.js';
import { applyTenantRetention } from '../administration/store.js';
import type { MemoryEmbeddingProvider, MemoryOperationUsage } from './store.js';
import {
  PASSIVE_MEMORY_MODEL_VERSION,
  PassiveExtractionInputSchema,
  PassiveMemoryProposalSchema,
  proposePassiveMemory,
  type PassiveEvidence,
  type PassiveExtractionInput,
  type PassiveMemoryProposal,
} from './passive.js';
import {
  defaultPassivePromotionPolicy,
  persistPassiveMemoryCandidate,
  type PassivePromotionPolicy,
} from './passive-store.js';

export interface PassiveMemoryExtractor {
  extract(input: PassiveExtractionInput): Promise<{
    proposals: PassiveMemoryProposal[];
    modelVersion: string;
    usage?: MemoryOperationUsage;
  }>;
}

export interface MemoryJobHandlerOptions {
  extractor?: PassiveMemoryExtractor;
  embedding?: MemoryEmbeddingProvider;
  promotionPolicy?: PassivePromotionPolicy;
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function isVectorUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? error.code : undefined;
  if (code === '42703' || code === '42704') return true;
  return 'cause' in error && isVectorUnavailable(error.cause);
}

async function loadEvidence(database: WardenDatabase, tenantId: string, repositoryId: string, runId: string) {
  const rows = await getQueryDatabase(database).select({
    findingId: sql<string>`${findings.id}`.as('finding_id'), observationId: sql<string>`${findingObservations.id}`.as('observation_id'), runId: sql<string>`${runs.id}`.as('run_id'),
    skill: skillExecutions.skill, title: findings.title, description: findings.description,
    outcome: findingObservations.outcome, observedAt: findingObservations.observedAt,
    verification: findings.verification, reason: findingObservations.reason, headSha: runs.headSha,
    path: findingLocations.path,
  }).from(findingObservations)
    .innerJoin(findings, and(eq(findings.id, findingObservations.findingId), eq(findings.tenantId, findingObservations.tenantId)))
    .innerJoin(runs, and(eq(runs.id, findingObservations.runId), eq(runs.tenantId, findingObservations.tenantId)))
    .innerJoin(repositories, and(eq(repositories.id, runs.repositoryId), eq(repositories.tenantId, runs.tenantId)))
    .innerJoin(skillExecutions, and(eq(skillExecutions.id, findings.skillExecutionId), eq(skillExecutions.tenantId, findings.tenantId)))
    .leftJoin(findingLocations, and(eq(findingLocations.findingId, findings.id), eq(findingLocations.tenantId, findings.tenantId), eq(findingLocations.ordinal, 0)))
    .where(and(eq(findingObservations.tenantId, tenantId), eq(runs.repositoryId, repositoryId), eq(repositories.memoryEnabled, true),
      inArray(runs.dataProfile, ['findings', 'code']), inArray(findingObservations.outcome, ['posted', 'resolved', 'rejected', 'revised'])))
    .orderBy(desc(sql`${runs.id} = ${runId}`), desc(findingObservations.observedAt), desc(findingObservations.id)).limit(100);
  return rows.sort((a, b) => iso(a.observedAt).localeCompare(iso(b.observedAt)) || a.observationId.localeCompare(b.observationId))
    .map((row) => ({ ...row, outcome: row.outcome as PassiveEvidence['outcome'], observedAt: iso(row.observedAt),
      verification: row.verification ?? undefined, reason: row.reason ?? undefined,
      headSha: row.headSha ?? undefined, path: row.path ?? undefined }));
}

function deterministicProposals(evidence: readonly PassiveEvidence[]): PassiveMemoryProposal[] {
  const groups = new Map<string, PassiveEvidence[]>();
  for (const item of evidence) {
    const key = `${item.skill}\0${item.title.toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()].flatMap((group) => {
    const proposal = proposePassiveMemory(group);
    return proposal ? [proposal] : [];
  });
}

async function recordExtractionUsage(
  database: WardenDatabase,
  job: { id: string; tenantId: string },
  runId: string,
  attempt: number,
  usage: MemoryOperationUsage | undefined,
): Promise<void> {
  if (!usage) return;
  await database.query(`
    INSERT INTO usage_line_items (
      tenant_id, run_id, skill_execution_id, lane, operation,
      provider, model, runtime, input_tokens, output_tokens, cost_usd, cost_basis
    ) VALUES ($1, $2, NULL, 'service', $3, $4, $5, $6, $7, $8, $9, $10::cost_basis)
  `, [
    job.tenantId,
    runId,
    `memory_extract:${job.id}:attempt:${attempt}`,
    usage.provider ?? null,
    usage.model ?? null,
    usage.runtime ?? null,
    usage.inputTokens ?? null,
    usage.outputTokens ?? null,
    usage.costUsd ?? null,
    usage.costBasis ?? 'unknown',
  ]);
}

function extractionProvenance(usage: MemoryOperationUsage | undefined): MemoryOperationUsage | undefined {
  if (!usage) return undefined;
  return {
    ...(usage.provider ? { provider: usage.provider } : {}),
    ...(usage.model ? { model: usage.model } : {}),
    ...(usage.runtime ? { runtime: usage.runtime } : {}),
  };
}

/** Build passive extraction, embedding, and expiration handlers on the shared durable runner. */
export function createMemoryJobHandlers(database: WardenDatabase, options: MemoryJobHandlerOptions = {}): JobHandlers {
  return {
    async memory_extract(job) {
      if (!job.repositoryId || !job.entityId) return { complete: true };
      const evidence = await loadEvidence(database, job.tenantId, job.repositoryId, job.entityId);
      if (evidence.length === 0) return { complete: true };
      const input = PassiveExtractionInputSchema.parse({ runId: job.entityId, evidence });
      const extracted = options.extractor
        ? await options.extractor.extract(input)
        : { proposals: deterministicProposals(evidence), modelVersion: PASSIVE_MEMORY_MODEL_VERSION };
      await recordExtractionUsage(database, job, job.entityId, job.attempts, extracted.usage);
      const proposals = extracted.proposals.map((proposal) => PassiveMemoryProposalSchema.parse(proposal));
      for (const proposal of proposals) {
        const persisted = await persistPassiveMemoryCandidate(database, {
          tenantId: job.tenantId,
          repositoryId: job.repositoryId,
          proposal,
          evidence,
          modelVersion: extracted.modelVersion,
          extractionUsage: extractionProvenance(extracted.usage),
          policy: options.promotionPolicy ?? defaultPassivePromotionPolicy,
        });
        if (persisted?.lifecycle === 'active' && options.embedding) {
          const db = getQueryDatabase(database);
          const [current] = await db.select({ version: memories.version }).from(memories).where(and(
            eq(memories.tenantId, job.tenantId), eq(memories.repositoryId, job.repositoryId),
            eq(memories.id, persisted.id), eq(memories.lifecycle, 'active'),
          )).limit(1);
          if (current) await db.insert(jobs).values({
            tenantId: job.tenantId, repositoryId: job.repositoryId, type: 'memory_embed',
            entityId: persisted.id, inputVersion: current.version,
            idempotencyKey: `memory_embed:${persisted.id}:v${current.version}:${options.embedding.provider}:${options.embedding.model}`,
            payloadRef: JSON.stringify({ memoryId: persisted.id }),
          }).onConflictDoNothing();
        }
      }
      return { complete: true };
    },
    async memory_embed(job) {
      if (!job.entityId || !options.embedding) return { complete: true };
      const loaded = await database.query<{
        id: string;
        repository_id: string;
        version: number;
        content: string;
        content_hash: string;
      }>(`
        SELECT id, repository_id, version, content, content_hash FROM memories
        WHERE tenant_id = $1 AND id = $2 AND lifecycle IN ('candidate', 'active') LIMIT 1
      `, [job.tenantId, job.entityId]);
      const memory = loaded.rows[0];
      // A newer revision already has its own job; do not pay to embed it twice.
      if (!memory || memory.version !== job.inputVersion) return { complete: true };
      const embedded = await options.embedding.embed(memory.content);
      if (embedded.vector.length !== options.embedding.dimensions || embedded.vector.some((value) => !Number.isFinite(value))) {
        throw new TypeError('invalid_memory_embedding');
      }
      const values = [
        job.tenantId, memory.id, options.embedding.provider, options.embedding.model,
        options.embedding.dimensions, memory.content_hash, `[${embedded.vector.join(',')}]`,
        embedded.usage?.inputTokens ?? null,
        embedded.usage?.costUsd ?? null,
        embedded.usage?.costBasis ?? null,
      ];
      try {
        await database.query(`
          INSERT INTO memory_embeddings (
            tenant_id, memory_id, provider, model, dimensions, content_hash,
            embedding, embedding_vector, input_tokens, cost_usd, cost_basis
          ) VALUES ($1, $2, $3, $4, $5, $6, NULL, $7::vector(1536), $8, $9, $10::cost_basis)
          ON CONFLICT (memory_id, provider, model) DO UPDATE SET
            dimensions = EXCLUDED.dimensions, content_hash = EXCLUDED.content_hash,
            embedding = NULL, embedding_vector = EXCLUDED.embedding_vector,
            input_tokens = EXCLUDED.input_tokens, cost_usd = EXCLUDED.cost_usd,
            cost_basis = EXCLUDED.cost_basis,
            created_at = now()
        `, values);
      } catch (error) {
        if (!isVectorUnavailable(error)) throw error;
        await database.query(`
          INSERT INTO memory_embeddings (
            tenant_id, memory_id, provider, model, dimensions, content_hash,
            embedding, input_tokens, cost_usd, cost_basis
          ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::cost_basis)
          ON CONFLICT (memory_id, provider, model) DO UPDATE SET
            dimensions = EXCLUDED.dimensions, content_hash = EXCLUDED.content_hash,
            embedding = EXCLUDED.embedding, input_tokens = EXCLUDED.input_tokens,
            cost_usd = EXCLUDED.cost_usd, cost_basis = EXCLUDED.cost_basis,
            created_at = now()
        `, values);
      }
      return { complete: true };
    },
    async retention(job) {
      await applyTenantRetention(database, job.tenantId);
      await database.transaction(async (client) => {
        const expired = await client.query<{ id: string }>(`
          UPDATE memories SET lifecycle = 'expired', version = version + 1, updated_at = now()
          WHERE tenant_id = $1 AND lifecycle IN ('candidate', 'active')
            AND expires_at IS NOT NULL AND expires_at <= now()
          RETURNING id
        `, [job.tenantId]);
        if (expired.rows.length === 0) return;
        const ids = expired.rows.map((row) => row.id);
        await client.query('DELETE FROM memory_embeddings WHERE tenant_id = $1 AND memory_id = ANY($2::uuid[])', [job.tenantId, ids]);
        await client.query(`
          INSERT INTO memory_lifecycle_events (tenant_id, memory_id, from_state, to_state, reason)
          SELECT $1, id, NULL, 'expired', 'retention_expired' FROM unnest($2::uuid[]) AS id
        `, [job.tenantId, ids]);
      });
      return { complete: true };
    },
  };
}
