import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SkillReport, UsageStats } from '../../types/index.js';
import { countBySeverity } from './formatters.js';

/**
 * Metadata for a JSONL run record.
 */
export interface JsonlRunMetadata {
  timestamp: string;
  durationMs: number;
  cwd: string;
}

/**
 * A single JSONL record representing one skill's report.
 */
export interface JsonlRecord {
  run: JsonlRunMetadata;
  skill: string;
  summary: string;
  findings: SkillReport['findings'];
  metadata?: Record<string, unknown>;
  durationMs?: number;
  usage?: UsageStats;
}

/**
 * Aggregate usage stats from reports.
 */
function aggregateUsage(reports: SkillReport[]): UsageStats | undefined {
  const usages = reports.map((r) => r.usage).filter((u) => u !== undefined);
  if (usages.length === 0) return undefined;

  return usages.reduce((acc, u) => ({
    inputTokens: acc.inputTokens + u.inputTokens,
    outputTokens: acc.outputTokens + u.outputTokens,
    cacheReadInputTokens: (acc.cacheReadInputTokens ?? 0) + (u.cacheReadInputTokens ?? 0),
    cacheCreationInputTokens: (acc.cacheCreationInputTokens ?? 0) + (u.cacheCreationInputTokens ?? 0),
    costUSD: acc.costUSD + u.costUSD,
  }));
}

/**
 * Write skill reports to a JSONL file.
 * Each line contains one skill report with run metadata.
 * A final summary line is appended at the end.
 */
export function writeJsonlReport(
  outputPath: string,
  reports: SkillReport[],
  durationMs: number
): void {
  const resolvedPath = resolve(process.cwd(), outputPath);
  const timestamp = new Date().toISOString();
  const cwd = process.cwd();

  const runMetadata: JsonlRunMetadata = {
    timestamp,
    durationMs,
    cwd,
  };

  const lines: string[] = [];

  // Write one line per skill report
  for (const report of reports) {
    const record: JsonlRecord = {
      run: runMetadata,
      skill: report.skill,
      summary: report.summary,
      findings: report.findings,
      metadata: report.metadata,
      durationMs: report.durationMs,
      usage: report.usage,
    };
    lines.push(JSON.stringify(record));
  }

  // Write a summary line at the end
  const allFindings = reports.flatMap((r) => r.findings);
  const summaryRecord = {
    run: runMetadata,
    type: 'summary',
    totalFindings: allFindings.length,
    bySeverity: countBySeverity(allFindings),
    usage: aggregateUsage(reports),
  };
  lines.push(JSON.stringify(summaryRecord));

  writeFileSync(resolvedPath, lines.join('\n') + '\n');
}
