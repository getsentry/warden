import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** A repository the suite reads from a local clone, never clones itself. */
export interface CheckoutSpec {
  repository: string;
  /** Env var that names the clone; the CLI flag maps onto it. */
  env: string;
  flag: string;
}

/** A scanned repository. Entries name it; `--repo owner/name=<path>` supplies the clone. */
export function repoCheckout(repository: string): CheckoutSpec {
  return { repository, env: 'WARDEN_SECURITY_EVALS_REPOS', flag: `--repo ${repository}=<path>` };
}

export const SKILLS_CHECKOUT: CheckoutSpec = {
  repository: 'getsentry/warden-skills',
  env: 'WARDEN_SECURITY_EVALS_SKILLS_REPO',
  flag: '--skills-repo',
};

// Roach hands its proxy variables to test workers and refuses origins other
// than the model APIs, so git goes direct.
const PROXY_VARS = new Set(['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy']);

function git(args: string[], cwd: string, extraEnv: NodeJS.ProcessEnv = {}): string {
  const env = Object.fromEntries(Object.entries({ ...process.env, ...extraEnv })
    .filter(([name]) => !PROXY_VARS.has(name)));
  return execFileSync('git', args, { cwd, encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function hasCommit(repoPath: string, ref: string): boolean {
  try {
    // Without this, a blobless clone would fetch a missing commit during the check.
    git(['cat-file', '-e', `${ref}^{commit}`], repoPath, { GIT_NO_LAZY_FETCH: '1' });
    return true;
  } catch {
    return false;
  }
}

/** Resolve a local clone the suite builds worktrees from. Never clones on its own. */
export function resolveCheckout(spec: CheckoutSpec, path: string | undefined): string {
  if (!path) {
    throw new Error(
      `${spec.env} (or ${spec.flag}) must point at a local ${spec.repository} clone. `
      + `A blobless clone is enough: git clone --filter=blob:none https://github.com/${spec.repository}.git`,
    );
  }
  const repoPath = resolve(path);
  try {
    return git(['rev-parse', '--show-toplevel'], repoPath);
  } catch {
    throw new Error(`${repoPath} is not a git checkout. Point ${spec.env} at a ${spec.repository} clone.`);
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
