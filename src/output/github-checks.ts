import type { Octokit } from '@octokit/rest';
import { SEVERITY_ORDER } from '../types/index.js';
import type { Severity, Finding, SkillReport } from '../types/index.js';

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
  failOn?: Severity;
}

/**
 * Summary data for the core warden check.
 */
export interface CoreCheckSummaryData {
  totalSkills: number;
  totalFindings: number;
  findingsBySeverity: Record<Severity, number>;
  skillResults: {
    name: string;
    findingCount: number;
    conclusion: CheckConclusion;
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
 */
export function findingsToAnnotations(findings: Finding[]): CheckAnnotation[] {
  // Filter to findings with location using type predicate
  const withLocation = findings.filter(
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
    message: finding.description,
    title: finding.title,
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
  failOn?: Severity
): CheckConclusion {
  if (findings.length === 0) {
    return 'success';
  }

  if (!failOn) {
    // No failure threshold, findings exist but don't cause failure
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
  const conclusion = determineConclusion(report.findings, options.failOn);
  const annotations = findingsToAnnotations(report.findings);

  const findingCounts = countBySeverity(report.findings);
  const summary = buildSkillSummary(report, findingCounts);

  await octokit.checks.update({
    owner: options.owner,
    repo: options.repo,
    check_run_id: checkRunId,
    status: 'completed',
    conclusion,
    completed_at: new Date().toISOString(),
    output: {
      title: `${report.findings.length} finding${report.findings.length === 1 ? '' : 's'}`,
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

  await octokit.checks.update({
    owner: options.owner,
    repo: options.repo,
    check_run_id: checkRunId,
    status: 'completed',
    conclusion,
    completed_at: new Date().toISOString(),
    output: {
      title: `${summaryData.totalFindings} finding${summaryData.totalFindings === 1 ? '' : 's'} across ${summaryData.totalSkills} skill${summaryData.totalSkills === 1 ? '' : 's'}`,
      summary,
    },
  });
}

/**
 * Render a markdown severity table from counts.
 */
function renderSeverityTable(counts: Record<Severity, number>): string[] {
  const severities: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
  const lines: string[] = [
    '### Findings by Severity',
    '',
    '| Severity | Count |',
    '|----------|-------|',
  ];

  for (const severity of severities) {
    if (counts[severity] > 0) {
      lines.push(`| ${severity} | ${counts[severity]} |`);
    }
  }

  return lines;
}

/**
 * Build the summary markdown for a skill check.
 */
function buildSkillSummary(
  report: SkillReport,
  findingCounts: Record<Severity, number>
): string {
  const lines: string[] = [report.summary, ''];

  if (report.findings.length === 0) {
    lines.push('No findings.');
    return lines.join('\n');
  }

  lines.push(...renderSeverityTable(findingCounts));
  return lines.join('\n');
}

/**
 * Map check conclusion to display icon.
 */
function conclusionIcon(conclusion: CheckConclusion): string {
  switch (conclusion) {
    case 'success':
      return ':white_check_mark:';
    case 'failure':
      return ':x:';
    case 'neutral':
    case 'cancelled':
      return ':warning:';
  }
}

/**
 * Build the summary markdown for the core warden check.
 */
function buildCoreSummary(data: CoreCheckSummaryData): string {
  const skillPlural = data.totalSkills === 1 ? '' : 's';
  const findingPlural = data.totalFindings === 1 ? '' : 's';
  const lines: string[] = [
    `Analyzed ${data.totalSkills} skill${skillPlural}, found ${data.totalFindings} total finding${findingPlural}.`,
    '',
  ];

  if (data.totalFindings > 0) {
    lines.push(...renderSeverityTable(data.findingsBySeverity), '');
  }

  lines.push(
    '### Skills',
    '',
    '| Skill | Findings | Result |',
    '|-------|----------|--------|'
  );

  for (const skill of data.skillResults) {
    const icon = conclusionIcon(skill.conclusion);
    lines.push(`| ${skill.name} | ${skill.findingCount} | ${icon} ${skill.conclusion} |`);
  }

  return lines.join('\n');
}

/**
 * Count findings by severity.
 */
function countBySeverity(findings: Finding[]): Record<Severity, number> {
  return findings.reduce(
    (acc, f) => {
      acc[f.severity]++;
      return acc;
    },
    { critical: 0, high: 0, medium: 0, low: 0, info: 0 } as Record<Severity, number>
  );
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
