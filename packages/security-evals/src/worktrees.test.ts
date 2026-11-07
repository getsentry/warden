import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ensureWorktree, removeWorktree, resolveSentryRepo } from './worktrees.js';

function configuredEmail(): string {
  try {
    return execFileSync('git', ['config', '--get', 'user.email'], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

// CI runners have no git identity; keep a configured one so commits stay attributable locally.
const IDENTITY = configuredEmail() ? [] : ['-c', 'user.name=Warden Test', '-c', 'user.email=test@warden.dev'];

function git(args: string[], cwd: string): string {
  return execFileSync('git', [...IDENTITY, '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' }).trim();
}

function commit(repo: string, content: string): string {
  writeFileSync(join(repo, 'app.py'), content);
  git(['add', 'app.py'], repo);
  git(['commit', '-q', '-m', content], repo);
  return git(['rev-parse', 'HEAD'], repo);
}

describe('ensureWorktree', () => {
  let root: string;
  let upstream: string;
  let clone: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'security-evals-'));
    upstream = join(root, 'upstream');
    clone = join(root, 'clone');
    git(['init', '-q', '--initial-branch=main', upstream], root);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('creates a detached worktree once and reuses it', () => {
    const ref = commit(upstream, 'v1');
    git(['clone', '-q', upstream, clone], root);
    const worktrees = join(root, 'worktrees');

    const path = ensureWorktree(clone, worktrees, ref);
    expect(path).toBe(join(worktrees, ref));
    expect(readFileSync(join(path, 'app.py'), 'utf8')).toBe('v1');
    expect(ensureWorktree(clone, worktrees, ref)).toBe(path);

    removeWorktree(clone, path);
    expect(existsSync(path)).toBe(false);
  });

  it('fetches a ref the clone does not have yet', () => {
    commit(upstream, 'v1');
    git(['clone', '-q', upstream, clone], root);
    const later = commit(upstream, 'v2');

    const path = ensureWorktree(clone, join(root, 'worktrees'), later);
    expect(readFileSync(join(path, 'app.py'), 'utf8')).toBe('v2');
  });

  it('refuses a worktree that moved off its ref', () => {
    const first = commit(upstream, 'v1');
    const second = commit(upstream, 'v2');
    git(['clone', '-q', upstream, clone], root);
    const worktrees = join(root, 'worktrees');
    const path = ensureWorktree(clone, worktrees, first);
    git(['checkout', '-q', '--detach', second], path);

    expect(() => ensureWorktree(clone, worktrees, first)).toThrow(`expected ${first}`);
  });
});

describe('resolveSentryRepo', () => {
  it('fails fast without a clone instead of cloning', () => {
    expect(() => resolveSentryRepo(undefined)).toThrow('WARDEN_SECURITY_EVALS_SENTRY_REPO');
    expect(() => resolveSentryRepo(tmpdir())).toThrow('is not a git checkout');
  });
});
