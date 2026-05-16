import type { SkillDefinition } from '../config/schema.js';
import { formatHunkForAnalysis, type HunkWithContext } from '../diff/index.js';
import {
  buildChangedFilesSection,
  buildPullRequestContextSection,
  joinPromptSections,
  type PromptPRContext,
} from './prompt-sections.js';
import { buildRuntimeHunkSystemPrompt } from './prompts/index.js';
import type { RuntimeName } from './runtimes/types.js';

export type PRPromptContext = PromptPRContext;

/**
 * Builds the system prompt for hunk-based analysis.
 *
 * Future enhancement: Could have the agent output a structured `contextAssessment`
 * (applicationType, trustBoundaries, filesChecked) to cache across hunks, allow
 * user overrides, or build analytics. Not implemented since we don't consume it yet.
 */
export function buildHunkSystemPrompt(
  skill: SkillDefinition,
  runtime: RuntimeName = 'pi'
): string {
  return buildRuntimeHunkSystemPrompt(runtime, skill);
}

/**
 * Builds the user prompt for a single hunk.
 */
export function buildHunkUserPrompt(
  skill: SkillDefinition,
  hunkCtx: HunkWithContext,
  prContext?: PRPromptContext
): string {
  return joinPromptSections([
    `<task>
Analyze this code change according to the "${skill.name}" skill criteria.
</task>`,
    buildPullRequestContextSection(prContext),
    buildChangedFilesSection(prContext, hunkCtx.filename),
    formatHunkForAnalysis(hunkCtx),
    `<scope_reminder>
Only report findings that are explicitly covered by the skill instructions. Do not report general code quality issues, bugs, or improvements unless the skill specifically asks for them. Return an empty findings array if no issues match the skill's criteria.
</scope_reminder>`,
  ]);
}
