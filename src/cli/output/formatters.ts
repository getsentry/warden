import chalk from 'chalk';
import figures from 'figures';
import type { Severity, Finding, FileChange } from '../../types/index.js';

/**
 * Format a duration in milliseconds to a human-readable string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Format an elapsed time for display (e.g., "+0.8s").
 */
export function formatElapsed(ms: number): string {
  if (ms < 1000) {
    return `+${Math.round(ms)}ms`;
  }
  return `+${(ms / 1000).toFixed(1)}s`;
}

/**
 * Severity configuration for display.
 */
const SEVERITY_CONFIG: Record<Severity, { color: typeof chalk.red; symbol: string }> = {
  critical: { color: chalk.red, symbol: figures.bullet },
  high: { color: chalk.redBright, symbol: figures.bullet },
  medium: { color: chalk.yellow, symbol: figures.bullet },
  low: { color: chalk.green, symbol: figures.bullet },
  info: { color: chalk.blue, symbol: figures.bullet },
};

/**
 * Format a severity dot for terminal output.
 */
export function formatSeverityDot(severity: Severity): string {
  const config = SEVERITY_CONFIG[severity];
  return config.color(config.symbol);
}

/**
 * Format a severity badge for terminal output (colored dot).
 */
export function formatSeverityBadge(severity: Severity): string {
  return formatSeverityDot(severity);
}

/**
 * Format a severity for plain text (CI mode).
 */
export function formatSeverityPlain(severity: Severity): string {
  return `[${severity}]`;
}

/**
 * Format a file location string.
 */
export function formatLocation(path: string, startLine?: number, endLine?: number): string {
  if (!startLine) {
    return path;
  }
  if (endLine && endLine !== startLine) {
    return `${path}:${startLine}-${endLine}`;
  }
  return `${path}:${startLine}`;
}

/**
 * Format a finding for terminal display.
 */
export function formatFindingCompact(finding: Finding): string {
  const badge = formatSeverityBadge(finding.severity);
  const location = finding.location
    ? chalk.dim(formatLocation(finding.location.path, finding.location.startLine, finding.location.endLine))
    : '';

  return `${badge} ${finding.title}${location ? ` ${location}` : ''}`;
}

/**
 * Format finding counts for display (with colored dots).
 */
export function formatFindingCounts(counts: Record<Severity, number>): string {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return chalk.green('No findings');
  }

  const parts: string[] = [];
  if (counts.critical > 0) parts.push(`${formatSeverityDot('critical')} ${counts.critical} critical`);
  if (counts.high > 0) parts.push(`${formatSeverityDot('high')} ${counts.high} high`);
  if (counts.medium > 0) parts.push(`${formatSeverityDot('medium')} ${counts.medium} medium`);
  if (counts.low > 0) parts.push(`${formatSeverityDot('low')} ${counts.low} low`);
  if (counts.info > 0) parts.push(`${formatSeverityDot('info')} ${counts.info} info`);

  return `${total} finding${total === 1 ? '' : 's'}: ${parts.join('  ')}`;
}

/**
 * Format finding counts for plain text.
 */
export function formatFindingCountsPlain(counts: Record<Severity, number>): string {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return 'No findings';
  }

  const parts: string[] = [];
  if (counts.critical > 0) parts.push(`${counts.critical} critical`);
  if (counts.high > 0) parts.push(`${counts.high} high`);
  if (counts.medium > 0) parts.push(`${counts.medium} medium`);
  if (counts.low > 0) parts.push(`${counts.low} low`);
  if (counts.info > 0) parts.push(`${counts.info} info`);

  return `${total} finding${total === 1 ? '' : 's'} (${parts.join(', ')})`;
}

/**
 * Format a progress indicator like [1/3].
 */
export function formatProgress(current: number, total: number): string {
  return chalk.dim(`[${current}/${total}]`);
}

/**
 * Format file change summary.
 */
export function formatFileStats(files: FileChange[]): string {
  const added = files.filter((f) => f.status === 'added').length;
  const modified = files.filter((f) => f.status === 'modified').length;
  const removed = files.filter((f) => f.status === 'removed').length;

  const parts: string[] = [];
  if (added > 0) parts.push(chalk.green(`+${added}`));
  if (modified > 0) parts.push(chalk.yellow(`~${modified}`));
  if (removed > 0) parts.push(chalk.red(`-${removed}`));

  return parts.length > 0 ? parts.join(' ') : '';
}

/**
 * Truncate a string to fit within a width, adding ellipsis if needed.
 */
export function truncate(str: string, maxWidth: number): string {
  if (str.length <= maxWidth) {
    return str;
  }
  if (maxWidth <= 3) {
    return str.slice(0, maxWidth);
  }
  return str.slice(0, maxWidth - 1) + figures.ellipsis;
}

/**
 * Pad a string on the right to reach a certain width.
 */
export function padRight(str: string, width: number): string {
  if (str.length >= width) {
    return str;
  }
  return str + ' '.repeat(width - str.length);
}

/**
 * Count findings by severity.
 */
export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const finding of findings) {
    counts[finding.severity]++;
  }

  return counts;
}
