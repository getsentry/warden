import { createHash } from 'node:crypto';
import type { Octokit } from '@octokit/rest';
import { z } from 'zod';
import type { Finding, Severity } from '../../types/index.js';
import { callHaiku } from '../../sdk/haiku.js';
import { escapeHtml } from '../../utils/index.js';
import type { GitHubIssuesNotificationConfig } from '../../config/schema.js';
import type { NotificationProvider, NotificationContext, NotificationResult } from '../types.js';

const SEVERITY_EMOJI: Record<Severity, string> = {
  critical: ':rotating_light:',
  high: ':warning:',
  medium: ':orange_circle:',
  low: ':large_blue_circle:',
  info: ':information_source:',
};

const FALSE_POSITIVE_LABEL = 'warden:false-positive';

/**
 * Generate a hash marker for embedding in issue bodies.
 * Used for fast hash-based dedup across runs.
 */
export function generateIssueHash(title: string, description: string): string {
  const content = `${title}\n${description}`;
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Generate the HTML comment marker embedded in issue bodies.
 */
export function generateIssueMarker(hash: string): string {
  return `<!-- warden:issue:${hash} -->`;
}

/**
 * Parse a warden issue marker from an issue body.
 */
export function parseIssueMarker(body: string): string | null {
  const match = body.match(/<!-- warden:issue:([a-f0-9]+) -->/);
  return match?.[1] ?? null;
}

interface ExistingIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  hash: string | null;
}

/**
 * Fetch existing Warden issues (open + false-positive closed) from the repo.
 */
async function fetchWardenIssues(
  octokit: Octokit,
  owner: string,
  repo: string,
  labels: string[]
): Promise<ExistingIssue[]> {
  const primaryLabel = labels[0] ?? 'warden';
  const issues: ExistingIssue[] = [];

  // Fetch open issues with the primary label
  const { data: openIssues } = await octokit.issues.listForRepo({
    owner,
    repo,
    state: 'open',
    labels: primaryLabel,
    per_page: 100,
  });

  for (const issue of openIssues) {
    if (issue.pull_request) continue;
    issues.push({
      number: issue.number,
      title: issue.title,
      body: issue.body ?? '',
      state: 'open',
      labels: issue.labels
        .map((l) => (typeof l === 'string' ? l : l.name))
        .filter((n): n is string => !!n),
      hash: parseIssueMarker(issue.body ?? ''),
    });
  }

  // Fetch closed issues with false-positive label
  const { data: closedIssues } = await octokit.issues.listForRepo({
    owner,
    repo,
    state: 'closed',
    labels: `${primaryLabel},${FALSE_POSITIVE_LABEL}`,
    per_page: 100,
  });

  for (const issue of closedIssues) {
    if (issue.pull_request) continue;
    issues.push({
      number: issue.number,
      title: issue.title,
      body: issue.body ?? '',
      state: 'closed',
      labels: issue.labels
        .map((l) => (typeof l === 'string' ? l : l.name))
        .filter((n): n is string => !!n),
      hash: parseIssueMarker(issue.body ?? ''),
    });
  }

  return issues;
}

/** Schema for LLM semantic matching response */
const SemanticMatchSchema = z.array(
  z.object({
    findingIndex: z.number().int(),
    issueIndex: z.number().int(),
  })
);

/**
 * Use Haiku to find semantic matches between findings and existing issues.
 */
async function findSemanticMatches(
  findings: Finding[],
  existingIssues: ExistingIssue[],
  apiKey: string
): Promise<Map<number, ExistingIssue>> {
  if (findings.length === 0 || existingIssues.length === 0) {
    return new Map();
  }

  const issueList = existingIssues
    .map((issue, i) => `${i + 1}. "${issue.title}" (${issue.state})`)
    .join('\n');

  const findingList = findings
    .map((f, i) => {
      const loc = f.location ? `${f.location.path}:${f.location.startLine}` : 'general';
      return `${i + 1}. [${loc}] "${f.title}" - ${f.description}`;
    })
    .join('\n');

  const prompt = `Compare these code findings against existing tracked issues and identify matches.

Existing issues:
${issueList}

New findings:
${findingList}

Return a JSON array of objects identifying which findings match which existing issues.
Only mark as a match if they describe the SAME issue (same bug, same location, same concern).

Return ONLY the JSON array:
[{"findingIndex": 1, "issueIndex": 2}]
Return [] if none match.`;

  const result = await callHaiku({
    apiKey,
    prompt,
    schema: SemanticMatchSchema,
    maxTokens: 512,
  });

  if (!result.success) {
    console.warn(`Semantic issue matching failed: ${result.error}`);
    return new Map();
  }

  const matches = new Map<number, ExistingIssue>();
  for (const match of result.data) {
    const issue = existingIssues[match.issueIndex - 1];
    if (issue) {
      matches.set(match.findingIndex - 1, issue);
    }
  }

  return matches;
}

