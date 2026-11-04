/**
 * Incremental PR review.
 *
 * A skill check that completes cleanly records a fingerprint of the skill and
 * its effective config in the check run `external_id`. On a later push, Warden
 * finds the newest earlier PR commit with a matching check, rebuilds that
 * commit's PR diff, and skips current hunks whose content was already
 * reviewed there. Hunks match on file path plus hunk body, not line numbers,
 * so rebases and merges from the base branch do not trigger re-review of
 * code the PR did not change. Only checks written by the GitHub App named in
 * `incrementalApp` count, so look-alike checks from other apps cannot skip review.
 *
 * Every lookup fails open: if the baseline cannot be found or read, the skill
 * reviews the full PR as it would without incremental review.
 */

import { createHash } from 'node:crypto';
import type { Octokit } from '@octokit/rest';
import type { ResolvedTrigger } from '../config/loader.js';
import type { SkillDefinition } from '../config/schema.js';
import { parsePatch } from '../diff/index.js';
import type { ExistingComment } from '../output/dedup.js';
import type { CarriedHunkRange, FileChange, SkillReport } from '../types/index.js';
import type { SkipHunks } from '../sdk/types.js';
import { getVersion } from '../utils/version.js';

const EXTERNAL_ID_PREFIX = 'warden-incremental:v1:';

/** Earlier PR commits searched for a baseline check, newest first. */
const MAX_BASELINE_COMMITS = 10;

/** Content fingerprints of reviewed hunks, with a count for repeated identical hunks. */
export type ReviewedHunkIndex = ReadonlyMap<string, number>;

/** Reporting policy that changes what a carried-forward finding means. */
export interface IncrementalPolicy {
  failOn?: string;
  reportOn?: string;
  minConfidence?: string;
  failCheck?: boolean;
  requestChanges?: boolean;
  maxFindings?: number;
}

/** Result of matching the current PR diff against a baseline. */
export interface IncrementalPlan {
  skipHunks: SkipHunks;
  carriedRanges: CarriedHunkRange[];
}

/** A baseline commit and the hunks its PR diff contained. */
export interface IncrementalBaseline {
  sha: string;
  reviewed: ReviewedHunkIndex;
}

