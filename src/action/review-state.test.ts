import { describe, it, expect } from 'vitest';
import {
  findBotReviewState,
  coordinateReviewEvents,
  applyCoordinationToReview,
} from './review-state.js';

describe('findBotReviewState', () => {
  const botLogin = 'warden[bot]';

  it('returns null when no reviews exist', () => {
    expect(findBotReviewState([], botLogin)).toBeNull();
  });

  it('returns null when no reviews from bot exist', () => {
    const reviews = [
      { state: 'APPROVED', user: { login: 'human-reviewer' } },
      { state: 'COMMENTED', user: { login: 'other-bot[bot]' } },
    ];
    expect(findBotReviewState(reviews, botLogin)).toBeNull();
  });

  it('returns most recent bot review state', () => {
    const reviews = [
      { state: 'CHANGES_REQUESTED', user: { login: botLogin } },
      { state: 'APPROVED', user: { login: 'human-reviewer' } },
    ];
    expect(findBotReviewState(reviews, botLogin)).toBe('CHANGES_REQUESTED');
  });

  it('returns most recent when multiple bot reviews exist', () => {
    const reviews = [
      { state: 'CHANGES_REQUESTED', user: { login: botLogin } }, // older
      { state: 'APPROVED', user: { login: botLogin } }, // newer
    ];
    expect(findBotReviewState(reviews, botLogin)).toBe('APPROVED');
  });

  it('returns null when most recent bot review is DISMISSED', () => {
    const reviews = [
      { state: 'CHANGES_REQUESTED', user: { login: botLogin } }, // older
      { state: 'DISMISSED', user: { login: botLogin } }, // newer - user dismissed
    ];
    expect(findBotReviewState(reviews, botLogin)).toBeNull();
  });

  it('does not look past DISMISSED review to find older state', () => {
    const reviews = [
      { state: 'CHANGES_REQUESTED', user: { login: botLogin } }, // oldest
      { state: 'APPROVED', user: { login: botLogin } }, // middle
      { state: 'DISMISSED', user: { login: botLogin } }, // newest - dismissed
    ];
    // Should return null, not APPROVED or CHANGES_REQUESTED
    expect(findBotReviewState(reviews, botLogin)).toBeNull();
  });

  it('ignores other bots DISMISSED state', () => {
    const reviews = [
      { state: 'CHANGES_REQUESTED', user: { login: botLogin } },
      { state: 'DISMISSED', user: { login: 'other-bot[bot]' } }, // different bot
    ];
    // Our bot's CHANGES_REQUESTED should still be found
    expect(findBotReviewState(reviews, botLogin)).toBe('CHANGES_REQUESTED');
  });

  it('handles reviews with null user', () => {
    const reviews = [
      { state: 'CHANGES_REQUESTED', user: null },
      { state: 'APPROVED', user: { login: botLogin } },
    ];
    expect(findBotReviewState(reviews, botLogin)).toBe('APPROVED');
  });

  it('handles reviews with missing user', () => {
    const reviews = [
      { state: 'CHANGES_REQUESTED' } as { state: string; user?: { login: string } | null },
      { state: 'COMMENTED', user: { login: botLogin } },
    ];
    expect(findBotReviewState(reviews, botLogin)).toBe('COMMENTED');
  });

  it('skips unknown review states', () => {
    const reviews = [
      { state: 'CHANGES_REQUESTED', user: { login: botLogin } },
      { state: 'PENDING', user: { login: botLogin } }, // unknown state
    ];
    // Should skip PENDING and return CHANGES_REQUESTED
    expect(findBotReviewState(reviews, botLogin)).toBe('CHANGES_REQUESTED');
  });
});