/**
 * Render a GitHub issue body for a finding.
 */
function renderIssueBody(
  finding: Finding,
  skillName: string,
  commitSha: string,
  owner: string,
  repo: string,
  hash: string
): string {
  const lines: string[] = [];
  const shortSha = commitSha.slice(0, 7);

  lines.push(`${SEVERITY_EMOJI[finding.severity]} **Severity:** ${finding.severity}`);
  lines.push(`**Skill:** \`${skillName}\``);
  lines.push(`**Commit:** \`${shortSha}\``);
  lines.push('');

  // Description
  lines.push('### Description');
  lines.push('');
  lines.push(escapeHtml(finding.description));
  lines.push('');

  // Location
  if (finding.location) {
    const lineRange = finding.location.endLine
      ? `L${finding.location.startLine}-L${finding.location.endLine}`
      : `L${finding.location.startLine}`;
    const link = `https://github.com/${owner}/${repo}/blob/${commitSha}/${finding.location.path}#${lineRange}`;

    lines.push('### Location');
    lines.push('');
    lines.push(`[\`${finding.location.path}:${lineRange}\`](${link})`);
    lines.push('');
  }

  // Suggested fix
  if (finding.suggestedFix) {
    lines.push('### Suggested Fix');
    lines.push('');
    lines.push(escapeHtml(finding.suggestedFix.description));
    if (finding.suggestedFix.diff) {
      lines.push('');
      lines.push('```diff');
      lines.push(finding.suggestedFix.diff);
      lines.push('```');
    }
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('*Generated by [Warden](https://github.com/getsentry/warden)*');
  lines.push('');
  lines.push(generateIssueMarker(hash));

  return lines.join('\n');
}

export interface GitHubIssuesProviderOptions {
  config: GitHubIssuesNotificationConfig;
  octokit: Octokit;
  apiKey: string;
}

export class GitHubIssuesProvider implements NotificationProvider {
  readonly name = 'github-issues';
  private readonly config: GitHubIssuesNotificationConfig;
  private readonly octokit: Octokit;
  private readonly apiKey: string;

  constructor(options: GitHubIssuesProviderOptions) {
    this.config = options.config;
    this.octokit = options.octokit;
    this.apiKey = options.apiKey;
  }

  async notify(context: NotificationContext): Promise<NotificationResult> {
    const { findings, repository, commitSha, skillName } = context;
    const { owner, name: repo } = repository;
    const result: NotificationResult = {
      provider: this.name,
      sent: 0,
      skipped: 0,
      errors: [],
    };

    if (findings.length === 0) {
      return result;
    }

    // Fetch existing Warden issues for dedup
    const existingIssues = await fetchWardenIssues(
      this.octokit,
      owner,
      repo,
      this.config.labels
    );

    // Phase 1: Hash-based dedup
    const unmatchedFindings: { finding: Finding; index: number }[] = [];

    for (const [i, finding] of findings.entries()) {
      const hash = generateIssueHash(finding.title, finding.description);
      const hashMatch = existingIssues.find((issue) => issue.hash === hash);

      if (hashMatch) {
        result.skipped++;
        continue;
      }

      unmatchedFindings.push({ finding, index: i });
    }

    if (unmatchedFindings.length === 0) {
      return result;
    }

    // Phase 2: Semantic dedup via Haiku (only for same-file findings)
    const semanticMatches = await findSemanticMatches(
      unmatchedFindings.map((f) => f.finding),
      existingIssues,
      this.apiKey
    );

    // Phase 3: Create issues for truly new findings
    const labels = [
      ...this.config.labels,
      `warden:${skillName}`,
    ];

    // Ensure labels exist before creating any issues
    for (const label of labels) {
      try {
        await this.octokit.issues.getLabel({ owner, repo, name: label });
      } catch {
        await this.octokit.issues.createLabel({
          owner,
          repo,
          name: label,
          color: label === FALSE_POSITIVE_LABEL ? 'cccccc' : '7057ff',
        });
      }
    }

    for (const [i, { finding }] of unmatchedFindings.entries()) {
      if (semanticMatches.has(i)) {
        result.skipped++;
        continue;
      }

      const hash = generateIssueHash(finding.title, finding.description);
      const title = `[Warden] ${finding.title}`;
      const body = renderIssueBody(finding, skillName, commitSha, owner, repo, hash);

      try {
        await this.octokit.issues.create({
          owner,
          repo,
          title,
          body,
          labels,
        });

        result.sent++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to create issue for "${finding.title}": ${message}`);
      }
    }

    return result;
  }
}
