import type {
  CostAggregateResponse,
  CostBreakdownsResponse,
  CostGroup,
  DashboardSummaryResponse,
  FindingDetailResponse,
  FindingFeedItem,
  FindingListResponse,
  HistoryDimensionsResponse,
  OutcomeSummaryResponse,
  RepositoryListResponse,
  RunDetailResponse,
  RunListResponse,
  RunSummary,
  SkillListResponse,
  UsageLineItem,
} from '@sentry/warden-service-api';
import { SourceEvidenceSchema } from '@sentry/warden-service-api';
import {
  and,
  asc,
  desc,
  eq,
  exists,
  gte,
  inArray,
  lte,
  sql,
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { requireServiceContext } from '../context.js';
import type { ServiceContext } from '../context.js';
import type { WardenDatabase } from '../db/database.js';
import { getReadDatabase } from '../db/query.js';
import type { WardenReadDatabase } from '../db/query.js';
import {
  findingLocations,
  findingObservations,
  findings,
  repositories,
  runs,
  skillExecutions,
  usageLineItems,
} from '../db/schema.js';

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
  cursor?: HistoryCursor;
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
  cursor?: HistoryCursor;
  limit?: number;
}

export type CostDimension = 'day' | 'repository' | 'skill' | 'model' | 'runtime' | 'provider' | 'lane' | 'source' | 'outcome';

export const HistoryCursorSchema = z.string().trim().min(1).max(512).transform((cursor, context) => {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    const parsed = z.tuple([z.string().datetime(), z.string().uuid()]).safeParse(decoded);
    if (parsed.success) return parsed.data;
  } catch {
    // The validation issue below owns malformed base64 and JSON alike.
  }
  context.addIssue({ code: 'custom', message: 'Invalid history cursor.' });
  return z.NEVER;
});
export type HistoryCursor = z.output<typeof HistoryCursorSchema>;

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

const filteredSkillExecutions = alias(skillExecutions, 'filtered_se');
const filteredUsageLineItems = alias(usageLineItems, 'filtered_usage');
const authorizedRepository = alias(repositories, 'authorized_repository');

function repositoryScope(context: ServiceContext): SQL | undefined {
  return context.repositoryAllowlist
    ? inArray(repositories.fullName, context.repositoryAllowlist)
    : undefined;
}

function runRepositoryScope(database: WardenReadDatabase, context: ServiceContext): SQL | undefined {
  return context.repositoryAllowlist
    ? exists(
        database.select({ value: sql`1` })
          .from(authorizedRepository)
          .where(and(
            eq(authorizedRepository.id, runs.repositoryId),
            eq(authorizedRepository.tenantId, runs.tenantId),
            inArray(authorizedRepository.fullName, context.repositoryAllowlist),
          )),
      )
    : undefined;
}

function historyWhere(
  database: WardenReadDatabase,
  context: ServiceContext,
  filters: HistoryFilters,
  executionScope: 'run' | 'usage' = 'run',
): SQL[] {
  const conditions: SQL[] = [eq(runs.tenantId, context.tenantId)];
  const filtersUsage = Boolean(filters.model || filters.runtime || filters.provider || filters.lane);
  const authorizedRepositories = runRepositoryScope(database, context);
  if (authorizedRepositories) conditions.push(authorizedRepositories);
  if (filters.from) conditions.push(gte(runs.completedAt, new Date(filters.from)));
  if (filters.to) conditions.push(lte(runs.completedAt, new Date(filters.to)));
  if (filters.repositoryId) conditions.push(eq(runs.repositoryId, filters.repositoryId));
  if (filters.source) conditions.push(eq(runs.source, filters.source));
  if (filters.outcome) conditions.push(eq(runs.outcome, filters.outcome));
  if (executionScope === 'usage') {
    if (filters.skill) conditions.push(eq(skillExecutions.skill, filters.skill));
    if (filters.errorCode) conditions.push(eq(skillExecutions.errorCode, filters.errorCode));
    if (filters.model) conditions.push(eq(usageLineItems.model, filters.model));
    if (filters.runtime) conditions.push(eq(usageLineItems.runtime, filters.runtime));
    if (filters.provider) conditions.push(eq(usageLineItems.provider, filters.provider));
    if (filters.lane) conditions.push(eq(usageLineItems.lane, filters.lane));
    return conditions;
  }
  if (filtersUsage) {
    const executionConditions: SQL[] = [
      eq(filteredUsageLineItems.tenantId, runs.tenantId),
      eq(filteredUsageLineItems.runId, runs.id),
    ];
    if (filters.model) executionConditions.push(eq(filteredUsageLineItems.model, filters.model));
    if (filters.runtime) executionConditions.push(eq(filteredUsageLineItems.runtime, filters.runtime));
    if (filters.provider) executionConditions.push(eq(filteredUsageLineItems.provider, filters.provider));
    if (filters.lane) executionConditions.push(eq(filteredUsageLineItems.lane, filters.lane));
    let usageQuery = database.select({ value: sql`1` })
      .from(filteredUsageLineItems)
      .$dynamic();
    if (filters.skill || filters.errorCode) {
      usageQuery = usageQuery.innerJoin(filteredSkillExecutions, and(
        eq(filteredSkillExecutions.id, filteredUsageLineItems.skillExecutionId),
        eq(filteredSkillExecutions.tenantId, filteredUsageLineItems.tenantId),
      ));
      if (filters.skill) executionConditions.push(eq(filteredSkillExecutions.skill, filters.skill));
      if (filters.errorCode) executionConditions.push(eq(filteredSkillExecutions.errorCode, filters.errorCode));
    }
    conditions.push(exists(usageQuery.where(and(...executionConditions))));
  } else if (filters.skill || filters.errorCode) {
    const executionConditions: SQL[] = [
      eq(filteredSkillExecutions.tenantId, runs.tenantId),
      eq(filteredSkillExecutions.runId, runs.id),
    ];
    if (filters.skill) executionConditions.push(eq(filteredSkillExecutions.skill, filters.skill));
    if (filters.errorCode) executionConditions.push(eq(filteredSkillExecutions.errorCode, filters.errorCode));
    conditions.push(exists(
      database.select({ value: sql`1` })
        .from(filteredSkillExecutions)
        .where(and(...executionConditions)),
    ));
  }
  return conditions;
}

