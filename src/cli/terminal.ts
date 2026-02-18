import { readFileSync } from 'node:fs';
import chalk from 'chalk';
import type { SkillReport, Finding, Severity, SeverityThreshold } from '../types/index.js';
import { filterFindingsBySeverity } from '../types/index.js';
import {
  formatSeverityBadge,
  formatSeverityPlain,
  formatFindingCounts,
  formatFindingCountsPlain,
  formatDuration,
  formatElapsed,
  formatLocation,
  countBySeverity,
  pluralize,
} from './output/index.js';
import { Verbosity } from './output/verbosity.js';
import { BoxRenderer } from './output/box.js';
import type { OutputMode } from './output/tty.js';

const SEVERITY_COLORS: Record<Severity, typeof chalk.red> = {
  critical: chalk.red.bold,
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.green,
  info: chalk.blue,
};

type FileLineResult =
  | { status: 'ok'; line: string }
  | { status: 'file_unavailable' }
  | { status: 'line_not_found' };

/**
 * Read a specific line from a file.
 * Returns a result indicating success, file unavailable, or line not found.
 */
function readFileLine(filePath: string, lineNumber: number): FileLineResult {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const line = lines[lineNumber - 1];
    if (lineNumber > 0 && lineNumber <= lines.length && line !== undefined) {
      return { status: 'ok', line };
    }
    return { status: 'line_not_found' };
  } catch {
    return { status: 'file_unavailable' };
  }
}

interface RenderOptions {
  suppressFixDiffs?: boolean;
  verbosity?: Verbosity;
}

/**
 * Format a finding for TTY display.
 */
