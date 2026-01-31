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
  // Location
  LocationSchema,
  // Suggested Fix
  SuggestedFixSchema,
  // Finding
  FindingSchema,
  // Skill Report
  SkillReportSchema,
  // GitHub Events
  GitHubEventTypeSchema,
  PullRequestActionSchema,
  // File Changes
  FileChangeSchema,
  // Context
  PullRequestContextSchema,
  RepositoryContextSchema,
  EventContextSchema,
} from './types/index.js';

export type {
  Severity,
  Location,
  SuggestedFix,
  Finding,
  SkillReport,
  GitHubEventType,
  PullRequestAction,
  FileChange,
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
  TriggerSchema,
  WardenConfigSchema,
  PathFilterSchema,
  OutputConfigSchema,
  // Functions
  loadWardenConfig,
  resolveTrigger,
  // Errors
  ConfigLoadError,
} from './config/index.js';

export type {
  SkillDefinition,
  Trigger,
  WardenConfig,
  PathFilter,
  OutputConfig,
  ResolvedTrigger,
} from './config/index.js';

// -----------------------------------------------------------------------------
// SDK Runner
// -----------------------------------------------------------------------------
export { runSkill, SkillRunnerError } from './sdk/runner.js';

export type { SkillRunnerOptions, SkillRunnerCallbacks } from './sdk/runner.js';

// -----------------------------------------------------------------------------
// Skills
// -----------------------------------------------------------------------------
export {
  resolveSkillAsync,
  SkillLoaderError,
} from './skills/index.js';

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