function encodeCursor(completedAt: Date | string, id: string): string {
  return Buffer.from(JSON.stringify([iso(completedAt), id]), 'utf8').toString('base64url');
}

interface FindingFeedRow extends Record<string, unknown> {
  id: string;
  client_finding_id: string;
  reported_id: string | null;
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
  first_observed_at: Date | string | null;
  last_observed_at: Date | string | null;
  completed_at: Date | string;
}

interface FindingDetailRow extends FindingFeedRow {
  head_sha: string | null;
  source_evidence: unknown;
  verification: string | null;
}

function mapFinding(row: FindingFeedRow): FindingFeedItem {
  return {
    id: row.id,
    displayId: row.reported_id ?? row.client_finding_id,
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
    firstObservedAt: row.first_observed_at ? iso(row.first_observed_at) : null,
    lastObservedAt: row.last_observed_at ? iso(row.last_observed_at) : null,
    completedAt: iso(row.completed_at),
  };
}

function githubSourceUrl(row: FindingDetailRow): string | undefined {
  if (row.provider !== 'github' || !row.head_sha || !row.path || !row.start_line) return undefined;
  const repository = [row.owner, row.name].map(encodeURIComponent).join('/');
  const path = row.path.split('/').map(encodeURIComponent).join('/');
  const endLine = row.end_line && row.end_line !== row.start_line ? `-L${row.end_line}` : '';
  return `https://github.com/${repository}/blob/${encodeURIComponent(row.head_sha)}/${path}#L${row.start_line}${endLine}`;
}

function findingContextQueries(database: WardenReadDatabase) {
  const location = database.select({
    path: findingLocations.path,
    start_line: findingLocations.startLine,
    end_line: findingLocations.endLine,
  })
    .from(findingLocations)
    .where(and(
      eq(findingLocations.tenantId, findings.tenantId),
      eq(findingLocations.findingId, findings.id),
    ))
    .orderBy(asc(findingLocations.ordinal))
    .limit(1)
    .as('location');
  const observation = database.select({
    outcome: findingObservations.outcome,
    last_observed_at: sql<Date>`${findingObservations.observedAt}`.as('last_observed_at'),
  })
    .from(findingObservations)
    .where(and(
      eq(findingObservations.tenantId, findings.tenantId),
      eq(findingObservations.findingId, findings.id),
    ))
    .orderBy(desc(findingObservations.observedAt), desc(findingObservations.id))
    .limit(1)
    .as('observation');
  // Earliest observation is first seen for this finding row (per-run identity today).
  const firstObservation = database.select({
    first_observed_at: sql<Date>`${findingObservations.observedAt}`.as('first_observed_at'),
  })
    .from(findingObservations)
    .where(and(
      eq(findingObservations.tenantId, findings.tenantId),
      eq(findingObservations.findingId, findings.id),
    ))
    .orderBy(asc(findingObservations.observedAt), asc(findingObservations.id))
    .limit(1)
    .as('first_observation');
  return { location, observation, firstObservation };
}

