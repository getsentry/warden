import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getBuildStatePath, resolveSkillBuildStatePath } from './outline.js';

describe('resolveSkillBuildStatePath', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it('prefers build-state.json and falls back to legacy synthesis.json', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'warden-build-state-'));
    tempDirs.push(rootDir);

    expect(resolveSkillBuildStatePath(rootDir)).toBe(join(rootDir, 'synthesis.json'));

    writeFileSync(join(rootDir, 'synthesis.json'), '{}\n', 'utf-8');
    expect(resolveSkillBuildStatePath(rootDir)).toBe(join(rootDir, 'synthesis.json'));

    writeFileSync(getBuildStatePath(rootDir), '{}\n', 'utf-8');
    expect(resolveSkillBuildStatePath(rootDir)).toBe(getBuildStatePath(rootDir));
  });
});
