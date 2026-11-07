import type { EvalMeta } from './types.js';

/** Which skill ran a matrix scenario: builtin security-review or the wrdn skill that owns it. */
export type MatrixLane = 'security-review' | 'skill';

/** A bug scenario expects a finding. A clean scenario only guards against false positives. */
export type MatrixScenarioKind = 'bug' | 'clean';

/** One judged run of one scenario in one lane. */
export interface MatrixResult {
  skill: string;
  scenario: string;
  kind: MatrixScenarioKind;
  lane: MatrixLane;
  passed: boolean;
}

/** Classify a scenario: clean when it has no required `should_find`. */
export function matrixScenarioKind(meta: Pick<EvalMeta, 'should_find'>): MatrixScenarioKind {
  return meta.should_find.some((assertion) => assertion.required) ? 'bug' : 'clean';
}

function passedIn(results: MatrixResult[], scenario: string, lane: MatrixLane): boolean | undefined {
  return results.find((result) => result.scenario === scenario && result.lane === lane)?.passed;
}

function formatList(names: string[]): string {
  return names.length > 0 ? ` (${names.join(', ')})` : '';
}

/**
 * Render the per-skill coverage verdict. The headline number is bugs the wrdn
 * skill caught that security-review missed; zero across a real fixture set is
 * the evidence that the skill adds no coverage.
 */
export function summarizeSecurityMatrix(results: MatrixResult[]): string {
  const skills = [...new Set(results.map((result) => result.skill))].sort();
  const lines: string[] = ['Security matrix'];

  for (const skill of skills) {
    const skillResults = results.filter((result) => result.skill === skill);
    const scenarios = [...new Set(skillResults.map((result) => result.scenario))].sort();
    const bugs = scenarios.filter((name) => skillResults.some((r) => r.scenario === name && r.kind === 'bug'));
    const clean = scenarios.filter((name) => !bugs.includes(name));
    const incomplete = scenarios.filter(
      (name) => passedIn(skillResults, name, 'skill') === undefined
        || passedIn(skillResults, name, 'security-review') === undefined,
    );

    const caughtBy = (lane: MatrixLane) => bugs.filter((name) => passedIn(skillResults, name, lane) === true);
    const flaggedBy = (lane: MatrixLane) => clean.filter((name) => passedIn(skillResults, name, lane) === false);
    const skillCaught = caughtBy('skill');
    const reviewCaught = caughtBy('security-review');
    const onlySkill = skillCaught.filter((name) => !reviewCaught.includes(name));
    const onlyReview = reviewCaught.filter((name) => !skillCaught.includes(name));

    lines.push(
      '',
      `${skill}: ${onlySkill.length} of ${bugs.length} bugs caught only by ${skill}${formatList(onlySkill)}`,
      `  caught: ${skill} ${skillCaught.length}/${bugs.length}, security-review ${reviewCaught.length}/${bugs.length}`,
      `  caught only by security-review: ${onlyReview.length}${formatList(onlyReview)}`,
      `  clean fixtures flagged: ${skill} ${flaggedBy('skill').length}/${clean.length}, `
        + `security-review ${flaggedBy('security-review').length}/${clean.length}`,
    );
    if (incomplete.length > 0) {
      lines.push(`  incomplete, missing a lane: ${incomplete.join(', ')}`);
    }
  }

  return lines.join('\n');
}
