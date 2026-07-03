import { z } from 'zod';
import { RuntimeNameSchema, type RuntimeName } from '../sdk/runtimes/types.js';
import { SeverityThresholdSchema, ConfidenceThresholdSchema } from '../types/index.js';

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
  /** Directory where the skill was loaded from, for resolving resources (scripts/, references/, assets/) */
  rootDir: z.string().optional(),
});
export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;

// Schedule-specific configuration
export const ScheduleConfigSchema = z.object({
  /** Title for the tracking issue (default: "Warden: {skillName}") */
  issueTitle: z.string().optional(),
});
export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;

// Trigger type: where the trigger runs
export const TriggerTypeSchema = z.enum(['pull_request', 'local', 'schedule']);
export type TriggerType = z.infer<typeof TriggerTypeSchema>;

export { RuntimeNameSchema };
export type { RuntimeName };

export const EffortSchema = z.enum(['off', 'low', 'medium', 'high', 'xhigh']);
export type Effort = z.infer<typeof EffortSchema>;

export const AgentRuntimeConfigSchema = z.object({
  /** Model for repo-aware skill execution. Overrides legacy defaults.model. */
  model: z.string().optional(),
  /** Maximum agentic turns for repo-aware skill execution. Overrides legacy defaults.maxTurns. */
  maxTurns: z.number().int().positive().optional(),
  /** Effort level to use for repo-aware skill execution. Uses runtime default when omitted. */
  effort: EffortSchema.optional(),
}).strict();
export type AgentRuntimeConfig = z.infer<typeof AgentRuntimeConfigSchema>;

export const AuxiliaryRuntimeConfigSchema = z.object({
  /** Model for auxiliary structured model calls. Uses runtime default if omitted. */
  model: z.string().optional(),
  /** Max retries for auxiliary structured model calls. Overrides legacy auxiliaryMaxRetries. */
  maxRetries: z.number().int().positive().optional(),
}).strict();
export type AuxiliaryRuntimeConfig = z.infer<typeof AuxiliaryRuntimeConfigSchema>;

export const SynthesisRuntimeConfigSchema = z.object({
  /** Model for post-analysis synthesis/consolidation. Falls back to auxiliary.model if omitted. */
  model: z.string().optional(),
}).strict();
export type SynthesisRuntimeConfig = z.infer<typeof SynthesisRuntimeConfigSchema>;

export const VerificationConfigSchema = z.object({
  /** Verify candidate findings in a second read-only pass. Defaults to true. */
  enabled: z.boolean().optional(),
}).strict();
export type VerificationConfig = z.infer<typeof VerificationConfigSchema>;

// Skill trigger definition (nested under [[skills.triggers]])
export const SkillTriggerSchema = z.object({
  /** Trigger type: pull_request (GitHub), local (CLI), or schedule (cron) */
  type: TriggerTypeSchema,
  /** Actions to trigger on (only for pull_request type) */
  actions: z.array(z.string()).min(1).optional(),
  /** Match pull_request triggers by draft state. Set false to run only on non-draft PRs. */
  draft: z.boolean().optional(),
  /** Match pull_request triggers when any listed label is present. */
  labels: z.array(z.string()).min(1).optional(),
  // Per-trigger overrides (flattened output fields)
  failOn: SeverityThresholdSchema.optional(),
  reportOn: SeverityThresholdSchema.optional(),
  maxFindings: z.number().int().positive().optional(),
  reportOnSuccess: z.boolean().optional(),
  /** Use REQUEST_CHANGES review event when findings exceed failOn */
  requestChanges: z.boolean().optional(),
  /** Fail the check run when findings exceed failOn */
  failCheck: z.boolean().optional(),
  model: z.string().optional(),
  maxTurns: z.number().int().positive().optional(),
  /** Minimum confidence level for findings. Findings below this are filtered from output. */
  minConfidence: ConfidenceThresholdSchema.optional(),
  /** Schedule-specific configuration. Only used when type is 'schedule'. */
  schedule: ScheduleConfigSchema.optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'pull_request' && (!data.actions || data.actions.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "actions is required for pull_request triggers",
      path: ["actions"],
    });
  }

  if (data.type !== 'pull_request' && data.labels) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "labels is only supported for pull_request triggers",
      path: ["labels"],
    });
  }
});
export type SkillTrigger = z.infer<typeof SkillTriggerSchema>;

