import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { dirname, join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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
  fetchRemote,
  discoverRemoteSkills,
  discoverRemoteAgents,
  resolveRemoteSkill,
  resolveRemoteAgent,
  GitError,
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
    expect(() => parseRemoteRef('/repo')).toThrow('expected owner/repo format');
  });

  it('throws for missing repo', () => {
    expect(() => parseRemoteRef('owner/')).toThrow(SkillLoaderError);
    expect(() => parseRemoteRef('owner/')).toThrow('expected owner/repo format');
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

  it('throws for path traversal in owner (..)', () => {
    expect(() => parseRemoteRef('../evil')).toThrow(SkillLoaderError);
    expect(() => parseRemoteRef('../evil')).toThrow('invalid characters');
  });

  it('throws for path traversal in repo (..)', () => {
    expect(() => parseRemoteRef('owner/..')).toThrow(SkillLoaderError);
    expect(() => parseRemoteRef('owner/..')).toThrow('invalid characters');
  });

  it('throws for dot-only owner', () => {
    expect(() => parseRemoteRef('./repo')).toThrow(SkillLoaderError);
    expect(() => parseRemoteRef('./repo')).toThrow('invalid characters');
  });

  it('allows valid GitHub names with dots, hyphens, underscores', () => {
    const result = parseRemoteRef('my.org/my_repo-name.js');
    expect(result).toEqual({ owner: 'my.org', repo: 'my_repo-name.js', sha: undefined });
  });

  // GitHub URL support
  it('parses HTTPS GitHub URL', () => {
    const result = parseRemoteRef('https://github.com/getsentry/skills');
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: undefined,
      cloneUrl: 'https://github.com/getsentry/skills',
    });
  });

  it('parses HTTPS GitHub URL with .git suffix', () => {
    const result = parseRemoteRef('https://github.com/getsentry/skills.git');
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: undefined,
      cloneUrl: 'https://github.com/getsentry/skills.git',
    });
  });

  it('parses HTTPS GitHub URL with SHA', () => {
    const result = parseRemoteRef('https://github.com/getsentry/skills@abc123');
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: 'abc123',
      cloneUrl: 'https://github.com/getsentry/skills',
    });
  });

  it('parses HTTPS GitHub URL with .git and SHA', () => {
    const result = parseRemoteRef('https://github.com/getsentry/skills.git@abc123');
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: 'abc123',
      cloneUrl: 'https://github.com/getsentry/skills.git',
    });
  });

  it('parses SSH GitHub URL', () => {
    const result = parseRemoteRef('git@github.com:getsentry/skills.git');
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: undefined,
      cloneUrl: 'git@github.com:getsentry/skills.git',
    });
  });

  it('parses SSH GitHub URL with SHA', () => {
    const result = parseRemoteRef('git@github.com:getsentry/skills.git@abc123');
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: 'abc123',
      cloneUrl: 'git@github.com:getsentry/skills.git',
    });
  });

  it('parses HTTP GitHub URL (upgrades to HTTPS)', () => {
    const result = parseRemoteRef('http://github.com/getsentry/skills');
    expect(result).toEqual({
      owner: 'getsentry',
      repo: 'skills',
      sha: undefined,
      cloneUrl: 'https://github.com/getsentry/skills',
    });
  });

  describe('GitLab sources', () => {
    it('parses GitLab HTTPS URL with single-level path', () => {
      const result = parseRemoteRef('https://gitlab.com/getsentry/skills');
      expect(result).toEqual({
        owner: 'getsentry',
        repo: 'skills',
        sha: undefined,
        cloneUrl: 'https://gitlab.com/getsentry/skills',
      });
    });

    it('parses GitLab HTTPS URL with nested groups', () => {
      const result = parseRemoteRef('https://gitlab.com/group/subgroup/skills');
      expect(result).toEqual({
        owner: 'group/subgroup',
        repo: 'skills',
        sha: undefined,
        cloneUrl: 'https://gitlab.com/group/subgroup/skills',
      });
    });

    it('parses GitLab HTTPS URL with .git and SHA', () => {
      const result = parseRemoteRef('https://gitlab.com/group/skills.git@abc123');
      expect(result).toEqual({
        owner: 'group',
        repo: 'skills',
        sha: 'abc123',
        cloneUrl: 'https://gitlab.com/group/skills.git',
      });
    });

    it('parses GitLab SSH URL', () => {
      const result = parseRemoteRef('git@gitlab.com:group/skills.git');
      expect(result).toEqual({
        owner: 'group',
        repo: 'skills',
        sha: undefined,
        cloneUrl: 'git@gitlab.com:group/skills.git',
      });
    });

    it('rejects GitLab nested-group with dash-prefixed segment (flag injection)', () => {
      expect(() => parseRemoteRef('https://gitlab.com/-evil/sub/repo')).toThrow(SkillLoaderError);
    });
  });

  describe('rejected source types', () => {
    it('rejects path: prefix with --path guidance', () => {
      expect(() => parseRemoteRef('path:./local/skill')).toThrow(SkillLoaderError);
      expect(() => parseRemoteRef('path:./local/skill')).toThrow('use --path for local sources');
    });

    it('rejects bare HTTPS URLs not matching a known git host (well-known)', () => {
      expect(() => parseRemoteRef('https://cli.sentry.dev/skills')).toThrow(SkillLoaderError);
      expect(() => parseRemoteRef('https://cli.sentry.dev/skills')).toThrow(
        'well-known HTTPS sources are not supported',
      );
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

  it('different URL forms of the same unpinned ref share a path', () => {
    const a = getRemotePath('getsentry/skills');
    const b = getRemotePath('https://github.com/getsentry/skills');
    const c = getRemotePath('git@github.com:getsentry/skills.git');
    expect(a).toBe(b);
    expect(a).toBe(c);
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

  it('discovers skills with multi-line YAML description', async () => {
    const remotePath = getRemotePath('test/repo');
    createFileTree(remotePath, {
      'skills/composition-patterns/SKILL.md': `---
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
`,
      'skills/react-best-practices/SKILL.md': skillMd('vercel-react-best-practices', 'React best practices'),
    });

    const skills = await discoverRemoteSkills('test/repo');

    expect(skills.map((s) => s.name).sort()).toEqual(['vercel-composition-patterns', 'vercel-react-best-practices']);
    const compositionSkill = skills.find((s) => s.name === 'vercel-composition-patterns');
    expect(compositionSkill?.description).toContain('React composition patterns that scale');
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

    it('.agents takes precedence when root and skills/ are absent', async () => {
      const remotePath = getRemotePath('test/repo');
      createFileTree(remotePath, {
        '.agents/skills/my-skill/SKILL.md': skillMd('my-skill', 'From .agents'),
        '.claude/skills/my-skill/SKILL.md': skillMd('my-skill', 'From .claude'),
        '.warden/skills/my-skill/SKILL.md': skillMd('my-skill', 'From .warden'),
      });

      const skills = await discoverRemoteSkills('test/repo');

      expect(skills[0]?.description).toBe('From .agents');
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

    it('ignores plugins with path traversal in source', async () => {
      const remotePath = getRemotePath('test/repo');
      createFileTree(remotePath, {
        '.claude-plugin/marketplace.json': marketplaceJson([
          { name: 'malicious', source: '../../..' },
          { name: 'legit', source: './plugins/legit' },
        ]),
        'plugins/legit/skills/good-skill/SKILL.md': skillMd('good-skill', 'Legit skill'),
      });

      const skills = await discoverRemoteSkills('test/repo');

      expect(skills.length).toBe(1);
      expect(skills[0]?.name).toBe('good-skill');
      expect(skills[0]?.pluginName).toBe('legit');
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

/** Standard AGENT.md content for testing */
function agentMd(name: string, description: string): string {
  return `---
name: ${name}
description: ${description}
---
Prompt for ${name}.
`;
}

describe('discoverRemoteAgents', () => {
  let testDir: string;
  const originalEnv = process.env['WARDEN_STATE_DIR'];

  beforeEach(() => {
    testDir = join(tmpdir(), `warden-remote-agent-discover-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
    await expect(discoverRemoteAgents('test/agents')).rejects.toThrow('Remote not cached');
  });

  it('discovers agents at root level', async () => {
    const remotePath = getRemotePath('test/repo');
    createFileTree(remotePath, {
      'agent-a/AGENT.md': agentMd('agent-a', 'Agent A'),
      'agent-b/AGENT.md': agentMd('agent-b', 'Agent B'),
    });

    const agents = await discoverRemoteAgents('test/repo');

    expect(agents.map((a) => a.name).sort()).toEqual(['agent-a', 'agent-b']);
  });

  it('discovers agents in .agents/agents directory', async () => {
    const remotePath = getRemotePath('test/repo');
    createFileTree(remotePath, {
      '.agents/agents/my-agent/AGENT.md': agentMd('my-agent', 'From .agents'),
    });

    const agents = await discoverRemoteAgents('test/repo');

    expect(agents.length).toBe(1);
    expect(agents[0]?.name).toBe('my-agent');
  });

  it('respects precedence: root > agents/ > .agents > .claude > .warden', async () => {
    const remotePath = getRemotePath('test/repo');
    createFileTree(remotePath, {
      'my-agent/AGENT.md': agentMd('my-agent', 'From root'),
      'agents/my-agent/AGENT.md': agentMd('my-agent', 'From agents/'),
      '.agents/agents/my-agent/AGENT.md': agentMd('my-agent', 'From .agents'),
    });

    const agents = await discoverRemoteAgents('test/repo');

    expect(agents.length).toBe(1);
    expect(agents[0]?.description).toBe('From root');
  });

  it('does not pick up SKILL.md files', async () => {
    const remotePath = getRemotePath('test/repo');
    createFileTree(remotePath, {
      'my-skill/SKILL.md': skillMd('my-skill', 'A skill not agent'),
      'my-agent/AGENT.md': agentMd('my-agent', 'An agent'),
    });

    const agents = await discoverRemoteAgents('test/repo');

    expect(agents.length).toBe(1);
    expect(agents[0]?.name).toBe('my-agent');
  });
});

describe('resolveRemoteAgent', () => {
  const testDir2 = join(tmpdir(), `warden-remote-agent-resolve-${Date.now()}`);
  const originalEnv = process.env['WARDEN_STATE_DIR'];

  beforeEach(() => {
    process.env['WARDEN_STATE_DIR'] = testDir2;
    mkdirSync(testDir2, { recursive: true });
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['WARDEN_STATE_DIR'];
    } else {
      process.env['WARDEN_STATE_DIR'] = originalEnv;
    }
    rmSync(testDir2, { recursive: true, force: true });
  });

  it('resolves agent by name', async () => {
    const remotePath = getRemotePath('test/agents');
    createFileTree(remotePath, {
      'agents/my-agent/AGENT.md': agentMd('my-agent', 'My agent description'),
    });

    saveState({
      remotes: {
        'test/agents': {
          sha: 'abc123',
          fetchedAt: new Date().toISOString(),
        },
      },
    });

    const agent = await resolveRemoteAgent('test/agents', 'my-agent', { offline: true });

    expect(agent.name).toBe('my-agent');
    expect(agent.description).toBe('My agent description');
  });

  it('throws helpful error when agent not found', async () => {
    const remotePath = getRemotePath('test/agents');
    createFileTree(remotePath, {
      'agents/existing-agent/AGENT.md': agentMd('existing-agent', 'Existing'),
    });

    saveState({
      remotes: {
        'test/agents': {
          sha: 'abc123',
          fetchedAt: new Date().toISOString(),
        },
      },
    });

    await expect(resolveRemoteAgent('test/agents', 'nonexistent', { offline: true }))
      .rejects.toThrow("Agent 'nonexistent' not found");
    await expect(resolveRemoteAgent('test/agents', 'nonexistent', { offline: true }))
      .rejects.toThrow('Available agents: existing-agent');
  });
});

describe('fetchRemote integration (real git)', () => {
  let testRoot: string;
  let bareRepoPath: string;
  let workTree: string;
  const originalEnv = process.env['WARDEN_STATE_DIR'];

  function git(args: string[], cwd: string): string {
    return execFileSync('git', args, {
      cwd,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_SYSTEM: '/dev/null',
        GIT_AUTHOR_NAME: 'Test',
        GIT_AUTHOR_EMAIL: 'test@example.com',
        GIT_COMMITTER_NAME: 'Test',
        GIT_COMMITTER_EMAIL: 'test@example.com',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString().trim();
  }

  function commitSkill(name: string, description: string, message: string): string {
    writeFileSync(join(workTree, 'SKILL.md'), skillMd(name, description));
    git(['add', '.'], workTree);
    git(['commit', '-m', message], workTree);
    return git(['rev-parse', 'HEAD'], workTree);
  }

  beforeEach(() => {
    testRoot = join(tmpdir(), `warden-fetch-int-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testRoot, { recursive: true });
    process.env['WARDEN_STATE_DIR'] = testRoot;

    workTree = join(testRoot, '_workTree');
    mkdirSync(workTree, { recursive: true });
    git(['init', '--initial-branch=main'], workTree);
    git(['config', 'user.email', 'test@example.com'], workTree);
    git(['config', 'user.name', 'Test'], workTree);
    commitSkill('integ-skill', 'Initial', 'initial');

    bareRepoPath = join(testRoot, '_bareRepo.git');
    execFileSync('git', ['clone', '--bare', workTree, bareRepoPath], { stdio: 'ignore' });
    git(['remote', 'add', 'bare', bareRepoPath], workTree);
    git(['push', 'bare', 'main'], workTree);
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['WARDEN_STATE_DIR'];
    } else {
      process.env['WARDEN_STATE_DIR'] = originalEnv;
    }
    rmSync(testRoot, { recursive: true, force: true });
  });

  function preCloneIntoCache(ref: string): void {
    const cachePath = getRemotePath(ref);
    mkdirSync(dirname(cachePath), { recursive: true });
    execFileSync('git', ['clone', '--depth=1', bareRepoPath, cachePath], { stdio: 'ignore' });
  }

  it('clones a fresh repo from cloneUrl when cache is empty', async () => {
    const ref = 'fixture/integ';
    saveState({
      remotes: {
        [ref]: {
          sha: 'unused-placeholder',
          fetchedAt: new Date().toISOString(),
          cloneUrl: bareRepoPath,
        },
      },
    });
    rmSync(getRemotePath(ref), { recursive: true, force: true });

    const sha = await fetchRemote(ref);

    expect(sha).toMatch(/^[0-9a-f]{40}$/);
    expect(getRemotePath(ref)).toBe(join(testRoot, 'skills', 'fixture', 'integ'));
    expect(readFileSync(join(getRemotePath(ref), 'SKILL.md'), 'utf-8')).toContain('integ-skill');
    const state = loadState();
    expect(state.remotes[ref]?.sha).toBe(sha);
    expect(state.remotes[ref]?.fetchedAt).toBeTruthy();
  });

  it('clones a pinned ref into the @sha cache directory', async () => {
    const headSha = git(['rev-parse', 'HEAD'], workTree);
    const pinnedRef = `fixture/integ@${headSha}`;
    saveState({
      remotes: {
        [pinnedRef]: {
          sha: 'unused-placeholder',
          fetchedAt: new Date().toISOString(),
          cloneUrl: bareRepoPath,
        },
      },
    });
    rmSync(getRemotePath(pinnedRef), { recursive: true, force: true });

    const sha = await fetchRemote(pinnedRef);

    expect(sha).toBe(headSha);
    expect(getRemotePath(pinnedRef)).toBe(join(testRoot, 'skills', 'fixture', `integ@${headSha}`));
    expect(readFileSync(join(getRemotePath(pinnedRef), 'SKILL.md'), 'utf-8')).toContain('integ-skill');
  });

  it('fetches latest commits when TTL is stale and ref is unpinned', async () => {
    const ref = 'fixture/integ';
    preCloneIntoCache(ref);

    const beforeSha = git(['rev-parse', 'HEAD'], getRemotePath(ref));
    const newSha = commitSkill('integ-skill', 'Updated', 'second');
    git(['push', 'bare', 'main'], workTree);
    expect(newSha).not.toBe(beforeSha);

    const stale = new Date(Date.now() - 86400_000 * 7).toISOString();
    saveState({ remotes: { [ref]: { sha: beforeSha, fetchedAt: stale } } });

    const fetchedSha = await fetchRemote(ref);

    expect(fetchedSha).toBe(newSha);
    expect(git(['rev-parse', 'HEAD'], getRemotePath(ref))).toBe(newSha);
    const updated = loadState().remotes[ref];
    expect(updated?.sha).toBe(newSha);
    expect(updated?.fetchedAt).not.toBe(stale);
  });

  it('skips network fetch for unpinned ref while TTL is still fresh', async () => {
    const ref = 'fixture/integ';
    preCloneIntoCache(ref);
    const beforeSha = git(['rev-parse', 'HEAD'], getRemotePath(ref));

    saveState({ remotes: { [ref]: { sha: beforeSha, fetchedAt: new Date().toISOString() } } });

    // Push upstream — TTL is fresh, so this commit must NOT be pulled.
    commitSkill('integ-skill', 'Should not appear', 'newer');
    git(['push', 'bare', 'main'], workTree);

    const result = await fetchRemote(ref);

    expect(result).toBe(beforeSha);
    expect(git(['rev-parse', 'HEAD'], getRemotePath(ref))).toBe(beforeSha);
  });

  it('force=true bypasses TTL gate and re-fetches an unpinned ref', async () => {
    const ref = 'fixture/integ';
    preCloneIntoCache(ref);
    const beforeSha = git(['rev-parse', 'HEAD'], getRemotePath(ref));

    saveState({ remotes: { [ref]: { sha: beforeSha, fetchedAt: new Date().toISOString() } } });

    const newSha = commitSkill('integ-skill', 'Force', 'force-update');
    git(['push', 'bare', 'main'], workTree);

    const result = await fetchRemote(ref, { force: true });

    expect(result).toBe(newSha);
    expect(git(['rev-parse', 'HEAD'], getRemotePath(ref))).toBe(newSha);
  });

  it('uses pinned cache without touching the network when state entry exists', async () => {
    const headSha = git(['rev-parse', 'HEAD'], workTree);
    const pinnedRef = `fixture/integ@${headSha}`;
    const pinnedCachePath = getRemotePath(pinnedRef);
    mkdirSync(dirname(pinnedCachePath), { recursive: true });
    execFileSync('git', ['clone', '--depth=1', bareRepoPath, pinnedCachePath], { stdio: 'ignore' });
    saveState({
      remotes: { [pinnedRef]: { sha: headSha, fetchedAt: new Date().toISOString() } },
    });

    // Push upstream — pinned ref is immutable, must not be influenced.
    commitSkill('integ-skill', 'Should not be visible', 'newer');
    git(['push', 'bare', 'main'], workTree);

    const result = await fetchRemote(pinnedRef);

    expect(result).toBe(headSha);
    expect(git(['rev-parse', 'HEAD'], pinnedCachePath)).toBe(headSha);
  });

  it('preserves cloneUrl across multiple fetch calls', async () => {
    // Stand-in for SSH-form persistence: warden must not silently fall back
    // to https://github.com/... when the user originally specified a
    // non-default URL.
    const ref = 'fixture/integ';
    saveState({
      remotes: {
        [ref]: {
          sha: 'placeholder',
          fetchedAt: new Date(0).toISOString(),
          cloneUrl: bareRepoPath,
        },
      },
    });
    rmSync(getRemotePath(ref), { recursive: true, force: true });

    await fetchRemote(ref);
    await fetchRemote(ref);

    const state = loadState();
    expect(state.remotes[ref]?.cloneUrl).toBe(bareRepoPath);
    expect(state.remotes[ref]?.fetchedAt).toBeTruthy();
  });

  it('offline mode reads cache without invoking git', async () => {
    const ref = 'fixture/integ';
    preCloneIntoCache(ref);
    const headSha = git(['rev-parse', 'HEAD'], getRemotePath(ref));
    saveState({ remotes: { [ref]: { sha: headSha, fetchedAt: new Date().toISOString() } } });

    commitSkill('integ-skill', 'Should not appear', 'upstream');
    git(['push', 'bare', 'main'], workTree);

    const result = await fetchRemote(ref, { offline: true });

    expect(result).toBe(headSha);
    expect(git(['rev-parse', 'HEAD'], getRemotePath(ref))).toBe(headSha);
  });

  it('offline mode throws SkillLoaderError when cache is missing', async () => {
    await expect(fetchRemote('fixture/missing', { offline: true })).rejects.toThrow(SkillLoaderError);
    await expect(fetchRemote('fixture/missing', { offline: true })).rejects.toThrow('Remote skill not cached');
  });
});

describe('GitError contract', () => {
  // Pins the lib's error shape the CLI auth-hint depends on. If lib renames
  // a field or removes the `auth-required` kind, this fails loudly.
  it('exposes the structural fields the CLI depends on', () => {
    const auth = new GitError('auth required', {
      kind: 'auth-required',
      url: 'https://github.com/owner/repo.git',
      sshUrl: 'git@github.com:owner/repo.git',
    });
    expect(auth).toBeInstanceOf(Error);
    expect(auth.details?.kind).toBe('auth-required');
    expect(auth.details?.sshUrl).toBe('git@github.com:owner/repo.git');

    const other = new GitError('clone failed', { kind: 'other', stderr: 'fatal: repository not found' });
    expect(other.details?.kind).toBe('other');
    expect(other.details?.stderr).toContain('repository not found');
  });
});
