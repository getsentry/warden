import type {
  CodeFindingRecord,
  RunEnvelopeV1,
  UsageLineItem,
} from '@sentry/warden-service-api';
import { sha256Checksum } from '@sentry/warden-service-api';
import { canAccessRepository, requireServiceContext } from '../context.js';
import type { ServiceContext } from '../context.js';
import type { DatabaseClient, WardenDatabase } from '../db/database.js';

export class RunIngestionError extends Error {
  constructor(readonly code: 'repository_forbidden' | 'checksum_conflict' | 'invalid_reference') {
    super(code);
    this.name = 'RunIngestionError';
  }
}

export interface IngestRunResult {
  runId: string;
  checksum: string;
  created: boolean;
}

async function resolveRepository(
  client: DatabaseClient,
  context: ServiceContext,
  envelope: RunEnvelopeV1,
): Promise<string> {
  if (!canAccessRepository(context, envelope.repository.fullName)) {
    throw new RunIngestionError('repository_forbidden');
  }
  const result = await client.query<{ id: string }>(`
    INSERT INTO repositories (
      tenant_id, provider, owner, name, full_name, memory_enabled
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (tenant_id, provider, owner, name) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      memory_enabled = repositories.memory_enabled OR EXCLUDED.memory_enabled,
      updated_at = now()
    RETURNING id
  `, [
    context.tenantId,
    envelope.repository.provider,
    envelope.repository.owner,
    envelope.repository.name,
    envelope.repository.fullName,
    envelope.features.memory,
  ]);
  const id = result.rows[0]?.id;
  if (!id) throw new RunIngestionError('invalid_reference');
  return id;
}

async function insertRun(
  client: DatabaseClient,
  context: ServiceContext,
  repositoryId: string,
  envelope: RunEnvelopeV1,
  checksum: string,
): Promise<string> {
  const counts = envelope.findingCounts;
  const result = await client.query<{ id: string }>(`
    INSERT INTO runs (
      tenant_id, repository_id, client_run_id, envelope_version, envelope_checksum,
      source, data_profile, warden_version, started_at, completed_at, outcome,
      trace_id, head_sha, event, pull_request, memory_enabled,
      finding_count, high_count, medium_count, low_count
    ) VALUES (
      $1, $2, $3, $4, $5, $6::run_source, $7::data_profile, $8, $9, $10,
      $11::run_outcome, $12, $13, $14, $15, $16, $17, $18, $19, $20
    ) RETURNING id
  `, [
    context.tenantId,
    repositoryId,
    envelope.clientRunId,
    envelope.protocolVersion,
    checksum,
    envelope.source,
    envelope.dataProfile,
    envelope.wardenVersion,
    envelope.startedAt,
    envelope.completedAt,
    envelope.outcome,
    envelope.traceId ?? null,
    envelope.headSha ?? null,
    envelope.event ?? null,
    envelope.pullRequest ? JSON.stringify(envelope.pullRequest) : null,
    envelope.features.memory,
    counts.total,
    counts.bySeverity.high,
    counts.bySeverity.medium,
    counts.bySeverity.low,
  ]);
  const id = result.rows[0]?.id;
  if (!id) throw new RunIngestionError('invalid_reference');
  return id;
}

async function insertUsage(
  client: DatabaseClient,
  context: ServiceContext,
  runId: string,
  skillExecutionId: string | null,
  usage: UsageLineItem,
): Promise<void> {
  await client.query(`
    INSERT INTO usage_line_items (
      tenant_id, run_id, skill_execution_id, lane, operation, provider, model, runtime,
      input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens,
      cache_creation_5m_input_tokens, cache_creation_1h_input_tokens, web_search_requests,
      cost_usd, cost_basis
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::cost_basis
    )
  `, [
    context.tenantId,
    runId,
    skillExecutionId,
    usage.lane,
    usage.operation ?? null,
    usage.provider ?? null,
    usage.model ?? null,
    usage.runtime ?? null,
    usage.inputTokens ?? null,
    usage.outputTokens ?? null,
    usage.cacheReadInputTokens ?? null,
    usage.cacheCreationInputTokens ?? null,
    usage.cacheCreation5mInputTokens ?? null,
    usage.cacheCreation1hInputTokens ?? null,
    usage.webSearchRequests ?? null,
    usage.costUsd,
    usage.costBasis,
  ]);
}

