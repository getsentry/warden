import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SkillDefinition } from '../config/schema.js';
import { formatHunkForAnalysis, type HunkWithContext } from '../diff/index.js';

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
  /** Max number of "other files" to list in the prompt. 0 disables the section. Default: 50. */
  maxContextFiles?: number;
}

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

    `<tools>
You have access to these tools to gather context:
- **Read**: Check related files to understand context
- **Grep**: Search for patterns to trace data flow or find related code

Use these tools to gather context that helps you evaluate changes within the hunk. All findings must still reference lines within the hunk being analyzed.
</tools>`,

    `<skill_instructions>
The following defines the ONLY criteria you should evaluate. Do not report findings outside this scope:

${skill.prompt}
</skill_instructions>`,

    `<output_format>
IMPORTANT: Your response must be ONLY a valid JSON object. No markdown, no explanation, no code fences.

Example response format:
{"findings": [{"id": "example-1", "severity": "medium", "confidence": "high", "title": "Issue title", "description": "Description", "location": {"path": "file.ts", "startLine": 10}}]}

Full schema:
{
  "findings": [
    {
      "id": "unique-identifier",
      "severity": "critical|high|medium|low|info",
      "confidence": "high|medium|low",
      "title": "Short descriptive title",
      "description": "Detailed explanation of the issue",
      "location": {
        "path": "path/to/file.ts",
        "startLine": 10,
        "endLine": 15
      },
      "suggestedFix": {
        "description": "How to fix this issue",
        "diff": "unified diff format"
      }
    }
  ]
}

Requirements:
- Return ONLY valid JSON starting with {"findings":
- "findings" array can be empty if no issues found
- "location.path" is auto-filled from context - just provide startLine (and optionally endLine). Omit location entirely for general findings not about a specific line.
- "location.startLine" MUST be within the hunk line range (shown in the "## Hunk" header). If the issue originates in surrounding code, anchor to the nearest changed line in the hunk and note the actual location in the description.
- "confidence" reflects how certain you are this is a real issue given the codebase context
- "suggestedFix" is optional - only include when you can provide a complete, correct fix **to the file being analyzed**. Omit suggestedFix if:
  - The fix would be incomplete or you're uncertain about the correct solution
  - The fix requires changes to a different file or a new file (describe the fix in the description field instead)
- Keep descriptions SHORT (1-2 sentences max) - avoid lengthy explanations
- Focus your analysis on the code changes in the hunk. Surrounding context and tool results are for understanding only -- all findings must reference lines within the hunk range.
</output_format>`,
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
  const sections: string[] = [];

  sections.push(`Analyze this code change according to the "${skill.name}" skill criteria.`);

  // Include PR title and description for context on intent
  if (prContext?.title) {
    let prSection = `## Pull Request Context\n**Title:** ${prContext.title}`;
    if (prContext.body) {
      // Truncate very long PR descriptions to avoid bloating prompts
      const maxBodyLength = 1000;
      const body = prContext.body.length > maxBodyLength
        ? prContext.body.slice(0, maxBodyLength) + '...'
        : prContext.body;
      prSection += `\n\n**Description:**\n${body}`;
    }
    sections.push(prSection);
  }

  // Include list of other files being changed in the PR for context
  const maxContextFiles = prContext?.maxContextFiles ?? 50;
  const otherFiles = prContext?.changedFiles.filter((f) => f !== hunkCtx.filename) ?? [];
  if (otherFiles.length > 0 && maxContextFiles > 0) {
    const displayFiles = otherFiles.slice(0, maxContextFiles);
    const remaining = otherFiles.length - displayFiles.length;
    let fileList = displayFiles.map((f) => `- ${f}`).join('\n');
    if (remaining > 0) {
      fileList += `\n- ... and ${remaining} more`;
    }
    sections.push(`## Other Files in This PR
The following files are also being changed in this PR (may provide useful context):
${fileList}`);
  }

  sections.push(formatHunkForAnalysis(hunkCtx));

  sections.push(
    `IMPORTANT: Only report findings that are explicitly covered by the skill instructions. Do not report general code quality issues, bugs, or improvements unless the skill specifically asks for them. Return an empty findings array if no issues match the skill's criteria.`
  );

  return sections.join('\n\n');
}
