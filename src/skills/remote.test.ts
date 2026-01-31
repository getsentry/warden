import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { dirname, join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  parseRemoteRef,
  formatRemoteRef,
  getSkillsCacheDir,
  getRemotePath,
  getStatePath,
  loadState,
  saveState,
  getCacheTtlSeconds,
  shouldRefresh,
  discoverRemoteSkills,
  resolveRemoteSkill,
  type RemoteState,
} from './remote.js';
import { SkillLoaderError } from './loader.js';

/** Standard SKILL.md content for testing */
function skillMd(name: string, description: string): string {
  return `---
name: ${name}
description: ${description}
---
Prompt for ${name}.
`;
}

/**
 * Create a file tree from a declarative structure.
 * Keys are relative paths, values are file contents.
 */
function createFileTree(basePath: string, files: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(basePath, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }
}

describe('parseRemoteRef', () => {
  it('parses owner/repo format', () => {
    const result = parseRemoteRef('getsentry/skills');
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: undefined,
    });
  });

  it('parses owner/repo@sha format', () => {
    const result = parseRemoteRef('getsentry/skills@abc123def');
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: 'abc123def',
    });
  });

  it('handles full commit SHA', () => {
    const fullSha = 'abc123def456789012345678901234567890abcd';
    const result = parseRemoteRef(`getsentry/skills@${fullSha}`);
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: fullSha,
    });
  });

  it('throws for missing owner', () => {
    expect(() => parseRemoteRef('/repo')).toThrow(SkillLoaderError);
    expect(() => parseRemoteRef('/repo')).toThrow('empty owner or repo');
  });

  it('throws for missing repo', () => {
    expect(() => parseRemoteRef('owner/')).toThrow(SkillLoaderError);
    expect(() => parseRemoteRef('owner/')).toThrow('empty owner or repo');
  });

  it('throws for missing slash', () => {
    expect(() => parseRemoteRef('noslash')).toThrow(SkillLoaderError);
    expect(() => parseRemoteRef('noslash')).toThrow('expected owner/repo format');
  });

  it('throws for empty SHA after @', () => {
    expect(() => parseRemoteRef('owner/repo@')).toThrow(SkillLoaderError);
    expect(() => parseRemoteRef('owner/repo@')).toThrow('empty SHA after @');
  });

  it('throws for nested paths in repo', () => {
    expect(() => parseRemoteRef('owner/repo/nested')).toThrow(SkillLoaderError);
    expect(() => parseRemoteRef('owner/repo/nested')).toThrow('repo name cannot contain /');
  });

  it('throws for owner starting with dash (flag injection)', () => {
    expect(() => parseRemoteRef('-malicious/repo')).toThrow(SkillLoaderError);
    expect(() => parseRemoteRef('-malicious/repo')).toThrow('owner cannot start with -');
  });

  it('throws for repo starting with dash (flag injection)', () => {
    expect(() => parseRemoteRef('owner/-malicious')).toThrow(SkillLoaderError);
    expect(() => parseRemoteRef('owner/-malicious')).toThrow('repo cannot start with -');
  });

  it('throws for SHA starting with dash (flag injection)', () => {
    expect(() => parseRemoteRef('owner/repo@--upload-pack=evil')).toThrow(SkillLoaderError);
    expect(() => parseRemoteRef('owner/repo@--upload-pack=evil')).toThrow('SHA cannot start with -');
  });

  // GitHub URL support
  it('parses HTTPS GitHub URL', () => {
    const result = parseRemoteRef('https://github.com/getsentry/skills');
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: undefined,
    });
  });

  it('parses HTTPS GitHub URL with .git suffix', () => {
    const result = parseRemoteRef('https://github.com/getsentry/skills.git');
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: undefined,
    });
  });

  it('parses HTTPS GitHub URL with SHA', () => {
    const result = parseRemoteRef('https://github.com/getsentry/skills@abc123');
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: 'abc123',
    });
  });

  it('parses HTTPS GitHub URL with .git and SHA', () => {
    const result = parseRemoteRef('https://github.com/getsentry/skills.git@abc123');
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: 'abc123',
    });
  });

  it('parses SSH GitHub URL', () => {
    const result = parseRemoteRef('git@github.com:getsentry/skills.git');
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: undefined,
    });
  });

  it('parses SSH GitHub URL with SHA', () => {
    const result = parseRemoteRef('git@github.com:getsentry/skills.git@abc123');
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: 'abc123',
    });
  });

  it('parses HTTP GitHub URL (upgrades to HTTPS)', () => {
    const result = parseRemoteRef('http://github.com/getsentry/skills');
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: undefined,
    });
  });
});

