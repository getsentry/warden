import { LinearIssueSchema } from '@sentry/warden-service-api';
import type { FindingDetailResponse, LinearIssue } from '@sentry/warden-service-api';
import { z } from 'zod';

export interface LinearOptions {
  apiKey: string;
  teamId: string;
  tenantId: string;
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
}

async function request<T>(
  options: LinearOptions,
  query: string,
  variables: Record<string, unknown>,
  schema: z.ZodType<T>,
): Promise<T> {
  try {
    const response = await (options.fetch ?? globalThis.fetch)('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { authorization: options.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(10_000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error('Linear request failed.');
    const body: unknown = await response.json();
    const result = z.object({
      data: schema.nullable().optional(),
      errors: z.array(z.unknown()).optional(),
    }).parse(body);
    if (!result.data || result.errors?.length) throw new Error('Linear request failed.');
    return result.data;
  } catch {
    // Provider errors can contain request data; keep credentials and finding text out of logs.
    throw new Error('Linear request failed.');
  }
}

/** Look up the issue by the finding UUID, including archived tickets. */
export async function findLinearIssue(
  options: LinearOptions,
  findingId: string,
): Promise<LinearIssue | null> {
  const data = await request(
    options,
    `
      query WardenFindingIssue($filter: IssueFilter!) {
        issues(filter: $filter, first: 1, includeArchived: true) {
          nodes { id identifier url }
        }
      }
    `,
    { filter: { id: { eq: findingId } } },
    z.object({ issues: z.object({ nodes: z.array(LinearIssueSchema).max(1) }) }),
  );
  const issue = data.issues.nodes[0] ?? null;
  if (issue && issue.id !== findingId) throw new Error('Linear returned a different issue.');
  return issue;
}

function issueDescription(detail: FindingDetailResponse, baseUrl: string): string {
  const { finding } = detail;
  const findingUrl = new URL(`/findings/${encodeURIComponent(finding.id)}`, baseUrl);
  const sections = [finding.description];
  if (detail.verification) sections.push(`## Evidence\n\n${detail.verification}`);
  const metadata = [
    `- Warden: ${findingUrl.href}`,
    `- Finding ID: ${finding.displayId}`,
    `- Repository: ${finding.repository.fullName}`,
    `- Skill: ${finding.skill}`,
    `- Severity: ${finding.severity}`,
  ];
  const location = finding.location;
  if (location) {
    const end = location.endLine && location.endLine !== location.startLine ? `-${location.endLine}` : '';
    metadata.push(`- Location: ${location.path}:${location.startLine}${end}`);
  }
  if (detail.sourceUrl) metadata.push(`- Source: ${detail.sourceUrl}`);
  if (detail.headSha) metadata.push(`- Commit: ${detail.headSha}`);
  sections.push(['## Finding Details', '', ...metadata].join('\n'));
  return sections.join('\n\n');
}

/** Reuse the finding UUID in Linear so concurrent requests and retries cannot create duplicates. */
export async function createLinearIssue(
  options: LinearOptions,
  detail: FindingDetailResponse,
): Promise<LinearIssue> {
  const existing = await findLinearIssue(options, detail.finding.id);
  if (existing) return existing;
  try {
    const data = await request(
      options,
      `
        mutation WardenCreateIssue($input: IssueCreateInput!) {
          issueCreate(input: $input) { success issue { id identifier url } }
        }
      `,
      {
        input: {
          id: detail.finding.id,
          teamId: options.teamId,
          title: detail.finding.title,
          description: issueDescription(detail, options.baseUrl),
        },
      },
      z.object({ issueCreate: z.object({ success: z.literal(true), issue: LinearIssueSchema }) }),
    );
    if (data.issueCreate.issue.id !== detail.finding.id) throw new Error('Linear returned a different issue.');
    return data.issueCreate.issue;
  } catch (error) {
    // A concurrent request or a lost response may already have created this UUID.
    const created = await findLinearIssue(options, detail.finding.id);
    if (created) return created;
    throw error;
  }
}
