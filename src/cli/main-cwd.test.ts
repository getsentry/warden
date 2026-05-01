import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupArtifacts } from './log-cleanup.js';
import { runSynthesize } from './commands/synthesize.js';
import { main } from './main.js';

vi.mock('../sentry.js', () => ({
  Sentry: {
    startSpan: vi.fn(async (_span, callback: (span: { setAttribute: (key: string, value: string) => void }) => unknown) => {
      return callback({ setAttribute: () => undefined });
    }),
  },
  flushSentry: vi.fn(async () => undefined),
  setGlobalAttributes: vi.fn(),
  emitRunMetric: vi.fn(),
  getTraceId: vi.fn(() => undefined),
}));

vi.mock('./commands/synthesize.js', () => ({
  runSynthesize: vi.fn(async () => 0),
}));

vi.mock('./log-cleanup.js', () => ({
  cleanupArtifacts: vi.fn(async () => undefined),
}));

const runSynthesizeMock = vi.mocked(runSynthesize);
const cleanupArtifactsMock = vi.mocked(cleanupArtifacts);

describe('main --cwd', () => {
  const originalArgv = process.argv.slice();
  const originalCwd = process.cwd();
  const originalExit = process.exit;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'warden-main-cwd-'));
    process.exit = vi.fn() as never;
    runSynthesizeMock.mockReset();
    runSynthesizeMock.mockResolvedValue(0);
    cleanupArtifactsMock.mockReset();
    cleanupArtifactsMock.mockResolvedValue(0);
  });

  afterEach(() => {
    process.argv = originalArgv.slice();
    process.chdir(originalCwd);
    process.exit = originalExit;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('changes to the requested cwd before dispatching the synth command', async () => {
    const launcherDir = join(tempDir, 'launcher');
    const targetDir = join(tempDir, 'workspace');
    mkdirSync(launcherDir, { recursive: true });
    mkdirSync(targetDir, { recursive: true });
    process.chdir(launcherDir);
    const resolvedTargetDir = realpathSync(targetDir);

    let invokedCwd: string | undefined;
    runSynthesizeMock.mockImplementationOnce(async () => {
      invokedCwd = process.cwd();
      return 0;
    });

    process.argv = [
      'node',
      'warden',
      '-C',
      '../workspace',
      'synth',
      'security-review',
      '--quiet',
    ];

    await main();

    expect(invokedCwd).toBe(resolvedTargetDir);
    expect(process.cwd()).toBe(resolvedTargetDir);
    expect(runSynthesizeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: '../workspace',
        quiet: true,
        skill: 'security-review',
      }),
      expect.anything(),
      expect.anything(),
    );
    expect(cleanupArtifactsMock).toHaveBeenCalledWith(expect.objectContaining({
      dir: join(resolvedTargetDir, '.warden', 'logs'),
    }));
    expect(process.exit).toHaveBeenCalledWith(0);
  });
});
