import { createHash } from 'node:crypto';
import type { DatabaseClient, WardenDatabase } from '../db/database.js';
import type { MemoryOperationUsage } from './store.js';
import {
  evaluateMemoryEvidence,
  isReviewEvidence,
  PASSIVE_MEMORY_POLICY_VERSION,
  PassiveEvidenceSchema,
  passiveEvidenceId,
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

interface StoredObservation extends Record<string, unknown> {
  finding_id: string;
  observation_id: string;
  run_id: string;
}

interface StoredReview extends Record<string, unknown> {
  finding_id: string;
  review_id: string;
  run_id: string;
}

async function lockObservations(
  client: DatabaseClient,
  tenantId: string,
  repositoryId: string,
  observationIds: readonly string[],
): Promise<StoredObservation[]> {
  if (observationIds.length === 0) return [];
  const stored = await client.query<StoredObservation>(`
    SELECT f.id AS finding_id, fo.id AS observation_id, r.id AS run_id
    FROM finding_observations fo
    JOIN findings f ON f.id = fo.finding_id AND f.tenant_id = fo.tenant_id
    JOIN runs r ON r.id = fo.run_id AND r.tenant_id = fo.tenant_id
    WHERE fo.tenant_id = $1 AND r.repository_id = $2 AND fo.id = ANY($3::uuid[])
    FOR SHARE OF fo, f, r
  `, [tenantId, repositoryId, observationIds]);
  return stored.rows;
}

async function lockReviews(
  client: DatabaseClient,
  tenantId: string,
  repositoryId: string,
  reviewIds: readonly string[],
): Promise<StoredReview[]> {
  if (reviewIds.length === 0) return [];
  const stored = await client.query<StoredReview>(`
    SELECT f.id AS finding_id, fr.id AS review_id, r.id AS run_id
    FROM finding_reviews fr
    JOIN findings f ON f.id = fr.finding_id AND f.tenant_id = fr.tenant_id
    JOIN runs r ON r.id = fr.run_id AND r.tenant_id = fr.tenant_id
    WHERE fr.tenant_id = $1 AND r.repository_id = $2 AND fr.id = ANY($3::uuid[])
    FOR SHARE OF fr, f, r
  `, [tenantId, repositoryId, reviewIds]);
  return stored.rows;
}

async function attachEvidence(
  client: DatabaseClient,
  tenantId: string,
  memoryId: string,
  observations: readonly StoredObservation[],
  reviews: readonly StoredReview[],
): Promise<void> {
  for (const evidence of observations) {
    await client.query(`
      INSERT INTO memory_evidence (tenant_id, memory_id, finding_id, observation_id, evidence_kind)
      SELECT $1, $2, $3, $4, 'finding_observation'
      WHERE NOT EXISTS (
        SELECT 1 FROM memory_evidence
        WHERE tenant_id = $1 AND memory_id = $2 AND observation_id = $4
      )
    `, [tenantId, memoryId, evidence.finding_id, evidence.observation_id]);
  }
  for (const evidence of reviews) {
    await client.query(`
      INSERT INTO memory_evidence (tenant_id, memory_id, finding_id, review_id, evidence_kind)
      SELECT $1, $2, $3, $4, 'finding_review'
      WHERE NOT EXISTS (
        SELECT 1 FROM memory_evidence
        WHERE tenant_id = $1 AND memory_id = $2 AND review_id = $4
      )
    `, [tenantId, memoryId, evidence.finding_id, evidence.review_id]);
  }
}

async function recountMemory(
  client: DatabaseClient,
  tenantId: string,
  memoryId: string,
  kind: PassiveMemoryProposal['kind'],
): Promise<{ support_count: number; contradiction_count: number; independent_runs: number } | undefined> {
  const totals = await client.query<{
    support_count: number;
    contradiction_count: number;
    independent_runs: number;
  }>(`
    SELECT
      count(*) FILTER (WHERE
        (outcome IS NOT NULL AND (
          ($3::memory_kind = 'false_positive' AND outcome = 'rejected')
          OR ($3::memory_kind = 'confirmed_pattern' AND outcome IN ('resolved', 'revised'))
          OR ($3::memory_kind IN ('convention', 'review_guidance') AND outcome IN ('posted', 'resolved', 'revised'))
        ))
        OR (verdict IS NOT NULL AND (
          ($3::memory_kind = 'false_positive' AND verdict = 'false_positive')
          OR ($3::memory_kind = 'confirmed_pattern' AND verdict = 'true_positive')
          OR ($3::memory_kind = 'review_guidance' AND verdict = 'mitigated')
        ))
      )::integer AS support_count,
      count(*) FILTER (WHERE
        (outcome IS NOT NULL AND (
          ($3::memory_kind = 'false_positive' AND outcome IN ('posted', 'resolved', 'revised'))
          OR ($3::memory_kind <> 'false_positive' AND outcome = 'rejected')
        ))
        OR (verdict IS NOT NULL AND (
          ($3::memory_kind = 'false_positive' AND verdict = 'true_positive')
          OR ($3::memory_kind = 'confirmed_pattern' AND verdict = 'false_positive')
        ))
      )::integer AS contradiction_count,
      count(DISTINCT run_id) FILTER (WHERE
        (outcome IS NOT NULL AND (
          ($3::memory_kind = 'false_positive' AND outcome = 'rejected')
          OR ($3::memory_kind = 'confirmed_pattern' AND outcome IN ('resolved', 'revised'))
          OR ($3::memory_kind IN ('convention', 'review_guidance') AND outcome IN ('posted', 'resolved', 'revised'))
        ))
        OR (verdict IS NOT NULL AND (
          ($3::memory_kind = 'false_positive' AND verdict = 'false_positive')
          OR ($3::memory_kind = 'confirmed_pattern' AND verdict = 'true_positive')
          OR ($3::memory_kind = 'review_guidance' AND verdict = 'mitigated')
        ))
      )::integer AS independent_runs
    FROM (
      SELECT observation_run.id AS run_id, observation.outcome AS outcome, NULL::text AS verdict
      FROM memory_evidence me
      JOIN finding_observations observation ON observation.id = me.observation_id AND observation.tenant_id = me.tenant_id
      JOIN runs observation_run ON observation_run.id = observation.run_id AND observation_run.tenant_id = observation.tenant_id
      WHERE me.tenant_id = $1 AND me.memory_id = $2 AND me.observation_id IS NOT NULL
      UNION ALL
      SELECT review_run.id AS run_id, NULL::text AS outcome, review.verdict AS verdict
      FROM memory_evidence me
      JOIN finding_reviews review ON review.id = me.review_id AND review.tenant_id = me.tenant_id
      JOIN runs review_run ON review_run.id = review.run_id AND review_run.tenant_id = review.tenant_id
      WHERE me.tenant_id = $1 AND me.memory_id = $2 AND me.review_id IS NOT NULL
    ) evidence
  `, [tenantId, memoryId, kind]);
  return totals.rows[0];
}

async function recountRelatedReviewMemories(
  client: DatabaseClient,
  input: {
    tenantId: string;
    repositoryId: string;
    memoryId?: string;
    reviewIds: readonly string[];
    policyVersion: string;
  },
): Promise<void> {
  if (input.reviewIds.length === 0) return;
  const related = await client.query<{ id: string; kind: PassiveMemoryProposal['kind'] }>(`
    SELECT m.id, m.kind
    FROM memories m
    WHERE m.tenant_id = $1 AND m.repository_id = $2
      AND m.lifecycle IN ('candidate', 'active')
      AND ($3::uuid IS NULL OR m.id <> $3)
      AND EXISTS (
        SELECT 1 FROM memory_evidence me
        WHERE me.tenant_id = m.tenant_id AND me.memory_id = m.id AND me.review_id = ANY($4::uuid[])
      )
    FOR UPDATE OF m
  `, [input.tenantId, input.repositoryId, input.memoryId ?? null, input.reviewIds]);
  for (const memory of related.rows) {
    const counts = await recountMemory(client, input.tenantId, memory.id, memory.kind);
    if (!counts) continue;
    await client.query(`
      UPDATE memories SET
        support_count = $3, contradiction_count = $4, policy_version = $5, updated_at = now()
      WHERE tenant_id = $1 AND id = $2
    `, [input.tenantId, memory.id, counts.support_count, counts.contradiction_count, input.policyVersion]);
  }
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
  const parsedEvidence = input.evidence.map((item) => PassiveEvidenceSchema.parse(item));
  const selected = parsedEvidence.filter((item) => input.proposal.evidenceIds.includes(passiveEvidenceId(item)));
  const observationIds = [...new Set(
    selected.filter((item) => !isReviewEvidence(item)).map((item) => item.observationId!),
  )];
  const reviewIds = [...new Set(
    selected.filter((item) => isReviewEvidence(item)).map((item) => item.reviewId!),
  )];
  return database.transaction(async (client) => {
    const observations = await lockObservations(client, input.tenantId, input.repositoryId, observationIds);
    const reviews = await lockReviews(client, input.tenantId, input.repositoryId, reviewIds);
    if (observations.length !== observationIds.length || reviews.length !== reviewIds.length) return null;

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
      await attachEvidence(client, input.tenantId, existing.id, observations, reviews);
      const counts = await recountMemory(client, input.tenantId, existing.id, input.proposal.kind);
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
      await recountRelatedReviewMemories(client, {
        tenantId: input.tenantId,
        repositoryId: input.repositoryId,
        memoryId: existing.id,
        reviewIds,
        policyVersion: policy.version,
      });
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
    const observedAt = selected.map((item) => item.observedAt).sort().at(-1);
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
    await attachEvidence(client, input.tenantId, memoryId, observations, reviews);
    await recountRelatedReviewMemories(client, {
      tenantId: input.tenantId,
      repositoryId: input.repositoryId,
      memoryId,
      reviewIds,
      policyVersion: policy.version,
    });
    return { id: memoryId, lifecycle, created: true };
  });
}

/** Recount memories already linked to these reviews so a relabel can contradict earlier candidates. */
export async function refreshReviewEvidenceCounts(
  database: WardenDatabase,
  input: {
    tenantId: string;
    repositoryId: string;
    reviewIds: readonly string[];
    policyVersion?: string;
  },
): Promise<void> {
  const reviewIds = [...new Set(input.reviewIds.filter(Boolean))];
  if (reviewIds.length === 0) return;
  await database.transaction(async (client) => {
    const reviews = await lockReviews(client, input.tenantId, input.repositoryId, reviewIds);
    if (reviews.length === 0) return;
    await recountRelatedReviewMemories(client, {
      tenantId: input.tenantId,
      repositoryId: input.repositoryId,
      reviewIds: reviews.map((item) => item.review_id),
      policyVersion: input.policyVersion ?? defaultPassivePromotionPolicy.version,
    });
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
