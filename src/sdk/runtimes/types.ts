/**
 * Runtime contract for model-backed agents.
 *
 * Warden's analysis pipeline builds prompts, handles retry policy, parses
 * findings, and aggregates report data. Runtime interfaces are provider
 * capabilities underneath that pipeline. Providers such as Claude or Pi can
 * expose an agent runtime, a fast-model runtime, or both.
 *
 * Runtime implementations are responsible for provider-specific execution
 * details such as model identifiers, stream events, authentication side
 * channels, stderr/diagnostics, telemetry attributes, tool loops, and usage
 * normalization. Callers should be able to switch providers without changing
 * hunk parsing, auxiliary object generation, or report generation.
 */
import type { z } from 'zod';
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

export interface FastModelTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export type FastModelResult<T> =
  | { success: true; data: T; usage: UsageStats }
  | { success: false; error: string; usage: UsageStats };

export interface FastModelGenerateObjectRequest<T> {
  apiKey?: string;
  prompt: string;
  schema: z.ZodType<T>;
  model?: string;
  maxTokens?: number;
  timeout?: number;
  maxRetries?: number;
}

export interface FastModelGenerateObjectWithToolsRequest<T> extends FastModelGenerateObjectRequest<T> {
  tools: FastModelTool[];
  executeTool: (name: string, input: Record<string, unknown>) => Promise<string>;
  maxIterations?: number;
}

export interface FastModelRuntime {
  readonly name: string;
  generateObject<T>(request: FastModelGenerateObjectRequest<T>): Promise<FastModelResult<T>>;
  generateObjectWithTools<T>(request: FastModelGenerateObjectWithToolsRequest<T>): Promise<FastModelResult<T>>;
}
