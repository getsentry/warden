import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildEventContext, EventContextError } from './context.js';
describe('buildEventContext', () => {
    const mockListFiles = vi.fn();
    const mockPaginate = vi.fn();
    const mockOctokit = {
        paginate: mockPaginate,
        pulls: {
            listFiles: mockListFiles,
        },
    };
    beforeEach(() => {
        vi.clearAllMocks();
    });
    const validPayload = {
        action: 'opened',
        repository: {
            name: 'test-repo',
            full_name: 'test-owner/test-repo',
            default_branch: 'main',
            owner: {
                login: 'test-owner',
            },
        },
        pull_request: {
            number: 1,
            title: 'Test PR',
            body: 'Test description',
            user: {
                login: 'test-user',
            },
            base: {
                ref: 'main',
                sha: 'base123sha456',
            },
            head: {
                ref: 'feature-branch',
                sha: 'abc123def456',
            },
        },
    };
    it('builds context from valid pull_request event', async () => {
        const mockFiles = [
            {
                filename: 'src/test.ts',
                status: 'modified',
                additions: 10,
                deletions: 5,
                patch: '@@ -1,5 +1,10 @@\n test',
            },
            {
                filename: 'src/new.ts',
                status: 'added',
                additions: 20,
                deletions: 0,
                patch: '@@ -0,0 +1,20 @@\n +new file',
            },
        ];
        mockPaginate.mockResolvedValue(mockFiles);
        const context = await buildEventContext('pull_request', validPayload, '/test/repo', mockOctokit);
        expect(context.eventType).toBe('pull_request');
        expect(context.action).toBe('opened');
        expect(context.repository).toEqual({
            owner: 'test-owner',
            name: 'test-repo',
            fullName: 'test-owner/test-repo',
            defaultBranch: 'main',
        });
        expect(context.pullRequest).toBeDefined();
        expect(context.pullRequest?.number).toBe(1);
        expect(context.pullRequest?.title).toBe('Test PR');
        expect(context.pullRequest?.body).toBe('Test description');
        expect(context.pullRequest?.author).toBe('test-user');
        expect(context.pullRequest?.baseBranch).toBe('main');
        expect(context.pullRequest?.headBranch).toBe('feature-branch');
        expect(context.pullRequest?.headSha).toBe('abc123def456');
        expect(context.pullRequest?.baseSha).toBe('base123sha456');
        expect(context.pullRequest?.files).toHaveLength(2);
        expect(context.repoPath).toBe('/test/repo');
        expect(mockPaginate).toHaveBeenCalledWith(mockListFiles, {
            owner: 'test-owner',
            repo: 'test-repo',
            pull_number: 1,
            per_page: 100,
        });
    });
    it('handles PR with null body', async () => {
        const payloadWithNullBody = {
            ...validPayload,
            pull_request: {
                ...validPayload.pull_request,
                body: null,
            },
        };
        mockPaginate.mockResolvedValue([]);
        const context = await buildEventContext('pull_request', payloadWithNullBody, '/test/repo', mockOctokit);
        expect(context.pullRequest?.body).toBeNull();
    });
    it('throws EventContextError for invalid payload', async () => {
        const invalidPayload = {
            action: 'opened',
            // missing repository
        };
        await expect(buildEventContext('pull_request', invalidPayload, '/test/repo', mockOctokit)).rejects.toThrow(EventContextError);
    });
    it('throws EventContextError for invalid repository structure', async () => {
        const invalidPayload = {
            action: 'opened',
            repository: {
                name: 'test-repo',
                // missing required fields
            },
        };
        await expect(buildEventContext('pull_request', invalidPayload, '/test/repo', mockOctokit)).rejects.toThrow(EventContextError);
    });
    it('builds context without pullRequest for non-PR events', async () => {
        const issuePayload = {
            action: 'opened',
            repository: validPayload.repository,
            // No pull_request field
        };
        const context = await buildEventContext('issues', issuePayload, '/test/repo', mockOctokit);
        expect(context.eventType).toBe('issues');
        expect(context.pullRequest).toBeUndefined();
        expect(mockPaginate).not.toHaveBeenCalled();
    });
    it('maps file statuses correctly', async () => {
        const mockFiles = [
            { filename: 'added.ts', status: 'added', additions: 10, deletions: 0, patch: '+new' },
            { filename: 'removed.ts', status: 'removed', additions: 0, deletions: 10, patch: '-old' },
            { filename: 'modified.ts', status: 'modified', additions: 5, deletions: 5, patch: '@@' },
            { filename: 'renamed.ts', status: 'renamed', additions: 0, deletions: 0, patch: undefined },
        ];
        mockPaginate.mockResolvedValue(mockFiles);
        const context = await buildEventContext('pull_request', validPayload, '/test/repo', mockOctokit);
        expect(context.pullRequest).toBeDefined();
        const files = context.pullRequest.files;
        expect(files).toHaveLength(4);
        expect(files.map(f => f.status)).toEqual(['added', 'removed', 'modified', 'renamed']);
    });
    it('handles files without patches', async () => {
        const mockFiles = [
            {
                filename: 'binary.png',
                status: 'added',
                additions: 0,
                deletions: 0,
                // No patch for binary files
            },
        ];
        mockPaginate.mockResolvedValue(mockFiles);
        const context = await buildEventContext('pull_request', validPayload, '/test/repo', mockOctokit);
        expect(context.pullRequest).toBeDefined();
        const files = context.pullRequest.files;
        expect(files).toHaveLength(1);
        expect(files[0]?.patch).toBeUndefined();
    });
});
//# sourceMappingURL=context.test.js.map