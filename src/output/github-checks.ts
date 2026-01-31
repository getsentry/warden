import type { Octokit } from '@octokit/rest';
import { SEVERITY_ORDER, filterFindingsBySeverity } from '../types/index.js';
import type { Severity, SeverityThreshold, Finding, SkillReport, UsageStats } from '../types/index.js';
import { formatDuration, formatCost, formatTokens } from '../cli/output/formatters.js';
import { escapeHtml } from '../utils/index.js';

/**
 * GitHub Check annotation for inline code comments.
 */
export interface CheckAnnotation {
  path: string;
  start_line: number;
  end_line: number;
  annotation_level: 'failure' | 'warning' | 'notice';
  message: string;
  title?: string;
}

/**
 * Possible conclusions for a GitHub Check run.
 */
export type CheckConclusion = 'success' | 'failure' | 'neutral' | 'cancelled';

/**
 * Options for creating/updating checks.
 */
export interface CheckOptions {
  owner: string;
  repo: string;
  headSha: string;
}

/**
 * Options for updating a skill check.
 */
export interface UpdateSkillCheckOptions extends CheckOptions {
  failOn?: SeverityThreshold;
  /** Only include findings at or above this severity level in annotations */
  commentOn?: SeverityThreshold;
}

/**
 * Summary data for the core warden check.
 */
export interface CoreCheckSummaryData {
  totalSkills: number;
  totalFindings: number;
  findingsBySeverity: Record<Severity, number>;
  totalDurationMs?: number;
  totalUsage?: UsageStats;
  /** All findings from all skills */
  findings: Finding[];
  skillResults: {
    name: string;
    findingCount: number;
    conclusion: CheckConclusion;
    durationMs?: number;
    usage?: UsageStats;
  }[];
}

/**
 * Result from creating a check run.
 */
export interface CreateCheckResult {
  checkRunId: number;
  url: string;
}

/**
 * Maximum number of annotations per API call (GitHub limit).
 */
const MAX_ANNOTATIONS_PER_REQUEST = 50;

/**
 * Map severity levels to GitHub annotation levels.
 * critical/high -> failure, medium -> warning, low/info -> notice
 */
