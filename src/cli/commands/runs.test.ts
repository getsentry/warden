import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { renderJsonlString } from '../output/jsonl.js';
import type { SkillReport } from '../../types/index.js';
import {
  runRunsList,
  runRunsShow,
  runRunsGc,
  runRunsFollow,
} from './runs.js';
import {
  appendJsonlLine,
  buildRunMetadata,
  initJsonlFile,
  renderJsonlSkillLine,
  renderJsonlSummaryLine,
} from '../output/jsonl.js';
import { Reporter, parseVerbosity } from '../output/index.js';
import type { CLIOptions } from '../args.js';

/**
 * Create a Reporter for testing (non-TTY, normal verbosity).
 */
function createTestReporter(): Reporter {
  const mode = { isTTY: false, supportsColor: false, columns: 80 };
  return new Reporter(mode, parseVerbosity(false, 0, false));
}

function createDefaultOptions(overrides: Partial<CLIOptions> = {}): CLIOptions {
  return {
    json: false,
    help: false,
    quiet: false,
    verbose: 0,
    debug: false,
    fix: false,
    force: false,
    list: false,
    git: false,
    staged: false,
    offline: false,
    failFast: false,
    log: false,
    ...overrides,
  };
}

/**
 * Write a fixture JSONL file with reports.
 */
function writeFixture(
  dir: string,
  filename: string,
  reports: SkillReport[],
  durationMs: number,
  runId: string,
  timestamp?: Date,
): string {
  const filePath = join(dir, filename);
  const content = renderJsonlString(reports, durationMs, { runId, timestamp });
  mkdirSync(join(dir), { recursive: true });
  writeFileSync(filePath, content);
  return filePath;
}

