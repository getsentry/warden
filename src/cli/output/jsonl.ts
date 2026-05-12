import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import {
  UsageStatsSchema,
  SkillReportSchema,
  FileReportSchema,
  FindingSchema,
  AuxiliaryUsageMapSchema,
  FixStatusSchema,
  isExtractionErrorCode,
  SkillErrorSchema,
  SkippedFileSchema,
} from '../../types/index.js';
import type { SkillReport, UsageStats, AuxiliaryUsageMap, SkillError, Finding, FileReport, HunkFailure } from '../../types/index.js';
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

/** Unit of work scanned by Warden. New run logs contain only this record type. */
export const JsonlChunkRecordSchema = z.object({
  schemaVersion: z.literal(1),
  run: JsonlRunMetadataSchema,
  skill: z.string(),
  model: z.string().optional(),
  chunk: z.object({
    file: z.string(),
    index: z.number().int().positive(),
    total: z.number().int().positive(),
    lineRange: z.string(),
  }),
  status: z.enum(['ok', 'error', 'skipped']),
  findings: z.array(FindingSchema),
  usage: UsageStatsSchema.optional(),
  durationMs: z.number().nonnegative(),
  auxiliaryUsage: AuxiliaryUsageMapSchema.optional(),
  error: SkillErrorSchema.optional(),
  skippedFiles: z.array(SkippedFileSchema).optional(),
});
export type JsonlChunkRecord = z.infer<typeof JsonlChunkRecordSchema>;

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
  verdict: z.union([FixStatusSchema, z.literal('re_detected'), z.literal('eval_error')]),
  reasoning: z.string().optional(),
  durationMs: z.number().nonnegative(),
  usage: UsageStatsSchema,
  usedFallback: z.boolean().optional(),
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
    cacheCreation5mInputTokens: (acc.cacheCreation5mInputTokens ?? 0) + (u.cacheCreation5mInputTokens ?? 0),
    cacheCreation1hInputTokens: (acc.cacheCreation1hInputTokens ?? 0) + (u.cacheCreation1hInputTokens ?? 0),
    webSearchRequests: (acc.webSearchRequests ?? 0) + (u.webSearchRequests ?? 0),
    costUSD: acc.costUSD + u.costUSD,
  }));
}

/**
 * Build a JSONL run metadata block. `durationMs` is a snapshot at write
 * time for skill records, the run total on the trailing summary record.
 */
export function buildRunMetadata(options: {
  runId: string;
  durationMs: number;
  timestamp?: Date;
  traceId?: string;
  model?: string;
  headSha?: string;
  cwd?: string;
}): JsonlRunMetadata {
  return {
    timestamp: (options.timestamp ?? new Date()).toISOString(),
    durationMs: options.durationMs,
    cwd: options.cwd ?? process.cwd(),
    runId: options.runId,
    traceId: options.traceId,
    model: options.model,
    headSha: options.headSha,
  };
}

/** Build a skill JSONL record, dropping zero-valued optional fields. */
export function buildSkillJsonlRecord(report: SkillReport, run: JsonlRunMetadata): JsonlRecord {
  const trimmed: SkillReport = {
    ...report,
    skippedFiles: report.skippedFiles?.length ? report.skippedFiles : undefined,
    failedHunks: report.failedHunks || undefined,
    failedExtractions: report.failedExtractions || undefined,
    hunkFailures: report.hunkFailures?.length ? report.hunkFailures : undefined,
  };
  return { ...trimmed, run };
}

/** Build the aggregate summary JSONL record. */
export function buildSummaryJsonlRecord(
  reports: SkillReport[],
  run: JsonlRunMetadata,
  error?: SkillError
): JsonlSummaryRecord {
  const allFindings = reports.flatMap((r) => r.findings);
  const totalSkippedFiles = reports.reduce((n, r) => n + (r.skippedFiles?.length ?? 0), 0);
  const totalAuxiliaryUsage = reports.reduce<AuxiliaryUsageMap | undefined>(
    (acc, r) => mergeAuxiliaryUsage(acc, r.auxiliaryUsage),
    undefined
  );
  const failedSkills = reports.filter((r) => r.error).map((r) => r.skill);
  const totalFailedHunks = reports.reduce((n, r) => n + (r.failedHunks ?? 0), 0);
  const totalFailedExtractions = reports.reduce((n, r) => n + (r.failedExtractions ?? 0), 0);
  return {
    run,
    type: 'summary',
    totalFindings: allFindings.length,
    bySeverity: countBySeverity(allFindings),
    usage: aggregateUsage(reports),
    totalSkippedFiles: totalSkippedFiles > 0 ? totalSkippedFiles : undefined,
    auxiliaryUsage: totalAuxiliaryUsage,
    failedSkills: failedSkills.length > 0 ? failedSkills : undefined,
    totalFailedHunks: totalFailedHunks > 0 ? totalFailedHunks : undefined,
    totalFailedExtractions: totalFailedExtractions > 0 ? totalFailedExtractions : undefined,
    error,
  };
}

