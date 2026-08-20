import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { FindingsOutputSchema } from '../../action/reporting/output.js';
import { loadWardenConfigFile } from '../../config/loader.js';
import { getVersion } from '../../utils/index.js';
import {
  buildFindingsServiceRunEnvelope,
  buildServiceRunEnvelope,
  publishRunFailOpen,
  resolveServiceOptions,
} from '../../service/index.js';
import type { ResolvedServiceOptions } from '../../service/index.js';
import { parseJsonlReports } from '../output/index.js';
import type { Reporter } from '../output/index.js';
import { getRepoName, getRepoRoot } from '../git.js';
import { loadReviews, publishSidecarReviews, reviewFilePath } from '../inspect/reviews.js';
import type { CLIOptions, ServiceCommandOptions } from '../args.js';

function envelopeFromJsonl(content: string, service: ResolvedServiceOptions, artifactPath: string) {
  const parsed = parseJsonlReports(content);
  if (!parsed.runMetadata || parsed.reports.length === 0) throw new TypeError('JSONL artifact has no completed run records');
  const cwd = parsed.runMetadata.cwd || dirname(artifactPath);
  let repository: { owner: string; name: string };
  try {
    repository = getRepoName(cwd);
  } catch {
    repository = { owner: 'local', name: basename(cwd) || 'repository' };
  }
  const startedAt = new Date(parsed.runMetadata.timestamp);
  return buildServiceRunEnvelope({
    service,
    clientRunId: parsed.runMetadata.runId,
    source: 'replay',
    wardenVersion: getVersion(),
    startedAt,
    completedAt: new Date(startedAt.getTime() + parsed.totalDurationMs),
    outcome: parsed.reports.some((report) => report.error) ? 'failure' : 'success',
    repository: {
      provider: 'local',
      owner: repository.owner,
      name: repository.name,
      fullName: `${repository.owner}/${repository.name}`,
    },
    reports: parsed.reports.map((report, index) => ({ executionId: `${index + 1}:${report.skill}`, report })),
    ...(parsed.runMetadata.traceId ? { traceId: parsed.runMetadata.traceId } : {}),
    ...(parsed.runMetadata.headSha ? { headSha: parsed.runMetadata.headSha } : {}),
  });
}

/** Parse a supported historical artifact and rebuild a currently redacted envelope. */
export function buildReplayEnvelope(content: string, service: ResolvedServiceOptions, artifactPath: string) {
  try {
    const findings = FindingsOutputSchema.safeParse(JSON.parse(content));
    if (findings.success) return buildFindingsServiceRunEnvelope(findings.data, service, 'replay');
  } catch {
    // JSONL is parsed below through its backward-compatible reader.
  }
  return envelopeFromJsonl(content, service, artifactPath);
}

/** Publish one saved Warden artifact without changing or deleting the local file. */
export async function runServiceCommand(
  command: ServiceCommandOptions,
  options: CLIOptions,
  reporter: Reporter,
): Promise<number> {
  const artifactPath = resolve(command.artifact);
  if (!existsSync(artifactPath)) {
    reporter.error(`Artifact not found: ${artifactPath}`);
    return 1;
  }
  const configPath = resolve(process.cwd(), 'warden.toml');
  let config: ReturnType<typeof loadWardenConfigFile> | undefined;
  if (existsSync(configPath)) {
    try {
      config = loadWardenConfigFile(configPath);
    } catch {
      reporter.warning('Could not read warden.toml. Replaying with the command-line service settings.');
    }
  }
  const service = resolveServiceOptions({
    explicit: {
      url: options.serviceUrl,
      data: options.serviceData,
      memory: options.serviceMemory,
      timeoutMs: options.serviceTimeoutMs,
      disabled: options.noService,
    },
    config: config?.service,
    onWarning: (message) => reporter.warning(message),
  });
  if (!service) {
    reporter.error('Warden service is not configured for replay.');
    return 1;
  }
  let envelope;
  try {
    envelope = buildReplayEnvelope(readFileSync(artifactPath, 'utf8'), service, artifactPath);
  } catch {
    reporter.error('Artifact is not a supported completed JSONL or findings-output file.');
    return 1;
  }
  const published = await publishRunFailOpen(service, envelope, (message) => reporter.warning(message));
  if (!published) return 1;
  reporter.success(`Published run ${envelope.clientRunId}.`);
  await publishReplayReviews(service, envelope.clientRunId, artifactPath, options, reporter);
  return 0;
}

async function publishReplayReviews(
  service: ResolvedServiceOptions,
  clientRunId: string,
  artifactPath: string,
  options: CLIOptions,
  reporter: Reporter,
): Promise<void> {
  let repoRoot: string;
  try {
    repoRoot = getRepoRoot(options.cwd ?? process.cwd());
  } catch {
    repoRoot = process.cwd();
  }
  if (!existsSync(reviewFilePath(repoRoot, clientRunId))) return;
  let reviewFile;
  try {
    reviewFile = loadReviews(repoRoot, clientRunId, artifactPath);
  } catch (err) {
    reporter.warning(
      `Could not load review sidecar for run ${clientRunId}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return;
  }
  await publishSidecarReviews(reviewFile, service, (message) => reporter.warning(message));
}
