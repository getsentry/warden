import { describe, it, expect } from 'vitest';
import {
  buildReviewCoordination,
  shouldResolveStaleComments,
  type TriggerExecutionResult,
} from './review/coordination.js';
import { applyCoordinationToReview } from './review-state.js';
import type { SkillReport } from '../types/index.js';
import type { RenderResult } from '../output/types.js';

// -----------------------------------------------------------------------------
// Test Helper: orchestrateReviews
// This function is only used for testing the orchestration logic.
// Production code in main.ts uses the lower-level functions directly.
// -----------------------------------------------------------------------------

interface SuccessfulTrigger {
  triggerName: string;
  report: SkillReport;
  renderResult: RenderResult;
  reviewDecision: {
    approvalSuppressed: boolean;
    suppressionReason?: string;
  };
}

interface OrchestrationResult {
  successful: SuccessfulTrigger[];
  canResolveStale: boolean;
  failedTriggers: string[];
}

function orchestrateReviews(results: TriggerExecutionResult[]): OrchestrationResult {
  const coordination = buildReviewCoordination(results);
  const successful: SuccessfulTrigger[] = [];

  for (const [i, result] of results.entries()) {
    const coord = coordination[i];
    if (!result.report || !result.renderResult || !coord) {
      continue;
    }

    const coordinatedReview = applyCoordinationToReview(result.renderResult.review, coord);

    successful.push({
      triggerName: result.triggerName,
      report: result.report,
      renderResult:
        coordinatedReview !== result.renderResult.review
          ? { ...result.renderResult, review: coordinatedReview }
          : result.renderResult,
      reviewDecision: {
        approvalSuppressed: coord.approvalSuppressed,
        suppressionReason: coord.suppressionReason,
      },
    });
  }

  return {
    successful,
    canResolveStale: shouldResolveStaleComments(results),
    failedTriggers: results.filter((r) => r.error).map((r) => r.triggerName),
  };
}

// -----------------------------------------------------------------------------
// Test Fixtures
// -----------------------------------------------------------------------------

function makeReport(skill: string, findings: SkillReport['findings'] = []): SkillReport {
  return { skill, summary: `${skill} report`, findings };
}

function makeRenderResult(event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'): RenderResult {
  return {
    review: { event, body: '', comments: [] },
    summaryComment: '',
  };
}

/**
 * Builders for common trigger execution scenarios.
 * Each method returns a TriggerExecutionResult representing that scenario.
 */
const Trigger = {
  /** Succeeded, wants to approve (e.g., no findings, clearing previous REQUEST_CHANGES) */
  approving(name: string): TriggerExecutionResult {
    return {
      triggerName: name,
      report: makeReport(name),
      renderResult: makeRenderResult('APPROVE'),
    };
  },

  /** Succeeded, has blocking findings (REQUEST_CHANGES) */
  blocking(name: string): TriggerExecutionResult {
    return {
      triggerName: name,
      report: makeReport(name, [
        { id: '1', severity: 'high', title: 'Issue', description: 'Details' },
      ]),
      renderResult: makeRenderResult('REQUEST_CHANGES'),
    };
  },

  /** Succeeded, has non-blocking findings (COMMENT) */
  commenting(name: string): TriggerExecutionResult {
    return {
      triggerName: name,
      report: makeReport(name, [
        { id: '1', severity: 'low', title: 'Note', description: 'Details' },
      ]),
      renderResult: makeRenderResult('COMMENT'),
    };
  },

  /** Succeeded, no review to post */
  silent(name: string): TriggerExecutionResult {
    return {
      triggerName: name,
      report: makeReport(name),
      renderResult: { summaryComment: '' },
    };
  },

  /** Failed with an error */
  failed(name: string): TriggerExecutionResult {
    return {
      triggerName: name,
      error: new Error(`${name} failed`),
    };
  },
};

// -----------------------------------------------------------------------------
// Scenario Tests
// -----------------------------------------------------------------------------

