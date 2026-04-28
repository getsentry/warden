import type { UsageStats } from '../../types/index.js';
import type { SkillRunnerOptions } from '../types.js';

export interface AgentRuntimeRequest {
  systemPrompt: string;
  userPrompt: string;
  repoPath: string;
  skillName: string;
  options: SkillRunnerOptions;
}

export interface AgentRuntimeMessage {
  subtype: string;
  isError: boolean;
  result?: string;
  errors: string[];
  usage: UsageStats;
  responseId?: string;
  responseModel?: string;
  sessionId?: string;
  durationMs?: number;
  durationApiMs?: number;
  numTurns?: number;
}

export interface AgentRuntimeExecutionResult {
  result?: AgentRuntimeMessage;
  /** Authentication error surfaced by the runtime, if available out-of-band. */
  authError?: string;
  /** Captured runtime stderr or diagnostics for clearer failures. */
  stderr?: string;
}

export interface AgentRuntime {
  readonly name: string;
  execute(request: AgentRuntimeRequest): Promise<AgentRuntimeExecutionResult>;
}
