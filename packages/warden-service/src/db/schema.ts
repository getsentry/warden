import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const serviceRoleEnum = pgEnum('service_role', ['ingest', 'read', 'admin']);
export const runOutcomeEnum = pgEnum('run_outcome', ['success', 'failure', 'cancelled', 'skipped']);
export const runSourceEnum = pgEnum('run_source', ['cli', 'action', 'sdk', 'replay']);
export const dataProfileEnum = pgEnum('data_profile', ['metrics', 'findings', 'code']);
export const executionStatusEnum = pgEnum('execution_status', ['success', 'failure', 'cancelled', 'skipped']);
export const costBasisEnum = pgEnum('cost_basis', ['reported', 'estimated', 'unknown']);
export const memoryLifecycleEnum = pgEnum('memory_lifecycle', ['candidate', 'active', 'superseded', 'archived', 'expired']);
export const memoryKindEnum = pgEnum('memory_kind', ['convention', 'confirmed_pattern', 'false_positive', 'review_guidance']);
export const jobStateEnum = pgEnum('job_state', ['pending', 'running', 'retry', 'complete', 'dead']);

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  metricsRetentionDays: integer('metrics_retention_days').notNull().default(365),
  findingsRetentionDays: integer('findings_retention_days').notNull().default(90),
  codeRetentionDays: integer('code_retention_days').notNull().default(30),
  lifecycleRetentionDays: integer('lifecycle_retention_days').notNull().default(365),
  ...timestamps,
}, (table) => [
  uniqueIndex('tenants_slug_unique').on(table.slug),
  check('tenants_retention_positive', sql`${table.metricsRetentionDays} > 0 AND ${table.findingsRetentionDays} > 0 AND ${table.codeRetentionDays} > 0 AND ${table.lifecycleRetentionDays} > 0`),
]);

export const repositories = pgTable('repositories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  owner: text('owner').notNull(),
  name: text('name').notNull(),
  fullName: text('full_name').notNull(),
  memoryEnabled: boolean('memory_enabled').notNull().default(false),
  ...timestamps,
}, (table) => [
  uniqueIndex('repositories_tenant_identity_unique').on(table.tenantId, table.provider, table.owner, table.name),
  index('repositories_tenant_full_name_idx').on(table.tenantId, table.fullName),
]);

export const serviceTokens = pgTable('service_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  prefix: text('prefix').notNull(),
  tokenHash: text('token_hash').notNull(),
  credentialKind: text('credential_kind').notNull().default('service'),
  ownerSubject: text('owner_subject'),
  tokenSuffix: text('token_suffix'),
  roles: serviceRoleEnum('roles').array().notNull(),
  repositoryAllowlist: text('repository_allowlist').array(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex('service_tokens_prefix_unique').on(table.prefix),
  uniqueIndex('service_tokens_hash_unique').on(table.tokenHash),
  index('service_tokens_tenant_idx').on(table.tenantId),
  index('service_tokens_owner_idx').on(table.tenantId, table.ownerSubject),
  check('service_tokens_kind_valid', sql`${table.credentialKind} IN ('service', 'personal')`),
  check('service_tokens_personal_owner', sql`${table.credentialKind} = 'service' OR (${table.ownerSubject} IS NOT NULL AND ${table.tokenSuffix} IS NOT NULL)`),
]);

export const runs = pgTable('runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  repositoryId: uuid('repository_id').notNull().references(() => repositories.id, { onDelete: 'cascade' }),
  clientRunId: text('client_run_id').notNull(),
  envelopeVersion: integer('envelope_version').notNull(),
  envelopeChecksum: text('envelope_checksum').notNull(),
  source: runSourceEnum('source').notNull(),
  dataProfile: dataProfileEnum('data_profile').notNull(),
  wardenVersion: text('warden_version').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
  outcome: runOutcomeEnum('outcome').notNull(),
  traceId: text('trace_id'),
  headSha: text('head_sha'),
  event: text('event'),
  pullRequest: jsonb('pull_request'),
  memoryEnabled: boolean('memory_enabled').notNull(),
  findingCount: integer('finding_count').notNull(),
  highCount: integer('high_count').notNull(),
  mediumCount: integer('medium_count').notNull(),
  lowCount: integer('low_count').notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex('runs_tenant_client_run_unique').on(table.tenantId, table.clientRunId),
  index('runs_tenant_completed_idx').on(table.tenantId, table.completedAt),
  index('runs_tenant_repository_completed_idx').on(table.tenantId, table.repositoryId, table.completedAt),
  index('runs_tenant_outcome_completed_idx').on(table.tenantId, table.outcome, table.completedAt),
  check('runs_finding_counts_nonnegative', sql`${table.findingCount} >= 0 AND ${table.highCount} >= 0 AND ${table.mediumCount} >= 0 AND ${table.lowCount} >= 0`),
]);

