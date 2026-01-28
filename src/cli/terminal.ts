import type { SkillReport, Finding, Severity } from '../types/index.js';

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgCyan: '\x1b[46m',
  bgGray: '\x1b[100m',
};

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: COLORS.red + COLORS.bold,
  high: COLORS.red,
  medium: COLORS.yellow,
  low: COLORS.cyan,
  info: COLORS.gray,
};

const SEVERITY_BADGES: Record<Severity, string> = {
  critical: `${COLORS.bgRed}${COLORS.white}${COLORS.bold} CRITICAL ${COLORS.reset}`,
  high: `${COLORS.red}${COLORS.bold}[HIGH]${COLORS.reset}`,
  medium: `${COLORS.yellow}[MEDIUM]${COLORS.reset}`,
  low: `${COLORS.cyan}[LOW]${COLORS.reset}`,
  info: `${COLORS.gray}[INFO]${COLORS.reset}`,
};

function formatLocation(finding: Finding): string {
  if (!finding.location) {
    return '';
  }
  const loc = finding.location;
  const lines =
    loc.endLine && loc.endLine !== loc.startLine
      ? `${loc.startLine}-${loc.endLine}`
      : `${loc.startLine}`;
  return `${COLORS.dim}${loc.path}:${lines}${COLORS.reset}`;
}

function formatFinding(finding: Finding, index: number): string {
  const lines: string[] = [];
  const badge = SEVERITY_BADGES[finding.severity];
  const color = SEVERITY_COLORS[finding.severity];

  // Title line with badge
  lines.push(`${COLORS.dim}${index + 1}.${COLORS.reset} ${badge} ${color}${finding.title}${COLORS.reset}`);

  // Location
  const location = formatLocation(finding);
  if (location) {
    lines.push(`   ${location}`);
  }

  // Description
  lines.push(`   ${finding.description}`);

  // Suggested fix
  if (finding.suggestedFix) {
    lines.push(`   ${COLORS.dim}Fix:${COLORS.reset} ${finding.suggestedFix.description}`);
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

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return `${COLORS.cyan}${COLORS.bold}No findings${COLORS.reset}`;
  }

  const parts: string[] = [];
  if (counts.critical > 0) {
    parts.push(`${COLORS.red}${COLORS.bold}${counts.critical} critical${COLORS.reset}`);
  }
  if (counts.high > 0) {
    parts.push(`${COLORS.red}${counts.high} high${COLORS.reset}`);
  }
  if (counts.medium > 0) {
    parts.push(`${COLORS.yellow}${counts.medium} medium${COLORS.reset}`);
  }
  if (counts.low > 0) {
    parts.push(`${COLORS.cyan}${counts.low} low${COLORS.reset}`);
  }
  if (counts.info > 0) {
    parts.push(`${COLORS.gray}${counts.info} info${COLORS.reset}`);
  }

  return `${COLORS.bold}${total} finding${total === 1 ? '' : 's'}${COLORS.reset}: ${parts.join(', ')}`;
}

/**
 * Render skill reports for terminal output.
 */
export function renderTerminalReport(reports: SkillReport[]): string {
  const lines: string[] = [];

  for (const report of reports) {
    lines.push(`${COLORS.bold}${COLORS.white}=== ${report.skill} ===${COLORS.reset}`);
    lines.push(`${COLORS.dim}${report.summary}${COLORS.reset}`);
    lines.push('');

    if (report.findings.length === 0) {
      lines.push(`${COLORS.cyan}No issues found.${COLORS.reset}`);
    } else {
      report.findings.forEach((finding, i) => {
        lines.push(formatFinding(finding, i));
        lines.push('');
      });
    }

    lines.push('');
  }

  // Overall summary
  lines.push(`${COLORS.dim}${'─'.repeat(50)}${COLORS.reset}`);
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
