import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { formatHunkForAnalysis } from '../diff/index.js';
/**
 * Builds the system prompt for hunk-based analysis.
 *
 * Future enhancement: Could have the agent output a structured `contextAssessment`
 * (applicationType, trustBoundaries, filesChecked) to cache across hunks, allow
 * user overrides, or build analytics. Not implemented since we don't consume it yet.
 */
export function buildHunkSystemPrompt(skill) {
    const sections = [
        `<role>
You are a code analysis agent for Warden. You evaluate code changes against specific skill criteria and report findings ONLY when the code violates or conflicts with those criteria. You do not perform general code review or report issues outside the skill's scope.
</role>`,
        `<tools>
You have access to these tools to gather context:
- **Read**: Check related files to understand context
- **Grep**: Search for patterns to trace data flow or find related code
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
- "confidence" reflects how certain you are this is a real issue given the codebase context
- "suggestedFix" is optional - only include when you can provide a complete, correct fix **to the file being analyzed**. Omit suggestedFix if:
  - The fix would be incomplete or you're uncertain about the correct solution
  - The fix requires changes to a different file or a new file (describe the fix in the description field instead)
- Keep descriptions SHORT (1-2 sentences max) - avoid lengthy explanations
- Be concise - focus only on the changes shown
</output_format>`,
    ];
    const { rootDir } = skill;
    if (rootDir) {
        const resourceDirs = ['scripts', 'references', 'assets'].filter((dir) => existsSync(join(rootDir, dir)));
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
export function buildHunkUserPrompt(skill, hunkCtx, prContext) {
    const sections = [];
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
    const otherFiles = prContext?.changedFiles.filter((f) => f !== hunkCtx.filename) ?? [];
    if (otherFiles.length > 0) {
        sections.push(`## Other Files in This PR
The following files are also being changed in this PR (may provide useful context):
${otherFiles.map((f) => `- ${f}`).join('\n')}`);
    }
    sections.push(formatHunkForAnalysis(hunkCtx));
    sections.push(`IMPORTANT: Only report findings that are explicitly covered by the skill instructions. Do not report general code quality issues, bugs, or improvements unless the skill specifically asks for them. Return an empty findings array if no issues match the skill's criteria.`);
    return sections.join('\n\n');
}
//# sourceMappingURL=prompt.js.map