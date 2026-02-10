import { SEVERITY_ORDER, filterFindingsBySeverity } from '../types/index.js';
import { formatDuration, formatCost, formatTokens, totalAuxiliaryCost, formatAuxiliarySuffix } from '../cli/output/formatters.js';
import { escapeHtml } from '../utils/index.js';
/**
 * Maximum number of annotations per API call (GitHub limit).
 */
const MAX_ANNOTATIONS_PER_REQUEST = 50;
/**
 * Map severity levels to GitHub annotation levels.
 * critical/high -> failure, medium -> warning, low/info -> notice
 */
export function severityToAnnotationLevel(severity) {
    switch (severity) {
        case 'critical':
        case 'high':
            return 'failure';
        case 'medium':
            return 'warning';
        case 'low':
        case 'info':
            return 'notice';
    }
}
/**
 * Convert findings to GitHub Check annotations.
 * Only findings with locations can be converted to annotations.
 * Returns at most MAX_ANNOTATIONS_PER_REQUEST annotations.
 * If reportOn is specified, only include findings at or above that severity.
 */
export function findingsToAnnotations(findings, reportOn) {
    // Filter by reportOn threshold if specified
    const filtered = filterFindingsBySeverity(findings, reportOn);
    // Filter to findings with location using type predicate
    const withLocation = filtered.filter((f) => Boolean(f.location));
    // Sort by severity (most severe first)
    const sorted = [...withLocation].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    // Limit to max annotations
    const limited = sorted.slice(0, MAX_ANNOTATIONS_PER_REQUEST);
    return limited.map((finding) => ({
        path: finding.location.path,
        start_line: finding.location.startLine,
        end_line: finding.location.endLine ?? finding.location.startLine,
        annotation_level: severityToAnnotationLevel(finding.severity),
        message: escapeHtml(finding.description),
        title: escapeHtml(finding.title),
    }));
}
/**
 * Determine the check conclusion based on findings and failOn threshold.
 * - No findings: success
 * - Findings, none >= failOn: neutral
 * - Findings >= failOn threshold: failure
 */
export function determineConclusion(findings, failOn, failCheck) {
    if (findings.length === 0) {
        return 'success';
    }
    if (!failOn || failOn === 'off') {
        // No failure threshold or disabled, findings exist but don't cause failure
        return 'neutral';
    }
    const failOnOrder = SEVERITY_ORDER[failOn];
    const hasFailingSeverity = findings.some((f) => SEVERITY_ORDER[f.severity] <= failOnOrder);
    return hasFailingSeverity && failCheck ? 'failure' : 'neutral';
}
/**
 * Create a check run for a skill.
 * The check is created with status: in_progress.
 */
export async function createSkillCheck(octokit, skillName, options) {
    const { data } = await octokit.checks.create({
        owner: options.owner,
        repo: options.repo,
        name: `warden: ${skillName}`,
        head_sha: options.headSha,
        status: 'in_progress',
        started_at: new Date().toISOString(),
    });
    return {
        checkRunId: data.id,
        url: data.html_url ?? '',
    };
}
/**
 * Update a skill check with results.
 * Completes the check with conclusion, summary, and annotations.
 */
export async function updateSkillCheck(octokit, checkRunId, report, options) {
    // Conclusion is based on all findings (failOn behavior)
    const conclusion = determineConclusion(report.findings, options.failOn, options.failCheck);
    // Annotations are filtered by reportOn threshold
    const annotations = findingsToAnnotations(report.findings, options.reportOn);
    const summary = buildSkillSummary(report);
    const title = report.findings.length === 0
        ? 'No issues'
        : `${report.findings.length} issue${report.findings.length === 1 ? '' : 's'}`;
    await octokit.checks.update({
        owner: options.owner,
        repo: options.repo,
        check_run_id: checkRunId,
        status: 'completed',
        conclusion,
        completed_at: new Date().toISOString(),
        output: {
            title,
            summary,
            annotations,
        },
    });
}
/**
 * Mark a skill check as failed due to execution error.
 */
export async function failSkillCheck(octokit, checkRunId, error, options) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await octokit.checks.update({
        owner: options.owner,
        repo: options.repo,
        check_run_id: checkRunId,
        status: 'completed',
        conclusion: 'failure',
        completed_at: new Date().toISOString(),
        output: {
            title: 'Skill execution failed',
            summary: `Error: ${errorMessage}`,
        },
    });
}
/**
 * Create the core warden check run.
 * The check is created with status: in_progress.
 */
export async function createCoreCheck(octokit, options) {
    const { data } = await octokit.checks.create({
        owner: options.owner,
        repo: options.repo,
        name: 'warden',
        head_sha: options.headSha,
        status: 'in_progress',
        started_at: new Date().toISOString(),
    });
    return {
        checkRunId: data.id,
        url: data.html_url ?? '',
    };
}
/**
 * Update the core warden check with overall summary.
 */
