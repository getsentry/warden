import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Octokit } from '@octokit/rest';
import type { ActionInputs } from '../inputs.js';
import type { SkillReport, Finding } from '../../types/index.js';

// -----------------------------------------------------------------------------
// Fixtures Directory
// -----------------------------------------------------------------------------

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURES_DIR = join(__dirname, '__fixtures__');
const EVENT_PAYLOAD_PATH = join(FIXTURES_DIR, 'event-payloads/pull_request_opened.json');

// -----------------------------------------------------------------------------
// Mocks - ONLY external boundaries: LLM calls
// -----------------------------------------------------------------------------

// Mock skill task runner - calls Claude Code SDK (LLM)
vi.mock('../../cli/output/tasks.js', async () => {
  const actual: Record<string, unknown> = await vi.importActual('../../cli/output/tasks.js');
  return {
    ...actual,
    runSkillTask: vi.fn(),
  };
});

// Mock deduplication - has LLM calls (deduplicateFindings) and GitHub API calls (fetchExistingComments)
// Keep pure functions real
vi.mock('../../output/dedup.js', async () => {
  const actual = await vi.importActual('../../output/dedup.js');
  return {
    ...actual,
    // Mock functions that make LLM calls
    deduplicateFindings: vi.fn((findings) =>
      Promise.resolve({ newFindings: findings, duplicateActions: [] })
    ),
    // Mock functions that make GitHub API calls
    fetchExistingComments: vi.fn(() => Promise.resolve([])),
    processDuplicateActions: vi.fn(() => Promise.resolve({ updated: 0, reacted: 0, failed: 0 })),
  };
});

// Mock base utilities that call process.exit or need system access
vi.mock('./base.js', async () => {
  const actual = await vi.importActual('./base.js');
  return {
    ...actual,
    setFailed: vi.fn((msg: string): never => {
      throw new Error(`setFailed: ${msg}`);
    }),
    findClaudeCodeExecutable: vi.fn(() => '/usr/local/bin/claude'),
    getAuthenticatedBotLogin: vi.fn(() => Promise.resolve('warden[bot]')),
  };
});

// Import after mocks
import { runSkillTask } from '../../cli/output/tasks.js';
import { fetchExistingComments, deduplicateFindings } from '../../output/dedup.js';
import { setFailed } from './base.js';
import { runPRWorkflow } from './pr-workflow.js';
import { clearSkillsCache } from '../../skills/loader.js';

// Type the mocks
const mockRunSkillTask = vi.mocked(runSkillTask);
const mockFetchExistingComments = vi.mocked(fetchExistingComments);
const mockDeduplicateFindings = vi.mocked(deduplicateFindings);
const mockSetFailed = vi.mocked(setFailed);

// Type helper for mocking Octokit responses
type ListReviewsResponse = Awaited<ReturnType<Octokit['pulls']['listReviews']>>;

// -----------------------------------------------------------------------------
// Mock Octokit Factory
// -----------------------------------------------------------------------------

interface MockOctokitOptions {
  prFiles?: {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }[];
}

