import { readFileSync } from 'node:fs';
import chalk from 'chalk';
import type { SkillReport, Finding, Severity } from '../types/index.js';
import { formatSeverityBadge, formatFindingCounts } from './output/index.js';

const SEVERITY_COLORS: Record<Severity, typeof chalk.red> = {
  critical: chalk.red.bold,
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.cyan,
  info: chalk.gray,
};

/**
 * Read a specific line from a file.
 * Returns undefined if the file can't be read or line doesn't exist.
 */
function readFileLine(filePath: string, lineNumber: number): string | undefined {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    if (lineNumber > 0 && lineNumber <= lines.length) {
      return lines[lineNumber - 1];
    }
  } catch {
    // File not readable, return undefined
  }
  return undefined;
}

function formatFinding(finding: Finding): string {
  const lines: string[] = [];
  const badge = formatSeverityBadge(finding.severity);
  const color = SEVERITY_COLORS[finding.severity];

  // Line 1: [filename] [title] with severity badge
  if (finding.location) {
    lines.push(`${badge} ${chalk.white(finding.location.path)} ${color(finding.title)}`);
  } else {
    lines.push(`${badge} ${color(finding.title)}`);
  }

  // Line 2: indented line number and actual code content
  if (finding.location?.startLine) {
    const codeLine = readFileLine(finding.location.path, finding.location.startLine);
    if (codeLine !== undefined) {
      const lineNum = chalk.dim(`${finding.location.startLine} │`);
      lines.push(`  ${lineNum} ${codeLine.trimStart()}`);
    }
  }

  // Blank line, then description
  lines.push('');
  lines.push(`  ${finding.description}`);

  // Suggested fix diff if available
  if (finding.suggestedFix?.diff) {
    lines.push('');
    // Format the diff with colors
    const diffLines = finding.suggestedFix.diff.split('\n').map((line) => {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        return chalk.green(`  ${line}`);
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        return chalk.red(`  ${line}`);
      } else if (line.startsWith('@@')) {
        return chalk.cyan(`  ${line}`);
      }
      return `  ${line}`;
    });
    lines.push(...diffLines);
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
      for (const finding of report.findings) {
        lines.push(formatFinding(finding));
        lines.push('');
      }
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
