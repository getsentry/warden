import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeJsonlReport, type JsonlRecord } from './jsonl.js';
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
