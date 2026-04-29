/**
 * Provider registry contract.
 *
 * A provider is a family of runtime capabilities backed by one model system.
 * Claude and Pi are providers. Each provider can expose the main repo-aware
 * agent runtime, the fast object-generation runtime used by auxiliary calls,
 * or both.
 */
import type { AgentRuntime, FastModelRuntime } from '../runtimes/index.js';

export type RuntimeProviderName = 'claude' | 'pi';

export interface RuntimeProviderSelection {
  readonly agentProvider?: RuntimeProviderName;
  readonly fastModelProvider?: RuntimeProviderName;
}

export interface RuntimeProvider {
  readonly name: RuntimeProviderName;
  readonly agent?: AgentRuntime;
  readonly fastModel?: FastModelRuntime;
}

export function usesClaudeRuntime(selection: RuntimeProviderSelection): boolean {
  return selection.agentProvider === 'claude' || selection.fastModelProvider === 'claude';
}
