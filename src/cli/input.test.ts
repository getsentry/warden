import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { readSingleKey, UserAbortError } from './input.js';

/**
 * Create a fake stdin that supports setRawMode, resume, pause, and once('data').
 * Replaces process.stdin for the duration of the test.
 */
function createFakeStdin() {
  const emitter = new EventEmitter();
  const fake = Object.assign(emitter, {
    isRaw: false,
    setRawMode: vi.fn((mode: boolean) => {
      fake.isRaw = mode;
      return fake;
    }),
    resume: vi.fn(),
    pause: vi.fn(),
    isTTY: true as const,
  });
  return fake;
}

describe('readSingleKey', () => {
  let originalStdin: typeof process.stdin;
  let fakeStdin: ReturnType<typeof createFakeStdin>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalStdin = process.stdin;
    fakeStdin = createFakeStdin();
    Object.defineProperty(process, 'stdin', { value: fakeStdin, writable: true });
    stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  });

  afterEach(() => {
    Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
    stderrSpy.mockRestore();
  });

  it('resolves with the lowercase key for normal input', async () => {
    const promise = readSingleKey();

    // Simulate keypress
    fakeStdin.emit('data', Buffer.from('A'));

    const result = await promise;
    expect(result).toBe('a');
  });

  it('enables raw mode and restores it after reading', async () => {
    const promise = readSingleKey();
    fakeStdin.emit('data', Buffer.from('x'));
    await promise;

    expect(fakeStdin.setRawMode).toHaveBeenCalledWith(true);
    expect(fakeStdin.setRawMode).toHaveBeenCalledWith(false);
    expect(fakeStdin.resume).toHaveBeenCalled();
    expect(fakeStdin.pause).toHaveBeenCalled();
  });

  it('throws UserAbortError on Ctrl+C instead of calling process.exit', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const promise = readSingleKey();

    // Simulate Ctrl+C (0x03)
    fakeStdin.emit('data', Buffer.from('\x03'));

    await expect(promise).rejects.toThrow(UserAbortError);
    await expect(promise).rejects.toThrow('User aborted');

    // Verify process.exit was NOT called — the whole point of this fix
    expect(exitSpy).not.toHaveBeenCalled();

    exitSpy.mockRestore();
  });

  it('restores raw mode before throwing UserAbortError', async () => {
    const promise = readSingleKey();
    fakeStdin.emit('data', Buffer.from('\x03'));

    await expect(promise).rejects.toThrow(UserAbortError);

    // Raw mode should have been restored before the rejection
    expect(fakeStdin.setRawMode).toHaveBeenCalledWith(false);
    expect(fakeStdin.pause).toHaveBeenCalled();
  });

  it('writes newline to stderr on Ctrl+C', async () => {
    const promise = readSingleKey();
    fakeStdin.emit('data', Buffer.from('\x03'));

    await expect(promise).rejects.toThrow(UserAbortError);
    expect(stderrSpy).toHaveBeenCalledWith('\n');
  });
});

describe('UserAbortError', () => {
  it('is an instance of Error', () => {
    const error = new UserAbortError();
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UserAbortError);
  });

  it('has correct name and message', () => {
    const error = new UserAbortError();
    expect(error.name).toBe('UserAbortError');
    expect(error.message).toBe('User aborted');
  });
});
