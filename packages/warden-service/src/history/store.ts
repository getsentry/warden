import type {
  CostAggregateResponse,
  FindingFeedItem,
  FindingListResponse,
  OutcomeSummaryResponse,
  RepositoryListResponse,
  RunDetailResponse,
  RunListResponse,
  RunSummary,
  SkillListResponse,
  UsageLineItem,
} from '@sentry/warden-service-api';
import { requireServiceContext } from '../context.js';
import type { ServiceContext } from '../context.js';
import type { WardenDatabase } from '../db/database.js';

export interface HistoryFilters {
  from?: string;
  to?: string;
  repositoryId?: string;
  skill?: string;
  model?: string;
  runtime?: string;
  provider?: string;
  lane?: string;
  source?: 'cli' | 'action' | 'sdk' | 'replay';
  outcome?: 'success' | 'failure' | 'cancelled' | 'skipped';
  errorCode?: string;
}

export interface RunListFilters extends HistoryFilters {
  cursor?: string;
  limit?: number;
}

export interface FindingListFilters {
  from?: string;
  to?: string;
  repositoryId?: string;
  skill?: string;
  severity?: 'high' | 'medium' | 'low';
  outcome?: FindingFeedItem['outcome'];
  query?: string;
  cursor?: string;
  limit?: number;
}

export type CostDimension = 'day' | 'repository' | 'skill' | 'model' | 'runtime' | 'provider' | 'lane' | 'source' | 'outcome';

interface RunRow extends Record<string, unknown> {
  id: string;
  client_run_id: string;
  source: RunSummary['source'];
  data_profile: RunSummary['dataProfile'];
  provider: RunSummary['repository']['provider'];
  owner: string;
  name: string;
  full_name: string;
  started_at: Date | string;
  completed_at: Date | string;
  outcome: RunSummary['outcome'];
  finding_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  cost_usd: string | number | null;
  trace_id: string | null;
}

function numberOrNull(value: string | number | null): number | null {
  return value === null ? null : Number(value);
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRun(row: RunRow): RunSummary {
  const startedAt = iso(row.started_at);
  const completedAt = iso(row.completed_at);
  return {
    id: row.id,
    clientRunId: row.client_run_id,
    source: row.source,
    dataProfile: row.data_profile,
    repository: {
      provider: row.provider,
      owner: row.owner,
      name: row.name,
      fullName: row.full_name,
    },
    startedAt,
    completedAt,
    outcome: row.outcome,
    durationMs: Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime()),
    findingCounts: {
      total: row.finding_count,
      bySeverity: { high: row.high_count, medium: row.medium_count, low: row.low_count },
    },
    costUsd: numberOrNull(row.cost_usd),
    ...(row.trace_id ? { traceId: row.trace_id } : {}),
  };
}

function addFilter(conditions: string[], values: unknown[], expression: string, value: unknown): void {
  values.push(value);
  conditions.push(`${expression} $${values.length}`);
}

function historyWhere(context: ServiceContext, filters: HistoryFilters, aliases = { run: 'r', repository: 'repo', skill: 'se', usage: 'u' }) {
  const values: unknown[] = [context.tenantId];
  const conditions = [`${aliases.run}.tenant_id = $1`];
  if (context.repositoryAllowlist) {
    values.push(context.repositoryAllowlist);
    conditions.push(`${aliases.repository}.full_name = ANY($${values.length}::text[])`);
  }
  if (filters.from) addFilter(conditions, values, `${aliases.run}.completed_at >=`, filters.from);
  if (filters.to) addFilter(conditions, values, `${aliases.run}.completed_at <=`, filters.to);
  if (filters.repositoryId) addFilter(conditions, values, `${aliases.run}.repository_id =`, filters.repositoryId);
  if (filters.source) addFilter(conditions, values, `${aliases.run}.source =`, filters.source);
  if (filters.outcome) addFilter(conditions, values, `${aliases.run}.outcome =`, filters.outcome);
  if (filters.skill) addFilter(conditions, values, `${aliases.skill}.skill =`, filters.skill);
  if (filters.errorCode) addFilter(conditions, values, `${aliases.skill}.error_code =`, filters.errorCode);
  if (filters.model) addFilter(conditions, values, `${aliases.usage}.model =`, filters.model);
  if (filters.runtime) addFilter(conditions, values, `${aliases.usage}.runtime =`, filters.runtime);
  if (filters.provider) addFilter(conditions, values, `${aliases.usage}.provider =`, filters.provider);
  if (filters.lane) addFilter(conditions, values, `${aliases.usage}.lane =`, filters.lane);
  return { conditions, values };
}