export async function updateCoreCheck(octokit, checkRunId, summaryData, conclusion, options) {
    const summary = buildCoreSummary(summaryData);
    const title = summaryData.totalFindings === 0
        ? 'No issues'
        : `${summaryData.totalFindings} issue${summaryData.totalFindings === 1 ? '' : 's'}`;
    await octokit.checks.update({
        owner: options.owner,
        repo: options.repo,
        check_run_id: checkRunId,
        status: 'completed',
        conclusion,
        completed_at: new Date().toISOString(),
        output: {
            title,
            summary,
        },
    });
}
/**
 * Format a file location as a markdown code span.
 */
function formatLocation(location) {
    const { path, startLine, endLine } = location;
    const lineRange = endLine && endLine !== startLine ? `${startLine}-${endLine}` : `${startLine}`;
    return `\`${path}:${lineRange}\``;
}
/**
 * Render findings grouped by severity as collapsible markdown sections.
 */
function renderFindingsSections(findings) {
    const lines = [];
    const findingsBySeverity = new Map();
    for (const finding of findings) {
        const existing = findingsBySeverity.get(finding.severity) ?? [];
        existing.push(finding);
        findingsBySeverity.set(finding.severity, existing);
    }
    const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
    for (const severity of severityOrder) {
        const group = findingsBySeverity.get(severity);
        if (!group?.length)
            continue;
        const label = severity.charAt(0).toUpperCase() + severity.slice(1);
        lines.push(`### ${label}`, '');
        for (const finding of group) {
            const location = finding.location ? ` - ${formatLocation(finding.location)}` : '';
            lines.push('<details>');
            lines.push(`<summary><strong>${escapeHtml(finding.title)}</strong>${location}</summary>`, '');
            lines.push(escapeHtml(finding.description), '');
            lines.push('</details>', '');
        }
    }
    return lines;
}
/**
 * Render a stats footer line (duration, tokens, cost).
 */
function renderStatsFooter(durationMs, usage, auxiliaryUsage) {
    if (durationMs === undefined && !usage)
        return [];
    const parts = [];
    if (durationMs !== undefined) {
        parts.push(`**Duration:** ${formatDuration(durationMs)}`);
    }
    if (usage) {
        const totalInput = usage.inputTokens + (usage.cacheReadInputTokens ?? 0);
        parts.push(`**Tokens:** ${formatTokens(totalInput)} in / ${formatTokens(usage.outputTokens)} out`);
        const auxCost = auxiliaryUsage ? totalAuxiliaryCost(auxiliaryUsage) : 0;
        const totalCost = usage.costUSD + auxCost;
        const auxSuffix = auxiliaryUsage ? formatAuxiliarySuffix(auxiliaryUsage) : '';
        parts.push(`**Cost:** ${formatCost(totalCost)}${auxSuffix}`);
    }
    return ['---', parts.join(' · ')];
}
/**
 * Build the summary markdown for a skill check.
 */
function buildSkillSummary(report) {
    const lines = [escapeHtml(report.summary), ''];
    if (report.findings.length === 0) {
        lines.push('No issues found.');
    }
    else {
        const sortedFindings = [...report.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
        lines.push(...renderFindingsSections(sortedFindings));
    }
    lines.push(...renderStatsFooter(report.durationMs, report.usage, report.auxiliaryUsage));
    return lines.join('\n');
}
/** Maximum findings to show in the summary */
const MAX_SUMMARY_FINDINGS = 10;
/**
 * Build the summary markdown for the core warden check.
 */
function buildCoreSummary(data) {
    const lines = [];
    // Sort findings by severity and take top N
    const sortedFindings = [...data.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    const topFindings = sortedFindings.slice(0, MAX_SUMMARY_FINDINGS);
    if (topFindings.length > 0) {
        lines.push(...renderFindingsSections(topFindings));
        if (data.totalFindings > topFindings.length) {
            const remaining = data.totalFindings - topFindings.length;
            lines.push(`*...and ${remaining} more*`, '');
        }
    }
    else {
        lines.push('No issues found.', '');
    }
    // Skills table in collapsible section
    const hasSkillStats = data.skillResults.some((s) => s.durationMs !== undefined || s.usage);
    const skillPlural = data.totalSkills === 1 ? '' : 's';
    lines.push('<details>');
    lines.push(`<summary>${data.totalSkills} skill${skillPlural} analyzed</summary>`, '');
    if (hasSkillStats) {
        lines.push('| Skill | Findings | Duration | Cost |', '|-------|----------|----------|------|');
        for (const skill of data.skillResults) {
            const duration = skill.durationMs !== undefined ? formatDuration(skill.durationMs) : '-';
            const cost = skill.usage ? formatCost(skill.usage.costUSD) : '-';
            lines.push(`| ${skill.name} | ${skill.findingCount} | ${duration} | ${cost} |`);
        }
    }
    else {
        lines.push('| Skill | Findings |', '|-------|----------|');
        for (const skill of data.skillResults) {
            lines.push(`| ${skill.name} | ${skill.findingCount} |`);
        }
    }
    lines.push('', '</details>', '');
    lines.push(...renderStatsFooter(data.totalDurationMs, data.totalUsage, data.totalAuxiliaryUsage));
    return lines.join('\n');
}
/**
 * Aggregate severity counts from multiple reports.
 */
export function aggregateSeverityCounts(reports) {
    const counts = {
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
    return counts;
}
//# sourceMappingURL=github-checks.js.map