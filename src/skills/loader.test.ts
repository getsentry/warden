import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { writeFileSync, unlinkSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  clearSkillsCache,
  discoverAllAgents,
  loadSkillFromFile,
  loadSkillFromMarkdown,
  loadSkillsFromDirectory,
  resolveAgentAsync,
  resolveSkillAsync,
  resolveSkillPath,
  SkillLoaderError,
  SKILL_DIRECTORIES,
  AGENT_DIRECTORIES,
  AGENT_MARKER_FILE,
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
      '.agents/skills',
      '.claude/skills',
      '.warden/skills',
    ]);
  });
});

describe('AGENT_DIRECTORIES', () => {
  it('contains expected directories in order', () => {
    expect(AGENT_DIRECTORIES).toEqual([
      '.agents/agents',
      '.claude/agents',
      '.warden/agents',
    ]);
  });

  it('AGENT_MARKER_FILE is AGENT.md', () => {
    expect(AGENT_MARKER_FILE).toBe('AGENT.md');
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

describe('multi-line YAML scalar values', () => {
  it('parses multi-line description (block scalar style)', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-multiline-'));
    const skillPath = join(tempDir, 'SKILL.md');

    writeFileSync(
      skillPath,
      `---
name: my-skill
description:
  This is a multi-line description that spans
  multiple indented lines in YAML format.
license: MIT
---

Prompt content here.
`
    );

    try {
      const skill = await loadSkillFromMarkdown(skillPath);
      expect(skill.name).toBe('my-skill');
      expect(skill.description).toBe(
        'This is a multi-line description that spans multiple indented lines in YAML format.'
      );
      expect(skill.prompt).toBe('Prompt content here.');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('parses multi-line description followed by metadata block', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-multiline-meta-'));
    const skillPath = join(tempDir, 'SKILL.md');

    writeFileSync(
      skillPath,
      `---
name: vercel-composition-patterns
description:
  React composition patterns that scale. Use when refactoring components with
  boolean prop proliferation, building flexible component libraries, or
  designing reusable APIs.
license: MIT
metadata:
  author: vercel
  version: '1.0.0'
---

# React Composition Patterns
`
    );

    try {
      const skill = await loadSkillFromMarkdown(skillPath);
      expect(skill.name).toBe('vercel-composition-patterns');
      expect(skill.description).toContain('React composition patterns that scale');
      expect(skill.description).toContain('designing reusable APIs.');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('handles single-line description normally', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'warden-singleline-'));
    const skillPath = join(tempDir, 'SKILL.md');

    writeFileSync(
      skillPath,
      `---
name: simple-skill
description: A simple one-line description
---

Prompt.
`
    );

    try {
      const skill = await loadSkillFromMarkdown(skillPath);
      expect(skill.name).toBe('simple-skill');
      expect(skill.description).toBe('A simple one-line description');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
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
    const tempDir2 = join(import.meta.dirname, '.test-invalid-tools');
    try {
      mkdirSync(tempDir2, { recursive: true });
      // Create a skill with a mix of valid and invalid tool names
      writeFileSync(
        join(tempDir2, 'test-skill.md'),
        `---
name: test-skill
description: A test skill with invalid tools
allowed-tools: Read InvalidTool Grep FakeTool
---
Test prompt content.
`
      );

      clearSkillsCache();
      const skills = await loadSkillsFromDirectory(tempDir2, { onWarning });

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
      rmSync(tempDir2, { recursive: true, force: true });
    }
  });
});

describe('loadSkillsFromDirectory with markerFile', () => {
  it('uses AGENT.md as marker file when specified', async () => {
    const agentDir = mkdtempSync(join(tmpdir(), 'warden-agent-test-'));
    try {
      // Create a directory-format agent with AGENT.md
      mkdirSync(join(agentDir, 'my-agent'), { recursive: true });
      writeFileSync(
        join(agentDir, 'my-agent', 'AGENT.md'),
        `---
name: my-agent
description: A test agent
---
Agent prompt content.
`
      );

      clearSkillsCache();
      const agents = await loadSkillsFromDirectory(agentDir, { markerFile: 'AGENT.md' });

      expect(agents.size).toBe(1);
      const agent = agents.get('my-agent');
      expect(agent).toBeDefined();
      expect(agent!.skill.name).toBe('my-agent');
      expect(agent!.skill.prompt).toBe('Agent prompt content.');
    } finally {
      rmSync(agentDir, { recursive: true, force: true });
    }
  });

  it('ignores SKILL.md when markerFile is AGENT.md', async () => {
    const mixedDir = mkdtempSync(join(tmpdir(), 'warden-mixed-test-'));
    try {
      // Create a directory with SKILL.md (should be ignored)
      mkdirSync(join(mixedDir, 'my-skill'), { recursive: true });
      writeFileSync(
        join(mixedDir, 'my-skill', 'SKILL.md'),
        `---
name: my-skill
description: A skill not an agent
---
Skill prompt.
`
      );

      // Create a directory with AGENT.md (should be found)
      mkdirSync(join(mixedDir, 'my-agent'), { recursive: true });
      writeFileSync(
        join(mixedDir, 'my-agent', 'AGENT.md'),
        `---
name: my-agent
description: An agent
---
Agent prompt.
`
      );

      clearSkillsCache();
      const agents = await loadSkillsFromDirectory(mixedDir, { markerFile: 'AGENT.md' });

      expect(agents.size).toBe(1);
      expect(agents.has('my-agent')).toBe(true);
      expect(agents.has('my-skill')).toBe(false);
    } finally {
      rmSync(mixedDir, { recursive: true, force: true });
    }
  });

  it('caches separately for different markerFiles', async () => {
    const cacheDir = mkdtempSync(join(tmpdir(), 'warden-cache-test-'));
    try {
      mkdirSync(join(cacheDir, 'entry'), { recursive: true });
      writeFileSync(
        join(cacheDir, 'entry', 'SKILL.md'),
        `---
name: a-skill
description: Skill
---
Prompt.
`
      );
      writeFileSync(
        join(cacheDir, 'entry', 'AGENT.md'),
        `---
name: an-agent
description: Agent
---
Prompt.
`
      );

      clearSkillsCache();
      const skills = await loadSkillsFromDirectory(cacheDir);
      const agents = await loadSkillsFromDirectory(cacheDir, { markerFile: 'AGENT.md' });

      expect(skills.has('a-skill')).toBe(true);
      expect(agents.has('an-agent')).toBe(true);
      // They should be different Map instances (different cache keys)
      expect(skills).not.toBe(agents);
    } finally {
      rmSync(cacheDir, { recursive: true, force: true });
    }
  });
});

describe('discoverAllAgents', () => {
  it('discovers agents from .agents/agents directory', async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'warden-discover-agents-'));
    try {
      mkdirSync(join(repoRoot, '.agents', 'agents', 'my-agent'), { recursive: true });
      writeFileSync(
        join(repoRoot, '.agents', 'agents', 'my-agent', 'AGENT.md'),
        `---
name: my-agent
description: Test agent
---
Agent prompt.
`
      );

      clearSkillsCache();
      const agents = await discoverAllAgents(repoRoot);

      expect(agents.size).toBe(1);
      const agent = agents.get('my-agent');
      expect(agent).toBeDefined();
      expect(agent!.skill.name).toBe('my-agent');
      expect(agent!.directory).toBe('./.agents/agents');
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('returns empty map when no repoRoot', async () => {
    const agents = await discoverAllAgents();
    expect(agents.size).toBe(0);
  });
});

describe('resolveAgentAsync', () => {
  it('resolves agent by name from conventional directories', async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'warden-resolve-agent-'));
    try {
      mkdirSync(join(repoRoot, '.agents', 'agents', 'test-agent'), { recursive: true });
      writeFileSync(
        join(repoRoot, '.agents', 'agents', 'test-agent', 'AGENT.md'),
        `---
name: test-agent
description: A test agent
---
Agent instructions.
`
      );

      clearSkillsCache();
      const agent = await resolveAgentAsync('test-agent', repoRoot);

      expect(agent.name).toBe('test-agent');
      expect(agent.description).toBe('A test agent');
      expect(agent.prompt).toBe('Agent instructions.');
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('throws for unknown agents', async () => {
    await expect(resolveAgentAsync('nonexistent-agent')).rejects.toThrow(SkillLoaderError);
    await expect(resolveAgentAsync('nonexistent-agent')).rejects.toThrow('Agent not found');
  });

  it('resolves agent from direct path', async () => {
    const agentDir = mkdtempSync(join(tmpdir(), 'warden-agent-path-'));
    try {
      writeFileSync(
        join(agentDir, 'AGENT.md'),
        `---
name: path-agent
description: Agent from path
---
Path agent prompt.
`
      );

      const agent = await resolveAgentAsync(agentDir);
      expect(agent.name).toBe('path-agent');
    } finally {
      rmSync(agentDir, { recursive: true, force: true });
    }
  });
});
