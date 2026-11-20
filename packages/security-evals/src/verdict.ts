import type { SuiteResults, Tally } from './results.js';

/** The lane every other skill has to beat. */
export const REFERENCE_SKILL = 'security-review';

/** Evidence a skill needs before the suite says anything about keeping it. */
export const VERDICT_RULES = {
  /** Repeats both lanes need on an entry before it counts as evidence. */
  minRepeats: 3,
  /** Share of repeats that makes a catch reliable: 2 of 3. */
  reliableHitRate: 2 / 3,
  /** Bug cases under `cases/<skill>/` with full evidence before zero unique catches means anything. */
  minOwnedBugCases: 5,
} as const;

export type VerdictName = 'earns-keep' | 'no-unique-catches' | 'insufficient-evidence';

export interface SkillVerdict {
  verdict: VerdictName;
  reason: string;
  /** Bugs this skill caught reliably that security-review never caught. */
  uniqueCatches: string[];
  /** Bugs this skill caught at least once that security-review did not catch reliably. More repeats settle them. */
  unsettled: string[];
  /** Bug cases the skill owns: how many have full evidence, out of how many were selected. */
  ownedBugCases: { evidence: number; selected: number };
  /** Entry runs that errored in this lane or in security-review. Any error blocks a verdict. */
  errors: number;
}

const rate = (tally: Tally): number => tally.hits / tally.runs;
const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * Decide whether a wrdn-* skill catches bugs security-review misses. Only two
 * outcomes are conclusive, and both need repeats; anything short of that is
 * insufficient evidence, never a quiet zero.
 */
export function judgeSkill(results: SuiteResults, skill: string): SkillVerdict {
  const { minRepeats, reliableHitRate, minOwnedBugCases } = VERDICT_RULES;
  const entries = Object.entries(results.entries);
  const errors = entries.reduce((sum, [, entry]) => sum
    + (entry.lanes[skill]?.errors ?? 0) + (entry.lanes[REFERENCE_SKILL]?.errors ?? 0), 0);

  // Bug entries both lanes scored at least once.
  const compared = entries.flatMap(([id, entry]) => {
    const mine = entry.lanes[skill];
    const reference = entry.lanes[REFERENCE_SKILL];
    return entry.kind === 'bug' && mine && reference && mine.runs > 0 && reference.runs > 0
      ? [{ id, mine, reference, full: mine.runs >= minRepeats && reference.runs >= minRepeats }]
      : [];
  });
  const uniqueCatches = compared
    .filter(({ mine, reference, full }) => full && rate(mine) >= reliableHitRate && reference.hits === 0)
    .map(({ id }) => id);
  const unsettled = compared
    .filter(({ id, mine, reference }) => !uniqueCatches.includes(id)
      && mine.hits > 0 && rate(reference) < reliableHitRate)
    .map(({ id }) => id);
  const owned = entries.filter(([id, entry]) => entry.source === 'case' && entry.kind === 'bug'
    && id.startsWith(`${skill}/`));
  const ownedEvidence = compared.filter(({ id, full }) => full && id.startsWith(`${skill}/`)).length;

  const verdict = (name: VerdictName, reason: string): SkillVerdict => ({
    verdict: name,
    reason,
    uniqueCatches,
    unsettled,
    ownedBugCases: { evidence: ownedEvidence, selected: owned.length },
    errors,
  });

  if (!results.lanes[REFERENCE_SKILL]) {
    return verdict('insufficient-evidence', `no ${REFERENCE_SKILL} lane to compare against`);
  }
  if (errors > 0) {
    return verdict('insufficient-evidence', `${plural(errors, 'entry run')} errored; rerun before reading anything into it`);
  }
  if (uniqueCatches.length > 0) {
    return verdict('earns-keep', `${plural(uniqueCatches.length, 'bug')} caught in at least 2 of 3 repeats `
      + `that ${REFERENCE_SKILL} never caught`);
  }
  if (unsettled.length > 0) {
    return verdict('insufficient-evidence', `${plural(unsettled.length, 'bug')} it caught that ${REFERENCE_SKILL} `
      + `did not catch reliably; more repeats settle ${unsettled.length === 1 ? 'it' : 'them'}`);
  }
  if (ownedEvidence < minOwnedBugCases) {
    return verdict('insufficient-evidence', `${ownedEvidence} owned bug cases with ${minRepeats}+ repeats in both lanes, `
      + `needs ${minOwnedBugCases} (${owned.length} selected)`);
  }
  return verdict('no-unique-catches', `0 unique catches across ${ownedEvidence} owned bug cases and `
    + `${plural(compared.length, 'bug entry')} overall at ${minRepeats}+ repeats`);
}
