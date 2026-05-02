import { describe, expect, it } from 'vitest';
import { isPathLike } from './path.js';

describe('isPathLike', () => {
  it('identifies filesystem path targets', () => {
    expect(isPathLike('./skills/security')).toBe(true);
    expect(isPathLike('/Users/test/skills/security')).toBe(true);
    expect(isPathLike('skills\\security')).toBe(true);
    expect(isPathLike('security')).toBe(false);
  });
});