function createMockOctokit(options: MockOctokitOptions = {}): Octokit {
  const defaultFiles = [
    {
      filename: 'src/test.ts',
      status: 'modified',
      additions: 10,
      deletions: 5,
      patch: '@@ -1,5 +1,10 @@\n+console.log("test")',
    },
  ];

  return {
    pulls: {
      listFiles: vi.fn(() =>
        Promise.resolve({
          data: options.prFiles ?? defaultFiles,
        })
      ),
      listReviews: vi.fn(() => Promise.resolve({ data: [] })),
      createReview: vi.fn(() => Promise.resolve({ data: {} })),
      updateReviewComment: vi.fn(() => Promise.resolve({ data: {} })),
      dismissReview: vi.fn(() => Promise.resolve({ data: {} })),
    },
    checks: {
      create: vi.fn(() =>
        Promise.resolve({ data: { id: 1, html_url: 'https://example.com/check' } })
      ),
      update: vi.fn(() => Promise.resolve({ data: {} })),
    },
    apps: {
      getAuthenticated: vi.fn(() => Promise.resolve({ data: { slug: 'warden' } })),
    },
    graphql: vi.fn(() =>
      Promise.resolve({
        repository: {
          pullRequest: {
            reviewThreads: {
              nodes: [],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      })
    ),
    reactions: {
      createForPullRequestReviewComment: vi.fn(() => Promise.resolve({ data: {} })),
    },
  } as unknown as Octokit;
}

// -----------------------------------------------------------------------------
// Test Fixtures
// -----------------------------------------------------------------------------

function createDefaultInputs(overrides: Partial<ActionInputs> = {}): ActionInputs {
  return {
    anthropicApiKey: 'test-api-key',
    oauthToken: '',
    githubToken: 'test-github-token',
    configPath: 'warden.toml',
    maxFindings: 50,
    parallel: 2,
    ...overrides,
  };
}

function createFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'finding-1',
    severity: 'high',
    title: 'Test Finding',
    description: 'This is a test finding',
    location: { path: 'src/test.ts', startLine: 10 },
    ...overrides,
  };
}

function createSkillReport(overrides: Partial<SkillReport> = {}): SkillReport {
  return {
    skill: 'test-skill',
    summary: 'Test summary',
    findings: [],
    ...overrides,
  };
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('runPRWorkflow', () => {
  let mockOctokit: Octokit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetAllMocks();
    clearSkillsCache();
    mockOctokit = createMockOctokit();

    // Default: skill runs successfully with no findings
    mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report: createSkillReport() });

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('review posting integration', () => {
    it('posts review with findings to GitHub', async () => {
      const finding = createFinding();
      const report = createSkillReport({ findings: [finding] });

      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report });

      await runPRWorkflow(mockOctokit, createDefaultInputs(), 'pull_request', EVENT_PAYLOAD_PATH, FIXTURES_DIR);

      // Verify review was posted to GitHub
      const createReview = vi.mocked(mockOctokit.pulls.createReview);
      expect(createReview).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          pull_number: 123,
          commit_id: 'abc123def456',
          event: 'COMMENT',
          comments: expect.arrayContaining([
            expect.objectContaining({
              path: 'src/test.ts',
              line: 10,
            }),
          ]),
        })
      );
    });

    it('does not post review when no findings', async () => {
      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report: createSkillReport({ findings: [] }) });

      await runPRWorkflow(mockOctokit, createDefaultInputs(), 'pull_request', EVENT_PAYLOAD_PATH, FIXTURES_DIR);

      const createReview = vi.mocked(mockOctokit.pulls.createReview);
      expect(createReview).not.toHaveBeenCalled();
    });

    it('skips duplicate findings from existing comments', async () => {
      const finding = createFinding();
      const report = createSkillReport({ findings: [finding] });

      // Existing comments that will be checked for duplicates
      mockFetchExistingComments.mockResolvedValue([
        {
          id: 1,
          body: 'Same issue',
          path: 'src/test.ts',
          line: 10,
          isWarden: true,
          title: 'Test Finding',
          description: 'This is a test finding',
          contentHash: 'abc123',
        },
      ]);

      // Dedup returns empty - finding is a duplicate
      mockDeduplicateFindings.mockResolvedValue({
        newFindings: [],
        duplicateActions: [
          {
            type: 'react_external',
            finding,
            existingComment: {
              id: 1,
              body: 'Same issue',
              path: 'src/test.ts',
              line: 10,
              isWarden: true,
              title: 'Test Finding',
              description: 'This is a test finding',
              contentHash: 'abc123',
            },
            matchType: 'hash',
          },
        ],
      });

      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report });

      await runPRWorkflow(mockOctokit, createDefaultInputs(), 'pull_request', EVENT_PAYLOAD_PATH, FIXTURES_DIR);

      // No review posted since all findings were duplicates
      const createReview = vi.mocked(mockOctokit.pulls.createReview);
      expect(createReview).not.toHaveBeenCalled();
    });
  });

  describe('trigger execution', () => {
    it('runs matched trigger and collects report', async () => {
      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report: createSkillReport({ skill: 'test-skill' }) });

      await runPRWorkflow(mockOctokit, createDefaultInputs(), 'pull_request', EVENT_PAYLOAD_PATH, FIXTURES_DIR);

      expect(mockRunSkillTask).toHaveBeenCalledTimes(1);
      // runSkillTask(options, concurrency, callbacks)
      expect(mockRunSkillTask).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.any(String) }),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('records trigger failure and updates check before failing', async () => {
      // When all triggers fail, the workflow should still update the check
      // before calling setFailed.
      mockRunSkillTask.mockRejectedValueOnce(new Error('Skill failed'));

      // With only one trigger that fails, handleTriggerErrors will call setFailed.
      // Our mock converts this to a thrown error.
      try {
        await runPRWorkflow(mockOctokit, createDefaultInputs(), 'pull_request', EVENT_PAYLOAD_PATH, FIXTURES_DIR);
        // Should not reach here
        throw new Error('Expected workflow to throw');
      } catch (error) {
        // Either our mocked setFailed threw, or process.exit was called
        expect(error).toBeDefined();
      }

      // Core check should still be updated even when workflow fails
      const updateCheck = vi.mocked(mockOctokit.checks.update);
      expect(updateCheck).toHaveBeenCalled();
    });
  });

  describe('failure conditions', () => {
    it('fails when findings exceed fail-on threshold', async () => {
      const finding = createFinding({ severity: 'high' });
      const report = createSkillReport({ findings: [finding] });

      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report });

      await expect(
        runPRWorkflow(
          mockOctokit,
          createDefaultInputs({ failOn: 'high' }),
          'pull_request',
          EVENT_PAYLOAD_PATH,
          FIXTURES_DIR
        )
      ).rejects.toThrow('setFailed');

      expect(mockSetFailed).toHaveBeenCalledWith(expect.stringContaining('high+ severity'));
    });

    it('fails when event payload is unreadable', async () => {
      await expect(
        runPRWorkflow(
          mockOctokit,
          createDefaultInputs(),
          'pull_request',
          '/nonexistent/event.json',
          FIXTURES_DIR
        )
      ).rejects.toThrow('setFailed');
    });
  });

  describe('GitHub check management', () => {
    it('creates and updates core check for PR events', async () => {
      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report: createSkillReport() });

      await runPRWorkflow(mockOctokit, createDefaultInputs(), 'pull_request', EVENT_PAYLOAD_PATH, FIXTURES_DIR);

      const createCheck = vi.mocked(mockOctokit.checks.create);
      const updateCheck = vi.mocked(mockOctokit.checks.update);

      // Core check created at start
      expect(createCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          head_sha: 'abc123def456',
          name: 'warden',
        })
      );

      // Core check updated at end
      expect(updateCheck).toHaveBeenCalled();
    });

    it('creates skill-specific check for each trigger', async () => {
      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report: createSkillReport({ skill: 'test-skill' }) });

      await runPRWorkflow(mockOctokit, createDefaultInputs(), 'pull_request', EVENT_PAYLOAD_PATH, FIXTURES_DIR);

      const createCheck = vi.mocked(mockOctokit.checks.create);

      // Should have created 2 checks: core + skill-specific
      expect(createCheck).toHaveBeenCalledTimes(2);
      expect(createCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('test-skill'),
        })
      );
    });
  });

  describe('event context building', () => {
    it('passes file changes to skill runner', async () => {
      const customFiles = [
        {
          filename: 'src/custom.ts',
          status: 'added',
          additions: 50,
          deletions: 0,
          patch: '@@ -0,0 +1,50 @@\n+// new file',
        },
      ];

      mockOctokit = createMockOctokit({ prFiles: customFiles });
      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report: createSkillReport() });

      await runPRWorkflow(mockOctokit, createDefaultInputs(), 'pull_request', EVENT_PAYLOAD_PATH, FIXTURES_DIR);

      // runSkillTask receives options with context embedded
      expect(mockRunSkillTask).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            pullRequest: expect.objectContaining({
              files: expect.arrayContaining([
                expect.objectContaining({
                  filename: 'src/custom.ts',
                  status: 'added',
                }),
              ]),
            }),
          }),
        }),
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('review dismissal', () => {
    it('dismisses previous CHANGES_REQUESTED when all comments resolved', async () => {
      // Previous review was CHANGES_REQUESTED
      vi.mocked(mockOctokit.pulls.listReviews).mockResolvedValue({
        data: [{ id: 42, state: 'CHANGES_REQUESTED', user: { login: 'warden[bot]' } }],
      } as ListReviewsResponse);

      // Current run has no findings
      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report: createSkillReport({ findings: [] }) });

      // failOn must be configured for dismiss to work
      await runPRWorkflow(mockOctokit, createDefaultInputs({ failOn: 'high' }), 'pull_request', EVENT_PAYLOAD_PATH, FIXTURES_DIR);

      const dismissReview = vi.mocked(mockOctokit.pulls.dismissReview);
      expect(dismissReview).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          pull_number: 123,
          review_id: 42,
          message: expect.stringContaining('resolved'),
        })
      );
    });

    it('does not dismiss when unresolved blocking findings remain', async () => {
      // Previous review was CHANGES_REQUESTED
      vi.mocked(mockOctokit.pulls.listReviews).mockResolvedValue({
        data: [{ id: 42, state: 'CHANGES_REQUESTED', user: { login: 'warden[bot]' } }],
      } as ListReviewsResponse);

      // Current run still has blocking findings
      const finding = createFinding({ severity: 'high' });
      mockRunSkillTask.mockResolvedValue({
        name: 'test-trigger',
        report: createSkillReport({ findings: [finding] }),
      });

      await expect(
        runPRWorkflow(
          mockOctokit,
          createDefaultInputs({ failOn: 'high' }),
          'pull_request',
          EVENT_PAYLOAD_PATH,
          FIXTURES_DIR
        )
      ).rejects.toThrow('setFailed');

      const dismissReview = vi.mocked(mockOctokit.pulls.dismissReview);
      expect(dismissReview).not.toHaveBeenCalled();
    });

    it('does not dismiss when no previous CHANGES_REQUESTED review', async () => {
      // Previous review was just a COMMENT (not CHANGES_REQUESTED)
      vi.mocked(mockOctokit.pulls.listReviews).mockResolvedValue({
        data: [{ id: 42, state: 'COMMENTED', user: { login: 'warden[bot]' } }],
      } as ListReviewsResponse);

      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report: createSkillReport({ findings: [] }) });

      await runPRWorkflow(mockOctokit, createDefaultInputs(), 'pull_request', EVENT_PAYLOAD_PATH, FIXTURES_DIR);

      const dismissReview = vi.mocked(mockOctokit.pulls.dismissReview);
      expect(dismissReview).not.toHaveBeenCalled();
    });

    it('does not dismiss when failOn is removed from config', async () => {
      // Previous review was CHANGES_REQUESTED (from when failOn was configured)
      vi.mocked(mockOctokit.pulls.listReviews).mockResolvedValue({
        data: [{ id: 42, state: 'CHANGES_REQUESTED', user: { login: 'warden[bot]' } }],
      } as ListReviewsResponse);

      // Current run has no findings and no failOn — config was changed between runs
      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report: createSkillReport({ findings: [] }) });

      await runPRWorkflow(
        mockOctokit,
        createDefaultInputs({ failOn: undefined }),
        'pull_request',
        EVENT_PAYLOAD_PATH,
        FIXTURES_DIR
      );

      // Should NOT dismiss — without failOn we can't verify the threshold is still met
      const dismissReview = vi.mocked(mockOctokit.pulls.dismissReview);
      expect(dismissReview).not.toHaveBeenCalled();
    });
  });
});
