/**
 * Session model for `warden inspect`.
 *
 * Flattens a list of `SkillReport` objects (produced by `parseJsonlReports`)
 * into `InspectFinding[]`, assigns stable `reviewKey`s using occurrence
 * counts in parsed-report order, merges any existing sidecar reviews, and
 * partitions the list into unreviewed (sorted by severity → path → line) and
 * reviewed groups.
 */

import type { Finding, SkillReport } from '../../types/index.js';
import { SEVERITY_ORDER } from '../../types/index.js';
import type { FindingReview, ReviewFile } from './reviews.js';
import { reviewKey } from './reviews.js';
export type { FindingReview };

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface InspectFinding {
  /** Original finding data from the JSONL report. */
  finding: Finding;
  /** Skill name this finding came from. */
  skill: string;
  /**
   * Stable key: `${skill}:${finding.id}:${occurrence}`.
   * Occurrence is 1-based, assigned in parsed-report order across all reports
   * (not just within one skill) so identical IDs from different skills get
   * distinct occurrences when keyed together.
   */
  reviewKey: string;
  /** Current review from the sidecar, or undefined when unreviewed. */
  review?: FindingReview;
}

export interface InspectSession {
  /** Findings that have not yet been labelled, sorted by severity → path → line. */
  unreviewed: InspectFinding[];
  /** Findings that carry a verdict.  Order is stable (original parse order). */
  reviewed: InspectFinding[];
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Build an `InspectSession` from skill reports and an existing review sidecar.
 *
 * Occurrence counting tracks identical `finding.id` values across all reports
 * in parsed order.  The first occurrence of an id gets `:1`, the second `:2`,
 * and so on — matching the review-key collision rule from the service layer.
 */
export function buildInspectSession(
  reports: SkillReport[],
  reviewFile: ReviewFile,
): InspectSession {
  // Global occurrence counter keyed by finding.id (across all skills).
  const occurrences = new Map<string, number>();

  const all: InspectFinding[] = [];

  for (const report of reports) {
    for (const finding of report.findings) {
      const occ = (occurrences.get(finding.id) ?? 0) + 1;
      occurrences.set(finding.id, occ);

      const key = reviewKey(report.skill, finding.id, occ);
      const review = reviewFile.reviews[key];

      all.push({
        finding,
        skill: report.skill,
        reviewKey: key,
        review,
      });
    }
  }

  const reviewed: InspectFinding[] = [];
  const unreviewed: InspectFinding[] = [];

  for (const item of all) {
    if (item.review) {
      reviewed.push(item);
    } else {
      unreviewed.push(item);
    }
  }

  unreviewed.sort(compareUnreviewed);

  return { unreviewed, reviewed };
}

// ---------------------------------------------------------------------------
// In-memory verdict application
// ---------------------------------------------------------------------------

/**
 * Apply a new verdict to the in-memory session, moving the finding from
 * `unreviewed` to `reviewed` (or updating it in place when relabelling).
 *
 * Returns a new `InspectSession` — the original is not mutated.
 */
export function applyVerdict(
  session: InspectSession,
  reviewKey: string,
  review: FindingReview,
): InspectSession {
  // Remove from whichever list currently holds the finding.
  const fromUnreviewed = session.unreviewed.find((f) => f.reviewKey === reviewKey);
  const fromReviewed = session.reviewed.find((f) => f.reviewKey === reviewKey);
  const base = fromUnreviewed ?? fromReviewed;

  if (!base) {
    // Unknown key — nothing to update; return session unchanged.
    return session;
  }

  const updatedFinding: InspectFinding = {
    ...base,
    review,
  };

  const newUnreviewed = session.unreviewed.filter((f) => f.reviewKey !== reviewKey);
  // Re-sort is not necessary: the finding is moving to reviewed.

  const newReviewed = fromReviewed
    ? // Relabel: replace in-place, preserving original position.
      session.reviewed.map((f) => (f.reviewKey === reviewKey ? updatedFinding : f))
    : // New review: append.
      [...session.reviewed, updatedFinding];

  return { unreviewed: newUnreviewed, reviewed: newReviewed };
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

function compareUnreviewed(a: InspectFinding, b: InspectFinding): number {
  const sevDiff =
    SEVERITY_ORDER[a.finding.severity] - SEVERITY_ORDER[b.finding.severity];
  if (sevDiff !== 0) return sevDiff;

  const pathA = a.finding.location?.path ?? '';
  const pathB = b.finding.location?.path ?? '';
  const pathCmp = pathA.localeCompare(pathB);
  if (pathCmp !== 0) return pathCmp;

  const lineA = a.finding.location?.startLine ?? 0;
  const lineB = b.finding.location?.startLine ?? 0;
  return lineA - lineB;
}