/** Render a single skill JSONL record as one line including trailing newline. */
export function renderJsonlSkillLine(report: SkillReport, run: JsonlRunMetadata): string {
  return JSON.stringify(buildSkillJsonlRecord(report, run)) + '\n';
}

/** Render the summary JSONL record as one line including trailing newline. */
export function renderJsonlSummaryLine(
  reports: SkillReport[],
  run: JsonlRunMetadata,
  error?: SkillError
): string {
  return JSON.stringify(buildSummaryJsonlRecord(reports, run, error)) + '\n';
}

/** Render one chunk result record as one JSONL line. */
export function renderJsonlChunkLine(record: JsonlChunkRecord): string {
  return JSON.stringify(JsonlChunkRecordSchema.parse(record)) + '\n';
}

export function renderJsonlChunkRecords(records: JsonlChunkRecord[]): string {
  return records.map((record) => renderJsonlChunkLine(record)).join('');
}

/** Create parent dirs and truncate the file to empty. */
export function initJsonlFile(outputPath: string): void {
  const resolvedPath = resolve(process.cwd(), outputPath);
  mkdirSync(dirname(resolvedPath), { recursive: true });
  writeFileSync(resolvedPath, '');
}

/**
 * Append a pre-rendered line (must include its trailing newline).
 * This uses one synchronous append call so parallel skill callbacks in this
 * process cannot interleave partial JSON records.
 */
export function appendJsonlLine(outputPath: string, line: string): void {
  const resolvedPath = resolve(process.cwd(), outputPath);
  mkdirSync(dirname(resolvedPath), { recursive: true });
  appendFileSync(resolvedPath, line);
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
  const runMetadata = buildRunMetadata({
    runId: options?.runId ?? generateRunId(),
    durationMs,
    timestamp: options?.timestamp,
    traceId: options?.traceId,
    model: options?.model,
    headSha: options?.headSha,
    cwd: options?.cwd,
  });

  const lines: string[] = [];
  for (const report of reports) {
    lines.push(JSON.stringify(buildSkillJsonlRecord(report, runMetadata)));
  }
  lines.push(JSON.stringify(buildSummaryJsonlRecord(reports, runMetadata, options?.error)));

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

function summarizeFindings(skill: string, findings: Finding[]): string {
  if (findings.length === 0) return `${skill}: No issues found`;
  const counts = countBySeverity(findings);
  const parts = [
    counts.high ? `${counts.high} high` : undefined,
    counts.medium ? `${counts.medium} medium` : undefined,
    counts.low ? `${counts.low} low` : undefined,
  ].filter(Boolean);
  return `${skill}: Found ${findings.length} ${findings.length === 1 ? 'issue' : 'issues'} (${parts.join(', ')})`;
}

function addUsage(a: UsageStats | undefined, b: UsageStats | undefined): UsageStats | undefined {
  if (!a) return b;
  if (!b) return a;
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadInputTokens: (a.cacheReadInputTokens ?? 0) + (b.cacheReadInputTokens ?? 0),
    cacheCreationInputTokens: (a.cacheCreationInputTokens ?? 0) + (b.cacheCreationInputTokens ?? 0),
    cacheCreation5mInputTokens: (a.cacheCreation5mInputTokens ?? 0) + (b.cacheCreation5mInputTokens ?? 0),
    cacheCreation1hInputTokens: (a.cacheCreation1hInputTokens ?? 0) + (b.cacheCreation1hInputTokens ?? 0),
    webSearchRequests: (a.webSearchRequests ?? 0) + (b.webSearchRequests ?? 0),
    costUSD: a.costUSD + b.costUSD,
  };
}