function encodeCursor(completedAt: Date | string, id: string): string {
  return Buffer.from(JSON.stringify([iso(completedAt), id]), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): [string, string] {
  const decoded: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  if (!Array.isArray(decoded) || decoded.length !== 2 || decoded.some((part) => typeof part !== 'string')) {
    throw new TypeError('invalid cursor');
  }
  return decoded as [string, string];
}

interface FindingFeedRow extends Record<string, unknown> {
  id: string;
  run_id: string;
  client_run_id: string;
  provider: FindingFeedItem['repository']['provider'];
  owner: string;
  name: string;
  full_name: string;
  skill: string;
  severity: FindingFeedItem['severity'];
  confidence: FindingFeedItem['confidence'] | null;
  title: string;
  description: string;
  path: string | null;
  start_line: number | null;
  end_line: number | null;
  observation_outcome: FindingFeedItem['outcome'];
  observed_at: Date | string | null;
  completed_at: Date | string;
}

function mapFinding(row: FindingFeedRow): FindingFeedItem {
  return {
    id: row.id,
    runId: row.run_id,
    clientRunId: row.client_run_id,
    repository: {
      provider: row.provider,
      owner: row.owner,
      name: row.name,
      fullName: row.full_name,
    },
    skill: row.skill,
    severity: row.severity,
    ...(row.confidence ? { confidence: row.confidence } : {}),
    title: row.title,
    description: row.description,
    ...(row.path && row.start_line ? {
      location: {
        path: row.path,
        startLine: row.start_line,
        ...(row.end_line ? { endLine: row.end_line } : {}),
      },
    } : {}),
    outcome: row.observation_outcome,
    observedAt: row.observed_at ? iso(row.observed_at) : null,
    completedAt: iso(row.completed_at),
  };
}

/** List authorized findings newest first for dashboard and API investigations. */
export async function listFindings(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  filters: FindingListFilters,
): Promise<FindingListResponse> {
  const context = requireServiceContext(contextInput);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
  const values: unknown[] = [context.tenantId];
  const conditions = ['f.tenant_id = $1'];
  if (context.repositoryAllowlist) {
    values.push(context.repositoryAllowlist);
    conditions.push(`repo.full_name = ANY($${values.length}::text[])`);
  }
  if (filters.from) addFilter(conditions, values, 'r.completed_at >=', filters.from);
  if (filters.to) addFilter(conditions, values, 'r.completed_at <=', filters.to);
  if (filters.repositoryId) addFilter(conditions, values, 'r.repository_id =', filters.repositoryId);
  if (filters.skill) addFilter(conditions, values, 'se.skill =', filters.skill);
  if (filters.severity) addFilter(conditions, values, 'f.severity =', filters.severity);
  if (filters.outcome) addFilter(conditions, values, 'observation.outcome =', filters.outcome);
  if (filters.query) {
    values.push(filters.query.toLowerCase());
    conditions.push(`POSITION($${values.length} IN LOWER(f.title || ' ' || f.description || ' ' || COALESCE(location.path, ''))) > 0`);
  }
  if (filters.cursor) {
    const [completedAt, id] = decodeCursor(filters.cursor);
    values.push(completedAt, id);
    conditions.push(`(r.completed_at, f.id) < ($${values.length - 1}, $${values.length})`);
  }
  values.push(limit + 1);
  const result = await database.query<FindingFeedRow>(`
    SELECT f.id, f.run_id, r.client_run_id, repo.provider, repo.owner, repo.name, repo.full_name,
      se.skill, f.severity, f.confidence, f.title, f.description,
      location.path, location.start_line, location.end_line,
      observation.outcome AS observation_outcome, observation.observed_at, r.completed_at
    FROM findings f
    JOIN runs r ON r.id = f.run_id AND r.tenant_id = f.tenant_id
    JOIN repositories repo ON repo.id = r.repository_id AND repo.tenant_id = r.tenant_id
    JOIN skill_executions se ON se.id = f.skill_execution_id AND se.tenant_id = f.tenant_id
    LEFT JOIN LATERAL (
      SELECT fl.path, fl.start_line, fl.end_line
      FROM finding_locations fl
      WHERE fl.tenant_id = f.tenant_id AND fl.finding_id = f.id
      ORDER BY fl.ordinal LIMIT 1
    ) location ON true
    LEFT JOIN LATERAL (
      SELECT fo.outcome, fo.observed_at
      FROM finding_observations fo
      WHERE fo.tenant_id = f.tenant_id AND fo.finding_id = f.id
      ORDER BY fo.observed_at DESC, fo.id DESC LIMIT 1
    ) observation ON true
    WHERE ${conditions.join(' AND ')}
    ORDER BY r.completed_at DESC, f.id DESC
    LIMIT $${values.length}
  `, values);
  const page = result.rows.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page.map(mapFinding),
    ...(result.rows.length > limit && last ? { nextCursor: encodeCursor(last.completed_at, last.id) } : {}),
  };
}

