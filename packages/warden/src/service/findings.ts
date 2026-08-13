import { createHash } from 'node:crypto';
import type { FindingsOutput } from '../action/reporting/output.js';
import type { SkillReport } from '../types/index.js';
import { getVersion } from '../utils/index.js';
import type { ResolvedServiceOptions } from './options.js';
import { buildServiceRunEnvelope } from './projection.js';

function observationReason(observation: FindingsOutput['findingObservations'][number]): string | undefined {
  if (observation.outcome === 'deduped') return `${observation.dedupe.source}:${observation.dedupe.matchType}`;
  if (observation.outcome === 'skipped') return observation.skippedReason;
  if (observation.outcome === 'resolved') return observation.resolvedReason;
  return undefined;
}

function boundedId(value: string): string {
  if (value.length <= 128) return value;
  const digest = createHash('sha256').update(value).digest('hex').slice(0, 16);
  return `${value.slice(0, 111)}:${digest}`;
}

function reportsFromFindings(output: FindingsOutput) {
  const rawReports = output.skills.map((skill, index) => ({
    executionId: skill.skillExecutionId ?? `${index + 1}:${skill.name}`,
    ...(skill.triggerId ? { triggerId: skill.triggerId } : {}),
    ...(skill.triggerName ? { triggerName: skill.triggerName } : {}),
    report: {
      skill: skill.name,
      summary: skill.summary,
      findings: skill.findings,
      ...(skill.model ? { model: skill.model } : {}),
      ...(skill.durationMs === undefined ? {} : { durationMs: skill.durationMs }),
      ...(skill.usage ? { usage: skill.usage } : {}),
      ...(skill.failedHunks === undefined ? {} : { failedHunks: skill.failedHunks }),
      ...(skill.failedExtractions === undefined ? {} : { failedExtractions: skill.failedExtractions }),
      ...(skill.error ? { error: skill.error } : {}),
    } satisfies SkillReport,
    findingProvenance: Object.fromEntries(skill.findings.flatMap((finding) =>
      finding.provenance ? [[finding.id, finding.provenance]] : [])),
  }));
  const completedExecutions = new Set(rawReports.map((item) => item.executionId));
  for (const trigger of output.triggerResults ?? []) {
    if (trigger.status !== 'error') continue;
    const executionId = trigger.triggerId ?? `${rawReports.length + 1}:${trigger.skillName}`;
    if (completedExecutions.has(executionId)) continue;
    rawReports.push({
      executionId,
      triggerId: trigger.triggerId,
      triggerName: trigger.triggerName,
      report: {
        skill: trigger.skillName,
        summary: 'Trigger did not complete',
        findings: [],
        error: {
          code: 'unknown',
          message: trigger.error?.message ?? 'Trigger did not complete',
          timestamp: output.timestamp,
        },
      },
      findingProvenance: {},
    });
  }

  const findingCounts = new Map<string, number>();
  for (const { report } of rawReports) {
    for (const finding of report.findings) {
      findingCounts.set(finding.id, (findingCounts.get(finding.id) ?? 0) + 1);
    }
  }
  const executionIdCounts = new Map<string, number>();
  for (const { executionId } of rawReports) {
    executionIdCounts.set(executionId, (executionIdCounts.get(executionId) ?? 0) + 1);
  }

  const executionIds = new Map<string, string>();
  const findingIds = new Map<string, string>();
  const uniqueFindingIds = new Map<string, string>();
  const reports = rawReports.map((item, index) => {
    const executionId = boundedId(executionIdCounts.get(item.executionId) === 1
      ? item.executionId
      : `${item.executionId}:${index + 1}`);
    if (executionIdCounts.get(item.executionId) === 1) executionIds.set(item.executionId, executionId);
    const occurrences = new Map<string, number>();
    const normalizedFindings = item.report.findings.map((finding) => {
      const duplicate = (findingCounts.get(finding.id) ?? 0) > 1;
      const occurrence = (occurrences.get(finding.id) ?? 0) + 1;
      occurrences.set(finding.id, occurrence);
      const id = boundedId(duplicate
        ? `${executionId}:${finding.id}${occurrence > 1 ? `:${occurrence}` : ''}`
        : finding.id);
      const findingKey = `${executionId}\0${finding.id}`;
      if (!findingIds.has(findingKey)) findingIds.set(findingKey, id);
      if (!duplicate) uniqueFindingIds.set(finding.id, id);
      return {
        ...finding,
        id,
        ...((duplicate || id !== finding.id) && !finding.reportedId
          ? { reportedId: boundedId(finding.id) }
          : {}),
      };
    });
    return {
      ...item,
      executionId,
      ...(item.triggerId ? { triggerId: boundedId(item.triggerId) } : {}),
      report: { ...item.report, findings: normalizedFindings },
      findingProvenance: Object.fromEntries(normalizedFindings.flatMap((finding, findingIndex) => {
        const originalId = item.report.findings[findingIndex]?.id;
        const provenance = originalId ? item.findingProvenance[originalId] : undefined;
        return provenance ? [[finding.id, provenance]] : [];
      })),
    };
  });
  return { reports, executionIds, findingIds, uniqueFindingIds };
}

