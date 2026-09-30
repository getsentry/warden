import { realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

/** Require evidence references to resolve inside the current checkout. */
export function validateMemoryPaths(repoPath: string, paths: readonly string[]): void {
  const root = realpathSync(repoPath);
  for (const source of paths) {
    if (isAbsolute(source) || source.split(/[\\/]/).includes('..')) throw new Error('Invalid memory source');
    const canonical = realpathSync(resolve(root, source));
    const rel = relative(root, canonical);
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel) || !statSync(canonical).isFile()) throw new Error('Invalid memory source');
  }
}
