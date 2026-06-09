import { statSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

/**
 * Normalize path separators to forward slashes for cross-platform consistency.
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Check whether a normalized path stays within a repository-relative boundary.
 */
export function isRepoRelativePath(path: string): boolean {
  return path !== '' && path !== '..' && !path.startsWith('../') && !isAbsolute(path);
}

/**
 * Check whether a target string should be treated as a filesystem path.
 */
export function isPathLike(value: string): boolean {
  return value === '~' || value.startsWith('.') || value.includes('/') || value.includes('\\');
}

/**
 * Resolve a user-supplied config input to the absolute path of a warden.toml
 * file. If the resolved path is a directory, appends 'warden.toml'; otherwise
 * treats the input as a direct file path.
 */
export function resolveConfigInput(input: string): string {
  const p = resolve(process.cwd(), input);
  try {
    if (statSync(p).isDirectory()) return join(p, 'warden.toml');
  } catch {
    // Path doesn't exist or isn't accessible — treat as direct file path
  }
  return p;
}

/**
 * Resolve a CLI path target against a base directory.
 */
export function resolvePathTarget(path: string, baseDir?: string): string {
  if (path.startsWith('~/')) {
    return join(homedir(), path.slice(2));
  }
  if (path === '~') {
    return homedir();
  }
  if (isAbsolute(path)) {
    return path;
  }
  return baseDir ? join(baseDir, path) : path;
}
