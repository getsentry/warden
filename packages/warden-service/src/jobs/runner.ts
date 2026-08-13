import { randomUUID } from 'node:crypto';
import type { DatabaseClient, WardenDatabase } from '../db/database.js';

export type JobType = 'memory_extract' | 'memory_embed' | 'retention';

export interface ClaimedJob {
  id: string;
  tenantId: string;
  repositoryId: string | null;
  type: JobType;
  entityId: string | null;
  inputVersion: number;
  attempts: number;
  maxAttempts: number;
  maxAgeSeconds: number;
  continuation: unknown;
  createdAt: Date;
}

export interface JobHandlerResult {
  complete: boolean;
  continuation?: unknown;
}

export type JobHandler = (job: ClaimedJob, context: { deadline: number }) => Promise<JobHandlerResult>;
export type JobHandlers = Partial<Record<JobType, JobHandler>>;

export interface ProcessJobSliceOptions {
  deadline: number;
  workerId?: string;
  batchSize?: number;
  leaseSeconds?: number;
}

export interface ProcessJobSliceResult {
  claimed: number;
  completed: number;
  retried: number;
  continued: number;
  deadlineReached: boolean;
}

interface JobRow extends Record<string, unknown> {
  id: string;
  tenant_id: string;
  repository_id: string | null;
  type: JobType;
  entity_id: string | null;
  input_version: number;
  attempts: number;
  max_attempts: number;
  max_age_seconds: number;
  continuation: unknown;
  created_at: Date;
}

function mapJob(row: JobRow): ClaimedJob {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    repositoryId: row.repository_id,
    type: row.type,
    entityId: row.entity_id,
    inputVersion: row.input_version,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    maxAgeSeconds: row.max_age_seconds,
    continuation: row.continuation,
    createdAt: row.created_at,
  };
}

async function claimJobs(
  database: WardenDatabase,
  workerId: string,
  batchSize: number,
  leaseSeconds: number,
): Promise<ClaimedJob[]> {
  return database.transaction(async (client) => {
    await client.query(`
      UPDATE jobs SET state = 'retry', lease_owner = NULL, lease_expires_at = NULL,
        next_attempt_at = now(), safe_error_code = 'stale_lease', updated_at = now()
      WHERE state = 'running' AND lease_expires_at < now()
    `);
    const result = await client.query<JobRow>(`
      WITH candidates AS (
        SELECT id FROM jobs
        WHERE state IN ('pending', 'retry')
          AND next_attempt_at <= now()
          AND attempts < max_attempts
          AND created_at + (max_age_seconds * interval '1 second') > now()
        ORDER BY next_attempt_at, created_at, id
        FOR UPDATE SKIP LOCKED
        LIMIT $1
      )
      UPDATE jobs SET
        state = 'running', attempts = attempts + 1, lease_owner = $2,
        lease_expires_at = now() + ($3 * interval '1 second'), updated_at = now()
      FROM candidates WHERE jobs.id = candidates.id
      RETURNING jobs.id, jobs.tenant_id, jobs.repository_id, jobs.type, jobs.entity_id,
        jobs.input_version, jobs.attempts, jobs.max_attempts, jobs.max_age_seconds,
        jobs.continuation, jobs.created_at
    `, [batchSize, workerId, leaseSeconds]);
    return result.rows.map(mapJob);
  });
}

async function finishJob(client: DatabaseClient, job: ClaimedJob, workerId: string): Promise<void> {
  await client.query(`
    UPDATE jobs SET state = 'complete', completed_at = now(), lease_owner = NULL,
      lease_expires_at = NULL, safe_error_code = NULL, updated_at = now()
    WHERE id = $1 AND tenant_id = $2 AND state = 'running' AND lease_owner = $3
  `, [job.id, job.tenantId, workerId]);
  await client.query(`
    UPDATE job_attempts SET completed_at = now()
    WHERE job_id = $1 AND attempt = $2
  `, [job.id, job.attempts]);
}

