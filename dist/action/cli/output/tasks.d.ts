/**
 * Task execution for skills.
 * Callback-based state updates for CLI and Ink rendering.
 */
import type { SkillReport, SeverityThreshold, Finding, UsageStats, EventContext } from '../../types/index.js';
import type { SkillDefinition } from '../../config/schema.js';
import { type SkillRunnerOptions } from '../../sdk/runner.js';
import { Verbosity } from './verbosity.js';
import type { OutputMode } from './tty.js';
/**
 * State of a file being processed by a skill.
 */
export interface FileState {
    filename: string;
    status: 'pending' | 'running' | 'done';
    currentHunk: number;
    totalHunks: number;
    findings: Finding[];
}
/**
 * State of a skill being executed.
 */
export interface SkillState {
    name: string;
    displayName: string;
    status: 'pending' | 'running' | 'done' | 'skipped' | 'error';
    startTime?: number;
    durationMs?: number;
    files: FileState[];
    findings: Finding[];
    usage?: UsageStats;
    error?: string;
}
/**
 * Result from running a skill task.
 */
export interface SkillTaskResult {
    name: string;
    report?: SkillReport;
    failOn?: SeverityThreshold;
    error?: unknown;
}
/**
 * Options for creating a skill task.
 */
export interface SkillTaskOptions {
    name: string;
    displayName?: string;
    failOn?: SeverityThreshold;
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
 * Callbacks for reporting skill execution progress to the UI.
 */
export interface SkillProgressCallbacks {
    onSkillStart: (skill: SkillState) => void;
    onSkillUpdate: (name: string, updates: Partial<SkillState>) => void;
    onFileUpdate: (skillName: string, filename: string, updates: Partial<FileState>) => void;
    onSkillComplete: (name: string, report: SkillReport) => void;
    onSkillSkipped: (name: string) => void;
    onSkillError: (name: string, error: string) => void;
    /** Called when a prompt exceeds the large prompt threshold */
    onLargePrompt?: (skillName: string, filename: string, lineRange: string, chars: number, estimatedTokens: number) => void;
    /** Called with prompt size info in debug mode */
    onPromptSize?: (skillName: string, filename: string, lineRange: string, systemChars: number, userChars: number, totalChars: number, estimatedTokens: number) => void;
}
/**
 * Run a single skill task.
 */
export declare function runSkillTask(options: SkillTaskOptions, fileConcurrency: number, callbacks: SkillProgressCallbacks): Promise<SkillTaskResult>;
/**
 * Run multiple skill tasks with optional concurrency.
 * Uses callbacks to report progress for Ink rendering.
 */
export declare function runSkillTasks(tasks: SkillTaskOptions[], options: RunTasksOptions, callbacks?: SkillProgressCallbacks): Promise<SkillTaskResult[]>;
//# sourceMappingURL=tasks.d.ts.map