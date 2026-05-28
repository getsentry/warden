// =============================================================================
// Warden Public API
// =============================================================================
// This file exports the intentional public API for Warden consumers.
// Internal implementation details are not exported.
// =============================================================================

// -----------------------------------------------------------------------------
// Core Types and Schemas
// -----------------------------------------------------------------------------
export {
  // Severity
  SeveritySchema,
  SEVERITY_ORDER,
  // Confidence
  ConfidenceThresholdSchema,
  CONFIDENCE_ORDER,
  filterFindingsByConfidence,
  filterFindings,
  // Location
  LocationSchema,
  // Suggested Fix
  SuggestedFixSchema,
  // Source Snippet
  SourceSnippetLineSchema,
  SourceSnippetSchema,
  // Finding
  FindingSchema,
  UsageStatsSchema,
  AuxiliaryUsageMapSchema,
  // File Report (per-file breakdown within a skill)
  FileReportSchema,
  // Skill Report
  SkillReportSchema,
  // Run errors
  ErrorCodeSchema,
  SkillErrorSchema,
  HunkFailureSchema,
  // GitHub Events
  GitHubEventTypeSchema,
  PullRequestActionSchema,
  // File Changes
  FileChangeSchema,
  DiffContextSourceSchema,
  // Context
  PullRequestContextSchema,
  RepositoryContextSchema,
  EventContextSchema,
} from './types/index.js';

export type {
  Severity,
  ConfidenceThreshold,
  Location,
  SuggestedFix,
  SourceSnippetLine,
  SourceSnippet,
  Finding,
  UsageStats,
  AuxiliaryUsageMap,
  FileReport,
  SkillReport,
  ErrorCode,
  SkillError,
  HunkFailure,
  GitHubEventType,
  PullRequestAction,
  FileChange,
  DiffContextSource,
  PullRequestContext,
  RepositoryContext,
  EventContext,
} from './types/index.js';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------
export {
  // Schemas
  SkillDefinitionSchema,
  SkillConfigSchema,
  SkillTriggerSchema,
  TriggerTypeSchema,
  RuntimeNameSchema,
  AgentRuntimeConfigSchema,
  AuxiliaryRuntimeConfigSchema,
  SynthesisRuntimeConfigSchema,
  WardenConfigSchema,
  // Functions
  loadWardenConfig,
  resolveSkillConfigs,
  // Errors
  ConfigLoadError,
} from './config/index.js';

export type {
  SkillDefinition,
  SkillConfig,
  SkillTrigger,
  TriggerType,
  RuntimeName,
  AgentRuntimeConfig,
  AuxiliaryRuntimeConfig,
  SynthesisRuntimeConfig,
  WardenConfig,
  ResolvedTrigger,
} from './config/index.js';

// -----------------------------------------------------------------------------
// SDK Runner
// -----------------------------------------------------------------------------
export {
  runSkill,
  runLocalSkill,
  verifyLocalFindings,
  anthropicUsageToStats,
  SkillRunnerError,
  getRuntime,
  claudeRuntime,
  piRuntime,
  parseJsonFromOutput,
} from './sdk/runner.js';

export type {
  RunLocalSkillOptions,
  RunLocalSkillResult,
  VerifyLocalFindingsOptions,
  VerifyLocalFindingsResult,
  AnthropicApiUsage,
  SkillRunnerOptions,
  SkillRunnerCallbacks,
  FindingProcessingEvent,
  Runtime,
  AuxiliaryRunRequest,
  AuxiliaryRunResult,
  AuxiliaryTask,
  AuxiliaryTool,
  SynthesisRunRequest,
  SynthesisTask,
  SkillRunOptions,
  SkillRunRequest,
  SkillRunResponse,
  SkillRunResult,
  SkillRunStatus,
  JsonOutputRepairOptions,
  ParseJsonFromOutputOptions,
  ParseJsonFromOutputResult,
} from './sdk/runner.js';

// -----------------------------------------------------------------------------
// Skills
// -----------------------------------------------------------------------------
export {
  resolveSkillAsync,
  resolveAgentAsync,
  SkillLoaderError,
} from './skills/index.js';

export type { AgentDefinition } from './skills/index.js';

// -----------------------------------------------------------------------------
// Event Context
// -----------------------------------------------------------------------------
export { buildEventContext, EventContextError } from './event/context.js';

// -----------------------------------------------------------------------------
// Trigger Matching
// -----------------------------------------------------------------------------
export {
  matchTrigger,
  matchGlob,
  filterContextByPaths,
  shouldFail,
  countFindingsAtOrAbove,
  countSeverity,
} from './triggers/matcher.js';

// -----------------------------------------------------------------------------
// Output Rendering
// -----------------------------------------------------------------------------
export { renderSkillReport } from './output/renderer.js';

export type {
  RenderResult,
  RenderOptions,
  GitHubReview,
  GitHubComment,
} from './output/types.js';
