import { claudeRuntime } from './claude.js';
import type { Runtime, RuntimeName } from './types.js';

const RUNTIMES: Partial<Record<RuntimeName, Runtime>> = {
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
} from './types.js';

export function getRuntime(name: RuntimeName = 'claude'): Runtime {
  const runtime = RUNTIMES[name];
  if (!runtime) {
    throw new Error(`Unsupported runtime: ${name}`);
  }
  return runtime;
}
