import { describe, expect, it, vi } from 'vitest';
import { createSigintHandler } from './signals.js';

describe('createSigintHandler', () => {
  it('aborts gracefully on the first SIGINT', () => {
    const abortController = new AbortController();
    const interrupted = { value: false };
    const exit = vi.fn();

    const handleSigint = createSigintHandler({
      abortController,
      interrupted,
      exit,
      now: () => 1_000,
    });

    handleSigint();

    expect(abortController.signal.aborted).toBe(true);
    expect(interrupted.value).toBe(true);
    expect(exit).not.toHaveBeenCalled();
  });

  it('ignores duplicate SIGINT delivery from the same interrupt', () => {
    const abortController = new AbortController();
    const interrupted = { value: false };
    const exit = vi.fn();
    let now = 1_000;

    const handleSigint = createSigintHandler({
      abortController,
      interrupted,
      exit,
      now: () => now,
      duplicateWindowMs: 750,
    });

    handleSigint();
    now += 10;
    handleSigint();

    expect(interrupted.value).toBe(true);
    expect(exit).not.toHaveBeenCalled();
  });

  it('forces exit on a later second SIGINT', () => {
    const abortController = new AbortController();
    const interrupted = { value: false };
    const exit = vi.fn();
    let now = 1_000;

    const handleSigint = createSigintHandler({
      abortController,
      interrupted,
      exit,
      now: () => now,
      duplicateWindowMs: 750,
    });

    handleSigint();
    now += 1_000;
    handleSigint();

    expect(exit).toHaveBeenCalledWith(130);
  });
});
