import {
  redactRunProjection,
} from '@sentry/warden-service-api';
import type {
  FindingObservation,
  FindingProvenance,
  RepositoryIdentity,
  RunEnvelopeV1,
  RunProjection,
  UsageLineItem,
} from '@sentry/warden-service-api';
import type {
  Finding,
  SkillReport,
  UsageAttribution,
  UsageStats,
} from '../types/index.js';
import type { ResolvedServiceOptions } from './options.js';

const auxiliaryLaneAliases: Record<string, string> = {
  extractionRepair: 'extraction',
  semanticDedup: 'dedup',
  verification: 'verification',
  merge: 'merge',
  fixGate: 'fix_gate',
};

const MAX_SKILLS = 100;
const MAX_FINDINGS = 500;
const MAX_OBSERVATIONS = 1_000;
const MAX_USAGE_ITEMS = 64;
const MAX_RECALLED_MEMORIES = 5;
const MAX_TITLE_LENGTH = 512;
const MAX_DESCRIPTION_LENGTH = 8_000;
const MAX_VERIFICATION_LENGTH = 4_000;
const MAX_PATH_LENGTH = 1_024;

function usageLine(lane: string, usage: UsageStats, attribution?: UsageAttribution): UsageLineItem {
  return {
    lane: auxiliaryLaneAliases[lane] ?? lane,
    ...(attribution?.model ? { model: attribution.model } : {}),
    ...(attribution?.runtime ? { runtime: attribution.runtime } : {}),
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    ...(usage.cacheReadInputTokens !== undefined ? { cacheReadInputTokens: usage.cacheReadInputTokens } : {}),
    ...(usage.cacheCreationInputTokens !== undefined ? { cacheCreationInputTokens: usage.cacheCreationInputTokens } : {}),
    ...(usage.cacheCreation5mInputTokens !== undefined ? { cacheCreation5mInputTokens: usage.cacheCreation5mInputTokens } : {}),
    ...(usage.cacheCreation1hInputTokens !== undefined ? { cacheCreation1hInputTokens: usage.cacheCreation1hInputTokens } : {}),
    ...(usage.webSearchRequests !== undefined ? { webSearchRequests: usage.webSearchRequests } : {}),
    costUsd: usage.costUSD,
    costBasis: 'reported',
  };
}

function counts(findings: readonly Finding[]) {
  return {
    total: findings.length,
    bySeverity: {
      high: findings.filter((finding) => finding.severity === 'high').length,
      medium: findings.filter((finding) => finding.severity === 'medium').length,
      low: findings.filter((finding) => finding.severity === 'low').length,
    },
  };
}

function findingRecord(finding: Finding, skillExecutionId: string, provenance?: FindingProvenance) {
  const sourceSnippet = finding.sourceSnippet;
  return {
    id: finding.id,
    ...(finding.reportedId ? { reportedId: finding.reportedId } : {}),
    skillExecutionId,
    severity: finding.severity,
    ...(finding.confidence ? { confidence: finding.confidence } : {}),
    title: finding.title.slice(0, MAX_TITLE_LENGTH),
    description: finding.description.slice(0, MAX_DESCRIPTION_LENGTH),
    ...(finding.verification
      ? { verification: finding.verification.slice(0, MAX_VERIFICATION_LENGTH) }
      : {}),
    ...(finding.location ? {
      location: {
        ...finding.location,
        path: finding.location.path.slice(0, MAX_PATH_LENGTH),
      },
    } : {}),
    ...(finding.additionalLocations ? {
      additionalLocations: finding.additionalLocations.slice(0, 20).map((location) => ({
        ...location,
        path: location.path.slice(0, MAX_PATH_LENGTH),
      })),
    } : {}),
    ...(provenance ? { provenance } : {}),
    ...(sourceSnippet ? {
      sourceEvidence: {
        path: sourceSnippet.path.slice(0, MAX_PATH_LENGTH),
        ...(sourceSnippet.language ? { language: sourceSnippet.language } : {}),
        startLine: sourceSnippet.startLine,
        endLine: sourceSnippet.endLine,
        targetStartLine: sourceSnippet.targetStartLine,
        targetEndLine: sourceSnippet.targetEndLine,
        content: sourceSnippet.lines.map((line) => line.content).join('\n').slice(0, 16_000),
      },
    } : {}),
  };
}

