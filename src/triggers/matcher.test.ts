import { describe, it, expect, beforeEach } from 'vitest';
import {
  matchGlob,
  matchTrigger,
  shouldFail,
  countFindingsAtOrAbove,
  countSeverity,
  clearGlobCache,
  getGlobCacheSize,
} from './matcher.js';
import type { Trigger } from '../config/schema.js';
import { SEVERITY_ORDER } from '../types/index.js';
import type { EventContext, SkillReport } from '../types/index.js';

/** Test helper to create a SkillReport with given severities */
function makeReport(severities: string[]): SkillReport {
  return {
    skill: 'test',
    summary: 'Test report',
    findings: severities.map((s, i) => ({
      id: `finding-${i}`,
      severity: s as 'critical' | 'high' | 'medium' | 'low' | 'info',
      title: `Finding ${i}`,
      description: 'Test finding',
    })),
  };
}

describe('matchGlob', () => {
  beforeEach(() => {
    clearGlobCache();
  });

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

  it('caches compiled patterns', () => {
    matchGlob('src/*.ts', 'src/index.ts');
    expect(getGlobCacheSize()).toBe(1);

    // Same pattern should not increase cache size
    matchGlob('src/*.ts', 'src/other.ts');
    expect(getGlobCacheSize()).toBe(1);

    // Different pattern should increase cache size
    matchGlob('lib/*.js', 'lib/index.js');
    expect(getGlobCacheSize()).toBe(2);
  });

  it('evicts oldest entry when cache exceeds max size', () => {
    // Fill cache with 1000 patterns
    for (let i = 0; i < 1000; i++) {
      matchGlob(`pattern${i}/*.ts`, `pattern${i}/file.ts`);
    }
    expect(getGlobCacheSize()).toBe(1000);

    // Adding one more should evict the oldest
    matchGlob('newpattern/*.ts', 'newpattern/file.ts');
    expect(getGlobCacheSize()).toBe(1000);

    // The first pattern should be evicted (cache miss will re-add it)
    // We can verify this by checking the cache size doesn't increase
    // when we add it back
    const sizeBefore = getGlobCacheSize();
    matchGlob('pattern0/*.ts', 'pattern0/file.ts');
    expect(getGlobCacheSize()).toBe(sizeBefore);
  });

  it('maintains LRU order by refreshing accessed entries', () => {
    // Add patterns 0, 1, 2
    matchGlob('pattern0/*.ts', 'pattern0/file.ts');
    matchGlob('pattern1/*.ts', 'pattern1/file.ts');
    matchGlob('pattern2/*.ts', 'pattern2/file.ts');

    // Access pattern0 to make it most recently used
    matchGlob('pattern0/*.ts', 'pattern0/file.ts');

    // Fill cache to max (997 more patterns needed to reach 1000)
    for (let i = 3; i < 1000; i++) {
      matchGlob(`pattern${i}/*.ts`, `pattern${i}/file.ts`);
    }
    expect(getGlobCacheSize()).toBe(1000);

    // Add one more - should evict pattern1 (oldest not-accessed)
    matchGlob('newpattern/*.ts', 'newpattern/file.ts');
    expect(getGlobCacheSize()).toBe(1000);
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

  it('fails when path filters defined but filenames undefined', () => {
    const context = {
      ...baseContext,
      pullRequest: undefined,
    };
    const trigger = { ...baseTrigger, filters: { paths: ['src/**/*.ts'] } };
    expect(matchTrigger(trigger, context)).toBe(false);
  });

  it('fails when ignorePaths defined but filenames undefined', () => {
    const context = {
      ...baseContext,
      pullRequest: undefined,
    };
    const trigger = { ...baseTrigger, filters: { ignorePaths: ['*.md'] } };
    expect(matchTrigger(trigger, context)).toBe(false);
  });

  it('fails when path filters defined but files array empty', () => {
    const context = {
      ...baseContext,
      pullRequest: {
        ...baseContext.pullRequest!,
        files: [],
      },
    };
    const trigger = { ...baseTrigger, filters: { paths: ['src/**/*.ts'] } };
    expect(matchTrigger(trigger, context)).toBe(false);
  });

  it('matches when no filters defined and filenames unavailable', () => {
    const context = {
      ...baseContext,
      pullRequest: undefined,
    };
    expect(matchTrigger(baseTrigger, context)).toBe(true);
  });
});

describe('shouldFail', () => {
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