async function insertSkills(
  client: DatabaseClient,
  context: ServiceContext,
  runId: string,
  envelope: RunEnvelopeV1,
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const skill of envelope.skills) {
    const counts = skill.findingCounts;
    const result = await client.query<{ id: string }>(`
      INSERT INTO skill_executions (
        tenant_id, run_id, client_execution_id, skill, skill_digest, trigger_id, trigger_name,
        model, runtime, status, error_code, duration_ms, finding_count, high_count, medium_count, low_count
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::execution_status, $11, $12, $13, $14, $15, $16
      ) RETURNING id
    `, [
      context.tenantId,
      runId,
      skill.executionId,
      skill.skill,
      skill.skillDigest ?? null,
      skill.triggerId ?? null,
      skill.triggerName ?? null,
      skill.model ?? null,
      skill.runtime ?? null,
      skill.status,
      skill.errorCode ?? null,
      skill.durationMs ?? null,
      counts.total,
      counts.bySeverity.high,
      counts.bySeverity.medium,
      counts.bySeverity.low,
    ]);
    const id = result.rows[0]?.id;
    if (!id) throw new RunIngestionError('invalid_reference');
    ids.set(skill.executionId, id);
    for (const usage of skill.usage) await insertUsage(client, context, runId, id, usage);
  }
  return ids;
}

async function insertFindingLocations(
  client: DatabaseClient,
  context: ServiceContext,
  findingId: string,
  finding: CodeFindingRecord,
): Promise<void> {
  const locations = [finding.location, ...(finding.additionalLocations ?? [])].filter((location) => location !== undefined);
  for (const [ordinal, location] of locations.entries()) {
    await client.query(`
      INSERT INTO finding_locations (tenant_id, finding_id, path, start_line, end_line, ordinal)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [context.tenantId, findingId, location.path, location.startLine, location.endLine ?? null, ordinal]);
  }
}

async function insertFindings(
  client: DatabaseClient,
  context: ServiceContext,
  runId: string,
  envelope: RunEnvelopeV1,
  skillIds: ReadonlyMap<string, string>,
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  if (envelope.dataProfile === 'metrics') return ids;
  for (const finding of envelope.findings) {
    const skillExecutionId = skillIds.get(finding.skillExecutionId);
    if (!skillExecutionId) throw new RunIngestionError('invalid_reference');
    const codeFinding = finding as CodeFindingRecord;
    const result = await client.query<{ id: string }>(`
      INSERT INTO findings (
        tenant_id, run_id, skill_execution_id, client_finding_id, reported_id, severity,
        confidence, title, description, verification, provenance, source_evidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      context.tenantId,
      runId,
      skillExecutionId,
      finding.id,
      finding.reportedId ?? null,
      finding.severity,
      finding.confidence ?? null,
      finding.title,
      finding.description,
      finding.verification ?? null,
      finding.provenance ? JSON.stringify(finding.provenance) : null,
      envelope.dataProfile === 'code' && codeFinding.sourceEvidence ? JSON.stringify(codeFinding.sourceEvidence) : null,
    ]);
    const id = result.rows[0]?.id;
    if (!id) throw new RunIngestionError('invalid_reference');
    ids.set(finding.id, id);
    await insertFindingLocations(client, context, id, codeFinding);
  }
  return ids;
}