function reportsFromChunks(chunks: JsonlChunkRecord[]): SkillReport[] {
  const bySkill = new Map<string, JsonlChunkRecord[]>();
  for (const chunk of chunks) {
    const records = bySkill.get(chunk.skill) ?? [];
    records.push(chunk);
    bySkill.set(chunk.skill, records);
  }

  const reports: SkillReport[] = [];
  for (const [skill, records] of bySkill) {
    const reportLevelError = records.find(isReportLevelErrorRecord)?.error;
    const chunkRecords = records.filter((record) => !isReportLevelErrorRecord(record));
    const aggregateRecords = chunkRecords.length > 0 ? chunkRecords : records;
    const findings = aggregateRecords.flatMap((r) => r.findings);
    const usage = aggregateRecords.reduce<UsageStats | undefined>((acc, r) => addUsage(acc, r.usage), undefined);
    const auxiliaryUsage = aggregateRecords.reduce<AuxiliaryUsageMap | undefined>(
      (acc, r) => mergeAuxiliaryUsage(acc, r.auxiliaryUsage),
      undefined,
    );
    const filesByName = new Map<string, FileReport>();
    const hunkFailures: HunkFailure[] = [];
    const skippedFiles = records.flatMap((r) => r.skippedFiles ?? []);
    for (const record of aggregateRecords) {
      const existing = filesByName.get(record.chunk.file);
      if (record.chunk.file) {
        filesByName.set(record.chunk.file, {
          filename: record.chunk.file,
          findings: (existing?.findings ?? 0) + record.findings.length,
          durationMs: (existing?.durationMs ?? 0) + record.durationMs,
          usage: addUsage(existing?.usage, record.usage),
        });
      }
      if (record.status === 'error' && record.error && !isReportLevelErrorRecord(record)) {
        hunkFailures.push({
          type: isExtractionErrorCode(record.error.code) ? 'extraction' : 'analysis',
          filename: record.chunk.file,
          lineRange: record.chunk.lineRange,
          code: record.error.code,
          message: record.error.message,
        });
      }
    }
    const failedHunks = chunkRecords.filter(
      (r) => r.status === 'error' && r.error && !isExtractionErrorCode(r.error.code),
    ).length;
    const failedExtractions = chunkRecords.filter(
      (r) => r.status === 'error' && r.error && isExtractionErrorCode(r.error.code),
    ).length;
    const allChunksFailed =
      chunkRecords.length > 0 &&
      findings.length === 0 &&
      chunkRecords.every((record) => record.status === 'error');
    const report: SkillReport = {
      skill,
      summary: summarizeFindings(skill, findings),
      findings,
      durationMs: aggregateRecords.reduce((sum, r) => sum + r.durationMs, 0),
      usage,
      files: [...filesByName.values()],
      model: aggregateRecords.find((r) => r.model)?.model,
    };
    if (reportLevelError) {
      report.error = reportLevelError;
    } else if (allChunksFailed) {
      report.error = {
        code: 'all_hunks_failed',
        message: `All ${chunkRecords.length} ${chunkRecords.length === 1 ? 'chunk' : 'chunks'} failed to analyze.`,
      };
    }
    if (auxiliaryUsage) report.auxiliaryUsage = auxiliaryUsage;
    if (failedHunks > 0) report.failedHunks = failedHunks;
    if (failedExtractions > 0) report.failedExtractions = failedExtractions;
    if (hunkFailures.length > 0) report.hunkFailures = hunkFailures;
    if (skippedFiles.length > 0) report.skippedFiles = skippedFiles;
    reports.push(report);
  }
  return reports;
}

function isReportLevelErrorRecord(record: JsonlChunkRecord): boolean {
  return record.status === 'error' && record.chunk.file === '' && Boolean(record.error);
}

export function parseJsonlReports(content: string): ParsedJsonlLog {
  const lines = content.trim().split('\n').filter((line) => line.trim());
  const reports: SkillReport[] = [];
  const chunks: JsonlChunkRecord[] = [];
  let runMetadata: JsonlRunMetadata | undefined;
  let totalDurationMs = 0;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);

      const chunk = JsonlChunkRecordSchema.safeParse(parsed);
      if (chunk.success) {
        chunks.push(chunk.data);
        if (!runMetadata) runMetadata = chunk.data.run;
        totalDurationMs = Math.max(totalDurationMs, chunk.data.run.durationMs);
        continue;
      }

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

  return { reports: [...reports, ...reportsFromChunks(chunks)], runMetadata, totalDurationMs };
}

