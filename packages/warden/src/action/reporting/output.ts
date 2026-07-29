import { z } from 'zod';
import type { EventContext, SkillReport } from '../../types/index.js';
import {
  AuxiliaryUsageMapSchema,
  FindingSchema,
  findingLine,
  GitHubEventTypeSchema,
  LocationSchema,
  SeverityThresholdSchema,
  SkillErrorSchema,
  SourceSnippetSchema,
  UsageStatsSchema,
} from '../../types/index.js';
import type { FindingObservation } from './outcomes.js';
import { FindingObservationSchema } from './outcomes.js';
import { generateContentHash, generateLocationHashKey } from '../../output/dedup.js';
import { getVersion } from '../../utils/version.js';
import {
  buildProvenanceAndDiscarded,
  DiscardedFindingSchema,
  FindingProvenanceSchema,
} from './provenance.js';
import type { FindingExecutionEvents } from './provenance.js';
import type { FindingProcessingEvent } from '../../sdk/types.js';

const FindingAttributionSchema = z.object({
  skillExecutionId: z.string().optional(),
  skillName: z.string(),
  role: z.enum(['primary', 'corroborating']),
  matchType: z.enum(['hash', 'semantic']).optional(),
});

const ExportedFindingSchema = z.object({
  id: z.string(),
  /** Set to the same value as `id` once dedupe/recenter matches this finding to an already-posted comment. */
  reportedId: z.string().optional(),
  severity: FindingSchema.shape.severity,
  confidence: FindingSchema.shape.confidence,
  title: z.string(),
  description: z.string(),
  /** Verifier's evidence trace, when a verification pass ran. */
  verification: z.string().optional(),
  location: LocationSchema.optional(),
  additionalLocations: z.array(LocationSchema).optional(),
  sourceSnippet: SourceSnippetSchema.optional(),
  /** Stable cross-run key, same value `output/dedup.ts` uses for hash-based dedupe. */
  contentHash: z.string().optional(),
  /** Skills that independently flagged this finding, self included as `role: 'primary'`. */
  reportedBy: z.array(FindingAttributionSchema).optional(),
  provenance: FindingProvenanceSchema.optional(),
});

const HarnessSchema = z.object({
  name: z.literal('warden'),
  version: z.string(),
  actionRef: z.string().optional(),
});

/**
 * Action-level fallbacks every trigger falls back to when its own config
 * doesn't override them. Deliberately narrower than a per-trigger
 * ResolvedTrigger: model/runtime/minConfidence/verifyFindings are resolved
 * per skill/trigger in this repo, not at the action level, so there's no
 * single run-wide value to report for them here.
 */
const ResolvedDefaultsSchema = z.object({
  failOn: SeverityThresholdSchema.optional(),
  reportOn: SeverityThresholdSchema.optional(),
  failCheck: z.boolean().optional(),
  requestChanges: z.boolean().optional(),
  maxFindings: z.number().int().nonnegative().optional(),
});

export const SkippedTriggerReasonSchema = z.enum([
  'no_event_match',
  'path_filter',
  'draft_state',
  'label_mismatch',
  'no_changes',
  'pending',
  /** The trigger matched and ran, but threw before producing a report. */
  'error',
]);

const SkippedTriggerSchema = z.object({
  skillName: z.string(),
  triggerId: z.string().optional(),
  triggerName: z.string().optional(),
  reason: SkippedTriggerReasonSchema,
});

const TriggerErrorSchema = z.object({
  name: z.string().optional(),
  message: z.string(),
});

/** Mirrors `FindingProcessingEvent` (sdk/types.ts) so it can round-trip through the analyze/report replay artifact. */
const ReplayFindingProcessingEventSchema = z.object({
  stage: z.enum(['dedupe', 'verification', 'merge', 'fix_gate']),
  action: z.enum(['dropped', 'rejected', 'revised', 'merged', 'stripped_fix']),
  finding: FindingSchema,
  reason: z.string().optional(),
  replacement: FindingSchema.optional(),
});

// Durable analyze/report replay rows join by triggerName plus configured
// skillName. `report.skill` is preserved as report identity and may differ for
// local path skills with frontmatter names.
const TriggerRunResultBaseSchema = z.object({
  triggerId: z.string().optional(),
  triggerName: z.string(),
  skillName: z.string(),
});

