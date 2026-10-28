import { createHash } from 'node:crypto';
import type { WardenDatabase } from '../db/database.js';
import type { MemoryOperationUsage } from './store.js';
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
  extractionUsage?: MemoryOperationUsage;
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
    if (existing) {
      for (const evidence of stored.rows) {
        await client.query(`
          INSERT INTO memory_evidence (tenant_id, memory_id, finding_id, observation_id, evidence_kind)
          SELECT $1, $2, $3, $4, 'finding_observation'
          WHERE NOT EXISTS (
            SELECT 1 FROM memory_evidence
            WHERE tenant_id = $1 AND memory_id = $2 AND observation_id = $4
          )
        `, [input.tenantId, existing.id, evidence.finding_id, evidence.observation_id]);
      }
      const totals = await client.query<{
        support_count: number;
        contradiction_count: number;
        independent_runs: number;
      }>(`
        SELECT
          count(*) FILTER (WHERE
            ($3::memory_kind = 'false_positive' AND fo.outcome = 'rejected')
            OR ($3::memory_kind = 'confirmed_pattern' AND fo.outcome IN ('resolved', 'revised'))
            OR ($3::memory_kind IN ('convention', 'review_guidance') AND fo.outcome IN ('posted', 'resolved', 'revised'))
          )::integer AS support_count,
          count(*) FILTER (WHERE
            ($3::memory_kind = 'false_positive' AND fo.outcome IN ('posted', 'resolved', 'revised'))
            OR ($3::memory_kind <> 'false_positive' AND fo.outcome = 'rejected')
          )::integer AS contradiction_count,
          count(DISTINCT r.id) FILTER (WHERE
            ($3::memory_kind = 'false_positive' AND fo.outcome = 'rejected')
            OR ($3::memory_kind = 'confirmed_pattern' AND fo.outcome IN ('resolved', 'revised'))
            OR ($3::memory_kind IN ('convention', 'review_guidance') AND fo.outcome IN ('posted', 'resolved', 'revised'))
          )::integer AS independent_runs
        FROM memory_evidence me
        JOIN finding_observations fo ON fo.id = me.observation_id AND fo.tenant_id = me.tenant_id
        JOIN runs r ON r.id = fo.run_id AND r.tenant_id = fo.tenant_id
        WHERE me.tenant_id = $1 AND me.memory_id = $2
      `, [input.tenantId, existing.id, input.proposal.kind]);
      const counts = totals.rows[0];
      if (!counts) return { ...existing, created: false };
      const shouldPromote = existing.lifecycle === 'candidate'
        && policy.autoPromote
        && counts.independent_runs >= policy.minimumIndependentEvidence
        && counts.contradiction_count === 0;
      await client.query(`
        UPDATE memories SET
          lifecycle = CASE WHEN $3 THEN 'active'::memory_lifecycle ELSE lifecycle END,
          support_count = $4, contradiction_count = $5, policy_version = $6,
          version = version + CASE WHEN $3 THEN 1 ELSE 0 END, updated_at = now()
        WHERE tenant_id = $1 AND id = $2
      `, [
        input.tenantId,
        existing.id,
        shouldPromote,
        counts.support_count,
        counts.contradiction_count,
        policy.version,
      ]);
      if (shouldPromote) {
        await client.query(`
          INSERT INTO memory_lifecycle_events (tenant_id, memory_id, from_state, to_state, reason)
          VALUES ($1, $2, 'candidate', 'active', 'passive_policy_promotion')
        `, [input.tenantId, existing.id]);
      }
      return {
        id: existing.id,
        lifecycle: shouldPromote ? 'active' : existing.lifecycle,
        created: false,
      };
    }

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
        extraction_provider, extraction_runtime, extraction_input_tokens,
        extraction_output_tokens, extraction_cost_usd, extraction_cost_basis, observed_at
      ) VALUES (
        $1, $2, $3, $4::memory_kind, $5::memory_lifecycle, 'passive',
        $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23
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
      input.extractionUsage?.provider ?? null,
      input.extractionUsage?.runtime ?? null,
      input.extractionUsage?.inputTokens ?? null,
      input.extractionUsage?.outputTokens ?? null,
      input.extractionUsage?.costUsd ?? null,
      input.extractionUsage?.costBasis ?? null,
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
