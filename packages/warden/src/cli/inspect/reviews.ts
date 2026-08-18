/**
 * Review store for `warden inspect`.
 *
 * Persists analyst verdicts to `.warden/reviews/<runId>.json` without touching
 * the JSONL log.  Atomic writes (write-then-rename) guarantee no half-written
 * files even if the process is interrupted.
 *
 * Schema version 1.  If the shape ever changes in a breaking way, bump
 * `schemaVersion` and add a migration in `loadReviews`.
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
  verdict: ReviewVerdictSchema,
  /** Empty string is a valid (absent) comment. */
  comment: z.string(),
  updatedAt: z.string().datetime(),
});
export type FindingReview = z.infer<typeof FindingReviewSchema>;

export const ReviewFileSchema = z.object({
  /** Bump when the shape changes in an incompatible way. */
  schemaVersion: z.literal(1),
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

/**
 * Load reviews from disk.  Returns an empty `ReviewFile` when the sidecar
 * does not exist yet (first open).  Throws on parse errors — callers should
 * surface those to the user rather than silently discarding reviews.
 */
export function loadReviews(repoRoot: string, runId: string, logPath: string): ReviewFile {
  const filePath = reviewFilePath(repoRoot, runId);
  if (!existsSync(filePath)) {
    return {
      schemaVersion: 1,
      runId,
      logPath,
      updatedAt: new Date().toISOString(),
      reviews: {},
    };
  }
  const raw = readFileSync(filePath, 'utf-8');
  return ReviewFileSchema.parse(JSON.parse(raw));
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
 * Returns the updated `ReviewFile` — callers must pass it to `saveReviews`
 * to persist the change.
 */
export function upsertReview(
  data: ReviewFile,
  key: string,
  review: Omit<FindingReview, 'updatedAt'>,
): ReviewFile {
  const now = new Date().toISOString();
  return {
    ...data,
    updatedAt: now,
    reviews: {
      ...data.reviews,
      [key]: { ...review, updatedAt: now },
    },
  };
}
