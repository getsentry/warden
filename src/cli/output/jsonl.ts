import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import {
  UsageStatsSchema,
  FindingSchema,
  SkippedFileSchema,
  AuxiliaryUsageMapSchema,
  FixStatusSchema,
} from '../../types/index.js';
import type { SkillReport, UsageStats, AuxiliaryUsageMap } from '../../types/index.js';
import { mergeAuxiliaryUsage } from '../../sdk/usage.js';
import { countBySeverity } from './formatters.js';

/**
 * Sentinel value recorded in JSONL metadata when no model is explicitly configured.
 */
export const MODEL_DEFAULT_SENTINEL = '(default)';

/**
 * Generate a unique run ID for this execution.
 */
export function generateRunId(): string {
  return randomUUID();
}

/**
 * Get the first 8 hex chars (no dashes) of a UUID for use in filenames.
 */
export function shortRunId(runId: string): string {
  return runId.replace(/-/g, '').slice(0, 8);
}

/**
 * Get the repo-local log file path.
 * Returns: {repoRoot}/.warden/logs/{runId8}-{ISO-datetime}.jsonl
 */
export function getRepoLogPath(repoRoot: string, runId: string, timestamp: Date = new Date()): string {
  const ts = timestamp.toISOString().replace(/[:.]/g, '-');
  return join(repoRoot, '.warden', 'logs', `${shortRunId(runId)}-${ts}.jsonl`);
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
  runId: z.string(),
  traceId: z.string().optional(),
  model: z.string().optional(),
  headSha: z.string().optional(),
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
  model: z.string().optional(),
  durationMs: z.number().nonnegative().optional(),
  usage: UsageStatsSchema.optional(),
  auxiliaryUsage: AuxiliaryUsageMapSchema.optional(),
  files: z.array(JsonlFileRecordSchema).optional(),
  skippedFiles: z.array(SkippedFileSchema).optional(),
  failedHunks: z.number().int().nonnegative().optional(),
  failedExtractions: z.number().int().nonnegative().optional(),
});
export type JsonlRecord = z.infer<typeof JsonlRecordSchema>;

/**
 * Severity breakdown in the summary record.
 * Uses a transform to normalize legacy keys ('critical' → 'high', 'info' → 'low')
 * so old JSONL logs parse correctly. Accepts any string keys to handle old 5-level logs.
 */
const BySeveritySchema = z.record(z.string(), z.number().int().nonnegative()).transform(
  (obj) => {
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(obj)) {
      const normalized = key === 'critical' ? 'high' : key === 'info' ? 'low' : key;
      if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
        result[normalized] = (result[normalized] ?? 0) + value;
      }
    }
    return result as Record<'high' | 'medium' | 'low', number>;
  },
);

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
 * Render skill reports as a JSONL string.
 * Each line contains one skill report with run metadata.
 * A final summary line is appended at the end.
 */
