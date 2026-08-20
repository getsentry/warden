import type {
  PublishReviewsItem,
  PublishReviewsResponse,
  PublishReviewsUnmatched,
} from '@sentry/warden-service-api';
import { sha256Checksum } from '@sentry/warden-service-api';
import { canAccessRepository, requireServiceContext } from '../context.js';
import type { ServiceContext } from '../context.js';
import type { DatabaseClient, WardenDatabase } from '../db/database.js';

export class FindingReviewsError extends Error {
  constructor(readonly code: 'run_not_found' | 'repository_forbidden') {
    super(code);
    this.name = 'FindingReviewsError';
  }
}

function matchesFinding(
  row: { client_finding_id: string; reported_id: string | null },
  findingId: string,
): boolean {
  return row.client_finding_id === findingId || row.reported_id === findingId;
}

function resolveFinding(
  findings: readonly {
    id: string;
    client_finding_id: string;
    reported_id: string | null;
    skill: string;
  }[],
  item: PublishReviewsItem,
): { id: string; client_finding_id: string; reported_id: string | null; skill: string } | undefined {
  const matches = findings.filter((row) => row.skill === item.skill && matchesFinding(row, item.findingId));
  return matches[item.occurrence - 1];
}

async function upsertReview(
  client: DatabaseClient,
  context: ServiceContext,
  runId: string,
  finding: { id: string; client_finding_id: string },
  item: PublishReviewsItem,
): Promise<boolean> {
  const result = await client.query<{ id: string }>(`
    INSERT INTO finding_reviews (
      tenant_id, run_id, finding_id, verdict, comment, skill, client_finding_id, occurrence, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (finding_id) DO UPDATE SET
      verdict = EXCLUDED.verdict,
      comment = EXCLUDED.comment,
      skill = EXCLUDED.skill,
      client_finding_id = EXCLUDED.client_finding_id,
      occurrence = EXCLUDED.occurrence,
      updated_at = EXCLUDED.updated_at
    WHERE finding_reviews.updated_at < EXCLUDED.updated_at
    RETURNING id
  `, [
    context.tenantId,
    runId,
    finding.id,
    item.verdict,
    item.comment,
    item.skill,
    finding.client_finding_id,
    item.occurrence,
    item.updatedAt,
  ]);
  return result.rows.length > 0;
}

async function enqueueReviewExtract(
  client: DatabaseClient,
  context: ServiceContext,
  run: { id: string; repository_id: string; envelope_version: number },
  applied: readonly PublishReviewsItem[],
): Promise<void> {
  // Reviews arrive after ingest. Ignore the client's static HTTP
  // idempotency-key (clientRunId) and do not reuse memory_extract:run:${runId}:v1,
  // or a later relabel is swallowed.
  const checksum = await sha256Checksum(applied);
  await client.query(`
    INSERT INTO jobs (
      tenant_id, repository_id, type, entity_id, input_version, idempotency_key, payload_ref
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
  `, [
    context.tenantId,
    run.repository_id,
    'memory_extract',
    run.id,
    run.envelope_version,
    `memory_extract:finding_reviews:${run.id}:${checksum}`,
    JSON.stringify({ runId: run.id }),
  ]);
}

/**
 * Upsert inspect reviews on an already-ingested run and enqueue a
 * reviews-specific memory extract after any applied change.
 */
export async function publishFindingReviews(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  clientRunId: string,
  reviews: readonly PublishReviewsItem[],
): Promise<PublishReviewsResponse> {
  const context = requireServiceContext(contextInput);
  return database.transaction(async (client) => {
    const loaded = await client.query<{
      id: string;
      client_run_id: string;
      repository_id: string;
      envelope_version: number;
      full_name: string;
    }>(`
      SELECT r.id, r.client_run_id, r.repository_id, r.envelope_version, repo.full_name
      FROM runs r
      INNER JOIN repositories repo ON repo.id = r.repository_id
      WHERE r.tenant_id = $1 AND r.client_run_id = $2
      FOR UPDATE OF r
    `, [context.tenantId, clientRunId]);
    const run = loaded.rows[0];
    if (!run) throw new FindingReviewsError('run_not_found');
    if (!canAccessRepository(context, run.full_name)) {
      throw new FindingReviewsError('repository_forbidden');
    }

    const findings = await client.query<{
      id: string;
      client_finding_id: string;
      reported_id: string | null;
      skill: string;
    }>(`
      SELECT f.id, f.client_finding_id, f.reported_id, se.skill
      FROM findings f
      INNER JOIN skill_executions se ON se.id = f.skill_execution_id
      WHERE f.tenant_id = $1 AND f.run_id = $2
      ORDER BY se.created_at ASC, se.id ASC, f.created_at ASC, f.id ASC
    `, [context.tenantId, run.id]);

    const unmatched: PublishReviewsUnmatched[] = [];
    const appliedItems: PublishReviewsItem[] = [];
    for (const item of reviews) {
      const finding = resolveFinding(findings.rows, item);
      if (!finding) {
        unmatched.push({
          skill: item.skill,
          findingId: item.findingId,
          occurrence: item.occurrence,
          reason: 'finding_not_found',
        });
        continue;
      }
      if (await upsertReview(client, context, run.id, finding, item)) {
        appliedItems.push(item);
      }
    }

    if (appliedItems.length > 0) {
      await enqueueReviewExtract(client, context, run, appliedItems);
    }

    return {
      runId: run.id,
      clientRunId: run.client_run_id,
      applied: appliedItems.length,
      unmatched,
    };
  });
}
