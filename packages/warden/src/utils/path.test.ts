import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isPathLike, resolveConfigInput, resolvePathTarget } from './path.js';

describe('isPathLike', () => {
  it('identifies filesystem path targets', () => {
    expect(isPathLike('./skills/security')).toBe(true);
    expect(isPathLike('/Users/test/skills/security')).toBe(true);
    expect(isPathLike('skills\\security')).toBe(true);
    expect(isPathLike('~')).toBe(true);
    expect(isPathLike('security')).toBe(false);
  });
});

describe('resolveConfigInput', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `warden-config-input-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns a file path unchanged', () => {
    const tomlPath = join(tempDir, 'warden.toml');
    writeFileSync(tomlPath, '');
    expect(resolveConfigInput(tomlPath)).toBe(tomlPath);
  });

  it('appends warden.toml when input is a directory', () => {
    expect(resolveConfigInput(tempDir)).toBe(join(tempDir, 'warden.toml'));
  });

  it('treats non-existent path as a direct file path', () => {
    const missing = join(tempDir, 'does-not-exist.toml');
    expect(resolveConfigInput(missing)).toBe(missing);
  });
});

describe('resolvePathTarget', () => {
  it('resolves CLI path targets consistently', () => {
    expect(resolvePathTarget('./skills/security', '/repo/root')).toBe(join('/repo/root', 'skills', 'security'));
    expect(resolvePathTarget('/tmp/skills/security', '/repo/root')).toBe('/tmp/skills/security');
    expect(resolvePathTarget('~/skills/security', '/repo/root')).toBe(join(homedir(), 'skills/security'));
  });
});
