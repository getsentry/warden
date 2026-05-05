import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
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
  renderJsonlChunkLine,
  renderJsonlSkillLine,
  renderJsonlSummaryLine,
  type JsonlChunkRecord,
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
    regenerate: false,
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

  it('lists total cost including auxiliary usage', async () => {
    const logDir = join(testDir, '.warden', 'logs');
    writeFixture(logDir, 'ddd44444-2026-02-18T10-00-00-000Z.jsonl', [
      {
        skill: 'review',
        summary: 'Done',
        findings: [],
        usage: { inputTokens: 3000, outputTokens: 680, costUSD: 20 },
        auxiliaryUsage: {
          verification: { inputTokens: 100, outputTokens: 50, costUSD: 6.19 },
        },
      },
    ], 1000, 'ddd44444-0000-0000-0000-000000000000', new Date('2026-02-18T10:00:00.000Z'));

    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const options = createDefaultOptions();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const exitCode = await runRunsList(options, reporter);
    expect(exitCode).toBe(0);

    const output = errorSpy.mock.calls.map((c: unknown[]) => c[0] as string).join('\n');
    expect(output).toContain('$26.19');

    errorSpy.mockRestore();
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

  it('renders fully-corrupt files as parse-error rows, not in-progress', async () => {
    const logDir = join(testDir, '.warden', 'logs');
    const corruptPath = join(logDir, 'corrupt0-2026-04-25T12-00-00-000Z.jsonl');
    initJsonlFile(corruptPath);
    appendJsonlLine(corruptPath, '{"this is not valid json\n');
    appendJsonlLine(corruptPath, 'also garbage\n');

    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const exit = await runRunsList({ ...createDefaultOptions(), json: true }, reporter, { all: true });
    expect(exit).toBe(0);
    const output = JSON.parse(stdoutSpy.mock.calls[0]![0] as string) as { inProgress?: boolean; runId?: string }[];
    expect(output).toHaveLength(1);
    // Corrupt files have no metadata: inProgress defaults to false in the JSON output
    // and runId is undefined; the table renderer shows them as "parse error".
    expect(output[0]!.inProgress).toBe(false);
    expect(output[0]!.runId).toBeUndefined();

    stdoutSpy.mockRestore();
  });

  it('marks in-progress runs as running (not parse error) and surfaces their runId', async () => {
    const logDir = join(testDir, '.warden', 'logs');

    const livePath = join(logDir, 'liverun0-2026-04-25T15-00-00-000Z.jsonl');
    const liveRun = buildRunMetadata({
      runId: 'liverun0-0000-0000-0000-000000000000',
      durationMs: 0,
      timestamp: new Date('2026-04-25T15:00:00.000Z'),
    });
    initJsonlFile(livePath);
    appendJsonlLine(
      livePath,
      renderJsonlSkillLine({ skill: 'live', summary: 'ok', findings: [], durationMs: 50 }, liveRun),
    );

    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const exit = await runRunsList({ ...createDefaultOptions(), json: true }, reporter);
    expect(exit).toBe(0);
    const output = JSON.parse(stdoutSpy.mock.calls[0]![0] as string) as { runId?: string; inProgress?: boolean }[];
    expect(output).toHaveLength(1);
    expect(output[0]!.inProgress).toBe(true);
    expect(output[0]!.runId).toBe('liverun0-0000-0000-0000-000000000000');

    stdoutSpy.mockRestore();
  });

  it('sorts in-progress (no-summary) runs to the top using the filename timestamp', async () => {
    const logDir = join(testDir, '.warden', 'logs');

    // Older finalized session.
    writeFixture(
      logDir,
      'oldsess0-2026-04-25T11-00-00-000Z.jsonl',
      [{ skill: 'review', summary: 'ok', findings: [{ id: 'f', severity: 'high', title: 't', description: 'd' }], files: [{ filename: 'a.ts', findings: 1 }] }],
      1000,
      'oldsess0-0000-0000-0000-000000000000',
      new Date('2026-04-25T11:00:00.000Z'),
    );

    // Newer in-progress session (no summary).
    const livePath = join(logDir, 'livesess-2026-04-25T13-00-00-000Z.jsonl');
    const run = buildRunMetadata({
      runId: 'livesess-0000-0000-0000-000000000000',
      durationMs: 0,
      timestamp: new Date('2026-04-25T13:00:00.000Z'),
    });
    initJsonlFile(livePath);
    appendJsonlLine(
      livePath,
      renderJsonlSkillLine(
        { skill: 'live', summary: 'ok', findings: [], durationMs: 50, files: [{ filename: 'b.ts', findings: 0 }] },
        run,
      ),
    );

    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const exit = await runRunsList({ ...createDefaultOptions(), json: true }, reporter, { all: true });
    expect(exit).toBe(0);
    const output = JSON.parse(stdoutSpy.mock.calls[0]![0] as string) as { runId?: string; file: string }[];
    expect(output).toHaveLength(2);
    expect(output[0]!.file).toBe('livesess-2026-04-25T13-00-00-000Z.jsonl');
    expect(output[1]!.file).toBe('oldsess0-2026-04-25T11-00-00-000Z.jsonl');

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

  it('with no run id, skips files whose last line is corrupt instead of hanging on them', async () => {
    const logDir = join(testDir, '.warden', 'logs');

    // Newer file with a corrupt last line — must NOT be picked.
    const corruptPath = join(logDir, 'corrupt0-2026-04-25T15-00-00-000Z.jsonl');
    initJsonlFile(corruptPath);
    appendJsonlLine(corruptPath, '{"this is not valid json\n');

    // Older still-in-progress file — should be picked.
    const livePath = join(logDir, 'liverun0-2026-04-25T13-00-00-000Z.jsonl');
    const liveRun = buildRunMetadata({
      runId: 'liverun0-0000-0000-0000-000000000000',
      durationMs: 0,
      timestamp: new Date('2026-04-25T13:00:00.000Z'),
    });
    initJsonlFile(livePath);
    appendJsonlLine(
      livePath,
      renderJsonlSkillLine({ skill: 'live', summary: 'ok', findings: [], durationMs: 50 }, liveRun),
    );

    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const followPromise = runRunsFollow(
      { subcommand: 'follow', files: [] },
      createDefaultOptions(),
      reporter,
    );

    // Finalize the live run so the watcher exits.
    await new Promise((r) => setTimeout(r, 50));
    appendJsonlLine(livePath, renderJsonlSummaryLine([], liveRun));

    const exit = await followPromise;
    expect(exit).toBe(0);
  }, 5000);

  it('errors when an explicit path does not exist instead of hanging in the poll loop', async () => {
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const exit = await runRunsFollow(
      { subcommand: 'follow', files: ['./does-not-exist.jsonl'] },
      createDefaultOptions(),
      reporter,
    );
    expect(exit).toBe(1);
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

    const olderPath = join(logDir, 'zzzzzzzz-2026-04-25T13-30-00-000Z.jsonl');
    const olderRun = buildRunMetadata({
      runId: 'zzzzzzzz-0000-0000-0000-000000000000',
      durationMs: 0,
      timestamp: new Date('2026-04-25T13:30:00.000Z'),
    });
    initJsonlFile(olderPath);
    appendJsonlLine(
      olderPath,
      renderJsonlSkillLine({ skill: 'older-live', summary: 'ok', findings: [], durationMs: 50 }, olderRun),
    );

    // Newer in-progress session (skill records but no summary yet).
    const newerPath = join(logDir, 'aaaaaaaa-2026-04-25T14-00-00-000Z.jsonl');
    const run = buildRunMetadata({
      runId: 'aaaaaaaa-0000-0000-0000-000000000000',
      durationMs: 0,
      timestamp: new Date('2026-04-25T14:00:00.000Z'),
    });
    initJsonlFile(newerPath);
    appendJsonlLine(
      newerPath,
      renderJsonlSkillLine({ skill: 'newer-live', summary: 'ok', findings: [], durationMs: 50 }, run),
    );

    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);
    const writes: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((chunk = '') => {
      writes.push(String(chunk));
    });

    const reporter = createTestReporter();
    const followPromise = runRunsFollow(
      { subcommand: 'follow', files: [] },
      createDefaultOptions(),
      reporter,
    );

    // Wait for the watcher to attach, then append a summary so it stops.
    await new Promise((r) => setTimeout(r, 50));
    appendJsonlLine(olderPath, renderJsonlSummaryLine([], olderRun));
    appendJsonlLine(newerPath, renderJsonlSummaryLine([], run));

    const exit = await followPromise;
    expect(exit).toBe(0);
    expect(writes.join('\n')).toContain('newer-live');
    expect(writes.join('\n')).not.toContain('older-live');
    logSpy.mockRestore();
  }, 5000);

  it('with --json, passes through raw JSONL lines verbatim and exits on summary', async () => {
    const logDir = join(testDir, '.warden', 'logs');
    const filePath = writeFixture(
      logDir,
      'jsonpass-2026-04-25T15-00-00-000Z.jsonl',
      [
        { skill: 'sa', summary: 'ok', findings: [], durationMs: 100 },
        { skill: 'sb', summary: 'ok', findings: [], durationMs: 200 },
      ],
      400,
      'jsonpass-0000-0000-0000-000000000000',
      new Date('2026-04-25T15:00:00.000Z'),
    );

    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const writes: string[] = [];
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf-8'));
      return true;
    });

    const reporter = createTestReporter();
    const exit = await runRunsFollow(
      { subcommand: 'follow', files: ['jsonpass'] },
      { ...createDefaultOptions(), json: true },
      reporter,
    );
    expect(exit).toBe(0);

    const stdoutText = writes.join('');
    const lines = stdoutText.split('\n').filter((l) => l.length > 0);
    expect(lines.length).toBe(3);
    const records = lines.map((l) => JSON.parse(l));
    expect(records[0]!.skill).toBe('sa');
    expect(records[1]!.skill).toBe('sb');
    expect(records[2]!.type).toBe('summary');

    // stdout must match the on-disk file byte-for-byte.
    const onDisk = readFileSync(filePath, 'utf-8');
    expect(stdoutText).toBe(onDisk);

    stdoutSpy.mockRestore();
  });

  it('renders chunk findings while the run is still active and exits on done marker', async () => {
    const logDir = join(testDir, '.warden', 'logs');
    const livePath = join(logDir, 'chunkrun-2026-04-25T16-00-00-000Z.jsonl');
    const run = buildRunMetadata({
      runId: 'chunkrun-0000-0000-0000-000000000000',
      durationMs: 0,
      timestamp: new Date('2026-04-25T16:00:00.000Z'),
    });
    const chunk: JsonlChunkRecord = {
      schemaVersion: 1,
      run,
      skill: 'live-skill',
      chunk: { file: 'src/a.ts', index: 1, total: 2, lineRange: '10-20' },
      status: 'ok',
      findings: [{
        id: 'FIND-1',
        severity: 'high',
        title: 'Escaped finding',
        description: 'This should render before the run is complete.',
        location: { path: 'src/a.ts', startLine: 12 },
      }],
      usage: { inputTokens: 100, outputTokens: 20, costUSD: 0.001 },
      durationMs: 250,
    };

    initJsonlFile(livePath);
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const writes: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((chunk = '') => {
      writes.push(String(chunk));
    });

    const reporter = createTestReporter();
    const followPromise = runRunsFollow(
      { subcommand: 'follow', files: [] },
      createDefaultOptions(),
      reporter,
    );

    await new Promise((r) => setTimeout(r, 50));
    appendJsonlLine(livePath, renderJsonlChunkLine(chunk));
    await new Promise((r) => setTimeout(r, 50));
    writeFileSync(`${livePath}.done`, '');

    const exit = await followPromise;
    expect(exit).toBe(0);
    expect(writes.join('\n')).toContain('Escaped finding');

    logSpy.mockRestore();
  }, 5000);

  it('follows an explicit completed chunk log', async () => {
    const logDir = join(testDir, '.warden', 'logs');
    const livePath = join(logDir, 'donechunk-2026-04-25T16-00-00-000Z.jsonl');
    const run = buildRunMetadata({
      runId: 'donechunk-0000-0000-0000-000000000000',
      durationMs: 250,
      timestamp: new Date('2026-04-25T16:00:00.000Z'),
    });
    const chunk: JsonlChunkRecord = {
      schemaVersion: 1,
      run,
      skill: 'done-skill',
      chunk: { file: 'src/a.ts', index: 1, total: 1, lineRange: '10-20' },
      status: 'ok',
      findings: [{ id: 'DONE-1', severity: 'high', title: 'Done finding', description: 'done' }],
      durationMs: 250,
    };

    initJsonlFile(livePath);
    appendJsonlLine(livePath, renderJsonlChunkLine(chunk));
    writeFileSync(`${livePath}.done`, '');
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const writes: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((chunk = '') => {
      writes.push(String(chunk));
    });

    const exit = await runRunsFollow(
      { subcommand: 'follow', files: ['donechunk'] },
      createDefaultOptions(),
      createTestReporter(),
    );

    expect(exit).toBe(0);
    expect(writes.join('\n')).toContain('Done finding');

    logSpy.mockRestore();
  }, 5000);

  it('does not read from the middle of a finalized replacement file', async () => {
    const logDir = join(testDir, '.warden', 'logs');
    const livePath = join(logDir, 'replace0-2026-04-25T16-00-00-000Z.jsonl');
    const run = buildRunMetadata({
      runId: 'replace0',
      durationMs: 100,
      timestamp: new Date('2026-04-25T16:00:00.000Z'),
      cwd: testDir,
    });
    const chunk: JsonlChunkRecord = {
      schemaVersion: 1,
      run,
      skill: 'live-skill',
      chunk: { file: 'src/a.ts', index: 1, total: 1, lineRange: '10-20' },
      status: 'ok',
      findings: [{
        id: 'FIND-1',
        severity: 'high',
        title: 'Live finding',
        description: 'This should render once.',
      }],
      durationMs: 100,
    };

    initJsonlFile(livePath);
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const writes: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((chunk = '') => {
      writes.push(String(chunk));
    });
    const warningSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const reporter = createTestReporter();
    const followPromise = runRunsFollow(
      { subcommand: 'follow', files: [] },
      createDefaultOptions(),
      reporter,
    );

    await new Promise((r) => setTimeout(r, 50));
    appendJsonlLine(livePath, renderJsonlChunkLine(chunk));
    await new Promise((r) => setTimeout(r, 50));
    const finalPath = `${livePath}.tmp`;
    writeFileSync(finalPath, renderJsonlChunkLine({
      ...chunk,
      findings: [],
      run: { ...run, durationMs: 250 },
    }));
    renameSync(finalPath, livePath);
    await new Promise((r) => setTimeout(r, 50));
    writeFileSync(`${livePath}.done`, '');

    const exit = await followPromise;
    const output = writes.join('\n');
    expect(exit).toBe(0);
    expect(output).toContain('Live finding');
    expect(output.match(/Live finding/g)).toHaveLength(1);
    expect(warningSpy).not.toHaveBeenCalledWith(expect.stringContaining('Skipping unrecognized record'));

    logSpy.mockRestore();
    warningSpy.mockRestore();
  }, 5000);

  it('reads a finalized replacement file when no live bytes were consumed', async () => {
    const logDir = join(testDir, '.warden', 'logs');
    const livePath = join(logDir, 'replace1-2026-04-25T16-00-00-000Z.jsonl');
    const run = buildRunMetadata({
      runId: 'replace1',
      durationMs: 100,
      timestamp: new Date('2026-04-25T16:00:00.000Z'),
      cwd: testDir,
    });
    const chunk: JsonlChunkRecord = {
      schemaVersion: 1,
      run,
      skill: 'final-skill',
      chunk: { file: 'src/a.ts', index: 1, total: 1, lineRange: '10-20' },
      status: 'ok',
      findings: [{
        id: 'FIND-2',
        severity: 'high',
        title: 'Final finding',
        description: 'This should render from the replacement file.',
      }],
      durationMs: 100,
    };

    initJsonlFile(livePath);
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const writes: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((chunk = '') => {
      writes.push(String(chunk));
    });

    const reporter = createTestReporter();
    const followPromise = runRunsFollow(
      { subcommand: 'follow', files: [] },
      createDefaultOptions(),
      reporter,
    );

    await new Promise((r) => setTimeout(r, 50));
    const finalPath = `${livePath}.tmp`;
    writeFileSync(finalPath, renderJsonlChunkLine(chunk));
    renameSync(finalPath, livePath);
    await new Promise((r) => setTimeout(r, 50));
    writeFileSync(`${livePath}.done`, '');

    const exit = await followPromise;
    expect(exit).toBe(0);
    expect(writes.join('\n')).toContain('Final finding');

    logSpy.mockRestore();
  }, 5000);

  it('with --json, emits finalized replacement records after live records', async () => {
    const logDir = join(testDir, '.warden', 'logs');
    const livePath = join(logDir, 'jsonlive-2026-04-25T16-00-00-000Z.jsonl');
    const run = buildRunMetadata({
      runId: 'jsonlive',
      durationMs: 100,
      timestamp: new Date('2026-04-25T16:00:00.000Z'),
      cwd: testDir,
    });
    const liveChunk: JsonlChunkRecord = {
      schemaVersion: 1,
      run,
      skill: 'json-skill',
      chunk: { file: 'src/a.ts', index: 1, total: 1, lineRange: '10-20' },
      status: 'ok',
      findings: [{ id: 'RAW', severity: 'high', title: 'Raw finding', description: 'raw' }],
      durationMs: 100,
    };
    const finalChunk: JsonlChunkRecord = {
      ...liveChunk,
      findings: [{ id: 'FINAL', severity: 'high', title: 'Final finding', description: 'final' }],
    };

    initJsonlFile(livePath);
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const writes: string[] = [];
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf-8'));
      return true;
    });

    const reporter = createTestReporter();
    const followPromise = runRunsFollow(
      { subcommand: 'follow', files: [] },
      { ...createDefaultOptions(), json: true },
      reporter,
    );

    await new Promise((r) => setTimeout(r, 50));
    appendJsonlLine(livePath, renderJsonlChunkLine(liveChunk));
    await new Promise((r) => setTimeout(r, 50));
    const finalPath = `${livePath}.tmp`;
    writeFileSync(finalPath, renderJsonlChunkLine(finalChunk));
    renameSync(finalPath, livePath);
    await new Promise((r) => setTimeout(r, 50));
    writeFileSync(`${livePath}.done`, '');

    const exit = await followPromise;
    const output = writes.join('');
    expect(exit).toBe(0);
    expect(output).toContain('Raw finding');
    expect(output).toContain('Final finding');

    stdoutSpy.mockRestore();
  }, 5000);

  it('with --json, does not re-emit unchanged replacement records', async () => {
    const logDir = join(testDir, '.warden', 'logs');
    const livePath = join(logDir, 'jsondedupe-2026-04-25T16-00-00-000Z.jsonl');
    const run = buildRunMetadata({
      runId: 'jsondedupe',
      durationMs: 100,
      timestamp: new Date('2026-04-25T16:00:00.000Z'),
      cwd: testDir,
    });
    const chunk: JsonlChunkRecord = {
      schemaVersion: 1,
      run,
      skill: 'json-skill',
      chunk: { file: 'src/a.ts', index: 1, total: 1, lineRange: '10-20' },
      status: 'ok',
      findings: [{ id: 'SAME', severity: 'high', title: 'Same finding', description: 'same' }],
      durationMs: 100,
    };

    initJsonlFile(livePath);
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const writes: string[] = [];
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf-8'));
      return true;
    });

    const reporter = createTestReporter();
    const followPromise = runRunsFollow(
      { subcommand: 'follow', files: [] },
      { ...createDefaultOptions(), json: true },
      reporter,
    );

    const line = renderJsonlChunkLine(chunk);
    await new Promise((r) => setTimeout(r, 50));
    appendJsonlLine(livePath, line);
    await new Promise((r) => setTimeout(r, 50));
    const finalPath = `${livePath}.tmp`;
    writeFileSync(finalPath, line);
    renameSync(finalPath, livePath);
    await new Promise((r) => setTimeout(r, 50));
    writeFileSync(`${livePath}.done`, '');

    const exit = await followPromise;
    const output = writes.join('');
    expect(exit).toBe(0);
    expect(output.match(/Same finding/g)).toHaveLength(1);

    stdoutSpy.mockRestore();
  }, 5000);
});
