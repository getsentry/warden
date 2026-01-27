import { describe, it, expect } from 'vitest';
import {
  getBuiltinSkill,
  getBuiltinSkillNames,
  loadSkillFromFile,
  resolveSkillAsync,
  SkillLoaderError,
} from './loader.js';
import { securityReviewSkill } from './security-review.js';

describe('built-in skills', () => {
  it('returns security-review skill', () => {
    const skill = getBuiltinSkill('security-review');
    expect(skill).toBeDefined();
    expect(skill?.name).toBe('security-review');
  });

  it('returns undefined for unknown skill', () => {
    const skill = getBuiltinSkill('unknown-skill');
    expect(skill).toBeUndefined();
  });

  it('lists all built-in skill names', () => {
    const names = getBuiltinSkillNames();
    expect(names).toContain('security-review');
  });
});

describe('loadSkillFromFile', () => {
  it('rejects non-toml files', async () => {
    await expect(loadSkillFromFile('/path/to/skill.json')).rejects.toThrow(SkillLoaderError);
    await expect(loadSkillFromFile('/path/to/skill.json')).rejects.toThrow('Unsupported skill file extension');
  });

  it('throws for missing files', async () => {
    await expect(loadSkillFromFile('/nonexistent/skill.toml')).rejects.toThrow(SkillLoaderError);
  });
});

describe('resolveSkillAsync', () => {
  it('resolves built-in skills', async () => {
    const skill = await resolveSkillAsync('security-review');
    expect(skill).toEqual(securityReviewSkill);
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
  it('has correct structure', () => {
    expect(securityReviewSkill.name).toBe('security-review');
    expect(securityReviewSkill.description).toContain('security');
    expect(securityReviewSkill.prompt).toContain('SQL injection');
    expect(securityReviewSkill.tools?.allowed).toContain('Read');
    expect(securityReviewSkill.tools?.allowed).toContain('Grep');
    expect(securityReviewSkill.tools?.denied).toContain('Write');
    expect(securityReviewSkill.tools?.denied).toContain('Bash');
  });
});
