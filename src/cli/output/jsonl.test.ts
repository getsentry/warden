import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import {
  writeJsonlReport,
  getRunLogsDir,
  generateRunLogFilename,
  getRunLogPath,
  type JsonlRecord,
} from './jsonl.js';
import type { SkillReport } from '../../types/index.js';

describe('writeJsonlReport', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `warden-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('writes one line per report plus summary', () => {
    const outputPath = join(testDir, 'output.jsonl');
    const reports: SkillReport[] = [
      {
        skill: 'security-review',
        summary: 'Found 1 issue',
        findings: [
          {
            id: 'sec-001',
            severity: 'high',
            title: 'SQL Injection',
            description: 'User input passed directly to query',
          },
        ],
        durationMs: 1234,
      },
      {
        skill: 'code-review',
        summary: 'No issues',
        findings: [],
        durationMs: 567,
      },
    ];

    writeJsonlReport(outputPath, reports, 2000);

    expect(existsSync(outputPath)).toBe(true);

    const content = readFileSync(outputPath, 'utf-8');
    const lines = content.trim().split('\n');

    // 2 reports + 1 summary = 3 lines
    expect(lines.length).toBe(3);

    // First line: security-review report
    const record1 = JSON.parse(lines[0]!) as JsonlRecord;
    expect(record1.skill).toBe('security-review');
    expect(record1.findings.length).toBe(1);
    expect(record1.findings[0]!.id).toBe('sec-001');
    expect(record1.durationMs).toBe(1234);
    expect(record1.run.durationMs).toBe(2000);
    expect(record1.run.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Second line: code-review report
    const record2 = JSON.parse(lines[1]!) as JsonlRecord;
    expect(record2.skill).toBe('code-review');
    expect(record2.findings.length).toBe(0);

    // Third line: summary
    const summary = JSON.parse(lines[2]!);
    expect(summary.type).toBe('summary');
    expect(summary.totalFindings).toBe(1);
    expect(summary.bySeverity.high).toBe(1);
  });

  it('handles empty reports', () => {
    const outputPath = join(testDir, 'empty.jsonl');

    writeJsonlReport(outputPath, [], 500);

    const content = readFileSync(outputPath, 'utf-8');
    const lines = content.trim().split('\n');

    // Just the summary line
    expect(lines.length).toBe(1);

    const summary = JSON.parse(lines[0]!);
    expect(summary.type).toBe('summary');
    expect(summary.totalFindings).toBe(0);
  });

  it('aggregates usage stats in summary', () => {
    const outputPath = join(testDir, 'usage.jsonl');
    const reports: SkillReport[] = [
      {
        skill: 'skill-1',
        summary: 'Done',
        findings: [],
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheReadInputTokens: 10,
          cacheCreationInputTokens: 5,
          costUSD: 0.001,
        },
      },
      {
        skill: 'skill-2',
        summary: 'Done',
        findings: [],
        usage: {
          inputTokens: 200,
          outputTokens: 100,
          cacheReadInputTokens: 20,
          cacheCreationInputTokens: 10,
          costUSD: 0.002,
        },
      },
    ];

    writeJsonlReport(outputPath, reports, 1000);

    const content = readFileSync(outputPath, 'utf-8');
    const lines = content.trim().split('\n');
    const summary = JSON.parse(lines[2]!);

    expect(summary.usage.inputTokens).toBe(300);
    expect(summary.usage.outputTokens).toBe(150);
    expect(summary.usage.cacheReadInputTokens).toBe(30);
    expect(summary.usage.cacheCreationInputTokens).toBe(15);
    expect(summary.usage.costUSD).toBeCloseTo(0.003);
  });

  it('creates parent directories if they do not exist', () => {
    const outputPath = join(testDir, 'nested', 'deep', 'output.jsonl');

    writeJsonlReport(outputPath, [], 100);

    expect(existsSync(outputPath)).toBe(true);
    const content = readFileSync(outputPath, 'utf-8');
    const summary = JSON.parse(content.trim());
    expect(summary.type).toBe('summary');
  });

  it('counts findings by severity in summary', () => {
    const outputPath = join(testDir, 'severity.jsonl');
    const reports: SkillReport[] = [
      {
        skill: 'review',
        summary: 'Issues found',
        findings: [
          { id: '1', severity: 'critical', title: 'A', description: 'A' },
          { id: '2', severity: 'high', title: 'B', description: 'B' },
          { id: '3', severity: 'high', title: 'C', description: 'C' },
          { id: '4', severity: 'medium', title: 'D', description: 'D' },
          { id: '5', severity: 'low', title: 'E', description: 'E' },
          { id: '6', severity: 'info', title: 'F', description: 'F' },
        ],
      },
    ];

    writeJsonlReport(outputPath, reports, 1000);

    const content = readFileSync(outputPath, 'utf-8');
    const lines = content.trim().split('\n');
    const summary = JSON.parse(lines[1]!);

    expect(summary.totalFindings).toBe(6);
    expect(summary.bySeverity.critical).toBe(1);
    expect(summary.bySeverity.high).toBe(2);
    expect(summary.bySeverity.medium).toBe(1);
    expect(summary.bySeverity.low).toBe(1);
    expect(summary.bySeverity.info).toBe(1);
  });
});

describe('getRunLogsDir', () => {
  const originalEnv = process.env['WARDEN_STATE_DIR'];

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['WARDEN_STATE_DIR'];
    } else {
      process.env['WARDEN_STATE_DIR'] = originalEnv;
    }
  });

  it('returns default path when WARDEN_STATE_DIR is not set', () => {
    delete process.env['WARDEN_STATE_DIR'];
    const result = getRunLogsDir();
    expect(result).toBe(join(homedir(), '.local', 'warden', 'runs'));
  });

  it('uses WARDEN_STATE_DIR when set', () => {
    process.env['WARDEN_STATE_DIR'] = '/custom/state';
    const result = getRunLogsDir();
    expect(result).toBe('/custom/state/runs');
  });
});

describe('generateRunLogFilename', () => {
  it('generates filename with directory name and timestamp', () => {
    const timestamp = new Date('2026-01-29T14:32:15.123Z');
    const result = generateRunLogFilename('/path/to/my-project', timestamp);
    expect(result).toBe('my-project_2026-01-29T14-32-15.123Z.jsonl');
  });

  it('replaces colons in timestamp with hyphens', () => {
    const timestamp = new Date('2026-01-29T10:05:30.000Z');
    const result = generateRunLogFilename('/some/dir', timestamp);
    expect(result).toMatch(/^\w+_2026-01-29T10-05-30\.000Z\.jsonl$/);
  });

  it('uses "unknown" for empty directory name', () => {
    const timestamp = new Date('2026-01-29T12:00:00.000Z');
    const result = generateRunLogFilename('/', timestamp);
    expect(result).toBe('unknown_2026-01-29T12-00-00.000Z.jsonl');
  });

  it('handles directory paths with trailing slash', () => {
    const timestamp = new Date('2026-01-29T12:00:00.000Z');
    // basename handles trailing slashes, so /foo/bar/ becomes 'bar'
    const result = generateRunLogFilename('/foo/bar', timestamp);
    expect(result).toBe('bar_2026-01-29T12-00-00.000Z.jsonl');
  });
});

describe('getRunLogPath', () => {
  const originalEnv = process.env['WARDEN_STATE_DIR'];

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['WARDEN_STATE_DIR'];
    } else {
      process.env['WARDEN_STATE_DIR'] = originalEnv;
    }
  });

  it('returns full path combining logs dir and filename', () => {
    delete process.env['WARDEN_STATE_DIR'];
    const timestamp = new Date('2026-01-29T14:32:15.123Z');
    const result = getRunLogPath('/path/to/warden', timestamp);
    expect(result).toBe(
      join(homedir(), '.local', 'warden', 'runs', 'warden_2026-01-29T14-32-15.123Z.jsonl')
    );
  });

  it('respects WARDEN_STATE_DIR', () => {
    process.env['WARDEN_STATE_DIR'] = '/custom/dir';
    const timestamp = new Date('2026-01-29T14:32:15.123Z');
    const result = getRunLogPath('/my/project', timestamp);
    expect(result).toBe('/custom/dir/runs/project_2026-01-29T14-32-15.123Z.jsonl');
  });
});

describe('automatic run logging integration', () => {
  let testStateDir: string;
  const originalEnv = process.env['WARDEN_STATE_DIR'];

  beforeEach(() => {
    testStateDir = join(tmpdir(), `warden-state-${Date.now()}`);
    process.env['WARDEN_STATE_DIR'] = testStateDir;
  });

  afterEach(() => {
    if (existsSync(testStateDir)) {
      rmSync(testStateDir, { recursive: true });
    }
    if (originalEnv === undefined) {
      delete process.env['WARDEN_STATE_DIR'];
    } else {
      process.env['WARDEN_STATE_DIR'] = originalEnv;
    }
  });

  it('writes run log to auto-generated path', () => {
    const reports: SkillReport[] = [
      {
        skill: 'test-skill',
        summary: 'Test complete',
        findings: [
          { id: 'test-1', severity: 'low', title: 'Test', description: 'Test finding' },
        ],
        durationMs: 100,
      },
    ];

    const timestamp = new Date('2026-01-29T14:32:15.123Z');
    const runLogPath = getRunLogPath('/path/to/my-project', timestamp);

    writeJsonlReport(runLogPath, reports, 500);

    // Verify file was created at expected location
    expect(existsSync(runLogPath)).toBe(true);
    expect(runLogPath).toBe(join(testStateDir, 'runs', 'my-project_2026-01-29T14-32-15.123Z.jsonl'));

    // Verify content
    const content = readFileSync(runLogPath, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines.length).toBe(2); // 1 report + 1 summary

    const record = JSON.parse(lines[0]!) as JsonlRecord;
    expect(record.skill).toBe('test-skill');
    expect(record.findings.length).toBe(1);
  });

  it('creates nested runs directory automatically', () => {
    const runLogPath = getRunLogPath('/some/project', new Date());

    // Directory shouldn't exist yet
    expect(existsSync(join(testStateDir, 'runs'))).toBe(false);

    writeJsonlReport(runLogPath, [], 100);

    // Now it should exist with the file
    expect(existsSync(runLogPath)).toBe(true);
  });

  it('handles multiple runs with unique timestamps', () => {
    const timestamp1 = new Date('2026-01-29T14:00:00.000Z');
    const timestamp2 = new Date('2026-01-29T14:01:00.000Z');

    const path1 = getRunLogPath('/project', timestamp1);
    const path2 = getRunLogPath('/project', timestamp2);

    expect(path1).not.toBe(path2);

    writeJsonlReport(path1, [], 100);
    writeJsonlReport(path2, [], 200);

    expect(existsSync(path1)).toBe(true);
    expect(existsSync(path2)).toBe(true);

    // Verify they have different durations
    const content1 = JSON.parse(readFileSync(path1, 'utf-8').trim());
    const content2 = JSON.parse(readFileSync(path2, 'utf-8').trim());
    expect(content1.run.durationMs).toBe(100);
    expect(content2.run.durationMs).toBe(200);
  });
});
