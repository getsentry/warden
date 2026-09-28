import { mkdtempSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { validateMemoryPaths } from './memory-paths.js';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
it('allows source files while confining memory evidence to the checkout', () => {
  const root = mkdtempSync(join(tmpdir(), 'warden-memory-paths-'));
  roots.push(root);
  writeFileSync(join(root, 'guard.ts'), 'authorize();');
  expect(() => validateMemoryPaths(root, ['guard.ts'])).not.toThrow();
  expect(() => validateMemoryPaths(root, ['../outside'])).toThrow();
  symlinkSync('/etc/hosts', join(root, 'outside'));
  expect(() => validateMemoryPaths(root, ['outside'])).toThrow();
});
