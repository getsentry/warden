import { describe, expect, it } from 'vitest';
import type { Finding } from '../../types/index.js';
import type { FindingProcessingEvent } from '../../sdk/types.js';
import { buildProvenanceAndDiscarded } from './provenance.js';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'finding-1',
    severity: 'medium',
    title: 'Test finding',
    description: 'Test description',
    ...overrides,
  };
}

describe('buildProvenanceAndDiscarded', () => {
  it('returns empty results when there are no events', () => {
    const result = buildProvenanceAndDiscarded([{ skillExecutionId: 'exec-1', events: [] }]);
    expect(result.provenanceByFindingId.size).toBe(0);
    expect(result.discarded).toEqual([]);
  });

  it('records a rejected finding only in discardedFindings, never in provenance', () => {
    const rejected = makeFinding({ id: 'rejected-1' });
    const event: FindingProcessingEvent = {
      stage: 'verification',
      action: 'rejected',
      finding: rejected,
      reason: 'not a real issue',
    };

    const result = buildProvenanceAndDiscarded([
      { skillExecutionId: 'exec-1', model: 'claude-sonnet-4-5', events: [event] },
    ]);

    expect(result.provenanceByFindingId.size).toBe(0);
    expect(result.discarded).toEqual([
      {
        originSkillExecutionId: 'exec-1',
        stage: 'verification_rejected',
        severity: 'medium',
        title: 'Test finding',
        location: undefined,
        model: 'claude-sonnet-4-5',
        reason: 'not a real issue',
      },
    ]);
  });

  it('keeps a revised finding under its (unchanged) id and snapshots the pre-revision state into before', () => {
    const original = makeFinding({ id: 'kept-id', title: 'Original title', severity: 'low' });
    const revised = makeFinding({ id: 'kept-id', title: 'Revised title', severity: 'high' });
    const event: FindingProcessingEvent = {
      stage: 'verification',
      action: 'revised',
      finding: original,
      replacement: revised,
      reason: 'narrowed scope after tracing the guard clause',
    };

    const result = buildProvenanceAndDiscarded([
      { skillExecutionId: 'exec-1', model: 'claude-sonnet-4-5', events: [event] },
    ]);

    expect(result.discarded).toEqual([]);
    expect(result.provenanceByFindingId.get('kept-id')).toEqual({
      originSkillExecutionId: 'exec-1',
      originModel: 'claude-sonnet-4-5',
      verification: {
        outcome: 'revised',
        model: 'claude-sonnet-4-5',
        evidence: 'narrowed scope after tracing the guard clause',
        before: {
          title: 'Original title',
          description: 'Test description',
          severity: 'low',
          confidence: undefined,
        },
      },
    });
  });

  it('attributes merged findings to the survivor and lists absorbed ids on both sides', () => {
    const survivor = makeFinding({ id: 'survivor-1' });
    const absorbedA = makeFinding({ id: 'absorbed-a' });
    const absorbedB = makeFinding({ id: 'absorbed-b' });

    const events: FindingProcessingEvent[] = [
      { stage: 'merge', action: 'merged', finding: absorbedA, replacement: survivor, reason: 'same root cause' },
      { stage: 'merge', action: 'merged', finding: absorbedB, replacement: survivor, reason: 'same root cause' },
    ];

    const result = buildProvenanceAndDiscarded([
      { skillExecutionId: 'exec-1', model: 'claude-sonnet-4-5', events },
    ]);

    expect(result.discarded).toHaveLength(2);
    expect(result.discarded.map((d) => d.survivorFindingId)).toEqual(['survivor-1', 'survivor-1']);
    expect(result.discarded.every((d) => d.stage === 'merge_absorbed')).toBe(true);

    expect(result.provenanceByFindingId.get('survivor-1')?.merge).toEqual({
      model: 'claude-sonnet-4-5',
      absorbedFindingIds: ['absorbed-a', 'absorbed-b'],
    });
  });

  it('records a dedupe-dropped finding in discardedFindings, keyed to its survivor', () => {
    const events: FindingProcessingEvent[] = [
      { stage: 'dedupe', action: 'dropped', finding: makeFinding(), replacement: makeFinding({ id: 'kept' }), reason: 'duplicate title and location' },
    ];

    const result = buildProvenanceAndDiscarded([{ skillExecutionId: 'exec-1', events }]);

    expect(result.provenanceByFindingId.size).toBe(0);
    expect(result.discarded).toEqual([
      expect.objectContaining({
        stage: 'dedupe_dropped',
        originSkillExecutionId: 'exec-1',
        survivorFindingId: 'kept',
        reason: 'duplicate title and location',
      }),
    ]);
  });

  it('ignores fix_gate events', () => {
    const events: FindingProcessingEvent[] = [
      { stage: 'fix_gate', action: 'stripped_fix', finding: makeFinding() },
    ];

    const result = buildProvenanceAndDiscarded([{ skillExecutionId: 'exec-1', events }]);

    expect(result.provenanceByFindingId.size).toBe(0);
    expect(result.discarded).toEqual([]);
  });
});