describe('coordinateReviewEvents', () => {
  describe('single trigger', () => {
    it('allows APPROVE when single trigger has no blocking findings', () => {
      const result = coordinateReviewEvents([
        { triggerName: 'trigger1', reviewEvent: 'APPROVE', failed: false },
      ]);

      expect(result).toEqual([
        { triggerName: 'trigger1', reviewEvent: 'APPROVE', approvalSuppressed: false },
      ]);
    });

    it('allows REQUEST_CHANGES for single trigger', () => {
      const result = coordinateReviewEvents([
        { triggerName: 'trigger1', reviewEvent: 'REQUEST_CHANGES', failed: false },
      ]);

      expect(result).toEqual([
        { triggerName: 'trigger1', reviewEvent: 'REQUEST_CHANGES', approvalSuppressed: false },
      ]);
    });

    it('allows COMMENT for single trigger', () => {
      const result = coordinateReviewEvents([
        { triggerName: 'trigger1', reviewEvent: 'COMMENT', failed: false },
      ]);

      expect(result).toEqual([
        { triggerName: 'trigger1', reviewEvent: 'COMMENT', approvalSuppressed: false },
      ]);
    });
  });

  describe('multiple triggers - failed trigger blocks approval', () => {
    it('suppresses APPROVE when another trigger failed', () => {
      // Scenario: Trigger A failed (maybe it previously had REQUEST_CHANGES),
      // Trigger B ran clean and wants to approve. We can't verify A's issues
      // are fixed, so suppress the approval.
      const result = coordinateReviewEvents([
        { triggerName: 'failed-trigger', reviewEvent: undefined, failed: true },
        { triggerName: 'clean-trigger', reviewEvent: 'APPROVE', failed: false },
      ]);

      expect(result).toEqual([
        { triggerName: 'failed-trigger', reviewEvent: undefined, approvalSuppressed: false },
        {
          triggerName: 'clean-trigger',
          reviewEvent: 'COMMENT',
          approvalSuppressed: true,
          suppressionReason: 'another trigger failed',
        },
      ]);
    });

    it('suppresses multiple APPROVEs when one trigger failed', () => {
      const result = coordinateReviewEvents([
        { triggerName: 'clean-trigger-1', reviewEvent: 'APPROVE', failed: false },
        { triggerName: 'failed-trigger', reviewEvent: undefined, failed: true },
        { triggerName: 'clean-trigger-2', reviewEvent: 'APPROVE', failed: false },
      ]);

      expect(result[0]!.approvalSuppressed).toBe(true);
      expect(result[0]!.suppressionReason).toBe('another trigger failed');
      expect(result[1]!.approvalSuppressed).toBe(false);
      expect(result[2]!.approvalSuppressed).toBe(true);
      expect(result[2]!.suppressionReason).toBe('another trigger failed');
    });

    it('failed trigger takes priority over REQUEST_CHANGES reason', () => {
      // When both a failure and blocking findings exist, failure reason takes priority
      // (since it's checked first)
      const result = coordinateReviewEvents([
        { triggerName: 'failed-trigger', reviewEvent: undefined, failed: true },
        { triggerName: 'blocking-trigger', reviewEvent: 'REQUEST_CHANGES', failed: false },
        { triggerName: 'clean-trigger', reviewEvent: 'APPROVE', failed: false },
      ]);

      expect(result[2]!.approvalSuppressed).toBe(true);
      expect(result[2]!.suppressionReason).toBe('another trigger failed');
    });
  });

  describe('multiple triggers - blocking findings override', () => {
    it('suppresses APPROVE when another trigger has REQUEST_CHANGES', () => {
      const result = coordinateReviewEvents([
        { triggerName: 'clean-trigger', reviewEvent: 'APPROVE', failed: false },
        { triggerName: 'blocking-trigger', reviewEvent: 'REQUEST_CHANGES', failed: false },
      ]);

      expect(result).toEqual([
        {
          triggerName: 'clean-trigger',
          reviewEvent: 'COMMENT',
          approvalSuppressed: true,
          suppressionReason: 'another trigger has blocking findings',
        },
        { triggerName: 'blocking-trigger', reviewEvent: 'REQUEST_CHANGES', approvalSuppressed: false },
      ]);
    });

    it('suppresses APPROVE even when it comes after REQUEST_CHANGES', () => {
      const result = coordinateReviewEvents([
        { triggerName: 'blocking-trigger', reviewEvent: 'REQUEST_CHANGES', failed: false },
        { triggerName: 'clean-trigger', reviewEvent: 'APPROVE', failed: false },
      ]);

      expect(result).toEqual([
        { triggerName: 'blocking-trigger', reviewEvent: 'REQUEST_CHANGES', approvalSuppressed: false },
        {
          triggerName: 'clean-trigger',
          reviewEvent: 'COMMENT',
          approvalSuppressed: true,
          suppressionReason: 'another trigger has blocking findings',
        },
      ]);
    });

    it('suppresses multiple APPROVEs when one trigger has REQUEST_CHANGES', () => {
      const result = coordinateReviewEvents([
        { triggerName: 'clean-trigger-1', reviewEvent: 'APPROVE', failed: false },
        { triggerName: 'blocking-trigger', reviewEvent: 'REQUEST_CHANGES', failed: false },
        { triggerName: 'clean-trigger-2', reviewEvent: 'APPROVE', failed: false },
      ]);

      expect(result[0]!.approvalSuppressed).toBe(true);
      expect(result[0]!.reviewEvent).toBe('COMMENT');
      expect(result[1]!.reviewEvent).toBe('REQUEST_CHANGES');
      expect(result[2]!.approvalSuppressed).toBe(true);
      expect(result[2]!.reviewEvent).toBe('COMMENT');
    });
  });

  describe('multiple triggers - duplicate approval prevention', () => {
    it('only allows first trigger to APPROVE when multiple want to', () => {
      const result = coordinateReviewEvents([
        { triggerName: 'trigger1', reviewEvent: 'APPROVE', failed: false },
        { triggerName: 'trigger2', reviewEvent: 'APPROVE', failed: false },
        { triggerName: 'trigger3', reviewEvent: 'APPROVE', failed: false },
      ]);

      expect(result).toEqual([
        { triggerName: 'trigger1', reviewEvent: 'APPROVE', approvalSuppressed: false },
        {
          triggerName: 'trigger2',
          reviewEvent: 'COMMENT',
          approvalSuppressed: true,
          suppressionReason: 'approval already posted by earlier trigger',
        },
        {
          triggerName: 'trigger3',
          reviewEvent: 'COMMENT',
          approvalSuppressed: true,
          suppressionReason: 'approval already posted by earlier trigger',
        },
      ]);
    });

    it('allows APPROVE after COMMENT triggers', () => {
      const result = coordinateReviewEvents([
        { triggerName: 'trigger1', reviewEvent: 'COMMENT', failed: false },
        { triggerName: 'trigger2', reviewEvent: 'APPROVE', failed: false },
        { triggerName: 'trigger3', reviewEvent: 'COMMENT', failed: false },
      ]);

      expect(result).toEqual([
        { triggerName: 'trigger1', reviewEvent: 'COMMENT', approvalSuppressed: false },
        { triggerName: 'trigger2', reviewEvent: 'APPROVE', approvalSuppressed: false },
        { triggerName: 'trigger3', reviewEvent: 'COMMENT', approvalSuppressed: false },
      ]);
    });
  });

  describe('edge cases', () => {
    it('handles empty trigger list', () => {
      const result = coordinateReviewEvents([]);
      expect(result).toEqual([]);
    });

    it('passes through undefined reviewEvent without suppression for failed triggers', () => {
      const result = coordinateReviewEvents([
        { triggerName: 'trigger1', reviewEvent: undefined, failed: true },
        { triggerName: 'trigger2', reviewEvent: 'COMMENT', failed: false },
      ]);

      expect(result).toEqual([
        { triggerName: 'trigger1', reviewEvent: undefined, approvalSuppressed: false },
        { triggerName: 'trigger2', reviewEvent: 'COMMENT', approvalSuppressed: false },
      ]);
    });

    it('REQUEST_CHANGES takes priority over duplicate approval rule', () => {
      // When both rules could apply, blocking findings reason takes priority
      const result = coordinateReviewEvents([
        { triggerName: 'trigger1', reviewEvent: 'APPROVE', failed: false },
        { triggerName: 'trigger2', reviewEvent: 'REQUEST_CHANGES', failed: false },
        { triggerName: 'trigger3', reviewEvent: 'APPROVE', failed: false },
      ]);

      // trigger1 suppressed due to blocking findings (not duplicate approval)
      expect(result[0]!.suppressionReason).toBe('another trigger has blocking findings');
      // trigger3 also suppressed due to blocking findings
      expect(result[2]!.suppressionReason).toBe('another trigger has blocking findings');
    });
  });

  describe('silent triggers (no review but not failed)', () => {
    it('does not block approval from other triggers', () => {
      // Silent trigger: succeeded but has no review to post (e.g., reportOn: 'off')
      const result = coordinateReviewEvents([
        { triggerName: 'silent-trigger', reviewEvent: undefined, failed: false },
        { triggerName: 'approving-trigger', reviewEvent: 'APPROVE', failed: false },
      ]);

      expect(result).toEqual([
        { triggerName: 'silent-trigger', reviewEvent: undefined, approvalSuppressed: false },
        { triggerName: 'approving-trigger', reviewEvent: 'APPROVE', approvalSuppressed: false },
      ]);
    });

    it('allows approval when multiple silent triggers exist', () => {
      const result = coordinateReviewEvents([
        { triggerName: 'silent-1', reviewEvent: undefined, failed: false },
        { triggerName: 'silent-2', reviewEvent: undefined, failed: false },
        { triggerName: 'approving', reviewEvent: 'APPROVE', failed: false },
      ]);

      expect(result[2]!.reviewEvent).toBe('APPROVE');
      expect(result[2]!.approvalSuppressed).toBe(false);
    });

    it('still blocks approval when a failed trigger exists alongside silent', () => {
      const result = coordinateReviewEvents([
        { triggerName: 'silent-trigger', reviewEvent: undefined, failed: false },
        { triggerName: 'failed-trigger', reviewEvent: undefined, failed: true },
        { triggerName: 'approving-trigger', reviewEvent: 'APPROVE', failed: false },
      ]);

      expect(result[2]!.reviewEvent).toBe('COMMENT');
      expect(result[2]!.approvalSuppressed).toBe(true);
      expect(result[2]!.suppressionReason).toBe('another trigger failed');
    });
  });
});

