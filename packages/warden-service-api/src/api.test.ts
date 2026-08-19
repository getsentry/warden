import { describe, expect, it } from 'vitest';
import {
  FindingFeedItemSchema,
  FindingListQuerySchema,
  FindingOutcomeSchema,
  PublishReviewsRequestSchema,
  PublishReviewsResponseSchema,
} from './api.js';

const repository = {
  provider: 'github' as const,
  owner: 'acme',
  name: 'widgets',
  fullName: 'acme/widgets',
};

const feedItem = {
  id: 'finding-row-1',
  displayId: 'finding-1',
  runId: 'stored-run-123',
  clientRunId: 'run-123',
  repository,
  skill: 'security-review',
  severity: 'high' as const,
  title: 'Hardcoded credential',
  description: 'A test fixture secret appears in source.',
  outcome: 'posted' as const,
  firstObservedAt: '2026-08-19T09:00:00.000Z',
  lastObservedAt: '2026-08-19T09:00:00.000Z',
  completedAt: '2026-08-19T09:00:03.000Z',
};

describe('review API schemas', () => {
  it('parses a reviews request with an empty comment', () => {
    const request = {
      reviews: [{
        skill: 'security-review',
        findingId: 'finding-1',
        occurrence: 1,
        verdict: 'true_positive' as const,
        comment: '',
        updatedAt: '2026-08-19T10:00:00.000Z',
      }],
    };

    expect(PublishReviewsRequestSchema.parse(request)).toEqual(request);
  });

  it('parses applied and unmatched reviews', () => {
    const response = {
      runId: 'stored-run-123',
      clientRunId: 'run-123',
      applied: 1,
      unmatched: [{
        skill: 'security-review',
        findingId: 'missing-finding',
        occurrence: 2,
        reason: 'finding_not_found' as const,
      }],
    };

    expect(PublishReviewsResponseSchema.parse(response)).toEqual(response);
  });

  it('keeps finding outcome independent of an attached review', () => {
    const item = FindingFeedItemSchema.parse({
      ...feedItem,
      review: {
        verdict: 'false_positive',
        comment: 'Test fixture, not a real leak.',
        updatedAt: '2026-08-19T10:00:00.000Z',
      },
    });

    expect(item.outcome).toBe('posted');
    expect(item.review).toEqual({
      verdict: 'false_positive',
      comment: 'Test fixture, not a real leak.',
      updatedAt: '2026-08-19T10:00:00.000Z',
    });
  });

  it('does not treat review verdicts as observation outcomes', () => {
    expect(FindingOutcomeSchema.options).toEqual([
      'posted',
      'deduped',
      'skipped',
      'resolved',
      'failed',
      'rejected',
      'revised',
    ]);
    expect(FindingOutcomeSchema.safeParse('false_positive').success).toBe(false);
  });

  it('accepts an optional findings list review filter', () => {
    expect(FindingListQuerySchema.parse({ review: 'mitigated' })).toEqual({
      review: 'mitigated',
    });
  });
});