describe('orchestrateReviews', () => {
  describe('approval blocking', () => {
    it('blocks approval when another trigger failed', () => {
      const results = [Trigger.failed('security-review'), Trigger.approving('code-review')];

      const { successful } = orchestrateReviews(results);

      const codeReview = successful.find((r) => r.triggerName === 'code-review');
      expect(codeReview?.reviewDecision.approvalSuppressed).toBe(true);
      expect(codeReview?.reviewDecision.suppressionReason).toBe('another trigger failed');
      expect(codeReview?.renderResult.review?.event).toBe('COMMENT');
    });

    it('blocks approval when another trigger has blocking findings', () => {
      const results = [Trigger.blocking('security-review'), Trigger.approving('code-review')];

      const { successful } = orchestrateReviews(results);

      const codeReview = successful.find((r) => r.triggerName === 'code-review');
      expect(codeReview?.reviewDecision.approvalSuppressed).toBe(true);
      expect(codeReview?.reviewDecision.suppressionReason).toBe(
        'another trigger has blocking findings'
      );
    });

    it('allows only one approval when multiple triggers want to approve', () => {
      const results = [
        Trigger.approving('security-review'),
        Trigger.approving('code-review'),
        Trigger.approving('perf-review'),
      ];

      const { successful } = orchestrateReviews(results);

      const approved = successful.filter((r) => r.renderResult.review?.event === 'APPROVE');
      const suppressed = successful.filter((r) => r.reviewDecision.approvalSuppressed);

      expect(approved).toHaveLength(1);
      expect(approved[0]?.triggerName).toBe('security-review'); // First wins
      expect(suppressed).toHaveLength(2);
    });

    it('allows approval when all triggers succeed with no blocking findings', () => {
      const results = [Trigger.commenting('security-review'), Trigger.approving('code-review')];

      const { successful } = orchestrateReviews(results);

      const codeReview = successful.find((r) => r.triggerName === 'code-review');
      expect(codeReview?.reviewDecision.approvalSuppressed).toBe(false);
      expect(codeReview?.renderResult.review?.event).toBe('APPROVE');
    });
  });

  describe('stale comment resolution', () => {
    it('allows stale resolution when all triggers succeed', () => {
      const results = [Trigger.commenting('security-review'), Trigger.approving('code-review')];

      const { canResolveStale } = orchestrateReviews(results);

      expect(canResolveStale).toBe(true);
    });

    it('blocks stale resolution when any trigger failed', () => {
      const results = [Trigger.failed('security-review'), Trigger.approving('code-review')];

      const { canResolveStale, failedTriggers } = orchestrateReviews(results);

      expect(canResolveStale).toBe(false);
      expect(failedTriggers).toEqual(['security-review']);
    });

    it('blocks stale resolution when multiple triggers failed', () => {
      const results = [
        Trigger.failed('security-review'),
        Trigger.commenting('code-review'),
        Trigger.failed('perf-review'),
      ];

      const { canResolveStale, failedTriggers } = orchestrateReviews(results);

      expect(canResolveStale).toBe(false);
      expect(failedTriggers).toEqual(['security-review', 'perf-review']);
    });
  });

  describe('failed trigger handling', () => {
    it('excludes failed triggers from successful results', () => {
      const results = [Trigger.failed('security-review'), Trigger.commenting('code-review')];

      const { successful } = orchestrateReviews(results);

      expect(successful).toHaveLength(1);
      expect(successful[0]?.triggerName).toBe('code-review');
    });

    it('returns empty successful list when all triggers fail', () => {
      const results = [Trigger.failed('security-review'), Trigger.failed('code-review')];

      const { successful, canResolveStale, failedTriggers } = orchestrateReviews(results);

      expect(successful).toHaveLength(0);
      expect(canResolveStale).toBe(false);
      expect(failedTriggers).toHaveLength(2);
    });
  });

  describe('priority ordering', () => {
    it('failed trigger blocks approval even when listed after approving trigger', () => {
      const results = [Trigger.approving('code-review'), Trigger.failed('security-review')];

      const { successful } = orchestrateReviews(results);

      const codeReview = successful.find((r) => r.triggerName === 'code-review');
      expect(codeReview?.reviewDecision.approvalSuppressed).toBe(true);
      expect(codeReview?.reviewDecision.suppressionReason).toBe('another trigger failed');
    });

    it('failure reason takes priority over blocking findings reason', () => {
      const results = [
        Trigger.failed('perf-review'),
        Trigger.blocking('security-review'),
        Trigger.approving('code-review'),
      ];

      const { successful } = orchestrateReviews(results);

      const codeReview = successful.find((r) => r.triggerName === 'code-review');
      expect(codeReview?.reviewDecision.suppressionReason).toBe('another trigger failed');
    });
  });
});

// -----------------------------------------------------------------------------
// Unit Tests
// -----------------------------------------------------------------------------

describe('buildReviewCoordination', () => {
  it('returns coordination array matching input order', () => {
    const results: TriggerExecutionResult[] = [
      Trigger.approving('a'),
      Trigger.failed('b'),
      Trigger.blocking('c'),
    ];

    const coordination = buildReviewCoordination(results);

    expect(coordination).toHaveLength(3);
    expect(coordination[0]?.triggerName).toBe('a');
    expect(coordination[1]?.triggerName).toBe('b');
    expect(coordination[2]?.triggerName).toBe('c');
  });
});

describe('shouldResolveStaleComments', () => {
  it('returns true when no errors', () => {
    expect(shouldResolveStaleComments([Trigger.commenting('a'), Trigger.approving('b')])).toBe(
      true
    );
  });

  it('returns false when any error exists', () => {
    expect(shouldResolveStaleComments([Trigger.commenting('a'), Trigger.failed('b')])).toBe(false);
  });

  it('returns true for empty results', () => {
    expect(shouldResolveStaleComments([])).toBe(true);
  });
});