describe('formatRemoteRef', () => {
  it('formats unpinned ref', () => {
    const result = formatRemoteRef({ owner: 'getsentry', repo: 'skills' });
    expect(result).toBe('getsentry/skills');
  });

  it('formats pinned ref', () => {
    const result = formatRemoteRef({ owner: 'getsentry', repo: 'skills', sha: 'abc123' });
    expect(result).toBe('getsentry/skills@abc123');
  });
});

describe('getSkillsCacheDir', () => {
  const originalEnv = process.env['WARDEN_STATE_DIR'];

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['WARDEN_STATE_DIR'];
    } else {
      process.env['WARDEN_STATE_DIR'] = originalEnv;
    }
  });

  it('returns default path when WARDEN_STATE_DIR not set', () => {
    delete process.env['WARDEN_STATE_DIR'];
    const result = getSkillsCacheDir();
    expect(result).toContain('.local');
    expect(result).toContain('warden');
    expect(result).toContain('skills');
  });

  it('respects WARDEN_STATE_DIR', () => {
    process.env['WARDEN_STATE_DIR'] = '/custom/state';
    const result = getSkillsCacheDir();
    expect(result).toBe('/custom/state/skills');
  });
});

describe('getRemotePath', () => {
  const originalEnv = process.env['WARDEN_STATE_DIR'];

  beforeEach(() => {
    process.env['WARDEN_STATE_DIR'] = '/test/state';
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['WARDEN_STATE_DIR'];
    } else {
      process.env['WARDEN_STATE_DIR'] = originalEnv;
    }
  });

  it('returns path for unpinned ref', () => {
    const result = getRemotePath('getsentry/skills');
    expect(result).toBe('/test/state/skills/getsentry/skills');
  });

  it('returns path for pinned ref', () => {
    const result = getRemotePath('getsentry/skills@abc123');
    expect(result).toBe('/test/state/skills/getsentry/skills@abc123');
  });
});

describe('state management', () => {
  const testDir = join(tmpdir(), `warden-remote-test-${Date.now()}`);
  const originalEnv = process.env['WARDEN_STATE_DIR'];

  beforeEach(() => {
    process.env['WARDEN_STATE_DIR'] = testDir;
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['WARDEN_STATE_DIR'];
    } else {
      process.env['WARDEN_STATE_DIR'] = originalEnv;
    }
    rmSync(testDir, { recursive: true, force: true });
  });

  it('loadState returns empty state when file does not exist', () => {
    const state = loadState();
    expect(state).toEqual({ remotes: {} });
  });

  it('saveState creates state file', () => {
    const state: RemoteState = {
      remotes: {
        'getsentry/skills': {
          sha: 'abc123',
          fetchedAt: new Date().toISOString(),
        },
      },
    };

    saveState(state);

    const loaded = loadState();
    expect(loaded.remotes['getsentry/skills']?.sha).toBe('abc123');
  });

  it('saveState updates existing state', () => {
    const state1: RemoteState = {
      remotes: {
        'getsentry/skills': {
          sha: 'abc123',
          fetchedAt: new Date().toISOString(),
        },
      },
    };
    saveState(state1);

    const state2: RemoteState = {
      remotes: {
        'getsentry/skills': {
          sha: 'def456',
          fetchedAt: new Date().toISOString(),
        },
        'other/repo': {
          sha: 'ghi789',
          fetchedAt: new Date().toISOString(),
        },
      },
    };
    saveState(state2);

    const loaded = loadState();
    expect(loaded.remotes['getsentry/skills']?.sha).toBe('def456');
    expect(loaded.remotes['other/repo']?.sha).toBe('ghi789');
  });

  it('loadState handles corrupted state file gracefully', () => {
    const statePath = getStatePath();
    mkdirSync(join(testDir, 'skills'), { recursive: true });
    writeFileSync(statePath, 'invalid json {{{', 'utf-8');

    // Should return empty state without throwing
    const state = loadState();
    expect(state).toEqual({ remotes: {} });
  });
});