export function renderJsonlString(
  reports: SkillReport[],
  durationMs: number,
  options?: { runId?: string; traceId?: string; timestamp?: Date; model?: string; headSha?: string; cwd?: string }
): string {
  const timestamp = (options?.timestamp ?? new Date()).toISOString();
  const cwd = options?.cwd ?? process.cwd();

  const runMetadata: JsonlRunMetadata = {
    timestamp,
    durationMs,
    cwd,
    runId: options?.runId ?? generateRunId(),
    traceId: options?.traceId,
    model: options?.model,
    headSha: options?.headSha,
  };

  const lines: string[] = [];

  for (const report of reports) {
    const record: JsonlRecord = {
      run: runMetadata,
      skill: report.skill,
      summary: report.summary,
      findings: report.findings,
      metadata: report.metadata,
      model: report.model,
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

  return lines.join('\n') + '\n';
}

/**
 * Write skill reports to a JSONL file.
 */
export function writeJsonlReport(
  outputPath: string,
  reports: SkillReport[],
  durationMs: number,
  options?: { runId?: string; traceId?: string }
): void {
  const resolvedPath = resolve(process.cwd(), outputPath);
  const content = renderJsonlString(reports, durationMs, options);
  mkdirSync(dirname(resolvedPath), { recursive: true });
  writeFileSync(resolvedPath, content);
}

/**
 * Write pre-rendered JSONL content to a file path.
 */
export function writeJsonlContent(outputPath: string, content: string): void {
  const resolvedPath = resolve(process.cwd(), outputPath);
  mkdirSync(dirname(resolvedPath), { recursive: true });
  writeFileSync(resolvedPath, content);
}

/**
 * Read a JSONL log file and return its contents.
 */
export function readJsonlLog(logPath: string): string {
  return readFileSync(logPath, 'utf-8');
}

/**
 * Parse JSONL content and reconstruct SkillReport objects.
 * Returns an object with the reports array, run metadata from the summary,
 * and total duration.
 */
export interface ParsedJsonlLog {
  reports: SkillReport[];
  runMetadata?: JsonlRunMetadata;
  totalDurationMs: number;
}

export function parseJsonlReports(content: string): ParsedJsonlLog {
  const lines = content.trim().split('\n').filter((line) => line.trim());
  const reports: SkillReport[] = [];
  let runMetadata: JsonlRunMetadata | undefined;
  let totalDurationMs = 0;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);

      // Skip summary record (but capture metadata from it)
      if (parsed.type === 'summary') {
        const summary = JsonlSummaryRecordSchema.parse(parsed);
        runMetadata = summary.run;
        totalDurationMs = summary.run.durationMs;
        continue;
      }

      // Parse skill record and convert to SkillReport
      const record = JsonlRecordSchema.parse(parsed);
      reports.push({
        skill: record.skill,
        summary: record.summary,
        findings: record.findings,
        metadata: record.metadata,
        model: record.model,
        durationMs: record.durationMs,
        usage: record.usage,
        auxiliaryUsage: record.auxiliaryUsage,
        skippedFiles: record.skippedFiles,
        failedHunks: record.failedHunks,
        failedExtractions: record.failedExtractions,
        files: record.files?.map((f) => ({
          filename: f.filename,
          findingCount: f.findings,
          durationMs: f.durationMs,
          usage: f.usage,
        })),
      });

      // Capture run metadata from first record if no summary yet
      if (!runMetadata) {
        runMetadata = record.run;
        totalDurationMs = record.run.durationMs;
      }
    } catch {
      // Skip invalid lines
    }
  }

  return { reports, runMetadata, totalDurationMs };
}

/**
 * Lightweight metadata extracted from a JSONL log file.
 * Includes the summary record plus skill names from the skill records.
 */
export interface LogFileMetadata {
  summary: JsonlSummaryRecord;
  skills: string[];
  model?: string;
  headSha?: string;
  totalFiles: number;
}

/**
 * Parse a JSONL log file for its summary and skill names.
 * Reads all lines but only fully parses the summary; extracts skill names
 * from non-summary lines with minimal parsing.
 */
export function parseLogMetadata(filePath: string): LogFileMetadata | undefined {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    let summary: JsonlSummaryRecord | undefined;
    const skills: string[] = [];
    let model: string | undefined;
    let headSha: string | undefined;
    const uniqueFiles = new Set<string>();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'summary') {
          summary = JsonlSummaryRecordSchema.parse(parsed);
          // Fall back to summary's run metadata for model/headSha (empty runs have no skill records)
          if (!model && parsed.run?.model && typeof parsed.run.model === 'string') {
            model = parsed.run.model;
          }
          if (!headSha && parsed.run?.headSha && typeof parsed.run.headSha === 'string') {
            headSha = parsed.run.headSha;
          }
        } else if (parsed.skill && typeof parsed.skill === 'string') {
          if (!skills.includes(parsed.skill)) {
            skills.push(parsed.skill);
          }
          // Extract model and headSha from first record's run metadata
          if (!model && parsed.run?.model && typeof parsed.run.model === 'string') {
            model = parsed.run.model;
          }
          if (!headSha && parsed.run?.headSha && typeof parsed.run.headSha === 'string') {
            headSha = parsed.run.headSha;
          }
          // Count unique filenames across skill records' files arrays
          if (Array.isArray(parsed.files)) {
            for (const f of parsed.files) {
              if (f && typeof f.filename === 'string') {
                uniqueFiles.add(f.filename);
              }
            }
          }
        }
      } catch {
        // Skip unparseable lines
      }
    }

    if (!summary) return undefined;
    return { summary, skills, model, headSha, totalFiles: uniqueFiles.size };
  } catch {
    return undefined;
  }
}
