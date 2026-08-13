import { requireServiceContext } from '../context.js';
import type { ServiceContext } from '../context.js';
import type { DatabaseClient, WardenDatabase } from '../db/database.js';

export interface RetentionSettings {
  metricsDays: number;
  findingsDays: number;
  codeDays: number;
  lifecycleDays: number;
}

interface RetentionRow extends Record<string, unknown> {
  metrics_retention_days: number;
  findings_retention_days: number;
  code_retention_days: number;
  lifecycle_retention_days: number;
}

function mapRetention(row: RetentionRow): RetentionSettings {
  return {
    metricsDays: row.metrics_retention_days,
    findingsDays: row.findings_retention_days,
    codeDays: row.code_retention_days,
    lifecycleDays: row.lifecycle_retention_days,
  };
}

/** Load per-data-class retention settings for the authenticated tenant. */
export async function getRetentionSettings(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
): Promise<RetentionSettings | null> {
  const context = requireServiceContext(contextInput);
  const result = await database.query<RetentionRow>(`
    SELECT metrics_retention_days, findings_retention_days,
      code_retention_days, lifecycle_retention_days
    FROM tenants WHERE id = $1 LIMIT 1
  `, [context.tenantId]);
  return result.rows[0] ? mapRetention(result.rows[0]) : null;
}

/** Update positive per-data-class retention windows for the authenticated tenant. */
export async function updateRetentionSettings(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  settings: RetentionSettings,
): Promise<RetentionSettings | null> {
  const context = requireServiceContext(contextInput);
  const result = await database.query<RetentionRow>(`
    UPDATE tenants SET metrics_retention_days = $2, findings_retention_days = $3,
      code_retention_days = $4, lifecycle_retention_days = $5, updated_at = now()
    WHERE id = $1
    RETURNING metrics_retention_days, findings_retention_days,
      code_retention_days, lifecycle_retention_days
  `, [context.tenantId, settings.metricsDays, settings.findingsDays, settings.codeDays, settings.lifecycleDays]);
  return result.rows[0] ? mapRetention(result.rows[0]) : null;
}

/** Apply one tenant's independent metrics, finding, code, and lifecycle retention windows. */
export async function applyTenantRetention(database: WardenDatabase, tenantId: string): Promise<void> {
  await database.transaction(async (client) => {
    const loaded = await client.query<RetentionRow>(`
      SELECT metrics_retention_days, findings_retention_days,
        code_retention_days, lifecycle_retention_days
      FROM tenants WHERE id = $1 FOR UPDATE
    `, [tenantId]);
    const settings = loaded.rows[0];
    if (!settings) return;
    await client.query(`
      UPDATE findings f SET source_evidence = NULL, updated_at = now()
      FROM runs r WHERE f.run_id = r.id AND f.tenant_id = $1
        AND r.completed_at < now() - ($2 * interval '1 day')
    `, [tenantId, settings.code_retention_days]);
    await client.query(`
      DELETE FROM finding_locations fl USING findings f, runs r
      WHERE fl.finding_id = f.id AND f.run_id = r.id AND fl.tenant_id = $1
        AND r.completed_at < now() - ($2 * interval '1 day')
    `, [tenantId, settings.findings_retention_days]);
    await client.query(`
      UPDATE findings f SET title = '[retained finding]', description = '[content expired]',
        verification = NULL, provenance = NULL, source_evidence = NULL,
        updated_at = now()
      FROM runs r WHERE f.run_id = r.id AND f.tenant_id = $1
        AND r.completed_at < now() - ($2 * interval '1 day')
    `, [tenantId, settings.findings_retention_days]);
    await client.query(`
      DELETE FROM runs WHERE tenant_id = $1
        AND completed_at < now() - ($2 * interval '1 day')
    `, [tenantId, settings.metrics_retention_days]);
    await client.query(`
      DELETE FROM memories WHERE tenant_id = $1 AND lifecycle IN ('archived', 'expired', 'superseded')
        AND updated_at < now() - ($2 * interval '1 day')
    `, [tenantId, settings.lifecycle_retention_days]);
  });
}