/**
 * Lightweight metadata extracted from a JSONL log file. `summary` is
 * parsed from legacy summary records or synthesized from chunk records;
 * use `inProgress` to distinguish active runs from completed runs.
 */
export interface LogFileMetadata {
  summary?: JsonlSummaryRecord;
  inProgress: boolean;
  /** Run metadata pulled from the summary or, failing that, the first skill record. */
  runMetadata?: JsonlRunMetadata;
  skills: string[];
  model?: string;
  headSha?: string;
  totalFiles: number;
}

/**
 * Parse a JSONL log file's summary, skill names, and high-level metadata.
 * Returns undefined when the file can't be read or contains no parseable
 * records; in-progress files (valid records but no summary yet) return
 * metadata with `inProgress: true`.
 */
export function parseLogMetadata(filePath: string): LogFileMetadata | undefined {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return undefined;
  }
  const lines = content.trim().split('\n').filter((l) => l.trim());

  let summary: JsonlSummaryRecord | undefined;
  let firstRun: JsonlRunMetadata | undefined;
  const skills: string[] = [];
  let model: string | undefined;
  let headSha: string | undefined;
  const uniqueFiles = new Set<string>();
  const chunks: JsonlChunkRecord[] = [];
  let recognizedRecords = 0;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      const chunk = JsonlChunkRecordSchema.safeParse(parsed);
      if (chunk.success) {
        chunks.push(chunk.data);
        recognizedRecords++;
        if (!skills.includes(chunk.data.skill)) {
          skills.push(chunk.data.skill);
        }
        if (!model && chunk.data.model) {
          model = chunk.data.model;
        }
        if (!model && chunk.data.run.model) {
          model = chunk.data.run.model;
        }
        if (!headSha && chunk.data.run.headSha) {
          headSha = chunk.data.run.headSha;
        }
        if (!firstRun) firstRun = chunk.data.run;
        if (chunk.data.chunk.file) {
          uniqueFiles.add(chunk.data.chunk.file);
        }
      } else if (parsed.type === 'summary') {
        summary = JsonlSummaryRecordSchema.parse(parsed);
        recognizedRecords++;
        if (!model && parsed.run?.model && typeof parsed.run.model === 'string') {
          model = parsed.run.model;
        }
        if (!headSha && parsed.run?.headSha && typeof parsed.run.headSha === 'string') {
          headSha = parsed.run.headSha;
        }
        if (!firstRun) firstRun = summary.run;
      } else if (parsed.skill && typeof parsed.skill === 'string') {
        recognizedRecords++;
        if (!skills.includes(parsed.skill)) {
          skills.push(parsed.skill);
        }
        if (!model && parsed.run?.model && typeof parsed.run.model === 'string') {
          model = parsed.run.model;
        }
        if (!headSha && parsed.run?.headSha && typeof parsed.run.headSha === 'string') {
          headSha = parsed.run.headSha;
        }
        if (!firstRun && parsed.run) {
          const runResult = JsonlRunMetadataSchema.safeParse(parsed.run);
          if (runResult.success) firstRun = runResult.data;
        }
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

  // Empty or fully corrupt files (no parseable records) surface as
  // "parse error" in the list, not as in-progress runs.
  if (recognizedRecords === 0 && lines.length > 0) return undefined;
  if (!summary && chunks.length > 0) {
    const reports = reportsFromChunks(chunks);
    const lastDuration = chunks.reduce((max, chunk) => Math.max(max, chunk.run.durationMs), 0);
    const firstChunk = chunks[0];
    if (!firstChunk) return undefined;
    const run = { ...(firstRun ?? firstChunk.run), durationMs: lastDuration };
    summary = buildSummaryJsonlRecord(reports, run);
  }

  return {
    summary,
    inProgress: chunks.length > 0 ? !existsSync(`${filePath}.done`) : !summary && !existsSync(`${filePath}.done`),
    runMetadata: summary?.run ?? firstRun,
    skills,
    model,
    headSha,
    totalFiles: uniqueFiles.size,
  };
}
