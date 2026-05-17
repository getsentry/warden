import { basename, dirname, posix } from 'node:path';

const GITHUB_FIXTURE_SOURCE = 'github';
const UNSAFE_FIXTURE_PATH_CHARS = /[^a-zA-Z0-9._-]+/g;

interface GitHubFixturePathOptions {
  owner: string;
  repo: string;
  sourcePath: string;
}

function fixtureStorageSegments(srcPath: string): string[] | undefined {
  const segments = srcPath.replaceAll('\\', '/').split('/').filter(Boolean);

  for (let index = 0; index < segments.length - 1; index++) {
    if (segments[index] === 'evals' && segments[index + 1] === 'fixtures') {
      return segments.slice(index + 2);
    }
  }

  const fixturesIndex = segments.indexOf('fixtures');
  if (fixturesIndex !== -1 && fixturesIndex < segments.length - 1) {
    return segments.slice(fixturesIndex + 1);
  }

  return undefined;
}

function fixtureRepoPathSegments(srcPath: string): string[] {
  const fixtureSegments = fixtureStorageSegments(srcPath);
  if (!fixtureSegments) {
    return [basename(dirname(srcPath)), basename(srcPath)].filter(Boolean);
  }

  const [scenario, source, owner, repo, ...sourcePath] = fixtureSegments;
  if (scenario && source === GITHUB_FIXTURE_SOURCE && owner && repo && sourcePath.length > 0) {
    return [scenario, ...sourcePath];
  }
  return fixtureSegments;
}

/** Convert an arbitrary source path segment into a stable eval fixture segment. */
export function safeEvalFixturePathSegment(value: string): string {
  const candidate = value
    .replace(UNSAFE_FIXTURE_PATH_CHARS, '_')
    .replace(/^_+|_+$/g, '');

  if (!candidate || candidate === '.' || candidate === '..') {
    return 'path';
  }
  return candidate;
}

/** Build the checked-in fixture path suffix for a GitHub source file. */
export function buildGitHubEvalFixturePath(options: GitHubFixturePathOptions): string {
  const sourceSegments = options.sourcePath
    .split('/')
    .filter(Boolean)
    .map(safeEvalFixturePathSegment);

  return posix.join(
    GITHUB_FIXTURE_SOURCE,
    safeEvalFixturePathSegment(options.owner),
    safeEvalFixturePathSegment(options.repo),
    ...sourceSegments,
  );
}

/** Return the source repository encoded in a scaffolded eval fixture path, when present. */
export function evalFixtureSourceRepository(srcPath: string): string | undefined {
  const fixtureSegments = fixtureStorageSegments(srcPath);
  if (!fixtureSegments) {
    return undefined;
  }

  const [, source, owner, repo, ...sourcePath] = fixtureSegments;
  if (source === GITHUB_FIXTURE_SOURCE && owner && repo && sourcePath.length > 0) {
    return `${owner}/${repo}`;
  }

  return undefined;
}

/** Return the repo-relative path used when copying an eval fixture into a temp repo. */
export function evalFixtureRepoPath(srcPath: string): string {
  return fixtureRepoPathSegments(srcPath).join('/');
}

/** Return a single encoded source repository when all fixture paths agree. */
export function singleEvalFixtureSourceRepository(filePaths: string[]): string | undefined {
  const repositories = new Set(
    filePaths
      .map(evalFixtureSourceRepository)
      .filter((repo): repo is string => Boolean(repo))
  );
  return repositories.size === 1 ? [...repositories][0] : undefined;
}