describe('runRunsList', () => {
  let testDir: string;
  let originalCwd: () => string;

  beforeEach(() => {
    testDir = join(tmpdir(), `warden-logs-list-${Date.now()}`);
    mkdirSync(join(testDir, '.warden', 'logs'), { recursive: true });

    // Mock getRepoRoot to return testDir
    originalCwd = process.cwd;
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
  });

  afterEach(() => {
    process.cwd = originalCwd;
    vi.restoreAllMocks();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('lists log files sorted newest first', async () => {
    const logDir = join(testDir, '.warden', 'logs');

    // Create fixture files with timestamps in filenames
    writeFixture(logDir, 'aaa11111-2026-02-18T10-00-00-000Z.jsonl', [
      { skill: 'review', summary: 'Done', findings: [] },
    ], 1000, 'aaa11111-0000-0000-0000-000000000000', new Date('2026-02-18T10:00:00.000Z'));

    writeFixture(logDir, 'bbb22222-2026-02-18T12-00-00-000Z.jsonl', [
      { skill: 'review', summary: 'Found 1 issue', findings: [
        { id: 'f1', severity: 'high', title: 'Bug', description: 'A bug' },
      ] },
    ], 2000, 'bbb22222-0000-0000-0000-000000000000', new Date('2026-02-18T12:00:00.000Z'));

    // Mock git repo root
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const options = createDefaultOptions();

    const exitCode = await runRunsList(options, reporter);
    expect(exitCode).toBe(0);
  });

  it('returns 0 with warning when no logs exist', async () => {
    // Empty log dir
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const options = createDefaultOptions();

    const exitCode = await runRunsList(options, reporter);
    expect(exitCode).toBe(0);
  });

  it('outputs JSON when --json flag is set', async () => {
    const logDir = join(testDir, '.warden', 'logs');
    writeFixture(logDir, 'ccc33333-2026-02-18T10-00-00-000Z.jsonl', [
      { skill: 'review', summary: 'Done', findings: [] },
    ], 1000, 'ccc33333-0000-0000-0000-000000000000', new Date('2026-02-18T10:00:00.000Z'));

    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const options = createDefaultOptions({ json: true });

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const exitCode = await runRunsList(options, reporter);
    expect(exitCode).toBe(0);

    // Verify JSON output was written
    expect(stdoutSpy).toHaveBeenCalled();
    const output = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
    expect(parsed[0].file).toBe('ccc33333-2026-02-18T10-00-00-000Z.jsonl');
    expect(parsed[0].skills).toEqual(['review']);
    expect(parsed[0].bySeverity).toBeDefined();

    stdoutSpy.mockRestore();
  });
});

describe('runRunsShow', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `warden-logs-show-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('shows results from a JSONL file', async () => {
    const filePath = writeFixture(testDir, 'test-run.jsonl', [
      { skill: 'security-review', summary: 'Found 1 issue', findings: [
        { id: 'sec-001', severity: 'high', title: 'SQL Injection', description: 'Bad query' },
      ] },
    ], 2000, 'deadbeef-1234-5678-9abc-def012345678');

    const reporter = createTestReporter();
    const options = createDefaultOptions();

    const exitCode = await runRunsShow(
      { subcommand: 'show', files: [filePath] },
      options,
      reporter,
    );
    expect(exitCode).toBe(0);
  });

  it('returns error when no files specified', async () => {
    const reporter = createTestReporter();
    const options = createDefaultOptions();

    const exitCode = await runRunsShow(
      { subcommand: 'show', files: [] },
      options,
      reporter,
    );
    expect(exitCode).toBe(1);
  });

  it('returns error when file does not exist', async () => {
    const reporter = createTestReporter();
    const options = createDefaultOptions();

    const exitCode = await runRunsShow(
      { subcommand: 'show', files: [join(testDir, 'nonexistent.jsonl')] },
      options,
      reporter,
    );
    expect(exitCode).toBe(1);
  });

  it('resolves short run IDs from .warden/logs/', async () => {
    const logDir = join(testDir, '.warden', 'logs');
    mkdirSync(logDir, { recursive: true });

    writeFixture(logDir, 'deadbeef-2026-02-18T10-00-00-000Z.jsonl', [
      { skill: 'review', summary: 'Done', findings: [] },
    ], 1000, 'deadbeef-1234-5678-9abc-def012345678');

    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const options = createDefaultOptions();

    const exitCode = await runRunsShow(
      { subcommand: 'show', files: ['deadbeef'] },
      options,
      reporter,
    );
    expect(exitCode).toBe(0);
  });

  it('applies --min-confidence filtering', async () => {
    const filePath = writeFixture(testDir, 'filter-test.jsonl', [
      { skill: 'review', summary: 'Issues', findings: [
        { id: 'f1', severity: 'high', title: 'High conf', description: 'Desc', confidence: 'high' },
        { id: 'f2', severity: 'medium', title: 'Low conf', description: 'Desc', confidence: 'low' },
      ] },
    ], 1000, 'filterid-1234-5678-9abc-def012345678');

    const reporter = createTestReporter();
    const options = createDefaultOptions({ minConfidence: 'high' });

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const exitCode = await runRunsShow(
      { subcommand: 'show', files: [filePath] },
      { ...options, json: true },
      reporter,
    );
    expect(exitCode).toBe(0);

    // Parse the JSON output to verify filtering
    const output = stdoutSpy.mock.calls[0]![0] as string;
    const lines = output.trim().split('\n');
    // First line is the skill record, should have filtered findings
    const record = JSON.parse(lines[0]!);
    expect(record.findings.length).toBe(1);
    expect(record.findings[0].confidence).toBe('high');

    stdoutSpy.mockRestore();
  });
});

describe('runRunsGc', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `warden-logs-gc-${Date.now()}`);
    mkdirSync(join(testDir, '.warden', 'logs'), { recursive: true });

    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('reports nothing to clean when no expired files', async () => {
    const logDir = join(testDir, '.warden', 'logs');
    // Write a recent file
    writeFixture(logDir, 'recent-2026-02-18T10-00-00-000Z.jsonl', [
      { skill: 'review', summary: 'Done', findings: [] },
    ], 1000, 'recent00-1234-5678-9abc-def012345678');

    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const options = createDefaultOptions();

    const exitCode = await runRunsGc(options, reporter);
    expect(exitCode).toBe(0);
  });

  it('deletes expired files', async () => {
    const logDir = join(testDir, '.warden', 'logs');
    const filePath = writeFixture(logDir, 'old-file-2024-01-01T10-00-00-000Z.jsonl', [
      { skill: 'review', summary: 'Done', findings: [] },
    ], 500, 'old00000-1234-5678-9abc-def012345678');

    // Set mtime to 60 days ago
    const oldTime = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const { utimesSync } = await import('node:fs');
    utimesSync(filePath, oldTime, oldTime);

    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const options = createDefaultOptions();

    expect(existsSync(filePath)).toBe(true);

    const exitCode = await runRunsGc(options, reporter);
    expect(exitCode).toBe(0);

    // File should be deleted
    expect(existsSync(filePath)).toBe(false);
  });

  it('does not delete recent files', async () => {
    const logDir = join(testDir, '.warden', 'logs');
    const recentPath = writeFixture(logDir, 'recent-2026-02-18T10-00-00-000Z.jsonl', [
      { skill: 'review', summary: 'Done', findings: [] },
    ], 1000, 'recent00-1234-5678-9abc-def012345678');

    const oldPath = writeFixture(logDir, 'old-file-2024-01-01T10-00-00-000Z.jsonl', [
      { skill: 'review', summary: 'Done', findings: [] },
    ], 500, 'old00000-1234-5678-9abc-def012345678');

    // Set mtime to 60 days ago on old file only
    const oldTime = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const { utimesSync } = await import('node:fs');
    utimesSync(oldPath, oldTime, oldTime);

    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const options = createDefaultOptions();

    const exitCode = await runRunsGc(options, reporter);
    expect(exitCode).toBe(0);

    // Recent file should still exist
    expect(existsSync(recentPath)).toBe(true);
    // Old file should be deleted
    expect(existsSync(oldPath)).toBe(false);
  });
});

describe('runRunsList default filtering', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `warden-list-filter-${Date.now()}`);
    mkdirSync(join(testDir, '.warden', 'logs'), { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('hides empty (zero-file, zero-skill) sessions by default and shows them with --all', async () => {
    const logDir = join(testDir, '.warden', 'logs');

    // Empty session: no skills ran (skipped because no triggers matched)
    writeFixture(
      logDir,
      'empty111-2026-04-25T10-00-00-000Z.jsonl',
      [],
      100,
      'empty111-0000-0000-0000-000000000000',
      new Date('2026-04-25T10:00:00.000Z'),
    );

    // Real session: one skill, one analyzed file
    writeFixture(
      logDir,
      'real2222-2026-04-25T11-00-00-000Z.jsonl',
      [
        {
          skill: 'review',
          summary: 'Found 1',
          findings: [{ id: 'f1', severity: 'high', title: 't', description: 'd' }],
          files: [{ filename: 'src/a.ts', findings: 1 }],
        },
      ],
      1000,
      'real2222-0000-0000-0000-000000000000',
      new Date('2026-04-25T11:00:00.000Z'),
    );

    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    // Default --json view should drop the empty session.
    const exit1 = await runRunsList({ ...createDefaultOptions(), json: true }, reporter);
    expect(exit1).toBe(0);
    const defaultOutput = JSON.parse(stdoutSpy.mock.calls[0]![0] as string);
    expect(defaultOutput).toHaveLength(1);
    expect(defaultOutput[0].runId).toBe('real2222-0000-0000-0000-000000000000');

    // --all surfaces both.
    stdoutSpy.mockClear();
    const exit2 = await runRunsList({ ...createDefaultOptions(), json: true }, reporter, { all: true });
    expect(exit2).toBe(0);
    const allOutput = JSON.parse(stdoutSpy.mock.calls[0]![0] as string);
    expect(allOutput).toHaveLength(2);

    stdoutSpy.mockRestore();
  });

  it('keeps run-level error sessions visible by default (the error is the point)', async () => {
    const logDir = join(testDir, '.warden', 'logs');
    // Auth-failed empty run: zero files but has a top-level error.
    const errorLogPath = join(logDir, 'autherr1-2026-04-25T12-00-00-000Z.jsonl');
    const run = buildRunMetadata({
      runId: 'autherr1-0000-0000-0000-000000000000',
      durationMs: 0,
      timestamp: new Date('2026-04-25T12:00:00.000Z'),
    });
    initJsonlFile(errorLogPath);
    appendJsonlLine(
      errorLogPath,
      renderJsonlSummaryLine([], run, {
        code: 'auth_failed',
        message: 'bad key',
        timestamp: '2026-04-25T12:00:00.000Z',
      }),
    );

    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const exit = await runRunsList({ ...createDefaultOptions(), json: true }, reporter);
    expect(exit).toBe(0);
    const output = JSON.parse(stdoutSpy.mock.calls[0]![0] as string);
    expect(output).toHaveLength(1);
    expect(output[0].runId).toBe('autherr1-0000-0000-0000-000000000000');

    stdoutSpy.mockRestore();
  });
});

describe('runRunsFollow', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `warden-follow-${Date.now()}`);
    mkdirSync(join(testDir, '.warden', 'logs'), { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('renders existing skill records on a closed session and exits when summary is read', async () => {
    // Already-finalized session: drains everything that's on disk and stops
    // when it hits the trailing summary record. This is the path that runs
    // when a user follows a finished run by id.
    const logDir = join(testDir, '.warden', 'logs');
    const filePath = writeFixture(
      logDir,
      'follow001-2026-04-25T13-00-00-000Z.jsonl',
      [
        { skill: 'sa', summary: 'ok', findings: [], durationMs: 100 },
        { skill: 'sb', summary: 'ok', findings: [], durationMs: 200 },
      ],
      400,
      'follow001-0000-0000-0000-000000000000',
      new Date('2026-04-25T13:00:00.000Z'),
    );
    expect(existsSync(filePath)).toBe(true);

    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const exit = await runRunsFollow(
      { subcommand: 'follow', files: ['follow001'] },
      createDefaultOptions(),
      reporter,
    );
    expect(exit).toBe(0);
  });

  it('errors when no run id matches and no session is in progress', async () => {
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const exit = await runRunsFollow(
      { subcommand: 'follow', files: ['nonexistent'] },
      createDefaultOptions(),
      reporter,
    );
    expect(exit).toBe(1);
  });

  it('with no run id, picks the most recent in-progress (no-summary) session and exits when finalized', async () => {
    // Two sessions exist: an older closed one and a newer one still in
    // progress. With no arg, follow should target the in-progress one.
    // We simulate finalization mid-test so the watcher exits cleanly.
    const logDir = join(testDir, '.warden', 'logs');

    // Older closed session.
    writeFixture(
      logDir,
      'closed00-2026-04-25T13-00-00-000Z.jsonl',
      [{ skill: 'old', summary: 'ok', findings: [] }],
      100,
      'closed00-0000-0000-0000-000000000000',
      new Date('2026-04-25T13:00:00.000Z'),
    );

    // Newer in-progress session (skill records but no summary yet).
    const newerPath = join(logDir, 'inprog00-2026-04-25T14-00-00-000Z.jsonl');
    const run = buildRunMetadata({
      runId: 'inprog00-0000-0000-0000-000000000000',
      durationMs: 0,
      timestamp: new Date('2026-04-25T14:00:00.000Z'),
    });
    initJsonlFile(newerPath);
    appendJsonlLine(
      newerPath,
      renderJsonlSkillLine({ skill: 'live', summary: 'ok', findings: [], durationMs: 50 }, run),
    );

    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const followPromise = runRunsFollow(
      { subcommand: 'follow', files: [] },
      createDefaultOptions(),
      reporter,
    );

    // Wait for the watcher to attach, then append a summary so it stops.
    await new Promise((r) => setTimeout(r, 50));
    appendJsonlLine(newerPath, renderJsonlSummaryLine([], run));

    const exit = await followPromise;
    expect(exit).toBe(0);
  }, 5000);
});
