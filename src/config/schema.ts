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
});
export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;

// Path filter for triggers
export const PathFilterSchema = z.object({
  paths: z.array(z.string()).optional(),
  ignorePaths: z.array(z.string()).optional(),
});
export type PathFilter = z.infer<typeof PathFilterSchema>;

// Trigger definition
export const TriggerSchema = z.object({
  name: z.string().min(1),
  event: z.enum(['pull_request', 'issues', 'issue_comment']),
  actions: z.array(z.string()).min(1),
  skills: z.array(z.string()).min(1),
  filters: PathFilterSchema.optional(),
});
export type Trigger = z.infer<typeof TriggerSchema>;

// Main warden.yaml configuration
export const WardenConfigSchema = z.object({
  version: z.literal(1),
  triggers: z.array(TriggerSchema).min(1),
  skills: z.array(SkillDefinitionSchema).optional(),
});
export type WardenConfig = z.infer<typeof WardenConfigSchema>;
