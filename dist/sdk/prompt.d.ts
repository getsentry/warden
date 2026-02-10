import type { SkillDefinition } from '../config/schema.js';
import { type HunkWithContext } from '../diff/index.js';
/**
 * Context about the PR being analyzed, for inclusion in prompts.
 *
 * The title and body (like a commit message) help explain the _intent_ of the
 * changes to the agent, enabling it to better understand what the author was
 * trying to accomplish and identify issues that conflict with that intent.
 */
export interface PRPromptContext {
    /** All files being changed in the PR */
    changedFiles: string[];
    /** PR title - explains what the change does */
    title?: string;
    /** PR description/body - explains why and provides additional context */
    body?: string | null;
}
/**
 * Builds the system prompt for hunk-based analysis.
 *
 * Future enhancement: Could have the agent output a structured `contextAssessment`
 * (applicationType, trustBoundaries, filesChecked) to cache across hunks, allow
 * user overrides, or build analytics. Not implemented since we don't consume it yet.
 */
export declare function buildHunkSystemPrompt(skill: SkillDefinition): string;
/**
 * Builds the user prompt for a single hunk.
 */
export declare function buildHunkUserPrompt(skill: SkillDefinition, hunkCtx: HunkWithContext, prContext?: PRPromptContext): string;
//# sourceMappingURL=prompt.d.ts.map