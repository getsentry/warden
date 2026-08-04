import { z } from 'zod';
import { ConfidenceSchema, LocationSchema, SeveritySchema } from '../../types/index.js';
import type { FindingProcessingEvent } from '../../sdk/types.js';

const FindingSnapshotSchema = z.object({
  title: z.string(),
  description: z.string(),
  severity: SeveritySchema,
  confidence: ConfidenceSchema.optional(),
});

const VerificationStageSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('revised'),
    model: z.string().optional(),
    evidence: z.string().optional(),
    before: FindingSnapshotSchema,
  }),
]);

const MergeStageSchema = z.object({
  model: z.string().optional(),
  absorbedFindingIds: z.array(z.string()),
});

export const FindingProvenanceSchema = z.object({
  originSkillExecutionId: z.string().optional(),
  originModel: z.string().optional(),
  verification: VerificationStageSchema.optional(),
  merge: MergeStageSchema.optional(),
});
export type FindingProvenance = z.infer<typeof FindingProvenanceSchema>;

export const DiscardedFindingSchema = z.object({
  originSkillExecutionId: z.string().optional(),
  stage: z.enum(['verification_rejected', 'merge_absorbed', 'dedupe_dropped']),
  severity: SeveritySchema,
  title: z.string(),
  location: LocationSchema.optional(),
  model: z.string().optional(),
  reason: z.string().optional(),
  survivorFindingId: z.string().optional(),
});
export type DiscardedFinding = z.infer<typeof DiscardedFindingSchema>;

/** One skill execution's captured verification/merge events, for provenance matching. */
export interface FindingExecutionEvents {
  skillExecutionId?: string;
  /** Primary/analysis model, attributed as a finding's origin. */
  model?: string;
  /** Model that ran the verification lane; attributed to verification-stage events instead of `model`. */
  verificationModel?: string;
  /** Model that ran the merge/synthesis lane; attributed to merge-stage events instead of `model`. */
  mergeModel?: string;
  events: FindingProcessingEvent[];
}

export interface ProvenanceAndDiscarded {
  /** Keyed by `provenanceKey(skillExecutionId, findingId)` — see that function for why. */
  provenanceByFindingId: Map<string, FindingProvenance>;
  discarded: DiscardedFinding[];
}

/**
 * Same-run dedupe can recenter two different skill executions' survivor
 * findings onto the same id (e.g. both matched against the same pre-existing
 * comment), so `findingId` alone is not a safe map key: a second execution's
 * event would silently overwrite or merge into the first's entry, and both
 * exported skill rows would then read the same (wrong) provenance. Scoping
 * the key to the owning execution keeps each skill row's provenance
 * independent.
 */
export function provenanceKey(skillExecutionId: string | undefined, findingId: string): string {
  return `${skillExecutionId ?? ''}:${findingId}`;
}

/**
 * Build per-finding provenance and the list of discarded candidates from
 * captured `FindingProcessingEvent`s. Handles `verification`/`rejected`,
 * `verification`/`revised`, `merge`/`merged`, and `dedupe`/`dropped` events —
 * `fix_gate` events are out of scope here (they don't remove a finding, they
 * strip a proposed fix from one that's kept).
 *
 * `poster.ts`'s `recenterReportFindingIds` keeps this lookup valid across
 * cross-run dedupe: when it recenters a survivor's `id` onto a pre-existing
 * comment's id, it remaps this same finding's id inside any already-captured
 * `FindingProcessingEvent`s so the id this map is keyed by (and the id
 * `output.ts` looks it up by) stay in sync.
 */
export function buildProvenanceAndDiscarded(executions: FindingExecutionEvents[]): ProvenanceAndDiscarded {
  const provenanceByFindingId = new Map<string, FindingProvenance>();
  const discarded: DiscardedFinding[] = [];

  for (const { skillExecutionId, model, verificationModel, mergeModel, events } of executions) {
    for (const event of events) {
      if (event.stage === 'dedupe' && event.action === 'dropped') {
        discarded.push({
          originSkillExecutionId: skillExecutionId,
          stage: 'dedupe_dropped',
          severity: event.finding.severity,
          title: event.finding.title,
          location: event.finding.location,
          model,
          reason: event.reason,
          survivorFindingId: event.replacement?.id,
        });
        continue;
      }

      if (event.stage === 'verification' && event.action === 'rejected') {
        discarded.push({
          originSkillExecutionId: skillExecutionId,
          stage: 'verification_rejected',
          severity: event.finding.severity,
          title: event.finding.title,
          location: event.finding.location,
          model: verificationModel,
          reason: event.reason,
        });
        continue;
      }

      if (event.stage === 'verification' && event.action === 'revised' && event.replacement) {
        const key = provenanceKey(skillExecutionId, event.replacement.id);
        provenanceByFindingId.set(key, {
          ...provenanceByFindingId.get(key),
          originSkillExecutionId: skillExecutionId,
          originModel: model,
          verification: {
            outcome: 'revised',
            model: verificationModel,
            evidence: event.reason,
            before: {
              title: event.finding.title,
              description: event.finding.description,
              severity: event.finding.severity,
              confidence: event.finding.confidence,
            },
          },
        });
        continue;
      }

      if (event.stage === 'merge' && event.action === 'merged' && event.replacement) {
        discarded.push({
          originSkillExecutionId: skillExecutionId,
          stage: 'merge_absorbed',
          severity: event.finding.severity,
          title: event.finding.title,
          location: event.finding.location,
          model: mergeModel,
          reason: event.reason,
          survivorFindingId: event.replacement.id,
        });

        const key = provenanceKey(skillExecutionId, event.replacement.id);
        const existing = provenanceByFindingId.get(key);
        provenanceByFindingId.set(key, {
          ...existing,
          originSkillExecutionId: existing?.originSkillExecutionId ?? skillExecutionId,
          originModel: existing?.originModel ?? model,
          merge: {
            model: mergeModel,
            absorbedFindingIds: [...(existing?.merge?.absorbedFindingIds ?? []), event.finding.id],
          },
        });
      }
    }
  }

  return { provenanceByFindingId, discarded };
}