describe('getCacheTtlSeconds', () => {
  const originalEnv = process.env['WARDEN_SKILL_CACHE_TTL'];

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['WARDEN_SKILL_CACHE_TTL'];
    } else {
      process.env['WARDEN_SKILL_CACHE_TTL'] = originalEnv;
    }
  });

  it('returns default 24 hours when not set', () => {
    delete process.env['WARDEN_SKILL_CACHE_TTL'];
    expect(getCacheTtlSeconds()).toBe(86400);
  });

  it('respects WARDEN_SKILL_CACHE_TTL', () => {
    process.env['WARDEN_SKILL_CACHE_TTL'] = '3600';
    expect(getCacheTtlSeconds()).toBe(3600);
  });

  it('ignores invalid TTL values', () => {
    process.env['WARDEN_SKILL_CACHE_TTL'] = 'invalid';
    expect(getCacheTtlSeconds()).toBe(86400);

    process.env['WARDEN_SKILL_CACHE_TTL'] = '-100';
    expect(getCacheTtlSeconds()).toBe(86400);

    process.env['WARDEN_SKILL_CACHE_TTL'] = '0';
    expect(getCacheTtlSeconds()).toBe(86400);
  });
});

describe('shouldRefresh', () => {
  const originalEnv = process.env['WARDEN_SKILL_CACHE_TTL'];

  beforeEach(() => {
    // Set short TTL for testing
    process.env['WARDEN_SKILL_CACHE_TTL'] = '60';
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['WARDEN_SKILL_CACHE_TTL'];
    } else {
      process.env['WARDEN_SKILL_CACHE_TTL'] = originalEnv;
    }
  });

  it('returns true when ref is not cached', () => {
    const state: RemoteState = { remotes: {} };
    expect(shouldRefresh('getsentry/skills', state)).toBe(true);
  });

  it('returns false for pinned refs', () => {
    const state: RemoteState = { remotes: {} };
    // Even if not cached, pinned refs never need refresh
    expect(shouldRefresh('getsentry/skills@abc123', state)).toBe(false);
  });

  it('returns false when cache is fresh', () => {
    const state: RemoteState = {
      remotes: {
        'getsentry/skills': {
          sha: 'abc123',
          fetchedAt: new Date().toISOString(), // Just now
        },
      },
    };
    expect(shouldRefresh('getsentry/skills', state)).toBe(false);
  });

  it('returns true when cache is stale', () => {
    const staleTime = new Date(Date.now() - 120000); // 2 minutes ago (TTL is 60 seconds)
    const state: RemoteState = {
      remotes: {
        'getsentry/skills': {
          sha: 'abc123',
          fetchedAt: staleTime.toISOString(),
        },
      },
    };
    expect(shouldRefresh('getsentry/skills', state)).toBe(true);
  });
});