async function recalculateDerivedState(client: DatabaseClient, tenantId: string): Promise<void> {
  const unsupportedMemories = await client.query<{ id: string }>(`
    UPDATE memories m SET lifecycle = 'archived', archive_reason = 'evidence_deleted',
      version = version + 1, updated_at = now()
    WHERE m.tenant_id = $1 AND m.origin = 'passive' AND m.lifecycle IN ('candidate', 'active')
      AND NOT EXISTS (SELECT 1 FROM memory_evidence me WHERE me.tenant_id = m.tenant_id AND me.memory_id = m.id)
    RETURNING id
  `, [tenantId]);
  if (unsupportedMemories.rows.length > 0) {
    await client.query('DELETE FROM memory_embeddings WHERE tenant_id = $1 AND memory_id = ANY($2::uuid[])', [
      tenantId,
      unsupportedMemories.rows.map((row) => row.id),
    ]);
  }
}

/** Delete one authorized run and invalidate derived memory state lacking evidence. */
export async function deleteRun(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  runId: string,
): Promise<boolean> {
  const context = requireServiceContext(contextInput);
  return database.transaction(async (client) => {
    const values: unknown[] = [context.tenantId, runId];
    if (context.repositoryAllowlist) values.push(context.repositoryAllowlist);
    const authorized = await client.query<{ id: string }>(`
      SELECT r.id FROM runs r JOIN repositories repo
        ON repo.id = r.repository_id AND repo.tenant_id = r.tenant_id
      WHERE r.tenant_id = $1 AND r.id = $2
        ${context.repositoryAllowlist ? 'AND repo.full_name = ANY($3::text[])' : ''}
      FOR UPDATE OF r
    `, values);
    if (!authorized.rows[0]) return false;
    await client.query(`
      DELETE FROM jobs WHERE tenant_id = $1
        AND (entity_id = $2 OR payload_ref->>'runId' = $2::text)
    `, [context.tenantId, runId]);
    await client.query('DELETE FROM runs WHERE tenant_id = $1 AND id = $2', [context.tenantId, runId]);
    await recalculateDerivedState(client, context.tenantId);
    return true;
  });
}

/** Delete one authorized repository and all source-linked history and derived state. */
export async function deleteRepository(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  repositoryId: string,
): Promise<boolean> {
  const context = requireServiceContext(contextInput);
  const values: unknown[] = [context.tenantId, repositoryId];
  if (context.repositoryAllowlist) values.push(context.repositoryAllowlist);
  return database.transaction(async (client) => {
    const deleted = await client.query(`
      DELETE FROM repositories WHERE tenant_id = $1 AND id = $2
        ${context.repositoryAllowlist ? 'AND full_name = ANY($3::text[])' : ''}
    `, values);
    return deleted.rowCount === 1;
  });
}

/** Delete the authenticated tenant and all cascading service data. */
export async function deleteTenant(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
): Promise<boolean> {
  const context = requireServiceContext(contextInput);
  if (context.repositoryAllowlist !== null) return false;
  const deleted = await database.query('DELETE FROM tenants WHERE id = $1', [context.tenantId]);
  return deleted.rowCount === 1;
}

export interface ServiceExportRecord {
  type: 'repository' | 'run' | 'skill' | 'usage' | 'finding' | 'memory';
  id: string;
  repositoryId?: string;
  data: Record<string, unknown>;
}

