import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { SkillDefinition } from '../config/schema.js';
import { buildLocalEventContext, type LocalContextOptions } from '../cli/context.js';
import { resolveSkillAsync } from '../skills/loader.js';
import type { EventContext, Finding, SkillReport } from '../types/index.js';
import { isPathLike } from '../utils/path.js';
import { getVersion } from '../utils/index.js';
import {
  buildServiceRunEnvelope,
  publishRunFailOpen,
  recallMemoryFailOpen,
  renderHistoricalMemory,
  resolveServiceOptions,
} from '../service/index.js';
import type { ServiceOptionOverrides } from '../service/index.js';
import { runSkill } from './analyze.js';
import { sanitizeErrorMessage } from './errors.js';
import type { VerifyFindingsOptions, VerifyFindingsResult } from './verify.js';
import { verifyFindings } from './verify.js';
import type { SkillRunnerOptions } from './types.js';

export interface LocalSkillServiceOptions extends ServiceOptionOverrides {
  onWarning?: (message: string) => void;
}

export interface RunLocalSkillOptions extends LocalContextOptions, SkillRunnerOptions {
  /** Skill file or directory to run. */
  skillPath: string;
  /** Optional fail-open backing-service integration. */
  service?: LocalSkillServiceOptions;
}

export interface RunLocalSkillResult {
  /** Resolved skill definition used for the run. */
  skill: SkillDefinition;
  /** Synthetic pull request context built from the local git diff. */
  context: EventContext;
  /** Skill report returned by the Warden pipeline. */
  report: SkillReport;
}

export interface VerifyLocalFindingsOptions extends Omit<VerifyFindingsOptions, 'skill'> {
  /** Candidate findings to verify. */
  findings: Finding[];
  /** Skill file or directory that produced the candidate findings. */
  skillPath: string;
}

export interface VerifyLocalFindingsResult extends VerifyFindingsResult {
  /** Resolved skill definition used for verification. */
  skill: SkillDefinition;
}

/** Run a skill against a local git diff using Warden's normal analysis pipeline. */
export async function runLocalSkill(options: RunLocalSkillOptions): Promise<RunLocalSkillResult> {
  const {
    skillPath,
    base,
    head,
    cwd,
    defaultBranch,
    staged,
    service: serviceInput,
    ...runnerOptions
  } = options;
  const service = resolveServiceOptions({
    explicit: serviceInput,
    onWarning: serviceInput?.onWarning,
  });
  const startedAt = new Date();
  const context = buildLocalEventContext({
    base,
    head,
    cwd,
    defaultBranch,
    staged,
  });
  const skillRoot = isPathLike(skillPath) ? cwd ?? process.cwd() : context.repoPath;
  const skill = await resolveSkillAsync(skillPath, skillRoot);
  const repository = {
    provider: 'local' as const,
    owner: context.repository.owner,
    name: context.repository.name,
    fullName: context.repository.fullName,
  };
  const clientRunId = randomUUID();
  const paths = context.pullRequest?.files.map((file) => file.filename) ?? [];
  const recall = service ? await recallMemoryFailOpen(service, {
    protocolVersion: 1,
    clientRecallId: clientRunId,
    repository,
    skills: [skill.name],
    languages: [...new Set(paths.map((path) => extname(path).slice(1)).filter(Boolean))],
    paths,
  }) : undefined;
  const recalledMemories = recall?.memories ?? [];
  const recalledEvidence = renderHistoricalMemory(recalledMemories);
  const historicalEvidence = runnerOptions.historicalEvidence && recalledEvidence
    ? `${runnerOptions.historicalEvidence}\n\n${recalledEvidence}`
    : (runnerOptions.historicalEvidence ?? recalledEvidence);
  const publishReport = async (
    publishedService: typeof service,
    report: SkillReport,
    outcome: 'success' | 'failure',
  ): Promise<void> => {
    if (!publishedService) return;
    await publishRunFailOpen(publishedService, {
      clientRunId,
      build: () => buildServiceRunEnvelope({
        service: publishedService,
        clientRunId,
        source: 'sdk',
        wardenVersion: getVersion(),
        startedAt,
        completedAt: new Date(),
        outcome,
        repository,
        reports: [{ executionId: `1:${report.skill}`, report }],
        recalledMemories: recalledMemories.map(({ id, version }) => ({ id, version })),
        ...(recall ? { memoryRecallId: recall.clientRecallId } : {}),
        event: context.eventType,
        ...(context.pullRequest?.headSha ? { headSha: context.pullRequest.headSha } : {}),
      }),
    }, serviceInput?.onWarning);
  };

  let report: SkillReport;
  try {
    report = await runSkill(skill, context, {
      ...runnerOptions,
      historicalEvidence,
    });
  } catch (error) {
    const failedReport: SkillReport = {
      skill: skill.name,
      summary: 'Skill did not complete',
      findings: [],
      durationMs: Math.max(0, Date.now() - startedAt.getTime()),
      error: {
        code: 'unknown',
        message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString(),
      },
    };
    await publishReport(service ? { ...service, data: 'metrics', memory: false } : undefined, failedReport, 'failure');
    throw error;
  }

  await publishReport(service, report, report.error ? 'failure' : 'success');

  return { skill, context, report };
}

/** Verify candidate findings against a local repository using Warden's verifier. */
export async function verifyLocalFindings(
  options: VerifyLocalFindingsOptions
): Promise<VerifyLocalFindingsResult> {
  const { skillPath, findings, repoPath, ...verifyOptions } = options;
  const skill = await resolveSkillAsync(skillPath, repoPath);
  const result = await verifyFindings(findings, {
    ...verifyOptions,
    repoPath,
    skill,
  });

  return { skill, ...result };
}