/** List authorized findings newest first for dashboard and API investigations. */
export async function listFindings(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  filters: FindingListFilters,
): Promise<FindingListResponse> {
  const context = requireServiceContext(contextInput);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
  const read = getReadDatabase(database);
  const { location, observation, firstObservation } = findingContextQueries(read);
  // Scope runs first so completed_at range/order can use runs_tenant_* indexes.
  const conditions: SQL[] = [eq(runs.tenantId, context.tenantId)];
  const authorizedRepositories = repositoryScope(context);
  if (authorizedRepositories) conditions.push(authorizedRepositories);
  if (filters.from) conditions.push(gte(runs.completedAt, new Date(filters.from)));
  if (filters.to) conditions.push(lte(runs.completedAt, new Date(filters.to)));
  if (filters.repositoryId) conditions.push(eq(runs.repositoryId, filters.repositoryId));
  if (filters.skill) conditions.push(eq(skillExecutions.skill, filters.skill));
  if (filters.severity) conditions.push(eq(findings.severity, filters.severity));
  if (filters.outcome) conditions.push(eq(observation.outcome, filters.outcome));
  if (filters.query) {
    conditions.push(sql`POSITION(${filters.query.toLowerCase()} IN LOWER(
      ${findings.title} || ' ' || ${findings.description} || ' ' || COALESCE(${location.path}, '')
    )) > 0`);
  }
  if (filters.cursor) {
    const [completedAt, id] = filters.cursor;
    conditions.push(sql`(${runs.completedAt}, ${findings.id}) < (${new Date(completedAt)}, ${id})`);
  }
  // Drive from runs so tenant + completed_at (+ repository) indexes own the sort,
  // then join findings by run instead of scanning findings and sorting after the fact.
  const result = await read.select({
    id: findings.id,
    client_finding_id: findings.clientFindingId,
    reported_id: findings.reportedId,
    run_id: findings.runId,
    client_run_id: runs.clientRunId,
    provider: repositories.provider,
    owner: repositories.owner,
    name: repositories.name,
    full_name: repositories.fullName,
    skill: skillExecutions.skill,
    severity: findings.severity,
    confidence: findings.confidence,
    title: findings.title,
    description: findings.description,
    path: location.path,
    start_line: location.start_line,
    end_line: location.end_line,
    observation_outcome: observation.outcome,
    first_observed_at: firstObservation.first_observed_at,
    last_observed_at: observation.last_observed_at,
    completed_at: runs.completedAt,
  })
    .from(runs)
    .innerJoin(findings, and(eq(findings.runId, runs.id), eq(findings.tenantId, runs.tenantId)))
    .innerJoin(repositories, and(eq(repositories.id, runs.repositoryId), eq(repositories.tenantId, runs.tenantId)))
    .innerJoin(skillExecutions, and(eq(skillExecutions.id, findings.skillExecutionId), eq(skillExecutions.tenantId, findings.tenantId)))
    .leftJoinLateral(location, sql`true`)
    .leftJoinLateral(observation, sql`true`)
    .leftJoinLateral(firstObservation, sql`true`)
    .where(and(...conditions))
    .orderBy(desc(runs.completedAt), desc(findings.id))
    .limit(limit + 1);
  const rows = result as unknown as FindingFeedRow[];
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page.map(mapFinding),
    ...(rows.length > limit && last ? { nextCursor: encodeCursor(last.completed_at, last.id) } : {}),
  };
}

