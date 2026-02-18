import type { Octokit } from '@octokit/rest';
import type { NotificationConfig } from '../config/schema.js';
import type { NotificationProvider } from './types.js';
import { GitHubIssuesProvider } from './providers/github-issues.js';
import { SlackProvider } from './providers/slack.js';

export { NotificationDispatcher } from './dispatcher.js';
export type { DispatchContext, DispatchResult } from './dispatcher.js';
export type { NotificationProvider, NotificationContext, NotificationResult } from './types.js';

/**
 * Expand environment variable references in a string.
 * Replaces `$VAR_NAME` with the value of the environment variable.
 */
function expandEnvVars(value: string): string {
  return value.replace(/\$([A-Z_][A-Z0-9_]*)/g, (_, name) => {
    return process.env[name] ?? '';
  });
}

export interface BuildProvidersOptions {
  configs: NotificationConfig[];
  octokit: Octokit;
  apiKey: string;
}

/**
 * Build notification provider instances from configuration.
 * Environment variable references in config values are expanded.
 */
export function buildProviders(options: BuildProvidersOptions): NotificationProvider[] {
  const { configs, octokit, apiKey } = options;
  const providers: NotificationProvider[] = [];

  for (const config of configs) {
    switch (config.type) {
      case 'github-issues':
        providers.push(new GitHubIssuesProvider({ config, octokit, apiKey }));
        break;
      case 'slack':
        providers.push(new SlackProvider({
          ...config,
          webhookUrl: expandEnvVars(config.webhookUrl),
        }));
        break;
    }
  }

  return providers;
}
