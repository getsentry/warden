import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SkillDefinition } from '../config/schema.js';
import type { ReviewChunk } from '../diff/index.js';
import {
  buildChangedFilesSection,
  buildJsonOutputSection,
  buildPullRequestContextSection,
  joinPromptSections,
  type PromptPRContext,
} from './prompt-sections.js';

export type PRPromptContext = PromptPRContext;

function formatChangedLineMap(chunk: ReviewChunk): string {
  return chunk.changedLineMap
    .map((range) => `- ${range.path}:${range.start}-${range.end}`)
    .join('\n');
}

/** Format one semantic review chunk with its summary, line map, and file content. */
export function formatReviewChunkForAnalysis(chunk: ReviewChunk): string {
  const lines: string[] = [];

  lines.push(`## Review Chunk: ${chunk.title}`);
  if (chunk.summary) {
    lines.push(`## Semantic Summary: ${chunk.summary}`);
    lines.push('The semantic summary is only a grouping hint. Do not treat it as evidence that the changed behavior is correct or intended.');
  }
  lines.push('');
  lines.push('## Changed Line Map');
  lines.push(formatChangedLineMap(chunk));

  for (const file of chunk.files) {
    lines.push('');
    lines.push(`## File: ${file.path}`);
    lines.push(`## Language: ${file.language}`);
    lines.push(`## Content Mode: ${file.contentMode}`);
    lines.push('');
    lines.push(file.content);
  }

  return lines.join('\n');
}

/**
 * Builds the system prompt for review chunk analysis.
 *
 * Future enhancement: Could have the agent output a structured `contextAssessment`
 * (applicationType, trustBoundaries, filesChecked) to cache across chunks, allow
 * user overrides, or build analytics. Not implemented since we don't consume it yet.
 */
export function buildHunkSystemPrompt(skill: SkillDefinition): string {
  const sections = [
    `<role>
You are a code analysis agent for Warden. You evaluate code changes against specific skill criteria and report findings ONLY when the code violates or conflicts with those criteria. You do not perform general code review or report issues outside the skill's scope.
</role>`,

    `<evidence>
Before reporting a finding:
1. Read the relevant source code to understand the full context
2. Trace through the code path — follow imports, base classes, and indirect references, not just the immediate file
3. Verify your assumptions — confirm the issue exists, don't infer from incomplete information
4. Ensure each finding's location starts on a line listed in the review chunk's changed-line map
5. Document the evidence trace in the 'verification' field of each finding
</evidence>`,

    `<skill_instructions>
The following defines the ONLY criteria you should evaluate. Do not report findings outside this scope:

${skill.prompt}
</skill_instructions>`,

    buildJsonOutputSection(`
Example response format:
{"findings": [{"id": "example-1", "severity": "medium", "confidence": "high", "title": "Issue title", "description": "Description", "location": {"path": "file.ts", "startLine": 10}, "verification": "- \`startRun()\` passes the changed value into \`finishRun()\`.\\n- The caller does not guard this case before calling \`startRun()\`."}]}

Full schema:
{
  "findings": [
    {
      "id": "unique-identifier",
      "severity": "high|medium|low",
      "confidence": "high|medium|low",
      "title": "Short, specific title naming the broken behavior or risk (e.g. 'wasFailFastAborted never detects fail-fast abort')",
      "description": "Visible inline PR comment. Use one short, direct sentence whenever possible; two only if needed for the fix or impact.",
      "location": {
        "path": "path/to/file.ts",
        "startLine": 10,
        "endLine": 15
      },
      "verification": "Required. Evidence for the public Evidence block. Write 2-5 short Markdown bullets tracing the concrete code path, guard, condition, or behavior that makes the finding real. Use function/file names when useful. Do not use checklist labels, generic reasoning, or restate the description."
    }
  ]
}

Requirements:
- Return valid JSON starting with {"findings":
- "findings" array can be empty if no issues found
- "location.path" must be one of the files in the changed line map. For single-file chunks, use that file path.
- "location.startLine" MUST be within one of the changed line map ranges. If "location.endLine" is present, it must also be within one of the changed line map ranges for the same file. If the issue originates in surrounding code, anchor to the nearest changed line in the changed line map and note the actual location in the description.
- "confidence" reflects how certain you are this is a real issue given the codebase context
- "description" is rendered directly in GitHub inline comments. Keep it brief and actionable, usually one sentence.
- Put the concrete evidence trace in "verification", not "description".
- Write "verification" as evidence, not reasoning: facts from the code path, guards, conditions, and observed behavior that make the finding believable.
- Do not format "verification" as any labeled checklist or template.
- Do not include severity, confidence, finding ID, skill name, or generic review framing in "description".
- Focus your analysis on the code changes in the review chunk. Surrounding context and tool results are for understanding only -- all findings must reference lines within the changed line map.
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

/** Build the scanner prompt around one semantic chunk while preserving location constraints. */
export function buildReviewChunkUserPrompt(
  skill: SkillDefinition,
  chunk: ReviewChunk,
  prContext?: PRPromptContext
): string {
  const currentFile = chunk.files.length === 1 ? chunk.files[0]?.path : undefined;
  return joinPromptSections([
    `<task>
Analyze this semantic review chunk according to the "${skill.name}" skill criteria.
</task>`,
    buildPullRequestContextSection(prContext),
    buildChangedFilesSection(prContext, currentFile),
    formatReviewChunkForAnalysis(chunk),
    `<scope_reminder>
Only report findings that are explicitly covered by the skill instructions. Do not report general code quality issues, bugs, or improvements unless the skill specifically asks for them. Locations must be inside the changed line map. Return an empty findings array if no issues match the skill's criteria.
</scope_reminder>`,
  ]);
}

/** Legacy alias for callers that still use the old hunk prompt name. */
export const buildHunkUserPrompt = buildReviewChunkUserPrompt;
