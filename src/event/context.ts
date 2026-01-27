import type { Octokit } from '@octokit/rest';
import { z } from 'zod';
import {
  EventContextSchema,
  type EventContext,
  type FileChange,
  type PullRequestContext,
  type RepositoryContext,
} from '../types/index.js';

// GitHub Action event payload schemas
const GitHubUserSchema = z.object({
  login: z.string(),
});

const GitHubRepoSchema = z.object({
  name: z.string(),
  full_name: z.string(),
  default_branch: z.string(),
  owner: GitHubUserSchema,
});

const GitHubPullRequestSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  user: GitHubUserSchema,
  base: z.object({
    ref: z.string(),
  }),
  head: z.object({
    ref: z.string(),
    sha: z.string(),
  }),
});

const GitHubEventPayloadSchema = z.object({
  action: z.string(),
  repository: GitHubRepoSchema,
  pull_request: GitHubPullRequestSchema.optional(),
});

export class EventContextError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'EventContextError';
  }
}

export async function buildEventContext(
  eventName: string,
  eventPayload: unknown,
  repoPath: string,
  octokit: Octokit
): Promise<EventContext> {
  const payloadResult = GitHubEventPayloadSchema.safeParse(eventPayload);
  if (!payloadResult.success) {
    throw new EventContextError('Invalid event payload', { cause: payloadResult.error });
  }

  const payload = payloadResult.data;

  const repository: RepositoryContext = {
    owner: payload.repository.owner.login,
    name: payload.repository.name,
    fullName: payload.repository.full_name,
    defaultBranch: payload.repository.default_branch,
  };

  let pullRequest: PullRequestContext | undefined;

  if (eventName === 'pull_request' && payload.pull_request) {
    const pr = payload.pull_request;

    // Fetch files changed in the PR
    const files = await fetchPullRequestFiles(
      octokit,
      repository.owner,
      repository.name,
      pr.number
    );

    pullRequest = {
      number: pr.number,
      title: pr.title,
      body: pr.body,
      author: pr.user.login,
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      headSha: pr.head.sha,
      files,
    };
  }

  const context: EventContext = {
    eventType: eventName as EventContext['eventType'],
    action: payload.action,
    repository,
    pullRequest,
    repoPath,
  };

  // Validate the final context
  const result = EventContextSchema.safeParse(context);
  if (!result.success) {
    throw new EventContextError('Failed to build valid event context', { cause: result.error });
  }

  return result.data;
}

async function fetchPullRequestFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<FileChange[]> {
  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });

  return files.map((file) => ({
    filename: file.filename,
    status: file.status as FileChange['status'],
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch,
  }));
}