/** Convert an in-memory Action findings result into the current service envelope. */
export function buildFindingsServiceRunEnvelope(
  output: FindingsOutput,
  service: ResolvedServiceOptions,
  source: 'action' | 'replay',
) {
  const replay = reportsFromFindings(output);
  const { reports } = replay;
  const executionsBySkill = new Map<string, string[]>();
  for (const item of reports) {
    const executions = executionsBySkill.get(item.report.skill) ?? [];
    executions.push(item.executionId);
    executionsBySkill.set(item.report.skill, executions);
  }
  const completedAt = new Date(output.timestamp);
  const durationMs = Math.max(0, ...reports.map((item) => item.report.durationMs ?? 0));
  return buildServiceRunEnvelope({
    service,
    clientRunId: output.runAttempt ? `${output.runId}:${output.runAttempt}` : output.runId,
    source,
    wardenVersion: output.harness?.version ?? getVersion(),
    startedAt: new Date(completedAt.getTime() - durationMs),
    completedAt,
    outcome: reports.some((item) => item.report.error) ? 'failure' : 'success',
    repository: {
      provider: 'github',
      owner: output.repository.owner,
      name: output.repository.name,
      fullName: output.repository.fullName,
    },
    reports,
    ...(output.recalledMemories?.length ? { recalledMemories: output.recalledMemories } : {}),
    ...(output.memoryRecallId ? { memoryRecallId: output.memoryRecallId } : {}),
    observations: output.findingObservations.flatMap((observation) => {
      const rawExecutionId = observation.skillExecutionId;
      const executionId = rawExecutionId
        ? replay.executionIds.get(rawExecutionId)
        : observation.skill && executionsBySkill.get(observation.skill)?.length === 1
          ? executionsBySkill.get(observation.skill)?.[0]
          : undefined;
      const findingId = executionId
        ? replay.findingIds.get(`${executionId}\0${observation.finding.id}`)
        : replay.uniqueFindingIds.get(observation.finding.id);
      if (!findingId) return [];
      const reason = observationReason(observation);
      return [{
        findingId,
        ...(executionId ? { skillExecutionId: executionId } : {}),
        outcome: observation.outcome,
        ...(reason ? { reason } : {}),
        observedAt: output.timestamp,
      }];
    }),
    event: output.event,
    ...(output.pullRequest?.headSha ? { headSha: output.pullRequest.headSha } : {}),
    ...(output.pullRequest ? { pullRequest: {
      number: output.pullRequest.number,
      author: output.pullRequest.author,
      title: output.pullRequest.title,
      baseBranch: output.pullRequest.baseBranch,
      headBranch: output.pullRequest.headBranch,
    } } : {}),
  });
}
