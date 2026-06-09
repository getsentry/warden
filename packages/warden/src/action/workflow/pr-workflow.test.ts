import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Octokit } from '@octokit/rest';
import type { ActionInputs } from '../inputs.js';
import type { SkillReport, Finding } from '../../types/index.js';
import type { ExistingComment } from '../../output/dedup.js';
import type * as BaseWorkflow from './base.js';

// -----------------------------------------------------------------------------
// Fixtures Directory
// -----------------------------------------------------------------------------

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURES_DIR = join(__dirname, '__fixtures__');
const ACTION_MISMATCH_FIXTURES_DIR = join(FIXTURES_DIR, 'action-mismatch');
const BASE_ONLY_FIXTURES_DIR = join(FIXTURES_DIR, 'base-only');
const NO_MATCH_FIXTURES_DIR = join(FIXTURES_DIR, 'no-match');
const NO_MATCH_RUNTIME_CLAUDE_FIXTURES_DIR = join(FIXTURES_DIR, 'no-match-runtime-claude');
const NO_CONFIG_FIXTURES_DIR = join(FIXTURES_DIR, 'no-config');
const PARTIAL_MATCH_FIXTURES_DIR = join(FIXTURES_DIR, 'partial-match');
const RUNTIME_CLAUDE_FIXTURES_DIR = join(FIXTURES_DIR, 'runtime-claude');
const EMPTY_AUXILIARY_MODEL_FIXTURES_DIR = join(FIXTURES_DIR, 'empty-auxiliary-model');
const LAYERED_AUXILIARY_MODEL_FIXTURES_DIR = join(FIXTURES_DIR, 'layered-auxiliary-model');
const NO_MATCH_EMPTY_AUXILIARY_MODEL_FIXTURES_DIR = join(FIXTURES_DIR, 'no-match-empty-auxiliary-model');
const EVENT_PAYLOAD_PATH = join(FIXTURES_DIR, 'event-payloads/pull_request_opened.json');
const PR_HEAD_SHA = 'abc123def456';
const PREVIOUS_HEAD_SHA = 'previous123sha456';

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

// Mock fix evaluation - has LLM calls
vi.mock('../fix-evaluation/index.js', () => ({
  evaluateFixAttempts: vi.fn(() =>
    Promise.resolve({
      toResolve: [],
      toReply: [],
      skipped: 0,
      evaluated: 0,
      failedEvaluations: 0,
      uniqueFindingsEvaluated: 0,
      uniqueFindingsCodeChanged: 0,
      uniqueFindingsResolved: 0,
      usage: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
    })
  ),
  postThreadReply: vi.fn(() => Promise.resolve()),
}));

// Mock base utilities that call process.exit or need system access
vi.mock('./base.js', async () => {
  const actual = await vi.importActual<typeof BaseWorkflow>('./base.js');
  const mockedSetFailed = vi.fn((msg: string): never => {
    throw new Error(`setFailed: ${msg}`);
  });
  return {
    ...actual,
    setFailed: mockedSetFailed,
    ensureClaudeAuth: vi.fn((inputs: ActionInputs): void => {
      if (inputs.anthropicApiKey || inputs.oauthToken) {
        return;
      }
      mockedSetFailed(
        'Authentication not found. Provide an API key via anthropic-api-key input, ' +
          'WARDEN_ANTHROPIC_API_KEY env var, or OAuth token via CLAUDE_CODE_OAUTH_TOKEN env var.'
      );
    }),
    findClaudeCodeExecutable: vi.fn(() => '/usr/local/bin/claude'),
    prepareRuntimeEnvironment: vi.fn((triggers: Iterable<{ runtime?: string }>, inputs: ActionInputs) => {
      const usesClaude = Array.from(triggers).some((trigger) => (trigger.runtime ?? 'pi') === 'claude');
      if (!usesClaude) {
        return Promise.resolve({});
      }
      if (!inputs.anthropicApiKey && !inputs.oauthToken) {
        mockedSetFailed(
          'Authentication not found. Provide an API key via anthropic-api-key input, ' +
            'WARDEN_ANTHROPIC_API_KEY env var, or OAuth token via CLAUDE_CODE_OAUTH_TOKEN env var.'
        );
      }
      return Promise.resolve({ pathToClaudeCodeExecutable: '/usr/local/bin/claude' });
    }),
    getAuthenticatedBotLogin: vi.fn(() => Promise.resolve('warden[bot]')),
    writeFindingsOutput: vi.fn(actual.writeFindingsOutput),
  };
});

