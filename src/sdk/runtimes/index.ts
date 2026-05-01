import { claudeRuntime } from './claude.js';
import type { Runtime, RuntimeName } from './types.js';

const RUNTIMES: Partial<Record<RuntimeName, Runtime>> = {
  claude: claudeRuntime,
};

export { claudeRuntime } from './claude.js';
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

export function getRuntime(name: RuntimeName = 'claude'): Runtime {
  const runtime = RUNTIMES[name];
  if (!runtime) {
    throw new Error(`Unsupported runtime: ${name}`);
  }
  return runtime;
}
