import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import {
  writeJsonlReport,
  getRepoLogPath,
  generateRunId,
  shortRunId,
  readJsonlLog,
  parseJsonlReports,
  parseLogMetadata,
  JsonlChunkRecordSchema,
  JsonlRecordSchema,
  JsonlSummaryRecordSchema,
  JsonlFixEvaluationRecordSchema,
  renderJsonlChunkLine,
  renderJsonlChunkRecords,
  renderJsonlString,
  renderJsonlSkillLine,
  renderJsonlSummaryLine,
  buildRunMetadata,
  initJsonlFile,
  appendJsonlLine,
  type JsonlChunkRecord,
  type JsonlRecord,
  type JsonlSummaryRecord,
} from './jsonl.js';
import type { HunkTrace, SkillReport } from '../../types/index.js';

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
          { filename: 'src/api.ts', findings: 1, durationMs: 1200, usage: { inputTokens: 3000, outputTokens: 500, costUSD: 0.003 } },
          { filename: 'src/utils.ts', findings: 0, durationMs: 800, usage: { inputTokens: 2000, outputTokens: 300, costUSD: 0.002 } },
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
          { id: '1', severity: 'high', title: 'A', description: 'A' },
          { id: '2', severity: 'high', title: 'B', description: 'B' },
          { id: '3', severity: 'medium', title: 'C', description: 'C' },
          { id: '4', severity: 'medium', title: 'D', description: 'D' },
          { id: '5', severity: 'low', title: 'E', description: 'E' },
          { id: '6', severity: 'low', title: 'F', description: 'F' },
        ],
      },
    ];

    writeJsonlReport(outputPath, reports, 1000);

    const content = readFileSync(outputPath, 'utf-8');
    const lines = content.trim().split('\n');
    const summary = JSON.parse(lines[1]!);

    expect(summary.totalFindings).toBe(6);
    expect(summary.bySeverity.high).toBe(2);
    expect(summary.bySeverity.medium).toBe(2);
    expect(summary.bySeverity.low).toBe(2);
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
    expect(result).toBe('/path/to/repo/.warden/logs/a1b2c3d4-2026-02-18T14-32-15-123Z.jsonl');
  });

  it('replaces colons and dots in timestamp with hyphens', () => {
    const timestamp = new Date('2026-02-18T10:05:30.000Z');
    const result = getRepoLogPath('/repo', 'abcdef12-3456-7890-abcd-ef1234567890', timestamp);
    expect(result).toMatch(/abcdef12-2026-02-18T10-05-30-000Z\.jsonl$/);
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

describe('parseLogMetadata', () => {
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

  it('does not count synthetic empty chunk files', () => {
    const run = buildRunMetadata({ runId: 'metadata-run-error', durationMs: 120 });
    const chunk: JsonlChunkRecord = {
      schemaVersion: 1,
      run,
      skill: 'run',
      chunk: { file: '', index: 1, total: 1, lineRange: '' },
      status: 'error',
      findings: [],
      durationMs: 120,
      error: { code: 'auth_failed', message: 'bad key' },
    };
    const outputPath = join(testDir, 'run-error.jsonl');

    writeFileSync(outputPath, renderJsonlChunkLine(chunk));

    expect(parseLogMetadata(outputPath)?.totalFiles).toBe(0);
  });
});

describe('parseJsonlReports', () => {
  it('reconstructs SkillReport from JSONL content', () => {
    // Sample JSONL content that matches what would be written by renderJsonlString
    const jsonlContent = `{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":2000,"cwd":"/test","runId":"test-123"},"skill":"security-review","summary":"Found 2 issues","findings":[{"id":"sec-001","severity":"high","title":"SQL Injection","description":"User input passed directly to query"},{"id":"sec-002","severity":"medium","title":"XSS Risk","description":"Unescaped output"}],"durationMs":1234,"usage":{"inputTokens":1000,"outputTokens":500,"costUSD":0.01}}
{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":2000,"cwd":"/test","runId":"test-123"},"type":"summary","totalFindings":2,"bySeverity":{"high":1,"medium":1,"low":0},"usage":{"inputTokens":1000,"outputTokens":500,"costUSD":0.01}}
`;

    const result = parseJsonlReports(jsonlContent);

    expect(result.reports.length).toBe(1);
    expect(result.reports[0]!.skill).toBe('security-review');
    expect(result.reports[0]!.findings.length).toBe(2);
    expect(result.reports[0]!.findings[0]!.id).toBe('sec-001');
    expect(result.reports[0]!.durationMs).toBe(1234);
    expect(result.reports[0]!.usage?.inputTokens).toBe(1000);
    expect(result.totalDurationMs).toBe(2000);
    expect(result.runMetadata?.runId).toBe('test-123');
  });

  it('handles multiple skill records', () => {
    const jsonlContent = `{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":3000,"cwd":"/test","runId":"multi-123"},"skill":"skill-1","summary":"Done","findings":[],"durationMs":1000}
{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":3000,"cwd":"/test","runId":"multi-123"},"skill":"skill-2","summary":"Issues found","findings":[{"id":"a","severity":"low","title":"A","description":"A"}],"durationMs":2000}
{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":3000,"cwd":"/test","runId":"multi-123"},"type":"summary","totalFindings":1,"bySeverity":{"high":0,"medium":0,"low":1}}
`;

    const result = parseJsonlReports(jsonlContent);

    expect(result.reports.length).toBe(2);
    expect(result.reports[0]!.skill).toBe('skill-1');
    expect(result.reports[1]!.skill).toBe('skill-2');
    expect(result.reports[1]!.findings.length).toBe(1);
    expect(result.totalDurationMs).toBe(3000);
  });

  it('handles empty logs (summary only)', () => {
    const jsonlContent = `{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":100,"cwd":"/test","runId":"empty-123"},"type":"summary","totalFindings":0,"bySeverity":{"high":0,"medium":0,"low":0}}
`;

    const result = parseJsonlReports(jsonlContent);

    expect(result.reports.length).toBe(0);
    expect(result.totalDurationMs).toBe(100);
    expect(result.runMetadata?.runId).toBe('empty-123');
  });

  it('reconstructs skill reports from homogeneous chunk records', () => {
    const run = buildRunMetadata({
      runId: 'chunk-123',
      durationMs: 100,
      timestamp: new Date('2026-02-18T14:32:15.123Z'),
      cwd: '/test',
      model: 'claude-test',
    });
    const chunks: JsonlChunkRecord[] = [
      {
        schemaVersion: 1,
        run,
        skill: 'security-review',
        model: 'claude-test',
        chunk: { file: 'src/api.ts', index: 1, total: 2, lineRange: '10-20' },
        status: 'ok',
        findings: [{ id: 'sec-001', severity: 'high', title: 'SQL Injection', description: 'Unsafe query' }],
        usage: { inputTokens: 1000, outputTokens: 500, costUSD: 0.01 },
        durationMs: 1200,
      },
      {
        schemaVersion: 1,
        run: { ...run, durationMs: 2500 },
        skill: 'security-review',
        model: 'claude-test',
        chunk: { file: 'src/api.ts', index: 2, total: 2, lineRange: '21-30' },
        status: 'ok',
        findings: [],
        usage: { inputTokens: 800, outputTokens: 200, costUSD: 0.005 },
        durationMs: 900,
      },
    ];

    const result = parseJsonlReports(chunks.map((chunk) => renderJsonlChunkLine(chunk)).join(''));

    expect(result.reports).toHaveLength(1);
    expect(result.reports[0]!.skill).toBe('security-review');
    expect(result.reports[0]!.findings).toHaveLength(1);
    expect(result.reports[0]!.files).toEqual([
      {
        filename: 'src/api.ts',
        findings: 1,
        durationMs: 2100,
        usage: {
          inputTokens: 1800,
          outputTokens: 700,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
          cacheCreation5mInputTokens: 0,
          cacheCreation1hInputTokens: 0,
          webSearchRequests: 0,
          costUSD: 0.015,
        },
      },
    ]);
    expect(result.reports[0]!.usage?.inputTokens).toBe(1800);
    expect(result.totalDurationMs).toBe(2500);
    expect(result.runMetadata?.runId).toBe('chunk-123');
  });

  it('classifies chunk errors from explicit error codes', () => {
    const run = buildRunMetadata({ runId: 'chunk-errors', durationMs: 300 });
    const chunks: JsonlChunkRecord[] = [
      {
        schemaVersion: 1,
        run,
        skill: 'security-review',
        chunk: { file: 'src/api.ts', index: 1, total: 2, lineRange: '10-20' },
        status: 'error',
        findings: [],
        usage: { inputTokens: 100, outputTokens: 10, costUSD: 0.001 },
        durationMs: 100,
        error: { code: 'extraction_invalid_json', message: 'bad json' },
      },
      {
        schemaVersion: 1,
        run,
        skill: 'security-review',
        chunk: { file: 'src/api.ts', index: 2, total: 2, lineRange: '21-30' },
        status: 'error',
        findings: [],
        usage: { inputTokens: 200, outputTokens: 20, costUSD: 0.002 },
        durationMs: 200,
        error: { code: 'sdk_error', message: 'sdk failed' },
      },
      {
        schemaVersion: 1,
        run,
        skill: 'security-review',
        chunk: { file: '', index: 1, total: 1, lineRange: '' },
        status: 'error',
        findings: [],
        usage: { inputTokens: 300, outputTokens: 30, costUSD: 0.003 },
        durationMs: 300,
        error: { code: 'all_hunks_failed', message: 'All chunks failed.' },
      },
    ];

    const result = parseJsonlReports(chunks.map((chunk) => renderJsonlChunkLine(chunk)).join(''));

    const report = result.reports[0]!;
    expect(report.failedExtractions).toBe(1);
    expect(report.failedHunks).toBe(1);
    expect(report.error?.code).toBe('all_hunks_failed');
    expect(report.hunkFailures?.map((failure) => failure.type)).toEqual(['extraction', 'analysis']);
    expect(report.durationMs).toBe(300);
    expect(report.usage?.inputTokens).toBe(300);
  });

  it('reconstructs trace metadata from chunk records', () => {
    const run = buildRunMetadata({ runId: 'chunk-traces', durationMs: 300 });
    const trace: HunkTrace = {
      filename: 'src/api.ts',
      lineRange: '10-20',
      runtime: 'claude',
      status: 'success',
      traceId: 'trace-123',
      spanId: 'span-123',
      responseId: 'resp-123',
      responseModel: 'claude-test',
      sessionId: 'session-123',
      durationMs: 250,
      durationApiMs: 200,
      numTurns: 2,
      spans: [
        {
          op: 'gen_ai.invoke_agent',
          name: 'invoke_agent security-review',
          traceId: 'trace-123',
          spanId: 'span-invoke',
          attributes: {
            'gen_ai.operation.name': 'invoke_agent',
            'gen_ai.agent.name': 'security-review',
          },
        },
        {
          op: 'gen_ai.chat',
          name: 'chat security-review turn 1',
          traceId: 'trace-123',
          spanId: 'span-chat',
          parentSpanId: 'span-invoke',
          attributes: {
            'gen_ai.operation.name': 'chat',
            'gen_ai.response.finish_reasons': ['stop'],
          },
        },
      ],
    };
    const chunk: JsonlChunkRecord = {
      schemaVersion: 1,
      run,
      skill: 'security-review',
      chunk: { file: 'src/api.ts', index: 1, total: 1, lineRange: '10-20' },
      status: 'ok',
      findings: [],
      durationMs: 300,
      trace,
    };

    const result = parseJsonlReports(renderJsonlChunkLine(chunk));

    expect(result.reports[0]!.traces).toEqual([trace]);
  });

  it('only treats error-status chunks as extraction failures', () => {
    const run = buildRunMetadata({ runId: 'chunk-extraction-status', durationMs: 300 });
    const chunks: JsonlChunkRecord[] = [
      {
        schemaVersion: 1,
        run,
        skill: 'security-review',
        chunk: { file: 'src/api.ts', index: 1, total: 2, lineRange: '10-20' },
        status: 'ok',
        findings: [],
        durationMs: 100,
        error: { code: 'extraction_invalid_json', message: 'ignored metadata' },
      },
      {
        schemaVersion: 1,
        run,
        skill: 'security-review',
        chunk: { file: 'src/api.ts', index: 2, total: 2, lineRange: '21-30' },
        status: 'error',
        findings: [],
        durationMs: 200,
        error: { code: 'extraction_invalid_json', message: 'bad json' },
      },
    ];

    const result = parseJsonlReports(chunks.map((chunk) => renderJsonlChunkLine(chunk)).join(''));

    expect(result.reports[0]!.failedExtractions).toBe(1);
    expect(result.reports[0]!.hunkFailures).toHaveLength(1);
    expect(result.reports[0]!.hunkFailures![0]!.message).toBe('bad json');
  });

  it('does not count error chunks without error details as hunk failures', () => {
    const run = buildRunMetadata({ runId: 'chunk-error-no-detail', durationMs: 100 });
    const chunks: JsonlChunkRecord[] = [
      {
        schemaVersion: 1,
        run,
        skill: 'security-review',
        chunk: { file: 'src/api.ts', index: 1, total: 1, lineRange: '10-20' },
        status: 'error',
        findings: [],
        durationMs: 100,
      },
    ];

    const result = parseJsonlReports(chunks.map((chunk) => renderJsonlChunkLine(chunk)).join(''));

    expect(result.reports[0]!.failedHunks).toBeUndefined();
    expect(result.reports[0]!.hunkFailures).toBeUndefined();
  });

  it('fails chunk content rendering instead of dropping invalid records', () => {
    const run = buildRunMetadata({ runId: 'strict-chunk-render', durationMs: 300 });
    const valid: JsonlChunkRecord = {
      schemaVersion: 1,
      run,
      skill: 'security-review',
      chunk: { file: 'src/api.ts', index: 1, total: 2, lineRange: '10-20' },
      status: 'ok',
      findings: [],
      durationMs: 100,
    };
    const invalid = {
      ...valid,
      chunk: { file: 'src/api.ts', index: 0, total: 2, lineRange: '21-30' },
    } as JsonlChunkRecord;

    expect(() => renderJsonlChunkRecords([valid, invalid])).toThrow();
  });

  it('reconstructs run-level failures from synthetic chunk records', () => {
    const run = buildRunMetadata({ runId: 'run-error', durationMs: 120 });
    const chunk: JsonlChunkRecord = {
      schemaVersion: 1,
      run,
      skill: 'run',
      chunk: { file: '', index: 1, total: 1, lineRange: '' },
      status: 'error',
      findings: [],
      durationMs: 120,
      error: { code: 'auth_failed', message: 'bad key' },
    };

    const result = parseJsonlReports(renderJsonlChunkLine(chunk));

    expect(result.reports).toHaveLength(1);
    expect(result.reports[0]!.skill).toBe('run');
    expect(result.reports[0]!.error?.code).toBe('auth_failed');
    expect(result.reports[0]!.failedHunks).toBeUndefined();
    expect(result.totalDurationMs).toBe(120);
  });

  it('reconstructs skipped-file reports from synthetic chunk records', () => {
    const run = buildRunMetadata({
      runId: 'skipped-123',
      durationMs: 50,
      timestamp: new Date('2026-02-18T14:32:15.123Z'),
      cwd: '/test',
    });
    const chunk: JsonlChunkRecord = {
      schemaVersion: 1,
      run,
      skill: 'generated-review',
      chunk: { file: 'dist/bundle.js', index: 1, total: 1, lineRange: '' },
      status: 'skipped',
      findings: [],
      durationMs: 50,
      skippedFiles: [{ filename: 'dist/bundle.js', reason: 'builtin' }],
    };

    const result = parseJsonlReports(renderJsonlChunkLine(chunk));

    expect(result.reports).toHaveLength(1);
    expect(result.reports[0]!.skill).toBe('generated-review');
    expect(result.reports[0]!.findings).toEqual([]);
    expect(result.reports[0]!.skippedFiles).toEqual([{ filename: 'dist/bundle.js', reason: 'builtin' }]);
  });

  it('skips invalid lines gracefully', () => {
    const jsonlContent = `invalid json here
{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":1000,"cwd":"/test","runId":"partial-123"},"skill":"valid-skill","summary":"OK","findings":[]}
another bad line
{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":1000,"cwd":"/test","runId":"partial-123"},"type":"summary","totalFindings":0,"bySeverity":{"high":0,"medium":0,"low":0}}
`;

    const result = parseJsonlReports(jsonlContent);

    expect(result.reports.length).toBe(1);
    expect(result.reports[0]!.skill).toBe('valid-skill');
  });

  it('reconstructs files array from JSONL', () => {
    const jsonlContent = `{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":2000,"cwd":"/test","runId":"files-123"},"skill":"review","summary":"Done","findings":[],"files":[{"filename":"src/api.ts","findings":1,"durationMs":1200},{"filename":"src/utils.ts","findings":0,"durationMs":800}]}
{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":2000,"cwd":"/test","runId":"files-123"},"type":"summary","totalFindings":1,"bySeverity":{"high":1,"medium":0,"low":0}}
`;

    const result = parseJsonlReports(jsonlContent);

    expect(result.reports[0]!.files).toBeDefined();
    expect(result.reports[0]!.files!.length).toBe(2);
    expect(result.reports[0]!.files![0]!.filename).toBe('src/api.ts');
    expect(result.reports[0]!.files![0]!.findings).toBe(1);
    expect(result.reports[0]!.files![1]!.filename).toBe('src/utils.ts');
  });

  it('handles skippedFiles in reports', () => {
    const jsonlContent = `{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":1000,"cwd":"/test","runId":"skip-123"},"skill":"review","summary":"Done","findings":[],"skippedFiles":[{"filename":"dist/bundle.js","reason":"builtin"}]}
{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":1000,"cwd":"/test","runId":"skip-123"},"type":"summary","totalFindings":0,"bySeverity":{"high":0,"medium":0,"low":0},"totalSkippedFiles":1}
`;

    const result = parseJsonlReports(jsonlContent);

    expect(result.reports[0]!.skippedFiles).toBeDefined();
    expect(result.reports[0]!.skippedFiles!.length).toBe(1);
    expect(result.reports[0]!.skippedFiles![0]!.filename).toBe('dist/bundle.js');
    expect(result.reports[0]!.skippedFiles![0]!.reason).toBe('builtin');
  });

  it('round-trips through write and parse', () => {
    const original: SkillReport[] = [
      {
        skill: 'test-skill',
        summary: 'Found issues',
        findings: [
          { id: 'test-1', severity: 'high', title: 'Test Finding', description: 'Test description' },
        ],
        durationMs: 1500,
        usage: { inputTokens: 500, outputTokens: 250, costUSD: 0.005 },
        files: [
          { filename: 'src/test.ts', findings: 1, durationMs: 1500 },
        ],
      },
    ];

    // Write to JSONL string
    const jsonlContent = renderJsonlString(original, 2000, { runId: 'round-trip-123' });

    // Parse back
    const result = parseJsonlReports(jsonlContent);

    expect(result.reports.length).toBe(1);
    expect(result.reports[0]!.skill).toBe('test-skill');
    expect(result.reports[0]!.summary).toBe('Found issues');
    expect(result.reports[0]!.findings.length).toBe(1);
    expect(result.reports[0]!.findings[0]!.id).toBe('test-1');
    expect(result.reports[0]!.durationMs).toBe(1500);
    expect(result.reports[0]!.usage?.inputTokens).toBe(500);
    expect(result.reports[0]!.files?.length).toBe(1);
    expect(result.reports[0]!.files![0]!.findings).toBe(1);
  });

  it('round-trips SkillReport.error and hunkFailures', () => {
    const original: SkillReport[] = [
      {
        skill: 'security-review',
        summary: 'security-review: failed (all_hunks_failed)',
        findings: [],
        durationMs: 2200,
        failedHunks: 3,
        failedExtractions: 1,
        hunkFailures: [
          {
            type: 'analysis',
            filename: 'src/api.ts',
            lineRange: '10-30',
            code: 'sdk_error',
            message: 'SDK execution failed: rate limit',
            attempts: 3,
          },
          {
            type: 'extraction',
            filename: 'src/api.ts',
            lineRange: '50-70',
            code: 'extraction_invalid_json',
            message: 'invalid_json',
            preview: '{"findings": [bad',
          },
        ],
        error: {
          code: 'all_hunks_failed',
          message: 'All 3 chunks failed to analyze.',
          timestamp: '2026-04-24T12:00:00.000Z',
        },
      },
    ];

    const jsonlContent = renderJsonlString(original, 2200, { runId: 'err-round-trip' });
    const result = parseJsonlReports(jsonlContent);

    expect(result.reports.length).toBe(1);
    const report = result.reports[0]!;
    expect(report.error?.code).toBe('all_hunks_failed');
    expect(report.error?.message).toContain('3 chunks failed');
    expect(report.hunkFailures?.length).toBe(2);
    expect(report.hunkFailures![0]!.type).toBe('analysis');
    expect(report.hunkFailures![0]!.code).toBe('sdk_error');
    expect(report.hunkFailures![0]!.attempts).toBe(3);
    expect(report.hunkFailures![1]!.type).toBe('extraction');
    expect(report.hunkFailures![1]!.preview).toContain('bad');
  });

  it('emits summary extras when any report has errors', () => {
    const original: SkillReport[] = [
      {
        skill: 'skill-a',
        summary: 'all chunks failed',
        findings: [],
        failedHunks: 2,
        hunkFailures: [
          {
            type: 'analysis',
            filename: 'a.ts',
            lineRange: '1-10',
            code: 'auth_failed',
            message: 'auth',
          },
        ],
        error: { code: 'auth_failed', message: 'bad key' },
      },
      {
        skill: 'skill-b',
        summary: 'ok',
        findings: [],
        failedExtractions: 1,
      },
    ];
    const content = renderJsonlString(original, 1000, { runId: 'sum-123' });
    const lines = content.trim().split('\n');
    const summary = JSON.parse(lines[lines.length - 1]!);
    expect(summary.type).toBe('summary');
    expect(summary.failedSkills).toEqual(['skill-a']);
    expect(summary.totalFailedHunks).toBe(2);
    expect(summary.totalFailedExtractions).toBe(1);
  });

  it('omits summary extras when there are no failures', () => {
    const original: SkillReport[] = [
      { skill: 'ok-skill', summary: 'no issues', findings: [] },
    ];
    const content = renderJsonlString(original, 500);
    const lines = content.trim().split('\n');
    const summary = JSON.parse(lines[lines.length - 1]!);
    expect(summary.failedSkills).toBeUndefined();
    expect(summary.totalFailedHunks).toBeUndefined();
    expect(summary.totalFailedExtractions).toBeUndefined();
  });

  it('passes through fix-evaluation records without treating them as malformed', () => {
    // Fix-evaluation records have type:'fix-evaluation' and lack the
    // skill/summary/findings fields. The parser must skip them via the
    // type discriminator, not by falling through to JsonlRecordSchema.parse
    // (which would Zod-error and trigger logger.warn for every fix-eval line).
    const jsonlContent = `{"run":{"timestamp":"2026-04-25T00:00:00.000Z","durationMs":1000,"cwd":"/test","runId":"fix-eval-123"},"skill":"review","summary":"ok","findings":[]}
{"run":{"timestamp":"2026-04-25T00:00:00.000Z","durationMs":1000,"cwd":"/test","runId":"fix-eval-123"},"type":"fix-evaluation","evaluated":2,"resolved":1,"needsAttention":1,"skipped":0,"failedEvaluations":0}
{"run":{"timestamp":"2026-04-25T00:00:00.000Z","durationMs":1000,"cwd":"/test","runId":"fix-eval-123"},"type":"summary","totalFindings":0,"bySeverity":{"high":0,"medium":0,"low":0}}
`;
    const result = parseJsonlReports(jsonlContent);
    expect(result.reports).toHaveLength(1);
    expect(result.reports[0]!.skill).toBe('review');
    // The summary record's runMetadata wins; ensure parse reached it.
    expect(result.runMetadata?.runId).toBe('fix-eval-123');
  });

  it('parses pre-rename logs that used findingCount instead of findings', () => {
    // Backward compat: breaking old log formats is NEVER ALLOWED. Old logs
    // (written before the FileReport.findingCount → findings rename) must
    // still parse cleanly. Schema preprocesses the legacy field name.
    const legacy = `{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":1500,"cwd":"/test","runId":"old-fc-123"},"skill":"review","summary":"Found 1","findings":[{"id":"X","severity":"medium","title":"t","description":"d"}],"files":[{"filename":"src/api.ts","findingCount":1,"durationMs":1200},{"filename":"src/utils.ts","findingCount":0,"durationMs":800}]}
{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":1500,"cwd":"/test","runId":"old-fc-123"},"type":"summary","totalFindings":1,"bySeverity":{"high":0,"medium":1,"low":0}}
`;
    const result = parseJsonlReports(legacy);
    expect(result.reports).toHaveLength(1);
    expect(result.reports[0]!.files).toHaveLength(2);
    expect(result.reports[0]!.files![0]!.findings).toBe(1);
    expect(result.reports[0]!.files![1]!.findings).toBe(0);
    expect(result.reports[0]!.files![0]!.filename).toBe('src/api.ts');
  });

  it('parses older logs without the new error fields', () => {
    const legacy = `{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":1000,"cwd":"/test","runId":"legacy-123"},"skill":"old","summary":"done","findings":[]}
{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":1000,"cwd":"/test","runId":"legacy-123"},"type":"summary","totalFindings":0,"bySeverity":{"high":0,"medium":0,"low":0}}
`;
    const result = parseJsonlReports(legacy);
    expect(result.reports.length).toBe(1);
    expect(result.reports[0]!.error).toBeUndefined();
    expect(result.reports[0]!.hunkFailures).toBeUndefined();
  });
});

/** Test-only helper: parse summary from last line of a JSONL file. */
function parseSummaryFromLastLine(filePath: string): JsonlSummaryRecord | undefined {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    if (!lastLine) return undefined;
    const parsed = JSON.parse(lastLine);
    if (parsed.type !== 'summary') return undefined;
    return JsonlSummaryRecordSchema.parse(parsed);
  } catch {
    return undefined;
  }
}

describe('parseSummaryFromLastLine', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `warden-test-summary-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('parses summary from a valid JSONL file', () => {
    const outputPath = join(testDir, 'valid.jsonl');
    const reports: SkillReport[] = [
      {
        skill: 'test-skill',
        summary: 'Found 1 issue',
        findings: [
          { id: 'test-1', severity: 'high', title: 'Test', description: 'Test' },
        ],
        durationMs: 1234,
      },
    ];
    writeJsonlReport(outputPath, reports, 2000, { runId: 'summary-test-id' });

    const summary = parseSummaryFromLastLine(outputPath);

    expect(summary).toBeDefined();
    expect(summary!.type).toBe('summary');
    expect(summary!.totalFindings).toBe(1);
    expect(summary!.bySeverity.high).toBe(1);
    expect(summary!.run.runId).toBe('summary-test-id');
    expect(summary!.run.durationMs).toBe(2000);
  });

  it('returns undefined for non-existent file', () => {
    const result = parseSummaryFromLastLine(join(testDir, 'nonexistent.jsonl'));
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty file', () => {
    const emptyPath = join(testDir, 'empty.jsonl');
    writeFileSync(emptyPath, '');

    const result = parseSummaryFromLastLine(emptyPath);
    expect(result).toBeUndefined();
  });

  it('returns undefined when last line is not a summary', () => {
    const noSummaryPath = join(testDir, 'nosummary.jsonl');
    const content = '{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":1000,"cwd":"/test","runId":"test-123"},"skill":"review","summary":"Done","findings":[]}\n';
    writeFileSync(noSummaryPath, content);

    const result = parseSummaryFromLastLine(noSummaryPath);
    expect(result).toBeUndefined();
  });
});

describe('incremental JSONL writes', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `warden-incr-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('initJsonlFile creates parent dir and truncates an existing file', () => {
    const target = join(testDir, 'nested', 'run.jsonl');
    initJsonlFile(target);
    expect(existsSync(target)).toBe(true);
    expect(readFileSync(target, 'utf-8')).toBe('');

    // Pre-existing content should be truncated when re-initialized.
    writeFileSync(target, 'leftover\n');
    initJsonlFile(target);
    expect(readFileSync(target, 'utf-8')).toBe('');
  });

  it('append-as-you-go produces the same on-disk shape as renderJsonlString', () => {
    const reports: SkillReport[] = [
      {
        skill: 'security-review',
        summary: 'one issue',
        findings: [{ id: 'f1', severity: 'high', title: 't', description: 'd' }],
        durationMs: 1200,
        usage: { inputTokens: 10, outputTokens: 5, costUSD: 0.001 },
      },
      {
        skill: 'code-review',
        summary: 'no issues',
        findings: [],
        durationMs: 800,
      },
    ];
    const runId = '11111111-2222-3333-4444-555555555555';
    const timestamp = new Date('2026-04-25T12:00:00.000Z');
    const cwd = '/test/repo';

    const oneShot = renderJsonlString(reports, 2000, { runId, timestamp, cwd });

    const run = buildRunMetadata({ runId, durationMs: 2000, timestamp, cwd });
    const target = join(testDir, 'incr.jsonl');
    initJsonlFile(target);
    for (const r of reports) appendJsonlLine(target, renderJsonlSkillLine(r, run));
    appendJsonlLine(target, renderJsonlSummaryLine(reports, run));

    expect(readFileSync(target, 'utf-8')).toBe(oneShot);
  });

  it('a partial file (skills appended, no summary) parses and renders skill records', () => {
    const partialReports: SkillReport[] = [
      { skill: 'sa', summary: 'ok', findings: [], durationMs: 100 },
      { skill: 'sb', summary: 'ok', findings: [], durationMs: 200 },
    ];
    const run = buildRunMetadata({
      runId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      durationMs: 0,
      timestamp: new Date('2026-04-25T12:00:00.000Z'),
    });
    const target = join(testDir, 'partial.jsonl');
    initJsonlFile(target);
    for (const r of partialReports) appendJsonlLine(target, renderJsonlSkillLine(r, run));

    const content = readFileSync(target, 'utf-8');
    const parsed = parseJsonlReports(content);
    expect(parsed.reports.map((r) => r.skill)).toEqual(['sa', 'sb']);
    expect(parsed.runMetadata?.runId).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });

  it('parseJsonlReports keeps its legacy contract: a one-shot file from a prior version still parses', () => {
    const legacy = `{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":2000,"cwd":"/test","runId":"legacy-oneshot"},"skill":"sec","summary":"ok","findings":[]}
{"run":{"timestamp":"2026-02-18T14:32:15.123Z","durationMs":2000,"cwd":"/test","runId":"legacy-oneshot"},"type":"summary","totalFindings":0,"bySeverity":{"high":0,"medium":0,"low":0}}
`;
    const result = parseJsonlReports(legacy);
    expect(result.reports.length).toBe(1);
    expect(result.reports[0]!.skill).toBe('sec');
    expect(result.totalDurationMs).toBe(2000);
  });
});

describe('specs/jsonl-examples.jsonl', () => {
  const EXAMPLES_PATH = resolve(
    fileURLToPath(new URL('../../../../../specs/jsonl-examples.jsonl', import.meta.url)),
  );
  const union = z.union([
    JsonlChunkRecordSchema,
    JsonlRecordSchema,
    JsonlSummaryRecordSchema,
    JsonlFixEvaluationRecordSchema,
  ]);

  it('every example payload is in canonical form (no stripped keys, no normalization drift)', () => {
    const lines = readFileSync(EXAMPLES_PATH, 'utf-8')
      .trim()
      .split('\n')
      .filter((l) => l.trim());
    for (const [i, line] of lines.entries()) {
      const raw = JSON.parse(line);
      const parsed = union.parse(raw);
      // If Zod stripped or normalized anything, the example is showing a
      // shape we never actually emit. Keep examples as the canonical output.
      expect(parsed, `line ${i + 1} differs from canonical form`).toEqual(raw);
    }
  });
});