/** Export bounded, explicitly selected retained fields inside authenticated repository scope. */
export async function exportServiceData(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  repositoryId?: string,
): Promise<ServiceExportRecord[]> {
  const context = requireServiceContext(contextInput);
  const values: unknown[] = [context.tenantId];
  const repositoryConditions = ['tenant_id = $1'];
  if (repositoryId) {
    values.push(repositoryId);
    repositoryConditions.push(`id = $${values.length}`);
  }
  if (context.repositoryAllowlist) {
    values.push(context.repositoryAllowlist);
    repositoryConditions.push(`full_name = ANY($${values.length}::text[])`);
  }
  const repositories = await database.query<{
    id: string; provider: string; owner: string; name: string; full_name: string;
    memory_enabled: boolean;
  }>(`
    SELECT id, provider, owner, name, full_name, memory_enabled
    FROM repositories WHERE ${repositoryConditions.join(' AND ')} ORDER BY id LIMIT 1_000
  `, values);
  const repositoryIds = repositories.rows.map((row) => row.id);
  if (repositoryIds.length === 0) return [];
  const queries = await Promise.all([
    database.query<{ id: string; repository_id: string; data: Record<string, unknown> }>(`
      SELECT id, repository_id, jsonb_build_object(
        'clientRunId', client_run_id, 'source', source, 'dataProfile', data_profile,
        'wardenVersion', warden_version, 'startedAt', started_at, 'completedAt', completed_at,
        'outcome', outcome, 'traceId', trace_id, 'headSha', head_sha, 'event', event,
        'findingCount', finding_count, 'highCount', high_count, 'mediumCount', medium_count, 'lowCount', low_count
      ) AS data FROM runs WHERE tenant_id = $1 AND repository_id = ANY($2::uuid[])
      ORDER BY completed_at, id LIMIT 10_000
    `, [context.tenantId, repositoryIds]),
    database.query<{ id: string; repository_id: string; data: Record<string, unknown> }>(`
      SELECT se.id, r.repository_id, jsonb_build_object(
        'runId', se.run_id, 'skill', se.skill, 'status', se.status, 'model', se.model,
        'runtime', se.runtime, 'errorCode', se.error_code, 'durationMs', se.duration_ms,
        'findingCount', se.finding_count
      ) AS data FROM skill_executions se JOIN runs r ON r.id = se.run_id AND r.tenant_id = se.tenant_id
      WHERE se.tenant_id = $1 AND r.repository_id = ANY($2::uuid[]) LIMIT 20_000
    `, [context.tenantId, repositoryIds]),
    database.query<{ id: string; repository_id: string; data: Record<string, unknown> }>(`
      SELECT u.id, r.repository_id, jsonb_build_object(
        'runId', u.run_id, 'skillExecutionId', u.skill_execution_id, 'lane', u.lane,
        'operation', u.operation, 'provider', u.provider, 'model', u.model, 'runtime', u.runtime,
        'inputTokens', u.input_tokens, 'outputTokens', u.output_tokens, 'costUsd', u.cost_usd, 'costBasis', u.cost_basis
      ) AS data FROM usage_line_items u JOIN runs r ON r.id = u.run_id AND r.tenant_id = u.tenant_id
      WHERE u.tenant_id = $1 AND r.repository_id = ANY($2::uuid[]) LIMIT 50_000
    `, [context.tenantId, repositoryIds]),
    database.query<{ id: string; repository_id: string; data: Record<string, unknown> }>(`
      SELECT f.id, r.repository_id, jsonb_build_object(
        'runId', f.run_id, 'skillExecutionId', f.skill_execution_id, 'severity', f.severity,
        'confidence', f.confidence, 'title', f.title, 'description', f.description,
        'verification', f.verification, 'sourceEvidence', f.source_evidence
      ) AS data FROM findings f JOIN runs r ON r.id = f.run_id AND r.tenant_id = f.tenant_id
      WHERE f.tenant_id = $1 AND r.repository_id = ANY($2::uuid[]) LIMIT 50_000
    `, [context.tenantId, repositoryIds]),
    database.query<{ id: string; repository_id: string; data: Record<string, unknown> }>(`
      SELECT id, repository_id, jsonb_build_object(
        'version', version, 'kind', kind, 'lifecycle', lifecycle, 'origin', origin,
        'content', content, 'skill', skill, 'language', language, 'pathFamily', path_family,
        'observedAt', observed_at, 'expiresAt', expires_at
      ) AS data FROM memories WHERE tenant_id = $1 AND repository_id = ANY($2::uuid[]) LIMIT 10_000
    `, [context.tenantId, repositoryIds]),
  ]);
  const types = ['run', 'skill', 'usage', 'finding', 'memory'] as const;
  return [
    ...repositories.rows.map((row): ServiceExportRecord => ({
      type: 'repository', id: row.id, repositoryId: row.id,
      data: {
        provider: row.provider, owner: row.owner, name: row.name, fullName: row.full_name,
        memoryEnabled: row.memory_enabled,
      },
    })),
    ...queries.flatMap((query, index) => {
      const type = types[index];
      return type ? query.rows.map((row): ServiceExportRecord => ({
        type, id: row.id, repositoryId: row.repository_id, data: row.data,
      })) : [];
    }),
  ];
}
