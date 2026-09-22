import { describe, expect, it, vi } from 'vitest';
import { ActionCancellation, createActionSignalHandler } from './cancellation.js';

describe('Action cancellation signals', () => {
  it('aborts gracefully on the first cancellation signal', () => {
    const cancellation = new ActionCancellation();
    const exit = vi.fn();
    const handler = createActionSignalHandler({ cancellation, exit });

    handler('SIGTERM');

    expect(cancellation.requested).toBe(true);
    expect(cancellation.signalName).toBe('SIGTERM');
    expect(cancellation.signal.aborted).toBe(true);
    expect(cancellation.exitCode).toBe(143);
    expect(exit).not.toHaveBeenCalled();
  });

  it('ignores duplicate delivery before forcing a later exit', () => {
    const cancellation = new ActionCancellation();
    const exit = vi.fn();
    let now = 1_000;
    const handler = createActionSignalHandler({ cancellation, exit, now: () => now });

    handler('SIGINT');
    now += 100;
    handler('SIGTERM');
    expect(exit).not.toHaveBeenCalled();

    now += 1_000;
    handler('SIGTERM');
    expect(exit).toHaveBeenCalledWith(143);
  });
});