// Skill configuration (top-level [[skills]])
export const SkillConfigSchema = z.object({
  name: z.string().min(1),
  /** Path patterns to include */
  paths: z.array(z.string()).optional(),
  /** Path patterns to exclude */
  ignorePaths: z.array(z.string()).optional(),
  /** Remote repository reference for the skill (e.g., "owner/repo" or "owner/repo@sha") */
  remote: z.string().optional(),
  // Flattened output fields (skill-level defaults)
  failOn: SeverityThresholdSchema.optional(),
  reportOn: SeverityThresholdSchema.optional(),
  maxFindings: z.number().int().positive().optional(),
  reportOnSuccess: z.boolean().optional(),
  /** Use REQUEST_CHANGES review event when findings exceed failOn */
  requestChanges: z.boolean().optional(),
  /** Fail the check run when findings exceed failOn */
  failCheck: z.boolean().optional(),
  /** Model to use for this skill (e.g., 'openai/gpt-5.5'). Uses SDK default if not specified. */
  model: z.string().optional(),
  /** Maximum agentic turns (API round-trips) per hunk analysis. Overrides defaults.maxTurns. */
  maxTurns: z.number().int().positive().optional(),
  /** Minimum confidence level for findings. Findings below this are filtered from output. */
  minConfidence: ConfidenceThresholdSchema.optional(),
  /** Triggers defining when/where this skill runs. Omit to run everywhere (wildcard). */
  triggers: z.array(SkillTriggerSchema).optional(),
});
export type SkillConfig = z.infer<typeof SkillConfigSchema>;

// Runner configuration
export const RunnerConfigSchema = z.object({
  /** Max concurrent file analyses across all skills (default: 4) */
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
  /** Max number of "other files" to list in hunk prompts for PR context. 0 disables the section entirely. Default: 50 */
  maxContextFiles: z.number().int().nonnegative().default(50),
});
export type ChunkingConfig = z.infer<typeof ChunkingConfigSchema>;

export const IgnoreConfigSchema = z.object({
  /** Gitignore-style path patterns to ignore. Prefix with ! to re-include. */
  paths: z.array(z.string()).optional(),
}).strict();
export type IgnoreConfig = z.infer<typeof IgnoreConfigSchema>;

export const ScanConfigSchema = z.object({
  /** Max files to analyze after ignores are applied. Default: 150 */
  maxFiles: z.number().int().positive().optional(),
  /** Max changed lines to analyze after ignores are applied. Default: 10000 */
  maxChangedLines: z.number().int().positive().optional(),
  /** Max file size in bytes for files whose contents may be read. Default: 1048576 */
  maxFileBytes: z.number().int().positive().optional(),
  /** Max file length in lines for files whose contents may be read. Default: 3000 */
  maxFileLines: z.number().int().positive().optional(),
}).strict();
export type ScanConfig = z.infer<typeof ScanConfigSchema>;

export const DEFAULT_SCAN_LIMITS: Required<ScanConfig> = {
  maxFiles: 150,
  maxChangedLines: 10_000,
  maxFileBytes: 1_048_576,
  maxFileLines: 3_000,
};

// Per-model definition for a custom provider. Only `id` is required; Warden
// fills the remaining fields Pi requires with sensible defaults.
export const ProviderModelConfigSchema = z.object({
  /** Model id as exposed by the endpoint (e.g. the LiteLLM model name). */
  id: z.string().min(1),
  /** Display name. Defaults to `id`. */
  name: z.string().min(1).optional(),
  /** Whether the model supports reasoning/thinking. Default: false. */
  reasoning: z.boolean().optional(),
  /** Accepted input modalities. Default: ["text"]. */
  input: z.array(z.enum(['text', 'image'])).min(1).optional(),
  /** Context window in tokens. Default: 128000. */
  contextWindow: z.number().int().positive().optional(),
  /** Max output tokens. Default: 8192. */
  maxTokens: z.number().int().positive().optional(),
  /** Per-token cost (USD per token). Default: all zeros. */
  cost: z.object({
    input: z.number().nonnegative(),
    output: z.number().nonnegative(),
    cacheRead: z.number().nonnegative(),
    cacheWrite: z.number().nonnegative(),
  }).optional(),
}).strict();
export type ProviderModelConfig = z.infer<typeof ProviderModelConfigSchema>;

// A custom, self-hosted or gateway provider (e.g. LiteLLM). OpenAI-compatible only in v1.
export const ProviderConfigSchema = z.object({
  /** OpenAI-compatible base URL, typically ending in /v1. */
  baseUrl: z.string().url(),
  /** Wire protocol. Only "openai-completions" is supported today. */
  api: z.enum(['openai-completions']).default('openai-completions'),
  /** Extra HTTP headers sent on every request. */
  headers: z.record(z.string(), z.string()).optional(),
  /** Env var holding the API key. Defaults to WARDEN_<NAME>_API_KEY then <NAME>_API_KEY. */
  apiKeyEnv: z.string().min(1).optional(),
  /** Models this provider exposes. At least one is required. */
  models: z.array(ProviderModelConfigSchema).min(1),
}).strict();
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

