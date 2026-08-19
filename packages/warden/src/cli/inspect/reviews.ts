/**
 * Review store for `warden inspect`.
 *
 * Persists analyst verdicts to `.warden/reviews/<runId>.json` without touching
 * the JSONL log.  Atomic writes (write-then-rename) guarantee no half-written
 * files even if the process is interrupted.
 *
 * Schema version 2 stores `occurrence` on each review.  `loadReviews` still
 * accepts version 1 and lifts occurrence from the map key (`:(\d+)$`).
 * Unknown versions are refused.
 *
 * When the JSONL log carries no `runId` a stable fallback is derived from the
 * resolved log filename (basename without extension) and documented in the
 * file's own `runId` field so callers can always see what key was used.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const ReviewVerdictSchema = z.enum(['false_positive', 'mitigated', 'true_positive']);
export type ReviewVerdict = z.infer<typeof ReviewVerdictSchema>;

export const FindingReviewSchema = z.object({
  findingId: z.string(),
  skill: z.string(),
  /** 1-based, assigned in parsed-report order. Matches the map-key suffix. */
  occurrence: z.number().int().positive(),
  verdict: ReviewVerdictSchema,
  /** Empty string is a valid (absent) comment. */
  comment: z.string(),
  updatedAt: z.string().datetime(),
});
export type FindingReview = z.infer<typeof FindingReviewSchema>;

export const ReviewFileSchema = z.object({
  /** Bump when the shape changes in an incompatible way. */
  schemaVersion: z.literal(2),
  /**
   * Full run UUID from the log, or a filename-derived fallback of the form
   * `file:<basename-without-extension>` when the log carries no runId.
   */
  runId: z.string(),
  /** Absolute path to the JSONL log this review file covers. */
  logPath: z.string(),
  updatedAt: z.string().datetime(),
  /** Map from reviewKey → FindingReview. */
  reviews: z.record(z.string(), FindingReviewSchema),
});
export type ReviewFile = z.infer<typeof ReviewFileSchema>;

const LegacyFindingReviewSchema = FindingReviewSchema.omit({ occurrence: true });

const LegacyReviewFileSchema = ReviewFileSchema.extend({
  schemaVersion: z.literal(1),
  reviews: z.record(z.string(), LegacyFindingReviewSchema),
});

/** Trailing `:<digits>` on `skill:findingId:occurrence`. */
const OCCURRENCE_SUFFIX = /:(\d+)$/;

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

/**
 * Stable key for a finding.  Occurrence is assigned in parsed-report order
 * (1-based) so the key is stable across reopens of the same log.
 */
export function reviewKey(skill: string, findingId: string, occurrence: number): string {
  return `${skill}:${findingId}:${occurrence}`;
}

/**
 * Read the 1-based occurrence stored as the last `:digits` segment of a
 * review map key.  Throws when the key is not in `skill:id:occurrence` form.
 */
function occurrenceFromKey(key: string): number {
  const match = OCCURRENCE_SUFFIX.exec(key);
  if (match === null) {
    throw new Error(`Review key is missing a 1-based occurrence suffix: ${key}`);
  }
  return Number(match[1]);
}

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

/**
 * Path to the review sidecar for a run.
 *
 * Stored under `.warden/reviews/` so that log GC cannot remove labels along
 * with old JSONL files.
 */
export function reviewFilePath(repoRoot: string, runId: string): string {
  return join(repoRoot, '.warden', 'reviews', `${runId}.json`);
}

// ---------------------------------------------------------------------------
// Load / Save
// ---------------------------------------------------------------------------

function migrateV1(file: z.infer<typeof LegacyReviewFileSchema>): ReviewFile {
  const reviews: Record<string, FindingReview> = {};
  for (const [key, review] of Object.entries(file.reviews)) {
    reviews[key] = { ...review, occurrence: occurrenceFromKey(key) };
  }
  return { ...file, schemaVersion: 2, reviews };
}

/**
 * Load reviews from disk.  Returns an empty `ReviewFile` when the sidecar
 * does not exist yet (first open).  Throws on parse errors — callers should
 * surface those to the user rather than silently discarding reviews.
 *
 * Accepts schema v1 and v2.  v1 entries gain `occurrence` from the map key.
 * Unknown `schemaVersion` values throw.
 */
export function loadReviews(repoRoot: string, runId: string, logPath: string): ReviewFile {
  const filePath = reviewFilePath(repoRoot, runId);
  if (!existsSync(filePath)) {
    return {
      schemaVersion: 2,
      runId,
      logPath,
      updatedAt: new Date().toISOString(),
      reviews: {},
    };
  }
  const raw: unknown = JSON.parse(readFileSync(filePath, 'utf-8'));
  const version =
    raw !== null && typeof raw === 'object' && 'schemaVersion' in raw
      ? (raw as { schemaVersion: unknown }).schemaVersion
      : undefined;

  if (version === 1) {
    return ReviewFileSchema.parse(migrateV1(LegacyReviewFileSchema.parse(raw)));
  }
  if (version === 2) {
    return ReviewFileSchema.parse(raw);
  }
  throw new Error(`Unsupported review sidecar schemaVersion: ${String(version)}`);
}

/**
 * Atomically write `data` to disk.
 *
 * Writes to a `.tmp` sibling first, then renames so readers never see a
 * partially-written file.
 */
export function saveReviews(repoRoot: string, data: ReviewFile): void {
  const filePath = reviewFilePath(repoRoot, data.runId);
  const tmpPath = `${filePath}.tmp`;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  renameSync(tmpPath, filePath);
}

/**
 * Add or overwrite a single review entry.  Relabelling always overwrites the
 * previous verdict + comment (ISC-15).
 *
 * Occurrence is taken from the map key so callers keep passing
 * `reviewKey(skill, findingId, occurrence)` without restating it.
 *
 * Returns the updated `ReviewFile` — callers must pass it to `saveReviews`
 * to persist the change.
 */
export function upsertReview(
  data: ReviewFile,
  key: string,
  review: Omit<FindingReview, 'updatedAt' | 'occurrence'>,
): ReviewFile {
  const now = new Date().toISOString();
  return {
    ...data,
    updatedAt: now,
    reviews: {
      ...data.reviews,
      [key]: { ...review, occurrence: occurrenceFromKey(key), updatedAt: now },
    },
  };
}
