import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
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
  type RemoteState,
} from './remote.js';
import { SkillLoaderError } from './loader.js';

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
  const testDir = join(tmpdir(), `warden-remote-discover-${Date.now()}`);
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

  it('throws when remote is not cached', async () => {
    await expect(discoverRemoteSkills('getsentry/skills')).rejects.toThrow(SkillLoaderError);
    await expect(discoverRemoteSkills('getsentry/skills')).rejects.toThrow('Remote not cached');
  });

  it('discovers skills in cached remote', async () => {
    // Create fake cached remote with skills
    const remotePath = getRemotePath('getsentry/skills');
    mkdirSync(join(remotePath, 'security-review'), { recursive: true });
    mkdirSync(join(remotePath, 'code-review'), { recursive: true });

    writeFileSync(
      join(remotePath, 'security-review', 'SKILL.md'),
      `---
name: security-review
description: Review code for security issues
---
Security review prompt.
`
    );

    writeFileSync(
      join(remotePath, 'code-review', 'SKILL.md'),
      `---
name: code-review
description: General code review
---
Code review prompt.
`
    );

    const skills = await discoverRemoteSkills('getsentry/skills');

    expect(skills.length).toBe(2);
    expect(skills.map((s) => s.name).sort()).toEqual(['code-review', 'security-review']);
  });

  it('skips directories without SKILL.md', async () => {
    const remotePath = getRemotePath('getsentry/skills');
    mkdirSync(join(remotePath, 'valid-skill'), { recursive: true });
    mkdirSync(join(remotePath, 'empty-dir'), { recursive: true });
    mkdirSync(join(remotePath, '.git'), { recursive: true }); // Hidden dir

    writeFileSync(
      join(remotePath, 'valid-skill', 'SKILL.md'),
      `---
name: valid-skill
description: A valid skill
---
Prompt.
`
    );

    writeFileSync(join(remotePath, 'empty-dir', 'README.md'), '# Empty');
    writeFileSync(join(remotePath, '.git', 'config'), '# Git config');

    const skills = await discoverRemoteSkills('getsentry/skills');

    expect(skills.length).toBe(1);
    expect(skills[0]?.name).toBe('valid-skill');
  });

  it('skips invalid skill directories', async () => {
    const remotePath = getRemotePath('getsentry/skills');
    mkdirSync(join(remotePath, 'valid-skill'), { recursive: true });
    mkdirSync(join(remotePath, 'invalid-skill'), { recursive: true });

    writeFileSync(
      join(remotePath, 'valid-skill', 'SKILL.md'),
      `---
name: valid-skill
description: A valid skill
---
Prompt.
`
    );

    // Invalid: missing required name field
    writeFileSync(
      join(remotePath, 'invalid-skill', 'SKILL.md'),
      `---
description: Missing name
---
Prompt.
`
    );

    const skills = await discoverRemoteSkills('getsentry/skills');

    expect(skills.length).toBe(1);
    expect(skills[0]?.name).toBe('valid-skill');
  });
});
