import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SkillDefinition } from '../config/schema.js';
import { formatHunkForAnalysis, type HunkWithContext } from '../diff/index.js';
import {
  buildChangedFilesSection,
  buildJsonOutputSection,
  buildPullRequestContextSection,
  joinPromptSections,
  type PromptPRContext,
} from './prompt-sections.js';

export type PRPromptContext = PromptPRContext;

/**
 * Builds the system prompt for hunk-based analysis.
 *
 * Future enhancement: Could have the agent output a structured `contextAssessment`
 * (applicationType, trustBoundaries, filesChecked) to cache across hunks, allow
 * user overrides, or build analytics. Not implemented since we don't consume it yet.
 */
export function buildHunkSystemPrompt(skill: SkillDefinition): string {
  const sections = [
    `<role>
You are a code analysis agent for Warden. You evaluate code changes against specific skill criteria and report findings ONLY when the code violates or conflicts with those criteria. You do not perform general code review or report issues outside the skill's scope.
</role>`,

    `<verification>
Before reporting a finding:
1. Read the relevant source code to understand the full context
2. Trace through the code path — follow imports, base classes, and indirect references, not just the immediate file
3. Verify your assumptions — confirm the issue exists, don't infer from incomplete information
4. Ensure the finding references lines within the hunk being analyzed
5. Document your verification in the 'verification' field of each finding
</verification>`,

    `<skill_instructions>
The following defines the ONLY criteria you should evaluate. Do not report findings outside this scope:

${skill.prompt}
</skill_instructions>`,

    buildJsonOutputSection(`
Example response format:
{"findings": [{"id": "example-1", "severity": "medium", "confidence": "high", "title": "Issue title", "description": "Description", "location": {"path": "file.ts", "startLine": 10}}]}

Full schema:
{
  "findings": [
    {
      "id": "unique-identifier",
      "severity": "high|medium|low",
      "confidence": "high|medium|low",
      "title": "Assertive, impact-focused title stating what is broken or wrong (e.g. 'wasFailFastAborted never detects fail-fast abort')",
      "description": "2-4 concise sentences. Start with the root cause, end with the user-visible consequence.",
      "location": {
        "path": "path/to/file.ts",
        "startLine": 10,
        "endLine": 15
      },
      "verification": "Required. What you checked before reporting: files read, code paths traced, assumptions validated. Reference specific files/functions.",
      "suggestedFix": {
        "description": "How to fix this issue",
        "diff": "unified diff format"
      }
    }
  ]
}

Requirements:
- Return valid JSON starting with {"findings":
- "findings" array can be empty if no issues found
- "location.path" is auto-filled from context - just provide startLine (and optionally endLine). Omit location entirely for general findings not about a specific line.
- "location.startLine" MUST be within the hunk line range (shown in the "## Hunk" header). If the issue originates in surrounding code, anchor to the nearest changed line in the hunk and note the actual location in the description.
- "confidence" reflects how certain you are this is a real issue given the codebase context
- "suggestedFix" is optional - only include when you can provide a complete, correct fix **to the file being analyzed**. Omit suggestedFix if:
  - The fix would be incomplete or you're uncertain about the correct solution
  - The fix requires changes to a different file or a new file (describe the fix in the description field instead)
- Keep descriptions concise (2-4 sentences). Start with the root cause, end with the user-visible consequence.
- Focus your analysis on the code changes in the hunk. Surrounding context and tool results are for understanding only -- all findings must reference lines within the hunk range.
`),
  ];

  const { rootDir } = skill;
  if (rootDir) {
    const resourceDirs = ['scripts', 'references', 'assets'].filter((dir) =>
      existsSync(join(rootDir, dir))
    );
    if (resourceDirs.length > 0) {
      const dirList = resourceDirs.map((d) => `${d}/`).join(', ');
      sections.push(`<skill_resources>
This skill is located at: ${rootDir}
You can read files from ${dirList} subdirectories using the Read tool with the full path.
</skill_resources>`);
    }
  }

  return sections.join('\n\n');
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
