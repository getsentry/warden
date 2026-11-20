import { SUMMARY_TODO, type CaseFile, type SuiteEntry } from './entries.js';
import type { SuiteResults } from './results.js';

const sameTargets = (a: string[], b: string[]): boolean =>
  a.length === b.length && [...a].sort().every((target, index) => target === [...b].sort()[index]);

/**
 * Check everything about the suite that needs no model and no clone. Returns
 * one message per problem; an empty list means cases, corpus, and baseline
 * agree.
 */
export function validateSuite(args: {
  cases: CaseFile[];
  corpus: SuiteEntry[];
  skills: readonly string[];
  baseline: SuiteResults;
}): string[] {
  const { cases, corpus, skills, baseline } = args;
  const problems: string[] = [];

  const ids = [...corpus.map((entry) => entry.id), ...cases.map((file) => file.id)];
  for (const id of new Set(ids.filter((id, index) => ids.indexOf(id) !== index))) {
    problems.push(`${id}: duplicate entry id`);
  }

  for (const { id, owner, data } of cases) {
    if (!skills.includes(owner)) {
      problems.push(`${id}: cases/${owner} is not a matrix skill (${skills.join(', ')})`);
    }
    if (data.summary.trim() === SUMMARY_TODO || data.summary.trim().startsWith('TODO')) {
      problems.push(`${id}: summary is still the TODO placeholder`);
    }
    for (const entry of corpus) {
      const shared = data.targets.filter((target) => entry.targets.includes(target));
      if (entry.repository === data.repository && entry.ref === data.ref && shared.length > 0) {
        problems.push(`${id}: duplicates corpus entry ${entry.id} (${shared.join(', ')} at ${data.ref.slice(0, 8)})`);
      }
    }
  }

  const clean = cases.filter((file) => file.data.kind === 'clean');
  for (const { id, owner, data } of cases.filter((file) => file.data.kind === 'bug')) {
    for (const other of clean) {
      if (other.data.repository === data.repository && other.data.ref === data.ref
        && other.data.targets.some((target) => data.targets.includes(target))) {
        problems.push(`${id}: clean case ${other.id} pins the same code`);
      }
    }
    const twins = clean.filter((other) => other.owner === owner && other.data.source === data.source
      && other.data.repository === data.repository && other.data.ref !== data.ref
      && sameTargets(other.data.targets, data.targets));
    const [twin] = twins;
    if (!twin && !data.noClean) {
      problems.push(`${id}: no clean twin (same source and targets at the fixed ref) and no noClean reason`);
    }
    if (twin && data.noClean) {
      problems.push(`${id}: has clean twin ${twin.id} and a noClean reason; drop noClean`);
    }
    for (const twin of twins.filter((other) => other.data.summary !== data.summary)) {
      problems.push(`${id}: clean twin ${twin.id} has a different summary; they describe the same bug`);
    }
  }

  const pinned = new Map<string, { repository: string; ref: string }>();
  for (const entry of corpus) pinned.set(entry.id, entry);
  for (const file of cases) pinned.set(file.id, file.data);
  for (const skill of Object.keys(baseline.lanes)) {
    if (!skills.includes(skill)) problems.push(`baseline: lane ${skill} is not a matrix skill`);
  }
  for (const [id, recorded] of Object.entries(baseline.entries)) {
    const entry = pinned.get(id);
    if (!entry) {
      problems.push(`baseline: ${id} is not a corpus entry or case`);
    } else if (entry.repository !== recorded.repository || entry.ref !== recorded.ref) {
      problems.push(`baseline: ${id} was recorded at ${recorded.repository}@${recorded.ref.slice(0, 8)}, `
        + `the entry now pins ${entry.repository}@${entry.ref.slice(0, 8)}`);
    }
  }
  return problems;
}
