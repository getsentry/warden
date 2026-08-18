import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { renderJsonlString } from '../output/jsonl.js';
import type { SkillReport } from '../../types/index.js';
import { runInspect } from './inspect.js';
import type { InspectContext } from './inspect.js';
import { Reporter, parseVerbosity } from '../output/index.js';
import type { CLIOptions } from '../args.js';
import type { InspectOptions } from '../args.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTTYReporter(): Reporter {
  const mode = { isTTY: true, supportsColor: false, columns: 80 };
  return new Reporter(mode, parseVerbosity(false, 0, false));
}

function createNonTTYReporter(): Reporter {
  const mode = { isTTY: false, supportsColor: false, columns: 80 };
  return new Reporter(mode, parseVerbosity(false, 0, false));
}

function createDefaultOptions(overrides: Partial<CLIOptions> = {}): CLIOptions {
  return {
    json: false,
    traces: false,
    help: false,
    quiet: false,
    verbose: 0,
    debug: false,
    force: false,
    list: false,
    git: false,
    staged: false,
    offline: false,
    failFast: false,
    log: false,
    regenerate: false,
    ...overrides,
  };
}

function writeFixtureLog(
  dir: string,
  filename: string,
  reports: SkillReport[],
  runId: string,
): string {
  const filePath = join(dir, filename);
  const content = renderJsonlString(reports, 1000, { runId });
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, content);
  return filePath;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runInspect', () => {
  let testDir: string;
  let logDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `warden-inspect-${Date.now()}`);
    logDir = join(testDir, '.warden', 'logs');
    mkdirSync(logDir, { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  // ISC-14: non-TTY → exit 1 with error message
  it('exits 1 with error when not a TTY', async () => {
    const reporter = createNonTTYReporter();
    const errors: string[] = [];
    vi.spyOn(reporter, 'error').mockImplementation((msg: string) => { errors.push(msg); });

    const inspectOptions: InspectOptions = { target: 'deadbeef' };
    const exitCode = await runInspect(inspectOptions, createDefaultOptions(), reporter);

    expect(exitCode).toBe(1);
    expect(errors.some((e) => e.includes('interactive terminal'))).toBe(true);
  });

  // ISC-14: missing log file → exit 1
  it('exits 1 when the log file does not exist', async () => {
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTTYReporter();
    const errors: string[] = [];
    vi.spyOn(reporter, 'error').mockImplementation((msg: string) => { errors.push(msg); });

    const inspectOptions: InspectOptions = {
      target: join(testDir, 'nonexistent.jsonl'),
    };
    const exitCode = await runInspect(
      inspectOptions,
      createDefaultOptions({ cwd: testDir }),
      reporter,
    );

    expect(exitCode).toBe(1);
    expect(errors.some((e) => e.includes('not found'))).toBe(true);
  });

  // ISC-14: unreadable JSONL (corrupt JSON) → exit 1
  it('exits 1 when the JSONL cannot be parsed', async () => {
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const corruptPath = join(logDir, 'corrupt-2026-08-18T09-11-07-000Z.jsonl');
    writeFileSync(corruptPath, 'not json at all\n');

    const reporter = createTTYReporter();
    const errors: string[] = [];
    vi.spyOn(reporter, 'error').mockImplementation((msg: string) => { errors.push(msg); });

    const inspectOptions: InspectOptions = { target: corruptPath };
    const exitCode = await runInspect(
      inspectOptions,
      createDefaultOptions({ cwd: testDir }),
      reporter,
    );

    expect(exitCode).toBe(1);
    expect(errors.length).toBeGreaterThan(0);
  });

  // ISC-1: happy path — resolves by absolute path, calls render hook
  it('calls the render hook with correct context for a direct path', async () => {
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const runId = 'aabbccdd-0000-0000-0000-000000000001';
    const logPath = writeFixtureLog(
      logDir,
      `aabbccdd-2026-08-18T09-11-07-000Z.jsonl`,
      [
        {
          skill: 'security-review',
          summary: 'Found 1 issue',
          findings: [
            {
              id: 'f1',
              severity: 'high',
              title: 'SQL injection',
              description: 'Unsanitized input used in query',
            },
          ],
        },
      ],
      runId,
    );

    const reporter = createTTYReporter();
    vi.spyOn(reporter, 'error').mockImplementation(() => undefined);

    let capturedCtx: InspectContext | undefined;
    const fakeRender = async (ctx: InspectContext): Promise<number> => {
      capturedCtx = ctx;
      return 0;
    };

    const inspectOptions: InspectOptions = { target: logPath };
    const exitCode = await runInspect(
      inspectOptions,
      createDefaultOptions({ cwd: testDir }),
      reporter,
      fakeRender,
    );

    expect(exitCode).toBe(0);
    expect(capturedCtx).toBeDefined();
    expect(capturedCtx!.logPath).toBe(logPath);
    expect(capturedCtx!.session.unreviewed.length).toBe(1);
    expect(capturedCtx!.session.unreviewed[0]!.finding.id).toBe('f1');
  });

  // ISC-1: resolves by short run ID from logDir
  it('resolves a short run ID to a JSONL file in .warden/logs/', async () => {
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);

    const runId = 'deadbeef-0000-0000-0000-000000000001';
    writeFixtureLog(
      logDir,
      'deadbeef-2026-08-18T09-11-07-000Z.jsonl',
      [{ skill: 'code-review', summary: 'Done', findings: [] }],
      runId,
    );

    // A log with zero findings still has reports — but no *findings* in them.
    // Adjust fixture to have one finding so it passes the empty-reports check.
    const runId2 = 'deadbeef-0000-0000-0000-000000000002';
    writeFixtureLog(
      logDir,
      'deadbeef-2026-08-18T09-11-08-000Z.jsonl',
      [
        {
          skill: 'code-review',
          summary: 'Found 1',
          findings: [{ id: 'g1', severity: 'low', title: 'Lint', description: 'Lint issue' }],
        },
      ],
      runId2,
    );

    let resolvedPath: string | undefined;
    const fakeRender = async (ctx: InspectContext): Promise<number> => {
      resolvedPath = ctx.logPath;
      return 0;
    };

    const reporter = createTTYReporter();
    vi.spyOn(reporter, 'error').mockImplementation(() => undefined);

    const inspectOptions: InspectOptions = { target: 'deadbeef' };
    const exitCode = await runInspect(
      inspectOptions,
      createDefaultOptions({ cwd: testDir }),
      reporter,
      fakeRender,
    );

    // Should succeed and resolve to a file starting with 'deadbeef'
    expect(exitCode).toBe(0);
    expect(resolvedPath).toBeDefined();
    expect(resolvedPath!.includes('deadbeef')).toBe(true);
  });

  // Empty reports → exit 1
  it('exits 1 when the log contains no skill reports', async () => {
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    // Write a file that has a run record but no skill reports.
    const emptyLogPath = join(logDir, 'empty-2026-08-18T09-00-00-000Z.jsonl');
    writeFileSync(
      emptyLogPath,
      JSON.stringify({ type: 'run', runId: 'empty-run', timestamp: '2026-08-18T09:00:00.000Z' }) + '\n',
    );

    const reporter = createTTYReporter();
    const errors: string[] = [];
    vi.spyOn(reporter, 'error').mockImplementation((msg: string) => { errors.push(msg); });

    const inspectOptions: InspectOptions = { target: emptyLogPath };
    const exitCode = await runInspect(
      inspectOptions,
      createDefaultOptions({ cwd: testDir }),
      reporter,
    );

    expect(exitCode).toBe(1);
    expect(errors.some((e) => e.includes('No skill reports'))).toBe(true);
  });
});
