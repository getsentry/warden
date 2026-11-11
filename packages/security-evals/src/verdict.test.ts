import { describe, expect, it } from 'vitest';
import { createResults, recordShardRun, summarize } from './results.js';
import { recordRepeats, testConfig, testEntry, testUsage } from './testing.js';
import { VERDICT_RULES, judgeSkill } from './verdict.js';

const SKILL = 'wrdn-dos-review';
const owned = (count: number) => Array.from({ length: count }, (_, index) => testEntry(`${SKILL}/case-${index}`));

/** Five owned bug cases, both lanes at `repeats`, with the given hit counts (out of `repeats`). */
function matrix(args: { repeats: number; mine?: Record<string, number>; reference?: Record<string, number>; cases?: number }) {
  const entries = owned(args.cases ?? VERDICT_RULES.minOwnedBugCases);
  const results = createResults(entries);
  const none = Object.fromEntries(entries.map((entry) => [entry.id, 0]));
  recordRepeats(results, 'security-review', { ...none, ...args.reference }, args.repeats);
  recordRepeats(results, SKILL, { ...none, ...args.mine }, args.repeats);
  return results;
}

describe('judgeSkill', () => {
  it('earns-keep for a bug caught in 2 of 3 repeats that security-review never caught', () => {
    const verdict = judgeSkill(matrix({ repeats: 3, mine: { [`${SKILL}/case-0`]: 2 } }), SKILL);
    expect(verdict).toMatchObject({ verdict: 'earns-keep', uniqueCatches: [`${SKILL}/case-0`] });
  });

  it('earns-keep even with few cases, since one real unique catch is enough', () => {
    const verdict = judgeSkill(matrix({ repeats: 3, cases: 1, mine: { [`${SKILL}/case-0`]: 3 } }), SKILL);
    expect(verdict.verdict).toBe('earns-keep');
  });

  it('no-unique-catches only with 5 owned bug cases at 3 repeats and nothing it beat security-review on', () => {
    const verdict = judgeSkill(matrix({
      repeats: 3,
      mine: { [`${SKILL}/case-0`]: 3 },
      reference: { [`${SKILL}/case-0`]: 3 },
    }), SKILL);
    expect(verdict).toMatchObject({ verdict: 'no-unique-catches', uniqueCatches: [], ownedBugCases: { evidence: 5 } });
  });

  it('insufficient-evidence with fewer than 5 owned bug cases', () => {
    const verdict = judgeSkill(matrix({ repeats: 3, cases: 4 }), SKILL);
    expect(verdict.verdict).toBe('insufficient-evidence');
    expect(verdict.reason).toContain('needs 5');
  });

  it('insufficient-evidence below 3 repeats, even with 5 cases and no catches', () => {
    expect(judgeSkill(matrix({ repeats: 2 }), SKILL).verdict).toBe('insufficient-evidence');
  });

  it('a single-repeat catch is not a unique catch', () => {
    const verdict = judgeSkill(matrix({ repeats: 1, mine: { [`${SKILL}/case-0`]: 1 } }), SKILL);
    expect(verdict).toMatchObject({ verdict: 'insufficient-evidence', uniqueCatches: [], unsettled: [`${SKILL}/case-0`] });
  });

  it('a bug it caught once that security-review missed blocks no-unique-catches', () => {
    const verdict = judgeSkill(matrix({ repeats: 3, mine: { [`${SKILL}/case-0`]: 1 } }), SKILL);
    expect(verdict).toMatchObject({ verdict: 'insufficient-evidence', unsettled: [`${SKILL}/case-0`] });
  });

  it('a bug security-review caught once is unsettled, not unique', () => {
    const verdict = judgeSkill(matrix({
      repeats: 3,
      mine: { [`${SKILL}/case-0`]: 3 },
      reference: { [`${SKILL}/case-0`]: 1 },
    }), SKILL);
    expect(verdict).toMatchObject({ verdict: 'insufficient-evidence', uniqueCatches: [], unsettled: [`${SKILL}/case-0`] });
  });

  it('an errored entry blocks every verdict, including earns-keep', () => {
    const results = matrix({ repeats: 3, mine: { [`${SKILL}/case-0`]: 3 } });
    recordShardRun(results, {
      skill: SKILL, config: testConfig(), usage: testUsage(), error: 'boom', hits: new Map(), errors: [`${SKILL}/case-1`],
    });
    expect(judgeSkill(results, SKILL)).toMatchObject({ verdict: 'insufficient-evidence', errors: 1 });
  });

  it('security-review errors also block the verdict', () => {
    const results = matrix({ repeats: 3 });
    recordShardRun(results, {
      skill: 'security-review', config: testConfig(), usage: testUsage(), hits: new Map(), errors: [`${SKILL}/case-2`],
    });
    expect(judgeSkill(results, SKILL).verdict).toBe('insufficient-evidence');
  });

  it('needs a security-review lane to compare against', () => {
    const results = createResults(owned(5));
    recordRepeats(results, SKILL, { [`${SKILL}/case-0`]: 3 }, 3);
    expect(judgeSkill(results, SKILL).reason).toContain('no security-review lane');
  });

  it('counts only bug cases the skill owns toward the case minimum', () => {
    const entries = [...owned(4), testEntry('wrdn-authz/other'), testEntry('sentry-vuln-001')];
    const results = createResults(entries);
    const none = Object.fromEntries(entries.map((entry) => [entry.id, 0]));
    recordRepeats(results, 'security-review', none, 3);
    recordRepeats(results, SKILL, none, 3);
    expect(judgeSkill(results, SKILL)).toMatchObject({
      verdict: 'insufficient-evidence',
      ownedBugCases: { evidence: 4, selected: 4 },
    });
  });

  it('is attached to every wrdn-* lane summary and never to security-review', () => {
    const summary = summarize(matrix({ repeats: 3 }));
    expect(summary['security-review']?.verdict).toBeUndefined();
    expect(summary[SKILL]?.verdict?.verdict).toBe('no-unique-catches');
  });
});
