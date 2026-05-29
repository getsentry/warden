/**
 * Runtime contract for model-backed providers.
 *
 * Warden's analysis pipeline builds prompts, handles retry policy, parses
 * findings, and aggregates report data. Runtime interfaces are backend
 * capabilities underneath that pipeline. Runtimes expose skill execution,
 * auxiliary model tasks, and synthesis tasks.
 *
 * Runtime implementations are responsible for backend-specific execution
 * details such as model identifiers, stream events, authentication side
 * channels, stderr/diagnostics, telemetry attributes, tool loops, and usage
 * normalization. Callers should be able to switch runtimes without changing
 * hunk parsing, extraction repair, deduplication, fix gates, or reporting.
 */
import { z } from 'zod';
import type { ReasoningEffort, ToolConfig } from '../../config/schema.js';
import type { UsageStats } from '../../types/index.js';

export const RuntimeNameSchema = z.enum(['claude', 'pi']);
export type RuntimeName = z.infer<typeof RuntimeNameSchema>;

export type SkillRunStatus =
  | 'success'
  | 'provider_error'
  | 'auth_error'
  | 'turn_limit'
  | 'budget_limit'
  | 'aborted'
  | 'structured_output_error';

export interface SkillRunOptions {
  maxTurns?: number;
  model?: string;
  reasoningEffort?: ReasoningEffort;
  abortController?: AbortController;
}

export interface SkillRunRequest {
  /** Optional legacy Anthropic API key, used only when a runtime targets Anthropic-compatible models. */
  apiKey?: string;
  systemPrompt: string;
  userPrompt: string;
  repoPath: string;
  skillName: string;
  options: SkillRunOptions;
  tools?: ToolConfig;
  /**
   * Allow explicitly requested mutating tools for trusted internal writer tasks.
   * Normal skill analysis keeps this false so hunks remain read-only.
   */
  allowMutatingTools?: boolean;
  /** Provider-specific settings consumed only by the selected runtime adapter. */
  providerOptions?: unknown;
}

export interface SkillRunResult {
  status: SkillRunStatus;
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

export interface SkillRunResponse {
  result?: SkillRunResult;
  /** Authentication error surfaced by the runtime, if available out-of-band. */
  authError?: string;
  /** Captured runtime stderr or diagnostics for clearer failures. */
  stderr?: string;
}

export interface AuxiliaryTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export type AuxiliaryTask =
  | 'extraction'
  | 'deduplication'
  | 'fix_quality'
  | 'fix_evaluation';

export type SynthesisTask =
  | 'consolidation'
  | 'skill_build';

export type AuxiliaryRunResult<T> =
  | { success: true; data: T; usage: UsageStats }
  | { success: false; error: string; usage: UsageStats };

interface AuxiliaryRunRequestBase<T> {
  task: AuxiliaryTask;
  /** Skill or agent name that owns this auxiliary call, when available. */
  agentName?: string;
  apiKey?: string;
  prompt: string;
  schema: z.ZodType<T>;
  model?: string;
  maxTokens?: number;
  timeout?: number;
  maxRetries?: number;
}

interface AuxiliaryRunRequestWithoutTools<T> extends AuxiliaryRunRequestBase<T> {
  tools?: undefined;
  executeTool?: undefined;
  maxIterations?: undefined;
}

interface AuxiliaryRunRequestWithTools<T> extends AuxiliaryRunRequestBase<T> {
  tools: AuxiliaryTool[];
  executeTool: (name: string, input: Record<string, unknown>) => Promise<string>;
  maxIterations?: number;
}

export type AuxiliaryRunRequest<T> = AuxiliaryRunRequestWithoutTools<T> | AuxiliaryRunRequestWithTools<T>;

export interface SynthesisRunRequest<T> {
  task: SynthesisTask;
  /** Skill or agent name that owns this synthesis call, when available. */
  agentName?: string;
  apiKey?: string;
  prompt: string;
  schema: z.ZodType<T>;
  model?: string;
  maxTokens?: number;
  timeout?: number;
  maxRetries?: number;
}

export interface Runtime {
  readonly name: RuntimeName;
  runSkill(request: SkillRunRequest): Promise<SkillRunResponse>;
  runAuxiliary<T>(request: AuxiliaryRunRequest<T>): Promise<AuxiliaryRunResult<T>>;
  runSynthesis<T>(request: SynthesisRunRequest<T>): Promise<AuxiliaryRunResult<T>>;
}