/** List runs visible to an authenticated tenant with stable cursor pagination. */
export async function listRuns(database: WardenDatabase, contextInput: ServiceContext | undefined, filters: RunListFilters): Promise<RunListResponse> {
  const context = requireServiceContext(contextInput);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
  const { conditions, values } = historyWhere(context, filters);
  if (filters.skill || filters.errorCode) conditions.push('se.id IS NOT NULL');
  if (filters.model || filters.runtime || filters.provider || filters.lane) conditions.push('u.id IS NOT NULL');
  if (filters.cursor) {
    const [completedAt, id] = decodeCursor(filters.cursor);
    values.push(completedAt, id);
    conditions.push(`(r.completed_at, r.id) < ($${values.length - 1}, $${values.length})`);
  }
  values.push(limit + 1);
  const result = await database.query<RunRow>(`
    SELECT DISTINCT
      r.id, r.client_run_id, r.source, r.data_profile, r.started_at, r.completed_at,
      r.outcome, r.finding_count, r.high_count, r.medium_count, r.low_count, r.trace_id,
      repo.provider, repo.owner, repo.name, repo.full_name,
      (SELECT SUM(cost_usd) FROM usage_line_items totals WHERE totals.run_id = r.id) AS cost_usd
    FROM runs r
    JOIN repositories repo ON repo.id = r.repository_id AND repo.tenant_id = r.tenant_id
    LEFT JOIN usage_line_items u ON u.run_id = r.id AND u.tenant_id = r.tenant_id
    LEFT JOIN skill_executions se ON se.id = u.skill_execution_id AND se.tenant_id = r.tenant_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY r.completed_at DESC, r.id DESC
    LIMIT $${values.length}
  `, values);
  const page = result.rows.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page.map(mapRun),
    ...(result.rows.length > limit && last ? { nextCursor: encodeCursor(last.completed_at, last.id) } : {}),
  };
}

