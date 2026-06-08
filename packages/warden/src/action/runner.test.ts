import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionInputs } from './inputs.js';

const mocks = vi.hoisted(() => ({
  octokit: {},
  parseActionInputs: vi.fn(),
  validateInputs: vi.fn(),
  setupAuthEnv: vi.fn(),
  setFailed: vi.fn((message: string): never => {
    throw new Error(message);
  }),
  runPRWorkflow: vi.fn(() => Promise.resolve()),
  runScheduleWorkflow: vi.fn(() => Promise.resolve()),
  setGitHubActionScope: vi.fn(),
  setRepositoryScope: vi.fn(),
}));

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(function Octokit() {
    return mocks.octokit;
  }),
}));

vi.mock('../sentry.js', () => ({
  setGitHubActionScope: mocks.setGitHubActionScope,
  setRepositoryScope: mocks.setRepositoryScope,
}));

vi.mock('./inputs.js', () => ({
  parseActionInputs: mocks.parseActionInputs,
  validateInputs: mocks.validateInputs,
  setupAuthEnv: mocks.setupAuthEnv,
}));

vi.mock('./workflow/base.js', () => ({
  setFailed: mocks.setFailed,
}));

vi.mock('./workflow/pr-workflow.js', () => ({
  runPRWorkflow: mocks.runPRWorkflow,
}));

vi.mock('./workflow/schedule.js', () => ({
  runScheduleWorkflow: mocks.runScheduleWorkflow,
}));

import { runAction } from './runner.js';

const baseInputs: ActionInputs = {
  anthropicApiKey: 'test-api-key',
  oauthToken: '',
  githubToken: 'test-github-token',
  mode: 'run',
  configPath: 'warden.toml',
  maxFindings: 50,
  parallel: 4,
};

describe('runAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['GITHUB_EVENT_NAME'] = 'schedule';
    process.env['GITHUB_EVENT_PATH'] = '/tmp/event.json';
    process.env['GITHUB_WORKSPACE'] = '/tmp/workspace';
    process.env['GITHUB_REPOSITORY'] = 'getsentry/warden';
    mocks.parseActionInputs.mockReturnValue({ ...baseInputs });
  });

  it.each(['analyze', 'report'] as const)(
    'rejects %s mode for scheduled workflows before dispatching',
    async (mode) => {
      mocks.parseActionInputs.mockReturnValue({
        ...baseInputs,
        mode,
        findingsFile: mode === 'report' ? 'warden-findings.json' : undefined,
      });

      await expect(runAction()).rejects.toThrow(
        `${mode} mode is only supported for pull request workflows`
      );

      expect(mocks.runScheduleWorkflow).not.toHaveBeenCalled();
      expect(mocks.runPRWorkflow).not.toHaveBeenCalled();
    }
  );

  it.each(['analyze', 'report'] as const)(
    'rejects %s mode for non-pull-request workflows before dispatching',
    async (mode) => {
      process.env['GITHUB_EVENT_NAME'] = 'push';
      mocks.parseActionInputs.mockReturnValue({
        ...baseInputs,
        mode,
        findingsFile: mode === 'report' ? 'warden-findings.json' : undefined,
      });

      await expect(runAction()).rejects.toThrow(
        `${mode} mode is only supported for pull request workflows`
      );

      expect(mocks.runScheduleWorkflow).not.toHaveBeenCalled();
      expect(mocks.runPRWorkflow).not.toHaveBeenCalled();
    }
  );

  it('keeps legacy run mode dispatching non-schedule workflows', async () => {
    process.env['GITHUB_EVENT_NAME'] = 'push';

    await runAction();

    expect(mocks.runScheduleWorkflow).not.toHaveBeenCalled();
    expect(mocks.runPRWorkflow).toHaveBeenCalledWith(
      mocks.octokit,
      baseInputs,
      'push',
      '/tmp/event.json',
      '/tmp/workspace'
    );
  });
});
