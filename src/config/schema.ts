import { z } from 'zod';
import { SeverityThresholdSchema } from '../types/index.js';

// Tool names that can be allowed/denied
export const ToolNameSchema = z.enum([
  'Read',
  'Write',
  'Edit',
  'Bash',
  'Glob',
  'Grep',
  'WebFetch',
  'WebSearch',
]);
export type ToolName = z.infer<typeof ToolNameSchema>;

// Tool configuration for skills
export const ToolConfigSchema = z.object({
  allowed: z.array(ToolNameSchema).optional(),
  denied: z.array(ToolNameSchema).optional(),
});
export type ToolConfig = z.infer<typeof ToolConfigSchema>;

// Skill definition
export const SkillDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  prompt: z.string(),
  tools: ToolConfigSchema.optional(),
  outputSchema: z.string().optional(),
  /** Directory where the skill was loaded from, for resolving resources (scripts/, references/, assets/) */
  rootDir: z.string().optional(),
});
export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;

// Path filter for triggers
export const PathFilterSchema = z.object({
  paths: z.array(z.string()).optional(),
  ignorePaths: z.array(z.string()).optional(),
});
export type PathFilter = z.infer<typeof PathFilterSchema>;

// Output configuration per trigger
export const OutputConfigSchema = z.object({
  failOn: SeverityThresholdSchema.optional(),
  commentOn: SeverityThresholdSchema.optional(),
  maxFindings: z.number().int().positive().optional(),
  /** Post a PR comment even when there are no findings (default: false) */
  commentOnSuccess: z.boolean().optional(),
});
export type OutputConfig = z.infer<typeof OutputConfigSchema>;

// Schedule-specific configuration
export const ScheduleConfigSchema = z.object({
  /** Title for the tracking issue (default: "Warden: {triggerName}") */
  issueTitle: z.string().optional(),
  /** Create PR with fixes when suggestedFix is available */
  createFixPR: z.boolean().default(false),
  /** Branch prefix for fix PRs (default: "warden-fix") */
  fixBranchPrefix: z.string().default('warden-fix'),
});
export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;

// Trigger definition
export const TriggerSchema = z.object({
  name: z.string().min(1),
  event: z.enum(['pull_request', 'issues', 'issue_comment', 'schedule']),
  /** Actions to trigger on. Required for all events except 'schedule'. */
  actions: z.array(z.string()).min(1).optional(),
  skill: z.string().min(1),
  /** Remote repository reference for the skill (e.g., "owner/repo" or "owner/repo@sha") */
  remote: z.string().optional(),
  filters: PathFilterSchema.optional(),
  output: OutputConfigSchema.optional(),
  /** Model to use for this trigger (e.g., 'claude-sonnet-4-20250514'). Uses SDK default if not specified. */
  model: z.string().optional(),
  /** Maximum agentic turns (API round-trips) per hunk analysis. Overrides defaults.maxTurns. */
  maxTurns: z.number().int().positive().optional(),
  /** Schedule-specific configuration. Only used when event is 'schedule'. */
  schedule: ScheduleConfigSchema.optional(),
}).refine(
  (data) => {
    // actions is required unless event is 'schedule'
    if (data.event !== 'schedule') {
      return data.actions !== undefined && data.actions.length > 0;
    }
    return true;
  },
  {
    message: "actions is required for non-schedule events",
    path: ["actions"],
  }
).refine(
  (data) => {
    // paths filter is required for schedule events
    if (data.event === 'schedule') {
      return data.filters?.paths !== undefined && data.filters.paths.length > 0;
    }
    return true;
  },
  {
    message: "filters.paths is required for schedule events",
    path: ["filters", "paths"],
  }
);
export type Trigger = z.infer<typeof TriggerSchema>;

// Runner configuration
export const RunnerConfigSchema = z.object({
  /** Max concurrent trigger executions (default: 4) */
  concurrency: z.number().int().positive().optional(),
});
export type RunnerConfig = z.infer<typeof RunnerConfigSchema>;

// File pattern for chunking configuration
export const FilePatternSchema = z.object({
  /** Glob pattern to match files (e.g., "**\/pnpm-lock.yaml") */
  pattern: z.string(),
  /** How to handle matching files: 'per-hunk' (default), 'whole-file', or 'skip' */
  mode: z.enum(['per-hunk', 'whole-file', 'skip']).default('skip'),
});
export type FilePattern = z.infer<typeof FilePatternSchema>;

// Coalescing configuration for merging nearby hunks
export const CoalesceConfigSchema = z.object({
  /** Enable hunk coalescing (default: true) */
  enabled: z.boolean().default(true),
  /** Max lines gap between hunks to merge (default: 30) */
  maxGapLines: z.number().int().nonnegative().default(30),
  /** Target max size per chunk in characters (default: 8000) */
  maxChunkSize: z.number().int().positive().default(8000),
});
export type CoalesceConfig = z.infer<typeof CoalesceConfigSchema>;

// Chunking configuration for controlling how files are processed
export const ChunkingConfigSchema = z.object({
  /** Patterns to control file processing mode */
  filePatterns: z.array(FilePatternSchema).optional(),
  /** Coalescing options for merging nearby hunks */
  coalesce: CoalesceConfigSchema.optional(),
});
export type ChunkingConfig = z.infer<typeof ChunkingConfigSchema>;

// Default configuration that triggers inherit from
export const DefaultsSchema = z.object({
  filters: PathFilterSchema.optional(),
  output: OutputConfigSchema.optional(),
  /** Default model for all triggers (e.g., 'claude-sonnet-4-20250514') */
  model: z.string().optional(),
  /** Maximum agentic turns (API round-trips) per hunk analysis. Default: 50 */
  maxTurns: z.number().int().positive().optional(),
  /** Default branch for the repository (e.g., 'main', 'master', 'develop'). Auto-detected if not specified. */
  defaultBranch: z.string().optional(),
  /** Chunking configuration for controlling how files are processed */
  chunking: ChunkingConfigSchema.optional(),
  /** Delay in milliseconds between batch starts when processing files in parallel. Default: 0 */
  batchDelayMs: z.number().int().nonnegative().optional(),
});
export type Defaults = z.infer<typeof DefaultsSchema>;

// Main warden.toml configuration
export const WardenConfigSchema = z.object({
  version: z.literal(1),
  defaults: DefaultsSchema.optional(),
  triggers: z.array(TriggerSchema).default([]),
  runner: RunnerConfigSchema.optional(),
});
export type WardenConfig = z.infer<typeof WardenConfigSchema>;
