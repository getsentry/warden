import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  writeJsonlReport,
  getRepoLogPath,
  generateRunId,
  shortRunId,
  readJsonlLog,
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
    expect(record1.run.runId).toBeDefined();

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

  it('uses provided runId in metadata', () => {
    const outputPath = join(testDir, 'output.jsonl');
    const runId = 'test-run-id-1234';

    writeJsonlReport(outputPath, [], 500, { runId });

    const content = readFileSync(outputPath, 'utf-8');
    const summary = JSON.parse(content.trim());
    expect(summary.run.runId).toBe(runId);
  });

  it('generates runId when not provided', () => {
    const outputPath = join(testDir, 'output.jsonl');

    writeJsonlReport(outputPath, [], 500);

    const content = readFileSync(outputPath, 'utf-8');
    const summary = JSON.parse(content.trim());
    expect(summary.run.runId).toBeDefined();
    expect(typeof summary.run.runId).toBe('string');
    expect(summary.run.runId.length).toBeGreaterThan(0);
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

  it('includes per-file records when files are present on report', () => {
    const outputPath = join(testDir, 'files.jsonl');
    const reports: SkillReport[] = [
      {
        skill: 'security-review',
        summary: 'Found 1 issue',
        findings: [
          { id: 'sec-001', severity: 'high', title: 'SQL Injection', description: 'Bad' },
        ],
        durationMs: 2000,
        usage: { inputTokens: 5000, outputTokens: 800, costUSD: 0.005 },
        files: [
          { filename: 'src/api.ts', findingCount: 1, durationMs: 1200, usage: { inputTokens: 3000, outputTokens: 500, costUSD: 0.003 } },
          { filename: 'src/utils.ts', findingCount: 0, durationMs: 800, usage: { inputTokens: 2000, outputTokens: 300, costUSD: 0.002 } },
        ],
      },
    ];

    writeJsonlReport(outputPath, reports, 3000);

    const content = readFileSync(outputPath, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines.length).toBe(2); // 1 report + 1 summary

    const record = JSON.parse(lines[0]!) as JsonlRecord;
    expect(record.files).toBeDefined();
    expect(record.files!.length).toBe(2);
    expect(record.files![0]!.filename).toBe('src/api.ts');
    expect(record.files![0]!.findings).toBe(1);
    expect(record.files![0]!.durationMs).toBe(1200);
    expect(record.files![0]!.usage?.costUSD).toBe(0.003);
    expect(record.files![1]!.filename).toBe('src/utils.ts');
    expect(record.files![1]!.findings).toBe(0);
  });

  it('omits files field when report has no files', () => {
    const outputPath = join(testDir, 'nofiles.jsonl');
    const reports: SkillReport[] = [
      {
        skill: 'code-review',
        summary: 'No issues',
        findings: [],
        durationMs: 500,
      },
    ];

    writeJsonlReport(outputPath, reports, 1000);

    const content = readFileSync(outputPath, 'utf-8');
    const lines = content.trim().split('\n');
    const record = JSON.parse(lines[0]!) as JsonlRecord;
    expect(record.files).toBeUndefined();
  });

  it('includes skippedFiles in per-skill record when present', () => {
    const outputPath = join(testDir, 'skipped.jsonl');
    const reports: SkillReport[] = [
      {
        skill: 'security-review',
        summary: 'Done',
        findings: [],
        skippedFiles: [
          { filename: 'dist/bundle.js', reason: 'builtin' },
          { filename: 'logo.png', reason: 'pattern', pattern: '*.png' },
        ],
      },
    ];

    writeJsonlReport(outputPath, reports, 1000);

    const content = readFileSync(outputPath, 'utf-8');
    const lines = content.trim().split('\n');
    const record = JSON.parse(lines[0]!) as JsonlRecord;
    expect(record.skippedFiles).toBeDefined();
    expect(record.skippedFiles!.length).toBe(2);
    expect(record.skippedFiles![0]!.filename).toBe('dist/bundle.js');
    expect(record.skippedFiles![0]!.reason).toBe('builtin');
  });

  it('omits skippedFiles when none present', () => {
    const outputPath = join(testDir, 'noskipped.jsonl');
    const reports: SkillReport[] = [
      { skill: 'review', summary: 'Done', findings: [] },
    ];

    writeJsonlReport(outputPath, reports, 500);

    const content = readFileSync(outputPath, 'utf-8');
    const lines = content.trim().split('\n');
    const record = JSON.parse(lines[0]!) as JsonlRecord;
    expect(record.skippedFiles).toBeUndefined();
  });

  it('includes totalSkippedFiles in summary when files were skipped', () => {
    const outputPath = join(testDir, 'skipsummary.jsonl');
    const reports: SkillReport[] = [
      {
        skill: 'skill-1',
        summary: 'Done',
        findings: [],
        skippedFiles: [
          { filename: 'a.min.js', reason: 'builtin' },
        ],
      },
      {
        skill: 'skill-2',
        summary: 'Done',
        findings: [],
        skippedFiles: [
          { filename: 'b.min.js', reason: 'builtin' },
          { filename: 'c.png', reason: 'pattern', pattern: '*.png' },
        ],
      },
    ];

    writeJsonlReport(outputPath, reports, 1000);

    const content = readFileSync(outputPath, 'utf-8');
    const lines = content.trim().split('\n');
    const summary = JSON.parse(lines[2]!);
    expect(summary.totalSkippedFiles).toBe(3);
  });

  it('omits totalSkippedFiles from summary when none skipped', () => {
    const outputPath = join(testDir, 'noskipsummary.jsonl');
    const reports: SkillReport[] = [
      { skill: 'review', summary: 'Done', findings: [] },
    ];

    writeJsonlReport(outputPath, reports, 500);

    const content = readFileSync(outputPath, 'utf-8');
    const lines = content.trim().split('\n');
    const summary = JSON.parse(lines[1]!);
    expect(summary.type).toBe('summary');
    expect(summary.totalSkippedFiles).toBeUndefined();
  });

  it('aggregates auxiliary usage in summary', () => {
    const outputPath = join(testDir, 'aux.jsonl');
    const reports: SkillReport[] = [
      {
        skill: 'skill-1',
        summary: 'Done',
        findings: [],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
        auxiliaryUsage: {
          extraction: { inputTokens: 20, outputTokens: 10, costUSD: 0.0001 },
        },
      },
      {
        skill: 'skill-2',
        summary: 'Done',
        findings: [],
        usage: { inputTokens: 200, outputTokens: 100, costUSD: 0.002 },
        auxiliaryUsage: {
          extraction: { inputTokens: 30, outputTokens: 15, costUSD: 0.0002 },
        },
      },
    ];

    writeJsonlReport(outputPath, reports, 1000);

    const content = readFileSync(outputPath, 'utf-8');
    const lines = content.trim().split('\n');
    const summary = JSON.parse(lines[2]!);

    expect(summary.auxiliaryUsage).toBeDefined();
    expect(summary.auxiliaryUsage.extraction.inputTokens).toBe(50);
    expect(summary.auxiliaryUsage.extraction.outputTokens).toBe(25);
    expect(summary.auxiliaryUsage.extraction.costUSD).toBeCloseTo(0.0003);
  });

  it('omits auxiliary usage from summary when none present', () => {
    const outputPath = join(testDir, 'noaux.jsonl');
    const reports: SkillReport[] = [
      {
        skill: 'skill-1',
        summary: 'Done',
        findings: [],
        usage: { inputTokens: 100, outputTokens: 50, costUSD: 0.001 },
      },
    ];

    writeJsonlReport(outputPath, reports, 1000);

    const content = readFileSync(outputPath, 'utf-8');
    const lines = content.trim().split('\n');
    const summary = JSON.parse(lines[1]!);

    expect(summary.auxiliaryUsage).toBeUndefined();
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

describe('generateRunId', () => {
  it('returns a valid UUID string', () => {
    const id = generateRunId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('returns unique IDs', () => {
    const id1 = generateRunId();
    const id2 = generateRunId();
    expect(id1).not.toBe(id2);
  });
});

describe('shortRunId', () => {
  it('returns first 8 hex chars without dashes', () => {
    const result = shortRunId('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(result).toBe('a1b2c3d4');
  });

  it('handles UUIDs with different values', () => {
    const result = shortRunId('12345678-90ab-cdef-1234-567890abcdef');
    expect(result).toBe('12345678');
  });
});

describe('getRepoLogPath', () => {
  it('returns path under .warden/logs/', () => {
    const timestamp = new Date('2026-02-18T14:32:15.123Z');
    const result = getRepoLogPath('/path/to/repo', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', timestamp);
    expect(result).toBe('/path/to/repo/.warden/logs/2026-02-18T14-32-15.123Z-a1b2c3d4.jsonl');
  });

  it('replaces colons in timestamp with hyphens', () => {
    const timestamp = new Date('2026-02-18T10:05:30.000Z');
    const result = getRepoLogPath('/repo', 'abcdef12-3456-7890-abcd-ef1234567890', timestamp);
    expect(result).toMatch(/2026-02-18T10-05-30\.000Z-abcdef12\.jsonl$/);
  });

  it('uses different runId for different paths', () => {
    const timestamp = new Date('2026-02-18T14:00:00.000Z');
    const path1 = getRepoLogPath('/repo', '11111111-2222-3333-4444-555555555555', timestamp);
    const path2 = getRepoLogPath('/repo', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', timestamp);
    expect(path1).not.toBe(path2);
  });
});

describe('readJsonlLog', () => {
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

  it('reads back JSONL log file contents', () => {
    const outputPath = join(testDir, 'read-test.jsonl');
    writeJsonlReport(outputPath, [], 100);

    const content = readJsonlLog(outputPath);
    const parsed = JSON.parse(content.trim());
    expect(parsed.type).toBe('summary');
    expect(parsed.totalFindings).toBe(0);
  });
});

describe('repo-local logging integration', () => {
  let testRepoDir: string;

  beforeEach(() => {
    testRepoDir = join(tmpdir(), `warden-repo-${Date.now()}`);
    mkdirSync(testRepoDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testRepoDir)) {
      rmSync(testRepoDir, { recursive: true });
    }
  });

  it('writes run log to repo-local .warden/logs/', () => {
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

    const runId = 'deadbeef-1234-5678-9abc-def012345678';
    const timestamp = new Date('2026-02-18T14:32:15.123Z');
    const logPath = getRepoLogPath(testRepoDir, runId, timestamp);

    writeJsonlReport(logPath, reports, 500, { runId });

    // Verify file was created at expected location
    expect(existsSync(logPath)).toBe(true);
    expect(logPath).toContain('.warden/logs/');
    expect(logPath).toContain('deadbeef');

    // Verify content
    const content = readFileSync(logPath, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines.length).toBe(2); // 1 report + 1 summary

    const record = JSON.parse(lines[0]!) as JsonlRecord;
    expect(record.skill).toBe('test-skill');
    expect(record.findings.length).toBe(1);
    expect(record.run.runId).toBe(runId);
  });

  it('creates nested .warden/logs directory automatically', () => {
    const runId = generateRunId();
    const logPath = getRepoLogPath(testRepoDir, runId);

    writeJsonlReport(logPath, [], 100, { runId });

    expect(existsSync(logPath)).toBe(true);
  });

  it('handles multiple runs with unique run IDs', () => {
    const timestamp = new Date('2026-02-18T14:00:00.000Z');
    const runId1 = generateRunId();
    const runId2 = generateRunId();

    const path1 = getRepoLogPath(testRepoDir, runId1, timestamp);
    const path2 = getRepoLogPath(testRepoDir, runId2, timestamp);

    expect(path1).not.toBe(path2);

    writeJsonlReport(path1, [], 100, { runId: runId1 });
    writeJsonlReport(path2, [], 200, { runId: runId2 });

    expect(existsSync(path1)).toBe(true);
    expect(existsSync(path2)).toBe(true);

    const content1 = JSON.parse(readFileSync(path1, 'utf-8').trim());
    const content2 = JSON.parse(readFileSync(path2, 'utf-8').trim());
    expect(content1.run.durationMs).toBe(100);
    expect(content2.run.durationMs).toBe(200);
    expect(content1.run.runId).toBe(runId1);
    expect(content2.run.runId).toBe(runId2);
  });
});
