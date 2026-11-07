import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Env var that points the suite at a local getsentry/sentry clone. */
const SENTRY_REPO_ENV = 'WARDEN_SECURITY_EVALS_SENTRY_REPO';

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    // A partial clone would otherwise fetch a missing object on a presence check.
    env: { ...process.env, GIT_NO_LAZY_FETCH: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function hasCommit(repoPath: string, ref: string): boolean {
  try {
    git(['cat-file', '-e', `${ref}^{commit}`], repoPath);
    return true;
  } catch {
    return false;
  }
}

/** Resolve the clone the suite builds worktrees from. Never clones on its own. */
export function resolveSentryRepo(path: string | undefined): string {
  if (!path) {
    throw new Error(
      `${SENTRY_REPO_ENV} (or --sentry-repo) must point at a local getsentry/sentry clone. `
      + 'A blobless clone is enough: git clone --filter=blob:none https://github.com/getsentry/sentry.git',
    );
  }
  const repoPath = resolve(path);
  try {
    return git(['rev-parse', '--show-toplevel'], repoPath);
  } catch {
    throw new Error(`${repoPath} is not a git checkout. Point ${SENTRY_REPO_ENV} at a getsentry/sentry clone.`);
  }
}

/**
 * Return a detached worktree of `ref`, creating it once and reusing it after.
 * Fetches `ref` from origin only when the clone does not already have it.
 */
export function ensureWorktree(repoPath: string, worktreesDir: string, ref: string): string {
  const path = join(worktreesDir, ref);
  if (existsSync(path)) {
    const head = git(['rev-parse', 'HEAD'], path);
    if (head !== ref) {
      throw new Error(`Worktree ${path} is at ${head}, expected ${ref}. Remove it and rerun.`);
    }
    return path;
  }

  if (!hasCommit(repoPath, ref)) {
    git(['fetch', '--quiet', 'origin', ref], repoPath);
  }
  mkdirSync(worktreesDir, { recursive: true });
  git(['worktree', 'add', '--quiet', '--detach', path, ref], repoPath);
  return path;
}

/** Remove a worktree created by `ensureWorktree`. CI uses this to cap disk use. */
export function removeWorktree(repoPath: string, path: string): void {
  git(['worktree', 'remove', '--force', path], repoPath);
}
