import type { SkillReport, Severity, EventContext } from '../../types/index.js';
import type { SkillDefinition } from '../../config/schema.js';
import { type SkillRunnerOptions } from '../../sdk/runner.js';
import { Verbosity } from './verbosity.js';
import type { OutputMode } from './tty.js';
/**
 * Result from running a skill task.
 */
export interface SkillTaskResult {
    name: string;
    report?: SkillReport;
    failOn?: Severity;
    error?: unknown;
}
/**
 * Context passed to skill task functions.
 */
export interface SkillTaskContext {
    results: SkillTaskResult[];
}
/**
 * Options for creating a skill task.
 */
export interface SkillTaskOptions {
    name: string;
    displayName?: string;
    failOn?: Severity;
    /** Resolve the skill definition (may be async for loading) */
    resolveSkill: () => Promise<SkillDefinition>;
    /** The event context with files to analyze */
    context: EventContext;
    /** Options passed to the runner */
    runnerOptions?: SkillRunnerOptions;
}
/**
 * Options for running skill tasks.
 */
export interface RunTasksOptions {
    mode: OutputMode;
    verbosity: Verbosity;
    concurrency: number;
}
/**
 * Run multiple skill tasks with listr2.
 */
export declare function runSkillTasks(tasks: SkillTaskOptions[], options: RunTasksOptions): Promise<SkillTaskResult[]>;
//# sourceMappingURL=tasks.d.ts.map