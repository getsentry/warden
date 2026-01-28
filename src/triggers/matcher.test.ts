import { describe, it, expect } from 'vitest';
import {
  matchGlob,
  matchTrigger,
  shouldFail,
  countFindingsAtOrAbove,
  countSeverity,
} from './matcher.js';
import type { Trigger } from '../config/schema.js';
import { SEVERITY_ORDER } from '../types/index.js';
import type { EventContext, SkillReport } from '../types/index.js';

describe('matchGlob', () => {
  it('matches exact paths', () => {
    expect(matchGlob('src/index.ts', 'src/index.ts')).toBe(true);
    expect(matchGlob('src/index.ts', 'src/other.ts')).toBe(false);
  });

  it('matches single wildcard', () => {
    expect(matchGlob('src/*.ts', 'src/index.ts')).toBe(true);
    expect(matchGlob('src/*.ts', 'src/foo/index.ts')).toBe(false);
    expect(matchGlob('*.ts', 'index.ts')).toBe(true);
  });

  it('matches double wildcard (globstar)', () => {
    expect(matchGlob('src/**/*.ts', 'src/index.ts')).toBe(true);
    expect(matchGlob('src/**/*.ts', 'src/foo/index.ts')).toBe(true);
    expect(matchGlob('src/**/*.ts', 'src/foo/bar/index.ts')).toBe(true);
    expect(matchGlob('**/*.ts', 'src/index.ts')).toBe(true);
  });

  it('matches question mark wildcard', () => {
    expect(matchGlob('src/?.ts', 'src/a.ts')).toBe(true);
    expect(matchGlob('src/?.ts', 'src/ab.ts')).toBe(false);
  });
});

describe('matchTrigger', () => {
  const baseContext: EventContext = {
    eventType: 'pull_request',
    action: 'opened',
    repository: {
      owner: 'test',
      name: 'repo',
      fullName: 'test/repo',
      defaultBranch: 'main',
    },
    pullRequest: {
      number: 1,
      title: 'Test PR',
      body: 'Test body',
      author: 'user',
      baseBranch: 'main',
      headBranch: 'feature',
      headSha: 'abc123',
      files: [
        { filename: 'src/index.ts', status: 'modified', additions: 10, deletions: 5 },
        { filename: 'README.md', status: 'modified', additions: 2, deletions: 0 },
      ],
    },
    repoPath: '/test/repo',
  };

  const baseTrigger: Trigger = {
    name: 'test-trigger',
    event: 'pull_request',
    actions: ['opened', 'synchronize'],
    skill: 'test-skill',
  };

  it('matches when event and action match', () => {
    expect(matchTrigger(baseTrigger, baseContext)).toBe(true);
  });

  it('does not match wrong event type', () => {
    const trigger = { ...baseTrigger, event: 'issues' as const };
    expect(matchTrigger(trigger, baseContext)).toBe(false);
  });

  it('does not match wrong action', () => {
    const trigger = { ...baseTrigger, actions: ['closed'] };
    expect(matchTrigger(trigger, baseContext)).toBe(false);
  });

  it('matches with path filter', () => {
    const trigger = { ...baseTrigger, filters: { paths: ['src/**/*.ts'] } };
    expect(matchTrigger(trigger, baseContext)).toBe(true);
  });

  it('does not match when no files match path filter', () => {
    const trigger = { ...baseTrigger, filters: { paths: ['lib/**/*.ts'] } };
    expect(matchTrigger(trigger, baseContext)).toBe(false);
  });

  it('ignores files matching ignorePaths', () => {
    const context = {
      ...baseContext,
      pullRequest: {
        ...baseContext.pullRequest!,
        files: [{ filename: 'README.md', status: 'modified' as const, additions: 1, deletions: 0 }],
      },
    };
    const trigger = { ...baseTrigger, filters: { ignorePaths: ['*.md'] } };
    expect(matchTrigger(trigger, context)).toBe(false);
  });
});

describe('shouldFail', () => {
  const makeReport = (severities: string[]): SkillReport => ({
    skill: 'test',
    summary: 'Test report',
    findings: severities.map((s, i) => ({
      id: `finding-${i}`,
      severity: s as 'critical' | 'high' | 'medium' | 'low' | 'info',
      title: `Finding ${i}`,
      description: 'Test finding',
    })),
  });

  it('returns true when findings meet threshold', () => {
    expect(shouldFail(makeReport(['high']), 'high')).toBe(true);
    expect(shouldFail(makeReport(['critical']), 'high')).toBe(true);
    expect(shouldFail(makeReport(['medium']), 'medium')).toBe(true);
  });

  it('returns false when findings below threshold', () => {
    expect(shouldFail(makeReport(['low']), 'high')).toBe(false);
    expect(shouldFail(makeReport(['info']), 'medium')).toBe(false);
    expect(shouldFail(makeReport([]), 'info')).toBe(false);
  });
});

describe('countFindingsAtOrAbove', () => {
  const makeReport = (severities: string[]): SkillReport => ({
    skill: 'test',
    summary: 'Test report',
    findings: severities.map((s, i) => ({
      id: `finding-${i}`,
      severity: s as 'critical' | 'high' | 'medium' | 'low' | 'info',
      title: `Finding ${i}`,
      description: 'Test finding',
    })),
  });

  it('counts findings at or above threshold', () => {
    const report = makeReport(['critical', 'high', 'medium', 'low', 'info']);
    expect(countFindingsAtOrAbove(report, 'critical')).toBe(1);
    expect(countFindingsAtOrAbove(report, 'high')).toBe(2);
    expect(countFindingsAtOrAbove(report, 'medium')).toBe(3);
    expect(countFindingsAtOrAbove(report, 'low')).toBe(4);
    expect(countFindingsAtOrAbove(report, 'info')).toBe(5);
  });
});

describe('countSeverity', () => {
  it('counts findings of specific severity across reports', () => {
    const reports: SkillReport[] = [
      {
        skill: 'test1',
        summary: 'Test',
        findings: [
          { id: '1', severity: 'high', title: 'High 1', description: 'desc' },
          { id: '2', severity: 'medium', title: 'Medium 1', description: 'desc' },
        ],
      },
      {
        skill: 'test2',
        summary: 'Test',
        findings: [
          { id: '3', severity: 'high', title: 'High 2', description: 'desc' },
          { id: '4', severity: 'high', title: 'High 3', description: 'desc' },
        ],
      },
    ];

    expect(countSeverity(reports, 'high')).toBe(3);
    expect(countSeverity(reports, 'medium')).toBe(1);
    expect(countSeverity(reports, 'low')).toBe(0);
  });
});

describe('SEVERITY_ORDER', () => {
  it('has correct ordering (lower = more severe)', () => {
    expect(SEVERITY_ORDER.critical).toBeLessThan(SEVERITY_ORDER.high);
    expect(SEVERITY_ORDER.high).toBeLessThan(SEVERITY_ORDER.medium);
    expect(SEVERITY_ORDER.medium).toBeLessThan(SEVERITY_ORDER.low);
    expect(SEVERITY_ORDER.low).toBeLessThan(SEVERITY_ORDER.info);
  });
});
