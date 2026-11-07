import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadSkills } from './shard.js';

function writeSkill(root: string, dir: string, name: string): void {
  mkdirSync(join(root, 'skills', dir), { recursive: true });
  writeFileSync(
    join(root, 'skills', dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: Finds ${name} bugs.\n---\n\nLook for ${name} bugs.\n`,
  );
}

describe('loadSkills', () => {
  let worktree: string;

  beforeEach(() => {
    worktree = mkdtempSync(join(tmpdir(), 'warden-skills-'));
  });

  afterEach(() => {
    rmSync(worktree, { recursive: true, force: true });
  });

  it('loads builtin security-review and wrdn skills from the skills worktree', async () => {
    writeSkill(worktree, 'wrdn-authz', 'wrdn-authz');

    const skills = await loadSkills(['security-review', 'wrdn-authz'], worktree);

    expect([...skills.keys()]).toEqual(['security-review', 'wrdn-authz']);
    expect(skills.get('security-review')?.rootDir).toMatch(/builtin-skills\/security-review$/);
    expect(skills.get('wrdn-authz')?.rootDir).toBe(join(worktree, 'skills', 'wrdn-authz'));
  });

  it('needs no skills checkout for security-review alone', async () => {
    const skills = await loadSkills(['security-review'], undefined);
    expect([...skills.keys()]).toEqual(['security-review']);
  });

  it('fails once with the skill and path when a wrdn skill cannot load', async () => {
    await expect(loadSkills(['wrdn-authz'], undefined)).rejects.toThrow('wrdn-authz needs a getsentry/warden-skills checkout');
    await expect(loadSkills(['wrdn-pii'], worktree)).rejects.toThrow(
      `Could not load wrdn-pii from ${join(worktree, 'skills', 'wrdn-pii')}`,
    );
  });

  it('refuses a directory whose skill has another name', async () => {
    writeSkill(worktree, 'wrdn-pii', 'wrdn-other');
    await expect(loadSkills(['wrdn-pii'], worktree)).rejects.toThrow('loaded wrdn-other');
  });
});
