import { describe, expect, it } from 'vitest';
import { loadResultsFile } from './baseline.js';
import { SUMMARY_TODO, loadCaseFiles, loadCorpusEntries, type CaseData, type CaseFile } from './entries.js';
import { DEFAULT_BASELINE, MATRIX_SKILLS } from './options.js';
import { createResults, recordShardRun } from './results.js';
import { testConfig, testEntry, testUsage } from './testing.js';
import { validateSuite } from './validate.js';

// The committed suite. This is the check that keeps it honest as cases are added.
describe('the committed suite', () => {
  it('has no problems', () => {
    expect(validateSuite({
      cases: loadCaseFiles(),
      corpus: loadCorpusEntries(),
      skills: MATRIX_SKILLS,
      baseline: loadResultsFile(DEFAULT_BASELINE),
    })).toEqual([]);
  });
});

const BUG = 'b'.repeat(40);
const FIX = 'f'.repeat(40);

function caseFile(id: string, data: Partial<CaseData> = {}): CaseFile {
  return {
    id,
    owner: id.split('/')[0]!,
    data: {
      kind: 'bug',
      summary: 'Unbounded recursion on nested input',
      repository: 'getsentry/sentry',
      ref: BUG,
      targets: ['src/a.py'],
      source: 'https://github.com/getsentry/sentry/commit/ffff',
      ...data,
    },
  };
}

const pair = [caseFile('wrdn-dos-review/bug'), caseFile('wrdn-dos-review/bug-fixed', { kind: 'clean', ref: FIX })];

function check(cases: CaseFile[], extra: Partial<Parameters<typeof validateSuite>[0]> = {}): string[] {
  return validateSuite({ cases, corpus: [], skills: MATRIX_SKILLS, baseline: createResults([]), ...extra });
}

describe('validateSuite', () => {
  it('accepts a bug case with its clean twin', () => {
    expect(check(pair)).toEqual([]);
  });

  it('accepts a bug case with a noClean reason and no twin', () => {
    expect(check([caseFile('wrdn-authz/catch', { noClean: 'PR catch, fix not pinned' })])).toEqual([]);
  });

  it('rejects a bug case with neither a twin nor a noClean reason', () => {
    expect(check([pair[0]!])).toEqual([
      'wrdn-dos-review/bug: no clean twin (same source and targets at the fixed ref) and no noClean reason',
    ]);
  });

  it('rejects a twin whose targets or source drifted', () => {
    const moved = caseFile('wrdn-dos-review/bug-fixed', { kind: 'clean', ref: FIX, targets: ['src/b.py'] });
    expect(check([pair[0]!, moved])).toHaveLength(1);
  });

  it('rejects a twin with a different summary, and noClean next to a twin', () => {
    expect(check([
      caseFile('wrdn-dos-review/bug', { noClean: 'stale' }),
      caseFile('wrdn-dos-review/bug-fixed', { kind: 'clean', ref: FIX, summary: 'Something else' }),
    ])).toEqual([
      'wrdn-dos-review/bug: has clean twin wrdn-dos-review/bug-fixed and a noClean reason; drop noClean',
      'wrdn-dos-review/bug: clean twin wrdn-dos-review/bug-fixed has a different summary; they describe the same bug',
    ]);
  });

  it('rejects a clean case pinned at the bug ref', () => {
    const problems = check([pair[0]!, caseFile('wrdn-dos-review/bug-fixed', { kind: 'clean' })]);
    expect(problems).toContain('wrdn-dos-review/bug: clean case wrdn-dos-review/bug-fixed pins the same code');
  });

  it('rejects the TODO summary the scaffolder writes', () => {
    const problems = check([
      caseFile('wrdn-dos-review/bug', { summary: SUMMARY_TODO }),
      caseFile('wrdn-dos-review/bug-fixed', { kind: 'clean', ref: FIX, summary: SUMMARY_TODO }),
    ]);
    expect(problems).toEqual([
      'wrdn-dos-review/bug: summary is still the TODO placeholder',
      'wrdn-dos-review/bug-fixed: summary is still the TODO placeholder',
    ]);
  });

  it('rejects a case directory that is not a matrix skill', () => {
    expect(check([caseFile('wrdn-nope/bug', { noClean: 'x' })])[0]).toContain('cases/wrdn-nope is not a matrix skill');
  });

  it('rejects a case that duplicates a corpus entry and a duplicate id', () => {
    const corpus = [testEntry('sentry-vuln-001', { ref: BUG, targets: ['src/a.py'] }), testEntry('sentry-vuln-001')];
    expect(check(pair, { corpus })).toEqual([
      'sentry-vuln-001: duplicate entry id',
      'wrdn-dos-review/bug: duplicates corpus entry sentry-vuln-001 (src/a.py at bbbbbbbb)',
    ]);
  });

  it('rejects baseline entries that no longer exist or moved, and unknown lanes', () => {
    const baseline = createResults([
      testEntry('wrdn-dos-review/gone'),
      testEntry('wrdn-dos-review/bug', { ref: 'c'.repeat(40) }),
    ]);
    recordShardRun(baseline, {
      skill: 'wrdn-retired', config: testConfig(), usage: testUsage(), hits: new Map(), errors: [],
    });
    expect(check(pair, { baseline })).toEqual([
      'baseline: lane wrdn-retired is not a matrix skill',
      'baseline: wrdn-dos-review/gone is not a corpus entry or case',
      'baseline: wrdn-dos-review/bug was recorded at getsentry/sentry@cccccccc, the entry now pins getsentry/sentry@bbbbbbbb',
    ]);
  });
});
