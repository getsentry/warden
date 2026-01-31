import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { writeFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  clearSkillsCache,
  loadSkillFromFile,
  loadSkillFromMarkdown,
  loadSkillsFromDirectory,
  resolveSkillAsync,
  resolveSkillPath,
  SkillLoaderError,
  SKILL_DIRECTORIES,
} from './loader.js';

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
  it('resolves skills from conventional directories', async () => {
    const repoRoot = new URL('../..', import.meta.url).pathname;
    const skill = await resolveSkillAsync('testing-guidelines', repoRoot);
    expect(skill.name).toBe('testing-guidelines');
    expect(skill.description).toBeDefined();
  });

  it('throws for unknown skills', async () => {
    await expect(resolveSkillAsync('nonexistent-skill')).rejects.toThrow(SkillLoaderError);
    await expect(resolveSkillAsync('nonexistent-skill')).rejects.toThrow('Skill not found');
  });
});

describe('skills caching', () => {
  const skillsDir = new URL('../../.claude/skills', import.meta.url).pathname;

  beforeEach(() => {
    clearSkillsCache();
  });

  it('caches directory loads', async () => {
    const skills1 = await loadSkillsFromDirectory(skillsDir);
    expect(skills1.size).toBeGreaterThan(0);

    // Second load should return cached result (same reference)
    const skills2 = await loadSkillsFromDirectory(skillsDir);
    expect(skills2).toBe(skills1);
  });

  it('clearSkillsCache clears the cache', async () => {
    const skills1 = await loadSkillsFromDirectory(skillsDir);

    clearSkillsCache();

    const skills2 = await loadSkillsFromDirectory(skillsDir);
    // After clearing, should be a new Map instance
    expect(skills2).not.toBe(skills1);
  });
});

describe('rootDir tracking', () => {
  const skillsDir = new URL('../../.claude/skills', import.meta.url).pathname;

  it('sets rootDir when loading from markdown', async () => {
    const skillPath = join(skillsDir, 'testing-guidelines', 'SKILL.md');
    const skill = await loadSkillFromMarkdown(skillPath);
    expect(skill.rootDir).toBe(join(skillsDir, 'testing-guidelines'));
  });

  it('sets rootDir for skills from conventional directories', async () => {
    const repoRoot = new URL('../..', import.meta.url).pathname;
    const skill = await resolveSkillAsync('testing-guidelines', repoRoot);
    expect(skill).toBeDefined();
    expect(skill.rootDir).toContain('skills');
    expect(skill.rootDir).toContain('testing-guidelines');
  });
});

describe('direct path resolution', () => {
  const skillsDir = new URL('../../.claude/skills', import.meta.url).pathname;

  it('resolves skill from directory path with SKILL.md', async () => {
    const skillDir = join(skillsDir, 'testing-guidelines');
    const skill = await resolveSkillAsync(skillDir);
    expect(skill.name).toBe('testing-guidelines');
    expect(skill.rootDir).toBe(skillDir);
  });

  it('resolves skill from file path', async () => {
    const skillPath = join(skillsDir, 'testing-guidelines', 'SKILL.md');
    const skill = await resolveSkillAsync(skillPath);
    expect(skill.name).toBe('testing-guidelines');
  });

  it('resolves relative path with repoRoot', async () => {
    const repoRoot = new URL('../..', import.meta.url).pathname;
    const skill = await resolveSkillAsync('./.claude/skills/testing-guidelines', repoRoot);
    expect(skill.name).toBe('testing-guidelines');
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
  const skillsDir = new URL('../../.claude/skills', import.meta.url).pathname;

  it('resolves absolute path to skill directory', async () => {
    const absolutePath = join(skillsDir, 'testing-guidelines');
    const skill = await resolveSkillAsync(absolutePath, '/different/repo');
    expect(skill.name).toBe('testing-guidelines');
  });

  it('resolves absolute path to skill file', async () => {
    const absolutePath = join(skillsDir, 'testing-guidelines', 'SKILL.md');
    const skill = await resolveSkillAsync(absolutePath, '/different/repo');
    expect(skill.name).toBe('testing-guidelines');
  });

  it('resolves tilde path to skill directory', async () => {
    // Create a path using ~ that points to the skills dir
    const homeRelativePath = skillsDir.replace(homedir(), '~');
    // Only run this test if the skills dir is under home
    if (homeRelativePath.startsWith('~/')) {
      const skill = await resolveSkillAsync(`${homeRelativePath}/testing-guidelines`, '/different/repo');
      expect(skill.name).toBe('testing-guidelines');
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
    const skillsDir = new URL('../../.claude/skills', import.meta.url).pathname;
    const skillMdPath = join(skillsDir, 'testing-guidelines', 'SKILL.md');
    const skill = await loadSkillFromFile(skillMdPath);
    expect(skill.name).toBe('testing-guidelines');
  });

  it('loadSkillsFromDirectory returns entry paths for tracking', async () => {
    const skillsDir = new URL('../../.claude/skills', import.meta.url).pathname;
    clearSkillsCache();
    const skills = await loadSkillsFromDirectory(skillsDir);

    // Each loaded skill should have an entry field matching the directory name
    const skillWriter = skills.get('testing-guidelines');
    expect(skillWriter).toBeDefined();
    expect(skillWriter!.skill.name).toBe('testing-guidelines');
    expect(skillWriter!.entry).toBe('testing-guidelines');
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
