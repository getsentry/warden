import { z } from 'zod';

export const PASSIVE_MEMORY_POLICY_VERSION = 'warden-passive-memory-v1';
export const PASSIVE_MEMORY_MODEL_VERSION = 'warden-deterministic-extractor-v1';

const PassiveEvidenceObjectSchema = z.object({
  findingId: z.string().min(1).max(128),
  observationId: z.string().min(1).max(128).optional(),
  reviewId: z.string().min(1).max(128).optional(),
  runId: z.string().min(1).max(128),
  skill: z.string().min(1).max(512),
  title: z.string().min(1).max(512),
  description: z.string().min(1).max(2_000),
  outcome: z.enum(['posted', 'resolved', 'rejected', 'revised']).optional(),
  verdict: z.enum(['false_positive', 'true_positive', 'mitigated']).optional(),
  comment: z.string().max(4_000).optional(),
  pathFamily: z.string().trim().min(1).max(512).optional(),
  source: z.enum(['observation', 'review']).optional(),
  observedAt: z.string().datetime(),
}).strict().superRefine((item, ctx) => {
  if (isReviewEvidence(item)) {
    if (!item.reviewId) ctx.addIssue({ code: 'custom', message: 'review_id_required', path: ['reviewId'] });
    if (!item.verdict) ctx.addIssue({ code: 'custom', message: 'verdict_required', path: ['verdict'] });
    return;
  }
  if (!item.observationId) ctx.addIssue({ code: 'custom', message: 'observation_id_required', path: ['observationId'] });
  if (!item.outcome) ctx.addIssue({ code: 'custom', message: 'outcome_required', path: ['outcome'] });
});
export const PassiveEvidenceSchema = PassiveEvidenceObjectSchema;
export type PassiveEvidence = z.infer<typeof PassiveEvidenceObjectSchema>;

export const PassiveExtractionInputSchema = z.object({
  runId: z.string().min(1).max(128),
  evidence: z.array(PassiveEvidenceSchema).min(1).max(100),
}).strict();
export type PassiveExtractionInput = z.infer<typeof PassiveExtractionInputSchema>;

export const PassiveMemoryProposalSchema = z.object({
  kind: z.enum(['convention', 'confirmed_pattern', 'false_positive', 'review_guidance']),
  content: z.string().trim().min(1).max(4_000),
  evidenceIds: z.array(z.string().min(1).max(128)).min(1).max(100),
  skill: z.string().trim().min(1).max(512).optional(),
  language: z.string().trim().min(1).max(64).optional(),
  pathFamily: z.string().trim().min(1).max(512).optional(),
  confidence: z.number().min(0).max(1),
}).strict();
export type PassiveMemoryProposal = z.infer<typeof PassiveMemoryProposalSchema>;

export interface MemoryEvidenceDecision {
  eligible: boolean;
  supportCount: number;
  contradictionCount: number;
  independentRuns: number;
  policyVersion: string;
}

/** Omitted source is an observation so existing GitHub outcomes keep working. */
export function isReviewEvidence(item: Pick<PassiveEvidence, 'source'>): boolean {
  return item.source === 'review';
}

/** Stable id for a passive evidence row: review id or observation id. */
export function passiveEvidenceId(item: PassiveEvidence): string {
  const id = isReviewEvidence(item) ? item.reviewId : item.observationId;
  if (!id) throw new TypeError('passive_evidence_id');
  return id;
}

/** Directory prefix of a finding path, omitting the basename. */
export function pathFamilyFromLocation(path: string | null | undefined): string | undefined {
  const trimmed = path?.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replaceAll('\\', '/').replace(/\/+$/, '');
  const index = normalized.lastIndexOf('/');
  if (index <= 0) return undefined;
  const family = normalized.slice(0, index).slice(0, 512).trim();
  return family.length > 0 ? family : undefined;
}

function supportsKind(item: PassiveEvidence, kind: PassiveMemoryProposal['kind']): boolean {
  if (isReviewEvidence(item)) {
    if (kind === 'false_positive') return item.verdict === 'false_positive';
    if (kind === 'confirmed_pattern') return item.verdict === 'true_positive';
    if (kind === 'review_guidance') return item.verdict === 'mitigated';
    return false;
  }
  const outcome = item.outcome;
  if (!outcome) return false;
  if (kind === 'false_positive') return outcome === 'rejected';
  if (kind === 'confirmed_pattern') return outcome === 'resolved' || outcome === 'revised';
  return outcome === 'posted' || outcome === 'resolved' || outcome === 'revised';
}

