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

const GitHubLabelSchema = z.object({
  name: z.string(),
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
  draft: z.boolean().optional(),
  labels: z.array(GitHubLabelSchema).optional(),
  user: GitHubUserSchema,
  base: z.object({
    ref: z.string(),
    sha: z.string(),
  }),
  head: z.object({
    ref: z.string(),
    sha: z.string(),
  }),
});

const GitHubEventPayloadSchema = z.object({
  action: z.string(),
  /** Head SHA before the push, sent on `synchronize` events. */
  before: z.string().optional(),
  label: GitHubLabelSchema.optional(),
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

    const push = payload.action === 'synchronize' && payload.before
      ? await fetchPushChanges(octokit, repository.owner, repository.name, payload.before, pr.head.sha)
      : undefined;

    pullRequest = {
      number: pr.number,
      title: pr.title,
      body: pr.body,
      author: pr.user.login,
      draft: pr.draft ?? false,
      labels: pr.labels?.map((label) => label.name) ?? [],
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      headSha: pr.head.sha,
      baseSha: pr.base.sha,
      files,
      ...(push ? { push } : {}),
    };
  }

  const context: EventContext = {
    eventType: eventName as EventContext['eventType'],
    action: payload.action,
    label: payload.label?.name,
    repository,
    pullRequest,
    diffContextSource: { type: 'working-tree' },
    repoPath,
  };

  // Validate the final context
  const result = EventContextSchema.safeParse(context);
  if (!result.success) {
    throw new EventContextError('Failed to build valid event context', { cause: result.error });
  }

  return result.data;
}

/** GitHub's compare API returns at most this many files and omits the rest. */
const COMPARE_FILE_LIMIT = 300;

/**
 * Fetch the files changed by one push. Returns undefined when GitHub cannot
 * compare the two SHAs (for example after a force-push dropped `before`) or
 * the file list is truncated or missing, so callers fall back to the full PR diff.
 */
async function fetchPushChanges(
  octokit: Octokit,
  owner: string,
  repo: string,
  beforeSha: string,
  headSha: string
): Promise<PullRequestContext['push']> {
  try {
    const { data } = await octokit.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${beforeSha}...${headSha}`,
    });
    const files = data.files;
    // GitHub drops `files` entirely on some oversized compares; treat that like truncation.
    if (!files || files.length >= COMPARE_FILE_LIMIT) {
      return undefined;
    }
    return {
      beforeSha,
      files: files.map((file) => ({
        filename: file.filename,
        status: file.status as FileChange['status'],
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch,
      })),
    };
  } catch {
    return undefined;
  }
}

async function fetchPullRequestFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<FileChange[]> {
  const files = await octokit.paginate(octokit.pulls.listFiles, {
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
