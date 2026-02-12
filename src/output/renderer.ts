import { SEVERITY_ORDER, filterFindingsBySeverity } from '../types/index.js';
import type { SkillReport, Finding, Severity, SeverityThreshold } from '../types/index.js';
import type { RenderResult, RenderOptions, GitHubReview, GitHubComment } from './types.js';
import { formatStatsCompact, countBySeverity, pluralize } from '../cli/output/formatters.js';
import { generateContentHash, generateMarker } from './dedup.js';
import { escapeHtml } from '../utils/index.js';

const SEVERITY_EMOJI: Record<Severity, string> = {
  critical: ':rotating_light:',
  high: ':warning:',
  medium: ':orange_circle:',
  low: ':large_blue_circle:',
  info: ':information_source:',
};

export function renderSkillReport(report: SkillReport, options: RenderOptions = {}): RenderResult {
  const { includeSuggestions = true, maxFindings, groupByFile = true, reportOn, failOn, requestChanges, checkRunUrl, totalFindings, allFindings } = options;

  // Filter by reportOn threshold first, then apply maxFindings limit
  const filteredFindings = filterFindingsBySeverity(report.findings, reportOn);
  const findings = maxFindings ? filteredFindings.slice(0, maxFindings) : filteredFindings;
  const sortedFindings = [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  // Calculate how many findings were filtered out
  const total = totalFindings ?? report.findings.length;
  const hiddenCount = total - sortedFindings.length;

  // Use allFindings for failOn evaluation if provided (e.g., when report.findings was modified for dedup)
  const findingsForFailOn = allFindings ?? report.findings;
  const review = renderReview(sortedFindings, report, includeSuggestions, failOn, findingsForFailOn, requestChanges);
  const summaryComment = renderSummaryComment(report, sortedFindings, groupByFile, checkRunUrl, hiddenCount);

  return { review, summaryComment };
}

function renderReview(
  findings: Finding[],
  report: SkillReport,
  includeSuggestions: boolean,
  failOn?: SeverityThreshold,
  allFindings?: Finding[],
  requestChanges?: boolean,
): GitHubReview | undefined {
  const findingsWithLocation = findings.filter((f) => f.location);
  const findingsWithoutLocation = findings.filter((f) => !f.location);

  // Determine review event type based on failOn threshold against ALL findings.
  // Use allFindings (or report.findings) so failOn operates independently of reportOn and deduplication.
  const event = determineReviewEvent(allFindings ?? report.findings, failOn, requestChanges);

  // No inline comments to post. Create a review only for REQUEST_CHANGES or locationless findings.
  if (findingsWithLocation.length === 0) {
    if (findingsWithoutLocation.length > 0) {
      return {
        event,
        body: renderFindingsBody(findingsWithoutLocation, report.skill),
        comments: [],
      };
    }
    // Generic fallback for REQUEST_CHANGES when failOn triggers on findings below reportOn threshold
    if (event === 'REQUEST_CHANGES') {
      return {
        event,
        body: 'Findings exceed the configured threshold. See the GitHub Check for details.',
        comments: [],
      };
    }
    return undefined;
  }

  const comments: GitHubComment[] = findingsWithLocation.map((finding) => {
    const location = finding.location;
    if (!location) {
      throw new Error('Unexpected: finding without location in filtered list');
    }
    const confidenceNote = finding.confidence ? ` (${finding.confidence} confidence)` : '';
    let body = `**${SEVERITY_EMOJI[finding.severity]} [${finding.id}] ${escapeHtml(finding.title)}**${confidenceNote}\n\n${escapeHtml(finding.description)}`;

    if (includeSuggestions && finding.suggestedFix) {
      body += `\n\n${renderSuggestion(finding.suggestedFix.description, finding.suggestedFix.diff)}`;
    }

    // Add attribution footnote with skill name, severity, and confidence
    const confidenceSuffix = finding.confidence ? `, ${finding.confidence} confidence` : '';
    body += `\n\n<sub>Identified by Warden via \`${report.skill}\` · ${finding.severity}${confidenceSuffix}</sub>`;

    // Add deduplication marker
    const contentHash = generateContentHash(finding.title, finding.description);
    const line = location.endLine ?? location.startLine;
    body += `\n${generateMarker(location.path, line, contentHash)}`;

    const isMultiLine = location.endLine && location.startLine !== location.endLine;

    return {
      body,
      path: location.path,
      line: location.endLine ?? location.startLine,
      side: 'RIGHT' as const,
      start_line: isMultiLine ? location.startLine : undefined,
      start_side: isMultiLine ? ('RIGHT' as const) : undefined,
    };
  });

  // Include locationless findings in the review body when mixed with inline comments
  const body = findingsWithoutLocation.length > 0
    ? renderFindingsBody(findingsWithoutLocation, report.skill)
    : '';

  return {
    event,
    body,
    comments,
  };
}

/**
 * Determine the PR review event type based on failOn threshold.
 * Returns:
 * - REQUEST_CHANGES if failOn is set and findings meet/exceed the threshold
 * - COMMENT otherwise
 *
 * Clearing a previous REQUEST_CHANGES is handled by dismissing the review
 * in the PR workflow, not by posting an APPROVE.
 */
function determineReviewEvent(
  findings: Finding[],
  failOn?: SeverityThreshold,
  requestChanges?: boolean,
): GitHubReview['event'] {
  if (!requestChanges) return 'COMMENT';

  const hasActiveThreshold = failOn && failOn !== 'off';

  const hasBlockingFinding =
    hasActiveThreshold &&
    findings.some((f) => SEVERITY_ORDER[f.severity] <= SEVERITY_ORDER[failOn]);

  if (hasBlockingFinding) {
    return 'REQUEST_CHANGES';
  }

  return 'COMMENT';
}

function renderSuggestion(description: string, diff: string): string {
  const suggestionLines = diff
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1));

  if (suggestionLines.length === 0) {
    return `**Suggested fix:** ${escapeHtml(description)}`;
  }

  return `**Suggested fix:** ${escapeHtml(description)}\n\n\`\`\`suggestion\n${suggestionLines.join('\n')}\n\`\`\``;
}

