import type { SkillReport, UsageStats, AuxiliaryUsageMap } from '../../types/index.js';
import type { FixStatus } from '../../action/fix-evaluation/types.js';
/**
 * Get the default run logs directory.
 * Uses WARDEN_STATE_DIR env var if set, otherwise ~/.local/warden/runs
 */
export declare function getRunLogsDir(): string;
/**
 * Generate a run log filename from directory name and timestamp.
 * Format: {dirname}_{timestamp}.jsonl
 * Timestamp has colons replaced with hyphens for filesystem compatibility.
 */
export declare function generateRunLogFilename(cwd: string, timestamp?: Date): string;
/**
 * Get the full path for an automatic run log.
 */
export declare function getRunLogPath(cwd: string, timestamp?: Date): string;
/**
 * Metadata for a JSONL run record.
 */
export interface JsonlRunMetadata {
    timestamp: string;
    durationMs: number;
    cwd: string;
}
/**
 * Per-file record within a JSONL skill record.
 */
export interface JsonlFileRecord {
    filename: string;
    findings: number;
    durationMs?: number;
    usage?: UsageStats;
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
    auxiliaryUsage?: AuxiliaryUsageMap;
    files?: JsonlFileRecord[];
}
/**
 * Per-evaluation detail for JSONL fix evaluation records.
 */
export interface JsonlFixEvalDetail {
    path: string;
    line: number;
    findingId?: string;
    verdict: FixStatus | 're_detected';
    reasoning?: string;
    durationMs: number;
    usage: UsageStats;
}
/**
 * JSONL record for fix evaluation results.
 */
export interface JsonlFixEvaluationRecord {
    run: JsonlRunMetadata;
    type: 'fix-evaluation';
    evaluated: number;
    resolved: number;
    needsAttention: number;
    skipped: number;
    failedEvaluations: number;
    usage?: UsageStats;
    evaluations?: JsonlFixEvalDetail[];
}
/**
 * Write skill reports to a JSONL file.
 * Each line contains one skill report with run metadata.
 * A final summary line is appended at the end.
 */
export declare function writeJsonlReport(outputPath: string, reports: SkillReport[], durationMs: number): void;
//# sourceMappingURL=jsonl.d.ts.map