describe('discoverRemoteSkills', () => {
  let testDir: string;
  const originalEnv = process.env['WARDEN_STATE_DIR'];

  beforeEach(() => {
    testDir = join(tmpdir(), `warden-remote-discover-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    process.env['WARDEN_STATE_DIR'] = testDir;
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['WARDEN_STATE_DIR'];
    } else {
      process.env['WARDEN_STATE_DIR'] = originalEnv;
    }
    rmSync(testDir, { recursive: true, force: true });
  });

  it('throws when remote is not cached', async () => {
    await expect(discoverRemoteSkills('getsentry/skills')).rejects.toThrow('Remote not cached');
  });

  it('discovers skills at root level', async () => {
    const remotePath = getRemotePath('test/repo');
    createFileTree(remotePath, {
      'skill-a/SKILL.md': skillMd('skill-a', 'Skill A'),
      'skill-b/SKILL.md': skillMd('skill-b', 'Skill B'),
    });

    const skills = await discoverRemoteSkills('test/repo');

    expect(skills.map((s) => s.name).sort()).toEqual(['skill-a', 'skill-b']);
  });

  it('skips directories without SKILL.md and hidden directories', async () => {
    const remotePath = getRemotePath('test/repo');
    createFileTree(remotePath, {
      'valid-skill/SKILL.md': skillMd('valid', 'Valid skill'),
      'empty-dir/README.md': '# Empty',
      '.git/config': '# Git config',
    });

    const skills = await discoverRemoteSkills('test/repo');

    expect(skills.length).toBe(1);
    expect(skills[0]?.name).toBe('valid');
  });

  it('skips invalid SKILL.md files', async () => {
    const remotePath = getRemotePath('test/repo');
    createFileTree(remotePath, {
      'valid/SKILL.md': skillMd('valid', 'Valid skill'),
      'invalid/SKILL.md': '---\ndescription: Missing name\n---\nPrompt.',
    });

    const skills = await discoverRemoteSkills('test/repo');

    expect(skills.length).toBe(1);
    expect(skills[0]?.name).toBe('valid');
  });

  // Test all 5 discovery directories with precedence
  describe('directory discovery', () => {
    const directories = [
      { path: '', label: 'root' },
      { path: 'skills', label: 'skills/' },
      { path: '.warden/skills', label: '.warden/skills' },
      { path: '.agents/skills', label: '.agents/skills' },
      { path: '.claude/skills', label: '.claude/skills' },
    ];

    it.each(directories)('discovers skills in $label directory', async ({ path }) => {
      const remotePath = getRemotePath('test/repo');
      const skillDir = path ? `${path}/my-skill` : 'my-skill';
      createFileTree(remotePath, {
        [`${skillDir}/SKILL.md`]: skillMd('my-skill', `From ${path || 'root'}`),
      });

      const skills = await discoverRemoteSkills('test/repo');

      expect(skills.length).toBe(1);
      expect(skills[0]?.name).toBe('my-skill');
      expect(skills[0]?.path).toBe(join(remotePath, skillDir));
    });

    it('respects precedence order: root > skills/ > .warden > .agents > .claude', async () => {
      const remotePath = getRemotePath('test/repo');
      createFileTree(remotePath, {
        'my-skill/SKILL.md': skillMd('my-skill', 'From root'),
        'skills/my-skill/SKILL.md': skillMd('my-skill', 'From skills/'),
        '.warden/skills/my-skill/SKILL.md': skillMd('my-skill', 'From .warden'),
        '.agents/skills/my-skill/SKILL.md': skillMd('my-skill', 'From .agents'),
        '.claude/skills/my-skill/SKILL.md': skillMd('my-skill', 'From .claude'),
      });

      const skills = await discoverRemoteSkills('test/repo');

      expect(skills.length).toBe(1);
      expect(skills[0]?.description).toBe('From root');
      expect(skills[0]?.path).toBe(join(remotePath, 'my-skill'));
    });

    it('.warden takes precedence when root and skills/ are absent', async () => {
      const remotePath = getRemotePath('test/repo');
      createFileTree(remotePath, {
        '.warden/skills/my-skill/SKILL.md': skillMd('my-skill', 'From .warden'),
        '.agents/skills/my-skill/SKILL.md': skillMd('my-skill', 'From .agents'),
        '.claude/skills/my-skill/SKILL.md': skillMd('my-skill', 'From .claude'),
      });

      const skills = await discoverRemoteSkills('test/repo');

      expect(skills[0]?.description).toBe('From .warden');
    });
  });

  // Marketplace format tests
  describe('marketplace format', () => {
    function marketplaceJson(plugins: { name: string; source: string }[]): string {
      return JSON.stringify({ name: 'test', plugins });
    }

    it('discovers skills from marketplace.json plugins', async () => {
      const remotePath = getRemotePath('test/repo');
      createFileTree(remotePath, {
        '.claude-plugin/marketplace.json': marketplaceJson([
          { name: 'my-plugin', source: './plugins/my-plugin' },
        ]),
        'plugins/my-plugin/skills/commit/SKILL.md': skillMd('commit', 'Commit skill'),
        'plugins/my-plugin/skills/review/SKILL.md': skillMd('review', 'Review skill'),
      });

      const skills = await discoverRemoteSkills('test/repo');

      expect(skills.map((s) => s.name).sort()).toEqual(['commit', 'review']);
      expect(skills.every((s) => s.pluginName === 'my-plugin')).toBe(true);
    });

    it('ignores traditional directories when marketplace.json exists', async () => {
      const remotePath = getRemotePath('test/repo');
      createFileTree(remotePath, {
        '.claude-plugin/marketplace.json': marketplaceJson([
          { name: 'plugin', source: './plugins/p' },
        ]),
        'plugins/p/skills/marketplace-skill/SKILL.md': skillMd('marketplace-skill', 'From marketplace'),
        'root-skill/SKILL.md': skillMd('root-skill', 'From root'),
      });

      const skills = await discoverRemoteSkills('test/repo');

      expect(skills.length).toBe(1);
      expect(skills[0]?.name).toBe('marketplace-skill');
    });

    it('handles multiple plugins', async () => {
      const remotePath = getRemotePath('test/repo');
      createFileTree(remotePath, {
        '.claude-plugin/marketplace.json': marketplaceJson([
          { name: 'plugin-a', source: './plugins/a' },
          { name: 'plugin-b', source: './plugins/b' },
        ]),
        'plugins/a/skills/skill-a/SKILL.md': skillMd('skill-a', 'From A'),
        'plugins/b/skills/skill-b/SKILL.md': skillMd('skill-b', 'From B'),
      });

      const skills = await discoverRemoteSkills('test/repo');

      expect(skills.find((s) => s.name === 'skill-a')?.pluginName).toBe('plugin-a');
      expect(skills.find((s) => s.name === 'skill-b')?.pluginName).toBe('plugin-b');
    });

    it('first plugin wins for duplicate skill names', async () => {
      const remotePath = getRemotePath('test/repo');
      createFileTree(remotePath, {
        '.claude-plugin/marketplace.json': marketplaceJson([
          { name: 'plugin-a', source: './plugins/a' },
          { name: 'plugin-b', source: './plugins/b' },
        ]),
        'plugins/a/skills/shared/SKILL.md': skillMd('shared', 'From A'),
        'plugins/b/skills/shared/SKILL.md': skillMd('shared', 'From B'),
      });

      const skills = await discoverRemoteSkills('test/repo');

      expect(skills.length).toBe(1);
      expect(skills[0]?.description).toBe('From A');
      expect(skills[0]?.pluginName).toBe('plugin-a');
    });

    it('returns correct path for marketplace skills', async () => {
      const remotePath = getRemotePath('test/repo');
      createFileTree(remotePath, {
        '.claude-plugin/marketplace.json': marketplaceJson([
          { name: 'plugin', source: './plugins/p' },
        ]),
        'plugins/p/skills/my-skill/SKILL.md': skillMd('my-skill', 'Test'),
      });

      const skills = await discoverRemoteSkills('test/repo');

      expect(skills[0]?.path).toBe(join(remotePath, 'plugins', 'p', 'skills', 'my-skill'));
    });

    it('falls back to traditional when marketplace.json is invalid', async () => {
      const remotePath = getRemotePath('test/repo');
      createFileTree(remotePath, {
        '.claude-plugin/marketplace.json': 'invalid json {{{',
        'my-skill/SKILL.md': skillMd('my-skill', 'Traditional'),
      });

      const skills = await discoverRemoteSkills('test/repo');

      expect(skills[0]?.name).toBe('my-skill');
      expect(skills[0]?.pluginName).toBeUndefined();
    });
  });
});

describe('resolveRemoteSkill', () => {
  const testDir = join(tmpdir(), `warden-remote-resolve-${Date.now()}`);
  const originalEnv = process.env['WARDEN_STATE_DIR'];

  beforeEach(() => {
    process.env['WARDEN_STATE_DIR'] = testDir;
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['WARDEN_STATE_DIR'];
    } else {
      process.env['WARDEN_STATE_DIR'] = originalEnv;
    }
    rmSync(testDir, { recursive: true, force: true });
  });

  it('resolves skill when directory name differs from skill name', async () => {
    // Simulate vercel-labs/agent-skills structure: directory is "react-best-practices"
    // but skill name in SKILL.md is "vercel-react-best-practices"
    const remotePath = getRemotePath('vercel/skills');
    mkdirSync(join(remotePath, 'skills', 'react-best-practices'), { recursive: true });

    writeFileSync(
      join(remotePath, 'skills', 'react-best-practices', 'SKILL.md'),
      `---
name: vercel-react-best-practices
description: React best practices from Vercel
---
React review prompt.
`
    );

    // Create state entry so fetchRemote doesn't try to clone
    saveState({
      remotes: {
        'vercel/skills': {
          sha: 'abc123',
          fetchedAt: new Date().toISOString(),
        },
      },
    });

    const skill = await resolveRemoteSkill('vercel/skills', 'vercel-react-best-practices', { offline: true });

    expect(skill.name).toBe('vercel-react-best-practices');
    expect(skill.description).toBe('React best practices from Vercel');
  });

  it('throws helpful error when skill not found', async () => {
    const remotePath = getRemotePath('getsentry/skills');
    mkdirSync(join(remotePath, 'security-review'), { recursive: true });

    writeFileSync(
      join(remotePath, 'security-review', 'SKILL.md'),
      `---
name: security-review
description: Security review skill
---
Prompt.
`
    );

    saveState({
      remotes: {
        'getsentry/skills': {
          sha: 'abc123',
          fetchedAt: new Date().toISOString(),
        },
      },
    });

    await expect(resolveRemoteSkill('getsentry/skills', 'nonexistent', { offline: true }))
      .rejects.toThrow("Skill 'nonexistent' not found");
    await expect(resolveRemoteSkill('getsentry/skills', 'nonexistent', { offline: true }))
      .rejects.toThrow('Available skills: security-review');
  });
});
