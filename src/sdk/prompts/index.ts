import type { SkillDefinition } from '../../config/schema.js';
import type { RuntimeName } from '../runtimes/types.js';
import { buildClaudeHunkSystemPrompt } from './claude.js';
import { buildPiHunkSystemPrompt } from './pi.js';

export { buildClaudeHunkSystemPrompt } from './claude.js';
export { buildPiHunkSystemPrompt } from './pi.js';

/**
 * Builds the runtime-specific system prompt for hunk-based analysis.
 */
export function buildRuntimeHunkSystemPrompt(
  runtime: RuntimeName,
  skill: SkillDefinition
): string {
  switch (runtime) {
    case 'claude':
      return buildClaudeHunkSystemPrompt(skill);
    case 'pi':
      return buildPiHunkSystemPrompt(skill);
  }
}