interface SkillRow extends Record<string, unknown> {
  id: string;
  client_execution_id: string;
  skill: string;
  status: 'success' | 'failure' | 'cancelled' | 'skipped';
  model: string | null;
  runtime: string | null;
  duration_ms: string | number | null;
  finding_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

interface UsageRow extends Record<string, unknown> {
  skill_execution_id: string;
  lane: string;
  operation: string | null;
  provider: string | null;
  model: string | null;
  runtime: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_input_tokens: number | null;
  cache_creation_input_tokens: number | null;
  cache_creation_5m_input_tokens: number | null;
  cache_creation_1h_input_tokens: number | null;
  web_search_requests: number | null;
  cost_usd: string | number | null;
  cost_basis: UsageLineItem['costBasis'];
}

function mapUsage(row: UsageRow): UsageLineItem {
  return {
    lane: row.lane,
    ...(row.operation ? { operation: row.operation } : {}),
    ...(row.provider ? { provider: row.provider } : {}),
    ...(row.model ? { model: row.model } : {}),
    ...(row.runtime ? { runtime: row.runtime } : {}),
    ...(row.input_tokens !== null ? { inputTokens: row.input_tokens } : {}),
    ...(row.output_tokens !== null ? { outputTokens: row.output_tokens } : {}),
    ...(row.cache_read_input_tokens !== null ? { cacheReadInputTokens: row.cache_read_input_tokens } : {}),
    ...(row.cache_creation_input_tokens !== null ? { cacheCreationInputTokens: row.cache_creation_input_tokens } : {}),
    ...(row.cache_creation_5m_input_tokens !== null ? { cacheCreation5mInputTokens: row.cache_creation_5m_input_tokens } : {}),
    ...(row.cache_creation_1h_input_tokens !== null ? { cacheCreation1hInputTokens: row.cache_creation_1h_input_tokens } : {}),
    ...(row.web_search_requests !== null ? { webSearchRequests: row.web_search_requests } : {}),
    costUsd: numberOrNull(row.cost_usd),
    costBasis: row.cost_basis,
  };
}

/** Return one run and its skill/usage breakdown without revealing cross-tenant ID existence. */
export async function getRunDetail(database: WardenDatabase, contextInput: ServiceContext | undefined, runId: string): Promise<RunDetailResponse | null> {
  const context = requireServiceContext(contextInput);
  const values: unknown[] = [context.tenantId, runId];
  const repositoryScope = context.repositoryAllowlist
    ? (() => {
        values.push(context.repositoryAllowlist);
        return `AND repo.full_name = ANY($${values.length}::text[])`;
      })()
    : '';
  const runs = await database.query<RunRow>(`
    SELECT r.id, r.client_run_id, r.source, r.data_profile, r.started_at, r.completed_at,
      r.outcome, r.finding_count, r.high_count, r.medium_count, r.low_count, r.trace_id,
      repo.provider, repo.owner, repo.name, repo.full_name,
      (SELECT SUM(cost_usd) FROM usage_line_items totals WHERE totals.run_id = r.id) AS cost_usd
    FROM runs r JOIN repositories repo ON repo.id = r.repository_id AND repo.tenant_id = r.tenant_id
    WHERE r.tenant_id = $1 AND r.id = $2 ${repositoryScope}
  `, values);
  const run = runs.rows[0];
  if (!run) return null;
  const skills = await database.query<SkillRow>(`
    SELECT id, client_execution_id, skill, status, model, runtime, duration_ms,
      finding_count, high_count, medium_count, low_count
    FROM skill_executions WHERE tenant_id = $1 AND run_id = $2 ORDER BY created_at, id
  `, [context.tenantId, runId]);
  const usage = await database.query<UsageRow>(`
    SELECT skill_execution_id, lane, operation, provider, model, runtime, input_tokens, output_tokens,
      cache_read_input_tokens, cache_creation_input_tokens, cache_creation_5m_input_tokens,
      cache_creation_1h_input_tokens, web_search_requests, cost_usd, cost_basis
    FROM usage_line_items WHERE tenant_id = $1 AND run_id = $2 ORDER BY created_at, id
  `, [context.tenantId, runId]);
  return {
    run: mapRun(run),
    skills: skills.rows.map((skill) => ({
      id: skill.id,
      executionId: skill.client_execution_id,
      skill: skill.skill,
      status: skill.status,
      ...(skill.model ? { model: skill.model } : {}),
      ...(skill.runtime ? { runtime: skill.runtime } : {}),
      ...(skill.duration_ms !== null ? { durationMs: Number(skill.duration_ms) } : {}),
      findingCounts: {
        total: skill.finding_count,
        bySeverity: { high: skill.high_count, medium: skill.medium_count, low: skill.low_count },
      },
      usage: usage.rows.filter((item) => item.skill_execution_id === skill.id).map(mapUsage),
    })),
  };
}

const dimensionSql: Record<CostDimension, string> = {
  day: "to_char(date_trunc('day', r.completed_at), 'YYYY-MM-DD')",
  repository: 'repo.full_name',
  skill: "COALESCE(se.skill, 'unattributed')",
  model: "COALESCE(u.model, 'unknown')",
  runtime: "COALESCE(u.runtime, 'unknown')",
  provider: "COALESCE(u.provider, 'unknown')",
  lane: "COALESCE(u.lane, 'unattributed')",
  source: 'r.source::text',
  outcome: 'r.outcome::text',
};

interface AggregateRow extends Record<string, unknown> {
  runs: number;
  input_tokens: string | number;
  output_tokens: string | number;
  cost_usd: string | number | null;
  [key: `dimension_${number}`]: string;
}

async function aggregateRows(database: WardenDatabase, context: ServiceContext, filters: HistoryFilters, dimensions: readonly CostDimension[]) {
  const { conditions, values } = historyWhere(context, filters);
  const selectDimensions = dimensions.map((dimension, index) => `${dimensionSql[dimension]} AS dimension_${index}`);
  const groupDimensions = dimensions.map((dimension) => dimensionSql[dimension]);
  const result = await database.query<AggregateRow>(`
    SELECT ${selectDimensions.length ? `${selectDimensions.join(', ')},` : ''}
      COUNT(DISTINCT r.id)::integer AS runs,
      COALESCE(SUM(u.input_tokens), 0) AS input_tokens,
      COALESCE(SUM(u.output_tokens), 0) AS output_tokens,
      SUM(u.cost_usd) AS cost_usd
    FROM runs r
    JOIN repositories repo ON repo.id = r.repository_id AND repo.tenant_id = r.tenant_id
    LEFT JOIN usage_line_items u ON u.run_id = r.id AND u.tenant_id = r.tenant_id
    LEFT JOIN skill_executions se ON se.id = u.skill_execution_id AND se.tenant_id = r.tenant_id
    WHERE ${conditions.join(' AND ')}
    ${groupDimensions.length ? `GROUP BY ${groupDimensions.join(', ')}` : ''}
    ${groupDimensions.length ? `ORDER BY ${groupDimensions.join(', ')}` : ''}
  `, values);
  return result.rows;
}

/** Aggregate additive usage and nullable cost over explicit, allowlisted dimensions. */
export async function aggregateCosts(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  filters: HistoryFilters,
  dimensions: readonly CostDimension[],
): Promise<CostAggregateResponse> {
  const context = requireServiceContext(contextInput);
  const [rows, totalRows] = await Promise.all([
    aggregateRows(database, context, filters, dimensions),
    aggregateRows(database, context, filters, []),
  ]);
  const mapAggregate = (row: AggregateRow) => ({
    runs: Number(row.runs),
    inputTokens: Number(row.input_tokens),
    outputTokens: Number(row.output_tokens),
    costUsd: numberOrNull(row.cost_usd),
  });
  const total = totalRows[0] ?? { runs: 0, input_tokens: 0, output_tokens: 0, cost_usd: null } as AggregateRow;
  return {
    groups: rows.map((row) => ({
      dimensions: Object.fromEntries(dimensions.map((dimension, index) => [dimension, String(row[`dimension_${index}`])])),
      ...mapAggregate(row),
    })),
    totals: mapAggregate(total),
  };
}

/** Summarize authorized repositories with additive cost and finding counts. */
export async function listRepositories(database: WardenDatabase, contextInput: ServiceContext | undefined): Promise<RepositoryListResponse> {
  const context = requireServiceContext(contextInput);
  const values: unknown[] = [context.tenantId];
  const repositoryScope = context.repositoryAllowlist
    ? (() => {
        values.push(context.repositoryAllowlist);
        return `AND repo.full_name = ANY($${values.length}::text[])`;
      })()
    : '';
  const result = await database.query<Record<string, unknown>>(`
    WITH run_costs AS (
      SELECT run_id, SUM(cost_usd) AS cost_usd
      FROM usage_line_items
      WHERE tenant_id = $1
      GROUP BY run_id
    )
    SELECT repo.id, repo.provider, repo.owner, repo.name, repo.full_name,
      COUNT(DISTINCT r.id)::integer AS runs, COALESCE(SUM(r.finding_count), 0)::integer AS findings,
      SUM(costs.cost_usd) AS cost_usd, MAX(r.completed_at) AS last_run_at
    FROM repositories repo
    LEFT JOIN runs r ON r.repository_id = repo.id AND r.tenant_id = repo.tenant_id
    LEFT JOIN run_costs costs ON costs.run_id = r.id
    WHERE repo.tenant_id = $1 ${repositoryScope}
    GROUP BY repo.id ORDER BY MAX(r.completed_at) DESC NULLS LAST, repo.full_name
  `, values);
  return { items: result.rows.map((row) => ({
    id: String(row['id']),
    repository: {
      provider: row['provider'] as 'github' | 'gitlab' | 'local',
      owner: String(row['owner']),
      name: String(row['name']),
      fullName: String(row['full_name']),
    },
    runs: Number(row['runs']),
    findings: Number(row['findings']),
    costUsd: numberOrNull(row['cost_usd'] as string | number | null),
    lastRunAt: row['last_run_at'] ? iso(row['last_run_at'] as Date | string) : null,
  })) };
}

/** Summarize skill execution quality with explicit success/failure denominators. */
export async function listSkills(database: WardenDatabase, contextInput: ServiceContext | undefined): Promise<SkillListResponse> {
  const context = requireServiceContext(contextInput);
  const values: unknown[] = [context.tenantId];
  const repositoryScope = context.repositoryAllowlist
    ? (() => {
        values.push(context.repositoryAllowlist);
        return `AND repo.full_name = ANY($${values.length}::text[])`;
      })()
    : '';
  const result = await database.query<Record<string, unknown>>(`
    WITH skill_costs AS (
      SELECT skill_execution_id, SUM(cost_usd) AS cost_usd
      FROM usage_line_items
      WHERE tenant_id = $1 AND skill_execution_id IS NOT NULL
      GROUP BY skill_execution_id
    )
    SELECT se.skill, COUNT(*)::integer AS executions,
      COUNT(*) FILTER (WHERE se.status = 'success')::integer AS successful,
      COUNT(*) FILTER (WHERE se.status = 'failure')::integer AS failed,
      COALESCE(SUM(se.finding_count), 0)::integer AS findings,
      SUM(costs.cost_usd) AS cost_usd
    FROM skill_executions se
    JOIN runs r ON r.id = se.run_id AND r.tenant_id = se.tenant_id
    JOIN repositories repo ON repo.id = r.repository_id AND repo.tenant_id = r.tenant_id
    LEFT JOIN skill_costs costs ON costs.skill_execution_id = se.id
    WHERE se.tenant_id = $1 ${repositoryScope} GROUP BY se.skill ORDER BY executions DESC, se.skill
  `, values);
  return { items: result.rows.map((row) => ({
    skill: String(row['skill']),
    executions: Number(row['executions']),
    successful: Number(row['successful']),
    failed: Number(row['failed']),
    findings: Number(row['findings']),
    costUsd: numberOrNull(row['cost_usd'] as string | number | null),
  })) };
}

/** Return run outcome denominators and nullable total cost for the authorized tenant. */
export async function summarizeOutcomes(database: WardenDatabase, contextInput: ServiceContext | undefined, filters: HistoryFilters): Promise<OutcomeSummaryResponse> {
  const context = requireServiceContext(contextInput);
  const { conditions, values } = historyWhere(context, filters);
  const result = await database.query<Record<string, unknown>>(`
    WITH filtered_runs AS (
      SELECT DISTINCT r.id, r.outcome, r.finding_count
      FROM runs r
      JOIN repositories repo ON repo.id = r.repository_id AND repo.tenant_id = r.tenant_id
      LEFT JOIN usage_line_items u ON u.run_id = r.id AND u.tenant_id = r.tenant_id
      LEFT JOIN skill_executions se ON se.id = u.skill_execution_id AND se.tenant_id = r.tenant_id
      WHERE ${conditions.join(' AND ')}
    ), run_costs AS (
      SELECT run_id, SUM(cost_usd) AS cost_usd
      FROM usage_line_items
      WHERE tenant_id = $1
      GROUP BY run_id
    )
    SELECT COUNT(*)::integer AS runs,
      COUNT(*) FILTER (WHERE filtered_runs.outcome = 'success')::integer AS successful,
      COUNT(*) FILTER (WHERE filtered_runs.outcome = 'failure')::integer AS failed,
      COUNT(*) FILTER (WHERE filtered_runs.outcome = 'cancelled')::integer AS cancelled,
      COUNT(*) FILTER (WHERE filtered_runs.outcome = 'skipped')::integer AS skipped,
      COALESCE(SUM(filtered_runs.finding_count), 0)::integer AS findings,
      SUM(costs.cost_usd) AS cost_usd
    FROM filtered_runs
    LEFT JOIN run_costs costs ON costs.run_id = filtered_runs.id
  `, values);
  const row = result.rows[0] ?? {};
  return { totals: {
    runs: Number(row['runs'] ?? 0),
    successful: Number(row['successful'] ?? 0),
    failed: Number(row['failed'] ?? 0),
    cancelled: Number(row['cancelled'] ?? 0),
    skipped: Number(row['skipped'] ?? 0),
    findings: Number(row['findings'] ?? 0),
    costUsd: numberOrNull((row['cost_usd'] ?? null) as string | number | null),
  } };
}
