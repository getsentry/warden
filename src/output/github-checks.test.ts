import { describe, it, expect } from 'vitest';
import {
  severityToAnnotationLevel,
  findingsToAnnotations,
  determineConclusion,
  aggregateSeverityCounts,
} from './github-checks.js';
import type { Finding, SkillReport } from '../types/index.js';

describe('severityToAnnotationLevel', () => {
  it('maps critical to failure', () => {
    expect(severityToAnnotationLevel('critical')).toBe('failure');
  });

  it('maps high to failure', () => {
    expect(severityToAnnotationLevel('high')).toBe('failure');
  });

  it('maps medium to warning', () => {
    expect(severityToAnnotationLevel('medium')).toBe('warning');
  });

  it('maps low to notice', () => {
    expect(severityToAnnotationLevel('low')).toBe('notice');
  });

  it('maps info to notice', () => {
    expect(severityToAnnotationLevel('info')).toBe('notice');
  });
});

describe('findingsToAnnotations', () => {
  it('converts findings with location to annotations', () => {
    const findings: Finding[] = [
      {
        id: 'f1',
        severity: 'high',
        title: 'Security Issue',
        description: 'Details about the issue',
        location: {
          path: 'src/file.ts',
          startLine: 10,
          endLine: 15,
        },
      },
    ];

    const annotations = findingsToAnnotations(findings);

    expect(annotations).toHaveLength(1);
    expect(annotations[0]).toEqual({
      path: 'src/file.ts',
      start_line: 10,
      end_line: 15,
      annotation_level: 'failure',
      message: 'Details about the issue',
      title: 'Security Issue',
    });
  });

  it('uses startLine for end_line when endLine not provided', () => {
    const findings: Finding[] = [
      {
        id: 'f1',
        severity: 'medium',
        title: 'Issue',
        description: 'Details',
        location: {
          path: 'src/file.ts',
          startLine: 25,
        },
      },
    ];

    const annotations = findingsToAnnotations(findings);

    expect(annotations[0]!.start_line).toBe(25);
    expect(annotations[0]!.end_line).toBe(25);
  });

  it('filters out findings without location', () => {
    const findings: Finding[] = [
      {
        id: 'f1',
        severity: 'high',
        title: 'General Issue',
        description: 'No location',
      },
      {
        id: 'f2',
        severity: 'medium',
        title: 'Located Issue',
        description: 'Has location',
        location: {
          path: 'src/file.ts',
          startLine: 5,
        },
      },
    ];

    const annotations = findingsToAnnotations(findings);

    expect(annotations).toHaveLength(1);
    expect(annotations[0]!.title).toBe('Located Issue');
  });

  it('sorts by severity (most severe first)', () => {
    const findings: Finding[] = [
      {
        id: 'f1',
        severity: 'low',
        title: 'Low',
        description: 'Low severity',
        location: { path: 'a.ts', startLine: 1 },
      },
      {
        id: 'f2',
        severity: 'critical',
        title: 'Critical',
        description: 'Critical severity',
        location: { path: 'b.ts', startLine: 2 },
      },
      {
        id: 'f3',
        severity: 'medium',
        title: 'Medium',
        description: 'Medium severity',
        location: { path: 'c.ts', startLine: 3 },
      },
    ];

    const annotations = findingsToAnnotations(findings);

    expect(annotations[0]!.title).toBe('Critical');
    expect(annotations[1]!.title).toBe('Medium');
    expect(annotations[2]!.title).toBe('Low');
  });

  it('limits to 50 annotations', () => {
    const findings: Finding[] = Array.from({ length: 60 }, (_, i) => ({
      id: `f${i}`,
      severity: 'info' as const,
      title: `Finding ${i}`,
      description: `Description ${i}`,
      location: { path: `file${i}.ts`, startLine: i + 1 },
    }));

    const annotations = findingsToAnnotations(findings);

    expect(annotations).toHaveLength(50);
  });

  it('filters by reportOn threshold', () => {
    const findings: Finding[] = [
      {
        id: 'f1',
        severity: 'critical',
        title: 'Critical',
        description: 'Critical issue',
        location: { path: 'a.ts', startLine: 1 },
      },
      {
        id: 'f2',
        severity: 'high',
        title: 'High',
        description: 'High issue',
        location: { path: 'b.ts', startLine: 2 },
      },
      {
        id: 'f3',
        severity: 'medium',
        title: 'Medium',
        description: 'Medium issue',
        location: { path: 'c.ts', startLine: 3 },
      },
      {
        id: 'f4',
        severity: 'low',
        title: 'Low',
        description: 'Low issue',
        location: { path: 'd.ts', startLine: 4 },
      },
    ];

    // reportOn='high' should only include critical and high
    const annotations = findingsToAnnotations(findings, 'high');

    expect(annotations).toHaveLength(2);
    expect(annotations.map((a) => a.title)).toEqual(['Critical', 'High']);
  });

  it('generates annotations for additional locations', () => {
    const findings: Finding[] = [
      {
        id: 'f1',
        severity: 'high',
        title: 'Missing null check',
        description: 'Input not validated',
        location: { path: 'src/a.ts', startLine: 10, endLine: 15 },
        additionalLocations: [
          { path: 'src/b.ts', startLine: 20 },
          { path: 'src/c.ts', startLine: 30, endLine: 35 },
        ],
      },
    ];

    const annotations = findingsToAnnotations(findings);

    expect(annotations).toHaveLength(3);
    // Primary annotation
    expect(annotations[0]).toEqual({
      path: 'src/a.ts',
      start_line: 10,
      end_line: 15,
      annotation_level: 'failure',
      message: 'Input not validated',
      title: 'Missing null check',
    });
    // Additional location annotations
    expect(annotations[1]!.path).toBe('src/b.ts');
    expect(annotations[1]!.title).toBe('[f1] Missing null check (additional location)');
    expect(annotations[2]!.path).toBe('src/c.ts');
    expect(annotations[2]!.start_line).toBe(30);
    expect(annotations[2]!.end_line).toBe(35);
  });

  it('respects annotation limit with additional locations', () => {
    // Create 45 findings, each with 2 additional locations = 135 total annotations
    const findings: Finding[] = Array.from({ length: 45 }, (_, i) => ({
      id: `f${i}`,
      severity: 'info' as const,
      title: `Finding ${i}`,
      description: `Desc ${i}`,
      location: { path: `file${i}.ts`, startLine: i + 1 },
      additionalLocations: [
        { path: `extra1-${i}.ts`, startLine: 1 },
        { path: `extra2-${i}.ts`, startLine: 1 },
      ],
    }));

    const annotations = findingsToAnnotations(findings);
    expect(annotations.length).toBeLessThanOrEqual(50);
  });

  it('returns all findings when reportOn is undefined', () => {
    const findings: Finding[] = [
      {
        id: 'f1',
        severity: 'critical',
        title: 'Critical',
        description: 'Critical issue',
        location: { path: 'a.ts', startLine: 1 },
      },
      {
        id: 'f2',
        severity: 'info',
        title: 'Info',
        description: 'Info issue',
        location: { path: 'b.ts', startLine: 2 },
      },
    ];

    const annotations = findingsToAnnotations(findings, undefined);

    expect(annotations).toHaveLength(2);
  });
});

