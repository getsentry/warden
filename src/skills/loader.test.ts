import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { writeFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  clearSkillsCache,
  getBuiltinSkill,
  getBuiltinSkillNames,
  loadSkillFromFile,
  loadSkillFromMarkdown,
  loadSkillsFromDirectory,
  resolveSkillAsync,
  resolveSkillPath,
  SkillLoaderError,
  SKILL_DIRECTORIES,
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
    await expect(loadSkillFromFile('/nonexistent/skill.md')).rejects.toThrow(SkillLoaderError);
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

describe('find-bugs skill', () => {
  it('has correct structure', async () => {
    const skill = await getBuiltinSkill('find-bugs');
    expect(skill).toBeDefined();
    expect(skill!.name).toBe('find-bugs');
    expect(skill!.description).toContain('incorrect behavior');
    expect(skill!.prompt).toContain('correctness');
    expect(skill!.tools?.allowed).toContain('Read');
    expect(skill!.tools?.allowed).toContain('Grep');
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

describe('rootDir tracking', () => {
  const builtinSkillsDir = new URL('../../skills', import.meta.url).pathname;

  it('sets rootDir when loading from markdown', async () => {
    const skillPath = join(builtinSkillsDir, 'security-review', 'SKILL.md');
    const skill = await loadSkillFromMarkdown(skillPath);
    expect(skill.rootDir).toBe(join(builtinSkillsDir, 'security-review'));
  });

  it('sets rootDir for built-in skills', async () => {
    const skill = await getBuiltinSkill('security-review');
    expect(skill).toBeDefined();
    expect(skill!.rootDir).toContain('skills');
    expect(skill!.rootDir).toContain('security-review');
  });

  it('inline skills do not have rootDir', async () => {
    const inlineSkill = {
      name: 'inline-test',
      description: 'Test',
      prompt: 'Test prompt',
    };
    const skill = await resolveSkillAsync('inline-test', undefined, [inlineSkill]);
    expect(skill.rootDir).toBeUndefined();
  });
});

describe('direct path resolution', () => {
  const builtinSkillsDir = new URL('../../skills', import.meta.url).pathname;

  it('resolves skill from directory path with SKILL.md', async () => {
    const skillDir = join(builtinSkillsDir, 'security-review');
    const skill = await resolveSkillAsync(skillDir);
    expect(skill.name).toBe('security-review');
    expect(skill.rootDir).toBe(skillDir);
  });

  it('resolves skill from file path', async () => {
    const skillPath = join(builtinSkillsDir, 'security-review', 'SKILL.md');
    const skill = await resolveSkillAsync(skillPath);
    expect(skill.name).toBe('security-review');
  });

  it('resolves relative path with repoRoot', async () => {
    // Use the repo root (two levels up from skills dir)
    const repoRoot = new URL('../..', import.meta.url).pathname;
    const skill = await resolveSkillAsync('./skills/security-review', repoRoot);
    expect(skill.name).toBe('security-review');
  });

  it('throws for nonexistent path', async () => {
    await expect(resolveSkillAsync('./nonexistent/skill')).rejects.toThrow(SkillLoaderError);
    await expect(resolveSkillAsync('./nonexistent/skill')).rejects.toThrow('Skill not found at path');
  });
});

describe('SKILL_DIRECTORIES', () => {
  it('contains expected directories in order', () => {
    expect(SKILL_DIRECTORIES).toEqual([
      '.warden/skills',
      '.agents/skills',
      '.claude/skills',
    ]);
  });
});

describe('resolveSkillPath', () => {
  it('expands ~ to home directory', () => {
    const result = resolveSkillPath('~/code/skills/my-skill');
    expect(result).toBe(join(homedir(), 'code/skills/my-skill'));
  });

  it('expands lone ~ to home directory', () => {
    const result = resolveSkillPath('~');
    expect(result).toBe(homedir());
  });

  it('preserves absolute paths', () => {
    const absolutePath = '/Users/test/code/skills/my-skill';
    const result = resolveSkillPath(absolutePath, '/some/repo');
    expect(result).toBe(absolutePath);
  });

  it('joins relative paths with repoRoot', () => {
    const result = resolveSkillPath('./skills/my-skill', '/repo/root');
    expect(result).toBe('/repo/root/skills/my-skill');
  });

  it('returns relative path as-is when no repoRoot', () => {
    const result = resolveSkillPath('./skills/my-skill');
    expect(result).toBe('./skills/my-skill');
  });
});

describe('resolveSkillAsync with absolute and tilde paths', () => {
  const builtinSkillsDir = new URL('../../skills', import.meta.url).pathname;

  it('resolves absolute path to skill directory', async () => {
    const absolutePath = join(builtinSkillsDir, 'security-review');
    const skill = await resolveSkillAsync(absolutePath, '/different/repo');
    expect(skill.name).toBe('security-review');
  });

  it('resolves absolute path to skill file', async () => {
    const absolutePath = join(builtinSkillsDir, 'security-review', 'SKILL.md');
    const skill = await resolveSkillAsync(absolutePath, '/different/repo');
    expect(skill.name).toBe('security-review');
  });

  it('resolves tilde path to skill directory', async () => {
    // Create a path using ~ that points to the builtin skills
    const homeRelativePath = builtinSkillsDir.replace(homedir(), '~');
    // Only run this test if the skills dir is under home
    if (homeRelativePath.startsWith('~/')) {
      const skill = await resolveSkillAsync(`${homeRelativePath}/security-review`, '/different/repo');
      expect(skill.name).toBe('security-review');
    }
  });
});

describe('flat markdown skill files', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'warden-test-'));
  const tempSkillPath = join(tempDir, 'my-custom-skill.md');

  // Create a flat .md skill file with non-SKILL.md filename
  writeFileSync(
    tempSkillPath,
    `---
name: my-custom-skill
description: A test skill with custom filename
---

This is the prompt content.
`
  );

  afterAll(() => {
    try {
      unlinkSync(tempSkillPath);
    } catch {
      // ignore cleanup errors
    }
  });

  it('loads flat .md files with any filename (not just SKILL.md)', async () => {
    const skill = await loadSkillFromFile(tempSkillPath);
    expect(skill.name).toBe('my-custom-skill');
    expect(skill.description).toBe('A test skill with custom filename');
    expect(skill.prompt).toBe('This is the prompt content.');
  });

  it('loadSkillFromFile accepts .md extension', async () => {
    // A flat .md file should be loaded using loadSkillFromMarkdown
    // (same as SKILL.md format with frontmatter)
    const builtinSkillsDir = new URL('../../skills', import.meta.url).pathname;
    const skillMdPath = join(builtinSkillsDir, 'security-review', 'SKILL.md');
    const skill = await loadSkillFromFile(skillMdPath);
    expect(skill.name).toBe('security-review');
  });

  it('loadSkillsFromDirectory returns entry paths for tracking', async () => {
    const builtinSkillsDir = new URL('../../skills', import.meta.url).pathname;
    clearSkillsCache();
    const skills = await loadSkillsFromDirectory(builtinSkillsDir);

    // Each loaded skill should have an entry field matching the directory name
    const securityReview = skills.get('security-review');
    expect(securityReview).toBeDefined();
    expect(securityReview!.skill.name).toBe('security-review');
    expect(securityReview!.entry).toBe('security-review');
  });

  it('loadSkillsFromDirectory calls onWarning for malformed skills', async () => {
    const warnings: string[] = [];
    const onWarning = (message: string) => warnings.push(message);

    // Create a temp directory with a malformed skill
    const tempDir = join(import.meta.dirname, '.test-malformed-skills');
    const { mkdirSync, writeFileSync, rmSync } = await import('node:fs');
    try {
      mkdirSync(tempDir, { recursive: true });
      // Create a .md file with frontmatter but missing required name field
      writeFileSync(
        join(tempDir, 'bad-skill.md'),
        `---
description: Missing name field
---
Content here
`
      );

      clearSkillsCache();
      await loadSkillsFromDirectory(tempDir, { onWarning });

      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain('bad-skill.md');
      expect(warnings[0]).toContain("missing 'name'");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('warns when invalid tool names are filtered from allowed-tools', async () => {
    const warnings: string[] = [];
    const onWarning = (message: string) => warnings.push(message);

    // Create a temp directory with a skill containing invalid tool names
    const tempDir = join(import.meta.dirname, '.test-invalid-tools');
    const { mkdirSync, writeFileSync, rmSync } = await import('node:fs');
    try {
      mkdirSync(tempDir, { recursive: true });
      // Create a skill with a mix of valid and invalid tool names
      writeFileSync(
        join(tempDir, 'test-skill.md'),
        `---
name: test-skill
description: A test skill with invalid tools
allowed-tools: Read InvalidTool Grep FakeTool
---
Test prompt content.
`
      );

      clearSkillsCache();
      const skills = await loadSkillsFromDirectory(tempDir, { onWarning });

      // Skill should still load with only valid tools
      const skill = skills.get('test-skill');
      expect(skill).toBeDefined();
      expect(skill!.skill.tools?.allowed).toEqual(['Read', 'Grep']);

      // Should have warnings for each invalid tool
      expect(warnings.length).toBe(2);
      expect(warnings[0]).toContain("Invalid tool name 'InvalidTool'");
      expect(warnings[0]).toContain('ignored');
      expect(warnings[0]).toContain('Valid tools:');
      expect(warnings[1]).toContain("Invalid tool name 'FakeTool'");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
