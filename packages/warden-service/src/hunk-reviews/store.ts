import type {
  HunkReviewRecallRequest,
  HunkReviewRecallResponse,
  HunkReviewRecordRequest,
  HunkReviewRecordResponse,
  RepositoryIdentity,
} from '@sentry/warden-service-api';
import { canAccessRepository, requireServiceContext } from '../context.js';
import type { ServiceContext } from '../context.js';
import type { DatabaseClient, WardenDatabase } from '../db/database.js';

/** Clean hunk reviews are reusable for this long unless tenant retention removes them sooner. */
const HUNK_REVIEW_TTL_DAYS = 30;

async function findRepositoryId(
  client: DatabaseClient,
  context: ServiceContext,
  identity: RepositoryIdentity,
): Promise<string | undefined> {
  if (!canAccessRepository(context, identity.fullName)) return undefined;
  const result = await client.query<{ id: string }>(`
    SELECT id FROM repositories
    WHERE tenant_id = $1 AND provider = $2 AND owner = $3 AND name = $4
    LIMIT 1
  `, [context.tenantId, identity.provider, identity.owner, identity.name]);
  return result.rows[0]?.id;
}

/** Find or create the repository row. Reviews are recorded before the run that produced them is published. */
async function upsertRepositoryId(
  client: DatabaseClient,
  context: ServiceContext,
  identity: RepositoryIdentity,
): Promise<string | undefined> {
  if (!canAccessRepository(context, identity.fullName)) return undefined;
  const result = await client.query<{ id: string }>(`
    INSERT INTO repositories (tenant_id, provider, owner, name, full_name, memory_enabled)
    VALUES ($1, $2, $3, $4, $5, false)
    ON CONFLICT (tenant_id, provider, owner, name) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = now()
    RETURNING id
  `, [context.tenantId, identity.provider, identity.owner, identity.name, identity.fullName]);
  return result.rows[0]?.id;
}

/** Store clean hunk reviews, replacing earlier reviews with the same key. */
export async function recordHunkReviews(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  request: HunkReviewRecordRequest,
): Promise<HunkReviewRecordResponse> {
  const context = requireServiceContext(contextInput);
  if (request.reviews.length === 0) return { recorded: 0 };
  return database.transaction(async (client) => {
    const repositoryId = await upsertRepositoryId(client, context, request.repository);
    if (!repositoryId) return { recorded: 0 };
    const result = await client.query(`
      INSERT INTO hunk_reviews (tenant_id, repository_id, review_key, skill, reviewed_sha, evidence, expires_at)
      SELECT $1, $2, r.key, r.skill, r.reviewed_sha, r.evidence, now() + ($4 * interval '1 day')
      FROM jsonb_to_recordset($3::jsonb) AS r(key text, skill text, reviewed_sha text, evidence jsonb)
      ON CONFLICT (tenant_id, repository_id, review_key) DO UPDATE SET
        skill = EXCLUDED.skill,
        reviewed_sha = EXCLUDED.reviewed_sha,
        evidence = EXCLUDED.evidence,
        expires_at = EXCLUDED.expires_at,
        updated_at = now()
    `, [
      context.tenantId,
      repositoryId,
      JSON.stringify(request.reviews.map((review) => ({
        key: review.key,
        skill: review.skill,
        reviewed_sha: review.reviewedSha ?? null,
        evidence: review.evidence,
      }))),
      HUNK_REVIEW_TTL_DAYS,
    ]);
    return { recorded: result.rowCount ?? request.reviews.length };
  });
}

/** Return unexpired clean reviews for the requested keys. Unknown repositories return none. */
export async function recallHunkReviews(
  database: WardenDatabase,
  contextInput: ServiceContext | undefined,
  request: HunkReviewRecallRequest,
): Promise<HunkReviewRecallResponse> {
  const context = requireServiceContext(contextInput);
  if (request.keys.length === 0) return { reviews: [] };
  return database.transaction(async (client) => {
    const repositoryId = await findRepositoryId(client, context, request.repository);
    if (!repositoryId) return { reviews: [] };
    const result = await client.query<{ review_key: string; evidence: HunkReviewRecallResponse['reviews'][number]['evidence'] }>(`
      SELECT review_key, evidence FROM hunk_reviews
      WHERE tenant_id = $1 AND repository_id = $2
        AND review_key = ANY($3::text[])
        AND expires_at > now()
    `, [context.tenantId, repositoryId, request.keys]);
    return { reviews: result.rows.map((row) => ({ key: row.review_key, evidence: row.evidence })) };
  });
}
