import { z } from 'zod';

export const PASSIVE_MEMORY_POLICY_VERSION = 'warden-passive-memory-v1';
export const PASSIVE_MEMORY_MODEL_VERSION = 'warden-deterministic-extractor-v1';

const PassiveEvidenceSchema = z.object({
  findingId: z.string().min(1).max(128),
  observationId: z.string().min(1).max(128),
  runId: z.string().min(1).max(128),
  skill: z.string().min(1).max(512),
  title: z.string().min(1).max(512),
  description: z.string().min(1).max(2_000),
  outcome: z.enum(['posted', 'resolved', 'rejected', 'revised']),
  observedAt: z.string().datetime(),
}).strict();
export type PassiveEvidence = z.infer<typeof PassiveEvidenceSchema>;

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

/** Apply deterministic kind-specific eligibility without accepting model-owned scope or lifecycle. */
export function evaluateMemoryEvidence(
  proposalInput: PassiveMemoryProposal,
  evidenceInput: readonly PassiveEvidence[],
): MemoryEvidenceDecision {
  const proposal = PassiveMemoryProposalSchema.parse(proposalInput);
  const allEvidence = evidenceInput.map((item) => PassiveEvidenceSchema.parse(item));
  const selected = allEvidence.filter((item) => proposal.evidenceIds.includes(item.observationId));
  if (selected.length !== new Set(proposal.evidenceIds).size) {
    return { eligible: false, supportCount: 0, contradictionCount: 0, independentRuns: 0, policyVersion: PASSIVE_MEMORY_POLICY_VERSION };
  }
  const supportingOutcomes = proposal.kind === 'false_positive'
    ? new Set(['rejected'])
    : proposal.kind === 'confirmed_pattern'
      ? new Set(['resolved', 'revised'])
      : new Set(['posted', 'resolved', 'revised']);
  const contradictionOutcomes = proposal.kind === 'false_positive'
    ? new Set(['posted', 'resolved', 'revised'])
    : new Set(['rejected']);
  const support = selected.filter((item) => supportingOutcomes.has(item.outcome));
  const contradictions = selected.filter((item) => contradictionOutcomes.has(item.outcome));
  const independentRuns = new Set(support.map((item) => item.runId)).size;
  const minimumRuns = proposal.kind === 'false_positive' ? 1 : 2;
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
  const rejected = evidence.filter((item) => item.outcome === 'rejected');
  const kind: PassiveMemoryProposal['kind'] = rejected.length === evidence.length
    ? 'false_positive'
    : 'confirmed_pattern';
  const selected = kind === 'false_positive'
    ? rejected
    : evidence.filter((item) => item.outcome === 'resolved' || item.outcome === 'revised');
  if (selected.length === 0) return null;
  const first = selected[0];
  if (!first) return null;
  return PassiveMemoryProposalSchema.parse({
    kind,
    content: kind === 'false_positive'
      ? `Prior reviews rejected this finding pattern: ${first.title}`
      : `This repository has repeatedly confirmed this finding pattern: ${first.title}`,
    evidenceIds: selected.map((item) => item.observationId),
    skill: first.skill,
    confidence: Math.min(1, 0.5 + new Set(selected.map((item) => item.runId)).size * 0.1),
  });
}
