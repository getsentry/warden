import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Octokit } from '@octokit/rest';
import type { ActionInputs } from '../inputs.js';
import type { SkillReport, Finding, EventContext } from '../../types/index.js';

// -----------------------------------------------------------------------------
// Fixtures Directory
// -----------------------------------------------------------------------------

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SCHEDULE_FIXTURES = join(__dirname, '__fixtures__/schedule');
const SCHEDULE_MULTI_FIXTURES = join(__dirname, '__fixtures__/schedule-multi');
const SCHEDULE_FIXPR_FIXTURES = join(__dirname, '__fixtures__/schedule-fixpr');
const SCHEDULE_TITLE_FIXTURES = join(__dirname, '__fixtures__/schedule-title');
// Reuse the base fixtures dir (has only pull_request triggers, no schedule)
const PR_ONLY_FIXTURES = join(__dirname, '__fixtures__');

// -----------------------------------------------------------------------------
// Mocks - ONLY external boundaries
// -----------------------------------------------------------------------------

// Mock base utilities that call process.exit or need system access
vi.mock('./base.js', async () => {
  const actual: Record<string, unknown> = await vi.importActual('./base.js');
  const mockedSetFailed = vi.fn((msg: string): never => {
    throw new Error(`setFailed: ${msg}`);
  });
  return {
    ...actual,
    setFailed: mockedSetFailed,
    findClaudeCodeExecutable: vi.fn(() => '/usr/local/bin/claude'),
    getDefaultBranchFromAPI: vi.fn(() => Promise.resolve('main')),
    // Override handleTriggerErrors to use the mocked setFailed
    handleTriggerErrors: (triggerErrors: string[], totalTriggers: number) => {
      if (triggerErrors.length === 0) return;
      if (triggerErrors.length === totalTriggers && totalTriggers > 0) {
        mockedSetFailed(`All ${totalTriggers} trigger(s) failed: ${triggerErrors.join('; ')}`);
      }
    },
  };
});

// Mock SDK runner — LLM calls
vi.mock('../../sdk/runner.js', () => ({
  runSkill: vi.fn(),
}));

// Mock schedule context builder — filesystem glob expansion
vi.mock('../../event/schedule-context.js', () => ({
  buildScheduleEventContext: vi.fn(),
}));

// Mock GitHub issue/PR creation
vi.mock('../../output/github-issues.js', () => ({
  createOrUpdateIssue: vi.fn(),
  createFixPR: vi.fn(),
}));

// Mock skill loader — filesystem reads; keep clearSkillsCache real
vi.mock('../../skills/loader.js', async () => {
  const actual = await vi.importActual('../../skills/loader.js');
  return {
    ...actual,
    resolveSkillAsync: vi.fn(() =>
      Promise.resolve({
        name: 'test-skill',
        description: 'Test skill',
        prompt: 'Review code',
      })
    ),
  };
});

// Import after mocks
import { runSkill } from '../../sdk/runner.js';
import { buildScheduleEventContext } from '../../event/schedule-context.js';
import { createOrUpdateIssue, createFixPR } from '../../output/github-issues.js';
import { resolveSkillAsync } from '../../skills/loader.js';
import { setFailed } from './base.js';
import { runScheduleWorkflow } from './schedule.js';
import { clearSkillsCache } from '../../skills/loader.js';

// Type the mocks
const mockRunSkill = vi.mocked(runSkill);
const mockBuildContext = vi.mocked(buildScheduleEventContext);
const mockCreateOrUpdateIssue = vi.mocked(createOrUpdateIssue);
const mockCreateFixPR = vi.mocked(createFixPR);
const mockResolveSkillAsync = vi.mocked(resolveSkillAsync);
const mockSetFailed = vi.mocked(setFailed);

// -----------------------------------------------------------------------------
// Mock Octokit Factory
// -----------------------------------------------------------------------------