// Import after mocks
import { runSkillTask } from '../../cli/output/tasks.js';
import { fetchExistingComments, deduplicateFindings } from '../../output/dedup.js';
import { evaluateFixAttempts } from '../fix-evaluation/index.js';
import { setFailed, writeFindingsOutput } from './base.js';
import { runPRWorkflow } from './pr-workflow.js';
import { clearSkillsCache } from '../../skills/loader.js';
import { Semaphore } from '../../utils/index.js';

// Type the mocks
const mockRunSkillTask = vi.mocked(runSkillTask);
const mockFetchExistingComments = vi.mocked(fetchExistingComments);
const mockDeduplicateFindings = vi.mocked(deduplicateFindings);
const mockEvaluateFixAttempts = vi.mocked(evaluateFixAttempts);
const mockSetFailed = vi.mocked(setFailed);
const mockWriteFindingsOutput = vi.mocked(writeFindingsOutput);

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

  const files = options.prFiles ?? defaultFiles;
  let nextCheckRunId = 1;

  return {
    paginate: vi.fn(() => Promise.resolve(files)),
    pulls: {
      listFiles: vi.fn(),
      listReviews: vi.fn(() => Promise.resolve({ data: [] })),
      createReview: vi.fn(() => Promise.resolve({ data: {} })),
      updateReviewComment: vi.fn(() => Promise.resolve({ data: {} })),
      dismissReview: vi.fn(() => Promise.resolve({ data: {} })),
    },
    checks: {
      create: vi.fn(() =>
        Promise.resolve({
          data: {
            id: nextCheckRunId++,
            html_url: `https://example.com/check/${nextCheckRunId - 1}`,
          },
        })
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

function createExistingWardenComment(overrides: Partial<ExistingComment> = {}): ExistingComment {
  return {
    id: 1,
    path: 'src/test.ts',
    line: 10,
    title: 'SQL injection',
    description: 'User input in query',
    contentHash: 'abc',
    isWarden: true,
    isResolved: false,
    threadId: 'thread-1',
    originalCommitSha: PREVIOUS_HEAD_SHA,
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
    mockWriteFindingsOutput.mockReturnValue('/tmp/warden-findings.json');

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
            originalFindingId: finding.id,
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

    it('normalizes empty auxiliary default before review deduplication', async () => {
      const finding = createFinding();
      const report = createSkillReport({ findings: [finding] });

      mockFetchExistingComments.mockResolvedValue([
        {
          id: 1,
          body: 'Existing issue',
          path: 'src/test.ts',
          line: 10,
          isWarden: true,
          title: 'Different finding',
          description: 'Existing description',
          contentHash: 'abc123',
        },
      ]);
      mockDeduplicateFindings.mockResolvedValue({
        newFindings: [finding],
        duplicateActions: [],
      });
      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report });

      await runPRWorkflow(
        mockOctokit,
        createDefaultInputs(),
        'pull_request',
        EVENT_PAYLOAD_PATH,
        EMPTY_AUXILIARY_MODEL_FIXTURES_DIR
      );

      expect(mockDeduplicateFindings).toHaveBeenCalledWith(
        [finding],
        expect.any(Array),
        expect.objectContaining({
          model: undefined,
        })
      );
    });
  });

  describe('trigger execution', () => {
    it('runs matched trigger and collects report', async () => {
      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report: createSkillReport({ skill: 'test-skill' }) });

      await runPRWorkflow(mockOctokit, createDefaultInputs(), 'pull_request', EVENT_PAYLOAD_PATH, FIXTURES_DIR);

      expect(mockRunSkillTask).toHaveBeenCalledTimes(1);
      const [taskOptions, fileConcurrency, _callbacks, semaphore] = mockRunSkillTask.mock.calls[0]!;
      expect(taskOptions).toEqual(expect.objectContaining({
        name: 'test-skill',
        displayName: 'test-skill',
      }));
      // When a semaphore is provided, fileConcurrency is unlimited (semaphore is the gate)
      expect(fileConcurrency).toBe(Number.MAX_SAFE_INTEGER);
      expect(semaphore).toBeInstanceOf(Semaphore);
    });

    it('honors the parallel input when dispatching matched triggers', async () => {
      let activeRuns = 0;
      let maxActiveRuns = 0;
      let invocationCount = 0;
      let resolveFirstRun!: () => void;
      let resolveFirstRunStarted!: () => void;
      const firstRun = new Promise<void>((resolve) => {
        resolveFirstRun = resolve;
      });
      const firstRunStarted = new Promise<void>((resolve) => {
        resolveFirstRunStarted = resolve;
      });

      mockRunSkillTask.mockImplementation(async (taskOptions) => {
        invocationCount++;
        activeRuns++;
        maxActiveRuns = Math.max(maxActiveRuns, activeRuns);
        try {
          if (invocationCount === 1) {
            resolveFirstRunStarted();
            await firstRun;
          }
          return {
            name: taskOptions.name,
            report: createSkillReport({ skill: taskOptions.displayName ?? taskOptions.name }),
          };
        } finally {
          activeRuns--;
        }
      });

      const workflow = runPRWorkflow(
        mockOctokit,
        createDefaultInputs({
          baseConfigPath: '.warden-org/warden.toml',
          baseSkillRoot: '.warden-org',
          parallel: 1,
        }),
        'pull_request',
        EVENT_PAYLOAD_PATH,
        FIXTURES_DIR
      );

      await firstRunStarted;
      // Let any incorrectly dispatched second trigger reach the mocked runner.
      await new Promise((resolve) => setTimeout(resolve, 0));
      const callsBeforeFirstRunFinished = mockRunSkillTask.mock.calls.length;
      resolveFirstRun();
      await workflow;

      expect(mockRunSkillTask).toHaveBeenCalledTimes(2);
      expect(callsBeforeFirstRunFinished).toBe(1);
      expect(maxActiveRuns).toBe(1);
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
      expect(updateCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          check_run_id: 2,
          conclusion: 'failure',
          output: expect.objectContaining({
            title: 'Skill execution failed',
            summary: expect.stringContaining('Skill failed'),
          }),
        })
      );
      expect(updateCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          check_run_id: 1,
          conclusion: 'failure',
          output: expect.objectContaining({
            summary: expect.stringContaining('| test-skill | 0 |'),
          }),
        })
      );
    });
  });

  describe('failure conditions', () => {
    it('requires Claude auth when the runtime is Claude', async () => {
      await expect(
        runPRWorkflow(
          mockOctokit,
          createDefaultInputs({ anthropicApiKey: '', oauthToken: '' }),
          'pull_request',
          EVENT_PAYLOAD_PATH,
          RUNTIME_CLAUDE_FIXTURES_DIR
        )
      ).rejects.toThrow('setFailed');

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Authentication not found')
      );
      expect(mockOctokit.checks.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'warden: test-skill' })
      );
      expect(mockOctokit.checks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          check_run_id: 2,
          conclusion: 'failure',
          output: expect.objectContaining({
            title: 'Skill execution failed',
            summary: expect.stringContaining('Authentication not found'),
          }),
        })
      );
      expect(mockOctokit.checks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          check_run_id: 1,
          conclusion: 'failure',
          output: expect.objectContaining({
            title: 'Warden failed',
            summary: expect.stringContaining('Authentication not found'),
          }),
        })
      );
      expect(mockRunSkillTask).not.toHaveBeenCalled();
    });

    it('fails when findings exceed fail-on threshold and failCheck is true', async () => {
      const finding = createFinding({ severity: 'high' });
      const report = createSkillReport({ findings: [finding] });

      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report });

      await expect(
        runPRWorkflow(
          mockOctokit,
          createDefaultInputs({ failOn: 'high', failCheck: true }),
          'pull_request',
          EVENT_PAYLOAD_PATH,
          FIXTURES_DIR
        )
      ).rejects.toThrow('setFailed');

      expect(mockSetFailed).toHaveBeenCalledWith(expect.stringContaining('high+ severity'));
    });

    it('does not fail when findings exceed fail-on threshold but failCheck is false', async () => {
      const finding = createFinding({ severity: 'high' });
      const report = createSkillReport({ findings: [finding] });

      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report });

      // Should complete without throwing
      await runPRWorkflow(
        mockOctokit,
        createDefaultInputs({ failOn: 'high', failCheck: false }),
        'pull_request',
        EVENT_PAYLOAD_PATH,
        FIXTURES_DIR
      );

      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('does not fail when findings exceed fail-on threshold and failCheck is default (undefined)', async () => {
      const finding = createFinding({ severity: 'high' });
      const report = createSkillReport({ findings: [finding] });

      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report });

      // Should complete without throwing (failCheck defaults to false)
      await runPRWorkflow(
        mockOctokit,
        createDefaultInputs({ failOn: 'high' }),
        'pull_request',
        EVENT_PAYLOAD_PATH,
        FIXTURES_DIR
      );

      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('exits cleanly when warden.toml is missing', async () => {
      await runPRWorkflow(
        mockOctokit,
        createDefaultInputs(),
        'pull_request',
        EVENT_PAYLOAD_PATH,
        NO_CONFIG_FIXTURES_DIR
      );

      // Should not fail
      expect(mockSetFailed).not.toHaveBeenCalled();
      // Should not run any skills
      expect(mockRunSkillTask).not.toHaveBeenCalled();
      // Should not run cleanup without a config scope
      expect(mockFetchExistingComments).not.toHaveBeenCalled();
      expect(mockOctokit.checks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'warden',
          head_sha: 'abc123def456',
        })
      );
      expect(mockOctokit.checks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          check_run_id: 1,
          conclusion: 'neutral',
          output: expect.objectContaining({
            title: 'No warden.toml found',
            summary: expect.stringContaining('No warden.toml found. Skipping analysis.'),
          }),
        })
      );
      // Should log a warning
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '::warning::No warden.toml found. Skipping analysis.'
      );
    });

    it('loads the base config when repo warden.toml is missing', async () => {
      mockRunSkillTask.mockResolvedValue({ name: 'org-skill', report: createSkillReport({ skill: 'org-skill' }) });

      await runPRWorkflow(
        mockOctokit,
        createDefaultInputs({
          baseConfigPath: '.warden-org/warden.toml',
          baseSkillRoot: '.warden-org',
        }),
        'pull_request',
        EVENT_PAYLOAD_PATH,
        BASE_ONLY_FIXTURES_DIR
      );

      expect(mockRunSkillTask).toHaveBeenCalledTimes(1);
      const [taskOptions] = mockRunSkillTask.mock.calls[0]!;
      expect(taskOptions.displayName).toBe('org-skill');
    });

    it('merges the base config with the repo config when both exist', async () => {
      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report: createSkillReport() });

      await runPRWorkflow(
        mockOctokit,
        createDefaultInputs({
          baseConfigPath: '.warden-org/warden.toml',
          baseSkillRoot: '.warden-org',
        }),
        'pull_request',
        EVENT_PAYLOAD_PATH,
        FIXTURES_DIR
      );

      expect(mockRunSkillTask).toHaveBeenCalledTimes(2);
      expect(mockRunSkillTask.mock.calls.map(([taskOptions]) => taskOptions.displayName)).toEqual([
        'org-skill',
        'test-skill',
      ]);
    });

    it('fails when an explicit base config is missing', async () => {
      await expect(
        runPRWorkflow(
          mockOctokit,
          createDefaultInputs({ baseConfigPath: '.warden-org/missing.toml' }),
          'pull_request',
          EVENT_PAYLOAD_PATH,
          FIXTURES_DIR
        )
      ).rejects.toThrow('Configuration file not found');
    });

    it('fails when the base config defines local skills without baseSkillRoot', async () => {
      await expect(
        runPRWorkflow(
          mockOctokit,
          createDefaultInputs({ baseConfigPath: '.warden-org/warden.toml' }),
          'pull_request',
          EVENT_PAYLOAD_PATH,
          FIXTURES_DIR
        )
      ).rejects.toThrow(
        'base-skill-root is required when the base config defines local skills'
      );
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

    it('creates and completes the core check when no triggers match', async () => {
      mockFetchExistingComments.mockResolvedValue([]);

      await runPRWorkflow(
        mockOctokit,
        createDefaultInputs(),
        'pull_request',
        EVENT_PAYLOAD_PATH,
        NO_MATCH_FIXTURES_DIR
      );

      const createCheck = vi.mocked(mockOctokit.checks.create);
      const updateCheck = vi.mocked(mockOctokit.checks.update);

      expect(createCheck).toHaveBeenCalledTimes(2);
      expect(createCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          head_sha: 'abc123def456',
          name: 'warden',
        })
      );
      expect(createCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          head_sha: 'abc123def456',
          name: 'warden: test-skill',
        })
      );
      expect(updateCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          check_run_id: 2,
          conclusion: 'neutral',
          output: expect.objectContaining({
            title: 'Skipped',
            summary: expect.stringContaining('Trigger did not run for this event.'),
          }),
        })
      );
      expect(updateCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          check_run_id: 1,
          conclusion: 'neutral',
          output: expect.objectContaining({
            title: 'No triggers matched',
            summary: expect.stringContaining('No triggers matched for this event.'),
          }),
        })
      );
      expect(updateCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          output: expect.objectContaining({
            summary: expect.stringContaining('0 skills analyzed'),
          }),
        })
      );
      expect(mockRunSkillTask).not.toHaveBeenCalled();
    });

    it('creates neutral checks for skipped triggers while running matched triggers', async () => {
      mockRunSkillTask.mockResolvedValue({
        name: 'run-skill',
        report: createSkillReport({ skill: 'run-skill' }),
      });

      await runPRWorkflow(
        mockOctokit,
        createDefaultInputs(),
        'pull_request',
        EVENT_PAYLOAD_PATH,
        PARTIAL_MATCH_FIXTURES_DIR
      );

      const createCheck = vi.mocked(mockOctokit.checks.create);
      const updateCheck = vi.mocked(mockOctokit.checks.update);

      expect(mockRunSkillTask).toHaveBeenCalledTimes(1);
      expect(mockRunSkillTask.mock.calls[0]![0].displayName).toBe('run-skill');
      expect(createCheck).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'warden: skipped-skill' })
      );
      expect(createCheck).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'warden: run-skill' })
      );
      expect(updateCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          conclusion: 'neutral',
          output: expect.objectContaining({
            title: 'Skipped',
            summary: expect.stringContaining('Trigger did not run for this event.'),
          }),
        })
      );
    });

    it('creates neutral checks for triggers skipped by pull request action', async () => {
      mockFetchExistingComments.mockResolvedValue([]);

      await runPRWorkflow(
        mockOctokit,
        createDefaultInputs(),
        'pull_request',
        EVENT_PAYLOAD_PATH,
        ACTION_MISMATCH_FIXTURES_DIR
      );

      expect(mockRunSkillTask).not.toHaveBeenCalled();
      expect(mockOctokit.checks.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'warden: labeled-skill' })
      );
      expect(mockOctokit.checks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          conclusion: 'neutral',
          output: expect.objectContaining({
            title: 'Skipped',
            summary: expect.stringContaining('Trigger did not run for this event.'),
          }),
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

      // runSkillTask receives options with context containing the custom files
      const [taskOptions, fileConcurrency, _callbacks, semaphore] = mockRunSkillTask.mock.calls[0]!;
      expect(taskOptions.context.pullRequest?.files).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            filename: 'src/custom.ts',
            status: 'added',
          }),
        ])
      );
      expect(fileConcurrency).toBe(Number.MAX_SAFE_INTEGER);
      expect(semaphore).toBeInstanceOf(Semaphore);
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

      await runPRWorkflow(
        mockOctokit,
        createDefaultInputs({ failOn: 'high', requestChanges: true }),
        'pull_request',
        EVENT_PAYLOAD_PATH,
        FIXTURES_DIR
      );

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

  describe('fix evaluation integration', () => {
    it('calls evaluateFixAttempts when unresolved Warden comments exist', async () => {
      // Existing unresolved Warden comments
      mockFetchExistingComments.mockResolvedValue([createExistingWardenComment()]);

      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report: createSkillReport() });

      await runPRWorkflow(mockOctokit, createDefaultInputs(), 'pull_request', EVENT_PAYLOAD_PATH, FIXTURES_DIR);

      expect(mockEvaluateFixAttempts).toHaveBeenCalledWith(
        mockOctokit,
        expect.arrayContaining([expect.objectContaining({ isWarden: true })]),
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          baseSha: PREVIOUS_HEAD_SHA,
          headSha: PR_HEAD_SHA,
        }),
        expect.any(Array),
        'test-api-key',
        expect.objectContaining({ runtime: 'pi' })
      );
    });

    it('runs Pi fix evaluation without a legacy Anthropic API key', async () => {
      mockFetchExistingComments.mockResolvedValue([createExistingWardenComment()]);

      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report: createSkillReport() });

      await runPRWorkflow(
        mockOctokit,
        createDefaultInputs({ anthropicApiKey: '', oauthToken: '' }),
        'pull_request',
        EVENT_PAYLOAD_PATH,
        FIXTURES_DIR
      );

      expect(mockEvaluateFixAttempts).toHaveBeenCalledWith(
        mockOctokit,
        expect.arrayContaining([expect.objectContaining({ isWarden: true })]),
        expect.any(Object),
        expect.any(Array),
        '',
        expect.objectContaining({ runtime: 'pi' })
      );
    });

    it('keeps base auxiliary defaults for workflow-level fix evaluation', async () => {
      mockFetchExistingComments.mockResolvedValue([createExistingWardenComment()]);

      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report: createSkillReport() });

      await runPRWorkflow(
        mockOctokit,
        createDefaultInputs({
          baseConfigPath: '.warden-org/warden.toml',
          baseSkillRoot: '.warden-org',
        }),
        'pull_request',
        EVENT_PAYLOAD_PATH,
        LAYERED_AUXILIARY_MODEL_FIXTURES_DIR
      );

      expect(mockEvaluateFixAttempts).toHaveBeenCalledWith(
        mockOctokit,
        expect.arrayContaining([expect.objectContaining({ isWarden: true })]),
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          baseSha: PREVIOUS_HEAD_SHA,
          headSha: PR_HEAD_SHA,
        }),
        expect.any(Array),
        'test-api-key',
        expect.objectContaining({
          runtime: 'pi',
          model: 'anthropic/org-aux-model',
          maxRetries: 7,
        })
      );
    });

    it('does not call evaluateFixAttempts when no existing comments', async () => {
      mockFetchExistingComments.mockResolvedValue([]);
      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report: createSkillReport() });

      await runPRWorkflow(mockOctokit, createDefaultInputs(), 'pull_request', EVENT_PAYLOAD_PATH, FIXTURES_DIR);

      expect(mockEvaluateFixAttempts).not.toHaveBeenCalled();
    });

    it('skips fix evaluation for comments posted on the current head commit', async () => {
      mockFetchExistingComments.mockResolvedValue([
        createExistingWardenComment({ originalCommitSha: PR_HEAD_SHA }),
      ]);

      mockRunSkillTask.mockResolvedValue({ name: 'test-trigger', report: createSkillReport() });

      await runPRWorkflow(mockOctokit, createDefaultInputs(), 'pull_request', EVENT_PAYLOAD_PATH, FIXTURES_DIR);

      expect(mockEvaluateFixAttempts).not.toHaveBeenCalled();
    });

    it('does not auto-resolve comments matched by current-run deduplication', async () => {
      const existingComment = createExistingWardenComment({
        title: 'Old warning wording',
        description: 'Old description',
        contentHash: 'oldhash',
      });
      const finding = createFinding({
        severity: 'high',
        title: 'Current warning wording',
        description: 'Current description',
        location: { path: 'src/test.ts', startLine: 10 },
      });

      mockFetchExistingComments.mockResolvedValue([existingComment]);
      mockRunSkillTask.mockResolvedValue({
        name: 'test-trigger',
        report: createSkillReport({ findings: [finding] }),
      });
      mockDeduplicateFindings.mockResolvedValue({
        newFindings: [],
        duplicateActions: [
          {
            type: 'update_warden',
            originalFindingId: finding.id,
            finding,
            existingComment,
            matchType: 'semantic',
          },
        ],
      });

      await runPRWorkflow(
        mockOctokit,
        createDefaultInputs({ failOn: 'high', requestChanges: true }),
        'pull_request',
        EVENT_PAYLOAD_PATH,
        FIXTURES_DIR
      );

      expect(mockEvaluateFixAttempts).not.toHaveBeenCalled();
      expect(mockOctokit.graphql).not.toHaveBeenCalled();
    });
  });

  describe('no triggers matched cleanup', () => {
    it('requires Claude auth before cleanup fix evaluation', async () => {
      mockFetchExistingComments.mockResolvedValue([
        createExistingWardenComment({
          path: 'src/old-file.ts',
          line: 5,
          title: 'Unused import',
          description: 'Remove unused import',
          contentHash: 'hash1',
        }),
      ]);

      await expect(
        runPRWorkflow(
          mockOctokit,
          createDefaultInputs({ anthropicApiKey: '', oauthToken: '' }),
          'pull_request',
          EVENT_PAYLOAD_PATH,
          NO_MATCH_RUNTIME_CLAUDE_FIXTURES_DIR
        )
      ).rejects.toThrow('setFailed');

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Authentication not found')
      );
      expect(mockOctokit.checks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          check_run_id: 1,
          conclusion: 'failure',
          output: expect.objectContaining({
            title: 'Warden failed',
            summary: expect.stringContaining('Authentication not found'),
          }),
        })
      );
      expect(mockEvaluateFixAttempts).not.toHaveBeenCalled();
      expect(mockRunSkillTask).not.toHaveBeenCalled();
    });

    it('resolves stale comments when no triggers match but Warden comments exist', async () => {
      // PR files are src/test.ts, but no-match fixture has paths: ["docs/**"]
      // so no triggers will match
      mockFetchExistingComments.mockResolvedValue([
        createExistingWardenComment({
          path: 'src/old-file.ts',
          line: 5,
          title: 'Unused import',
          description: 'Remove unused import',
          contentHash: 'hash1',
        }),
      ]);

      await runPRWorkflow(
        mockOctokit, createDefaultInputs(), 'pull_request',
        EVENT_PAYLOAD_PATH, NO_MATCH_FIXTURES_DIR
      );

      // Should fetch existing comments for cleanup
      expect(mockFetchExistingComments).toHaveBeenCalledWith(
        mockOctokit, 'test-owner', 'test-repo', 123
      );

      // Should run fix evaluation with empty findings
      expect(mockEvaluateFixAttempts).toHaveBeenCalledWith(
        mockOctokit,
        expect.arrayContaining([expect.objectContaining({ isWarden: true })]),
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
        }),
        [],
        'test-api-key',
        expect.objectContaining({ runtime: 'pi' })
      );

      // Should NOT run skill tasks (no triggers matched)
      expect(mockRunSkillTask).not.toHaveBeenCalled();
    });

    it('normalizes empty auxiliary default before cleanup fix evaluation', async () => {
      mockFetchExistingComments.mockResolvedValue([
        createExistingWardenComment({
          path: 'src/old-file.ts',
          line: 5,
          title: 'Unused import',
          description: 'Remove unused import',
          contentHash: 'hash1',
        }),
      ]);

      await runPRWorkflow(
        mockOctokit,
        createDefaultInputs(),
        'pull_request',
        EVENT_PAYLOAD_PATH,
        NO_MATCH_EMPTY_AUXILIARY_MODEL_FIXTURES_DIR
      );

      expect(mockEvaluateFixAttempts).toHaveBeenCalledWith(
        mockOctokit,
        expect.any(Array),
        expect.any(Object),
        [],
        'test-api-key',
        expect.objectContaining({
          model: undefined,
        })
      );
      expect(mockRunSkillTask).not.toHaveBeenCalled();
    });

    it('dismisses CHANGES_REQUESTED when all comments resolved during cleanup', async () => {
      // Previous review was CHANGES_REQUESTED
      vi.mocked(mockOctokit.pulls.listReviews).mockResolvedValue({
        data: [{ id: 42, state: 'CHANGES_REQUESTED', user: { login: 'warden[bot]' } }],
      } as ListReviewsResponse);

      // One unresolved Warden comment
      mockFetchExistingComments.mockResolvedValue([
        createExistingWardenComment({
          path: 'src/old-file.ts',
          line: 5,
          title: 'Bug',
          description: 'Fix this',
          contentHash: 'hash1',
        }),
      ]);

      // Fix evaluation resolves the comment
      mockEvaluateFixAttempts.mockResolvedValue({
        toResolve: [{
          id: 1,
          path: 'src/old-file.ts',
          line: 5,
          title: 'Bug',
          description: 'Fix this',
          contentHash: 'hash1',
          isWarden: true,
          isResolved: false,
          threadId: 'thread-1',
        }],
        toReply: [],
        evaluations: [],
        skipped: 0,
        evaluated: 1,
        failedEvaluations: 0,
        uniqueFindingsEvaluated: 1,
        uniqueFindingsCodeChanged: 1,
        uniqueFindingsResolved: 1,
        usage: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
      });

      await runPRWorkflow(
        mockOctokit, createDefaultInputs(), 'pull_request',
        EVENT_PAYLOAD_PATH, NO_MATCH_FIXTURES_DIR
      );

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
      expect(mockWriteFindingsOutput).toHaveBeenLastCalledWith(
        [],
        expect.any(Object),
        [
          expect.objectContaining({
            outcome: 'resolved',
            skill: undefined,
            resolvedReason: 'fix_evaluation',
          }),
        ]
      );
    });

    it('does NOT dismiss when unresolved comments remain after cleanup', async () => {
      // Previous review was CHANGES_REQUESTED
      vi.mocked(mockOctokit.pulls.listReviews).mockResolvedValue({
        data: [{ id: 42, state: 'CHANGES_REQUESTED', user: { login: 'warden[bot]' } }],
      } as ListReviewsResponse);

      // One unresolved Warden comment
      mockFetchExistingComments.mockResolvedValue([
        createExistingWardenComment({
          path: 'src/old-file.ts',
          line: 5,
          title: 'Bug',
          description: 'Fix this',
          contentHash: 'hash1',
        }),
      ]);

      // Fix evaluation says comment is NOT fixed (toReply has it)
      mockEvaluateFixAttempts.mockResolvedValue({
        toResolve: [],
        toReply: [{
          comment: {
            id: 1,
            path: 'src/old-file.ts',
            line: 5,
            title: 'Bug',
            description: 'Fix this',
            contentHash: 'hash1',
            isWarden: true,
            isResolved: false,
            threadId: 'thread-1',
          },
          replyBody: 'Still not fixed',
          commitSha: 'abc123def456',
        }],
        evaluations: [],
        skipped: 0,
        evaluated: 1,
        failedEvaluations: 0,
        uniqueFindingsEvaluated: 1,
        uniqueFindingsCodeChanged: 0,
        uniqueFindingsResolved: 0,
        usage: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
      });

      await runPRWorkflow(
        mockOctokit, createDefaultInputs(), 'pull_request',
        EVENT_PAYLOAD_PATH, NO_MATCH_FIXTURES_DIR
      );

      const dismissReview = vi.mocked(mockOctokit.pulls.dismissReview);
      expect(dismissReview).not.toHaveBeenCalled();
    });

    it('skips cleanup when no existing Warden comments', async () => {
      mockFetchExistingComments.mockResolvedValue([]);

      await runPRWorkflow(
        mockOctokit, createDefaultInputs(), 'pull_request',
        EVENT_PAYLOAD_PATH, NO_MATCH_FIXTURES_DIR
      );

      // fetchExistingComments called, but evaluateFixAttempts should NOT be called
      expect(mockFetchExistingComments).toHaveBeenCalled();
      expect(mockEvaluateFixAttempts).not.toHaveBeenCalled();
    });

    it('skips cleanup when only non-Warden comments exist', async () => {
      // External comments should not trigger cleanup
      mockFetchExistingComments.mockResolvedValue([
        {
          id: 1,
          path: 'src/test.ts',
          line: 10,
          title: 'Human review',
          description: 'Please fix this',
          contentHash: 'hash1',
          isWarden: false,
          isResolved: false,
        },
      ]);

      await runPRWorkflow(
        mockOctokit, createDefaultInputs(), 'pull_request',
        EVENT_PAYLOAD_PATH, NO_MATCH_FIXTURES_DIR
      );

      // Comments fetched, but no fix evaluation since no Warden comments
      expect(mockFetchExistingComments).toHaveBeenCalled();
      expect(mockEvaluateFixAttempts).not.toHaveBeenCalled();
    });
  });
});
