/**
 * SDK Runner - Main orchestration for skill execution.
 *
 * This module re-exports functionality from focused submodules:
 * - errors.ts: Error classes and classification (SkillRunnerError, WardenAuthenticationError)
 * - retry.ts: Retry logic with exponential backoff
 * - usage.ts: Usage stats extraction and aggregation
 * - prompt.ts: Prompt building for skills
 * - extract.ts: JSON extraction from model output
 * - prepare.ts: File preparation for analysis
 * - analyze.ts: Hunk and file analysis orchestration
 * - types.ts: Shared interfaces
 */

// Re-export error classes and utilities
export { SkillRunnerError, WardenAuthenticationError, isRetryableError, isAuthenticationError, isAuthenticationErrorMessage, isSubprocessError } from './errors.js';

// Re-export auth utilities
export { verifyAuth } from './auth.js';

// Re-export retry utilities
export { calculateRetryDelay } from './retry.js';

// Re-export usage utilities
export { aggregateUsage, aggregateAuxiliaryUsage, mergeAuxiliaryUsage, estimateTokens } from './usage.js';

// Re-export pricing utilities
export { apiUsageToStats } from './pricing.js';

// Re-export prompt building (with legacy alias)
export { buildHunkSystemPrompt, buildHunkUserPrompt } from './prompt.js';
export type { PRPromptContext } from './prompt.js';
// Legacy export for backwards compatibility
export { buildHunkSystemPrompt as buildSystemPrompt } from './prompt.js';

// Re-export extraction utilities
export {
  extractFindingsJson,
  extractBalancedJson,
  extractFindingsWithLLM,
  truncateForLLMFallback,
  deduplicateFindings,
  mergeGroupLocations,
  applyMergeGroups,
  mergeCrossLocationFindings,
  validateFindings,
  generateShortId,
} from './extract.js';
export type { ExtractFindingsResult, MergeResult } from './extract.js';
export { parseJsonFromOutput } from './json-output.js';
export type {
  JsonOutputRepairOptions,
  ParseJsonFromOutputOptions,
  ParseJsonFromOutputResult,
} from './json-output.js';

// Re-export file preparation
export { prepareFiles } from './prepare.js';

// Re-export verification utilities
export { verifyFindings } from './verify.js';
export { postProcessFindings } from './post-process.js';
export type {
  PostProcessFindingsOptions,
  PostProcessFindingsResult,
} from './post-process.js';

// Re-export analysis functions
export { analyzeFile, runSkill, generateSummary } from './analyze.js';

// Re-export runtime registry and adapter contracts
export {
  claudeRuntime,
  getRuntimeProviderOptions,
  getRuntime,
} from './runtimes/index.js';
export type { Runtime, RuntimeName } from './runtimes/index.js';
export type {
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
} from './runtimes/index.js';

// Re-export types
export type {
  AuxiliaryUsageEntry,
  FindingProcessingEvent,
  SkillRunnerCallbacks,
  SkillRunnerOptions,
  PreparedFile,
  PrepareFilesOptions,
  PrepareFilesResult,
  FileAnalysisCallbacks,
  FileAnalysisResult,
  ChunkAnalysisResult,
} from './types.js';
