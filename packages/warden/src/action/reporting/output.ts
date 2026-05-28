import { z } from 'zod';
import type { EventContext, SkillReport } from '../../types/index.js';
import {
  FindingSchema,
  GitHubEventTypeSchema,
  LocationSchema,
  SourceSnippetSchema,
  SuggestedFixSchema,
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
  suggestedFix: SuggestedFixSchema.optional(),
  sourceSnippet: SourceSnippetSchema.optional(),
});

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
  findingObservations: z.array(FindingObservationSchema),
});

export type FindingsOutput = z.infer<typeof FindingsOutputSchema>;

interface BuildFindingsOutputOptions {
  timestamp?: string;
  runId?: string;
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
        suggestedFix: f.suggestedFix,
        sourceSnippet: f.sourceSnippet,
      })),
    })),
    findingObservations,
  };

  return FindingsOutputSchema.parse(output);
}
