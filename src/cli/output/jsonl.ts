import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import {
  UsageStatsSchema,
  SkillReportSchema,
  FileReportSchema,
  AuxiliaryUsageMapSchema,
  FixStatusSchema,
  SkillErrorSchema,
} from '../../types/index.js';
import type { SkillReport, UsageStats, AuxiliaryUsageMap, SkillError } from '../../types/index.js';
import { mergeAuxiliaryUsage } from '../../sdk/usage.js';
import { logger } from '../../sentry.js';
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
 *
 * BACKWARD COMPATIBILITY: breaking on-disk JSONL log formats is NEVER
 * ALLOWED. Users keep .warden/logs/*.jsonl across versions. The schema
 * may evolve — new optional fields, additive enum values, normalization
 * — but every historical shape must continue to parse cleanly. Field
 * renames require a preprocess that maps the old name to the new one
 * (see FileReportSchema's `findingCount → findings` preprocess in
 * src/types/index.ts). Removing a field is fine; making it optional in
 * the schema preserves old logs. If you can't reconcile an old shape
 * with a preprocess, the change is wrong — find a different path.
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

/** Per-file breakdown within a skill record (re-exported from shared types). */
export const JsonlFileRecordSchema = FileReportSchema;
export type JsonlFileRecord = z.infer<typeof JsonlFileRecordSchema>;

/**
 * One skill's analysis results. This is the shared SkillReport plus a `run`
 * block of run-wide metadata, so any new SkillReport field is automatically
 * part of the JSONL contract without a parallel schema.
 */
export const JsonlRecordSchema = SkillReportSchema.extend({
  run: JsonlRunMetadataSchema,
});
export type JsonlRecord = z.infer<typeof JsonlRecordSchema>;

/** Normalized output shape — what we emit. */
const BySeverityOutputSchema = z.object({
  high: z.number().int().nonnegative(),
  medium: z.number().int().nonnegative(),
  low: z.number().int().nonnegative(),
});

/**
 * Severity breakdown in the summary record.
 *
 * Parse-time accepts any string keys (legacy logs may emit 5-level severities
 * like 'critical'/'info'); a transform normalizes 'critical' → 'high' and
 * 'info' → 'low' and drops unknown keys. The piped output shape is the
 * strict `{ high, medium, low }` triple we emit going forward, so
 * JSON-Schema derivation describes the output contract (not the lax input).
 */
const BySeveritySchema = z
  .record(z.string(), z.number().int().nonnegative())
  .transform((obj) => {
    const result = { high: 0, medium: 0, low: 0 };
    for (const [key, value] of Object.entries(obj)) {
      const normalized = key === 'critical' ? 'high' : key === 'info' ? 'low' : key;
      if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
        result[normalized] += value;
      }
    }
    return result;
  })
  .pipe(BySeverityOutputSchema);

/** Aggregate summary across all skills (always the last JSONL line). */
export const JsonlSummaryRecordSchema = z.object({
  run: JsonlRunMetadataSchema,
  type: z.literal('summary'),
  totalFindings: z.number().int().nonnegative(),
  bySeverity: BySeveritySchema,
  usage: UsageStatsSchema.optional(),
  totalSkippedFiles: z.number().int().nonnegative().optional(),
  auxiliaryUsage: AuxiliaryUsageMapSchema.optional(),
  failedSkills: z.array(z.string()).optional(),
  totalFailedHunks: z.number().int().nonnegative().optional(),
  totalFailedExtractions: z.number().int().nonnegative().optional(),
  /**
   * Top-level run error captured before any skill ran (e.g. auth failure,
   * config load error). Skill-level errors live on the SkillRecord; this
   * is for failures that prevent the per-skill loop from starting.
   */
  error: SkillErrorSchema.optional(),
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
  options?: {
    runId?: string;
    traceId?: string;
    timestamp?: Date;
    model?: string;
    headSha?: string;
    cwd?: string;
    /** Top-level run error (e.g. auth failure) recorded on the summary record. */
    error?: SkillError;
  }
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
    // Drop empty optional arrays and zero counts so JSONL stays compact.
    const trimmed: SkillReport = {
      ...report,
      skippedFiles: report.skippedFiles?.length ? report.skippedFiles : undefined,
      failedHunks: report.failedHunks || undefined,
      failedExtractions: report.failedExtractions || undefined,
      hunkFailures: report.hunkFailures?.length ? report.hunkFailures : undefined,
    };
    const record: JsonlRecord = { ...trimmed, run: runMetadata };
    lines.push(JSON.stringify(record));
  }

  const allFindings = reports.flatMap((r) => r.findings);
  const totalSkippedFiles = reports.reduce((n, r) => n + (r.skippedFiles?.length ?? 0), 0);
  const totalAuxiliaryUsage = reports.reduce<AuxiliaryUsageMap | undefined>(
    (acc, r) => mergeAuxiliaryUsage(acc, r.auxiliaryUsage),
    undefined
  );
  const failedSkills = reports.filter((r) => r.error).map((r) => r.skill);
  const totalFailedHunks = reports.reduce((n, r) => n + (r.failedHunks ?? 0), 0);
  const totalFailedExtractions = reports.reduce((n, r) => n + (r.failedExtractions ?? 0), 0);
  const summaryRecord: JsonlSummaryRecord = {
    run: runMetadata,
    type: 'summary',
    totalFindings: allFindings.length,
    bySeverity: countBySeverity(allFindings),
    usage: aggregateUsage(reports),
    totalSkippedFiles: totalSkippedFiles > 0 ? totalSkippedFiles : undefined,
    auxiliaryUsage: totalAuxiliaryUsage,
    failedSkills: failedSkills.length > 0 ? failedSkills : undefined,
    totalFailedHunks: totalFailedHunks > 0 ? totalFailedHunks : undefined,
    totalFailedExtractions: totalFailedExtractions > 0 ? totalFailedExtractions : undefined,
    error: options?.error,
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

      // Fix-evaluation records are valid JSONL but not SkillReports; let
      // them pass through silently so we don't warn on every line of a log
      // that contains them.
      if (parsed.type === 'fix-evaluation') continue;

      // A JsonlRecord is a SkillReport + { run }. Strip `run` to get the
      // SkillReport without rebuilding it field-by-field.
      const { run, ...report } = JsonlRecordSchema.parse(parsed);
      reports.push(report);

      // Capture run metadata from first record if no summary yet
      if (!runMetadata) {
        runMetadata = run;
        totalDurationMs = run.durationMs;
      }
    } catch (err) {
      logger.warn('Skipping malformed JSONL line', {
        error: err instanceof Error ? err.message : String(err),
      });
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
      } catch (err) {
        logger.warn('Skipping malformed JSONL line', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (!summary) return undefined;
    return { summary, skills, model, headSha, totalFiles: uniqueFiles.size };
  } catch {
    return undefined;
  }
}
