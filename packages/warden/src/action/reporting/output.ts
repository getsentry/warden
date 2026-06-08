import { z } from 'zod';
import type { EventContext, SkillReport } from '../../types/index.js';
import {
  AuxiliaryUsageMapSchema,
  FindingSchema,
  GitHubEventTypeSchema,
  LocationSchema,
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

// Durable analyze/report replay rows join by triggerName plus configured
// skillName. `report.skill` is preserved as report identity and may differ for
// local path skills with frontmatter names.
const TriggerRunResultBaseSchema = z.object({
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
  triggerName: string;
  skillName: string;
  report?: SkillReport;
  error?: unknown;
}

interface BuildFindingsOutputOptions {
  timestamp?: string;
  runId?: string;
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
  if (result.report) {
    return {
      triggerName: result.triggerName,
      skillName: result.skillName,
      status: 'success',
      report: serializeReplayReport(result.report),
    };
  }

  return {
    triggerName: result.triggerName,
    skillName: result.skillName,
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
