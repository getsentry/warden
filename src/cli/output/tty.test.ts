import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectOutputMode } from './tty.js';

describe('detectOutputMode', () => {
  const originalEnv = process.env;
  const originalStderr = process.stderr.isTTY;
  const originalStdout = process.stdout.isTTY;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Reset to non-TTY by default for predictable tests
    Object.defineProperty(process.stderr, 'isTTY', {
      value: false,
      configurable: true,
    });
    Object.defineProperty(process.stdout, 'isTTY', {
      value: false,
      configurable: true,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process.stderr, 'isTTY', {
      value: originalStderr,
      configurable: true,
    });
    Object.defineProperty(process.stdout, 'isTTY', {
      value: originalStdout,
      configurable: true,
    });
  });

  it('returns isTTY=false when streams are not TTY', () => {
    process.env['TERM'] = 'xterm-256color';
    const mode = detectOutputMode();
    expect(mode.isTTY).toBe(false);
  });

  it('returns isTTY=true when stderr is TTY with valid TERM', () => {
    process.env['TERM'] = 'xterm-256color';
    Object.defineProperty(process.stderr, 'isTTY', {
      value: true,
      configurable: true,
    });
    const mode = detectOutputMode();
    expect(mode.isTTY).toBe(true);
  });

  it('returns isTTY=false when TERM=dumb even if stream is TTY', () => {
    process.env['TERM'] = 'dumb';
    Object.defineProperty(process.stderr, 'isTTY', {
      value: true,
      configurable: true,
    });
    const mode = detectOutputMode();
    expect(mode.isTTY).toBe(false);
  });

  it('returns isTTY=false when TERM is empty even if stream is TTY', () => {
    process.env['TERM'] = '';
    Object.defineProperty(process.stderr, 'isTTY', {
      value: true,
      configurable: true,
    });
    const mode = detectOutputMode();
    expect(mode.isTTY).toBe(false);
  });

  it('returns isTTY=false when TERM is unset even if stream is TTY', () => {
    delete process.env['TERM'];
    Object.defineProperty(process.stderr, 'isTTY', {
      value: true,
      configurable: true,
    });
    const mode = detectOutputMode();
    expect(mode.isTTY).toBe(false);
  });

  it('respects NO_COLOR environment variable', () => {
    process.env['TERM'] = 'xterm-256color';
    process.env['NO_COLOR'] = '1';
    Object.defineProperty(process.stderr, 'isTTY', {
      value: true,
      configurable: true,
    });
    const mode = detectOutputMode();
    expect(mode.supportsColor).toBe(false);
  });

  it('respects FORCE_COLOR environment variable', () => {
    process.env['TERM'] = 'xterm-256color';
    process.env['FORCE_COLOR'] = '1';
    const mode = detectOutputMode();
    expect(mode.supportsColor).toBe(true);
  });

  it('respects colorOverride=true', () => {
    const mode = detectOutputMode(true);
    expect(mode.supportsColor).toBe(true);
  });

  it('respects colorOverride=false', () => {
    process.env['TERM'] = 'xterm-256color';
    Object.defineProperty(process.stderr, 'isTTY', {
      value: true,
      configurable: true,
    });
    const mode = detectOutputMode(false);
    expect(mode.supportsColor).toBe(false);
  });

  it('defaults columns to 80', () => {
    const mode = detectOutputMode();
    expect(mode.columns).toBe(80);
  });
});
