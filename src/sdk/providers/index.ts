import { claudeProvider } from './claude.js';
import type { AgentRuntime, FastModelRuntime } from '../runtimes/index.js';
import type { RuntimeProvider, RuntimeProviderName } from './types.js';

const PROVIDERS: Partial<Record<RuntimeProviderName, RuntimeProvider>> = {
  claude: claudeProvider,
};

export { claudeFastModelRuntime, claudeProvider } from './claude.js';
export { usesClaudeRuntime } from './types.js';
export type { RuntimeProvider, RuntimeProviderName, RuntimeProviderSelection } from './types.js';

export function getRuntimeProvider(name: RuntimeProviderName = 'claude'): RuntimeProvider {
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(`Unsupported runtime provider: ${name}`);
  }
  return provider;
}

export function getAgentRuntime(providerName: RuntimeProviderName = 'claude'): AgentRuntime {
  const provider = getRuntimeProvider(providerName);
  if (!provider.agent) {
    throw new Error(`Runtime provider ${providerName} does not support agent execution`);
  }
  return provider.agent;
}

export function getFastModelRuntime(providerName: RuntimeProviderName = 'claude'): FastModelRuntime {
  const provider = getRuntimeProvider(providerName);
  if (!provider.fastModel) {
    throw new Error(`Runtime provider ${providerName} does not support fast model calls`);
  }
  return provider.fastModel;
}
