import chalk from 'chalk';
import type { SkillReport, Finding, Severity } from '../types/index.js';
import { formatSeverityBadge, formatLocation, formatFindingCounts } from './output/index.js';

function formatFindingLocation(finding: Finding): string {
  if (!finding.location) {
    return '';
  }
  return chalk.dim(formatLocation(finding.location.path, finding.location.startLine, finding.location.endLine));
}

const SEVERITY_COLORS: Record<Severity, typeof chalk.red> = {
  critical: chalk.red.bold,
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.cyan,
  info: chalk.gray,
};

function formatFinding(finding: Finding, index: number): string {
  const lines: string[] = [];
  const badge = formatSeverityBadge(finding.severity);
  const color = SEVERITY_COLORS[finding.severity];

  // Title line with badge
  lines.push(`${chalk.dim(`${index + 1}.`)} ${badge} ${color(finding.title)}`);

  // Location
  const location = formatFindingLocation(finding);
  if (location) {
    lines.push(`   ${location}`);
  }

  // Description
  lines.push(`   ${finding.description}`);

  // Suggested fix
  if (finding.suggestedFix) {
    lines.push(`   ${chalk.dim('Fix:')} ${finding.suggestedFix.description}`);
  }

  return lines.join('\n');
}

function formatSummary(reports: SkillReport[]): string {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const report of reports) {
    for (const finding of report.findings) {
      counts[finding.severity]++;
    }
  }

  return formatFindingCounts(counts);
}

/**
 * Render skill reports for terminal output.
 */
export function renderTerminalReport(reports: SkillReport[]): string {
  const lines: string[] = [];

  lines.push(chalk.bold('RESULTS'));
  lines.push('');

  for (const report of reports) {
    lines.push(chalk.bold.white(`=== ${report.skill} ===`));
    lines.push(chalk.dim(report.summary));
    lines.push('');

    if (report.findings.length === 0) {
      lines.push(chalk.cyan('No issues found.'));
    } else {
      report.findings.forEach((finding, i) => {
        lines.push(formatFinding(finding, i));
        lines.push('');
      });
    }

    lines.push('');
  }

  // Overall summary
  lines.push(chalk.dim('─'.repeat(50)));
  lines.push(formatSummary(reports));

  return lines.join('\n');
}

/**
 * Render skill reports as JSON.
 */
export function renderJsonReport(reports: SkillReport[]): string {
  const output = {
    reports: reports.map((r) => ({
      skill: r.skill,
      summary: r.summary,
      findings: r.findings,
      metadata: r.metadata,
    })),
    summary: {
      totalFindings: reports.reduce((sum, r) => sum + r.findings.length, 0),
      bySeverity: {
        critical: reports.reduce(
          (sum, r) => sum + r.findings.filter((f) => f.severity === 'critical').length,
          0
        ),
        high: reports.reduce(
          (sum, r) => sum + r.findings.filter((f) => f.severity === 'high').length,
          0
        ),
        medium: reports.reduce(
          (sum, r) => sum + r.findings.filter((f) => f.severity === 'medium').length,
          0
        ),
        low: reports.reduce(
          (sum, r) => sum + r.findings.filter((f) => f.severity === 'low').length,
          0
        ),
        info: reports.reduce(
          (sum, r) => sum + r.findings.filter((f) => f.severity === 'info').length,
          0
        ),
      },
    },
  };

  return JSON.stringify(output, null, 2);
}
