import { z } from 'zod';

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
  failOn: z.enum(['critical', 'high', 'medium', 'low', 'info']).optional(),
  maxFindings: z.number().int().positive().optional(),
  labels: z.array(z.string()).optional(),
});
export type OutputConfig = z.infer<typeof OutputConfigSchema>;

// Trigger definition
export const TriggerSchema = z.object({
  name: z.string().min(1),
  event: z.enum(['pull_request', 'issues', 'issue_comment']),
  actions: z.array(z.string()).min(1),
  skill: z.string().min(1),
  filters: PathFilterSchema.optional(),
  output: OutputConfigSchema.optional(),
  /** Model to use for this trigger (e.g., 'claude-sonnet-4-20250514'). Uses SDK default if not specified. */
  model: z.string().optional(),
});
export type Trigger = z.infer<typeof TriggerSchema>;

// Runner configuration
export const RunnerConfigSchema = z.object({
  /** Max concurrent trigger executions (default: 4) */
  concurrency: z.number().int().positive().optional(),
});
export type RunnerConfig = z.infer<typeof RunnerConfigSchema>;

// Default configuration that triggers inherit from
export const DefaultsSchema = z.object({
  filters: PathFilterSchema.optional(),
  output: OutputConfigSchema.optional(),
  /** Default model for all triggers (e.g., 'claude-sonnet-4-20250514') */
  model: z.string().optional(),
});
export type Defaults = z.infer<typeof DefaultsSchema>;

// Main warden.toml configuration
export const WardenConfigSchema = z.object({
  version: z.literal(1),
  defaults: DefaultsSchema.optional(),
  triggers: z.array(TriggerSchema).min(1),
  skills: z.array(SkillDefinitionSchema).optional(),
  runner: RunnerConfigSchema.optional(),
});
export type WardenConfig = z.infer<typeof WardenConfigSchema>;
