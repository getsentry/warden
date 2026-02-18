import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import {
  UsageStatsSchema,
  FindingSchema,
  SkippedFileSchema,
  AuxiliaryUsageMapSchema,
  SeveritySchema,
} from '../../types/index.js';
import type { SkillReport, UsageStats, AuxiliaryUsageMap } from '../../types/index.js';
import { FixStatusSchema } from '../../action/fix-evaluation/types.js';
import { mergeAuxiliaryUsage } from '../../sdk/usage.js';
import { countBySeverity } from './formatters.js';

/**
 * Get the default run logs directory.
 * Uses WARDEN_STATE_DIR env var if set, otherwise ~/.local/warden/runs
 */
export function getRunLogsDir(): string {
  const stateDir = process.env['WARDEN_STATE_DIR'];
  if (stateDir) {
    return join(stateDir, 'runs');
  }
  return join(homedir(), '.local', 'warden', 'runs');
}

/**
 * Generate a run log filename from directory name and timestamp.
 * Format: {dirname}_{timestamp}.jsonl
 * Timestamp has colons replaced with hyphens for filesystem compatibility.
 */
export function generateRunLogFilename(cwd: string, timestamp: Date = new Date()): string {
  const dirName = basename(cwd) || 'unknown';
  const ts = timestamp.toISOString().replace(/:/g, '-');
  return `${dirName}_${ts}.jsonl`;
}

/**
 * Get the full path for an automatic run log.
 */
export function getRunLogPath(cwd: string, timestamp: Date = new Date()): string {
  return join(getRunLogsDir(), generateRunLogFilename(cwd, timestamp));
}

/**
 * JSONL record schemas for Warden's structured run output.
 *
 * Formal JSON Schema: specs/jsonl-schema.json
 * Example payloads:   specs/jsonl-examples.jsonl
 * Reporter spec:      specs/reporters.md Section 3 "JSONL Specification"
 */

/** Metadata common to every JSONL record. */
export const JsonlRunMetadataSchema = z.object({
  timestamp: z.string().datetime(),
  durationMs: z.number().nonnegative(),
  cwd: z.string(),
  traceId: z.string().optional(),
});
export type JsonlRunMetadata = z.infer<typeof JsonlRunMetadataSchema>;

/** Per-file breakdown within a skill record. */
export const JsonlFileRecordSchema = z.object({
  filename: z.string(),
  findings: z.number().int().nonnegative(),
  durationMs: z.number().nonnegative().optional(),
  usage: UsageStatsSchema.optional(),
});
export type JsonlFileRecord = z.infer<typeof JsonlFileRecordSchema>;

/** One skill's analysis results. */
export const JsonlRecordSchema = z.object({
  run: JsonlRunMetadataSchema,
  skill: z.string(),
  summary: z.string(),
  findings: z.array(FindingSchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
  durationMs: z.number().nonnegative().optional(),
  usage: UsageStatsSchema.optional(),
  auxiliaryUsage: AuxiliaryUsageMapSchema.optional(),
  files: z.array(JsonlFileRecordSchema).optional(),
  skippedFiles: z.array(SkippedFileSchema).optional(),
  failedHunks: z.number().int().nonnegative().optional(),
  failedExtractions: z.number().int().nonnegative().optional(),
});
export type JsonlRecord = z.infer<typeof JsonlRecordSchema>;

/** Severity breakdown in the summary record. */
const BySeveritySchema = z.record(SeveritySchema, z.number().int().nonnegative());

/** Aggregate summary across all skills (always the last JSONL line). */
export const JsonlSummaryRecordSchema = z.object({
  run: JsonlRunMetadataSchema,
  type: z.literal('summary'),
  totalFindings: z.number().int().nonnegative(),
  bySeverity: BySeveritySchema,
  usage: UsageStatsSchema.optional(),
  totalSkippedFiles: z.number().int().nonnegative().optional(),
  auxiliaryUsage: AuxiliaryUsageMapSchema.optional(),
});
export type JsonlSummaryRecord = z.infer<typeof JsonlSummaryRecordSchema>;

/** Per-evaluation detail for fix evaluation records. */
export const JsonlFixEvalDetailSchema = z.object({
  path: z.string(),
  line: z.number().int().positive(),
  findingId: z.string().optional(),
  verdict: z.union([FixStatusSchema, z.literal('re_detected')]),
  reasoning: z.string().optional(),
  durationMs: z.number().nonnegative(),
  usage: UsageStatsSchema,
});
export type JsonlFixEvalDetail = z.infer<typeof JsonlFixEvalDetailSchema>;

/** Fix evaluation results record. */
export const JsonlFixEvaluationRecordSchema = z.object({
  run: JsonlRunMetadataSchema,
  type: z.literal('fix-evaluation'),
  evaluated: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
  needsAttention: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failedEvaluations: z.number().int().nonnegative(),
  usage: UsageStatsSchema.optional(),
  evaluations: z.array(JsonlFixEvalDetailSchema).optional(),
});
export type JsonlFixEvaluationRecord = z.infer<typeof JsonlFixEvaluationRecordSchema>;

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
  durationMs: number,
  options?: { traceId?: string }
): void {
  const resolvedPath = resolve(process.cwd(), outputPath);
  const timestamp = new Date().toISOString();
  const cwd = process.cwd();

  const runMetadata: JsonlRunMetadata = {
    timestamp,
    durationMs,
    cwd,
    traceId: options?.traceId,
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
      auxiliaryUsage: report.auxiliaryUsage,
      files: report.files?.map((f) => ({
        filename: f.filename,
        findings: f.findingCount,
        durationMs: f.durationMs,
        usage: f.usage,
      })),
      skippedFiles: report.skippedFiles?.length ? report.skippedFiles : undefined,
      failedHunks: report.failedHunks || undefined,
      failedExtractions: report.failedExtractions || undefined,
    };
    lines.push(JSON.stringify(record));
  }

  // Write a summary line at the end
  const allFindings = reports.flatMap((r) => r.findings);
  const totalSkippedFiles = reports.reduce((n, r) => n + (r.skippedFiles?.length ?? 0), 0);
  const totalAuxiliaryUsage = reports.reduce<AuxiliaryUsageMap | undefined>(
    (acc, r) => mergeAuxiliaryUsage(acc, r.auxiliaryUsage),
    undefined
  );
  const summaryRecord: JsonlSummaryRecord = {
    run: runMetadata,
    type: 'summary',
    totalFindings: allFindings.length,
    bySeverity: countBySeverity(allFindings),
    usage: aggregateUsage(reports),
    totalSkippedFiles: totalSkippedFiles > 0 ? totalSkippedFiles : undefined,
    auxiliaryUsage: totalAuxiliaryUsage,
  };
  lines.push(JSON.stringify(summaryRecord));

  // Ensure parent directory exists
  mkdirSync(dirname(resolvedPath), { recursive: true });

  writeFileSync(resolvedPath, lines.join('\n') + '\n');
}
