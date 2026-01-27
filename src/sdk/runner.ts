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
  const prompt = buildPrompt(skill, contextWithPR);

  const stream = query({
    prompt,
    options: {
      maxTurns,
      cwd: context.repoPath,
      customSystemPrompt: skill.prompt,
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

function buildPrompt(skill: SkillDefinition, context: EventContext & { pullRequest: NonNullable<EventContext['pullRequest']> }): string {
  const pr = context.pullRequest;

  return `Analyze this pull request and return your findings as JSON matching the SkillReport schema.

## Pull Request Details
- **Number**: #${pr.number}
- **Title**: ${pr.title}
- **Author**: ${pr.author}
- **Base Branch**: ${pr.baseBranch}
- **Head Branch**: ${pr.headBranch}

## Description
${pr.body || '(No description provided)'}

## Files Changed (${pr.files.length} files)
${pr.files.map(f => `- ${f.filename} (+${f.additions}/-${f.deletions})`).join('\n')}

## Instructions
${skill.description}

Return your analysis as a JSON object with this structure:
{
  "skill": "${skill.name}",
  "summary": "Brief summary of your findings",
  "findings": [
    {
      "id": "unique-id",
      "severity": "critical|high|medium|low|info",
      "title": "Short title",
      "description": "Detailed description",
      "location": { "path": "file.ts", "startLine": 10, "endLine": 15 },
      "suggestedFix": { "description": "How to fix", "diff": "unified diff" },
      "labels": ["optional", "labels"]
    }
  ],
  "metadata": {}
}`;
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
