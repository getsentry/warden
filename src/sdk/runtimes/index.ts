import { claudeAgentRuntime } from './claude.js';
import type { AgentRuntime } from './types.js';

export { claudeAgentRuntime } from './claude.js';
export type {
  AgentRuntime,
  AgentRuntimeExecutionResult,
  AgentRuntimeMessage,
  AgentRuntimeMessageSubtype,
  AgentRuntimeOptions,
  AgentRuntimeRequest,
} from './types.js';

export function getAgentRuntime(): AgentRuntime {
  return claudeAgentRuntime;
}
