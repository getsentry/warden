import { createHash } from 'node:crypto';
import type {
  MemoryRecallRequest,
  MemoryRecallResponse,
  MemoryDetailResponse,
  MemoryRecord,
  RepositoryIdentity,
} from '@sentry/warden-service-api';
import { canAccessRepository, requireServiceContext } from '../context.js';
import type { ServiceContext } from '../context.js';
import type { DatabaseClient, WardenDatabase } from '../db/database.js';
import { z } from 'zod';

export interface CreateMemoryInput {
  repository: RepositoryIdentity;
  kind: MemoryRecord['kind'];
  content: string;
  skill?: string;
  language?: string;
  pathFamily?: string;
  expiresAt?: string;
  idempotencyKey: string;
}

interface RepositoryRow extends Record<string, unknown> {
  id: string;
  provider: RepositoryIdentity['provider'];
  owner: string;
  name: string;
  full_name: string;
  memory_enabled: boolean;
}

interface MemoryRow extends Record<string, unknown> {
  id: string;
  version: number;
  kind: MemoryRecord['kind'];
  lifecycle: MemoryRecord['lifecycle'];
  content: string;
  skill: string | null;
  language: string | null;
  path_family: string | null;
  created_at: Date | string;
  observed_at: Date | string;
  expires_at: Date | string | null;
  provider: RepositoryIdentity['provider'];
  owner: string;
  name: string;
  full_name: string;
  content_hash?: string;
}

export interface MemoryOperationUsage {
  provider?: string;
  model?: string;
  runtime?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number | null;
  costBasis?: 'reported' | 'estimated' | 'unknown';
}

export interface MemoryEmbeddingProvider {
  provider: string;
  model: string;
  dimensions: number;
  embed(query: string): Promise<{ vector: number[]; usage?: MemoryOperationUsage }>;
}

export interface MemoryRelevanceCandidate {
  id: string;
  kind: MemoryRecord['kind'];
  content: string;
  skill?: string;
  language?: string;
  pathFamily?: string;
}

export interface MemoryRelevanceClassifier {
  classify(input: {
    skills: readonly string[];
    languages: readonly string[];
    paths: readonly string[];
    candidates: readonly MemoryRelevanceCandidate[];
  }): Promise<{ admittedIds: string[]; uncertain?: boolean; usage?: MemoryOperationUsage }>;
}

export interface RecallMemoryOptions {
  embedding?: MemoryEmbeddingProvider;
  relevance?: MemoryRelevanceClassifier;
}

const MemoryOperationUsageSchema = z.object({
  provider: z.string().trim().min(1).max(128).optional(),
  model: z.string().trim().min(1).max(255).optional(),
  runtime: z.string().trim().min(1).max(128).optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  costUsd: z.number().finite().nonnegative().nullable().optional(),
  costBasis: z.enum(['reported', 'estimated', 'unknown']).optional(),
}).strict();