/** Return one authorized finding without revealing cross-tenant or restricted repository IDs. */
export async function getFindingDetail(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  findingId: string,
): Promise<FindingDetailResponse | null> {
  const context = requireServiceContext(contextInput);
  const read = getReadDatabase(database);
  const { location, observation, firstObservation } = findingContextQueries(read);
  const conditions: SQL[] = [eq(findings.tenantId, context.tenantId), eq(findings.id, findingId)];
  const authorizedRepositories = repositoryScope(context);
  if (authorizedRepositories) conditions.push(authorizedRepositories);
  const result = await read.select({
    id: findings.id,
    client_finding_id: findings.clientFindingId,
    reported_id: findings.reportedId,
    run_id: findings.runId,
    client_run_id: runs.clientRunId,
    head_sha: runs.headSha,
    source_evidence: findings.sourceEvidence,
    verification: findings.verification,
    provider: repositories.provider,
    owner: repositories.owner,
    name: repositories.name,
    full_name: repositories.fullName,
    skill: skillExecutions.skill,
    severity: findings.severity,
    confidence: findings.confidence,
    title: findings.title,
    description: findings.description,
    path: location.path,
    start_line: location.start_line,
    end_line: location.end_line,
    observation_outcome: observation.outcome,
    first_observed_at: firstObservation.first_observed_at,
    last_observed_at: observation.last_observed_at,
    completed_at: runs.completedAt,
  })
    .from(findings)
    .innerJoin(runs, and(eq(runs.id, findings.runId), eq(runs.tenantId, findings.tenantId)))
    .innerJoin(repositories, and(eq(repositories.id, runs.repositoryId), eq(repositories.tenantId, runs.tenantId)))
    .innerJoin(skillExecutions, and(eq(skillExecutions.id, findings.skillExecutionId), eq(skillExecutions.tenantId, findings.tenantId)))
    .leftJoinLateral(location, sql`true`)
    .leftJoinLateral(observation, sql`true`)
    .leftJoinLateral(firstObservation, sql`true`)
    .where(and(...conditions));
  const finding = result[0] as unknown as FindingDetailRow | undefined;
  if (!finding) return null;
  const sourceEvidence = SourceEvidenceSchema.safeParse(finding.source_evidence);
  const sourceUrl = githubSourceUrl(finding);
  return {
    finding: mapFinding(finding),
    ...(finding.head_sha ? { headSha: finding.head_sha } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(sourceEvidence.success ? { sourceEvidence: sourceEvidence.data } : {}),
    ...(finding.verification ? { verification: finding.verification } : {}),
  };
}

/** List runs visible to an authenticated tenant with stable cursor pagination. */
export async function listRuns(database: WardenDatabase, contextInput: ServiceContext | undefined, filters: RunListFilters): Promise<RunListResponse> {
  const context = requireServiceContext(contextInput);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
  const read = getReadDatabase(database);
  const conditions = historyWhere(read, context, filters);
  if (filters.cursor) {
    const [completedAt, id] = filters.cursor;
    conditions.push(sql`(${runs.completedAt}, ${runs.id}) < (${new Date(completedAt)}, ${id})`);
  }
  const result = await read.select({
    id: runs.id,
    client_run_id: runs.clientRunId,
    source: runs.source,
    data_profile: runs.dataProfile,
    started_at: runs.startedAt,
    completed_at: runs.completedAt,
    outcome: runs.outcome,
    finding_count: runs.findingCount,
    high_count: runs.highCount,
    medium_count: runs.mediumCount,
    low_count: runs.lowCount,
    trace_id: runs.traceId,
    provider: repositories.provider,
    owner: repositories.owner,
    name: repositories.name,
    full_name: repositories.fullName,
    cost_usd: sql<string | null>`(
      SELECT SUM(${usageLineItems.costUsd})
      FROM ${usageLineItems}
      WHERE ${usageLineItems.tenantId} = ${runs.tenantId}
        AND ${usageLineItems.runId} = ${runs.id}
    )`.as('cost_usd'),
  })
    .from(runs)
    .innerJoin(repositories, and(eq(repositories.id, runs.repositoryId), eq(repositories.tenantId, runs.tenantId)))
    .where(and(...conditions))
    .orderBy(desc(runs.completedAt), desc(runs.id))
    .limit(limit + 1);
  const rows = result as unknown as RunRow[];
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page.map(mapRun),
    ...(rows.length > limit && last ? { nextCursor: encodeCursor(last.completed_at, last.id) } : {}),
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
  const read = getReadDatabase(database);
  const conditions: SQL[] = [eq(runs.tenantId, context.tenantId), eq(runs.id, runId)];
  const authorizedRepositories = repositoryScope(context);
  if (authorizedRepositories) conditions.push(authorizedRepositories);
  const loadedRuns = await read.select({
    id: runs.id,
    client_run_id: runs.clientRunId,
    source: runs.source,
    data_profile: runs.dataProfile,
    started_at: runs.startedAt,
    completed_at: runs.completedAt,
    outcome: runs.outcome,
    finding_count: runs.findingCount,
    high_count: runs.highCount,
    medium_count: runs.mediumCount,
    low_count: runs.lowCount,
    trace_id: runs.traceId,
    provider: repositories.provider,
    owner: repositories.owner,
    name: repositories.name,
    full_name: repositories.fullName,
    cost_usd: sql<string | null>`(
      SELECT SUM(${usageLineItems.costUsd})
      FROM ${usageLineItems}
      WHERE ${usageLineItems.tenantId} = ${runs.tenantId}
        AND ${usageLineItems.runId} = ${runs.id}
    )`.as('cost_usd'),
  })
    .from(runs)
    .innerJoin(repositories, and(eq(repositories.id, runs.repositoryId), eq(repositories.tenantId, runs.tenantId)))
    .where(and(...conditions));
  const run = loadedRuns[0] as unknown as RunRow | undefined;
  if (!run) return null;
  const loadedSkills = await read.select({
    id: skillExecutions.id,
    client_execution_id: skillExecutions.clientExecutionId,
    skill: skillExecutions.skill,
    status: skillExecutions.status,
    model: skillExecutions.model,
    runtime: skillExecutions.runtime,
    duration_ms: skillExecutions.durationMs,
    finding_count: skillExecutions.findingCount,
    high_count: skillExecutions.highCount,
    medium_count: skillExecutions.mediumCount,
    low_count: skillExecutions.lowCount,
  })
    .from(skillExecutions)
    .where(and(eq(skillExecutions.tenantId, context.tenantId), eq(skillExecutions.runId, runId)))
    .orderBy(asc(skillExecutions.createdAt), asc(skillExecutions.id));
  const loadedUsage = await read.select({
    skill_execution_id: usageLineItems.skillExecutionId,
    lane: usageLineItems.lane,
    operation: usageLineItems.operation,
    provider: usageLineItems.provider,
    model: usageLineItems.model,
    runtime: usageLineItems.runtime,
    input_tokens: usageLineItems.inputTokens,
    output_tokens: usageLineItems.outputTokens,
    cache_read_input_tokens: usageLineItems.cacheReadInputTokens,
    cache_creation_input_tokens: usageLineItems.cacheCreationInputTokens,
    cache_creation_5m_input_tokens: usageLineItems.cacheCreation5mInputTokens,
    cache_creation_1h_input_tokens: usageLineItems.cacheCreation1hInputTokens,
    web_search_requests: usageLineItems.webSearchRequests,
    cost_usd: usageLineItems.costUsd,
    cost_basis: usageLineItems.costBasis,
  })
    .from(usageLineItems)
    .where(and(eq(usageLineItems.tenantId, context.tenantId), eq(usageLineItems.runId, runId)))
    .orderBy(asc(usageLineItems.createdAt), asc(usageLineItems.id));
  const skills = loadedSkills as unknown as SkillRow[];
  const usage = loadedUsage as unknown as UsageRow[];
  return {
    run: mapRun(run),
    skills: skills.map((skill) => ({
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
      usage: usage.filter((item) => item.skill_execution_id === skill.id).map(mapUsage),
    })),
  };
}

const dimensionSql: Record<CostDimension, SQL<string>> = {
  day: sql<string>`to_char(date_trunc('day', ${runs.completedAt}), 'YYYY-MM-DD')`,
  repository: sql<string>`${repositories.fullName}`,
  skill: sql<string>`COALESCE(${skillExecutions.skill}, 'unattributed')`,
  model: sql<string>`COALESCE(${usageLineItems.model}, 'unknown')`,
  runtime: sql<string>`COALESCE(${usageLineItems.runtime}, 'unknown')`,
  provider: sql<string>`COALESCE(${usageLineItems.provider}, 'unknown')`,
  lane: sql<string>`COALESCE(${usageLineItems.lane}, 'unattributed')`,
  source: sql<string>`${runs.source}::text`,
  outcome: sql<string>`${runs.outcome}::text`,
};

interface AggregateRow extends Record<string, unknown> {
  runs: number;
  input_tokens: string | number;
  output_tokens: string | number;
  cost_usd: string | number | null;
  [key: `dimension_${number}`]: string;
}

interface DashboardCostRow extends Record<string, unknown> {
  dimension_0: string;
  cost_usd: string | number | null;
}

function mapAggregateRow(row: AggregateRow): Omit<CostGroup, 'dimensions'> {
  return {
    runs: Number(row.runs),
    inputTokens: Number(row.input_tokens),
    outputTokens: Number(row.output_tokens),
    costUsd: numberOrNull(row.cost_usd),
  };
}

async function aggregateRows(database: WardenDatabase, context: ServiceContext, filters: HistoryFilters, dimensions: readonly CostDimension[]) {
  const read = getReadDatabase(database);
  const conditions = historyWhere(read, context, filters, 'usage');
  const needsRepositories = dimensions.includes('repository');
  const needsSkills = dimensions.includes('skill') || Boolean(filters.skill || filters.errorCode);
  const groupDimensions = dimensions.map((dimension) => dimensionSql[dimension]);
  const selectDimensions = Object.fromEntries(dimensions.map((dimension, index) => [
    `dimension_${index}`,
    dimensionSql[dimension].as(`dimension_${index}`),
  ]));
  let query = read.select({
    ...selectDimensions,
    runs: sql<number>`COUNT(DISTINCT ${runs.id})::integer`.as('runs'),
    input_tokens: sql<string | number>`COALESCE(SUM(${usageLineItems.inputTokens}), 0)`.as('input_tokens'),
    output_tokens: sql<string | number>`COALESCE(SUM(${usageLineItems.outputTokens}), 0)`.as('output_tokens'),
    cost_usd: sql<string | number | null>`SUM(${usageLineItems.costUsd})`.as('cost_usd'),
  })
    .from(runs)
    .$dynamic();
  if (needsRepositories) {
    query = query.innerJoin(repositories, and(
      eq(repositories.id, runs.repositoryId),
      eq(repositories.tenantId, runs.tenantId),
    ));
  }
  query = query.leftJoin(usageLineItems, and(
    eq(usageLineItems.runId, runs.id),
    eq(usageLineItems.tenantId, runs.tenantId),
  ));
  if (needsSkills) {
    query = query.leftJoin(skillExecutions, and(
      eq(skillExecutions.id, usageLineItems.skillExecutionId),
      eq(skillExecutions.tenantId, runs.tenantId),
    ));
  }
  query = query.where(and(...conditions));
  const result = groupDimensions.length > 0
    ? await query.groupBy(...groupDimensions).orderBy(...groupDimensions)
    : await query;
  return result as unknown as AggregateRow[];
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
  const total = totalRows[0] ?? { runs: 0, input_tokens: 0, output_tokens: 0, cost_usd: null } as AggregateRow;
  return {
    groups: rows.map((row) => ({
      dimensions: Object.fromEntries(dimensions.map((dimension, index) => [dimension, String(row[`dimension_${index}`])])),
      ...mapAggregateRow(row),
    })),
    totals: mapAggregateRow(total),
  };
}

/** Aggregate several independent cost breakdowns without repeating total scans. */
export async function aggregateCostBreakdowns(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  filters: HistoryFilters,
  dimensions: readonly CostDimension[],
): Promise<CostBreakdownsResponse> {
  const context = requireServiceContext(contextInput);
  const rowsByDimension = await Promise.all(
    dimensions.map((dimension) => aggregateRows(database, context, filters, [dimension])),
  );
  return {
    breakdowns: dimensions.map((dimension, index) => ({
      dimension,
      groups: (rowsByDimension[index] ?? []).map((row) => ({
        dimensions: { [dimension]: String(row['dimension_0']) },
        ...mapAggregateRow(row),
      })),
    })),
  };
}

type DashboardCostDimension = 'day' | 'repository' | 'skill';

async function aggregateDashboardCostRows(
  database: WardenDatabase,
  context: ServiceContext,
  filters: HistoryFilters,
  dimension: DashboardCostDimension,
): Promise<DashboardCostRow[]> {
  const read = getReadDatabase(database);
  const conditions = historyWhere(read, context, filters, 'usage');
  const dimensionExpression = dimensionSql[dimension];
  const needsSkills = dimension === 'skill' || Boolean(filters.skill || filters.errorCode);
  let query = read.select({
    dimension_0: dimensionExpression.as('dimension_0'),
    cost_usd: sql<string | number | null>`SUM(${usageLineItems.costUsd})`.as('cost_usd'),
  })
    .from(usageLineItems)
    .innerJoin(runs, and(
      eq(runs.id, usageLineItems.runId),
      eq(runs.tenantId, usageLineItems.tenantId),
    ))
    .$dynamic();
  if (dimension === 'repository') {
    query = query.innerJoin(repositories, and(
      eq(repositories.id, runs.repositoryId),
      eq(repositories.tenantId, runs.tenantId),
    ));
  }
  if (needsSkills) {
    query = query.leftJoin(skillExecutions, and(
      eq(skillExecutions.id, usageLineItems.skillExecutionId),
      eq(skillExecutions.tenantId, usageLineItems.tenantId),
    ));
  }
  const result = await query
    .where(and(eq(usageLineItems.tenantId, context.tenantId), ...conditions))
    .groupBy(dimensionExpression)
    .orderBy(dimensionExpression);
  return result as unknown as DashboardCostRow[];
}

/** List lightweight repository and skill values used by history filters. */
export async function listHistoryDimensions(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
): Promise<HistoryDimensionsResponse> {
  const context = requireServiceContext(contextInput);
  const read = getReadDatabase(database);
  const repositoryConditions: SQL[] = [eq(repositories.tenantId, context.tenantId)];
  const authorizedRepositories = repositoryScope(context);
  if (authorizedRepositories) repositoryConditions.push(authorizedRepositories);
  const skillRowsPromise = authorizedRepositories
    ? read.selectDistinct({ skill: skillExecutions.skill })
        .from(skillExecutions)
        .innerJoin(runs, and(eq(runs.id, skillExecutions.runId), eq(runs.tenantId, skillExecutions.tenantId)))
        .innerJoin(repositories, and(eq(repositories.id, runs.repositoryId), eq(repositories.tenantId, runs.tenantId)))
        .where(and(eq(skillExecutions.tenantId, context.tenantId), authorizedRepositories))
        .orderBy(asc(skillExecutions.skill))
    : read.selectDistinct({ skill: skillExecutions.skill })
        .from(skillExecutions)
        .where(eq(skillExecutions.tenantId, context.tenantId))
        .orderBy(asc(skillExecutions.skill));

  const [repositoryRows, skillRows] = await Promise.all([
    read.select({
      id: repositories.id,
      provider: repositories.provider,
      owner: repositories.owner,
      name: repositories.name,
      fullName: repositories.fullName,
    })
      .from(repositories)
      .where(and(...repositoryConditions))
      .orderBy(asc(repositories.fullName), asc(repositories.provider)),
    skillRowsPromise,
  ]);

  return {
    repositories: repositoryRows.map((row) => ({
      id: row.id,
      repository: {
        provider: row.provider as 'github' | 'gitlab' | 'local',
        owner: row.owner,
        name: row.name,
        fullName: row.fullName,
      },
    })),
    skills: skillRows.map((row) => row.skill),
  };
}

/** Summarize authorized repositories with additive cost and finding counts. */
export async function listRepositories(database: WardenDatabase, contextInput: ServiceContext | undefined): Promise<RepositoryListResponse> {
  const context = requireServiceContext(contextInput);
  const read = getReadDatabase(database);
  const repositoryConditions: SQL[] = [eq(repositories.tenantId, context.tenantId)];
  const authorizedRepositories = repositoryScope(context);
  if (authorizedRepositories) repositoryConditions.push(authorizedRepositories);
  const runConditions: SQL[] = [eq(runs.tenantId, context.tenantId)];
  const authorizedRuns = runRepositoryScope(read, context);
  if (authorizedRuns) runConditions.push(authorizedRuns);

  const [repositoryRows, runRows, costRows] = await Promise.all([
    read.select({
      id: repositories.id,
      provider: repositories.provider,
      owner: repositories.owner,
      name: repositories.name,
      fullName: repositories.fullName,
    })
      .from(repositories)
      .where(and(...repositoryConditions)),
    read.select({
      repositoryId: runs.repositoryId,
      runs: sql<number>`COUNT(*)::integer`.as('runs'),
      findings: sql<number>`COALESCE(SUM(${runs.findingCount}), 0)::integer`.as('findings'),
      lastRunAt: sql<Date | string | null>`MAX(${runs.completedAt})`.as('last_run_at'),
    })
      .from(runs)
      .where(and(...runConditions))
      .groupBy(runs.repositoryId),
    read.select({
      repositoryId: runs.repositoryId,
      costUsd: sql<string | number | null>`SUM(${usageLineItems.costUsd})`.as('cost_usd'),
    })
      .from(usageLineItems)
      .innerJoin(runs, and(
        eq(runs.id, usageLineItems.runId),
        eq(runs.tenantId, usageLineItems.tenantId),
      ))
      .where(and(eq(usageLineItems.tenantId, context.tenantId), ...runConditions))
      .groupBy(runs.repositoryId),
  ]);
  const runsByRepository = new Map(runRows.map((row) => [row.repositoryId, row]));
  const costsByRepository = new Map(costRows.map((row) => [row.repositoryId, row.costUsd]));
  const items = repositoryRows.map((row) => {
    const aggregate = runsByRepository.get(row.id);
    return {
      id: row.id,
      repository: {
        provider: row.provider as 'github' | 'gitlab' | 'local',
        owner: row.owner,
        name: row.name,
        fullName: row.fullName,
      },
      runs: Number(aggregate?.runs ?? 0),
      findings: Number(aggregate?.findings ?? 0),
      costUsd: numberOrNull(costsByRepository.get(row.id) ?? null),
      lastRunAt: aggregate?.lastRunAt ? iso(aggregate.lastRunAt) : null,
    };
  });
  items.sort((left, right) => {
    if (left.lastRunAt && right.lastRunAt && left.lastRunAt !== right.lastRunAt) {
      return right.lastRunAt.localeCompare(left.lastRunAt);
    }
    if (left.lastRunAt) return -1;
    if (right.lastRunAt) return 1;
    return left.repository.fullName.localeCompare(right.repository.fullName);
  });
  return { items };
}

/** Summarize skill execution quality with explicit success/failure denominators. */
export async function listSkills(database: WardenDatabase, contextInput: ServiceContext | undefined): Promise<SkillListResponse> {
  const context = requireServiceContext(contextInput);
  const read = getReadDatabase(database);
  const selectSummary = {
    skill: skillExecutions.skill,
    executions: sql<number>`COUNT(*)::integer`.as('executions'),
    successful: sql<number>`COUNT(*) FILTER (WHERE ${skillExecutions.status} = 'success')::integer`.as('successful'),
    failed: sql<number>`COUNT(*) FILTER (WHERE ${skillExecutions.status} = 'failure')::integer`.as('failed'),
    findings: sql<number>`COALESCE(SUM(${skillExecutions.findingCount}), 0)::integer`.as('findings'),
  };
  const selectCosts = {
    skill: skillExecutions.skill,
    costUsd: sql<string | number | null>`SUM(${usageLineItems.costUsd})`.as('cost_usd'),
  };
  const authorizedRuns = runRepositoryScope(read, context);
  const summaryQuery = authorizedRuns
    ? read.select(selectSummary)
        .from(skillExecutions)
        .innerJoin(runs, and(eq(runs.id, skillExecutions.runId), eq(runs.tenantId, skillExecutions.tenantId)))
        .where(and(eq(skillExecutions.tenantId, context.tenantId), authorizedRuns))
        .groupBy(skillExecutions.skill)
        .orderBy(desc(sql`COUNT(*)`), asc(skillExecutions.skill))
    : read.select(selectSummary)
        .from(skillExecutions)
        .where(eq(skillExecutions.tenantId, context.tenantId))
        .groupBy(skillExecutions.skill)
        .orderBy(desc(sql`COUNT(*)`), asc(skillExecutions.skill));
  const costQuery = authorizedRuns
    ? read.select(selectCosts)
        .from(usageLineItems)
        .innerJoin(skillExecutions, and(
          eq(skillExecutions.id, usageLineItems.skillExecutionId),
          eq(skillExecutions.tenantId, usageLineItems.tenantId),
        ))
        .innerJoin(runs, and(eq(runs.id, skillExecutions.runId), eq(runs.tenantId, skillExecutions.tenantId)))
        .where(and(eq(usageLineItems.tenantId, context.tenantId), authorizedRuns))
        .groupBy(skillExecutions.skill)
    : read.select(selectCosts)
        .from(usageLineItems)
        .innerJoin(skillExecutions, and(
          eq(skillExecutions.id, usageLineItems.skillExecutionId),
          eq(skillExecutions.tenantId, usageLineItems.tenantId),
        ))
        .where(eq(usageLineItems.tenantId, context.tenantId))
        .groupBy(skillExecutions.skill);
  const [summaryRows, costRows] = await Promise.all([summaryQuery, costQuery]);
  const costsBySkill = new Map(costRows.map((row) => [row.skill, row.costUsd]));
  return { items: summaryRows.map((row) => ({
    skill: row.skill,
    executions: Number(row.executions),
    successful: Number(row.successful),
    failed: Number(row.failed),
    findings: Number(row.findings),
    costUsd: numberOrNull(costsBySkill.get(row.skill) ?? null),
  })) };
}

async function aggregateOutcomeRow(
  database: WardenDatabase,
  context: ServiceContext,
  filters: HistoryFilters,
) {
  const read = getReadDatabase(database);
  const conditions = historyWhere(read, context, filters);
  const rows = await read.select({
    runs: sql<number>`COUNT(*)::integer`.as('runs'),
    successful: sql<number>`COUNT(*) FILTER (WHERE ${runs.outcome} = 'success')::integer`.as('successful'),
    failed: sql<number>`COUNT(*) FILTER (WHERE ${runs.outcome} = 'failure')::integer`.as('failed'),
    cancelled: sql<number>`COUNT(*) FILTER (WHERE ${runs.outcome} = 'cancelled')::integer`.as('cancelled'),
    skipped: sql<number>`COUNT(*) FILTER (WHERE ${runs.outcome} = 'skipped')::integer`.as('skipped'),
    findings: sql<number>`COALESCE(SUM(${runs.findingCount}), 0)::integer`.as('findings'),
  })
    .from(runs)
    .where(and(...conditions));
  return rows[0];
}

function mapOutcomeRow(row: Awaited<ReturnType<typeof aggregateOutcomeRow>>) {
  return {
    runs: Number(row?.runs ?? 0),
    successful: Number(row?.successful ?? 0),
    failed: Number(row?.failed ?? 0),
    cancelled: Number(row?.cancelled ?? 0),
    skipped: Number(row?.skipped ?? 0),
    findings: Number(row?.findings ?? 0),
  };
}

/** Return run outcome denominators and nullable total cost for the authorized tenant. */
export async function summarizeOutcomes(database: WardenDatabase, contextInput: ServiceContext | undefined, filters: HistoryFilters): Promise<OutcomeSummaryResponse> {
  const context = requireServiceContext(contextInput);
  const read = getReadDatabase(database);
  const conditions = historyWhere(read, context, filters);
  const [row, costRows] = await Promise.all([
    aggregateOutcomeRow(database, context, filters),
    read.select({
      costUsd: sql<string | number | null>`SUM(${usageLineItems.costUsd})`.as('cost_usd'),
    })
      .from(usageLineItems)
      .innerJoin(runs, and(
        eq(runs.id, usageLineItems.runId),
        eq(runs.tenantId, usageLineItems.tenantId),
      ))
      .where(and(eq(usageLineItems.tenantId, context.tenantId), ...conditions)),
  ]);
  return { totals: {
    ...mapOutcomeRow(row),
    costUsd: numberOrNull(costRows[0]?.costUsd ?? null),
  } };
}

/** Load the outcome and cost-only aggregates rendered by the dashboard. */
export async function summarizeDashboard(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  filters: HistoryFilters,
): Promise<DashboardSummaryResponse> {
  const context = requireServiceContext(contextInput);
  const dimensions = ['day', 'repository', 'skill'] as const;
  const [outcome, ...rowsByDimension] = await Promise.all([
    aggregateOutcomeRow(database, context, filters),
    ...dimensions.map((dimension) => aggregateDashboardCostRows(database, context, filters, dimension)),
  ]);
  const dayCosts = rowsByDimension[0] ?? [];
  const knownDayCosts = dayCosts
    .map((row) => numberOrNull(row.cost_usd))
    .filter((cost): cost is number => cost !== null);
  return {
    totals: {
      ...mapOutcomeRow(outcome),
      costUsd: knownDayCosts.length > 0
        ? knownDayCosts.reduce((total, cost) => total + cost, 0)
        : null,
    },
    breakdowns: dimensions.map((dimension, index) => ({
      dimension,
      groups: (rowsByDimension[index] ?? []).map((row) => ({
        dimensions: { [dimension]: String(row.dimension_0) },
        costUsd: numberOrNull(row.cost_usd),
      })),
    })),
  };
}