export const skillExecutions = pgTable('skill_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  runId: uuid('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  clientExecutionId: text('client_execution_id').notNull(),
  skill: text('skill').notNull(),
  skillDigest: text('skill_digest'),
  triggerId: text('trigger_id'),
  triggerName: text('trigger_name'),
  model: text('model'),
  runtime: text('runtime'),
  status: executionStatusEnum('status').notNull(),
  errorCode: text('error_code'),
  durationMs: numeric('duration_ms', { precision: 18, scale: 3 }),
  findingCount: integer('finding_count').notNull(),
  highCount: integer('high_count').notNull(),
  mediumCount: integer('medium_count').notNull(),
  lowCount: integer('low_count').notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex('skill_executions_run_client_unique').on(table.runId, table.clientExecutionId),
  index('skill_executions_tenant_run_idx').on(table.tenantId, table.runId),
  index('skill_executions_tenant_skill_idx').on(table.tenantId, table.skill),
  index('skill_executions_tenant_error_idx').on(table.tenantId, table.errorCode),
]);

export const usageLineItems = pgTable('usage_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  runId: uuid('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  skillExecutionId: uuid('skill_execution_id').references(() => skillExecutions.id, { onDelete: 'cascade' }),
  lane: text('lane').notNull(),
  operation: text('operation'),
  provider: text('provider'),
  model: text('model'),
  runtime: text('runtime'),
  inputTokens: bigint('input_tokens', { mode: 'number' }),
  outputTokens: bigint('output_tokens', { mode: 'number' }),
  cacheReadInputTokens: bigint('cache_read_input_tokens', { mode: 'number' }),
  cacheCreationInputTokens: bigint('cache_creation_input_tokens', { mode: 'number' }),
  cacheCreation5mInputTokens: bigint('cache_creation_5m_input_tokens', { mode: 'number' }),
  cacheCreation1hInputTokens: bigint('cache_creation_1h_input_tokens', { mode: 'number' }),
  webSearchRequests: integer('web_search_requests'),
  costUsd: numeric('cost_usd', { precision: 20, scale: 10 }),
  costBasis: costBasisEnum('cost_basis').notNull(),
  ...timestamps,
}, (table) => [
  index('usage_tenant_run_idx').on(table.tenantId, table.runId),
  index('usage_tenant_dimensions_idx').on(table.tenantId, table.lane, table.model, table.runtime, table.provider),
]);

export const findings = pgTable('findings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  runId: uuid('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  skillExecutionId: uuid('skill_execution_id').notNull().references(() => skillExecutions.id, { onDelete: 'cascade' }),
  clientFindingId: text('client_finding_id').notNull(),
  reportedId: text('reported_id'),
  severity: text('severity').notNull(),
  confidence: text('confidence'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  verification: text('verification'),
  provenance: jsonb('provenance'),
  sourceEvidence: jsonb('source_evidence'),
  ...timestamps,
}, (table) => [
  uniqueIndex('findings_run_client_unique').on(table.runId, table.clientFindingId),
  // Dashboard feed joins findings to recent runs, then filters by severity/skill.
  index('findings_tenant_run_idx').on(table.tenantId, table.runId),
  index('findings_tenant_severity_idx').on(table.tenantId, table.severity),
  index('findings_tenant_skill_idx').on(table.tenantId, table.skillExecutionId),
]);

