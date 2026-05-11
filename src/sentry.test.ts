import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SkillReport } from './types/index.js';

const sentryMocks = vi.hoisted(() => ({
  init: vi.fn(),
  setTag: vi.fn(),
  setAttributes: vi.fn(),
  getActiveSpan: vi.fn(),
  flush: vi.fn(async () => true),
  metrics: {
    count: vi.fn(),
    distribution: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fmt: (strings: TemplateStringsArray, ...values: unknown[]) =>
      strings.reduce((message, chunk, index) => `${message}${chunk}${String(values[index] ?? '')}`, ''),
  },
}));

vi.mock('@sentry/node', () => ({
  init: sentryMocks.init,
  consoleLoggingIntegration: vi.fn(() => ({ name: 'console' })),
  anthropicAIIntegration: vi.fn(() => ({ name: 'anthropic' })),
  httpIntegration: vi.fn(() => ({ name: 'http' })),
  setTag: sentryMocks.setTag,
  getGlobalScope: vi.fn(() => ({ setAttributes: sentryMocks.setAttributes })),
  getActiveSpan: sentryMocks.getActiveSpan,
  flush: sentryMocks.flush,
  metrics: sentryMocks.metrics,
  logger: sentryMocks.logger,
}));

import {
  emitSkillMetrics,
  initSentry,
  setGitHubActionScope,
  setRepositoryScope,
} from './sentry.js';

describe('sentry telemetry helpers', () => {
  const originalEnv = { ...process.env };

  beforeAll(() => {
    process.env['WARDEN_SENTRY_DSN'] = 'https://public@example.com/1';
    initSentry('action');
  });

  beforeEach(() => {
    sentryMocks.setAttributes.mockClear();
    sentryMocks.metrics.count.mockClear();
    sentryMocks.metrics.distribution.mockClear();
    process.env['GITHUB_REPOSITORY'] = 'getsentry/warden';
    process.env['GITHUB_RUN_ID'] = '123456';
    process.env['GITHUB_SERVER_URL'] = 'https://github.com';
    process.env['GITHUB_WORKFLOW'] = 'Warden';
    process.env['GITHUB_JOB'] = 'review';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('sets repository scope with OTel VCS attributes', () => {
    setRepositoryScope('getsentry/warden');

    expect(sentryMocks.setAttributes).toHaveBeenCalledWith({
      'vcs.owner.name': 'getsentry',
      'vcs.repository.name': 'warden',
      'vcs.provider.name': 'github',
      'vcs.repository.url.full': 'https://github.com/getsentry/warden',
    });
    expect(sentryMocks.setAttributes.mock.calls[0]?.[0]).not.toHaveProperty('warden.repository');
  });

  it('sets GitHub Actions scope with OTel CI/CD attributes', () => {
    setGitHubActionScope('pull_request');

    expect(sentryMocks.setAttributes).toHaveBeenCalledWith({
      'github.event.name': 'pull_request',
      'cicd.pipeline.name': 'Warden',
      'cicd.pipeline.run.id': '123456',
      'cicd.pipeline.run.url.full': 'https://github.com/getsentry/warden/actions/runs/123456',
      'cicd.pipeline.task.name': 'review',
    });
  });

  it('emits skill metrics with the same semantic attributes as spans', () => {
    const report: SkillReport = {
      skill: 'security-review',
      summary: 'done',
      durationMs: 250,
      model: 'claude-sonnet-4',
      usage: { inputTokens: 120, outputTokens: 30, costUSD: 0.42 },
      findings: [
        { id: 'f1', severity: 'high', title: 'Unsafe input', description: 'Validate input' },
        { id: 'f2', severity: 'high', title: 'Unsafe output', description: 'Escape output' },
        { id: 'f3', severity: 'low', title: 'Minor issue', description: 'Tidy this up' },
      ],
    };

    emitSkillMetrics(report);

    const agentAttrs = {
      'gen_ai.agent.name': 'security-review',
      'gen_ai.request.model': 'claude-sonnet-4',
    };
    expect(sentryMocks.metrics.distribution).toHaveBeenCalledWith('warden.skill.duration', 250, {
      unit: 'millisecond',
      attributes: agentAttrs,
    });
    expect(sentryMocks.metrics.distribution).toHaveBeenCalledWith('gen_ai.client.token.usage', 120, {
      unit: '{token}',
      attributes: {
        ...agentAttrs,
        'gen_ai.operation.name': 'invoke_agent',
        'gen_ai.provider.name': 'anthropic',
        'gen_ai.token.type': 'input',
      },
    });
    expect(sentryMocks.metrics.distribution).toHaveBeenCalledWith('gen_ai.client.token.usage', 30, {
      unit: '{token}',
      attributes: {
        ...agentAttrs,
        'gen_ai.operation.name': 'invoke_agent',
        'gen_ai.provider.name': 'anthropic',
        'gen_ai.token.type': 'output',
      },
    });
    expect(sentryMocks.metrics.distribution).toHaveBeenCalledWith('warden.gen_ai.cost.usd', 0.42, {
      attributes: agentAttrs,
    });
    expect(sentryMocks.metrics.count).toHaveBeenCalledWith('warden.findings', 2, {
      attributes: { ...agentAttrs, 'warden.finding.severity': 'high' },
    });
    expect(sentryMocks.metrics.count).toHaveBeenCalledWith('warden.findings', 1, {
      attributes: { ...agentAttrs, 'warden.finding.severity': 'low' },
    });

    const metricNames = [
      ...sentryMocks.metrics.distribution.mock.calls.map(([name]) => name),
      ...sentryMocks.metrics.count.mock.calls.map(([name]) => name),
    ];
    expect(metricNames).not.toContain('tokens.input');
    expect(metricNames).not.toContain('tokens.output');
    expect(metricNames).not.toContain('cost.usd');
    expect(metricNames).not.toContain('findings.total');

    for (const call of [...sentryMocks.metrics.distribution.mock.calls, ...sentryMocks.metrics.count.mock.calls]) {
      const options = call[2] as { attributes?: Record<string, unknown> } | undefined;
      expect(options?.attributes).not.toHaveProperty('skill');
      expect(options?.attributes).not.toHaveProperty('model');
      expect(options?.attributes).not.toHaveProperty('severity');
    }
  });
});