export function severityToAnnotationLevel(
  severity: Severity
): CheckAnnotation['annotation_level'] {
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
 * If commentOn is specified, only include findings at or above that severity.
 */
export function findingsToAnnotations(findings: Finding[], commentOn?: SeverityThreshold): CheckAnnotation[] {
  // Filter by commentOn threshold if specified
  const filtered = filterFindingsBySeverity(findings, commentOn);

  // Filter to findings with location using type predicate
  const withLocation = filtered.filter(
    (f): f is Finding & { location: NonNullable<Finding['location']> } => Boolean(f.location)
  );

  // Sort by severity (most severe first)
  const sorted = [...withLocation].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

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
export function determineConclusion(
  findings: Finding[],
  failOn?: SeverityThreshold
): CheckConclusion {
  if (findings.length === 0) {
    return 'success';
  }

  if (!failOn || failOn === 'off') {
    // No failure threshold or disabled, findings exist but don't cause failure
    return 'neutral';
  }

  const failOnOrder = SEVERITY_ORDER[failOn];
  const hasFailingSeverity = findings.some(
    (f) => SEVERITY_ORDER[f.severity] <= failOnOrder
  );

  return hasFailingSeverity ? 'failure' : 'neutral';
}

/**
 * Create a check run for a skill.
 * The check is created with status: in_progress.
 */
export async function createSkillCheck(
  octokit: Octokit,
  skillName: string,
  options: CheckOptions
): Promise<CreateCheckResult> {
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
export async function updateSkillCheck(
  octokit: Octokit,
  checkRunId: number,
  report: SkillReport,
  options: UpdateSkillCheckOptions
): Promise<void> {
  // Conclusion is based on all findings (failOn behavior)
  const conclusion = determineConclusion(report.findings, options.failOn);
  // Annotations are filtered by commentOn threshold
  const annotations = findingsToAnnotations(report.findings, options.commentOn);

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
export async function failSkillCheck(
  octokit: Octokit,
  checkRunId: number,
  error: unknown,
  options: CheckOptions
): Promise<void> {
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
export async function createCoreCheck(
  octokit: Octokit,
  options: CheckOptions
): Promise<CreateCheckResult> {
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
export async function updateCoreCheck(
  octokit: Octokit,
  checkRunId: number,
  summaryData: CoreCheckSummaryData,
  conclusion: CheckConclusion,
  options: Omit<CheckOptions, 'headSha'>
): Promise<void> {
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
 * Build the summary markdown for a skill check.
 */
function buildSkillSummary(report: SkillReport): string {
  const lines: string[] = [escapeHtml(report.summary), ''];

  if (report.findings.length === 0) {
    lines.push('No issues found.');
  } else {
    // Sort findings by severity
    const sortedFindings = [...report.findings].sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    );

    // Group findings by severity
    const findingsBySeverity = new Map<Severity, Finding[]>();
    for (const finding of sortedFindings) {
      const existing = findingsBySeverity.get(finding.severity) ?? [];
      existing.push(finding);
      findingsBySeverity.set(finding.severity, existing);
    }

    const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
    for (const severity of severityOrder) {
      const findings = findingsBySeverity.get(severity);
      if (!findings?.length) continue;

      const label = severity.charAt(0).toUpperCase() + severity.slice(1);
      lines.push(`### ${label}`, '');

      for (const finding of findings) {
        const location = finding.location ? ` - ${formatLocation(finding.location)}` : '';
        lines.push('<details>');
        lines.push(`<summary><strong>${escapeHtml(finding.title)}</strong>${location}</summary>`, '');
        lines.push(escapeHtml(finding.description), '');
        lines.push('</details>', '');
      }
    }
  }

  // Add stats footer if available
  if (report.durationMs !== undefined || report.usage) {
    const statsParts: string[] = [];
    if (report.durationMs !== undefined) {
      statsParts.push(`**Duration:** ${formatDuration(report.durationMs)}`);
    }
    if (report.usage) {
      const totalInput = report.usage.inputTokens + (report.usage.cacheReadInputTokens ?? 0);
      statsParts.push(`**Tokens:** ${formatTokens(totalInput)} in / ${formatTokens(report.usage.outputTokens)} out`);
      statsParts.push(`**Cost:** ${formatCost(report.usage.costUSD)}`);
    }
    lines.push('---', statsParts.join(' · '));
  }

  return lines.join('\n');
}

/**
 * Format a file location as a markdown code span.
 */
function formatLocation(location: { path: string; startLine: number; endLine?: number }): string {
  const { path, startLine, endLine } = location;
  const lineRange = endLine && endLine !== startLine ? `${startLine}-${endLine}` : `${startLine}`;
  return `\`${path}:${lineRange}\``;
}

/** Maximum findings to show in the summary */
const MAX_SUMMARY_FINDINGS = 10;

/**
 * Build the summary markdown for the core warden check.
 */
function buildCoreSummary(data: CoreCheckSummaryData): string {
  const lines: string[] = [];

  // Sort findings by severity and take top N
  const sortedFindings = [...data.findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
  const topFindings = sortedFindings.slice(0, MAX_SUMMARY_FINDINGS);

  // Show findings grouped by severity, each in a collapsible details
  if (topFindings.length > 0) {
    const findingsBySeverity = new Map<Severity, Finding[]>();
    for (const finding of topFindings) {
      const existing = findingsBySeverity.get(finding.severity) ?? [];
      existing.push(finding);
      findingsBySeverity.set(finding.severity, existing);
    }

    const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
    for (const severity of severityOrder) {
      const findings = findingsBySeverity.get(severity);
      if (!findings?.length) continue;

      const label = severity.charAt(0).toUpperCase() + severity.slice(1);
      lines.push(`### ${label}`, '');

      for (const finding of findings) {
        const location = finding.location ? ` - ${formatLocation(finding.location)}` : '';
        lines.push('<details>');
        lines.push(`<summary><strong>${escapeHtml(finding.title)}</strong>${location}</summary>`, '');
        lines.push(escapeHtml(finding.description), '');
        lines.push('</details>', '');
      }
    }

    // Note if there are more findings not shown
    if (data.totalFindings > topFindings.length) {
      const remaining = data.totalFindings - topFindings.length;
      lines.push(`*...and ${remaining} more*`, '');
    }
  } else {
    lines.push('No issues found.', '');
  }

  // Skills table in collapsible section
  const hasSkillStats = data.skillResults.some((s) => s.durationMs !== undefined || s.usage);
  const skillPlural = data.totalSkills === 1 ? '' : 's';

  lines.push('<details>');
  lines.push(`<summary>${data.totalSkills} skill${skillPlural} analyzed</summary>`, '');

  if (hasSkillStats) {
    lines.push(
      '| Skill | Findings | Duration | Cost |',
      '|-------|----------|----------|------|'
    );
    for (const skill of data.skillResults) {
      const duration = skill.durationMs !== undefined ? formatDuration(skill.durationMs) : '-';
      const cost = skill.usage ? formatCost(skill.usage.costUSD) : '-';
      lines.push(`| ${skill.name} | ${skill.findingCount} | ${duration} | ${cost} |`);
    }
  } else {
    lines.push(
      '| Skill | Findings |',
      '|-------|----------|'
    );
    for (const skill of data.skillResults) {
      lines.push(`| ${skill.name} | ${skill.findingCount} |`);
    }
  }

  lines.push('', '</details>', '');

  // Stats footer with labeled inline format
  const hasStats = data.totalDurationMs !== undefined || data.totalUsage;
  if (hasStats) {
    const statsParts: string[] = [];
    if (data.totalDurationMs !== undefined) {
      statsParts.push(`**Duration:** ${formatDuration(data.totalDurationMs)}`);
    }
    if (data.totalUsage) {
      const totalInput = data.totalUsage.inputTokens + (data.totalUsage.cacheReadInputTokens ?? 0);
      statsParts.push(`**Tokens:** ${formatTokens(totalInput)} in / ${formatTokens(data.totalUsage.outputTokens)} out`);
      statsParts.push(`**Cost:** ${formatCost(data.totalUsage.costUSD)}`);
    }
    lines.push('---', statsParts.join(' · '));
  }

  return lines.join('\n');
}

/**
 * Aggregate severity counts from multiple reports.
 */
export function aggregateSeverityCounts(
  reports: SkillReport[]
): Record<Severity, number> {
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

  return counts;
}