async function insertObservations(
  client: DatabaseClient,
  context: ServiceContext,
  runId: string,
  envelope: RunEnvelopeV1,
  skillIds: ReadonlyMap<string, string>,
  findingIds: ReadonlyMap<string, string>,
): Promise<void> {
  if (envelope.dataProfile === 'metrics') return;
  for (const observation of envelope.observations) {
    const findingId = findingIds.get(observation.findingId);
    const skillExecutionId = observation.skillExecutionId
      ? skillIds.get(observation.skillExecutionId)
      : null;
    if (!findingId || (observation.skillExecutionId && !skillExecutionId)) {
      throw new RunIngestionError('invalid_reference');
    }
    await client.query(`
      INSERT INTO finding_observations (
        tenant_id, run_id, finding_id, skill_execution_id, outcome, reason, observed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      context.tenantId,
      runId,
      findingId,
      skillExecutionId,
      observation.outcome,
      observation.reason ?? null,
      observation.observedAt,
    ]);
  }
}

async function linkMemoryRecall(
  client: DatabaseClient,
  context: ServiceContext,
  repositoryId: string,
  runId: string,
  envelope: RunEnvelopeV1,
): Promise<void> {
  const references = envelope.recalledMemories ?? [];
  if (!envelope.memoryRecallId) {
    if (references.length > 0) throw new RunIngestionError('invalid_reference');
    return;
  }
  const batch = await client.query<{
    id: string;
    run_id: string | null;
    provider: string | null;
    model: string | null;
    runtime: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
    cost_usd: string | null;
    cost_basis: UsageLineItem['costBasis'] | null;
  }>(`
    SELECT id, run_id, provider, model, runtime, input_tokens, output_tokens, cost_usd, cost_basis
    FROM memory_recall_batches
    WHERE tenant_id = $1 AND repository_id = $2 AND client_recall_id = $3
    FOR UPDATE
  `, [context.tenantId, repositoryId, envelope.memoryRecallId]);
  const recalled = batch.rows[0];
  if (!recalled) throw new RunIngestionError('invalid_reference');
  if (recalled.run_id && recalled.run_id !== runId) throw new RunIngestionError('invalid_reference');
  const stored = await client.query<{ memory_id: string; lifecycle_version: number }>(`
    SELECT memory_id, lifecycle_version FROM memory_recalls
    WHERE tenant_id = $1 AND batch_id = $2
    ORDER BY memory_id
  `, [context.tenantId, recalled.id]);
  const expected = [...references]
    .map(({ id, version }) => `${id}:${version}`)
    .sort();
  const actual = stored.rows
    .map(({ memory_id, lifecycle_version }) => `${memory_id}:${lifecycle_version}`)
    .sort();
  if (expected.length !== actual.length || expected.some((reference, index) => reference !== actual[index])) {
    throw new RunIngestionError('invalid_reference');
  }
  await client.query(`
    UPDATE memory_recall_batches SET run_id = $3
    WHERE tenant_id = $1 AND id = $2 AND (run_id IS NULL OR run_id = $3)
  `, [context.tenantId, recalled.id, runId]);
  await client.query(`
    UPDATE memory_recalls SET run_id = $3
    WHERE tenant_id = $1 AND batch_id = $2
  `, [context.tenantId, recalled.id, runId]);
  if (recalled.cost_usd !== null || recalled.input_tokens !== null || recalled.output_tokens !== null) {
    await insertUsage(client, context, runId, null, {
      lane: 'service',
      operation: 'memory_relevance',
      ...(recalled.provider ? { provider: recalled.provider } : {}),
      ...(recalled.model ? { model: recalled.model } : {}),
      ...(recalled.runtime ? { runtime: recalled.runtime } : {}),
      ...(recalled.input_tokens === null ? {} : { inputTokens: recalled.input_tokens }),
      ...(recalled.output_tokens === null ? {} : { outputTokens: recalled.output_tokens }),
      costUsd: recalled.cost_usd === null ? null : Number(recalled.cost_usd),
      costBasis: recalled.cost_basis ?? 'unknown',
    });
  }
}

async function enqueueDerivedJobs(
  client: DatabaseClient,
  context: ServiceContext,
  repositoryId: string,
  runId: string,
  envelope: RunEnvelopeV1,
): Promise<void> {
  const jobTypes = envelope.features.memory
    && envelope.dataProfile !== 'metrics'
    && envelope.observations.length > 0
    ? ['memory_extract']
    : [];
  for (const type of jobTypes) {
    await client.query(`
      INSERT INTO jobs (
        tenant_id, repository_id, type, entity_id, input_version, idempotency_key, payload_ref
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
    `, [
      context.tenantId,
      repositoryId,
      type,
      runId,
      envelope.protocolVersion,
      `${type}:run:${runId}:v${envelope.protocolVersion}`,
      JSON.stringify({ runId }),
    ]);
  }
}

/** Persist one canonical envelope and all child records in one idempotent transaction. */
export async function ingestRun(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  envelope: RunEnvelopeV1,
): Promise<IngestRunResult> {
  const context = requireServiceContext(contextInput);
  const checksum = await sha256Checksum(envelope);
  return database.transaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
      `${context.tenantId}:${envelope.clientRunId}`,
    ]);
    const existing = await client.query<{ id: string; envelope_checksum: string }>(`
      SELECT id, envelope_checksum FROM runs
      WHERE tenant_id = $1 AND client_run_id = $2
      FOR UPDATE
    `, [context.tenantId, envelope.clientRunId]);
    const prior = existing.rows[0];
    if (prior) {
      if (prior.envelope_checksum !== checksum) throw new RunIngestionError('checksum_conflict');
      return { runId: prior.id, checksum, created: false };
    }

    const repositoryId = await resolveRepository(client, context, envelope);
    const runId = await insertRun(client, context, repositoryId, envelope, checksum);
    const skillIds = await insertSkills(client, context, runId, envelope);
    const findingIds = await insertFindings(client, context, runId, envelope, skillIds);
    await insertObservations(client, context, runId, envelope, skillIds, findingIds);
    await linkMemoryRecall(client, context, repositoryId, runId, envelope);
    await enqueueDerivedJobs(client, context, repositoryId, runId, envelope);
    return { runId, checksum, created: true };
  });
}
