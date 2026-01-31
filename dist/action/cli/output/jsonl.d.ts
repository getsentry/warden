import type { SkillReport, UsageStats } from '../../types/index.js';
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
 * Write skill reports to a JSONL file.
 * Each line contains one skill report with run metadata.
 * A final summary line is appended at the end.
 */
export declare function writeJsonlReport(outputPath: string, reports: SkillReport[], durationMs: number): void;
//# sourceMappingURL=jsonl.d.ts.map