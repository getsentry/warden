import { describe, it, expect } from 'vitest';
import {
  shouldResolveStaleComments,
  type TriggerExecutionResult,
} from './review/coordination.js';
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
}

interface OrchestrationResult {
  successful: SuccessfulTrigger[];
  canResolveStale: boolean;
  failedTriggers: string[];
}

function orchestrateReviews(results: TriggerExecutionResult[]): OrchestrationResult {
  const successful: SuccessfulTrigger[] = [];

  for (const result of results) {
    if (!result.report || !result.renderResult) {
      continue;
    }

    successful.push({
      triggerName: result.triggerName,
      report: result.report,
      renderResult: result.renderResult,
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

function makeRenderResult(event: 'REQUEST_CHANGES' | 'COMMENT'): RenderResult {
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
  /** Succeeded, no findings (clean run) */
  clean(name: string): TriggerExecutionResult {
    return {
      triggerName: name,
      report: makeReport(name),
      renderResult: makeRenderResult('COMMENT'),
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
  describe('successful trigger filtering', () => {
    it('passes review events through unchanged', () => {
      const results = [Trigger.blocking('security-review'), Trigger.commenting('code-review')];

      const { successful } = orchestrateReviews(results);

      expect(successful).toHaveLength(2);
      expect(successful[0]?.renderResult.review?.event).toBe('REQUEST_CHANGES');
      expect(successful[1]?.renderResult.review?.event).toBe('COMMENT');
    });

    it('excludes failed triggers from successful results', () => {
      const results = [Trigger.failed('security-review'), Trigger.commenting('code-review')];

      const { successful } = orchestrateReviews(results);

      expect(successful).toHaveLength(1);
      expect(successful[0]?.triggerName).toBe('code-review');
    });
  });

  describe('stale comment resolution', () => {
    it('allows stale resolution when all triggers succeed', () => {
      const results = [Trigger.commenting('security-review'), Trigger.clean('code-review')];

      const { canResolveStale } = orchestrateReviews(results);

      expect(canResolveStale).toBe(true);
    });

    it('blocks stale resolution when any trigger failed', () => {
      const results = [Trigger.failed('security-review'), Trigger.clean('code-review')];

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
    it('returns empty successful list when all triggers fail', () => {
      const results = [Trigger.failed('security-review'), Trigger.failed('code-review')];

      const { successful, canResolveStale, failedTriggers } = orchestrateReviews(results);

      expect(successful).toHaveLength(0);
      expect(canResolveStale).toBe(false);
      expect(failedTriggers).toHaveLength(2);
    });
  });
});

// -----------------------------------------------------------------------------
// Unit Tests
// -----------------------------------------------------------------------------

describe('shouldResolveStaleComments', () => {
  it('returns true when no errors', () => {
    expect(shouldResolveStaleComments([Trigger.commenting('a'), Trigger.clean('b')])).toBe(
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
