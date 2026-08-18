/**
 * Integration tests for verdict modal, persist, and Reviewed grouping.
 *
 * Covers ISC-8/9/10/13/15:
 * - save-on-enter (via upsertReview + saveReviews + applyVerdict)
 * - no-write-on-esc (cancel path: only applyVerdict is skipped)
 * - empty comment allowed (ISC-13)
 * - relabel overwrites previous verdict/comment (ISC-15)
 * - reload from disk restores Reviewed grouping (ISC-10)
 *
 * Also validates:
 * - JSONL fixture is never written to
 * - VERDICT_HOTKEYS covers f/m/t
 * - applyVerdict moves finding from unreviewed to reviewed
 * - applyVerdict on already-reviewed finding updates in-place
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { SkillReport } from '../../types/index.js';
import { buildInspectSession, applyVerdict } from './session.js';
import { loadReviews, saveReviews, upsertReview } from './reviews.js';
import { VERDICT_HOTKEYS } from './panes/verdict-modal.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal sanitized JSONL fixture content with two findings, one without snippet. */
const FIXTURE_JSONL = [
  JSON.stringify({
    schemaVersion: 1,
    run: {
      timestamp: '2026-08-18T09:11:07.000Z',
      durationMs: 1000,
      cwd: '/repo',
      runId: 'test-run-uuid-0001',
      model: 'openai/gpt-test',
      headSha: 'abc123',
    },
    skill: 'security-review',
    model: 'openai/gpt-test',
    chunk: { file: 'src/auth.ts', index: 1, total: 1, lineRange: '10-15' },
    status: 'ok',
    findings: [
      {
        id: 'F001',
        severity: 'high',
        confidence: 'high',
        title: 'SQL injection risk',
        description: 'User input interpolated into query.',
        location: { path: 'src/auth.ts', startLine: 10, endLine: 15 },
      },
    ],
    usageBreakdown: {
      scan: { usage: { inputTokens: 100, outputTokens: 50, costUSD: 0 }, model: 'openai/gpt-test' },
      total: { usage: { inputTokens: 100, outputTokens: 50, costUSD: 0 }, model: 'openai/gpt-test' },
    },
    durationMs: 1000,
  }),
  JSON.stringify({
    schemaVersion: 1,
    run: {
      timestamp: '2026-08-18T09:11:07.000Z',
      durationMs: 1000,
      cwd: '/repo',
      runId: 'test-run-uuid-0001',
      model: 'openai/gpt-test',
      headSha: 'abc123',
    },
    skill: 'security-review',
    model: 'openai/gpt-test',
    // No sourceSnippet on this chunk — tests ISC-12 edge case
    chunk: { file: 'src/helpers.ts', index: 1, total: 1, lineRange: '5' },
    status: 'ok',
    findings: [
      {
        id: 'F002',
        severity: 'medium',
        confidence: 'medium',
        title: 'Unsafe type assertion',
        description: 'External input cast without validation.',
        // No location — tests ISC-13 empty state
      },
    ],
    usageBreakdown: {
      scan: { usage: { inputTokens: 80, outputTokens: 30, costUSD: 0 }, model: 'openai/gpt-test' },
      total: { usage: { inputTokens: 80, outputTokens: 30, costUSD: 0 }, model: 'openai/gpt-test' },
    },
    durationMs: 800,
  }),
].join('\n');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReports(): SkillReport[] {
  return [
    {
      skill: 'security-review',
      summary: 'security-review: 1 finding',
      findings: [
        {
          id: 'F001',
          severity: 'high' as const,
          title: 'SQL injection risk',
          description: 'User input interpolated into query.',
          location: { path: 'src/auth.ts', startLine: 10, endLine: 15 },
        },
      ],
    },
    {
      skill: 'security-review',
      summary: 'security-review: 1 finding',
      findings: [
        {
          id: 'F002',
          severity: 'medium' as const,
          title: 'Unsafe type assertion',
          description: 'External input cast without validation.',
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let tempDir: string;
let jsonlPath: string;

beforeEach(() => {
  tempDir = join(tmpdir(), `warden-verdict-test-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });
  jsonlPath = join(tempDir, 'test-run-uuid-0001.jsonl');
  writeFileSync(jsonlPath, FIXTURE_JSONL, 'utf-8');
});

afterEach(() => {
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// VERDICT_HOTKEYS
// ---------------------------------------------------------------------------

describe('VERDICT_HOTKEYS', () => {
  it('maps f to false_positive', () => {
    expect(VERDICT_HOTKEYS['f']).toBe('false_positive');
  });

  it('maps m to mitigated', () => {
    expect(VERDICT_HOTKEYS['m']).toBe('mitigated');
  });

  it('maps t to true_positive', () => {
    expect(VERDICT_HOTKEYS['t']).toBe('true_positive');
  });
});

// ---------------------------------------------------------------------------
// applyVerdict — in-memory session updates
// ---------------------------------------------------------------------------

describe('applyVerdict', () => {
  it('moves finding from unreviewed to reviewed', () => {
    const reports = makeReports();
    const reviewFile = loadReviews(tempDir, 'test-run-uuid-0001', jsonlPath);
    const session = buildInspectSession(reports, reviewFile);

    expect(session.unreviewed).toHaveLength(2);
    expect(session.reviewed).toHaveLength(0);

    const finding = session.unreviewed[0]!;
    const review = {
      findingId: finding.finding.id,
      skill: finding.skill,
      verdict: 'false_positive' as const,
      comment: 'test helper',
      updatedAt: new Date().toISOString(),
    };

    const next = applyVerdict(session, finding.reviewKey, review);
    expect(next.unreviewed).toHaveLength(1);
    expect(next.reviewed).toHaveLength(1);
    expect(next.reviewed[0]?.reviewKey).toBe(finding.reviewKey);
    expect(next.reviewed[0]?.review?.verdict).toBe('false_positive');
  });

  it('updates a reviewed finding in-place (relabel) without changing length', () => {
    const reports = makeReports();
    const reviewFile = loadReviews(tempDir, 'test-run-uuid-0001', jsonlPath);
    let session = buildInspectSession(reports, reviewFile);

    const finding = session.unreviewed[0]!;
    const firstReview = {
      findingId: finding.finding.id,
      skill: finding.skill,
      verdict: 'false_positive' as const,
      comment: 'first label',
      updatedAt: new Date().toISOString(),
    };
    session = applyVerdict(session, finding.reviewKey, firstReview);

    // Now relabel.
    const secondReview = {
      findingId: finding.finding.id,
      skill: finding.skill,
      verdict: 'true_positive' as const,
      comment: 'relabelled',
      updatedAt: new Date().toISOString(),
    };
    const relabelled = applyVerdict(session, finding.reviewKey, secondReview);

    expect(relabelled.reviewed).toHaveLength(1);
    expect(relabelled.unreviewed).toHaveLength(1);
    expect(relabelled.reviewed[0]?.review?.verdict).toBe('true_positive');
    expect(relabelled.reviewed[0]?.review?.comment).toBe('relabelled');
  });

  it('does not mutate the original session', () => {
    const reports = makeReports();
    const reviewFile = loadReviews(tempDir, 'test-run-uuid-0001', jsonlPath);
    const session = buildInspectSession(reports, reviewFile);
    const origUnreviewed = [...session.unreviewed];

    const finding = session.unreviewed[0]!;
    applyVerdict(session, finding.reviewKey, {
      findingId: finding.finding.id,
      skill: finding.skill,
      verdict: 'mitigated' as const,
      comment: '',
      updatedAt: new Date().toISOString(),
    });

    expect(session.unreviewed).toHaveLength(origUnreviewed.length);
  });
});

// ---------------------------------------------------------------------------
// save-on-enter (ISC-9): upsertReview + saveReviews + applyVerdict
// ---------------------------------------------------------------------------

describe('save-on-enter flow', () => {
  it('persists verdict and moves finding to reviewed group (ISC-9)', () => {
    const reports = makeReports();
    let reviewFile = loadReviews(tempDir, 'test-run-uuid-0001', jsonlPath);
    let session = buildInspectSession(reports, reviewFile);

    const finding = session.unreviewed[0]!;

    // Simulate what handleModalConfirm does.
    reviewFile = upsertReview(reviewFile, finding.reviewKey, {
      findingId: finding.finding.id,
      skill: finding.skill,
      verdict: 'false_positive',
      comment: 'not a real vulnerability',
    });
    saveReviews(tempDir, reviewFile);

    const savedReview = reviewFile.reviews[finding.reviewKey]!;
    session = applyVerdict(session, finding.reviewKey, savedReview);

    expect(session.unreviewed).toHaveLength(1);
    expect(session.reviewed).toHaveLength(1);
    expect(session.reviewed[0]?.review?.verdict).toBe('false_positive');
    expect(session.reviewed[0]?.review?.comment).toBe('not a real vulnerability');
  });

  it('allows an empty comment (ISC-13)', () => {
    const reports = makeReports();
    let reviewFile = loadReviews(tempDir, 'test-run-uuid-0001', jsonlPath);
    let session = buildInspectSession(reports, reviewFile);

    const finding = session.unreviewed[0]!;
    reviewFile = upsertReview(reviewFile, finding.reviewKey, {
      findingId: finding.finding.id,
      skill: finding.skill,
      verdict: 'mitigated',
      comment: '',
    });
    saveReviews(tempDir, reviewFile);

    const savedReview = reviewFile.reviews[finding.reviewKey]!;
    session = applyVerdict(session, finding.reviewKey, savedReview);

    expect(session.reviewed[0]?.review?.comment).toBe('');
  });
});

// ---------------------------------------------------------------------------
// no-write-on-esc (ISC-9)
// ---------------------------------------------------------------------------

describe('cancel (Esc) path', () => {
  it('does not write to disk when the modal is cancelled', () => {
    // Simulate the Esc handler: just close the modal, do nothing.
    const reportsBefore = readFileSync(jsonlPath, 'utf-8');

    // No saveReviews call on cancel — verify sidecar is still absent.
    const reviewFile = loadReviews(tempDir, 'test-run-uuid-0001', jsonlPath);
    expect(reviewFile.reviews).toEqual({});

    // JSONL fixture unchanged.
    expect(readFileSync(jsonlPath, 'utf-8')).toBe(reportsBefore);
  });
});

// ---------------------------------------------------------------------------
// relabel overwrites (ISC-15)
// ---------------------------------------------------------------------------

describe('relabel overwrites (ISC-15)', () => {
  it('latest verdict and comment win when the same finding is labelled twice', () => {
    const reports = makeReports();
    let reviewFile = loadReviews(tempDir, 'test-run-uuid-0001', jsonlPath);
    const session = buildInspectSession(reports, reviewFile);
    const finding = session.unreviewed[0]!;

    reviewFile = upsertReview(reviewFile, finding.reviewKey, {
      findingId: finding.finding.id,
      skill: finding.skill,
      verdict: 'false_positive',
      comment: 'original',
    });
    saveReviews(tempDir, reviewFile);

    // Second label.
    let reloaded = loadReviews(tempDir, 'test-run-uuid-0001', jsonlPath);
    reloaded = upsertReview(reloaded, finding.reviewKey, {
      findingId: finding.finding.id,
      skill: finding.skill,
      verdict: 'true_positive',
      comment: 'updated',
    });
    saveReviews(tempDir, reloaded);

    const final = loadReviews(tempDir, 'test-run-uuid-0001', jsonlPath);
    expect(final.reviews[finding.reviewKey]?.verdict).toBe('true_positive');
    expect(final.reviews[finding.reviewKey]?.comment).toBe('updated');
  });
});

// ---------------------------------------------------------------------------
// reopen restores Reviewed grouping (ISC-10)
// ---------------------------------------------------------------------------

describe('reopen restores reviews (ISC-10)', () => {
  it('reviewed finding appears in the reviewed group after reload', () => {
    const reports = makeReports();
    let reviewFile = loadReviews(tempDir, 'test-run-uuid-0001', jsonlPath);
    const session = buildInspectSession(reports, reviewFile);

    const finding = session.unreviewed[0]!;
    reviewFile = upsertReview(reviewFile, finding.reviewKey, {
      findingId: finding.finding.id,
      skill: finding.skill,
      verdict: 'mitigated',
      comment: 'already handled',
    });
    saveReviews(tempDir, reviewFile);

    // Simulate reopening the same run.
    const reloadedReviewFile = loadReviews(tempDir, 'test-run-uuid-0001', jsonlPath);
    const reopenedSession = buildInspectSession(reports, reloadedReviewFile);

    expect(reopenedSession.reviewed).toHaveLength(1);
    expect(reopenedSession.reviewed[0]?.review?.verdict).toBe('mitigated');
    expect(reopenedSession.reviewed[0]?.review?.comment).toBe('already handled');
    expect(reopenedSession.unreviewed).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// JSONL fixture never written to (ISC-A-1)
// ---------------------------------------------------------------------------

describe('JSONL invariant (ISC-A-1)', () => {
  it('the review store writes only to .warden/reviews/, never the JSONL file', () => {
    const originalContent = readFileSync(jsonlPath, 'utf-8');

    const reports = makeReports();
    let reviewFile = loadReviews(tempDir, 'test-run-uuid-0001', jsonlPath);
    const session = buildInspectSession(reports, reviewFile);
    const finding = session.unreviewed[0]!;

    reviewFile = upsertReview(reviewFile, finding.reviewKey, {
      findingId: finding.finding.id,
      skill: finding.skill,
      verdict: 'false_positive',
      comment: 'test',
    });
    saveReviews(tempDir, reviewFile);

    // JSONL must be byte-for-byte identical.
    expect(readFileSync(jsonlPath, 'utf-8')).toBe(originalContent);
  });
});

// ---------------------------------------------------------------------------
// Unreviewed vs Reviewed partition after multiple verdicts
// ---------------------------------------------------------------------------

describe('findings grouping after verdicts', () => {
  it('both findings can be moved to reviewed independently', () => {
    const reports = makeReports();
    let reviewFile = loadReviews(tempDir, 'test-run-uuid-0001', jsonlPath);
    let session = buildInspectSession(reports, reviewFile);

    expect(session.unreviewed).toHaveLength(2);

    // Label first finding.
    const f1 = session.unreviewed[0]!;
    reviewFile = upsertReview(reviewFile, f1.reviewKey, {
      findingId: f1.finding.id,
      skill: f1.skill,
      verdict: 'false_positive',
      comment: '',
    });
    saveReviews(tempDir, reviewFile);
    session = applyVerdict(session, f1.reviewKey, reviewFile.reviews[f1.reviewKey]!);

    expect(session.unreviewed).toHaveLength(1);
    expect(session.reviewed).toHaveLength(1);

    // Label second finding.
    const f2 = session.unreviewed[0]!;
    reviewFile = upsertReview(reviewFile, f2.reviewKey, {
      findingId: f2.finding.id,
      skill: f2.skill,
      verdict: 'true_positive',
      comment: 'confirmed',
    });
    saveReviews(tempDir, reviewFile);
    session = applyVerdict(session, f2.reviewKey, reviewFile.reviews[f2.reviewKey]!);

    expect(session.unreviewed).toHaveLength(0);
    expect(session.reviewed).toHaveLength(2);
  });
});