function contradictsKind(item: PassiveEvidence, kind: PassiveMemoryProposal['kind']): boolean {
  if (isReviewEvidence(item)) {
    if (kind === 'false_positive') return item.verdict === 'true_positive';
    if (kind === 'confirmed_pattern') return item.verdict === 'false_positive';
    return false;
  }
  const outcome = item.outcome;
  if (!outcome) return false;
  if (kind === 'false_positive') return outcome === 'posted' || outcome === 'resolved' || outcome === 'revised';
  return outcome === 'rejected';
}

function paraphrase(kind: PassiveMemoryProposal['kind'], title: string): string {
  if (kind === 'false_positive') return `Prior reviews rejected this finding pattern: ${title}`;
  if (kind === 'review_guidance') return `Prior reviews recorded mitigation guidance for this finding pattern: ${title}`;
  return `This repository has repeatedly confirmed this finding pattern: ${title}`;
}

function proposalContent(item: PassiveEvidence, kind: PassiveMemoryProposal['kind']): string {
  const comment = item.comment?.trim() ?? '';
  return comment.length > 0 ? comment : paraphrase(kind, item.title);
}

/** Apply deterministic kind-specific eligibility without accepting model-owned scope or lifecycle. */
export function evaluateMemoryEvidence(
  proposalInput: PassiveMemoryProposal,
  evidenceInput: readonly PassiveEvidence[],
): MemoryEvidenceDecision {
  const proposal = PassiveMemoryProposalSchema.parse(proposalInput);
  const allEvidence = evidenceInput.map((item) => PassiveEvidenceSchema.parse(item));
  const selected = allEvidence.filter((item) => proposal.evidenceIds.includes(passiveEvidenceId(item)));
  if (selected.length !== new Set(proposal.evidenceIds).size) {
    return { eligible: false, supportCount: 0, contradictionCount: 0, independentRuns: 0, policyVersion: PASSIVE_MEMORY_POLICY_VERSION };
  }
  const support = selected.filter((item) => supportsKind(item, proposal.kind));
  const contradictions = selected.filter((item) => contradictsKind(item, proposal.kind));
  const independentRuns = new Set(support.map((item) => item.runId)).size;
  const minimumRuns = proposal.kind === 'false_positive' || proposal.kind === 'review_guidance' ? 1 : 2;
  return {
    eligible: independentRuns >= minimumRuns && contradictions.length === 0,
    supportCount: support.length,
    contradictionCount: contradictions.length,
    independentRuns,
    policyVersion: PASSIVE_MEMORY_POLICY_VERSION,
  };
}

/** Produce a conservative deterministic proposal when no extraction model is configured. */
export function proposePassiveMemory(evidenceInput: readonly PassiveEvidence[]): PassiveMemoryProposal | null {
  const evidence = evidenceInput.map((item) => PassiveEvidenceSchema.parse(item));
  if (evidence.length === 0) return null;
  const falsePositives = evidence.filter((item) => supportsKind(item, 'false_positive'));
  const confirmed = evidence.filter((item) => supportsKind(item, 'confirmed_pattern'));
  const guidance = evidence.filter((item) => isReviewEvidence(item) && supportsKind(item, 'review_guidance'));
  const kind: PassiveMemoryProposal['kind'] | null = falsePositives.length === evidence.length
    ? 'false_positive'
    : confirmed.length > 0
      ? 'confirmed_pattern'
      : guidance.length > 0
        ? 'review_guidance'
        : null;
  if (!kind) return null;
  const selected = kind === 'false_positive'
    ? falsePositives
    : kind === 'confirmed_pattern'
      ? confirmed
      : guidance;
  if (selected.length === 0) return null;
  const first = selected[0];
  if (!first) return null;
  return PassiveMemoryProposalSchema.parse({
    kind,
    content: proposalContent(first, kind),
    evidenceIds: selected.map((item) => passiveEvidenceId(item)),
    skill: first.skill,
    ...(first.pathFamily ? { pathFamily: first.pathFamily } : {}),
    confidence: Math.min(1, 0.5 + new Set(selected.map((item) => item.runId)).size * 0.1),
  });
}
