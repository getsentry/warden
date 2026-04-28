import type { UsageStats } from '../../types/index.js';

export type AgentRuntimeMessageSubtype =
  | 'success'
  | 'error_during_execution'
  | 'error_max_turns'
  | 'error_max_budget_usd'
  | 'error_max_structured_output_retries';

export interface AgentRuntimeOptions {
  maxTurns?: number;
  model?: string;
  abortController?: AbortController;
}

export interface AgentRuntimeRequest {
  systemPrompt: string;
  userPrompt: string;
  repoPath: string;
  skillName: string;
  options: AgentRuntimeOptions;
}

export interface AgentRuntimeMessage {
  subtype: AgentRuntimeMessageSubtype;
  isError: boolean;
  result: string;
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
