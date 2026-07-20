import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  emitActionRunMetric,
  emitFixEvalVerdictMetric,
  emitSkillMetrics,
  initSentry,
  setGitHubActionScope,
  setRepositoryScope,
  Sentry,
} from './sentry.js';

function clearTelemetryEnv(): void {
  delete process.env['WARDEN_SENTRY_DSN'];
  delete process.env['GITHUB_REPOSITORY'];
  delete process.env['GITHUB_RUN_ID'];
  delete process.env['GITHUB_SERVER_URL'];
  delete process.env['GITHUB_WORKFLOW'];
  delete process.env['GITHUB_JOB'];
  delete process.env['GITHUB_RUN_ATTEMPT'];
  delete process.env['GITHUB_REF'];
  delete process.env['GITHUB_SHA'];
}

function spyOnClientEmit() {
  const client = Sentry.getClient();
  if (!client) throw new Error('Sentry test client was not initialized');
  return vi.spyOn(client, 'emit');
}

describe('sentry telemetry scope', () => {
  beforeAll(() => {
    process.env['WARDEN_SENTRY_DSN'] = 'https://public@example.com/1';
    initSentry('action', {
      transport: () => ({
        send: async () => ({}),
        flush: async () => true,
      }),
    });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    clearTelemetryEnv();
    process.env['WARDEN_SENTRY_DSN'] = 'https://public@example.com/1';
    Sentry.getGlobalScope().clear();
    Sentry.getIsolationScope().clear();
  });

  afterEach(() => {
    clearTelemetryEnv();
  });

  afterAll(async () => {
    await Sentry.close(0);
  });

  it('uses the GitHub Actions server URL for repository and run URLs', async () => {
    process.env['GITHUB_SERVER_URL'] = 'https://github.enterprise.example/';
    process.env['GITHUB_REPOSITORY'] = 'acme/widget';
    process.env['GITHUB_RUN_ID'] = '12345';
    process.env['GITHUB_RUN_ATTEMPT'] = '2';
    process.env['GITHUB_REF'] = 'refs/pull/42/merge';
    process.env['GITHUB_SHA'] = 'abc123';
    process.env['GITHUB_WORKFLOW'] = 'Warden';
    process.env['GITHUB_JOB'] = 'review';

    const setAttributes = vi.spyOn(Sentry.getGlobalScope(), 'setAttributes');
    const isolationScope = Sentry.getIsolationScope();
    const setTag = vi.spyOn(isolationScope, 'setTag');
    const setContext = vi.spyOn(isolationScope, 'setContext');

    const actionAttributes = setGitHubActionScope('pull_request');

    expect(setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'vcs.repository.url.full': 'https://github.enterprise.example/acme/widget',
      })
    );
    expect(actionAttributes).toEqual(expect.objectContaining({
      'vcs.owner.name': 'acme',
      'vcs.repository.name': 'widget',
      'github.event.name': 'pull_request',
      'cicd.pipeline.run.id': '12345',
    }));
    expect(setTag).toHaveBeenCalledWith('repository', 'acme/widget');
    expect(setTag).toHaveBeenCalledWith('cicd.pipeline.run.id', '12345');
    expect(setContext).toHaveBeenCalledWith('github_actions', {
      repository: 'acme/widget',
      event: 'pull_request',
      workflow: 'Warden',
      job: 'review',
      run_id: '12345',
      run_attempt: '2',
      run_url: 'https://github.enterprise.example/acme/widget/actions/runs/12345',
      ref: 'refs/pull/42/merge',
      sha: 'abc123',
    });
    expect(setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'github.event.name': 'pull_request',
        'cicd.pipeline.run.url.full':
          'https://github.enterprise.example/acme/widget/actions/runs/12345',
      })
    );
  });

  it('defaults repository and run URLs to github.com', async () => {
    process.env['GITHUB_REPOSITORY'] = 'getsentry/warden';
    process.env['GITHUB_RUN_ID'] = '67890';

    const setAttributes = vi.spyOn(Sentry.getGlobalScope(), 'setAttributes');

    setRepositoryScope('getsentry/warden');
    setGitHubActionScope('push');

    expect(setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'vcs.repository.url.full': 'https://github.com/getsentry/warden',
      })
    );
    expect(setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'cicd.pipeline.run.url.full': 'https://github.com/getsentry/warden/actions/runs/67890',
      })
    );
  });

  it('emits fix evaluation verdict metrics with fallback attribution', async () => {
    const emit = spyOnClientEmit();

    emitFixEvalVerdictMetric('eval_error', 'security-review', { usedFallback: true });

    expect(emit).toHaveBeenCalledWith(
      'processMetric',
      expect.objectContaining({
        name: 'warden.fix_eval.verdict',
        type: 'counter',
        value: 1,
        attributes: expect.objectContaining({
          'warden.fix_eval.verdict': 'eval_error',
          'warden.fix_eval.used_fallback': true,
          'gen_ai.agent.name': 'security-review',
        }),
      })
    );
  });

  it('emits action failures with startup stage and stable error code', async () => {
    const emit = spyOnClientEmit();

    emitActionRunMetric('failure', 'input', 'auth_failed');

    expect(emit).toHaveBeenCalledWith(
      'processMetric',
      expect.objectContaining({
        name: 'warden.action.runs',
        type: 'counter',
        value: 1,
        attributes: expect.objectContaining({
          'warden.action.outcome': 'failure',
          'warden.action.stage': 'input',
          'warden.error.code': 'auth_failed',
        }),
      })
    );
  });

  it('emits GenAI token metrics with runtime-derived provider attribution', async () => {
    const emit = spyOnClientEmit();

    emitSkillMetrics({
      skill: 'security-review',
      summary: 'No findings',
      findings: [],
      runtime: 'pi',
      model: 'xai/grok-test',
      durationMs: 1200,
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheCreation5mInputTokens: 0,
        cacheCreation1hInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0,
      },
    });

    expect(emit).toHaveBeenCalledWith(
      'processMetric',
      expect.objectContaining({
        name: 'gen_ai.client.token.usage',
        type: 'distribution',
        value: 10,
        unit: '{token}',
        attributes: expect.objectContaining({
          'gen_ai.operation.name': 'invoke_agent',
          'gen_ai.provider.name': 'x_ai',
          'gen_ai.request.model': 'xai/grok-test',
          'gen_ai.token.type': 'input',
          'warden.runtime.name': 'pi',
        }),
      })
    );
  });

  it('emits Warden token and cost components for cached-token accounting', async () => {
    const emit = spyOnClientEmit();

    emitSkillMetrics({
      skill: 'security-review',
      summary: 'No findings',
      findings: [],
      runtime: 'claude',
      model: 'claude-haiku-4-5',
      durationMs: 1200,
      usage: {
        inputTokens: 1500,
        outputTokens: 500,
        cacheReadInputTokens: 200,
        cacheCreationInputTokens: 300,
        cacheCreation5mInputTokens: 100,
        cacheCreation1hInputTokens: 200,
        webSearchRequests: 2,
        costUSD: 0.024045,
      },
    });

    expect(emit).toHaveBeenCalledWith(
      'processMetric',
      expect.objectContaining({
        name: 'gen_ai.client.token.usage',
        value: 1500,
        unit: '{token}',
        attributes: expect.objectContaining({ 'gen_ai.token.type': 'input' }),
      })
    );
    expect(emit).toHaveBeenCalledWith(
      'processMetric',
      expect.objectContaining({
        name: 'warden.gen_ai.token.usage',
        type: 'distribution',
        value: 1000,
        unit: '{token}',
        attributes: expect.objectContaining({
          'warden.gen_ai.token.category': 'standard_input',
        }),
      })
    );
    expect(emit).toHaveBeenCalledWith(
      'processMetric',
      expect.objectContaining({
        name: 'warden.gen_ai.token.usage',
        type: 'distribution',
        value: 200,
        unit: '{token}',
        attributes: expect.objectContaining({
          'warden.gen_ai.token.category': 'cache_read_input',
        }),
      })
    );
    expect(emit).toHaveBeenCalledWith(
      'processMetric',
      expect.objectContaining({
        name: 'warden.gen_ai.token.usage',
        type: 'distribution',
        value: 100,
        unit: '{token}',
        attributes: expect.objectContaining({
          'warden.gen_ai.token.category': 'cache_creation_5m_input',
        }),
      })
    );
    expect(emit).toHaveBeenCalledWith(
      'processMetric',
      expect.objectContaining({
        name: 'warden.gen_ai.token.usage',
        type: 'distribution',
        value: 200,
        unit: '{token}',
        attributes: expect.objectContaining({
          'warden.gen_ai.token.category': 'cache_creation_1h_input',
        }),
      })
    );
    expect(emit).toHaveBeenCalledWith(
      'processMetric',
      expect.objectContaining({
        name: 'warden.gen_ai.cost.component.usd',
        value: 0.00002,
        attributes: expect.objectContaining({
          'warden.gen_ai.cost.component': 'cache_read_input',
        }),
      })
    );
    expect(emit).toHaveBeenCalledWith(
      'processMetric',
      expect.objectContaining({
        name: 'warden.gen_ai.cost.component.usd',
        value: expect.closeTo(0.000125, 10),
        attributes: expect.objectContaining({
          'warden.gen_ai.cost.component': 'cache_creation_5m_input',
        }),
      })
    );
    expect(emit).toHaveBeenCalledWith(
      'processMetric',
      expect.objectContaining({
        name: 'warden.gen_ai.cost.component.usd',
        value: 0.0004,
        attributes: expect.objectContaining({
          'warden.gen_ai.cost.component': 'cache_creation_1h_input',
        }),
      })
    );
    expect(emit).toHaveBeenCalledWith(
      'processMetric',
      expect.objectContaining({
        name: 'warden.gen_ai.cost.component.usd',
        value: 0.02,
        attributes: expect.objectContaining({
          'warden.gen_ai.cost.component': 'web_search',
        }),
      })
    );
  });
});
