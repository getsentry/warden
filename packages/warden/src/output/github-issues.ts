import type { Octokit } from '@octokit/rest';
import type { SkillReport } from '../types/index.js';
import { renderIssueBody, renderNoFindingsUpdate } from './issue-renderer.js';

export interface IssueResult {
  issueNumber: number;
  issueUrl: string;
  created: boolean; // true if new, false if updated
}

export interface CreateIssueOptions {
  title: string;
  commitSha: string;
}

/**
 * Create or update a GitHub issue with findings.
 * Searches for existing open issue by title prefix, updates if found.
 */
export async function createOrUpdateIssue(
  octokit: Octokit,
  owner: string,
  repo: string,
  reports: SkillReport[],
  options: CreateIssueOptions
): Promise<IssueResult | null> {
  const { title, commitSha } = options;
  const allFindings = reports.flatMap((r) => r.findings);
  const now = new Date();

  // Search for existing open issue with matching title
  const existingIssue = await findExistingIssue(octokit, owner, repo, title);

  // Render the issue body
  const body = allFindings.length > 0
    ? renderIssueBody(reports, {
        commitSha,
        runTimestamp: now,
        repoOwner: owner,
        repoName: repo,
      })
    : renderNoFindingsUpdate(commitSha, now);

  if (existingIssue) {
    // Update existing issue
    await octokit.issues.update({
      owner,
      repo,
      issue_number: existingIssue.number,
      body,
    });

    return {
      issueNumber: existingIssue.number,
      issueUrl: existingIssue.html_url,
      created: false,
    };
  }

  // Skip creating new issue if no findings
  if (allFindings.length === 0) {
    return null;
  }

  // Create new issue
  const { data: newIssue } = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
  });

  return {
    issueNumber: newIssue.number,
    issueUrl: newIssue.html_url,
    created: true,
  };
}

async function findExistingIssue(
  octokit: Octokit,
  owner: string,
  repo: string,
  title: string
): Promise<{ number: number; html_url: string } | null> {
  // Search for open issues with exact title match
  const { data: issues } = await octokit.issues.listForRepo({
    owner,
    repo,
    state: 'open',
    per_page: 100,
  });

  const matching = issues.find((issue) => issue.title === title);
  return matching ? { number: matching.number, html_url: matching.html_url } : null;
}
