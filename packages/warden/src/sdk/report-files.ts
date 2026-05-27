import type { FileReport, Finding, UsageStats } from '../types/index.js';

export interface FileReportInput {
  filename: string;
  durationMs?: number;
  usage?: UsageStats;
}

/**
 * Return whether a final finding should be counted against a file.
 */
export function findingAppliesToFile(finding: Finding, filename: string): boolean {
  if (finding.location?.path === filename) return true;
  return finding.additionalLocations?.some((location) => location.path === filename) ?? false;
}

/**
 * Count final findings per file while preserving timing and usage metadata.
 */
export function buildFileReports(files: FileReportInput[], findings: Finding[]): FileReport[] {
  return files.map((file) => ({
    filename: file.filename,
    findings: findings.filter((finding) => findingAppliesToFile(finding, file.filename)).length,
    durationMs: file.durationMs,
    usage: file.usage,
  }));
}
