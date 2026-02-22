import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { renderJsonlString } from '../output/jsonl.js';
import type { SkillReport } from '../../types/index.js';
import { runLogsList, runLogsShow, runLogsGc } from './logs.js';
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

describe('runLogsList', () => {
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

    const exitCode = await runLogsList(options, reporter);
    expect(exitCode).toBe(0);
  });

  it('returns 0 with warning when no logs exist', async () => {
    // Empty log dir
    vi.spyOn(await import('../git.js'), 'getRepoRoot').mockReturnValue(testDir);

    const reporter = createTestReporter();
    const options = createDefaultOptions();

    const exitCode = await runLogsList(options, reporter);
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

    const exitCode = await runLogsList(options, reporter);
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

describe('runLogsShow', () => {
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

    const exitCode = await runLogsShow(
      { subcommand: 'show', files: [filePath] },
      options,
      reporter,
    );
    expect(exitCode).toBe(0);
  });

  it('returns error when no files specified', async () => {
    const reporter = createTestReporter();
    const options = createDefaultOptions();

    const exitCode = await runLogsShow(
      { subcommand: 'show', files: [] },
      options,
      reporter,
    );
    expect(exitCode).toBe(1);
  });

  it('returns error when file does not exist', async () => {
    const reporter = createTestReporter();
    const options = createDefaultOptions();

    const exitCode = await runLogsShow(
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

    const exitCode = await runLogsShow(
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

    const exitCode = await runLogsShow(
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

describe('runLogsGc', () => {
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

    const exitCode = await runLogsGc(options, reporter);
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

    const exitCode = await runLogsGc(options, reporter);
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

    const exitCode = await runLogsGc(options, reporter);
    expect(exitCode).toBe(0);

    // Recent file should still exist
    expect(existsSync(recentPath)).toBe(true);
    // Old file should be deleted
    expect(existsSync(oldPath)).toBe(false);
  });
});
