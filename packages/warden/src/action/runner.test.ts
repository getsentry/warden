import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ErrorEvent, TransactionEvent } from '@sentry/core';
import type { ActionInputs } from './inputs.js';
import { initSentry, Sentry } from '../sentry.js';

const mocks = vi.hoisted(() => {
  return {
    octokit: {},
    parseActionInputs: vi.fn(),
    validateInputs: vi.fn(),
    setupAuthEnv: vi.fn(),
    runPRWorkflow: vi.fn(() => Promise.resolve()),
    runScheduleWorkflow: vi.fn(() => Promise.resolve()),
    classifyError: vi.fn(() => ({ code: 'unknown', message: 'test error' })),
  };
});

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(function Octokit() {
    return mocks.octokit;
  }),
}));

vi.mock('../sdk/errors.js', () => ({
  classifyError: mocks.classifyError,
}));

vi.mock('./inputs.js', () => ({
  parseActionInputs: mocks.parseActionInputs,
  validateInputs: mocks.validateInputs,
  setupAuthEnv: mocks.setupAuthEnv,
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

const capturedTransactions: TransactionEvent[] = [];
const capturedEvents: ErrorEvent[] = [];

function spyOnClientEmit() {
  const client = Sentry.getClient();
  if (!client) throw new Error('Sentry test client was not initialized');
  return vi.spyOn(client, 'emit');
}

describe('runAction without telemetry', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env['WARDEN_SENTRY_DSN'];
    await Sentry.close(0);
    process.env['GITHUB_EVENT_NAME'] = 'schedule';
    process.env['GITHUB_EVENT_PATH'] = '/tmp/event.json';
    process.env['GITHUB_WORKSPACE'] = '/tmp/workspace';
    process.env['GITHUB_REPOSITORY'] = 'getsentry/warden';
    mocks.parseActionInputs.mockReturnValue({ ...baseInputs });
  });

  it('dispatches safely without an initialized Sentry client', async () => {
    await runAction();

    expect(mocks.runScheduleWorkflow).toHaveBeenCalledWith(
      mocks.octokit,
      baseInputs,
      '/tmp/workspace'
    );
  });
});