const ReplaySkillReportSchema = z.object({
  skill: z.string(),
  summary: z.string(),
  findings: z.array(FindingSchema),
  durationMs: z.number().nonnegative().optional(),
  usage: UsageStatsSchema.optional(),
  auxiliaryUsage: AuxiliaryUsageMapSchema.optional(),
  model: z.string().optional(),
});

export const TriggerRunResultSchema = z.discriminatedUnion('status', [
  TriggerRunResultBaseSchema.extend({
    status: z.literal('success'),
    report: ReplaySkillReportSchema,
    error: z.never().optional(),
    /** Verification/merge/dedupe events captured during analyze mode, replayed so report mode's export still carries provenance/discardedFindings. */
    findingProcessingEvents: z.array(ReplayFindingProcessingEventSchema).optional(),
  }),
  TriggerRunResultBaseSchema.extend({
    status: z.literal('error'),
    report: z.never().optional(),
    error: TriggerErrorSchema,
  }),
]);

export const FindingsOutputSchema = z.object({
  version: z.literal('1'),
  timestamp: z.string().datetime(),
  runAttempt: z.string().optional(),
  /** Which build of Warden produced this run. */
  harness: HarnessSchema.optional(),
  repository: z.object({
    owner: z.string(),
    name: z.string(),
    fullName: z.string(),
  }),
  event: GitHubEventTypeSchema,
  pullRequest: z.object({
    number: z.number().int(),
    author: z.string(),
    title: z.string(),
    baseBranch: z.string(),
    headBranch: z.string(),
    headSha: z.string(),
  }).optional(),
  runId: z.string(),
  /** The model/threshold config this run resolved to at the action level. */
  resolvedDefaults: ResolvedDefaultsSchema.optional(),
  /** Configured triggers that never fired this run, with why. */
  skippedTriggers: z.array(SkippedTriggerSchema).optional(),
  summary: z.object({
    totalFindings: z.number().int().nonnegative(),
    findingsBySeverity: z.object({
      high: z.number().int().nonnegative(),
      medium: z.number().int().nonnegative(),
      low: z.number().int().nonnegative(),
    }),
    totalSkills: z.number().int().nonnegative(),
    totalSkillExecutions: z.number().int().nonnegative().optional(),
    byOutcome: z.object({
      posted: z.number().int().nonnegative(),
      deduped: z.number().int().nonnegative(),
      skipped: z.number().int().nonnegative(),
      resolved: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
    }).optional(),
  }),
  skills: z.array(z.object({
    name: z.string(),
    summary: z.string(),
    model: z.string().optional(),
    auxiliaryModel: z.string().optional(),
    synthesisModel: z.string().optional(),
    durationMs: z.number().nonnegative().optional(),
    usage: UsageStatsSchema.optional(),
    failedHunks: z.number().int().nonnegative().optional(),
    failedExtractions: z.number().int().nonnegative().optional(),
    error: SkillErrorSchema.optional(),
    /** Stable id for this skill×trigger execution. */
    skillExecutionId: z.string().optional(),
    triggerId: z.string().optional(),
    triggerName: z.string().optional(),
    findingsBySeverity: z.object({
      high: z.number().int().nonnegative(),
      medium: z.number().int().nonnegative(),
      low: z.number().int().nonnegative(),
    }).optional(),
    checkRunUrl: z.string().optional(),
    checkRunId: z.number().int().positive().optional(),
    /** Posting-derived; absent from analyze-mode replay and live writes. */
    reviewEvent: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']).optional(),
    checkConclusion: z.enum(['success', 'failure', 'neutral', 'cancelled']).optional(),
    /** Schedule-mode only. */
    issueNumber: z.number().int().positive().optional(),
    issueUrl: z.string().optional(),
    findings: z.array(ExportedFindingSchema),
  })),
  /** Verifier-rejected and merge-absorbed candidates that never reached `findings[]`. */
  discardedFindings: z.array(DiscardedFindingSchema).optional(),
  triggerResults: z.array(TriggerRunResultSchema).optional(),
  findingObservations: z.array(FindingObservationSchema),
});

export type FindingsOutput = z.infer<typeof FindingsOutputSchema>;

export interface ReplayTriggerResult {
  triggerId?: string;
  triggerName: string;
  skillName: string;
  report?: SkillReport;
  error?: unknown;
  findingProcessingEvents?: FindingProcessingEvent[];
}

