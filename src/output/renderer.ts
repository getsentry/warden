import type { SkillReport, Finding, Severity } from '../types/index.js';
import type { RenderResult, RenderOptions, GitHubReview, GitHubComment, GitHubLabel } from './types.js';

const SEVERITY_EMOJI: Record<Severity, string> = {
  critical: ':rotating_light:',
  high: ':warning:',
  medium: ':orange_circle:',
  low: ':large_blue_circle:',
  info: ':information_source:',
};

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export function renderSkillReport(report: SkillReport, options: RenderOptions = {}): RenderResult {
  const { includeSuggestions = true, maxFindings, groupByFile = true } = options;

  const findings = maxFindings ? report.findings.slice(0, maxFindings) : report.findings;
  const sortedFindings = [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  const review = renderReview(sortedFindings, report, includeSuggestions);
  const summaryComment = renderSummaryComment(report, sortedFindings, groupByFile);
  const labels = collectLabels(sortedFindings);

  return { review, summaryComment, labels };
}

function renderReview(
  findings: Finding[],
  report: SkillReport,
  includeSuggestions: boolean
): GitHubReview | undefined {
  const findingsWithLocation = findings.filter((f) => f.location);

  if (findingsWithLocation.length === 0) {
    return undefined;
  }

  const comments: GitHubComment[] = findingsWithLocation.map((finding) => {
    const location = finding.location;
    if (!location) {
      throw new Error('Unexpected: finding without location in filtered list');
    }
    let body = `**${SEVERITY_EMOJI[finding.severity]} ${finding.title}**\n\n${finding.description}`;

    if (includeSuggestions && finding.suggestedFix) {
      body += `\n\n${renderSuggestion(finding.suggestedFix.description, finding.suggestedFix.diff)}`;
    }

    return {
      body,
      path: location.path,
      line: location.endLine ?? location.startLine,
      side: 'RIGHT' as const,
    };
  });

  const hasBlockingSeverity = findings.some(
    (f) => f.severity === 'critical' || f.severity === 'high'
  );
  const event: GitHubReview['event'] = hasBlockingSeverity ? 'REQUEST_CHANGES' : 'COMMENT';

  return {
    event,
    body: `## ${report.skill}\n\n${report.summary}`,
    comments,
  };
}

function renderSuggestion(description: string, diff: string): string {
  const suggestionLines = diff
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1));

  if (suggestionLines.length === 0) {
    return `**Suggested fix:** ${description}`;
  }

  return `**Suggested fix:** ${description}\n\n\`\`\`suggestion\n${suggestionLines.join('\n')}\n\`\`\``;
}

function renderSummaryComment(
  report: SkillReport,
  findings: Finding[],
  groupByFile: boolean
): string {
  const lines: string[] = [];

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
  lines.push(
    `| Severity | Count |
|----------|-------|
${Object.entries(counts)
  .filter(([, count]) => count > 0)
  .sort(([a], [b]) => SEVERITY_ORDER[a as Severity] - SEVERITY_ORDER[b as Severity])
  .map(([severity, count]) => `| ${SEVERITY_EMOJI[severity as Severity]} ${severity} | ${count} |`)
  .join('\n')}`
  );
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
  } else {
    for (const finding of findings) {
      lines.push(renderFindingItem(finding));
    }
  }

  return lines.join('\n');
}

function formatLineRange(loc: { startLine: number; endLine?: number }): string {
  if (loc.endLine) {
    return `L${loc.startLine}-${loc.endLine}`;
  }
  return `L${loc.startLine}`;
}

function renderFindingItem(finding: Finding): string {
  const location = finding.location ? ` (${formatLineRange(finding.location)})` : '';
  return `- ${SEVERITY_EMOJI[finding.severity]} **${finding.title}**${location}: ${finding.description}`;
}

function countBySeverity(findings: Finding[]): Record<Severity, number> {
  return findings.reduce(
    (acc, f) => {
      acc[f.severity]++;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 } as Record<Severity, number>
  );
}

function groupFindingsByFile(findings: Finding[]): Record<string, Finding[]> {
  const groups: Record<string, Finding[]> = {};
  for (const finding of findings) {
    if (finding.location) {
      const path = finding.location.path;
      groups[path] ??= [];
      groups[path].push(finding);
    }
  }
  return groups;
}

function collectLabels(findings: Finding[]): GitHubLabel[] {
  const allLabels = findings.flatMap((f) => f.labels ?? []);
  const uniqueLabels = [...new Set(allLabels)];
  return uniqueLabels.map((name) => ({ name, action: 'add' as const }));
}
