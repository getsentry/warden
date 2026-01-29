import { z } from 'zod';
import { EventContextSchema, } from '../types/index.js';
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
    constructor(message, options) {
        super(message, options);
        this.name = 'EventContextError';
    }
}
export async function buildEventContext(eventName, eventPayload, repoPath, octokit) {
    const payloadResult = GitHubEventPayloadSchema.safeParse(eventPayload);
    if (!payloadResult.success) {
        throw new EventContextError('Invalid event payload', { cause: payloadResult.error });
    }
    const payload = payloadResult.data;
    const repository = {
        owner: payload.repository.owner.login,
        name: payload.repository.name,
        fullName: payload.repository.full_name,
        defaultBranch: payload.repository.default_branch,
    };
    let pullRequest;
    if (eventName === 'pull_request' && payload.pull_request) {
        const pr = payload.pull_request;
        // Fetch files changed in the PR
        const files = await fetchPullRequestFiles(octokit, repository.owner, repository.name, pr.number);
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
    const context = {
        eventType: eventName,
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
async function fetchPullRequestFiles(octokit, owner, repo, pullNumber) {
    const { data: files } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
    });
    return files.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch,
    }));
}
//# sourceMappingURL=context.js.map