/** Per-execution metadata for one `reports[]` entry, matched by object identity. */
export interface SkillExecutionMeta {
  report: SkillReport;
  skillExecutionId?: string;
  triggerId?: string;
  triggerName?: string;
  auxiliaryModel?: string;
  synthesisModel?: string;
  checkRunUrl?: string;
  checkRunId?: number;
  reviewEvent?: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  checkConclusion?: 'success' | 'failure' | 'neutral' | 'cancelled';
  issueNumber?: number;
  issueUrl?: string;
  findingProcessingEvents?: FindingProcessingEvent[];
}

export interface BuildFindingsOutputOptions {
  timestamp?: string;
  runId?: string;
  runAttempt?: string;
  actionRef?: string;
  triggerResults?: ReplayTriggerResult[];
  resolvedDefaults?: z.infer<typeof ResolvedDefaultsSchema>;
  skippedTriggers?: z.infer<typeof SkippedTriggerSchema>[];
  /** Per-execution metadata (skillExecutionId, posting-derived fields, captured provenance events) matched to `reports[]` by object identity. */
  skillExecutions?: SkillExecutionMeta[];
}

/** Build the action-level `resolvedDefaults` block from parsed action inputs. */
export function buildResolvedDefaults(inputs: {
  failOn?: z.infer<typeof SeverityThresholdSchema>;
  reportOn?: z.infer<typeof SeverityThresholdSchema>;
  failCheck?: boolean;
  requestChanges?: boolean;
  maxFindings: number;
}): NonNullable<BuildFindingsOutputOptions['resolvedDefaults']> {
  return {
    failOn: inputs.failOn,
    reportOn: inputs.reportOn,
    failCheck: inputs.failCheck,
    requestChanges: inputs.requestChanges,
    maxFindings: inputs.maxFindings,
  };
}

/**
 * Build the `actionRef`/`resolvedDefaults`/`skippedTriggers` triple every
 * `writeFindingsOutput(Live)` call site needs. Centralizing this keeps a
 * future field addition from requiring an edit at every individual write
 * call site across `pr-workflow.ts`/`schedule.ts`.
 */
export function buildBaseOutputOptions(
  inputs: Parameters<typeof buildResolvedDefaults>[0] & { actionRef?: string },
  skippedTriggers: BuildFindingsOutputOptions['skippedTriggers']
): Pick<BuildFindingsOutputOptions, 'actionRef' | 'resolvedDefaults' | 'skippedTriggers'> {
  return {
    actionRef: inputs.actionRef,
    resolvedDefaults: buildResolvedDefaults(inputs),
    skippedTriggers,
  };
}

function serializeTriggerError(error: unknown): z.infer<typeof TriggerErrorSchema> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return { message: String(error) };
}

function serializeReplayReport(report: SkillReport): z.infer<typeof ReplaySkillReportSchema> {
  return {
    skill: report.skill,
    summary: report.summary,
    findings: report.findings,
    durationMs: report.durationMs,
    usage: report.usage,
    auxiliaryUsage: report.auxiliaryUsage,
    model: report.model,
  };
}

function serializeTriggerResult(result: ReplayTriggerResult): z.infer<typeof TriggerRunResultSchema> {
  if (result.report) {
    return {
      triggerId: result.triggerId,
      triggerName: result.triggerName,
      skillName: result.skillName,
      status: 'success',
      report: serializeReplayReport(result.report),
      findingProcessingEvents: result.findingProcessingEvents,
    };
  }

  return {
    triggerId: result.triggerId,
    triggerName: result.triggerName,
    skillName: result.skillName,
    status: 'error',
    error: serializeTriggerError(result.error ?? 'Trigger did not produce a report'),
  };
}

function severityCounts(items: { severity: string }[]) {
  return {
    high: items.filter((i) => i.severity === 'high').length,
    medium: items.filter((i) => i.severity === 'medium').length,
    low: items.filter((i) => i.severity === 'low').length,
  };
}

