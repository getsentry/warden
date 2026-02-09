import type { Octokit } from '@octokit/rest';
import { warnAction } from '../../cli/output/tty.js';

/**
 * Result from fetching follow-up changes between two commits.
 */
export interface FollowUpChanges {
  /** Map of file path to patch content */
  patches: Map<string, string>;
  /** Commit messages from the follow-up commits */
  commitMessages: string[];
}

/**
 * Fetch the patches and commit messages between two commits.
 */
export async function fetchFollowUpChanges(
  octokit: Octokit,
  owner: string,
  repo: string,
  baseSha: string,
  headSha: string
): Promise<FollowUpChanges> {
  try {
    const { data } = await octokit.repos.compareCommits({
      owner,
      repo,
      base: baseSha,
      head: headSha,
    });

    const patches = new Map<string, string>();
    for (const file of data.files ?? []) {
      if (file.patch) {
        patches.set(file.filename, file.patch);
      }
    }

    const commitMessages: string[] = [];
    for (const commit of data.commits ?? []) {
      if (commit.commit.message) {
        commitMessages.push(commit.commit.message);
      }
    }

    return { patches, commitMessages };
  } catch (error) {
    warnAction(`Failed to fetch follow-up changes: ${error}`);
    return { patches: new Map(), commitMessages: [] };
  }
}

/**
 * Fetch file content at a specific commit SHA.
 */
export async function fetchFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  sha: string
): Promise<string> {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref: sha,
  });

  if (Array.isArray(data)) {
    throw new Error(`Path "${path}" is a directory, not a file`);
  }

  if (data.type !== 'file' || !data.content) {
    throw new Error(`Path "${path}" is not a file or content unavailable`);
  }

  return Buffer.from(data.content, 'base64').toString('utf-8');
}

/**
 * Fetch specific lines from a file at a commit.
 * startLine and endLine are 1-indexed and inclusive.
 */
export async function fetchFileLines(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  sha: string,
  startLine: number,
  endLine: number
): Promise<string> {
  const content = await fetchFileContent(octokit, owner, repo, path, sha);
  const lines = content.split('\n');
  return lines
    .slice(startLine - 1, endLine)
    .map((line, i) => `${startLine + i}: ${line}`)
    .join('\n');
}

const ADD_THREAD_REPLY_MUTATION = `
  mutation($threadId: ID!, $body: String!) {
    addPullRequestReviewThreadReply(input: {
      pullRequestReviewThreadId: $threadId,
      body: $body
    }) {
      comment {
        id
      }
    }
  }
`;

/**
 * Post a reply to a review thread.
 */
export async function postThreadReply(
  octokit: Octokit,
  threadId: string,
  body: string
): Promise<void> {
  try {
    await octokit.graphql(ADD_THREAD_REPLY_MUTATION, {
      threadId,
      body,
    });
  } catch (error) {
    warnAction(`Failed to post thread reply: ${error}`);
    throw error;
  }
}

/**
 * Format a reply for a failed fix attempt.
 */
export function formatFailedFixReply(commitSha: string, reasoning: string): string {
  const shortSha = commitSha.slice(0, 7);
  return `**Fix attempt detected** (commit ${shortSha})

${reasoning}

The original issue appears unresolved. Please review and try again.

<sub>Evaluated by Warden</sub>`;
}
