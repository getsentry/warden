import { z } from 'zod';
import type { EventContext, SkillReport } from '../../types/index.js';
import type { RuntimeName } from '../../sdk/runtimes/index.js';
import {
  AuxiliaryUsageMapSchema,
  ConfidenceThresholdSchema,
  FindingSchema,
  GitHubEventTypeSchema,
  LocationSchema,
  SeverityThresholdSchema,
  SourceSnippetSchema,
  UsageStatsSchema,
} from '../../types/index.js';
import type { FindingObservation } from './outcomes.js';
import { FindingObservationSchema } from './outcomes.js';

const ExportedFindingSchema = z.object({
  id: z.string(),
  severity: FindingSchema.shape.severity,
  confidence: FindingSchema.shape.confidence,
  title: z.string(),
  description: z.string(),
  location: LocationSchema.optional(),
  additionalLocations: z.array(LocationSchema).optional(),
  sourceSnippet: SourceSnippetSchema.optional(),
});

const TriggerErrorSchema = z.object({
  name: z.string().optional(),
  message: z.string(),
});

const WorkflowReplaySchema = z.object({
  auxiliary: z.object({
    runtime: z.enum(['claude', 'pi'] satisfies RuntimeName[]).optional(),
    model: z.string().optional(),
    maxRetries: z.number().int().nonnegative().optional(),
  }).optional(),
  skippedCoreCheck: z.object({
    title: z.string(),
    message: z.string(),
  }).optional(),
});

export type WorkflowReplay = z.infer<typeof WorkflowReplaySchema>;

// Durable analyze/report replay rows join by triggerName plus configured
// skillName. `report.skill` is preserved as report identity and may differ for
// local path skills with frontmatter names.
const TriggerRunResultBaseSchema = z.object({
  triggerId: z.string().optional(),
  triggerName: z.string(),
  skillName: z.string(),
  failOn: SeverityThresholdSchema.optional(),
  reportOn: SeverityThresholdSchema.optional(),
  minConfidence: ConfidenceThresholdSchema.optional(),
  reportOnSuccess: z.boolean().optional(),
  requestChanges: z.boolean().optional(),
  failCheck: z.boolean().optional(),
  maxFindings: z.number().int().nonnegative().optional(),
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
  }),
  TriggerRunResultBaseSchema.extend({
    status: z.literal('error'),
    report: z.never().optional(),
    error: TriggerErrorSchema,
  }),
  TriggerRunResultBaseSchema.extend({
    status: z.literal('skipped'),
    report: z.never().optional(),
    error: z.never().optional(),
  }),
]);

export const FindingsOutputSchema = z.object({
  version: z.literal('1'),
  timestamp: z.string().datetime(),
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
  summary: z.object({
    totalFindings: z.number().int().nonnegative(),
    findingsBySeverity: z.object({
      high: z.number().int().nonnegative(),
      medium: z.number().int().nonnegative(),
      low: z.number().int().nonnegative(),
    }),
    totalSkills: z.number().int().nonnegative(),
  }),
  workflow: WorkflowReplaySchema.optional(),
  skills: z.array(z.object({
    name: z.string(),
    summary: z.string(),
    model: z.string().optional(),
    durationMs: z.number().nonnegative().optional(),
    usage: UsageStatsSchema.optional(),
    findings: z.array(ExportedFindingSchema),
  })),
  triggerResults: z.array(TriggerRunResultSchema).optional(),
  findingObservations: z.array(FindingObservationSchema),
});

export type FindingsOutput = z.infer<typeof FindingsOutputSchema>;

export interface ReplayTriggerResult {
  triggerId?: string;
  triggerName: string;
  skillName: string;
  status?: 'skipped';
  failOn?: z.infer<typeof SeverityThresholdSchema>;
  reportOn?: z.infer<typeof SeverityThresholdSchema>;
  minConfidence?: z.infer<typeof ConfidenceThresholdSchema>;
  reportOnSuccess?: boolean;
  requestChanges?: boolean;
  failCheck?: boolean;
  maxFindings?: number;
  report?: SkillReport;
  error?: unknown;
}

interface BuildFindingsOutputOptions {
  timestamp?: string;
  runId?: string;
  workflow?: z.infer<typeof WorkflowReplaySchema>;
  triggerResults?: ReplayTriggerResult[];
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
  const base = {
    triggerId: result.triggerId,
    triggerName: result.triggerName,
    skillName: result.skillName,
    failOn: result.failOn,
    reportOn: result.reportOn,
    minConfidence: result.minConfidence,
    reportOnSuccess: result.reportOnSuccess,
    requestChanges: result.requestChanges,
    failCheck: result.failCheck,
    maxFindings: result.maxFindings,
  };

  if (result.status === 'skipped') {
    return {
      ...base,
      status: 'skipped',
    };
  }

  if (result.report) {
    return {
      ...base,
      status: 'success',
      report: serializeReplayReport(result.report),
    };
  }

  return {
    ...base,
    status: 'error',
    error: serializeTriggerError(result.error ?? 'Trigger did not produce a report'),
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
  const output = {
    version: '1',
    timestamp: options.timestamp ?? new Date().toISOString(),
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
    summary: {
      totalFindings: allFindings.length,
      findingsBySeverity: {
        high: allFindings.filter((f) => f.severity === 'high').length,
        medium: allFindings.filter((f) => f.severity === 'medium').length,
        low: allFindings.filter((f) => f.severity === 'low').length,
      },
      totalSkills: reports.length,
    },
    ...(options.workflow && { workflow: options.workflow }),
    skills: reports.map((r) => ({
      name: r.skill,
      summary: r.summary,
      model: r.model,
      durationMs: r.durationMs,
      usage: r.usage,
      findings: r.findings.map((f) => ({
        id: f.id,
        severity: f.severity,
        confidence: f.confidence,
        title: f.title,
        description: f.description,
        location: f.location,
        additionalLocations: f.additionalLocations,
        sourceSnippet: f.sourceSnippet,
      })),
    })),
    ...(options.triggerResults && {
      triggerResults: options.triggerResults.map(serializeTriggerResult),
    }),
    findingObservations,
  };

  return FindingsOutputSchema.parse(output);
}
