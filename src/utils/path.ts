import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';

/**
 * Check whether a target string should be treated as a filesystem path.
 */
export function isPathLike(value: string): boolean {
  return value === '~' || value.startsWith('.') || value.includes('/') || value.includes('\\');
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