export const findingLocations = pgTable('finding_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  findingId: uuid('finding_id').notNull().references(() => findings.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  startLine: integer('start_line').notNull(),
  endLine: integer('end_line'),
  ordinal: integer('ordinal').notNull(),
}, (table) => [
  uniqueIndex('finding_locations_finding_ordinal_unique').on(table.findingId, table.ordinal),
  index('finding_locations_tenant_finding_idx').on(table.tenantId, table.findingId),
]);

export const findingObservations = pgTable('finding_observations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  runId: uuid('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  findingId: uuid('finding_id').notNull().references(() => findings.id, { onDelete: 'cascade' }),
  skillExecutionId: uuid('skill_execution_id').references(() => skillExecutions.id, { onDelete: 'set null' }),
  outcome: text('outcome').notNull(),
  reason: text('reason'),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
  ...timestamps,
}, (table) => [
  // Latest observation per finding uses ORDER BY observed_at DESC, id DESC LIMIT 1.
  index('finding_observations_tenant_finding_observed_idx').on(
    table.tenantId,
    table.findingId,
    table.observedAt,
    table.id,
  ),
]);

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  repositoryId: uuid('repository_id').references(() => repositories.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  entityId: uuid('entity_id'),
  inputVersion: integer('input_version').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  payloadRef: jsonb('payload_ref').notNull(),
  state: jobStateEnum('state').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(5),
  maxAgeSeconds: integer('max_age_seconds').notNull().default(86_400),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
  leaseOwner: text('lease_owner'),
  leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
  continuation: jsonb('continuation'),
  safeErrorCode: text('safe_error_code'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex('jobs_tenant_idempotency_unique').on(table.tenantId, table.idempotencyKey),
  index('jobs_claim_idx').on(table.state, table.nextAttemptAt, table.leaseExpiresAt),
  index('jobs_tenant_repository_idx').on(table.tenantId, table.repositoryId),
  check('jobs_limits_positive', sql`${table.maxAttempts} > 0 AND ${table.maxAgeSeconds} > 0 AND ${table.attempts} >= 0`),
]);

export const jobAttempts = pgTable('job_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  attempt: integer('attempt').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  safeErrorCode: text('safe_error_code'),
}, (table) => [uniqueIndex('job_attempts_job_attempt_unique').on(table.jobId, table.attempt)]);

export const memories = pgTable('memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  repositoryId: uuid('repository_id').notNull().references(() => repositories.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  idempotencyKey: text('idempotency_key').notNull(),
  kind: memoryKindEnum('kind').notNull(),
  lifecycle: memoryLifecycleEnum('lifecycle').notNull().default('candidate'),
  origin: text('origin').notNull(),
  content: text('content').notNull(),
  contentHash: text('content_hash').notNull(),
  searchDocument: text('search_document').notNull(),
  skill: text('skill'),
  language: text('language'),
  pathFamily: text('path_family'),
  confidence: numeric('confidence', { precision: 6, scale: 5 }),
  supportCount: integer('support_count').notNull().default(0),
  contradictionCount: integer('contradiction_count').notNull().default(0),
  policyVersion: text('policy_version'),
  modelVersion: text('model_version'),
  extractionProvider: text('extraction_provider'),
  extractionRuntime: text('extraction_runtime'),
  extractionInputTokens: bigint('extraction_input_tokens', { mode: 'number' }),
  extractionOutputTokens: bigint('extraction_output_tokens', { mode: 'number' }),
  extractionCostUsd: numeric('extraction_cost_usd', { precision: 20, scale: 10 }),
  extractionCostBasis: costBasisEnum('extraction_cost_basis'),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  supersededById: uuid('superseded_by_id'),
  archiveReason: text('archive_reason'),
  ...timestamps,
}, (table) => [
  uniqueIndex('memories_tenant_idempotency_unique').on(table.tenantId, table.idempotencyKey),
  index('memories_recall_idx').on(table.tenantId, table.repositoryId, table.lifecycle, table.expiresAt),
  index('memories_search_idx').using('gin', sql`to_tsvector('simple', ${table.searchDocument})`),
  check('memories_counts_nonnegative', sql`${table.supportCount} >= 0 AND ${table.contradictionCount} >= 0`),
]);