export interface ServiceSkillReport {
  executionId: string;
  report: SkillReport;
  triggerId?: string;
  triggerName?: string;
  skillDigest?: string;
  findingProvenance?: Readonly<Record<string, FindingProvenance>>;
}

export interface BuildServiceRunProjectionInput {
  service: Pick<ResolvedServiceOptions, 'data' | 'memory'>;
  clientRunId: string;
  source: 'cli' | 'action' | 'sdk' | 'replay';
  wardenVersion: string;
  startedAt: Date;
  completedAt: Date;
  outcome: 'success' | 'failure' | 'cancelled' | 'skipped';
  repository: RepositoryIdentity;
  reports: readonly ServiceSkillReport[];
  observations?: readonly FindingObservation[];
  recalledMemories?: readonly { id: string; version: number }[];
  memoryRecallId?: string;
  traceId?: string;
  headSha?: string;
  event?: string;
  pullRequest?: {
    number: number;
    author?: string;
    title?: string;
    baseBranch?: string;
    headBranch?: string;
  };
}

/** Convert final in-memory Warden reports into the richer pre-redaction service projection. */
export function buildServiceRunProjection(input: BuildServiceRunProjectionInput): RunProjection {
  const reports = input.reports.slice(0, MAX_SKILLS);
  const findings = reports.flatMap(({ executionId, report, findingProvenance }) =>
    report.findings.map((finding) => findingRecord(
      finding,
      executionId,
      findingProvenance?.[finding.id],
    ))).slice(0, MAX_FINDINGS);
  const skills = reports.map(({ executionId, report, triggerId, triggerName, skillDigest }) => {
    const usage: UsageLineItem[] = [];
    if (report.usage) {
      usage.push(usageLine('scan', report.usage, { model: report.model, runtime: report.runtime }));
    }
    for (const [lane, laneUsage] of Object.entries(report.auxiliaryUsage ?? {})) {
      usage.push(usageLine(lane, laneUsage, report.auxiliaryUsageAttribution?.[lane]));
    }
    return {
      executionId,
      skill: report.skill,
      ...(skillDigest ? { skillDigest } : {}),
      ...(triggerId ? { triggerId } : {}),
      ...(triggerName ? { triggerName } : {}),
      ...(report.model ? { model: report.model } : {}),
      ...(report.runtime ? { runtime: report.runtime } : {}),
      status: report.error ? 'failure' as const : 'success' as const,
      ...(report.error ? { errorCode: report.error.code } : {}),
      ...(report.durationMs !== undefined ? { durationMs: report.durationMs } : {}),
      findingCounts: counts(report.findings),
      usage: usage.slice(0, MAX_USAGE_ITEMS),
    };
  });
  const findingIds = new Set(findings.map((finding) => finding.id));
  const skillExecutionIds = new Set(skills.map((skill) => skill.executionId));
  const observations = (input.observations ?? [])
    .filter((observation) => findingIds.has(observation.findingId)
      && (!observation.skillExecutionId || skillExecutionIds.has(observation.skillExecutionId)))
    .slice(0, MAX_OBSERVATIONS);
  return {
    protocolVersion: 1,
    dataProfile: input.service.data,
    clientRunId: input.clientRunId,
    source: input.source,
    wardenVersion: input.wardenVersion,
    startedAt: input.startedAt.toISOString(),
    completedAt: input.completedAt.toISOString(),
    outcome: input.outcome,
    ...(input.traceId ? { traceId: input.traceId } : {}),
    repository: input.repository,
    ...(input.headSha ? { headSha: input.headSha } : {}),
    ...(input.event ? { event: input.event } : {}),
    ...(input.pullRequest ? { pullRequest: input.pullRequest } : {}),
    features: {
      memory: input.service.memory,
    },
    findingCounts: counts(input.reports.flatMap(({ report }) => report.findings)),
    skills,
    findings,
    observations,
    ...(input.recalledMemories?.length
      ? { recalledMemories: input.recalledMemories.slice(0, MAX_RECALLED_MEMORIES) }
      : {}),
    ...(input.memoryRecallId ? { memoryRecallId: input.memoryRecallId } : {}),
  };
}

/** Apply the shared profile boundary before any projection can reach fetch. */
export function buildServiceRunEnvelope(input: BuildServiceRunProjectionInput): RunEnvelopeV1 {
  return redactRunProjection(buildServiceRunProjection(input));
}
