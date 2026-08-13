import { createHash } from 'node:crypto';
import type { WardenDatabase } from '../db/database.js';
import {
  evaluateMemoryEvidence,
  PASSIVE_MEMORY_POLICY_VERSION,
  type PassiveEvidence,
  type PassiveMemoryProposal,
} from './passive.js';

export interface PassivePromotionPolicy {
  autoPromote: boolean;
  minimumIndependentEvidence: number;
  version: string;
}

export const defaultPassivePromotionPolicy: PassivePromotionPolicy = {
  autoPromote: false,
  minimumIndependentEvidence: 3,
  version: PASSIVE_MEMORY_POLICY_VERSION,
};

export interface PersistPassiveMemoryInput {
  tenantId: string;
  repositoryId: string;
  proposal: PassiveMemoryProposal;
  evidence: readonly PassiveEvidence[];
  modelVersion: string;
  extractionCostUsd?: number | null;
  policy?: PassivePromotionPolicy;
}

/** Persist an inactive evidence-backed candidate, reusing exact eligible duplicates transactionally. */
export async function persistPassiveMemoryCandidate(
  database: WardenDatabase,
  input: PersistPassiveMemoryInput,
): Promise<{ id: string; lifecycle: 'candidate' | 'active'; created: boolean } | null> {
  const policy = input.policy ?? defaultPassivePromotionPolicy;
  const decision = evaluateMemoryEvidence(input.proposal, input.evidence);
  if (!decision.eligible) return null;
  const normalized = input.proposal.content.trim();
  const contentHash = createHash('sha256').update(normalized).digest('hex');
  return database.transaction(async (client) => {
    const observationIds = input.proposal.evidenceIds;
    const stored = await client.query<{
      finding_id: string;
      observation_id: string;
      run_id: string;
    }>(`
      SELECT f.id AS finding_id, fo.id AS observation_id, r.id AS run_id
      FROM finding_observations fo
      JOIN findings f ON f.id = fo.finding_id AND f.tenant_id = fo.tenant_id
      JOIN runs r ON r.id = fo.run_id AND r.tenant_id = fo.tenant_id
      WHERE fo.tenant_id = $1 AND r.repository_id = $2 AND fo.id = ANY($3::uuid[])
      FOR SHARE OF fo, f, r
    `, [input.tenantId, input.repositoryId, observationIds]);
    if (stored.rows.length !== new Set(observationIds).size) return null;

    const duplicate = await client.query<{ id: string; lifecycle: 'candidate' | 'active' }>(`
      SELECT id, lifecycle FROM memories
      WHERE tenant_id = $1 AND repository_id = $2 AND kind = $3::memory_kind
        AND content_hash = $4
        AND skill IS NOT DISTINCT FROM $5 AND language IS NOT DISTINCT FROM $6
        AND path_family IS NOT DISTINCT FROM $7
        AND lifecycle IN ('candidate', 'active')
      ORDER BY CASE lifecycle WHEN 'active' THEN 0 ELSE 1 END, created_at
      LIMIT 1 FOR UPDATE
    `, [
      input.tenantId, input.repositoryId, input.proposal.kind, contentHash,
      input.proposal.skill ?? null, input.proposal.language ?? null, input.proposal.pathFamily ?? null,
    ]);
    const existing = duplicate.rows[0];
    if (existing) return { ...existing, created: false };

    const shouldPromote = policy.autoPromote
      && decision.independentRuns >= policy.minimumIndependentEvidence
      && decision.contradictionCount === 0;
    const lifecycle = shouldPromote ? 'active' : 'candidate';
    const observedAt = input.evidence
      .filter((item) => observationIds.includes(item.observationId))
      .map((item) => item.observedAt)
      .sort().at(-1);
    if (!observedAt) return null;
    const inserted = await client.query<{ id: string }>(`
      INSERT INTO memories (
        tenant_id, repository_id, idempotency_key, kind, lifecycle, origin,
        content, content_hash, search_document, skill, language, path_family,
        confidence, support_count, contradiction_count, policy_version, model_version,
        extraction_cost_usd, observed_at
      ) VALUES (
        $1, $2, $3, $4::memory_kind, $5::memory_lifecycle, 'passive',
        $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      )
      ON CONFLICT (tenant_id, idempotency_key) DO UPDATE SET updated_at = memories.updated_at
      RETURNING id
    `, [
      input.tenantId,
      input.repositoryId,
      `passive:${input.repositoryId}:${input.proposal.kind}:${contentHash}`,
      input.proposal.kind,
      lifecycle,
      normalized,
      contentHash,
      [normalized, input.proposal.skill, input.proposal.language, input.proposal.pathFamily].filter(Boolean).join(' '),
      input.proposal.skill ?? null,
      input.proposal.language ?? null,
      input.proposal.pathFamily ?? null,
      input.proposal.confidence,
      decision.supportCount,
      decision.contradictionCount,
      policy.version,
      input.modelVersion,
      input.extractionCostUsd ?? null,
      observedAt,
    ]);
    const memoryId = inserted.rows[0]?.id;
    if (!memoryId) return null;
    await client.query(`
      INSERT INTO memory_lifecycle_events (tenant_id, memory_id, to_state, reason)
      VALUES ($1, $2, $3::memory_lifecycle, $4)
    `, [input.tenantId, memoryId, lifecycle, shouldPromote ? 'passive_policy_promotion' : 'passive_extract']);
    for (const evidence of stored.rows) {
      await client.query(`
        INSERT INTO memory_evidence (tenant_id, memory_id, finding_id, observation_id, evidence_kind)
        SELECT $1, $2, $3, $4, 'finding_observation'
        WHERE NOT EXISTS (
          SELECT 1 FROM memory_evidence
          WHERE tenant_id = $1 AND memory_id = $2 AND observation_id = $4
        )
      `, [input.tenantId, memoryId, evidence.finding_id, evidence.observation_id]);
    }
    return { id: memoryId, lifecycle, created: true };
  });
}