export const memoryEvidence = pgTable('memory_evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  memoryId: uuid('memory_id').notNull().references(() => memories.id, { onDelete: 'cascade' }),
  findingId: uuid('finding_id').references(() => findings.id, { onDelete: 'cascade' }),
  observationId: uuid('observation_id').references(() => findingObservations.id, { onDelete: 'cascade' }),
  evidenceKind: text('evidence_kind').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('memory_evidence_memory_observation_unique')
    .on(table.memoryId, table.observationId)
    .where(sql`${table.observationId} IS NOT NULL`),
  index('memory_evidence_tenant_idx').on(table.tenantId, table.memoryId),
]);

export const memoryEmbeddings = pgTable('memory_embeddings', {
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  memoryId: uuid('memory_id').notNull().references(() => memories.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  dimensions: integer('dimensions').notNull(),
  contentHash: text('content_hash').notNull(),
  embedding: jsonb('embedding'),
  inputTokens: bigint('input_tokens', { mode: 'number' }),
  costUsd: numeric('cost_usd', { precision: 20, scale: 10 }),
  costBasis: costBasisEnum('cost_basis'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.memoryId, table.provider, table.model] }),
  index('memory_embeddings_tenant_idx').on(table.tenantId, table.memoryId),
]);

export const memoryRecallBatches = pgTable('memory_recall_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  repositoryId: uuid('repository_id').notNull().references(() => repositories.id, { onDelete: 'cascade' }),
  runId: uuid('run_id').references(() => runs.id, { onDelete: 'set null' }),
  clientRecallId: text('client_recall_id').notNull(),
  memoryCount: integer('memory_count').notNull(),
  durationMs: numeric('duration_ms', { precision: 18, scale: 3 }).notNull(),
  provider: text('provider'),
  model: text('model'),
  runtime: text('runtime'),
  inputTokens: bigint('input_tokens', { mode: 'number' }),
  outputTokens: bigint('output_tokens', { mode: 'number' }),
  costUsd: numeric('cost_usd', { precision: 20, scale: 10 }),
  costBasis: costBasisEnum('cost_basis'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('memory_recall_batches_tenant_client_unique').on(table.tenantId, table.clientRecallId),
  index('memory_recall_batches_tenant_repository_idx').on(table.tenantId, table.repositoryId, table.createdAt),
  check('memory_recall_batches_count_nonnegative', sql`${table.memoryCount} >= 0`),
]);

export const memoryRecalls = pgTable('memory_recalls', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  repositoryId: uuid('repository_id').notNull().references(() => repositories.id, { onDelete: 'cascade' }),
  batchId: uuid('batch_id').references(() => memoryRecallBatches.id, { onDelete: 'cascade' }),
  runId: uuid('run_id').references(() => runs.id, { onDelete: 'set null' }),
  memoryId: uuid('memory_id').notNull().references(() => memories.id, { onDelete: 'cascade' }),
  lifecycleVersion: integer('lifecycle_version').notNull(),
  rank: integer('rank').notNull(),
  durationMs: numeric('duration_ms', { precision: 18, scale: 3 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('memory_recalls_tenant_repository_idx').on(table.tenantId, table.repositoryId, table.createdAt),
  uniqueIndex('memory_recalls_batch_memory_unique').on(table.batchId, table.memoryId),
]);

export const memoryLifecycleEvents = pgTable('memory_lifecycle_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  memoryId: uuid('memory_id').notNull().references(() => memories.id, { onDelete: 'cascade' }),
  fromState: memoryLifecycleEnum('from_state'),
  toState: memoryLifecycleEnum('to_state').notNull(),
  actorTokenId: uuid('actor_token_id').references(() => serviceTokens.id, { onDelete: 'set null' }),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('memory_lifecycle_events_tenant_idx').on(table.tenantId, table.memoryId)]);

export const memoryFeedback = pgTable('memory_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  memoryId: uuid('memory_id').notNull().references(() => memories.id, { onDelete: 'cascade' }),
  actorTokenId: uuid('actor_token_id').references(() => serviceTokens.id, { onDelete: 'set null' }),
  outcome: text('outcome').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('memory_feedback_tenant_memory_idx').on(table.tenantId, table.memoryId, table.createdAt)]);