/** Looks up baselines for the current pull request. */
export interface IncrementalBaselineSource {
  /**
   * Newest baseline whose check has this `external_id` and was written by
   * `trustedApp`. Other apps can create look-alike checks.
   */
  baselineFor(externalId: string, trustedApp: string): Promise<IncrementalBaseline | undefined>;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Fingerprint a hunk by path and body. Line numbers in the @@ header are ignored. */
export function hunkFingerprint(filename: string, lines: readonly string[]): string {
  let end = lines.length;
  while (end > 0 && lines[end - 1] === '') end--;
  return sha256(`${filename}\0${lines.slice(0, end).join('\n')}`);
}

/** Index every hunk in a set of file patches. */
export function buildReviewedHunkIndex(
  files: readonly Pick<FileChange, 'filename' | 'patch'>[]
): ReviewedHunkIndex {
  const index = new Map<string, number>();
  for (const file of files) {
    if (!file.patch) continue;
    for (const hunk of parsePatch(file.patch)) {
      const key = hunkFingerprint(file.filename, hunk.lines);
      index.set(key, (index.get(key) ?? 0) + 1);
    }
  }
  return index;
}

/**
 * Decide which current hunks were already reviewed.
 * Each baseline hunk covers at most one current hunk with the same content.
 */
export function planIncrementalReview(
  files: readonly Pick<FileChange, 'filename' | 'patch'>[],
  reviewed: ReviewedHunkIndex
): IncrementalPlan {
  const remaining = new Map(reviewed);
  const skipHunks = new Map<string, Set<number>>();
  const carriedRanges: CarriedHunkRange[] = [];

  for (const file of files) {
    if (!file.patch) continue;
    parsePatch(file.patch).forEach((hunk, index) => {
      const key = hunkFingerprint(file.filename, hunk.lines);
      const available = remaining.get(key) ?? 0;
      if (available === 0) return;
      remaining.set(key, available - 1);

      let skipped = skipHunks.get(file.filename);
      if (!skipped) {
        skipped = new Set();
        skipHunks.set(file.filename, skipped);
      }
      skipped.add(index);
      carriedRanges.push({
        path: file.filename,
        startLine: hunk.newStart,
        endLine: hunk.newStart + Math.max(hunk.newCount, 1) - 1,
      });
    });
  }

  return { skipHunks, carriedRanges };
}

/**
 * Build the check run external_id for a skill run.
 * Any change to the skill prompt, Warden version, or settings that affect
 * what gets analyzed or reported yields a new id, which forces a full review.
 * The base branch is included because baselines are rebuilt against the
 * current base: after a retarget, an old baseline would describe a diff that
 * was never reviewed.
 */
export function incrementalExternalId(
  trigger: ResolvedTrigger,
  skill: Pick<SkillDefinition, 'name' | 'prompt'>,
  policy: IncrementalPolicy,
  baseBranch: string
): string {
  const payload = JSON.stringify({
    warden: getVersion(),
    base: baseBranch,
    skill: skill.name,
    prompt: sha256(skill.prompt),
    remote: trigger.remote ?? null,
    filters: trigger.filters,
    ignore: trigger.ignore ?? null,
    scan: trigger.scan ?? null,
    chunking: trigger.chunking ?? null,
    model: trigger.model ?? null,
    auxiliaryModel: trigger.auxiliaryModel ?? null,
    auxiliaryEffort: trigger.auxiliaryEffort ?? null,
    synthesisModel: trigger.synthesisModel ?? null,
    maxContextFiles: trigger.maxContextFiles ?? null,
    runtime: trigger.runtime ?? null,
    effort: trigger.effort ?? null,
    maxTurns: trigger.maxTurns ?? null,
    verifyFindings: trigger.verifyFindings ?? null,
    failOn: policy.failOn ?? null,
    reportOn: policy.reportOn ?? null,
    minConfidence: policy.minConfidence ?? null,
    failCheck: policy.failCheck ?? null,
    requestChanges: policy.requestChanges ?? null,
    maxFindings: policy.maxFindings ?? null,
  });
  return `${EXTERNAL_ID_PREFIX}${sha256(payload).slice(0, 32)}`;
}

/**
 * Skip reasons decided by path alone. Paths are part of the hunk fingerprint
 * and ignore config is part of the external_id, so these files stay skipped
 * for as long as a baseline matches.
 */
const PATH_ONLY_SKIPS: ReadonlySet<string> = new Set(['ignored:builtin', 'ignored:user']);

/**
 * Whether a run reviewed every hunk it was given. Failed hunks and files
 * dropped by scan limits were never reviewed, so the run cannot be a baseline.
 * Content-based skips such as generated files also disqualify it: the baseline
 * diff includes those hunks, and the file can stop looking generated later.
 */
export function reviewedEverything(report: SkillReport): boolean {
  if (report.error) return false;
  if ((report.failedHunks ?? 0) > 0 || (report.failedExtractions ?? 0) > 0) return false;
  return !report.skippedFiles?.some((file) => !PATH_ONLY_SKIPS.has(file.reason));
}

/**
 * Return the external_id to record on a skill check, or undefined when the
 * run must not become a baseline. Report mode only sees the replayed report,
 * so completeness is decided in analyze mode and stored on `incremental`.
 */
export function baselineExternalId(report: SkillReport): string | undefined {
  return report.incremental?.complete ? report.incremental.externalId : undefined;
}

/** A carried hunk range tagged with the skill that skipped it. */
export type SkillCarriedRange = CarriedHunkRange & { skill: string };

/** Carried ranges from all reports, tagged with the skill that carried them. */
export function collectCarriedRanges(reports: readonly SkillReport[]): SkillCarriedRange[] {
  return reports.flatMap((report) =>
    (report.incremental?.carriedRanges ?? []).map((range) => ({ ...range, skill: report.skill }))
  );
}

/**
 * Whether a comment sits on a hunk its skill carried forward without re-review.
 * Checks both the line from the Warden marker, which keeps the line the
 * finding was first posted on, and GitHub's current line, which follows the
 * hunk when a rebase or base merge shifts it.
 */
export function isOnCarriedHunk(
  comment: Pick<ExistingComment, 'path' | 'line' | 'currentLine' | 'skills'>,
  ranges: readonly SkillCarriedRange[]
): boolean {
  const lines = comment.currentLine === undefined ? [comment.line] : [comment.line, comment.currentLine];
  return ranges.some(
    (range) =>
      range.path === comment.path &&
      lines.some((line) => line >= range.startLine && line <= range.endLine) &&
      (!comment.skills?.length || comment.skills.includes(range.skill))
  );
}

/**
 * Whether an unresolved Warden comment sits on a carried hunk. Its finding
 * was not re-checked, so the run cannot prove a blocking review is clear.
 */
export function hasOpenCarriedComment(
  comments: readonly ExistingComment[],
  ranges: readonly SkillCarriedRange[]
): boolean {
  return comments.some((c) => c.isWarden && !c.isResolved && isOnCarriedHunk(c, ranges));
}

/** Baselines are keyed by check id and the app that wrote the check. */
function baselineKey(externalId: string, app: string): string {
  return `${app}\n${externalId}`;
}

interface BaselineSourceOptions {
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  baseSha: string;
  warn?: (message: string) => void;
}

/**
 * Create a baseline source for one pull request. Commit and check lookups run
 * once per action run and are shared across skills.
 * Requires `pull-requests: read`, `checks: read`, and `contents: read`.
 */
export function createIncrementalBaselineSource(
  octokit: Octokit,
  options: BaselineSourceOptions
): IncrementalBaselineSource {
  const warn = options.warn ?? ((message: string) => console.warn(message));
  let baselineShas: Promise<Map<string, string>> | undefined;
  const indexes = new Map<string, Promise<ReviewedHunkIndex | undefined>>();

  const findBaselineShas = async (): Promise<Map<string, string>> => {
    const found = new Map<string, string>();
    try {
      const commits = await octokit.paginate(octokit.pulls.listCommits, {
        owner: options.owner,
        repo: options.repo,
        pull_number: options.pullNumber,
        per_page: 100,
      });
      const candidates = commits
        .map((commit) => commit.sha)
        .filter((sha) => sha !== options.headSha)
        .reverse()
        .slice(0, MAX_BASELINE_COMMITS);

      for (const sha of candidates) {
        const { data } = await octokit.checks.listForRef({
          owner: options.owner,
          repo: options.repo,
          ref: sha,
          filter: 'latest',
          per_page: 100,
        });
        for (const check of data.check_runs) {
          const id = check.external_id;
          const app = check.app?.slug;
          if (!id?.startsWith(EXTERNAL_ID_PREFIX) || !app) continue;
          const key = baselineKey(id, app);
          if (found.has(key)) continue;
          if (!check.name.startsWith('warden: ') || check.status !== 'completed') continue;
          if (check.conclusion !== 'success' && check.conclusion !== 'neutral') continue;
          found.set(key, sha);
        }
      }
    } catch (error) {
      warn(`Incremental review: could not read earlier Warden checks, reviewing the full PR: ${error}`);
    }
    return found;
  };

  const loadIndex = async (sha: string): Promise<ReviewedHunkIndex | undefined> => {
    try {
      // Three-dot compare yields the PR diff as it stood at `sha`. Files are
      // returned with the first page; per_page only limits the commit list.
      const { data } = await octokit.repos.compareCommitsWithBasehead({
        owner: options.owner,
        repo: options.repo,
        basehead: `${options.baseSha}...${sha}`,
        per_page: 1,
      });
      return buildReviewedHunkIndex(data.files ?? []);
    } catch (error) {
      warn(`Incremental review: could not load the diff at ${sha.slice(0, 7)}, reviewing the full PR: ${error}`);
      return undefined;
    }
  };

  return {
    async baselineFor(externalId, trustedApp) {
      baselineShas ??= findBaselineShas();
      const sha = (await baselineShas).get(baselineKey(externalId, trustedApp));
      if (!sha) return undefined;

      let index = indexes.get(sha);
      if (!index) {
        index = loadIndex(sha);
        indexes.set(sha, index);
      }
      const reviewed = await index;
      return reviewed ? { sha, reviewed } : undefined;
    },
  };
}