async function continueJob(client: DatabaseClient, job: ClaimedJob, workerId: string, continuation: unknown): Promise<void> {
  await client.query(`
    UPDATE jobs SET state = 'retry', continuation = $4, next_attempt_at = now(),
      lease_owner = NULL, lease_expires_at = NULL, updated_at = now()
    WHERE id = $1 AND tenant_id = $2 AND state = 'running' AND lease_owner = $3
  `, [job.id, job.tenantId, workerId, JSON.stringify(continuation ?? null)]);
  await client.query(`
    UPDATE job_attempts SET completed_at = now(), safe_error_code = 'continuation'
    WHERE job_id = $1 AND attempt = $2
  `, [job.id, job.attempts]);
}

async function failJob(client: DatabaseClient, job: ClaimedJob, workerId: string, safeErrorCode: string): Promise<void> {
  const ageSeconds = (Date.now() - job.createdAt.getTime()) / 1_000;
  const terminal = job.attempts >= job.maxAttempts || ageSeconds >= job.maxAgeSeconds;
  const delaySeconds = Math.min(3_600, 5 * 2 ** Math.max(0, job.attempts - 1));
  await client.query(`
    UPDATE jobs SET state = $4::job_state,
      next_attempt_at = CASE WHEN $4 = 'retry' THEN now() + ($5 * interval '1 second') ELSE next_attempt_at END,
      lease_owner = NULL, lease_expires_at = NULL, safe_error_code = $6, updated_at = now()
    WHERE id = $1 AND tenant_id = $2 AND state = 'running' AND lease_owner = $3
  `, [job.id, job.tenantId, workerId, terminal ? 'dead' : 'retry', delaySeconds, safeErrorCode]);
  await client.query(`
    UPDATE job_attempts SET completed_at = now(), safe_error_code = $3
    WHERE job_id = $1 AND attempt = $2
  `, [job.id, job.attempts, safeErrorCode]);
}

/** Claim and execute one deadline-bounded slice of durable Postgres jobs. */
export async function processJobSlice(
  database: WardenDatabase,
  handlers: JobHandlers,
  options: ProcessJobSliceOptions,
): Promise<ProcessJobSliceResult> {
  const workerId = options.workerId ?? randomUUID();
  const jobs = await claimJobs(
    database,
    workerId,
    Math.min(50, Math.max(1, options.batchSize ?? 10)),
    Math.min(300, Math.max(10, options.leaseSeconds ?? 60)),
  );
  const result: ProcessJobSliceResult = {
    claimed: jobs.length,
    completed: 0,
    retried: 0,
    continued: 0,
    deadlineReached: false,
  };

  for (const job of jobs) {
    if (Date.now() >= options.deadline - 250) {
      result.deadlineReached = true;
      await database.transaction((client) => continueJob(client, job, workerId, job.continuation));
      result.continued += 1;
      continue;
    }
    await database.query(`
      INSERT INTO job_attempts (tenant_id, job_id, attempt, started_at)
      VALUES ($1, $2, $3, now()) ON CONFLICT (job_id, attempt) DO NOTHING
    `, [job.tenantId, job.id, job.attempts]);
    const handler = handlers[job.type];
    if (!handler) {
      await database.transaction((client) => failJob(client, job, workerId, 'handler_missing'));
      result.retried += 1;
      continue;
    }
    try {
      const handled = await handler(job, { deadline: options.deadline });
      if (handled.complete) {
        await database.transaction((client) => finishJob(client, job, workerId));
        result.completed += 1;
      } else {
        await database.transaction((client) => continueJob(client, job, workerId, handled.continuation));
        result.continued += 1;
      }
    } catch {
      await database.transaction((client) => failJob(client, job, workerId, 'handler_failed'));
      result.retried += 1;
    }
  }
  return result;
}

/** Run the same job-slice path continuously for portable long-running hosts. */
export async function runWorker(
  database: WardenDatabase,
  handlers: JobHandlers,
  options: { signal?: AbortSignal; pollIntervalMs?: number } = {},
): Promise<void> {
  const interval = Math.max(100, options.pollIntervalMs ?? 1_000);
  while (!options.signal?.aborted) {
    await processJobSlice(database, handlers, { deadline: Date.now() + 30_000 });
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, interval);
      options.signal?.addEventListener('abort', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
    });
  }
}
