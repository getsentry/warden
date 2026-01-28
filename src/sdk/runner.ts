import { query, type SDKResultMessage } from '@anthropic-ai/claude-code';
import type { SkillDefinition } from '../config/schema.js';
import type { EventContext, SkillReport } from '../types/index.js';
import { SkillReportSchema } from '../types/index.js';

export class SkillRunnerError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SkillRunnerError';
  }
}

export interface SkillRunnerOptions {
  apiKey?: string;
  maxTurns?: number;
}

/**
 * Builds the system prompt for the warden agent.
 * Establishes the agent role, injects skill-specific instructions,
 * and mandates the fixed SkillReport output format.
 */
export function buildSystemPrompt(skill: SkillDefinition): string {
  return `You are a code analysis agent for Warden. You analyze pull requests and report findings in a structured format.

## Your Analysis Task

${skill.prompt}

## Output Format

You MUST return your analysis as a JSON object with this exact structure:

\`\`\`json
{
  "skill": "${skill.name}",
  "summary": "Brief summary of findings (1-2 sentences)",
  "findings": [
    {
      "id": "unique-identifier",
      "severity": "critical|high|medium|low|info",
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
      },
      "labels": ["optional-label"]
    }
  ],
  "metadata": {}
}
\`\`\`

Requirements:
- Return ONLY valid JSON (no markdown fences, no explanation before/after)
- Include "skill" and "summary" fields always
- "findings" array can be empty if no issues found
- "location" is required for file-specific findings
- "suggestedFix" and "labels" are optional
- Use severity levels appropriately:
  - critical: Actively exploitable, severe impact
  - high: Exploitable with moderate effort
  - medium: Potential issue, needs review
  - low: Minor concern
  - info: Observation, not a problem`;
}

/**
 * Builds the user prompt with PR context.
 * Output instructions are in the system prompt.
 * Requires pullRequest to be present in context.
 */
export function buildUserPrompt(context: EventContext & { pullRequest: NonNullable<EventContext['pullRequest']> }): string {
  const pr = context.pullRequest;

  return `Analyze this pull request:

## PR #${pr.number}: ${pr.title}

**Author:** ${pr.author}
**Branch:** ${pr.baseBranch} ← ${pr.headBranch}

### Description
${pr.body || '(No description provided)'}

### Files Changed (${pr.files.length})
${pr.files.map(f => `- \`${f.filename}\` (+${f.additions}/-${f.deletions})`).join('\n')}`;
}

export async function runSkill(
  skill: SkillDefinition,
  context: EventContext,
  options: SkillRunnerOptions = {}
): Promise<SkillReport> {
  const { maxTurns = 10 } = options;

  if (!context.pullRequest) {
    throw new SkillRunnerError('Pull request context required for skill execution');
  }

  const contextWithPR = context as EventContext & { pullRequest: NonNullable<EventContext['pullRequest']> };
  const systemPrompt = buildSystemPrompt(skill);
  const userPrompt = buildUserPrompt(contextWithPR);

  const stream = query({
    prompt: userPrompt,
    options: {
      maxTurns,
      cwd: context.repoPath,
      customSystemPrompt: systemPrompt,
      allowedTools: skill.tools?.allowed,
      disallowedTools: skill.tools?.denied,
      permissionMode: 'bypassPermissions',
    },
  });

  let resultMessage: SDKResultMessage | undefined;

  for await (const message of stream) {
    if (message.type === 'result') {
      resultMessage = message;
    }
  }

  if (!resultMessage) {
    throw new SkillRunnerError('No result from skill execution');
  }

  return parseSkillOutput(skill.name, resultMessage);
}

function parseSkillOutput(skillName: string, result: SDKResultMessage): SkillReport {
  if (result.subtype !== 'success') {
    throw new SkillRunnerError(`Skill execution failed: ${result.subtype}`);
  }

  const text = result.result;

  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new SkillRunnerError('No JSON found in skill output');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new SkillRunnerError('Failed to parse JSON output', { cause: error });
  }

  const validated = SkillReportSchema.safeParse(parsed);
  if (!validated.success) {
    throw new SkillRunnerError(
      `Invalid skill report: ${validated.error.issues.map(i => i.message).join(', ')}`
    );
  }

  return validated.data;
}
