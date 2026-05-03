import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isPathLike, resolvePathTarget } from './path.js';

describe('isPathLike', () => {
  it('identifies filesystem path targets', () => {
    expect(isPathLike('./skills/security')).toBe(true);
    expect(isPathLike('/Users/test/skills/security')).toBe(true);
    expect(isPathLike('skills\\security')).toBe(true);
    expect(isPathLike('~')).toBe(true);
    expect(isPathLike('security')).toBe(false);
  });
});

describe('resolvePathTarget', () => {
  it('resolves CLI path targets consistently', () => {
    expect(resolvePathTarget('./skills/security', '/repo/root')).toBe(join('/repo/root', 'skills', 'security'));
    expect(resolvePathTarget('/tmp/skills/security', '/repo/root')).toBe('/tmp/skills/security');
    expect(resolvePathTarget('~/skills/security', '/repo/root')).toBe(join(homedir(), 'skills/security'));
  });
});
