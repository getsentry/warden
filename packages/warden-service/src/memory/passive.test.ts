import { describe, expect, it } from 'vitest';
import {
  evaluateMemoryEvidence,
  pathFamilyFromLocation,
  PassiveExtractionInputSchema,
  proposePassiveMemory,
  type PassiveEvidence,
} from './passive.js';

function evidence(index: number, outcome: PassiveEvidence['outcome'] = 'resolved'): PassiveEvidence {
  return {
    findingId: `finding-${index}`,
    observationId: `observation-${index}`,
    runId: `run-${index}`,
    skill: 'security',
    title: 'Unsafe sink',
    description: 'The sink receives untrusted input.',
    outcome,
    observedAt: `2026-08-${String(index).padStart(2, '0')}T10:00:00.000Z`,
  };
}

function review(
  index: number,
  verdict: NonNullable<PassiveEvidence['verdict']>,
  comment = '',
): PassiveEvidence {
  return {
    findingId: `finding-${index}`,
    reviewId: `review-${index}`,
    runId: `run-${index}`,
    skill: 'security',
    title: 'Unsafe sink',
    description: 'The sink receives untrusted input.',
    verdict,
    comment,
    pathFamily: 'src/auth',
    source: 'review',
    observedAt: `2026-08-${String(index).padStart(2, '0')}T10:00:00.000Z`,
  };
}

describe('passive memory evidence', () => {
  it('strictly rejects unrestricted extraction fields', () => {
    expect(() => PassiveExtractionInputSchema.parse({
      runId: 'run-1', evidence: [evidence(1)], prompt: 'private prompt',
    })).toThrow();
    expect(() => PassiveExtractionInputSchema.parse({
      runId: 'run-1', evidence: [{ ...evidence(1), transcript: 'private transcript' }],
    })).toThrow();
  });

  it('requires independent confirmed evidence and blocks contradictions', () => {
    const source = [evidence(1), evidence(2)];
    const proposal = proposePassiveMemory(source)!;
    expect(evaluateMemoryEvidence(proposal, source)).toMatchObject({ eligible: true, independentRuns: 2 });
    expect(evaluateMemoryEvidence({ ...proposal, evidenceIds: [...proposal.evidenceIds, 'missing'] }, source)).toMatchObject({ eligible: false });
    expect(evaluateMemoryEvidence({ ...proposal, evidenceIds: [...proposal.evidenceIds, 'observation-3'] }, [...source, evidence(3, 'rejected')]))
      .toMatchObject({ eligible: false, contradictionCount: 1 });
  });

  it('requires rejection evidence for false-positive memory', () => {
    const rejected = [evidence(1, 'rejected')];
    const proposal = proposePassiveMemory(rejected)!;
    expect(proposal.kind).toBe('false_positive');
    expect(evaluateMemoryEvidence(proposal, rejected)).toMatchObject({ eligible: true, supportCount: 1 });
    expect(evaluateMemoryEvidence({ ...proposal, evidenceIds: ['observation-2'] }, [evidence(2, 'resolved')]))
      .toMatchObject({ eligible: false });
  });

  it('uses a false-positive review comment as content and scopes by skill and path family',
    () => {
      const source = [review(1, 'false_positive', '  Test fixtures, not a real sink.  ')];
      const proposal = proposePassiveMemory(source)!;
      expect(pathFamilyFromLocation('src/auth/session.ts')).toBe('src/auth');
      expect(proposal).toMatchObject({
        kind: 'false_positive',
        content: 'Test fixtures, not a real sink.',
        skill: 'security',
        pathFamily: 'src/auth',
        evidenceIds: ['review-1'],
      });
      expect(evaluateMemoryEvidence(proposal, source)).toMatchObject({ eligible: true, supportCount: 1 });
    });

  it('maps true-positive reviews to confirmed_pattern and contradicts false-positive memory', () => {
    const truePositive = [review(1, 'true_positive'), review(2, 'true_positive')];
    const proposal = proposePassiveMemory(truePositive)!;
    expect(proposal.kind).toBe('confirmed_pattern');
    expect(evaluateMemoryEvidence(proposal, truePositive)).toMatchObject({ eligible: true, independentRuns: 2 });
    expect(evaluateMemoryEvidence({
      kind: 'false_positive',
      content: 'Test fixtures, not a real sink.',
      evidenceIds: ['review-1'],
      skill: 'security',
      confidence: 0.6,
    }, truePositive)).toMatchObject({ eligible: false, contradictionCount: 1 });
  });

  it('maps mitigated reviews to review_guidance', () => {
    const source = [review(1, 'mitigated', 'Document the existing rate-limit bypass.')];
    const proposal = proposePassiveMemory(source)!;
    expect(proposal).toMatchObject({
      kind: 'review_guidance',
      content: 'Document the existing rate-limit bypass.',
      evidenceIds: ['review-1'],
    });
    expect(evaluateMemoryEvidence(proposal, source)).toMatchObject({ eligible: true, supportCount: 1 });
  });

  it('does not propose review_guidance from GitHub posted observations', () => {
    expect(proposePassiveMemory([evidence(1, 'posted')])).toBeNull();
    expect(proposePassiveMemory([evidence(1, 'rejected'), evidence(2, 'posted')])).toBeNull();
  });
});
