import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearSkillsCache,
  getBuiltinSkill,
  getBuiltinSkillNames,
  loadSkillFromFile,
  loadSkillsFromDirectory,
  resolveSkillAsync,
  SkillLoaderError,
} from './loader.js';

describe('built-in skills', () => {
  it('returns security-review skill', async () => {
    const skill = await getBuiltinSkill('security-review');
    expect(skill).toBeDefined();
    expect(skill?.name).toBe('security-review');
  });

  it('returns undefined for unknown skill', async () => {
    const skill = await getBuiltinSkill('unknown-skill');
    expect(skill).toBeUndefined();
  });

  it('lists all built-in skill names', async () => {
    const names = await getBuiltinSkillNames();
    expect(names).toContain('security-review');
  });
});

describe('loadSkillFromFile', () => {
  it('rejects unsupported file types', async () => {
    await expect(loadSkillFromFile('/path/to/skill.json')).rejects.toThrow(SkillLoaderError);
    await expect(loadSkillFromFile('/path/to/skill.json')).rejects.toThrow('Unsupported skill file');
  });

  it('throws for missing files', async () => {
    await expect(loadSkillFromFile('/nonexistent/skill.toml')).rejects.toThrow(SkillLoaderError);
  });
});

describe('resolveSkillAsync', () => {
  it('resolves built-in skills', async () => {
    const skill = await resolveSkillAsync('security-review');
    expect(skill.name).toBe('security-review');
    expect(skill.description).toContain('security');
  });

  it('resolves inline skills from config', async () => {
    const inlineSkill = {
      name: 'custom-inline',
      description: 'A custom skill',
      prompt: 'Do something custom',
    };

    const skill = await resolveSkillAsync('custom-inline', undefined, [inlineSkill]);
    expect(skill).toEqual(inlineSkill);
  });

  it('prioritizes inline skills over built-ins', async () => {
    const overrideSkill = {
      name: 'security-review',
      description: 'Override security review',
      prompt: 'Custom security review',
    };

    const skill = await resolveSkillAsync('security-review', undefined, [overrideSkill]);
    expect(skill.description).toBe('Override security review');
  });

  it('throws for unknown skills', async () => {
    await expect(resolveSkillAsync('nonexistent-skill')).rejects.toThrow(SkillLoaderError);
    await expect(resolveSkillAsync('nonexistent-skill')).rejects.toThrow('Skill not found');
  });
});

describe('security-review skill', () => {
  it('has correct structure', async () => {
    const skill = await getBuiltinSkill('security-review');
    expect(skill).toBeDefined();
    expect(skill!.name).toBe('security-review');
    expect(skill!.description).toContain('security');
    expect(skill!.prompt).toContain('SQL injection');
    expect(skill!.tools?.allowed).toContain('Read');
    expect(skill!.tools?.allowed).toContain('Grep');
  });
});

describe('code-simplifier skill', () => {
  it('has correct structure', async () => {
    const skill = await getBuiltinSkill('code-simplifier');
    expect(skill).toBeDefined();
    expect(skill!.name).toBe('code-simplifier');
    expect(skill!.description).toContain('simplif');
    expect(skill!.prompt).toContain('clarity');
    expect(skill!.tools?.allowed).toContain('Read');
    expect(skill!.tools?.allowed).toContain('Grep');
    expect(skill!.tools?.allowed).toContain('Glob');
  });
});

describe('skills caching', () => {
  const builtinSkillsDir = new URL('../../skills', import.meta.url).pathname;

  beforeEach(() => {
    clearSkillsCache();
  });

  it('caches directory loads', async () => {
    const skills1 = await loadSkillsFromDirectory(builtinSkillsDir);
    expect(skills1.size).toBeGreaterThan(0);

    // Second load should return cached result (same reference)
    const skills2 = await loadSkillsFromDirectory(builtinSkillsDir);
    expect(skills2).toBe(skills1);
  });

  it('clearSkillsCache clears the cache', async () => {
    const skills1 = await loadSkillsFromDirectory(builtinSkillsDir);

    clearSkillsCache();

    const skills2 = await loadSkillsFromDirectory(builtinSkillsDir);
    // After clearing, should be a new Map instance
    expect(skills2).not.toBe(skills1);
  });
});