function createMockOctokit(): Octokit {
  return {
    repos: {
      get: vi.fn(() => Promise.resolve({ data: { default_branch: 'main' } })),
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

function createScheduleContext(
  overrides: Partial<EventContext> = {}
): EventContext {
  return {
    eventType: 'schedule',
    action: 'scheduled',
    repository: {
      owner: 'test-owner',
      name: 'test-repo',
      fullName: 'test-owner/test-repo',
      defaultBranch: 'main',
    },
    pullRequest: {
      number: 0,
      title: 'Scheduled Analysis',
      body: null,
      author: 'warden',
      baseBranch: 'main',
      headBranch: 'main',
      headSha: 'abc123',
      baseSha: 'abc123',
      files: [
        {
          filename: 'src/test.ts',
          status: 'modified',
          additions: 10,
          deletions: 5,
          patch: '@@ -1,5 +1,10 @@\n+console.log("test")',
        },
      ],
    },
    repoPath: '/tmp/test-repo',
    ...overrides,
  };
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('runScheduleWorkflow', () => {
  let mockOctokit: Octokit;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetAllMocks();
    clearSkillsCache();
    mockOctokit = createMockOctokit();

    // Environment setup
    process.env['GITHUB_REPOSITORY'] = 'test-owner/test-repo';
    process.env['GITHUB_SHA'] = 'abc123';

    // Default mock: context with files, no findings
    mockBuildContext.mockResolvedValue(createScheduleContext());
    mockRunSkill.mockResolvedValue(createSkillReport());
    mockCreateOrUpdateIssue.mockResolvedValue({
      issueNumber: 1,
      issueUrl: 'https://github.com/test-owner/test-repo/issues/1',
      created: true,
    });
    mockResolveSkillAsync.mockResolvedValue({
      name: 'test-skill',
      description: 'Test skill',
      prompt: 'Review code',
    });

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env['GITHUB_REPOSITORY'];
    delete process.env['GITHUB_SHA'];
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // Configuration & Early Exit
  // ---------------------------------------------------------------------------

  describe('configuration and early exit', () => {
    it('exits early when no schedule triggers configured', async () => {
      // The PR_ONLY_FIXTURES config only has pull_request triggers
      await runScheduleWorkflow(mockOctokit, createDefaultInputs(), PR_ONLY_FIXTURES);

      expect(mockRunSkill).not.toHaveBeenCalled();
      expect(mockCreateOrUpdateIssue).not.toHaveBeenCalled();
    });

    it('fails when GITHUB_REPOSITORY is not set', async () => {
      delete process.env['GITHUB_REPOSITORY'];

      await expect(
        runScheduleWorkflow(mockOctokit, createDefaultInputs(), SCHEDULE_FIXTURES)
      ).rejects.toThrow('setFailed');

      expect(mockSetFailed).toHaveBeenCalledWith(
        'GITHUB_REPOSITORY environment variable not set'
      );
    });

    it('fails when GITHUB_REPOSITORY has invalid format', async () => {
      process.env['GITHUB_REPOSITORY'] = 'noslash';

      await expect(
        runScheduleWorkflow(mockOctokit, createDefaultInputs(), SCHEDULE_FIXTURES)
      ).rejects.toThrow('setFailed');

      expect(mockSetFailed).toHaveBeenCalledWith('Invalid GITHUB_REPOSITORY format');
    });

    it('fails when GITHUB_SHA is not set', async () => {
      delete process.env['GITHUB_SHA'];

      await expect(
        runScheduleWorkflow(mockOctokit, createDefaultInputs(), SCHEDULE_FIXTURES)
      ).rejects.toThrow('setFailed');

      expect(mockSetFailed).toHaveBeenCalledWith(
        'GITHUB_SHA environment variable not set'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Happy Path
  // ---------------------------------------------------------------------------

  describe('happy path', () => {
    it('runs skill and creates issue when findings exist', async () => {
      const finding = createFinding({ severity: 'high' });
      const report = createSkillReport({ findings: [finding] });
      mockRunSkill.mockResolvedValue(report);

      await runScheduleWorkflow(mockOctokit, createDefaultInputs(), SCHEDULE_FIXTURES);

      expect(mockRunSkill).toHaveBeenCalledTimes(1);
      expect(mockCreateOrUpdateIssue).toHaveBeenCalledWith(
        mockOctokit,
        'test-owner',
        'test-repo',
        [report],
        expect.objectContaining({
          title: 'Warden: test-skill',
          commitSha: 'abc123',
        })
      );
    });

    it('creates issue even when no findings', async () => {
      mockRunSkill.mockResolvedValue(createSkillReport({ findings: [] }));

      await runScheduleWorkflow(mockOctokit, createDefaultInputs(), SCHEDULE_FIXTURES);

      expect(mockRunSkill).toHaveBeenCalledTimes(1);
      expect(mockCreateOrUpdateIssue).toHaveBeenCalledTimes(1);
    });

    it('skips skill run when no files match trigger', async () => {
      mockBuildContext.mockResolvedValue(
        createScheduleContext({
          pullRequest: {
            number: 0,
            title: 'Scheduled Analysis',
            body: null,
            author: 'warden',
            baseBranch: 'main',
            headBranch: 'main',
            headSha: 'abc123',
            baseSha: 'abc123',
            files: [],
          },
        })
      );

      await runScheduleWorkflow(mockOctokit, createDefaultInputs(), SCHEDULE_FIXTURES);

      expect(mockRunSkill).not.toHaveBeenCalled();
      expect(mockCreateOrUpdateIssue).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Issue & PR Creation
  // ---------------------------------------------------------------------------

  describe('issue and PR creation', () => {
    it('creates fix PR when schedule.createFixPR is enabled', async () => {
      const finding = createFinding({
        suggestedFix: { description: 'Fix it', diff: '--- a\n+++ b\n' },
      });
      mockRunSkill.mockResolvedValue(createSkillReport({ findings: [finding] }));
      mockCreateFixPR.mockResolvedValue({
        prNumber: 42,
        prUrl: 'https://github.com/test-owner/test-repo/pull/42',
        branch: 'warden-fix/test-skill-123',
        fixCount: 1,
      });

      await runScheduleWorkflow(
        mockOctokit,
        createDefaultInputs(),
        SCHEDULE_FIXPR_FIXTURES
      );

      expect(mockCreateFixPR).toHaveBeenCalledWith(
        mockOctokit,
        'test-owner',
        'test-repo',
        [finding],
        expect.objectContaining({
          branchPrefix: 'warden-fix',
          baseBranch: 'main',
          baseSha: 'abc123',
          triggerName: 'test-skill',
        })
      );
    });

    it('does not create fix PR when not enabled', async () => {
      const finding = createFinding();
      mockRunSkill.mockResolvedValue(createSkillReport({ findings: [finding] }));

      await runScheduleWorkflow(mockOctokit, createDefaultInputs(), SCHEDULE_FIXTURES);

      expect(mockCreateFixPR).not.toHaveBeenCalled();
    });

    it('uses custom issue title from schedule config', async () => {
      const report = createSkillReport({ findings: [] });
      mockRunSkill.mockResolvedValue(report);

      await runScheduleWorkflow(
        mockOctokit,
        createDefaultInputs(),
        SCHEDULE_TITLE_FIXTURES
      );

      expect(mockCreateOrUpdateIssue).toHaveBeenCalledWith(
        mockOctokit,
        'test-owner',
        'test-repo',
        [report],
        expect.objectContaining({
          title: 'Custom Issue Title',
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Failure & Error Handling
  // ---------------------------------------------------------------------------

  describe('failure and error handling', () => {
    it('fails when failOn threshold is met and failCheck is true', async () => {
      const finding = createFinding({ severity: 'high' });
      mockRunSkill.mockResolvedValue(createSkillReport({ findings: [finding] }));

      await expect(
        runScheduleWorkflow(
          mockOctokit,
          createDefaultInputs({ failOn: 'high', failCheck: true }),
          SCHEDULE_FIXTURES
        )
      ).rejects.toThrow('setFailed');

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('high+ severity')
      );
    });

    it('does not fail when failOn threshold is met but failCheck is false', async () => {
      const finding = createFinding({ severity: 'high' });
      mockRunSkill.mockResolvedValue(createSkillReport({ findings: [finding] }));

      // Should complete without throwing (failCheck defaults to false)
      await runScheduleWorkflow(
        mockOctokit,
        createDefaultInputs({ failOn: 'high' }),
        SCHEDULE_FIXTURES
      );

      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('records error and calls handleTriggerErrors when trigger throws', async () => {
      // Use multi-trigger fixture so not all triggers fail
      mockResolveSkillAsync.mockResolvedValue({
        name: 'test-skill-a',
        description: 'Test skill A',
        prompt: 'Review code',
      });

      // First trigger fails, second succeeds
      mockRunSkill
        .mockRejectedValueOnce(new Error('Skill failed'))
        .mockResolvedValueOnce(createSkillReport());

      // Should not throw since only one of two triggers failed
      await runScheduleWorkflow(
        mockOctokit,
        createDefaultInputs(),
        SCHEDULE_MULTI_FIXTURES
      );

      // The error should be logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Trigger test-skill-a failed')
      );
    });

    it('fails when all triggers throw', async () => {
      mockRunSkill.mockRejectedValue(new Error('Skill failed'));

      // Use multi-trigger fixture — both triggers fail
      await expect(
        runScheduleWorkflow(
          mockOctokit,
          createDefaultInputs(),
          SCHEDULE_MULTI_FIXTURES
        )
      ).rejects.toThrow('setFailed');

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('All 2 trigger(s) failed')
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Outputs
  // ---------------------------------------------------------------------------

  describe('outputs', () => {
    it('aggregates severity counts across multiple triggers', async () => {
      const criticalFinding = createFinding({
        id: 'f1',
        severity: 'critical',
        title: 'Critical bug',
      });
      const highFinding = createFinding({
        id: 'f2',
        severity: 'high',
        title: 'High bug',
      });

      // Alternate skill resolution for multi fixtures
      mockResolveSkillAsync
        .mockResolvedValueOnce({
          name: 'test-skill-a',
          description: 'Test skill A',
          prompt: 'Review code',
        })
        .mockResolvedValueOnce({
          name: 'test-skill-b',
          description: 'Test skill B',
          prompt: 'Review code',
        });

      mockRunSkill
        .mockResolvedValueOnce(
          createSkillReport({
            skill: 'test-skill-a',
            findings: [criticalFinding],
            summary: 'Found critical issue',
          })
        )
        .mockResolvedValueOnce(
          createSkillReport({
            skill: 'test-skill-b',
            findings: [highFinding],
            summary: 'Found high issue',
          })
        );

      await runScheduleWorkflow(
        mockOctokit,
        createDefaultInputs(),
        SCHEDULE_MULTI_FIXTURES
      );

      // Verify console output includes the total
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('2 total findings')
      );
    });
  });
});
