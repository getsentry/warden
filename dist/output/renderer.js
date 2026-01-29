import { SEVERITY_ORDER, filterFindingsBySeverity } from '../types/index.js';
const SEVERITY_EMOJI = {
    critical: ':rotating_light:',
    high: ':warning:',
    medium: ':orange_circle:',
    low: ':large_blue_circle:',
    info: ':information_source:',
};
export function renderSkillReport(report, options = {}) {
    const { includeSuggestions = true, maxFindings, groupByFile = true, extraLabels = [], commentOn } = options;
    // Filter by commentOn threshold first, then apply maxFindings limit
    const filteredFindings = filterFindingsBySeverity(report.findings, commentOn);
    const findings = maxFindings ? filteredFindings.slice(0, maxFindings) : filteredFindings;
    const sortedFindings = [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    const review = renderReview(sortedFindings, report, includeSuggestions);
    const summaryComment = renderSummaryComment(report, sortedFindings, groupByFile);
    const labels = collectLabels(sortedFindings, extraLabels);
    return { review, summaryComment, labels };
}
function renderReview(findings, report, includeSuggestions) {
    const findingsWithLocation = findings.filter((f) => f.location);
    if (findingsWithLocation.length === 0) {
        return undefined;
    }
    const comments = findingsWithLocation.map((finding) => {
        const location = finding.location;
        if (!location) {
            throw new Error('Unexpected: finding without location in filtered list');
        }
        let body = `**${SEVERITY_EMOJI[finding.severity]} ${finding.title}**\n\n${finding.description}`;
        if (includeSuggestions && finding.suggestedFix) {
            body += `\n\n${renderSuggestion(finding.suggestedFix.description, finding.suggestedFix.diff)}`;
        }
        // Add attribution footnote
        body += `\n\n---\n<sub>warden: ${report.skill}</sub>`;
        const isMultiLine = location.endLine && location.startLine !== location.endLine;
        return {
            body,
            path: location.path,
            line: location.endLine ?? location.startLine,
            side: 'RIGHT',
            start_line: isMultiLine ? location.startLine : undefined,
            start_side: isMultiLine ? 'RIGHT' : undefined,
        };
    });
    const hasBlockingSeverity = findings.some((f) => f.severity === 'critical' || f.severity === 'high');
    const event = hasBlockingSeverity ? 'REQUEST_CHANGES' : 'COMMENT';
    return {
        event,
        body: `## ${report.skill}\n\n${report.summary}`,
        comments,
    };
}
function renderSuggestion(description, diff) {
    const suggestionLines = diff
        .split('\n')
        .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
        .map((line) => line.slice(1));
    if (suggestionLines.length === 0) {
        return `**Suggested fix:** ${description}`;
    }
    return `**Suggested fix:** ${description}\n\n\`\`\`suggestion\n${suggestionLines.join('\n')}\n\`\`\``;
}
function renderSummaryComment(report, findings, groupByFile) {
    const lines = [];
    lines.push(`## ${report.skill}`);
    lines.push('');
    lines.push(report.summary);
    lines.push('');
    if (findings.length === 0) {
        lines.push('No findings to report.');
        return lines.join('\n');
    }
    const counts = countBySeverity(findings);
    lines.push('### Summary');
    lines.push('');
    lines.push(`| Severity | Count |
|----------|-------|
${Object.entries(counts)
        .filter(([, count]) => count > 0)
        .sort(([a], [b]) => SEVERITY_ORDER[a] - SEVERITY_ORDER[b])
        .map(([severity, count]) => `| ${SEVERITY_EMOJI[severity]} ${severity} | ${count} |`)
        .join('\n')}`);
    lines.push('');
    lines.push('### Findings');
    lines.push('');
    if (groupByFile) {
        const byFile = groupFindingsByFile(findings);
        for (const [file, fileFindings] of Object.entries(byFile)) {
            lines.push(`#### \`${file}\``);
            lines.push('');
            for (const finding of fileFindings) {
                lines.push(renderFindingItem(finding));
            }
            lines.push('');
        }
        const noLocation = findings.filter((f) => !f.location);
        if (noLocation.length > 0) {
            lines.push('#### General');
            lines.push('');
            for (const finding of noLocation) {
                lines.push(renderFindingItem(finding));
            }
        }
    }
    else {
        for (const finding of findings) {
            lines.push(renderFindingItem(finding));
        }
    }
    return lines.join('\n');
}
function formatLineRange(loc) {
    if (loc.endLine) {
        return `L${loc.startLine}-${loc.endLine}`;
    }
    return `L${loc.startLine}`;
}
function renderFindingItem(finding) {
    const location = finding.location ? ` (${formatLineRange(finding.location)})` : '';
    return `- ${SEVERITY_EMOJI[finding.severity]} **${finding.title}**${location}: ${finding.description}`;
}
function countBySeverity(findings) {
    return findings.reduce((acc, f) => {
        acc[f.severity]++;
        return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0, info: 0 });
}
function groupFindingsByFile(findings) {
    const groups = {};
    for (const finding of findings) {
        if (finding.location) {
            const path = finding.location.path;
            groups[path] ??= [];
            groups[path].push(finding);
        }
    }
    return groups;
}
function collectLabels(findings, extraLabels = []) {
    const findingLabels = findings.flatMap((f) => f.labels ?? []);
    const allLabels = [...findingLabels, ...extraLabels];
    const uniqueLabels = [...new Set(allLabels)];
    return uniqueLabels.map((name) => ({ name, action: 'add' }));
}
//# sourceMappingURL=renderer.js.map