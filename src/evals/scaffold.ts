import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { Octokit } from '@octokit/rest';

type PullRequestSide = 'base' | 'head';

export interface GitHubPullRequestRef {
  owner: string;
  repo: string;
  pullNumber: number;
}

export interface ScaffoldEvalOptions {
  url: string;
  category: string;
  side?: PullRequestSide;
  name?: string;
  evalsDir: string;
  force?: boolean;
}

export interface ScaffoldedEvalFile {
  sourcePath: string;
  fixturePath: string;
  ref: string;
}

export interface ScaffoldedEval {
  name: string;
  scenarioPath: string;
  files: ScaffoldedEvalFile[];
}

interface GitHubFileContent {
  content: string;
  ref: string;
}

interface PullFile {
  filename: string;
  status: string;
  previous_filename?: string;
}

const UNSAFE_FILENAME_CHARS = /[^a-zA-Z0-9._-]+/g;
const SAFE_PATH_SEGMENT = /^[a-zA-Z0-9._-]+$/;

function requireSafePathSegment(value: string, label: string): string {
  if (!SAFE_PATH_SEGMENT.test(value) || value === '.' || value === '..') {
    throw new Error(`Invalid ${label}: ${value}. Use only letters, numbers, ".", "_", or "-".`);
  }
  return value;
}

function requirePullRequestSide(value: PullRequestSide | undefined): PullRequestSide {
  const side = value ?? 'base';
  if (side !== 'base' && side !== 'head') {
    throw new Error(`Invalid pull request side: ${side}. Use "base" or "head".`);
  }
  return side;
}

function fromEvalsPath(evalsDir: string, relativePath: string): string {
  return join(evalsDir, ...relativePath.split('/'));
}

export function parseGitHubPullRequestUrl(url: string): GitHubPullRequestRef {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (error) {
    throw new Error(`Invalid GitHub URL: ${url}`, { cause: error });
  }

  if (parsed.hostname !== 'github.com') {
    throw new Error(`Expected github.com URL, got ${parsed.hostname}`);
  }

  const [owner, repo, kind, pullNumber] = parsed.pathname.split('/').filter(Boolean);
  if (!owner || !repo || kind !== 'pull' || !pullNumber) {
    throw new Error(`Expected GitHub pull request URL, got ${url}`);
  }

  const numericPullNumber = Number(pullNumber);
  if (!Number.isInteger(numericPullNumber) || numericPullNumber <= 0) {
    throw new Error(`Invalid pull request number in ${url}`);
  }

  return { owner, repo, pullNumber: numericPullNumber };
}

export function slugifyEvalName(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');

  return slug || 'github-pr-eval';
}

function getGitHubToken(): string | undefined {
  return process.env['GITHUB_TOKEN'] ?? process.env['GH_TOKEN'];
}

function fixtureFilename(path: string, seen: Set<string>): string {
  const base = path.split('/').pop() || 'fixture';
  let candidate = base.replace(UNSAFE_FILENAME_CHARS, '_');
  if (!seen.has(candidate)) {
    seen.add(candidate);
    return candidate;
  }

  const prefix = path
    .split('/')
    .slice(0, -1)
    .join('_')
    .replace(UNSAFE_FILENAME_CHARS, '_')
    .slice(-40)
    .replace(/^_+|_+$/g, '');
  candidate = prefix ? `${prefix}_${candidate}` : candidate;
  let deduped = candidate;
  let suffix = 2;
  while (seen.has(deduped)) {
    deduped = `${candidate}.${suffix}`;
    suffix++;
  }
  seen.add(deduped);
  return deduped;
}

function filePathForSide(file: PullFile, side: PullRequestSide): string | undefined {
  if (side === 'base') {
    if (file.status === 'added') {
      return undefined;
    }
    return file.previous_filename ?? file.filename;
  }

  if (file.status === 'removed') {
    return undefined;
  }
  return file.filename;
}