/** Apply a validated duplicate or supersession decision, leaving all state unchanged on uncertainty. */
export async function applyMemorySupersessionDecision(
  database: WardenDatabase,
  input: {
    tenantId: string;
    repositoryId: string;
    candidateId: string;
    decision: 'uncertain' | 'duplicate' | 'supersede';
    targetIds: readonly string[];
  },
): Promise<boolean> {
  if (input.decision === 'uncertain') return false;
  return database.transaction(async (client) => {
    const candidate = await client.query<{ id: string }>(`
      SELECT id FROM memories WHERE tenant_id = $1 AND repository_id = $2
        AND id = $3 AND lifecycle = 'candidate' FOR UPDATE
    `, [input.tenantId, input.repositoryId, input.candidateId]);
    if (!candidate.rows[0]) return false;
    const targets = await client.query<{ id: string }>(`
      SELECT id FROM memories WHERE tenant_id = $1 AND repository_id = $2
        AND id = ANY($3::uuid[]) AND lifecycle = 'active' FOR UPDATE
    `, [input.tenantId, input.repositoryId, input.targetIds]);
    if (targets.rows.length !== new Set(input.targetIds).size) return false;
    if (input.decision === 'duplicate') {
      await client.query(`
        UPDATE memories SET lifecycle = 'archived', archive_reason = 'exact_duplicate',
          version = version + 1, updated_at = now()
        WHERE tenant_id = $1 AND id = $2
      `, [input.tenantId, input.candidateId]);
      return true;
    }
    await client.query(`
      UPDATE memories SET lifecycle = 'active', version = version + 1, updated_at = now()
      WHERE tenant_id = $1 AND id = $2
    `, [input.tenantId, input.candidateId]);
    await client.query(`
      UPDATE memories SET lifecycle = 'superseded', superseded_by_id = $3,
        version = version + 1, updated_at = now()
      WHERE tenant_id = $1 AND id = ANY($2::uuid[])
    `, [input.tenantId, input.targetIds, input.candidateId]);
    return true;
  });
}
