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

interface EvidenceRow extends Record<string, unknown> {
  finding_id: string;
  observation_id: string;
  run_id: string;
  skill: string;
  title: string;
  description: string;
  outcome: PassiveEvidence['outcome'];
  observed_at: Date | string;
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
  const result = await database.query<EvidenceRow>(`
    SELECT finding_id, observation_id, run_id, skill, title, description, outcome, observed_at
    FROM (
      SELECT f.id AS finding_id, fo.id AS observation_id, r.id AS run_id,
        se.skill, f.title, f.description, fo.outcome, fo.observed_at
      FROM finding_observations fo
      JOIN findings f ON f.id = fo.finding_id AND f.tenant_id = fo.tenant_id
      JOIN runs r ON r.id = fo.run_id AND r.tenant_id = fo.tenant_id
      JOIN repositories repo ON repo.id = r.repository_id AND repo.tenant_id = r.tenant_id
      JOIN skill_executions se ON se.id = f.skill_execution_id AND se.tenant_id = f.tenant_id
      WHERE fo.tenant_id = $1 AND r.repository_id = $2 AND repo.memory_enabled = true
        AND r.data_profile IN ('findings', 'code')
        AND fo.outcome IN ('posted', 'resolved', 'rejected', 'revised')
      ORDER BY (r.id = $3) DESC, fo.observed_at DESC, fo.id DESC
      LIMIT 100
    ) evidence
    ORDER BY observed_at, observation_id
  `, [tenantId, repositoryId, runId]);
  return result.rows.map((row): PassiveEvidence => ({
    findingId: row.finding_id,
    observationId: row.observation_id,
    runId: row.run_id,
    skill: row.skill,
    title: row.title,
    description: row.description.slice(0, 2_000),
    outcome: row.outcome,
    observedAt: iso(row.observed_at),
  }));
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
          await database.query(`
            INSERT INTO jobs (
              tenant_id, repository_id, type, entity_id, input_version,
              idempotency_key, payload_ref
            ) VALUES ($1, $2, 'memory_embed', $3, 1, $4, $5)
            ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
          `, [
            job.tenantId,
            job.repositoryId,
            persisted.id,
            `memory_embed:${persisted.id}:v1:${options.embedding.provider}:${options.embedding.model}`,
            JSON.stringify({ memoryId: persisted.id }),
          ]);
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
      if (!memory) return { complete: true };
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
