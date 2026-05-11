import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sentryMocks = vi.hoisted(() => {
  const setAttributes = vi.fn();

  return {
    init: vi.fn(),
    setTag: vi.fn(),
    getGlobalScope: vi.fn(() => ({ setAttributes })),
    consoleLoggingIntegration: vi.fn(() => ({ name: 'console' })),
    anthropicAIIntegration: vi.fn(() => ({ name: 'anthropic' })),
    httpIntegration: vi.fn(() => ({ name: 'http' })),
    metrics: {
      count: vi.fn(),
      distribution: vi.fn(),
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fmt: (strings: TemplateStringsArray, ...values: unknown[]) =>
        strings.reduce((message, chunk, index) => `${message}${String(values[index - 1] ?? '')}${chunk}`),
    },
    getActiveSpan: vi.fn(),
    flush: vi.fn(async () => true),
    setAttributes,
  };
});

vi.mock('@sentry/node', () => sentryMocks);

async function loadInitializedSentry() {
  vi.resetModules();
  const sentry = await import('./sentry.js');
  sentry.initSentry('action');
  return sentry;
}

function clearTelemetryEnv(): void {
  delete process.env['WARDEN_SENTRY_DSN'];
  delete process.env['GITHUB_REPOSITORY'];
  delete process.env['GITHUB_RUN_ID'];
  delete process.env['GITHUB_SERVER_URL'];
  delete process.env['GITHUB_WORKFLOW'];
  delete process.env['GITHUB_JOB'];
}

describe('sentry telemetry scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTelemetryEnv();
    process.env['WARDEN_SENTRY_DSN'] = 'https://public@example.com/1';
  });

  afterEach(() => {
    clearTelemetryEnv();
  });

  it('uses the GitHub Actions server URL for repository and run URLs', async () => {
    process.env['GITHUB_SERVER_URL'] = 'https://github.enterprise.example/';
    process.env['GITHUB_REPOSITORY'] = 'acme/widget';
    process.env['GITHUB_RUN_ID'] = '12345';

    const sentry = await loadInitializedSentry();

    sentry.setRepositoryScope('acme/widget');
    sentry.setGitHubActionScope('pull_request');

    expect(sentryMocks.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'vcs.repository.url.full': 'https://github.enterprise.example/acme/widget',
      })
    );
    expect(sentryMocks.setAttributes).toHaveBeenCalledWith(
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

    const sentry = await loadInitializedSentry();

    sentry.setRepositoryScope('getsentry/warden');
    sentry.setGitHubActionScope('push');

    expect(sentryMocks.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'vcs.repository.url.full': 'https://github.com/getsentry/warden',
      })
    );
    expect(sentryMocks.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'cicd.pipeline.run.url.full': 'https://github.com/getsentry/warden/actions/runs/67890',
      })
    );
  });
});
