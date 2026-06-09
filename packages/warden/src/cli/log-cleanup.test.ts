import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { findExpiredArtifacts, cleanupArtifacts } from './log-cleanup.js';
import { Reporter } from './output/reporter.js';
import { detectOutputMode } from './output/tty.js';
import { Verbosity } from './output/verbosity.js';

function createReporter(): Reporter {
  const mode = detectOutputMode();
  return new Reporter({ ...mode, isTTY: false }, Verbosity.Normal);
}

function createLogFile(dir: string, name: string, daysOld: number): string {
  const filePath = join(dir, name);
  writeFileSync(filePath, '{"type":"summary"}\n');
  const mtime = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  utimesSync(filePath, mtime, mtime);
  return filePath;
}

describe('findExpiredArtifacts', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `warden-cleanup-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('returns empty array when directory does not exist', () => {
    const result = findExpiredArtifacts('/nonexistent/path', 30);
    expect(result).toEqual([]);
  });

  it('returns empty array when no files are expired', () => {
    createLogFile(testDir, 'recent.jsonl', 1);
    const result = findExpiredArtifacts(testDir, 30);
    expect(result).toEqual([]);
  });

  it('returns expired .jsonl files', () => {
    createLogFile(testDir, 'old.jsonl', 45);
    createLogFile(testDir, 'recent.jsonl', 1);

    const result = findExpiredArtifacts(testDir, 30);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('old.jsonl');
  });

  it('ignores non-.jsonl files', () => {
    const nonJsonl = join(testDir, 'old.txt');
    writeFileSync(nonJsonl, 'not a log');
    const mtime = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    utimesSync(nonJsonl, mtime, mtime);

    const result = findExpiredArtifacts(testDir, 30);
    expect(result).toEqual([]);
  });

  it('respects custom retention days', () => {
    createLogFile(testDir, 'a.jsonl', 10);
    createLogFile(testDir, 'b.jsonl', 3);

    expect(findExpiredArtifacts(testDir, 7)).toHaveLength(1);
    expect(findExpiredArtifacts(testDir, 2)).toHaveLength(2);
    expect(findExpiredArtifacts(testDir, 15)).toHaveLength(0);
  });
});

describe('cleanupArtifacts', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `warden-cleanup-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('does nothing in "never" mode', async () => {
    createLogFile(testDir, 'old.jsonl', 45);

    const deleted = await cleanupArtifacts({
      dir: testDir,
      retentionDays: 30,
      mode: 'never',
      isTTY: false,
      reporter: createReporter(),
    });

    expect(deleted).toBe(0);
    expect(existsSync(join(testDir, 'old.jsonl'))).toBe(true);
  });

  it('silently deletes in "auto" mode', async () => {
    createLogFile(testDir, 'old.jsonl', 45);
    createLogFile(testDir, 'recent.jsonl', 1);

    const deleted = await cleanupArtifacts({
      dir: testDir,
      retentionDays: 30,
      mode: 'auto',
      isTTY: false,
      reporter: createReporter(),
    });

    expect(deleted).toBe(1);
    expect(existsSync(join(testDir, 'old.jsonl'))).toBe(false);
    expect(existsSync(join(testDir, 'recent.jsonl'))).toBe(true);
  });

  it('does nothing in "ask" mode when not TTY', async () => {
    createLogFile(testDir, 'old.jsonl', 45);

    const deleted = await cleanupArtifacts({
      dir: testDir,
      retentionDays: 30,
      mode: 'ask',
      isTTY: false,
      reporter: createReporter(),
    });

    expect(deleted).toBe(0);
    expect(existsSync(join(testDir, 'old.jsonl'))).toBe(true);
  });

  it('returns 0 when no expired files exist', async () => {
    createLogFile(testDir, 'recent.jsonl', 1);

    const deleted = await cleanupArtifacts({
      dir: testDir,
      retentionDays: 30,
      mode: 'auto',
      isTTY: false,
      reporter: createReporter(),
    });

    expect(deleted).toBe(0);
  });

  it('returns 0 when dir does not exist', async () => {
    const deleted = await cleanupArtifacts({
      dir: '/nonexistent/path',
      retentionDays: 30,
      mode: 'auto',
      isTTY: false,
      reporter: createReporter(),
    });

    expect(deleted).toBe(0);
  });
});
