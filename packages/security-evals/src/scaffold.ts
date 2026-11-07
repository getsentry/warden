import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGitHubPullRequestUrl, slugifyEvalName } from '../../evals/src/scaffold.js';
import { CASES_DIR, CaseSchema, SUMMARY_TODO, type CaseData } from './entries.js';
import { MATRIX_SKILLS } from './options.js';

/** A file the fix touched, as GitHub's compare API reports it. */
export interface ChangedFile {
  filename: string;
  status: string;
}

/** The three GitHub reads the scaffolder needs. Injected so tests run offline. */
export interface GitHubReader {
  pull(owner: string, repo: string, number: number): Promise<{ title: string; mergeCommit: string | null }>;
  commit(owner: string, repo: string, ref: string): Promise<{ sha: string; subject: string; parents: string[] }>;
  compare(owner: string, repo: string, base: string, head: string): Promise<ChangedFile[]>;
}

export type ChangeRef =
  | { owner: string; repo: string; pull: number; commit?: never }
  | { owner: string; repo: string; commit: string; pull?: never };

/** Parse a GitHub pull request URL or commit URL. */
export function parseChangeUrl(url: string): ChangeRef {
  const commit = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/commit\/([0-9a-f]{7,40})\/?$/.exec(url);
  if (commit?.[1] && commit[2] && commit[3]) {
    return { owner: commit[1], repo: commit[2], commit: commit[3] };
  }
  try {
    const pull = parseGitHubPullRequestUrl(url);
    return { owner: pull.owner, repo: pull.repo, pull: pull.pullNumber };
  } catch {
    throw new Error(`Expected a GitHub pull request or commit URL, got ${url}`);
  }
}

const TEST_DIR = /(^|\/)(tests?|__tests__|testutils|fixtures)\//;
const TEST_FILE = /(^|\/)(test_[^/]*\.py|[^/]*_test\.py|conftest\.py|[^/]*\.(test|spec)\.ts)$/;

/**
 * Pick targets from the files a fix touched: non-test `.py` and `.ts` files
 * that exist at both the bug ref and the fixed ref. Everything else is
 * skipped with a reason, so the author can add a path by hand if needed.
 */
export function inferTargets(files: ChangedFile[]): { targets: string[]; skipped: { path: string; reason: string }[] } {
  const targets: string[] = [];
  const skipped: { path: string; reason: string }[] = [];
  for (const { filename: path, status } of files) {
    if (!/\.(py|ts)$/.test(path) || path.endsWith('.d.ts')) {
      skipped.push({ path, reason: 'not a .py or .ts file' });
    } else if (TEST_DIR.test(path) || TEST_FILE.test(path)) {
      skipped.push({ path, reason: 'test file' });
    } else if (status !== 'modified' && status !== 'changed') {
      skipped.push({ path, reason: `${status} by the fix, so it is missing at one of the two refs` });
    } else {
      targets.push(path);
    }
  }
  return { targets: targets.sort(), skipped };
}

export interface ScaffoldedCase {
  repository: string;
  bugId: string;
  cleanId: string;
  bugPath: string;
  cleanPath: string;
  bugRef: string;
  fixRef: string;
  targets: string[];
  skipped: { path: string; reason: string }[];
}

/**
 * Write a bug case at the fix's parent and its clean twin at the fix, both
 * with the TODO summary the validator rejects until an author replaces it.
 */
export async function scaffoldCase(args: {
  url: string;
  skill: string;
  github: GitHubReader;
  name?: string;
  force?: boolean;
  casesDir?: string;
}): Promise<ScaffoldedCase> {
  const { url, skill, github, casesDir = CASES_DIR } = args;
  if (!(MATRIX_SKILLS as readonly string[]).includes(skill)) {
    throw new Error(`Unknown skill ${skill}. Choose from ${MATRIX_SKILLS.join(', ')}`);
  }
  const change = parseChangeUrl(url);
  const { owner, repo } = change;

  const pull = change.pull === undefined ? undefined : await github.pull(owner, repo, change.pull);
  const fixCommit = pull ? pull.mergeCommit : change.commit;
  if (!fixCommit) {
    throw new Error(`${url} is not merged. Pass the commit that fixed the bug instead.`);
  }
  const fix = await github.commit(owner, repo, fixCommit);
  const fixRef = fix.sha;
  const bugRef = fix.parents[0];
  if (!bugRef) {
    throw new Error(`${fixRef} has no parent commit to hold the bug`);
  }

  const { targets, skipped } = inferTargets(await github.compare(owner, repo, bugRef, fixRef));
  if (targets.length === 0) {
    throw new Error(`The fix modified no non-test .py or .ts file. Write the case by hand.\n${
      skipped.map((file) => `  ${file.path}: ${file.reason}`).join('\n')}`);
  }

  const name = args.name ?? slugifyEvalName(pull?.title ?? fix.subject);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw new Error(`Invalid case name ${name}. Use lowercase letters, numbers, and dashes.`);
  }
  const repository = `${owner}/${repo}`;
  const base = { summary: SUMMARY_TODO, repository, targets, source: url };
  const dir = join(casesDir, skill);
  const bugPath = join(dir, `${name}.json`);
  const cleanPath = join(dir, `${name}-fixed.json`);
  const cases: [string, CaseData][] = [
    [bugPath, CaseSchema.parse({ kind: 'bug', ...base, ref: bugRef })],
    [cleanPath, CaseSchema.parse({ kind: 'clean', ...base, ref: fixRef })],
  ];
  const existing = cases.map(([path]) => path).filter((path) => existsSync(path));
  if (existing.length > 0 && !args.force) {
    throw new Error(`Case already exists: ${existing.join(', ')}. Pass --force to overwrite.`);
  }
  mkdirSync(dir, { recursive: true });
  for (const [path, data] of cases) {
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  }

  return {
    repository,
    bugId: `${skill}/${name}`,
    cleanId: `${skill}/${name}-fixed`,
    bugPath,
    cleanPath,
    bugRef,
    fixRef,
    targets,
    skipped,
  };
}

/** Read GitHub's REST API with `GITHUB_TOKEN`/`GH_TOKEN` when set. */
export function createGitHubReader(token = process.env['GITHUB_TOKEN'] ?? process.env['GH_TOKEN']): GitHubReader {
  const get = async <T>(path: string): Promise<T> => {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: {
        accept: 'application/vnd.github+json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      throw new Error(`GitHub ${path}: ${response.status} ${await response.text()}`);
    }
    return response.json() as Promise<T>;
  };
  return {
    async pull(owner, repo, number) {
      const pull = await get<{ title: string; merged: boolean; merge_commit_sha: string | null }>(
        `/repos/${owner}/${repo}/pulls/${number}`,
      );
      return { title: pull.title, mergeCommit: pull.merged ? pull.merge_commit_sha : null };
    },
    async commit(owner, repo, ref) {
      const commit = await get<{ sha: string; commit: { message: string }; parents: { sha: string }[] }>(
        `/repos/${owner}/${repo}/commits/${ref}`,
      );
      return {
        sha: commit.sha,
        subject: commit.commit.message.split('\n')[0] ?? '',
        parents: commit.parents.map((parent) => parent.sha),
      };
    },
    async compare(owner, repo, base, head) {
      const comparison = await get<{ files?: ChangedFile[] }>(`/repos/${owner}/${repo}/compare/${base}...${head}`);
      return comparison.files ?? [];
    },
  };
}