// Map of provider name -> provider config. The name becomes the model-selector prefix.
export const ProvidersConfigSchema = z.record(z.string().min(1), ProviderConfigSchema);
export type ProvidersConfig = z.infer<typeof ProvidersConfigSchema>;

// Default configuration that skills inherit from
export const DefaultsSchema = z.object({
  /** Fail the build when findings meet this severity */
  failOn: SeverityThresholdSchema.optional(),
  /** Only report findings at or above this severity */
  reportOn: SeverityThresholdSchema.optional(),
  maxFindings: z.number().int().positive().optional(),
  /** Report even when there are no findings (default: false) */
  reportOnSuccess: z.boolean().optional(),
  /** Use REQUEST_CHANGES review event when findings exceed failOn. Default: false */
  requestChanges: z.boolean().optional(),
  /** Fail the check run when findings exceed failOn. Default: false */
  failCheck: z.boolean().optional(),
  /** Default model for all skills (e.g., 'openai/gpt-5.5') */
  model: z.string().optional(),
  /** Maximum agentic turns (API round-trips) per hunk analysis. Default: 50 */
  maxTurns: z.number().int().positive().optional(),
  /** Runtime backend for all model-backed execution. Default: pi */
  runtime: RuntimeNameSchema.optional(),
  /** Model defaults for repo-aware skill execution. */
  agent: AgentRuntimeConfigSchema.optional(),
  /** Model defaults for auxiliary structured model calls. */
  auxiliary: AuxiliaryRuntimeConfigSchema.optional(),
  /** Model defaults for post-analysis synthesis/consolidation. */
  synthesis: SynthesisRuntimeConfigSchema.optional(),
  /** Candidate finding verification. Enabled by default; set enabled=false to opt out. */
  verification: VerificationConfigSchema.optional(),
  /** Minimum confidence level for findings. Findings below this are filtered from output. Default: medium */
  minConfidence: ConfidenceThresholdSchema.optional(),
  /** Path patterns to exclude from all skills */
  ignorePaths: z.array(z.string()).optional(),
  /** Default branch for the repository (e.g., 'main', 'master', 'develop'). Auto-detected if not specified. */
  defaultBranch: z.string().optional(),
  /** Chunking configuration for controlling how files are processed */
  chunking: ChunkingConfigSchema.optional(),
  /** Global file ignore policy applied before scan limits and chunking */
  ignore: IgnoreConfigSchema.optional(),
  /** Global scan limits applied after ignore filtering */
  scan: ScanConfigSchema.optional(),
  /** Custom OpenAI-compatible providers (e.g. self-hosted LiteLLM). Keyed by provider name. */
  providers: ProvidersConfigSchema.optional(),
  /** Delay in milliseconds between batch starts when processing files in parallel. Default: 0 */
  batchDelayMs: z.number().int().nonnegative().optional(),
  /** Max retries for auxiliary structured model calls (extraction repair, merging, dedup, fix evaluation). Default: 5 */
  auxiliaryMaxRetries: z.number().int().positive().optional(),
});
export type Defaults = z.infer<typeof DefaultsSchema>;

// Log cleanup mode
export const LogCleanupModeSchema = z.enum(['ask', 'auto', 'never']);
export type LogCleanupMode = z.infer<typeof LogCleanupModeSchema>;

// Logs configuration
export const LogsConfigSchema = z.object({
  /** How to handle expired log files: 'ask' (default, prompt in TTY), 'auto' (silently delete), 'never' (keep all) */
  cleanup: LogCleanupModeSchema.default('ask'),
  /** Number of days to retain log files before considering them expired. Default: 30 */
  retentionDays: z.number().int().positive().default(30),
});
export type LogsConfig = z.infer<typeof LogsConfigSchema>;

// Main warden.toml configuration
export const WardenConfigSchema = z
  .object({
    version: z.literal(1),
    defaults: DefaultsSchema.optional(),
    skills: z.array(SkillConfigSchema).default([]),
    runner: RunnerConfigSchema.optional(),
    logs: LogsConfigSchema.optional(),
  })
  .superRefine((config, ctx) => {
    const names = config.skills.map((s) => s.name);
    const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate skill names: ${[...new Set(duplicates)].join(', ')}`,
        path: ['skills'],
      });
    }

    // Validate schedule skills have paths
    for (const [i, skill] of config.skills.entries()) {
      if (skill.triggers) {
        for (const trigger of skill.triggers) {
          if (trigger.type === 'schedule' && (!skill.paths || skill.paths.length === 0)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "paths is required for skills with schedule triggers",
              path: ['skills', i, 'paths'],
            });
          }
        }
      }
    }
  });
export type WardenConfig = z.infer<typeof WardenConfigSchema>;