function renderHiddenFindingsLink(hiddenCount: number, checkRunUrl: string): string {
  return `[View ${hiddenCount} additional ${pluralize(hiddenCount, 'finding')} in Checks](${checkRunUrl})`;
}

function renderSummaryComment(
  report: SkillReport,
  findings: Finding[],
  groupByFile: boolean,
  checkRunUrl?: string,
  hiddenCount?: number
): string {
  const lines: string[] = [];

  lines.push(`## ${report.skill}`);
  lines.push('');
  lines.push(escapeHtml(report.summary));
  lines.push('');

  if (findings.length === 0) {
    lines.push('No findings to report.');
    // Add link to full report if there are hidden findings
    if (hiddenCount && hiddenCount > 0 && checkRunUrl) {
      lines.push('');
      lines.push(renderHiddenFindingsLink(hiddenCount, checkRunUrl));
    }
    // Add stats footer even when there are no findings
    const statsLine = formatStatsCompact(report.durationMs, report.usage, report.auxiliaryUsage);
    if (statsLine) {
      lines.push('', '---', `<sub>${statsLine}</sub>`);
    }
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

  // Add link to full report if there are hidden findings
  if (hiddenCount && hiddenCount > 0 && checkRunUrl) {
    lines.push('');
    lines.push(renderHiddenFindingsLink(hiddenCount, checkRunUrl));
  }

  // Add stats footer
  const statsLine = formatStatsCompact(report.durationMs, report.usage, report.auxiliaryUsage);
  if (statsLine) {
    lines.push('', '---', `<sub>${statsLine}</sub>`);
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
  const confidence = finding.confidence ? ` [${finding.confidence} confidence]` : '';
  return `- ${SEVERITY_EMOJI[finding.severity]} \`${finding.id}\` **${escapeHtml(finding.title)}**${location}${confidence}: ${escapeHtml(finding.description)}`;
}

/** Render findings as markdown for inclusion in a review body. */
export function renderFindingsBody(findings: Finding[], skill: string): string {
  const lines: string[] = [];
  for (const finding of findings) {
    const emoji = SEVERITY_EMOJI[finding.severity];
    const location = finding.location
      ? ` (\`${finding.location.path}:${finding.location.startLine}\`)`
      : '';
    const confidence = finding.confidence ? ` (${finding.confidence} confidence)` : '';
    lines.push(`${emoji} **[${finding.id}] ${escapeHtml(finding.title)}**${location}${confidence}`);
    lines.push('');
    lines.push(escapeHtml(finding.description));
    lines.push('');
  }
  lines.push(`<sub>Identified by Warden via \`${skill}\`</sub>`);
  return lines.join('\n');
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