describe('runAction', () => {
  beforeAll(() => {
    process.env['WARDEN_SENTRY_DSN'] = 'https://public@example.com/1';
    initSentry('action', {
      transport: () => ({
        send: async () => ({}),
        flush: async () => true,
      }),
      beforeSendTransaction: (event) => {
        capturedTransactions.push(event);
        return event;
      },
      beforeSend: (event) => {
        capturedEvents.push(event);
        return event;
      },
    });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    capturedTransactions.length = 0;
    capturedEvents.length = 0;
    Sentry.getGlobalScope().clear();
    Sentry.getIsolationScope().clear();
    process.env['GITHUB_EVENT_NAME'] = 'schedule';
    process.env['GITHUB_EVENT_PATH'] = '/tmp/event.json';
    process.env['GITHUB_WORKSPACE'] = '/tmp/workspace';
    process.env['GITHUB_REPOSITORY'] = 'getsentry/warden';
    process.env['GITHUB_RUN_ID'] = '12345';
    mocks.parseActionInputs.mockReturnValue({ ...baseInputs });
  });

  afterAll(async () => {
    delete process.env['WARDEN_SENTRY_DSN'];
    await Sentry.close(0);
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
    const emit = spyOnClientEmit();

    await runAction();
    await Sentry.flush(1000);

    expect(mocks.runScheduleWorkflow).not.toHaveBeenCalled();
    expect(mocks.runPRWorkflow).toHaveBeenCalledWith(
      mocks.octokit,
      baseInputs,
      'push',
      '/tmp/event.json',
      '/tmp/workspace'
    );
    expect(emit).toHaveBeenCalledWith(
      'processMetric',
      expect.objectContaining({
        name: 'warden.action.runs',
        value: 1,
        attributes: expect.objectContaining({
          'warden.action.outcome': 'success',
          'warden.action.stage': 'dispatch',
        }),
      })
    );
    expect(capturedTransactions).toContainEqual(
      expect.objectContaining({
        transaction: 'run Warden action',
        contexts: expect.objectContaining({
          trace: expect.objectContaining({
            op: 'cicd.workflow',
            status: 'ok',
            data: expect.objectContaining({ 'warden.action.outcome': 'success' }),
          }),
        }),
      })
    );
  });

  it('attributes input parsing failures before capturing them', async () => {
    const error = new Error('Invalid mode "later"');
    const setTag = vi.spyOn(Sentry.getIsolationScope(), 'setTag');
    const emit = spyOnClientEmit();
    mocks.parseActionInputs.mockImplementation(() => {
      throw error;
    });

    await expect(runAction()).rejects.toBe(error);
    await Sentry.flush(1000);

    expect(setTag).toHaveBeenCalledWith('repository', 'getsentry/warden');
    expect(setTag.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.parseActionInputs.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
    );
    expect(emit).toHaveBeenCalledWith(
      'processMetric',
      expect.objectContaining({
        name: 'warden.action.runs',
        value: 1,
        attributes: expect.objectContaining({
          'warden.action.outcome': 'failure',
          'warden.action.stage': 'input',
          'warden.error.code': 'unknown',
        }),
      })
    );
    expect(capturedTransactions).toContainEqual(
      expect.objectContaining({
        transaction: 'run Warden action',
        contexts: expect.objectContaining({
          trace: expect.objectContaining({
            op: 'cicd.workflow',
            status: 'internal_error',
            data: expect.objectContaining({
              'warden.action.outcome': 'failure',
              'warden.action.stage': 'input',
              'warden.error.code': 'unknown',
              'vcs.repository.name': 'warden',
              'cicd.pipeline.run.id': '12345',
            }),
          }),
        }),
      })
    );
    const rootTraceId = capturedTransactions.find(
      (event) => event.transaction === 'run Warden action'
    )?.contexts?.trace?.trace_id;
    expect(rootTraceId).toBeTruthy();
    expect(capturedEvents).toContainEqual(
      expect.objectContaining({
        contexts: expect.objectContaining({
          trace: expect.objectContaining({ trace_id: rootTraceId }),
          github_actions: expect.objectContaining({
            repository: 'getsentry/warden',
            event: 'schedule',
            run_id: '12345',
          }),
        }),
        tags: expect.objectContaining({
          repository: 'getsentry/warden',
          'github.event.name': 'schedule',
          'cicd.pipeline.run.id': '12345',
          'warden.error.code': 'unknown',
          'warden.action.stage': 'input',
        }),
      })
    );
  });

  it('records expected environment failures without creating an issue', async () => {
    delete process.env['GITHUB_WORKSPACE'];
    const emit = spyOnClientEmit();

    await expect(runAction()).rejects.toThrow(
      'This action must be run in a GitHub Actions environment'
    );
    await Sentry.flush(1000);

    expect(emit).toHaveBeenCalledWith(
      'processMetric',
      expect.objectContaining({
        name: 'warden.action.runs',
        value: 1,
        attributes: expect.objectContaining({
          'warden.action.outcome': 'failure',
          'warden.action.stage': 'environment',
          'warden.error.code': 'unknown',
        }),
      })
    );
    expect(capturedEvents).toEqual([]);
    expect(capturedTransactions).toContainEqual(
      expect.objectContaining({
        transaction: 'run Warden action',
        contexts: expect.objectContaining({
          trace: expect.objectContaining({
            op: 'cicd.workflow',
            status: 'internal_error',
            data: expect.objectContaining({
              'warden.action.outcome': 'failure',
              'warden.action.stage': 'environment',
            }),
          }),
        }),
      })
    );
  });

  it('records classified dispatch failures on the span, metric, and issue', async () => {
    const error = new Error('Provider is unavailable');
    const emit = spyOnClientEmit();
    mocks.runScheduleWorkflow.mockRejectedValueOnce(error);
    mocks.classifyError.mockReturnValueOnce({
      code: 'provider_unavailable',
      message: 'Provider is unavailable',
    });

    await expect(runAction()).rejects.toBe(error);
    await Sentry.flush(1000);

    expect(emit).toHaveBeenCalledWith(
      'processMetric',
      expect.objectContaining({
        name: 'warden.action.runs',
        value: 1,
        attributes: expect.objectContaining({
          'warden.action.outcome': 'failure',
          'warden.action.stage': 'dispatch',
          'warden.error.code': 'provider_unavailable',
        }),
      })
    );
    expect(capturedTransactions).toContainEqual(
      expect.objectContaining({
        transaction: 'run Warden action',
        contexts: expect.objectContaining({
          trace: expect.objectContaining({
            op: 'cicd.workflow',
            status: 'internal_error',
            data: expect.objectContaining({
              'warden.action.outcome': 'failure',
              'warden.action.stage': 'dispatch',
              'warden.error.code': 'provider_unavailable',
            }),
          }),
        }),
      })
    );
    expect(capturedEvents).toContainEqual(
      expect.objectContaining({
        tags: expect.objectContaining({
          'warden.error.code': 'provider_unavailable',
          'warden.action.stage': 'dispatch',
        }),
      })
    );
  });
});