function parseOperationUsage(value: unknown): MemoryOperationUsage | undefined {
  if (value === undefined) return undefined;
  return MemoryOperationUsageSchema.parse(value);
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapMemory(row: MemoryRow): MemoryRecord {
  return {
    id: row.id,
    version: row.version,
    repository: { provider: row.provider, owner: row.owner, name: row.name, fullName: row.full_name },
    kind: row.kind,
    lifecycle: row.lifecycle,
    content: row.content,
    ...(row.skill ? { skill: row.skill } : {}),
    ...(row.language ? { language: row.language } : {}),
    ...(row.path_family ? { pathFamily: row.path_family } : {}),
    createdAt: iso(row.created_at),
    observedAt: iso(row.observed_at),
    ...(row.expires_at ? { expiresAt: iso(row.expires_at) } : {}),
  };
}

function mapRecalledMemory(row: MemoryRow): MemoryRecallResponse['memories'][number] {
  return {
    id: row.id,
    version: row.version,
    kind: row.kind,
    content: row.content,
    ...(row.skill ? { skill: row.skill } : {}),
    ...(row.language ? { language: row.language } : {}),
    ...(row.path_family ? { pathFamily: row.path_family } : {}),
  };
}

async function loadRecallBatch(
  client: DatabaseClient,
  context: ServiceContext,
  repositoryId: string,
  clientRecallId: string,
): Promise<MemoryRecallResponse | null> {
  const batch = await client.query<{ id: string }>(`
    SELECT id FROM memory_recall_batches
    WHERE tenant_id = $1 AND repository_id = $2 AND client_recall_id = $3
    LIMIT 1
  `, [context.tenantId, repositoryId, clientRecallId]);
  const batchId = batch.rows[0]?.id;
  if (!batchId) return null;
  const recalled = await client.query<MemoryRow>(`
    SELECT m.*, repo.provider, repo.owner, repo.name, repo.full_name
    FROM memory_recalls mr
    JOIN memories m ON m.id = mr.memory_id AND m.tenant_id = mr.tenant_id
    JOIN repositories repo ON repo.id = m.repository_id AND repo.tenant_id = m.tenant_id
    WHERE mr.tenant_id = $1 AND mr.batch_id = $2
    ORDER BY mr.rank, mr.id
  `, [context.tenantId, batchId]);
  return {
    protocolVersion: 1,
    clientRecallId,
    memories: recalled.rows.map(mapRecalledMemory),
  };
}

async function resolveRepository(
  client: DatabaseClient,
  context: ServiceContext,
  identity: RepositoryIdentity,
): Promise<RepositoryRow | null> {
  if (!canAccessRepository(context, identity.fullName)) return null;
  const result = await client.query<RepositoryRow>(`
    SELECT id, provider, owner, name, full_name, memory_enabled
    FROM repositories
    WHERE tenant_id = $1 AND provider = $2 AND owner = $3 AND name = $4
    LIMIT 1
  `, [context.tenantId, identity.provider, identity.owner, identity.name]);
  return result.rows[0] ?? null;
}

/** Create an active administrator-owned memory and immutable lifecycle event. */
export async function createMemory(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  input: CreateMemoryInput,
): Promise<MemoryRecord | null> {
  const context = requireServiceContext(contextInput);
  return database.transaction(async (client) => {
    const repository = await resolveRepository(client, context, input.repository);
    if (!repository) return null;
    const normalized = input.content.trim();
    const contentHash = createHash('sha256').update(normalized).digest('hex');
    const inserted = await client.query<{ id: string; created: boolean }>(`
      INSERT INTO memories (
        tenant_id, repository_id, idempotency_key, kind, lifecycle, origin, content,
        content_hash, search_document, skill, language, path_family, observed_at, expires_at
      ) VALUES ($1, $2, $3, $4::memory_kind, 'active', 'admin', $5, $6, $7, $8, $9, $10, now(), $11)
      ON CONFLICT (tenant_id, idempotency_key) DO UPDATE SET updated_at = memories.updated_at
      WHERE memories.repository_id = EXCLUDED.repository_id
        AND memories.kind = EXCLUDED.kind
        AND memories.content_hash = EXCLUDED.content_hash
        AND memories.skill IS NOT DISTINCT FROM EXCLUDED.skill
        AND memories.language IS NOT DISTINCT FROM EXCLUDED.language
        AND memories.path_family IS NOT DISTINCT FROM EXCLUDED.path_family
        AND memories.expires_at IS NOT DISTINCT FROM EXCLUDED.expires_at
      RETURNING id, (xmax = 0) AS created
    `, [
      context.tenantId,
      repository.id,
      input.idempotencyKey,
      input.kind,
      normalized,
      contentHash,
      [normalized, input.skill, input.language, input.pathFamily].filter(Boolean).join(' '),
      input.skill ?? null,
      input.language ?? null,
      input.pathFamily ?? null,
      input.expiresAt ?? null,
    ]);
    const result = inserted.rows[0];
    if (!result) throw new MemoryIdempotencyConflictError();
    const { id } = result;
    if (result.created) {
      await client.query(`
        INSERT INTO memory_lifecycle_events (tenant_id, memory_id, to_state, actor_token_id, reason)
        VALUES ($1, $2, 'active', $3, 'admin_create')
      `, [context.tenantId, id, context.tokenId]);
    }
    const loaded = await client.query<MemoryRow>(`
      SELECT m.*, repo.provider, repo.owner, repo.name, repo.full_name
      FROM memories m JOIN repositories repo ON repo.id = m.repository_id AND repo.tenant_id = m.tenant_id
      WHERE m.tenant_id = $1 AND m.id = $2
    `, [context.tenantId, id]);
    return loaded.rows[0] ? mapMemory(loaded.rows[0]) : null;
  });
}

export class MemoryIdempotencyConflictError extends Error {
  constructor() {
    super('memory_idempotency_conflict');
    this.name = 'MemoryIdempotencyConflictError';
  }
}

/** List memory records inside authenticated tenant and optional repository authority. */
export async function listMemories(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  lifecycle?: MemoryRecord['lifecycle'],
): Promise<MemoryRecord[]> {
  const context = requireServiceContext(contextInput);
  const values: unknown[] = [context.tenantId];
  const conditions = ['m.tenant_id = $1'];
  if (lifecycle) {
    values.push(lifecycle);
    conditions.push(`m.lifecycle = $${values.length}::memory_lifecycle`);
  }
  if (context.repositoryAllowlist) {
    values.push(context.repositoryAllowlist);
    conditions.push(`repo.full_name = ANY($${values.length}::text[])`);
  }
  const result = await database.query<MemoryRow>(`
    SELECT m.*, repo.provider, repo.owner, repo.name, repo.full_name
    FROM memories m JOIN repositories repo ON repo.id = m.repository_id AND repo.tenant_id = m.tenant_id
    WHERE ${conditions.join(' AND ')} ORDER BY m.updated_at DESC, m.id
  `, values);
  return result.rows.map(mapMemory);
}

/** Load one memory through tenant and repository authorization predicates. */
export async function getMemory(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  memoryId: string,
): Promise<MemoryRecord | null> {
  const context = requireServiceContext(contextInput);
  const values: unknown[] = [context.tenantId, memoryId];
  if (context.repositoryAllowlist) values.push(context.repositoryAllowlist);
  const result = await database.query<MemoryRow>(`
    SELECT m.*, repo.provider, repo.owner, repo.name, repo.full_name
    FROM memories m JOIN repositories repo ON repo.id = m.repository_id AND repo.tenant_id = m.tenant_id
    WHERE m.tenant_id = $1 AND m.id = $2
      ${context.repositoryAllowlist ? 'AND repo.full_name = ANY($3::text[])' : ''}
    LIMIT 1
  `, values);
  return result.rows[0] ? mapMemory(result.rows[0]) : null;
}

/** Load one authorized memory with immutable evidence and lifecycle history. */
export async function getMemoryDetail(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  memoryId: string,
): Promise<MemoryDetailResponse | null> {
  const context = requireServiceContext(contextInput);
  const memory = await getMemory(database, context, memoryId);
  if (!memory) return null;
  const [evidence, lifecycle] = await Promise.all([
    database.query<{
      evidence_kind: string;
      finding_id: string | null;
      observation_id: string | null;
      created_at: Date | string;
    }>(`
      SELECT evidence_kind, finding_id, observation_id, created_at
      FROM memory_evidence
      WHERE tenant_id = $1 AND memory_id = $2
      ORDER BY created_at, evidence_kind
    `, [context.tenantId, memoryId]),
    database.query<{
      from_state: MemoryRecord['lifecycle'] | null;
      to_state: MemoryRecord['lifecycle'];
      reason: string | null;
      created_at: Date | string;
    }>(`
      SELECT from_state, to_state, reason, created_at
      FROM memory_lifecycle_events
      WHERE tenant_id = $1 AND memory_id = $2
      ORDER BY created_at, id
    `, [context.tenantId, memoryId]),
  ]);
  return {
    memory,
    evidence: evidence.rows.map((row) => ({
      kind: row.evidence_kind,
      ...(row.finding_id ? { findingId: row.finding_id } : {}),
      ...(row.observation_id ? { observationId: row.observation_id } : {}),
      createdAt: iso(row.created_at),
    })),
    lifecycle: lifecycle.rows.map((row) => ({
      ...(row.from_state ? { from: row.from_state } : {}),
      to: row.to_state,
      ...(row.reason ? { reason: row.reason } : {}),
      createdAt: iso(row.created_at),
    })),
  };
}

/** Transition one authorized memory and append its lifecycle audit row atomically. */
export async function transitionMemory(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  memoryId: string,
  lifecycle: 'active' | 'archived',
  reason?: string,
): Promise<MemoryRecord | null> {
  const context = requireServiceContext(contextInput);
  return database.transaction(async (client) => {
    const values: unknown[] = [context.tenantId, memoryId];
    const allowlist = context.repositoryAllowlist;
    if (allowlist) values.push(allowlist);
    const prior = await client.query<MemoryRow>(`
      SELECT m.*, repo.provider, repo.owner, repo.name, repo.full_name
      FROM memories m JOIN repositories repo ON repo.id = m.repository_id AND repo.tenant_id = m.tenant_id
      WHERE m.tenant_id = $1 AND m.id = $2
        ${allowlist ? `AND repo.full_name = ANY($3::text[])` : ''}
      FOR UPDATE
    `, values);
    const current = prior.rows[0];
    if (!current) return null;
    await client.query(`
      UPDATE memories SET lifecycle = $3::memory_lifecycle, version = version + 1,
        archive_reason = CASE WHEN $3 = 'archived' THEN $4 ELSE NULL END, updated_at = now()
      WHERE tenant_id = $1 AND id = $2
    `, [context.tenantId, memoryId, lifecycle, reason ?? null]);
    await client.query(`
      INSERT INTO memory_lifecycle_events (
        tenant_id, memory_id, from_state, to_state, actor_token_id, reason
      ) VALUES ($1, $2, $3::memory_lifecycle, $4::memory_lifecycle, $5, $6)
    `, [context.tenantId, memoryId, current.lifecycle, lifecycle, context.tokenId, reason ?? null]);
    const loaded = await client.query<MemoryRow>(`
      SELECT m.*, repo.provider, repo.owner, repo.name, repo.full_name
      FROM memories m JOIN repositories repo ON repo.id = m.repository_id AND repo.tenant_id = m.tenant_id
      WHERE m.tenant_id = $1 AND m.id = $2
    `, [context.tenantId, memoryId]);
    return loaded.rows[0] ? mapMemory(loaded.rows[0]) : null;
  });
}

/** Record immutable administrator feedback and conservatively deactivate contradicted memory. */
export async function recordMemoryFeedback(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  memoryId: string,
  outcome: 'support' | 'contradict' | 'review',
  reason?: string,
): Promise<MemoryRecord | null> {
  const context = requireServiceContext(contextInput);
  return database.transaction(async (client) => {
    const values: unknown[] = [context.tenantId, memoryId];
    if (context.repositoryAllowlist) values.push(context.repositoryAllowlist);
    const loaded = await client.query<MemoryRow>(`
      SELECT m.*, repo.provider, repo.owner, repo.name, repo.full_name
      FROM memories m JOIN repositories repo ON repo.id = m.repository_id AND repo.tenant_id = m.tenant_id
      WHERE m.tenant_id = $1 AND m.id = $2
        ${context.repositoryAllowlist ? 'AND repo.full_name = ANY($3::text[])' : ''}
      FOR UPDATE OF m
    `, values);
    const current = loaded.rows[0];
    if (!current) return null;
    await client.query(`
      INSERT INTO memory_feedback (tenant_id, memory_id, actor_token_id, outcome, reason)
      VALUES ($1, $2, $3, $4, $5)
    `, [context.tenantId, memoryId, context.tokenId, outcome, reason ?? null]);
    const nextLifecycle = outcome === 'contradict' && current.lifecycle === 'active' ? 'candidate' : current.lifecycle;
    await client.query(`
      UPDATE memories SET
        support_count = support_count + CASE WHEN $3 = 'support' THEN 1 ELSE 0 END,
        contradiction_count = contradiction_count + CASE WHEN $3 = 'contradict' THEN 1 ELSE 0 END,
        lifecycle = $4::memory_lifecycle,
        version = version + CASE WHEN lifecycle <> $4::memory_lifecycle THEN 1 ELSE 0 END,
        updated_at = now()
      WHERE tenant_id = $1 AND id = $2
    `, [context.tenantId, memoryId, outcome, nextLifecycle]);
    if (nextLifecycle !== current.lifecycle) {
      await client.query(`
        INSERT INTO memory_lifecycle_events (tenant_id, memory_id, from_state, to_state, actor_token_id, reason)
        VALUES ($1, $2, $3::memory_lifecycle, $4::memory_lifecycle, $5, $6)
      `, [context.tenantId, memoryId, current.lifecycle, nextLifecycle, context.tokenId, reason ?? 'feedback_contradiction']);
    }
    const updated = await client.query<MemoryRow>(`
      SELECT m.*, repo.provider, repo.owner, repo.name, repo.full_name
      FROM memories m JOIN repositories repo ON repo.id = m.repository_id AND repo.tenant_id = m.tenant_id
      WHERE m.tenant_id = $1 AND m.id = $2
    `, [context.tenantId, memoryId]);
    return updated.rows[0] ? mapMemory(updated.rows[0]) : null;
  });
}

/** Recall at most five active repository memories within a fixed 8,000-character budget. */
export async function recallMemories(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  request: MemoryRecallRequest,
  options: RecallMemoryOptions = {},
): Promise<MemoryRecallResponse> {
  const context = requireServiceContext(contextInput);
  return database.transaction(async (client) => {
    const repository = await resolveRepository(client, context, request.repository);
    if (!repository?.memory_enabled) {
      return { protocolVersion: 1, clientRecallId: request.clientRecallId, memories: [] };
    }
    const existing = await loadRecallBatch(client, context, repository.id, request.clientRecallId);
    if (existing) return existing;

    const startedAt = Date.now();
    const query = [...request.skills, ...request.languages, ...request.paths.map((path) => path.split('/')[0] ?? path)]
      .filter(Boolean)
      .map((term) => `"${term.replaceAll('"', '')}"`)
      .join(' OR ')
      .slice(0, 4_000);
    const pathFamilies = [...new Set(request.paths.map((path) => path.split('/')[0]).filter((path) => path !== undefined))];
    const lexical = await client.query<MemoryRow>(`
      SELECT m.*, repo.provider, repo.owner, repo.name, repo.full_name,
        ts_rank_cd(to_tsvector('simple', m.search_document), websearch_to_tsquery('simple', $3)) AS rank
      FROM memories m JOIN repositories repo ON repo.id = m.repository_id AND repo.tenant_id = m.tenant_id
      WHERE m.tenant_id = $1 AND m.repository_id = $2
        AND m.lifecycle = 'active'
        AND (m.expires_at IS NULL OR m.expires_at > now())
        AND (
          (m.skill IS NULL AND m.language IS NULL AND m.path_family IS NULL)
          OR m.skill = ANY($4::text[])
          OR m.language = ANY($5::text[])
          OR m.path_family = ANY($6::text[])
        )
        AND ($3 = '' OR to_tsvector('simple', m.search_document) @@ websearch_to_tsquery('simple', $3))
      ORDER BY rank DESC, m.updated_at DESC, m.id
      LIMIT 20
    `, [context.tenantId, repository.id, query, request.skills, request.languages, pathFamilies]);
    let rankedRows = lexical.rows;
    let embeddingUsage: MemoryOperationUsage | undefined;
    if (options.embedding && query) {
      try {
        const embedded = await options.embedding.embed(query);
        if (embedded.vector.length !== options.embedding.dimensions
          || embedded.vector.some((value) => !Number.isFinite(value))) {
          throw new TypeError('invalid_memory_embedding');
        }
        embeddingUsage = parseOperationUsage(embedded.usage);
        await client.query('SAVEPOINT memory_vector_recall');
        let vectorRows: MemoryRow[] = [];
        try {
          const vector = `[${embedded.vector.join(',')}]`;
          const vectorResult = await client.query<MemoryRow>(`
            SELECT m.*, repo.provider, repo.owner, repo.name, repo.full_name,
              1 - (me.embedding_vector <=> $7::vector(1536)) AS rank
            FROM memory_embeddings me
            JOIN memories m ON m.id = me.memory_id AND m.tenant_id = me.tenant_id
            JOIN repositories repo ON repo.id = m.repository_id AND repo.tenant_id = m.tenant_id
            WHERE m.tenant_id = $1 AND m.repository_id = $2
              AND m.lifecycle = 'active' AND (m.expires_at IS NULL OR m.expires_at > now())
              AND (
                (m.skill IS NULL AND m.language IS NULL AND m.path_family IS NULL)
                OR m.skill = ANY($4::text[])
                OR m.language = ANY($5::text[])
                OR m.path_family = ANY($6::text[])
              )
              AND me.provider = $8 AND me.model = $9 AND me.dimensions = $10
              AND me.content_hash = m.content_hash
              AND me.embedding_vector IS NOT NULL
            ORDER BY me.embedding_vector <=> $7::vector(1536), m.updated_at DESC, m.id
            LIMIT 20
          `, [
            context.tenantId, repository.id, query, request.skills, request.languages,
            pathFamilies, vector, options.embedding.provider, options.embedding.model,
            options.embedding.dimensions,
          ]);
          vectorRows = vectorResult.rows;
          await client.query('RELEASE SAVEPOINT memory_vector_recall');
        } catch {
          await client.query('ROLLBACK TO SAVEPOINT memory_vector_recall');
        }
        const byId = new Map<string, { row: MemoryRow; score: number }>();
        for (const [index, row] of lexical.rows.entries()) {
          byId.set(row.id, { row, score: 1 / (60 + index + 1) });
        }
        for (const [index, row] of vectorRows.entries()) {
          const current = byId.get(row.id);
          byId.set(row.id, { row, score: (current?.score ?? 0) + 1 / (60 + index + 1) });
        }
        rankedRows = [...byId.values()].sort((left, right) => right.score - left.score).map((item) => item.row).slice(0, 20);
        await client.query(`
          INSERT INTO jobs (tenant_id, repository_id, type, entity_id, input_version, idempotency_key, payload_ref)
          SELECT m.tenant_id, m.repository_id, 'memory_embed', m.id, m.version,
            'memory_embed:' || m.id || ':v' || m.version || ':' || $3 || ':' || $4,
            jsonb_build_object('memoryId', m.id)
          FROM memories m
          LEFT JOIN memory_embeddings me ON me.memory_id = m.id AND me.tenant_id = m.tenant_id
            AND me.provider = $3 AND me.model = $4 AND me.dimensions = $5
            AND me.content_hash = m.content_hash AND me.embedding_vector IS NOT NULL
          WHERE m.tenant_id = $1 AND m.repository_id = $2 AND m.lifecycle = 'active' AND me.memory_id IS NULL
          ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
        `, [context.tenantId, repository.id, options.embedding.provider, options.embedding.model, options.embedding.dimensions]);
      } catch {
        rankedRows = lexical.rows;
        embeddingUsage = undefined;
      }
    }

    let relevanceUsage: MemoryOperationUsage | undefined;
    if (options.relevance && rankedRows.length > 0) {
      try {
        const classified = await options.relevance.classify({
          skills: request.skills,
          languages: request.languages,
          paths: request.paths,
          candidates: rankedRows.map((row) => ({
            id: row.id,
            kind: row.kind,
            content: row.content,
            ...(row.skill ? { skill: row.skill } : {}),
            ...(row.language ? { language: row.language } : {}),
            ...(row.path_family ? { pathFamily: row.path_family } : {}),
          })),
        });
        relevanceUsage = parseOperationUsage(classified.usage);
        if (classified.uncertain) rankedRows = [];
        else {
          const admitted = new Set(classified.admittedIds.slice(0, 5));
          if ([...admitted].some((id) => !rankedRows.some((row) => row.id === id))) rankedRows = [];
          else rankedRows = rankedRows.filter((row) => admitted.has(row.id));
        }
      } catch {
        rankedRows = [];
        relevanceUsage = undefined;
      }
    }
    const admittedRows: MemoryRow[] = [];
    let characters = 0;
    for (const row of rankedRows) {
      if (admittedRows.length >= 5 || characters + row.content.length > 8_000) continue;
      admittedRows.push(row);
      characters += row.content.length;
    }

    const inserted = await client.query<{ id: string }>(`
      INSERT INTO memory_recall_batches (
        tenant_id, repository_id, client_recall_id, memory_count, duration_ms,
        provider, model, runtime, input_tokens, output_tokens, cost_usd, cost_basis
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::cost_basis)
      ON CONFLICT (tenant_id, client_recall_id) DO NOTHING
      RETURNING id
    `, [
      context.tenantId, repository.id, request.clientRecallId, admittedRows.length, Date.now() - startedAt,
      relevanceUsage?.provider ?? embeddingUsage?.provider ?? null,
      relevanceUsage?.model ?? embeddingUsage?.model ?? null,
      relevanceUsage?.runtime ?? embeddingUsage?.runtime ?? null,
      (relevanceUsage?.inputTokens ?? 0) + (embeddingUsage?.inputTokens ?? 0) || null,
      (relevanceUsage?.outputTokens ?? 0) + (embeddingUsage?.outputTokens ?? 0) || null,
      relevanceUsage?.costUsd === undefined && embeddingUsage?.costUsd === undefined
        ? null
        : (relevanceUsage?.costUsd ?? 0) + (embeddingUsage?.costUsd ?? 0),
      relevanceUsage?.costBasis ?? embeddingUsage?.costBasis ?? null,
    ]);
    const batchId = inserted.rows[0]?.id;
    if (!batchId) {
      const concurrent = await loadRecallBatch(client, context, repository.id, request.clientRecallId);
      if (concurrent) return concurrent;
      throw new Error('memory_recall_persistence_failed');
    }
    for (const [index, row] of admittedRows.entries()) {
      await client.query(`
        INSERT INTO memory_recalls (
          tenant_id, repository_id, batch_id, memory_id, lifecycle_version, rank, duration_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (batch_id, memory_id) DO NOTHING
      `, [context.tenantId, repository.id, batchId, row.id, row.version, index + 1, Date.now() - startedAt]);
    }
    return {
      protocolVersion: 1,
      clientRecallId: request.clientRecallId,
      memories: admittedRows.map(mapRecalledMemory),
    };
  });
}