async function fetchFileContent(
  octokit: Octokit,
  pull: GitHubPullRequestRef,
  path: string,
  ref: string,
): Promise<GitHubFileContent | undefined> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner: pull.owner,
      repo: pull.repo,
      path,
      ref,
    });

    const data = response.data;
    if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) {
      return undefined;
    }

    return {
      ref,
      content: Buffer.from(data.content, 'base64').toString('utf-8'),
    };
  } catch (error) {
    if (
      error
      && typeof error === 'object'
      && 'status' in error
      && (error as { status?: unknown }).status === 404
    ) {
      return undefined;
    }
    throw error;
  }
}

function scenarioJson(args: {
  title: string;
  body?: string | null;
  files: string[];
  url: string;
  side: PullRequestSide;
}): string {
  return `${JSON.stringify({
    given: args.title,
    files: args.files,
    should_find: [{
      finding: `TODO: describe the vulnerability fixed by ${args.url}`,
    }],
    should_not_find: [],
    notes: {
      source: args.url,
      side: args.side,
      body: args.body || undefined,
    },
  }, null, 2)}\n`;
}

export async function scaffoldEvalFromGitHubPullRequest(
  options: ScaffoldEvalOptions
): Promise<ScaffoldedEval> {
  const pull = parseGitHubPullRequestUrl(options.url);
  const category = requireSafePathSegment(options.category, 'eval category');
  const requestedName = options.name
    ? requireSafePathSegment(options.name, 'eval name')
    : undefined;
  const side = requirePullRequestSide(options.side);
  const octokit = new Octokit({ auth: getGitHubToken() });
  const { data: pr } = await octokit.rest.pulls.get({
    owner: pull.owner,
    repo: pull.repo,
    pull_number: pull.pullNumber,
  });
  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner: pull.owner,
    repo: pull.repo,
    pull_number: pull.pullNumber,
    per_page: 100,
  }) as PullFile[];

  const ref = side === 'base' ? pr.base.sha : pr.head.sha;
  const name = requestedName ?? slugifyEvalName(pr.title);
  const fixtureDir = fromEvalsPath(options.evalsDir, posix.join('fixtures', name));
  const scenarioPath = join(options.evalsDir, category, `${name}.json`);
  const seenFilenames = new Set<string>();
  const copiedFiles: ScaffoldedEvalFile[] = [];
  const contents: (ScaffoldedEvalFile & { content: string })[] = [];

  if (!options.force && existsSync(scenarioPath)) {
    throw new Error(`Eval scenario already exists: ${scenarioPath}`);
  }

  for (const file of files) {
    const sourcePath = filePathForSide(file, side);
    if (!sourcePath) {
      continue;
    }

    const content = await fetchFileContent(octokit, pull, sourcePath, ref);
    if (!content) {
      continue;
    }

    const filename = fixtureFilename(sourcePath, seenFilenames);
    const fixturePath = posix.join('fixtures', name, filename);
    const fullFixturePath = fromEvalsPath(options.evalsDir, fixturePath);
    if (!options.force && existsSync(fullFixturePath)) {
      throw new Error(`Eval fixture already exists: ${fullFixturePath}`);
    }
    contents.push({ sourcePath, fixturePath, ref: content.ref, content: content.content });
    copiedFiles.push({ sourcePath, fixturePath, ref: content.ref });
  }

  if (copiedFiles.length === 0) {
    throw new Error(`No ${side}-side files could be scaffolded from ${options.url}`);
  }

  mkdirSync(fixtureDir, { recursive: true });
  mkdirSync(join(options.evalsDir, category), { recursive: true });

  for (const content of contents) {
    const fullFixturePath = fromEvalsPath(options.evalsDir, content.fixturePath);
    mkdirSync(dirname(fullFixturePath), { recursive: true });
    writeFileSync(
      fullFixturePath,
      content.content,
      { flag: options.force ? 'w' : 'wx' },
    );
  }

  writeFileSync(
    scenarioPath,
    scenarioJson({
      title: pr.title,
      body: pr.body,
      files: copiedFiles.map((file) => file.fixturePath),
      url: options.url,
      side,
    }),
    { flag: options.force ? 'w' : 'wx' },
  );

  return {
    name,
    scenarioPath,
    files: copiedFiles,
  };
}
