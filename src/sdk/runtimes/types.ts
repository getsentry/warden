/**
 * Runtime contract for model-backed agents.
 *
 * Warden's analysis pipeline builds prompts, handles retry policy, parses
 * findings, and aggregates report data. Runtime interfaces are backend
 * capabilities underneath that pipeline. Claude is the only runtime today and
 * exposes both agent execution and fast-model calls.
 *
 * Runtime implementations are responsible for backend-specific execution
 * details such as model identifiers, stream events, authentication side
 * channels, stderr/diagnostics, telemetry attributes, tool loops, and usage
 * normalization. Callers should be able to switch runtimes without changing
 * hunk parsing, auxiliary object generation, or report generation.
 */
import { z } from 'zod';
import type { UsageStats } from '../../types/index.js';

export const RuntimeNameSchema = z.enum(['claude']);
export type RuntimeName = z.infer<typeof RuntimeNameSchema>;

export type AgentRuntimeStatus =
  | 'success'
  | 'provider_error'
  | 'auth_error'
  | 'turn_limit'
  | 'budget_limit'
  | 'aborted'
  | 'structured_output_error';

export interface AgentRuntimeOptions {
  maxTurns?: number;
  model?: string;
  abortController?: AbortController;
}

export interface AgentRuntimeRequest<TProviderOptions = unknown> {
  systemPrompt: string;
  userPrompt: string;
  repoPath: string;
  skillName: string;
  options: AgentRuntimeOptions;
  /** Provider-specific settings consumed only by the selected runtime adapter. */
  providerOptions?: TProviderOptions;
}

export interface AgentRuntimeResult {
  status: AgentRuntimeStatus;
  text: string;
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
  result?: AgentRuntimeResult;
  /** Authentication error surfaced by the runtime, if available out-of-band. */
  authError?: string;
  /** Captured runtime stderr or diagnostics for clearer failures. */
  stderr?: string;
}

export interface AgentRuntime<TProviderOptions = unknown> {
  readonly name: string;
  execute(request: AgentRuntimeRequest<TProviderOptions>): Promise<AgentRuntimeExecutionResult>;
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

export interface RuntimeProvider {
  readonly name: RuntimeName;
  readonly agent?: AgentRuntime;
  readonly fastModel?: FastModelRuntime;
}

export type Runtime = RuntimeProvider;