/** Build the public findings export payload. */
export function buildFindingsOutput(
  reports: SkillReport[],
  context: EventContext,
  findingObservations: FindingObservation[] = [],
  options: BuildFindingsOutputOptions = {}
): FindingsOutput {
  const allFindings = reports.flatMap((r) => r.findings);
  const metaByReport = new Map((options.skillExecutions ?? []).map((meta) => [meta.report, meta]));

  const dedupeByLocationHashKey = new Map(
    findingObservations
      .filter((observation) => observation.outcome === 'deduped')
      .map((observation) => {
        const hash = generateContentHash(observation.finding.title, observation.finding.description);
        const key = generateLocationHashKey(observation.finding.location?.path, findingLine(observation.finding), hash);
        return [key, observation.dedupe];
      })
  );

  const { provenanceByFindingId, discarded } = buildProvenanceAndDiscarded(
    (options.skillExecutions ?? []).map((meta): FindingExecutionEvents => ({
      skillExecutionId: meta.skillExecutionId,
      model: meta.report.model,
      events: meta.findingProcessingEvents ?? [],
    }))
  );

  const byOutcome = {
    posted: 0,
    deduped: 0,
    skipped: 0,
    resolved: 0,
    failed: 0,
  };
  for (const observation of findingObservations) {
    byOutcome[observation.outcome]++;
  }

  const output = {
    version: '1',
    timestamp: options.timestamp ?? new Date().toISOString(),
    runAttempt: options.runAttempt,
    harness: { name: 'warden' as const, version: getVersion(), actionRef: options.actionRef },
    repository: {
      owner: context.repository.owner,
      name: context.repository.name,
      fullName: context.repository.fullName,
    },
    event: context.eventType,
    ...(context.pullRequest && {
      pullRequest: {
        number: context.pullRequest.number,
        author: context.pullRequest.author,
        title: context.pullRequest.title,
        baseBranch: context.pullRequest.baseBranch,
        headBranch: context.pullRequest.headBranch,
        headSha: context.pullRequest.headSha,
      },
    }),
    runId: options.runId ?? process.env['GITHUB_RUN_ID'] ?? '',
    ...(options.resolvedDefaults && { resolvedDefaults: options.resolvedDefaults }),
    ...(options.skippedTriggers && { skippedTriggers: options.skippedTriggers }),
    summary: {
      totalFindings: allFindings.length,
      findingsBySeverity: severityCounts(allFindings),
      totalSkills: reports.length,
      totalSkillExecutions: reports.length,
      byOutcome,
    },
    skills: reports.map((r) => {
      const meta = metaByReport.get(r);
      return {
        name: r.skill,
        summary: r.summary,
        model: r.model,
        auxiliaryModel: meta?.auxiliaryModel,
        synthesisModel: meta?.synthesisModel,
        durationMs: r.durationMs,
        usage: r.usage,
        failedHunks: r.failedHunks,
        failedExtractions: r.failedExtractions,
        error: r.error,
        skillExecutionId: meta?.skillExecutionId,
        triggerId: meta?.triggerId,
        triggerName: meta?.triggerName,
        findingsBySeverity: severityCounts(r.findings),
        checkRunUrl: meta?.checkRunUrl,
        checkRunId: meta?.checkRunId,
        reviewEvent: meta?.reviewEvent,
        checkConclusion: meta?.checkConclusion,
        issueNumber: meta?.issueNumber,
        issueUrl: meta?.issueUrl,
        findings: r.findings.map((f) => {
          const contentHash = generateContentHash(f.title, f.description);
          const locationHashKey = generateLocationHashKey(f.location?.path, findingLine(f), contentHash);
          const dedupe = dedupeByLocationHashKey.get(locationHashKey);
          const reportedBy = meta?.skillExecutionId !== undefined
            ? [
                { skillExecutionId: meta.skillExecutionId, skillName: r.skill, role: 'primary' as const },
                ...(dedupe?.existingSkills ?? [])
                  .filter((skillName) => skillName !== r.skill)
                  .map((skillName) => ({
                    skillName,
                    role: 'corroborating' as const,
                    matchType: dedupe?.matchType,
                  })),
              ]
            : undefined;

          return {
            id: f.id,
            reportedId: f.reportedId,
            severity: f.severity,
            confidence: f.confidence,
            title: f.title,
            description: f.description,
            verification: f.verification,
            location: f.location,
            additionalLocations: f.additionalLocations,
            sourceSnippet: f.sourceSnippet,
            contentHash,
            reportedBy,
            provenance: provenanceByFindingId.get(f.id),
          };
        }),
      };
    }),
    ...(discarded.length > 0 && { discardedFindings: discarded }),
    ...(options.triggerResults && {
      triggerResults: options.triggerResults.map(serializeTriggerResult),
    }),
    findingObservations,
  };

  return FindingsOutputSchema.parse(output);
}
