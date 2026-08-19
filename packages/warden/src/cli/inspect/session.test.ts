import { describe, it, expect } from 'vitest';
import type { SkillReport } from '../../types/index.js';
import type { ReviewFile } from './reviews.js';
import { buildInspectSession } from './session.js';

function makeReport(skill: string, findings: SkillReport['findings']): SkillReport {
  return {
    skill,
    summary: `${skill}: ${findings.length} findings`,
    findings,
  };
}

function makeReviewFile(reviews: ReviewFile['reviews'] = {}): ReviewFile {
  return {
    schemaVersion: 2,
    runId: 'test-run',
    logPath: '/test.jsonl',
    updatedAt: new Date().toISOString(),
    reviews,
  };
}

describe('buildInspectSession', () => {
  it('flattens findings from multiple reports', () => {
    const reports = [
      makeReport('skill-a', [
        { id: 'f1', severity: 'high', title: 'A', description: 'A desc' },
      ]),
      makeReport('skill-b', [
        { id: 'f2', severity: 'low', title: 'B', description: 'B desc' },
      ]),
    ];
    const session = buildInspectSession(reports, makeReviewFile());
    expect(session.unreviewed).toHaveLength(2);
    expect(session.reviewed).toHaveLength(0);
  });

  it('assigns reviewKey as skill:id:occurrence', () => {
    const reports = [
      makeReport('skill-a', [
        { id: 'f1', severity: 'low', title: 'A', description: '' },
      ]),
    ];
    const session = buildInspectSession(reports, makeReviewFile());
    expect(session.unreviewed[0]?.reviewKey).toBe('skill-a:f1:1');
  });

  it('gives distinct keys to duplicate finding.id values within one skill', () => {
    const reports = [
      makeReport('skill-a', [
        { id: 'dup', severity: 'medium', title: 'First', description: '' },
        { id: 'dup', severity: 'medium', title: 'Second', description: '' },
      ]),
    ];
    const session = buildInspectSession(reports, makeReviewFile());
    const keys = session.unreviewed.map((f) => f.reviewKey);
    expect(keys).toContain('skill-a:dup:1');
    expect(keys).toContain('skill-a:dup:2');
    expect(new Set(keys).size).toBe(2);
  });

  it('gives distinct keys to the same id appearing in different skills', () => {
    // Occurrence is global — same id in skill-a and skill-b gets :1 each
    // but the skill prefix makes the keys distinct.
    const reports = [
      makeReport('skill-a', [
        { id: 'shared', severity: 'low', title: 'A', description: '' },
      ]),
      makeReport('skill-b', [
        { id: 'shared', severity: 'low', title: 'B', description: '' },
      ]),
    ];
    const session = buildInspectSession(reports, makeReviewFile());
    const keys = session.unreviewed.map((f) => f.reviewKey);
    expect(keys).toContain('skill-a:shared:1');
    expect(keys).toContain('skill-b:shared:2');
  });

  it('sorts unreviewed by severity then path then line', () => {
    const reports = [
      makeReport('skill-a', [
        {
          id: 'f1',
          severity: 'low',
          title: 'Low',
          description: '',
          location: { path: 'src/a.ts', startLine: 1 },
        },
        {
          id: 'f2',
          severity: 'high',
          title: 'High',
          description: '',
          location: { path: 'src/b.ts', startLine: 5 },
        },
        {
          id: 'f3',
          severity: 'medium',
          title: 'Medium',
          description: '',
          location: { path: 'src/a.ts', startLine: 10 },
        },
      ]),
    ];
    const session = buildInspectSession(reports, makeReviewFile());
    const severities = session.unreviewed.map((f) => f.finding.severity);
    expect(severities).toEqual(['high', 'medium', 'low']);
  });

  it('partitions reviewed vs unreviewed based on the sidecar', () => {
    const reports = [
      makeReport('skill-a', [
        { id: 'f1', severity: 'high', title: 'A', description: '' },
        { id: 'f2', severity: 'low', title: 'B', description: '' },
      ]),
    ];
    const reviewFile = makeReviewFile({
      'skill-a:f1:1': {
        findingId: 'f1',
        skill: 'skill-a',
        occurrence: 1,
        verdict: 'false_positive',
        comment: '',
        updatedAt: new Date().toISOString(),
      },
    });
    const session = buildInspectSession(reports, reviewFile);
    expect(session.reviewed).toHaveLength(1);
    expect(session.reviewed[0]?.reviewKey).toBe('skill-a:f1:1');
    expect(session.unreviewed).toHaveLength(1);
    expect(session.unreviewed[0]?.reviewKey).toBe('skill-a:f2:1');
  });

  it('merges the review object onto the finding', () => {
    const reports = [
      makeReport('skill-a', [
        { id: 'f1', severity: 'high', title: 'A', description: '' },
      ]),
    ];
    const reviewEntry = {
      findingId: 'f1',
      skill: 'skill-a',
      occurrence: 1,
      verdict: 'true_positive' as const,
      comment: 'confirmed',
      updatedAt: new Date().toISOString(),
    };
    const reviewFile = makeReviewFile({ 'skill-a:f1:1': reviewEntry });
    const session = buildInspectSession(reports, reviewFile);
    expect(session.reviewed[0]?.review).toMatchObject({
      verdict: 'true_positive',
      comment: 'confirmed',
    });
  });

  it('handles an empty report list gracefully', () => {
    const session = buildInspectSession([], makeReviewFile());
    expect(session.unreviewed).toHaveLength(0);
    expect(session.reviewed).toHaveLength(0);
  });
});
