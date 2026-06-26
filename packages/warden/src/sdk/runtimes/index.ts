import { claudeRuntime } from './claude.js';
import { piRuntime } from './pi.js';
import type { Runtime, RuntimeName } from './types.js';
import { buildPiProviderOptions } from './custom-provider.js';
import type { ProvidersConfig } from '../../config/schema.js';

const RUNTIMES: Partial<Record<RuntimeName, Runtime>> = {
  claude: claudeRuntime,
  pi: piRuntime,
};

export { claudeRuntime } from './claude.js';
export { piRuntime } from './pi.js';
export type {
  AuxiliaryRunRequest,
  AuxiliaryRunResult,
  AuxiliaryTask,
  AuxiliaryTool,
  Runtime,
  RuntimeName,
  SynthesisRunRequest,
  SynthesisTask,
  SkillRunOptions,
  SkillRunRequest,
  SkillRunResponse,
  SkillRunResult,
  SkillRunStatus,
} from './types.js';

/** Return the runtime adapter for model-backed execution. */
export function getRuntime(name: RuntimeName = 'pi'): Runtime {
  const runtime = RUNTIMES[name];
  if (!runtime) {
    throw new Error(`Unsupported runtime: ${name}`);
  }
  return runtime;
}

export interface RuntimeProviderOptionsInput {
  pathToClaudeCodeExecutable?: string;
  providers?: ProvidersConfig;
}

/**
 * Build provider-specific runtime options at the runtime boundary.
 */
export function getRuntimeProviderOptions(
  name: RuntimeName,
  options: RuntimeProviderOptionsInput
): unknown {
  if (name === 'claude') {
    return { pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable };
  }

  if (name === 'pi') {
    // Resolve provider API keys from the live process env at the runtime
    // boundary. Preflight (verifyCustomProviderAuthForRun) resolves against the
    // same env, so both phases agree as long as env is not mutated mid-run.
    return buildPiProviderOptions(options.providers, process.env);
  }

  return undefined;
}