describe('applyCoordinationToReview', () => {
  describe('when approval is suppressed', () => {
    it('downgrades APPROVE to COMMENT and clears body', () => {
      const review = {
        event: 'APPROVE' as const,
        body: 'All previously reported issues have been resolved.',
        comments: [],
      };
      const coordination = {
        triggerName: 'test',
        reviewEvent: 'COMMENT' as const,
        approvalSuppressed: true,
        suppressionReason: 'another trigger has blocking findings',
      };

      const result = applyCoordinationToReview(review, coordination);

      expect(result).toEqual({
        event: 'COMMENT',
        body: '',
        comments: [],
      });
    });

    it('clears body even when it contains findings summary', () => {
      const review = {
        event: 'APPROVE' as const,
        body: 'All previously reported issues have been resolved.\n\nSummary: 0 issues found.',
        comments: [{ body: 'Some comment', path: 'file.ts', line: 10 }],
      };
      const coordination = {
        triggerName: 'test',
        reviewEvent: 'COMMENT' as const,
        approvalSuppressed: true,
        suppressionReason: 'approval already posted by earlier trigger',
      };

      const result = applyCoordinationToReview(review, coordination);

      expect(result?.event).toBe('COMMENT');
      expect(result?.body).toBe('');
      // Comments are preserved
      expect(result?.comments).toEqual([{ body: 'Some comment', path: 'file.ts', line: 10 }]);
    });
  });

  describe('when approval is not suppressed', () => {
    it('returns APPROVE review unchanged', () => {
      const review = {
        event: 'APPROVE' as const,
        body: 'All previously reported issues have been resolved.',
        comments: [],
      };
      const coordination = {
        triggerName: 'test',
        reviewEvent: 'APPROVE' as const,
        approvalSuppressed: false,
      };

      const result = applyCoordinationToReview(review, coordination);

      expect(result).toEqual(review);
    });

    it('returns REQUEST_CHANGES review unchanged', () => {
      const review = {
        event: 'REQUEST_CHANGES' as const,
        body: 'Issues found.',
        comments: [{ body: 'Fix this', path: 'file.ts', line: 5 }],
      };
      const coordination = {
        triggerName: 'test',
        reviewEvent: 'REQUEST_CHANGES' as const,
        approvalSuppressed: false,
      };

      const result = applyCoordinationToReview(review, coordination);

      expect(result).toEqual(review);
    });

    it('returns COMMENT review unchanged', () => {
      const review = {
        event: 'COMMENT' as const,
        body: '',
        comments: [{ body: 'Note', path: 'file.ts', line: 1 }],
      };
      const coordination = {
        triggerName: 'test',
        reviewEvent: 'COMMENT' as const,
        approvalSuppressed: false,
      };

      const result = applyCoordinationToReview(review, coordination);

      expect(result).toEqual(review);
    });
  });

  describe('edge cases', () => {
    it('returns undefined when review is undefined', () => {
      const coordination = {
        triggerName: 'test',
        reviewEvent: 'COMMENT' as const,
        approvalSuppressed: true,
        suppressionReason: 'test',
      };

      const result = applyCoordinationToReview(undefined, coordination);

      expect(result).toBeUndefined();
    });

    it('returns review unchanged when coordination is undefined', () => {
      const review = {
        event: 'APPROVE' as const,
        body: 'Approved!',
        comments: [],
      };

      const result = applyCoordinationToReview(review, undefined);

      expect(result).toEqual(review);
    });

    it('does not modify non-APPROVE review even when suppressed', () => {
      const review = {
        event: 'REQUEST_CHANGES' as const,
        body: 'Issues found.',
        comments: [],
      };
      const coordination = {
        triggerName: 'test',
        reviewEvent: 'COMMENT' as const,
        approvalSuppressed: true,
        suppressionReason: 'test',
      };

      const result = applyCoordinationToReview(review, coordination);

      // Should not modify since it's already REQUEST_CHANGES, not APPROVE
      expect(result).toEqual(review);
    });
  });
});
