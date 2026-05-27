import type { SkillDefinition } from '../config/schema.js';
import { buildLocalEventContext, type LocalContextOptions } from '../cli/context.js';
import { resolveSkillAsync } from '../skills/loader.js';
import type { EventContext, Finding, SkillReport } from '../types/index.js';
import { isPathLike } from '../utils/path.js';
import { runSkill } from './analyze.js';
import type { VerifyFindingsOptions, VerifyFindingsResult } from './verify.js';
import { verifyFindings } from './verify.js';
import type { SkillRunnerOptions } from './types.js';

export interface RunLocalSkillOptions extends LocalContextOptions, SkillRunnerOptions {
  /** Skill file or directory to run. */
  skillPath: string;
}

export interface RunLocalSkillResult {
  /** Resolved skill definition used for the run. */
  skill: SkillDefinition;
  /** Synthetic pull request context built from the local git diff. */
  context: EventContext;
  /** Skill report returned by the Warden pipeline. */
  report: SkillReport;
}

export interface VerifyLocalFindingsOptions extends Omit<VerifyFindingsOptions, 'skill'> {
  /** Candidate findings to verify. */
  findings: Finding[];
  /** Skill file or directory that produced the candidate findings. */
  skillPath: string;
}

export interface VerifyLocalFindingsResult extends VerifyFindingsResult {
  /** Resolved skill definition used for verification. */
  skill: SkillDefinition;
}

/** Run a skill against a local git diff using Warden's normal analysis pipeline. */
export async function runLocalSkill(options: RunLocalSkillOptions): Promise<RunLocalSkillResult> {
  const {
    skillPath,
    base,
    head,
    cwd,
    defaultBranch,
    staged,
    ...runnerOptions
  } = options;
  const context = buildLocalEventContext({
    base,
    head,
    cwd,
    defaultBranch,
    staged,
  });
  const skillRoot = isPathLike(skillPath) ? cwd ?? process.cwd() : context.repoPath;
  const skill = await resolveSkillAsync(skillPath, skillRoot);
  const report = await runSkill(skill, context, runnerOptions);

  return { skill, context, report };
}

/** Verify candidate findings against a local repository using Warden's verifier. */
export async function verifyLocalFindings(
  options: VerifyLocalFindingsOptions
): Promise<VerifyLocalFindingsResult> {
  const { skillPath, findings, repoPath, ...verifyOptions } = options;
  const skill = await resolveSkillAsync(skillPath, repoPath);
  const result = await verifyFindings(findings, {
    ...verifyOptions,
    repoPath,
    skill,
  });

  return { skill, ...result };
}
