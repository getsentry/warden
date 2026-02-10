import { readFileSync } from 'node:fs';
import chalk from 'chalk';
import { filterFindingsBySeverity } from '../types/index.js';
import { formatSeverityBadge, formatSeverityPlain, formatFindingCounts, formatFindingCountsPlain, formatDuration, formatElapsed, formatLocation, countBySeverity, pluralize, } from './output/index.js';
import { BoxRenderer } from './output/box.js';
const SEVERITY_COLORS = {
    critical: chalk.red.bold,
    high: chalk.red,
    medium: chalk.yellow,
    low: chalk.green,
    info: chalk.blue,
};
/**
 * Read a specific line from a file.
 * Returns a result indicating success, file unavailable, or line not found.
 */
function readFileLine(filePath, lineNumber) {
    try {
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const line = lines[lineNumber - 1];
        if (lineNumber > 0 && lineNumber <= lines.length && line !== undefined) {
            return { status: 'ok', line };
        }
        return { status: 'line_not_found' };
    }
    catch {
        return { status: 'file_unavailable' };
    }
}
/**
 * Format a finding for TTY display.
 */
function formatFindingTTY(finding) {
    const lines = [];
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
        }
        else if (result.status === 'file_unavailable') {
            lines.push(`  ${lineNum} ${chalk.dim.italic('(file unavailable)')}`);
        }
        // For 'line_not_found', we silently skip - the line may not exist in this version
    }
    // Blank line, then description
    lines.push('');
    lines.push(`  ${chalk.dim(finding.description)}`);
    // Suggested fix diff if available
    if (finding.suggestedFix?.diff) {
        lines.push('');
        lines.push(chalk.dim('  Suggested fix:'));
        const diffLines = finding.suggestedFix.diff.split('\n').map((line) => {
            if (line.startsWith('+') && !line.startsWith('+++')) {
                return chalk.green(`  ${line}`);
            }
            else if (line.startsWith('-') && !line.startsWith('---')) {
                return chalk.red(`  ${line}`);
            }
            else if (line.startsWith('@@')) {
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
function formatFindingCI(finding) {
    const lines = [];
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
function renderSkillBoxTTY(report, mode) {
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
    }
    else {
        // Render each finding
        for (const [index, finding] of report.findings.entries()) {
            box.divider();
            box.blank();
            const findingLines = formatFindingTTY(finding);
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
 */
function renderSkillCI(report) {
    const lines = [];
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
    for (const [index, finding] of report.findings.entries()) {
        if (index > 0)
            lines.push('');
        lines.push(...formatFindingCI(finding));
    }
    return lines;
}
/**
 * Render skill reports for terminal output.
 * @param reports - The skill reports to render
 * @param mode - Output mode (TTY vs non-TTY)
 */
export function renderTerminalReport(reports, mode) {
    const lines = [];
    // Default to TTY mode if not specified (for backwards compatibility)
    const outputMode = mode ?? {
        isTTY: true,
        supportsColor: true,
        columns: 80,
    };
    if (outputMode.isTTY) {
        // TTY mode: use boxes
        for (const report of reports) {
            lines.push(...renderSkillBoxTTY(report, outputMode));
            lines.push('');
        }
    }
    else {
        // CI mode: plain text
        for (const report of reports) {
            lines.push(...renderSkillCI(report));
            lines.push('');
        }
    }
    return lines.join('\n');
}
/**
 * Aggregate usage stats from reports.
 */
function aggregateUsage(reports) {
    const usages = reports.map((r) => r.usage).filter((u) => u !== undefined);
    if (usages.length === 0)
        return undefined;
    return usages.reduce((acc, u) => ({
        inputTokens: acc.inputTokens + u.inputTokens,
        outputTokens: acc.outputTokens + u.outputTokens,
        cacheReadInputTokens: (acc.cacheReadInputTokens ?? 0) + (u.cacheReadInputTokens ?? 0),
        cacheCreationInputTokens: (acc.cacheCreationInputTokens ?? 0) + (u.cacheCreationInputTokens ?? 0),
        costUSD: acc.costUSD + u.costUSD,
    }));
}
/**
 * Filter reports to only include findings at or above the given severity threshold.
 * Returns new report objects with filtered findings; does not mutate the originals.
 * If reportOn is 'off', returns reports with empty findings.
 */
export function filterReportsBySeverity(reports, reportOn) {
    if (!reportOn)
        return reports;
    return reports.map((report) => ({
        ...report,
        findings: filterFindingsBySeverity(report.findings, reportOn),
    }));
}
/**
 * Render skill reports as JSON.
 */
export function renderJsonReport(reports) {
    const totalUsage = aggregateUsage(reports);
    const output = {
        reports: reports.map((r) => ({
            skill: r.skill,
            summary: r.summary,
            findings: r.findings,
            metadata: r.metadata,
            durationMs: r.durationMs,
            usage: r.usage,
        })),
        summary: {
            totalFindings: reports.reduce((sum, r) => sum + r.findings.length, 0),
            bySeverity: {
                critical: reports.reduce((sum, r) => sum + r.findings.filter((f) => f.severity === 'critical').length, 0),
                high: reports.reduce((sum, r) => sum + r.findings.filter((f) => f.severity === 'high').length, 0),
                medium: reports.reduce((sum, r) => sum + r.findings.filter((f) => f.severity === 'medium').length, 0),
                low: reports.reduce((sum, r) => sum + r.findings.filter((f) => f.severity === 'low').length, 0),
                info: reports.reduce((sum, r) => sum + r.findings.filter((f) => f.severity === 'info').length, 0),
            },
            usage: totalUsage,
        },
    };
    return JSON.stringify(output, null, 2);
}
//# sourceMappingURL=terminal.js.map