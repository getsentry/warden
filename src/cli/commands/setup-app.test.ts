import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { runSetupApp } from './setup-app.js';
import { Reporter, parseVerbosity } from '../output/index.js';
import type { SetupAppOptions } from '../args.js';

// Mock all external dependencies so we never hit the network or filesystem.
vi.mock('./setup-app/manifest.js', () => ({
  buildManifest: () => ({ name: 'test-app', url: 'http://localhost', public: false }),
}));

vi.mock('./setup-app/browser.js', () => ({
  openBrowser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./setup-app/credentials.js', () => ({
  exchangeCodeForCredentials: vi.fn().mockResolvedValue({
    id: 12345,
    name: 'test-app',
    pem: '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----',
    htmlUrl: 'https://github.com/apps/test-app',
  }),
}));

vi.mock('../git.js', () => ({
  getGitHubRepoUrl: () => 'https://github.com/test/repo',
}));

// We need fine-grained control over the callback server mock, so we build it
// per-test in a factory that the mock delegates to.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let serverFactory: () => any;

vi.mock('./setup-app/server.js', () => ({
  startCallbackServer: (..._args: unknown[]) => serverFactory(),
}));

function createTestReporter(): Reporter {
  const mode = { isTTY: false, supportsColor: false, columns: 80 };
  return new Reporter(mode, parseVerbosity(false, 0, false));
}

function createOptions(overrides: Partial<SetupAppOptions> = {}): SetupAppOptions {
  return {
    port: 3456,
    timeout: 60,
    open: false,
    ...overrides,
  };
}

/**
 * Build a fake server handle whose `server` is an EventEmitter so we can
 * simulate 'error' events.  The `waitForCallback` promise can be resolved or
 * rejected externally.
 */
function createMockServerHandle() {
  const emitter = new EventEmitter();
  let resolveCallback!: (v: { code: string }) => void;
  let rejectCallback!: (e: Error) => void;
  const waitForCallback = new Promise<{ code: string }>((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });
  const close = vi.fn();

  return {
    handle: {
      server: emitter,
      waitForCallback,
      close,
      startUrl: 'http://localhost:3456/start',
    },
    resolveCallback,
    rejectCallback,
    close,
  };
}

describe('runSetupApp', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('server error handling', () => {
    it('returns exit code 1 and calls close() when the server emits EADDRINUSE', async () => {
      const mock = createMockServerHandle();
      serverFactory = () => mock.handle;

      const reporter = createTestReporter();
      const errorSpy = vi.spyOn(reporter, 'error');

      // Emit the error on the next microtask so `runSetupApp` has time to
      // register its listener and start awaiting the promise race.
      const errorObj: NodeJS.ErrnoException = new Error('listen EADDRINUSE: address already in use');
      errorObj.code = 'EADDRINUSE';

      setTimeout(() => mock.handle.server.emit('error', errorObj), 5);

      const exitCode = await runSetupApp(createOptions(), reporter);

      expect(exitCode).toBe(1);
      expect(mock.close).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('already in use'),
      );
    });

    it('returns exit code 1 for generic server errors', async () => {
      const mock = createMockServerHandle();
      serverFactory = () => mock.handle;

      const reporter = createTestReporter();
      const errorSpy = vi.spyOn(reporter, 'error');

      const errorObj: NodeJS.ErrnoException = new Error('something broke');
      errorObj.code = 'EACCES';

      setTimeout(() => mock.handle.server.emit('error', errorObj), 5);

      const exitCode = await runSetupApp(createOptions(), reporter);

      expect(exitCode).toBe(1);
      expect(mock.close).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Server error: something broke'),
      );
    });

    it('does not call process.exit on server error', async () => {
      const mock = createMockServerHandle();
      serverFactory = () => mock.handle;

      const reporter = createTestReporter();
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

      const errorObj: NodeJS.ErrnoException = new Error('port in use');
      errorObj.code = 'EADDRINUSE';

      setTimeout(() => mock.handle.server.emit('error', errorObj), 5);

      await runSetupApp(createOptions(), reporter);

      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe('cleanup on errors', () => {
    it('calls serverHandle.close() even when waitForCallback rejects', async () => {
      const mock = createMockServerHandle();
      serverFactory = () => mock.handle;

      const reporter = createTestReporter();

      setTimeout(() => mock.rejectCallback(new Error('Timeout')), 5);

      const exitCode = await runSetupApp(createOptions(), reporter);

      expect(exitCode).toBe(1);
      expect(mock.close).toHaveBeenCalled();
    });
  });

  describe('happy path', () => {
    it('returns exit code 0 on successful callback exchange', async () => {
      const mock = createMockServerHandle();
      serverFactory = () => mock.handle;

      const reporter = createTestReporter();

      setTimeout(() => mock.resolveCallback({ code: 'test-code' }), 5);

      const exitCode = await runSetupApp(createOptions(), reporter);

      expect(exitCode).toBe(0);
      expect(mock.close).toHaveBeenCalled();
    });
  });

  describe('URL display', () => {
    it('shows URL when open is false', async () => {
      const mock = createMockServerHandle();
      serverFactory = () => mock.handle;

      const reporter = createTestReporter();
      const textSpy = vi.spyOn(reporter, 'text');

      setTimeout(() => mock.resolveCallback({ code: 'test-code' }), 5);

      await runSetupApp(createOptions({ open: false }), reporter);

      const textCalls = textSpy.mock.calls.map((c) => c[0]);
      expect(textCalls).toContainEqual(
        expect.stringContaining('Open this URL in your browser'),
      );
    });

    it('shows URL when browser open fails', async () => {
      const { openBrowser } = await import('./setup-app/browser.js');
      vi.mocked(openBrowser).mockRejectedValueOnce(new Error('xdg-open not found'));

      const mock = createMockServerHandle();
      serverFactory = () => mock.handle;

      const reporter = createTestReporter();
      const textSpy = vi.spyOn(reporter, 'text');
      const warnSpy = vi.spyOn(reporter, 'warning');

      setTimeout(() => mock.resolveCallback({ code: 'test-code' }), 5);

      await runSetupApp(createOptions({ open: true }), reporter);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not open browser'),
      );
      const textCalls = textSpy.mock.calls.map((c) => c[0]);
      expect(textCalls).toContainEqual(
        expect.stringContaining('Open this URL in your browser'),
      );
    });
  });
});