function formatFindingTTY(finding: Finding, options?: RenderOptions): string[] {
  const lines: string[] = [];
  const badge = formatSeverityBadge(finding.severity);
  const color = SEVERITY_COLORS[finding.severity];

  // Title line with severity dot
  const titleParts = [badge, color(finding.title)];
  lines.push(titleParts.join(' '));

  // Location with elapsed time
  if (finding.location) {
    const locParts = [chalk.dim(`${finding.location.path}:${finding.location.startLine}`)];
    if (finding.elapsedMs !== undefined) {
      locParts.push(chalk.dim(formatElapsed(finding.elapsedMs)));
    }
    lines.push(`  ${locParts.join('  ')}`);
  }

  // Code snippet
  if (finding.location?.startLine) {
    const result = readFileLine(finding.location.path, finding.location.startLine);
    const lineNum = chalk.dim(`${finding.location.startLine} │`);
    if (result.status === 'ok') {
      lines.push(`  ${lineNum} ${result.line.trimStart()}`);
    } else if (result.status === 'file_unavailable') {
      lines.push(`  ${lineNum} ${chalk.dim.italic('(file unavailable)')}`);
    }
    // For 'line_not_found', we silently skip - the line may not exist in this version
  }

  // Additional locations
  if (finding.additionalLocations?.length) {
    const count = finding.additionalLocations.length;
    lines.push(`  ${chalk.dim(`+${count} more ${pluralize(count, 'location')}:`)}`);
    for (const loc of finding.additionalLocations) {
      const range = loc.endLine ? `${loc.startLine}-${loc.endLine}` : `${loc.startLine}`;
      lines.push(`    ${chalk.dim(`${loc.path}:${range}`)}`);
    }
  }

  // Blank line, then description
  lines.push('');
  lines.push(`  ${chalk.dim(finding.description)}`);

  // Suggested fix diff if available (suppress when step-through will show it)
  if (finding.suggestedFix?.diff && !options?.suppressFixDiffs) {
    lines.push('');
    lines.push(chalk.dim('  Suggested fix:'));
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

  return lines;
}

/**
 * Format a finding for CI (non-TTY) display.
 */
function formatFindingCI(finding: Finding): string[] {
  const lines: string[] = [];
  const badge = formatSeverityPlain(finding.severity);

  // Title line with location (including endLine range) and elapsed time
  const titleParts = [badge];
  if (finding.location) {
    titleParts.push(formatLocation(finding.location.path, finding.location.startLine, finding.location.endLine));
  }
  titleParts.push('-', finding.title);
  if (finding.elapsedMs !== undefined) {
    titleParts.push(`(${formatElapsed(finding.elapsedMs)})`);
  }
  lines.push(titleParts.join(' '));

  // Confidence
  if (finding.confidence) {
    lines.push(`  confidence: ${finding.confidence}`);
  }

  // Additional locations
  if (finding.additionalLocations?.length) {
    const locs = finding.additionalLocations.map((loc) => {
      const range = loc.endLine ? `${loc.startLine}-${loc.endLine}` : `${loc.startLine}`;
      return `${loc.path}:${range}`;
    });
    lines.push(`  also at: ${locs.join(', ')}`);
  }

  // Description
  lines.push(`  ${finding.description}`);

  // Suggested fix diff (plain text, no color)
  if (finding.suggestedFix?.diff) {
    lines.push('');
    lines.push('  Suggested fix:');
    for (const line of finding.suggestedFix.diff.split('\n')) {
      lines.push(`  ${line}`);
    }
  }

  return lines;
}

/**
 * Render a skill report as a box (TTY mode).
 */
function renderSkillBoxTTY(report: SkillReport, mode: OutputMode, options?: RenderOptions): string[] {
  const counts = countBySeverity(report.findings);
  const durationStr = report.durationMs !== undefined ? formatDuration(report.durationMs) : undefined;

  const box = new BoxRenderer({
    title: report.skill,
    badge: durationStr,
    mode,
  });

  box.header();

  // Finding counts summary line
  const countStr = formatFindingCounts(counts);
  box.content(countStr);

  if (report.findings.length === 0) {
    box.blank();
    box.content(chalk.green('No issues found.'));
  } else {
    // Render each finding
    for (const [index, finding] of report.findings.entries()) {
      box.divider();
      box.blank();
      const findingLines = formatFindingTTY(finding, options);
      box.content(findingLines);
      // Only add blank after finding if not the last one
      if (index < report.findings.length - 1) {
        box.blank();
      }
    }
  }

  box.footer();

  return box.render();
}

/**
 * Render a skill report for CI (non-TTY) mode.
 * See specs/reporters.md "Plain" findings report section.
 */
function renderSkillCI(report: SkillReport, verbosity: Verbosity = Verbosity.Normal): string[] {
  const lines: string[] = [];
  const counts = countBySeverity(report.findings);
  const durationStr = report.durationMs !== undefined ? ` (${formatDuration(report.durationMs)})` : '';
  const summary = formatFindingCountsPlain(counts);

  // Header: skill (duration) - summary
  lines.push(`${report.skill}${durationStr} - ${summary}`);

  // Per-skill warnings for operational issues
  if (report.failedHunks) {
    lines.push(`  WARN: ${report.failedHunks} ${pluralize(report.failedHunks, 'chunk')} failed to analyze`);
  }
  if (report.failedExtractions) {
    lines.push(`  WARN: ${report.failedExtractions} finding ${pluralize(report.failedExtractions, 'extraction')} failed`);
  }
  if ((report.failedHunks || report.failedExtractions) && verbosity < Verbosity.Verbose) {
    lines.push('  Use -v for failure details');
  }

  for (const [index, finding] of report.findings.entries()) {
    if (index > 0) lines.push('');
    lines.push(...formatFindingCI(finding));
  }

  return lines;
}

/**
 * Render skill reports for terminal output.
 * @param reports - The skill reports to render
 * @param mode - Output mode (TTY vs non-TTY)
 */
export function renderTerminalReport(reports: SkillReport[], mode?: OutputMode, options?: RenderOptions): string {
  const lines: string[] = [];

  // Default to TTY mode if not specified (for backwards compatibility)
  const outputMode: OutputMode = mode ?? {
    isTTY: true,
    supportsColor: true,
    columns: 80,
  };

  if (outputMode.isTTY) {
    // TTY mode: use boxes
    for (const report of reports) {
      lines.push(...renderSkillBoxTTY(report, outputMode, options));
      lines.push('');
    }
  } else {
    // CI mode: plain text
    for (const report of reports) {
      lines.push(...renderSkillCI(report, options?.verbosity));
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Filter reports to only include findings at or above the given severity threshold.
 * Returns new report objects with filtered findings; does not mutate the originals.
 * If reportOn is 'off', returns reports with empty findings.
 */
export function filterReportsBySeverity(reports: SkillReport[], reportOn?: SeverityThreshold): SkillReport[] {
  if (!reportOn) return reports;
  return reports.map((report) => ({
    ...report,
    findings: filterFindingsBySeverity(report.findings, reportOn),
  }));
}

