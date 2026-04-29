import { claudeRuntime } from './claude.js';
import type { AgentRuntime, FastModelRuntime, RuntimeName, RuntimeProvider } from './types.js';

const RUNTIME_PROVIDERS: Partial<Record<RuntimeName, RuntimeProvider>> = {
  claude: claudeRuntime,
};

export { claudeAgentRuntime, claudeFastModelRuntime, claudeRuntime } from './claude.js';
export type {
  AgentRuntime,
  AgentRuntimeExecutionResult,
  AgentRuntimeOptions,
  AgentRuntimeRequest,
  AgentRuntimeResult,
  AgentRuntimeStatus,
  FastModelGenerateObjectRequest,
  FastModelGenerateObjectWithToolsRequest,
  FastModelResult,
  FastModelRuntime,
  FastModelTool,
  Runtime,
  RuntimeName,
  RuntimeProvider,
} from './types.js';

export function getRuntimeProvider(name: RuntimeName = 'claude'): RuntimeProvider {
  const provider = RUNTIME_PROVIDERS[name];
  if (!provider) {
    throw new Error(`Unsupported runtime: ${name}`);
  }
  return provider;
}

export function getRuntime(name: RuntimeName = 'claude'): RuntimeProvider {
  return getRuntimeProvider(name);
}

export function getAgentRuntime(runtimeName: RuntimeName = 'claude'): AgentRuntime {
  const provider = getRuntimeProvider(runtimeName);
  if (!provider.agent) {
    throw new Error(`Runtime ${runtimeName} does not support agent execution`);
  }
  return provider.agent;
}

export function getFastModelRuntime(runtimeName: RuntimeName = 'claude'): FastModelRuntime {
  const provider = getRuntimeProvider(runtimeName);
  if (!provider.fastModel) {
    throw new Error(`Runtime ${runtimeName} does not support fast-model calls`);
  }
  return provider.fastModel;
}