describe('determineConclusion', () => {
  it('returns success for empty findings', () => {
    expect(determineConclusion([], 'high')).toBe('success');
  });

  it('returns neutral when no failOn threshold', () => {
    const findings: Finding[] = [
      { id: 'f1', severity: 'critical', title: 'Issue', description: 'Details' },
    ];

    expect(determineConclusion(findings, undefined)).toBe('neutral');
  });

  it('returns failure when findings meet threshold and failCheck is true', () => {
    const findings: Finding[] = [
      { id: 'f1', severity: 'high', title: 'High Issue', description: 'Details' },
    ];

    expect(determineConclusion(findings, 'high', true)).toBe('failure');
    expect(determineConclusion(findings, 'medium', true)).toBe('failure');
  });

  it('returns neutral when findings meet threshold but failCheck is default (false)', () => {
    const findings: Finding[] = [
      { id: 'f1', severity: 'high', title: 'High Issue', description: 'Details' },
    ];

    expect(determineConclusion(findings, 'high')).toBe('neutral');
    expect(determineConclusion(findings, 'medium')).toBe('neutral');
  });

  it('returns neutral when findings below threshold', () => {
    const findings: Finding[] = [
      { id: 'f1', severity: 'medium', title: 'Medium Issue', description: 'Details' },
    ];

    expect(determineConclusion(findings, 'high')).toBe('neutral');
    expect(determineConclusion(findings, 'critical')).toBe('neutral');
  });

  it('considers critical more severe than high', () => {
    const findings: Finding[] = [
      { id: 'f1', severity: 'critical', title: 'Critical', description: 'Details' },
    ];

    expect(determineConclusion(findings, 'high')).toBe('neutral');
  });

  it('returns neutral when failCheck is explicitly false and threshold is met', () => {
    const findings: Finding[] = [
      { id: 'f1', severity: 'high', title: 'High Issue', description: 'Details' },
    ];

    expect(determineConclusion(findings, 'high', false)).toBe('neutral');
  });

  it('returns success for empty findings regardless of failCheck', () => {
    expect(determineConclusion([], 'high', true)).toBe('success');
    expect(determineConclusion([], 'high', false)).toBe('success');
  });
});

describe('aggregateSeverityCounts', () => {
  it('counts findings by severity across reports', () => {
    const reports: SkillReport[] = [
      {
        skill: 'skill-1',
        summary: 'Summary 1',
        findings: [
          { id: 'f1', severity: 'critical', title: 'A', description: 'D' },
          { id: 'f2', severity: 'high', title: 'B', description: 'D' },
        ],
      },
      {
        skill: 'skill-2',
        summary: 'Summary 2',
        findings: [
          { id: 'f3', severity: 'high', title: 'C', description: 'D' },
          { id: 'f4', severity: 'medium', title: 'E', description: 'D' },
          { id: 'f5', severity: 'info', title: 'F', description: 'D' },
        ],
      },
    ];

    const counts = aggregateSeverityCounts(reports);

    expect(counts).toEqual({
      critical: 1,
      high: 2,
      medium: 1,
      low: 0,
      info: 1,
    });
  });

  it('returns all zeros for empty reports', () => {
    const counts = aggregateSeverityCounts([]);

    expect(counts).toEqual({
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    });
  });
});
