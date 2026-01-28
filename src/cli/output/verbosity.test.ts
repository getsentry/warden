import { describe, it, expect } from 'vitest';
import { Verbosity, parseVerbosity } from './verbosity.js';

describe('parseVerbosity', () => {
  it('returns Quiet when quiet is true', () => {
    expect(parseVerbosity(true, 0)).toBe(Verbosity.Quiet);
    expect(parseVerbosity(true, 1)).toBe(Verbosity.Quiet);
    expect(parseVerbosity(true, 2)).toBe(Verbosity.Quiet);
  });

  it('returns Normal when verbose count is 0', () => {
    expect(parseVerbosity(false, 0)).toBe(Verbosity.Normal);
  });

  it('returns Verbose when verbose count is 1', () => {
    expect(parseVerbosity(false, 1)).toBe(Verbosity.Verbose);
  });

  it('returns Debug when verbose count is 2 or more', () => {
    expect(parseVerbosity(false, 2)).toBe(Verbosity.Debug);
    expect(parseVerbosity(false, 3)).toBe(Verbosity.Debug);
    expect(parseVerbosity(false, 10)).toBe(Verbosity.Debug);
  });
});

describe('Verbosity enum', () => {
  it('has correct numeric values', () => {
    expect(Verbosity.Quiet).toBe(0);
    expect(Verbosity.Normal).toBe(1);
    expect(Verbosity.Verbose).toBe(2);
    expect(Verbosity.Debug).toBe(3);
  });

  it('supports comparison operators', () => {
    expect(Verbosity.Quiet < Verbosity.Normal).toBe(true);
    expect(Verbosity.Normal < Verbosity.Verbose).toBe(true);
    expect(Verbosity.Verbose < Verbosity.Debug).toBe(true);
    expect(Verbosity.Debug >= Verbosity.Verbose).toBe(true);
  });
});
