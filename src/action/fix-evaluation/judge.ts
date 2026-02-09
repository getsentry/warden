import type Anthropic from '@anthropic-ai/sdk';
import type { Octokit } from '@octokit/rest';
import type { ExistingComment } from '../../output/dedup.js';
import { callHaikuWithTools } from '../../sdk/haiku.js';
import { emptyUsage } from '../../sdk/usage.js';
import { FixJudgeVerdictSchema } from './types.js';
import type { FixJudgeResult } from './types.js';
import { fetchFileContent, fetchFileLines } from './github.js';

export interface FixJudgeInput {
  comment: ExistingComment;
  changedFiles: string[];
  codeBeforeFix: string;
  codeAfterFix?: string;
  commitMessages?: string[];
}

export interface FixJudgeContext {
  octokit: Octokit;
  owner: string;
  repo: string;
  baseSha: string;
  headSha: string;
  patches: Map<string, string>;
}

const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'get_file_diff',
    description: 'Get the unified diff showing what changed in a file between the two commits.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path to get diff for' },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_file_at_commit',
    description:
      'Get file content at a specific commit. Use "before" for pre-fix state, "after" for post-fix state. Optionally specify line range.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path to fetch' },
        commit: { type: 'string', enum: ['before', 'after'], description: 'before = pre-fix, after = post-fix' },
        startLine: { type: 'number', description: 'Start line (1-indexed, inclusive)' },
        endLine: { type: 'number', description: 'End line (1-indexed, inclusive)' },
      },
      required: ['path', 'commit'],
    },
  },
];

function buildPrompt(input: FixJudgeInput): string {
  const { comment, changedFiles, codeBeforeFix, codeAfterFix, commitMessages } = input;

  const afterCodeSection = codeAfterFix
    ? `

## Code at Issue Location (AFTER this commit)
\`\`\`
${codeAfterFix}
\`\`\``
    : '';

  const commitMessagesSection =
    commitMessages && commitMessages.length > 0
      ? `

## Commit Messages (Developer Intent)
${commitMessages.map((msg, i) => `${i + 1}. ${msg.split('\n')[0]}`).join('\n')}

Use these to help understand what the developer was trying to do. A commit mentioning "fix" or the issue topic suggests intent to address it.`
      : '';

  const investigationStrategy = codeAfterFix
    ? `## Investigation Strategy

Compare the BEFORE and AFTER code above to determine if the issue was fixed.
Use tools only if you need additional context:

- \`get_file_diff(path)\` - See unified diff of changes to a file
- \`get_file_at_commit(path, "before"|"after", startLine?, endLine?)\` - Read more file content if needed`
    : `## Investigation Strategy

Use tools to determine if the issue was fixed:

1. **Start with get_file_diff** on the issue's file (if changed) to see what was modified
2. **Use get_file_at_commit with "after"** to see the current state at the issue location
3. **Check related files** if the fix might involve changes elsewhere (imports, shared utilities, etc.)

Tools:
- \`get_file_diff(path)\` - See unified diff of changes to a file
- \`get_file_at_commit(path, "before"|"after", startLine?, endLine?)\` - Read file content at either commit`;

  return `# Task: Judge whether a code change fixed a reported issue

**Key Question: Does the reported issue still exist in the code after this commit?**

## Verdict Definitions

Choose ONE verdict based on these criteria:

**resolved** - The issue NO LONGER EXISTS. Evidence:
- The problematic code was corrected (directly or via equivalent fix)
- The code was refactored in a way that eliminates the issue by design
- The problematic code was intentionally removed (file deleted, function removed, dead code cleaned up)

**attempted_failed** - A fix was CLEARLY ATTEMPTED but the issue PERSISTS. Evidence:
- Changes DIRECTLY modify the reported file at or near the issue location
- AND the changes appear specifically intended to address THIS issue
- BUT the core issue remains (wrong fix, incomplete fix, edge cases missed)
- Use this ONLY when there's clear evidence of intent to fix THIS specific issue
- Do NOT use for general refactoring, unrelated bug fixes, or changes to other files
- When in doubt between attempted_failed and not_attempted, prefer not_attempted

**not_attempted** - The issue was NOT ADDRESSED. Evidence:
- No changes to the problematic code or its logic
- Changes are unrelated (different feature, different bug, unrelated refactor)
- The reported code is identical or functionally unchanged
- Changes are in other files with no clear connection to the reported issue

## The Reported Issue

**Title:** ${comment.title}
**File:** ${comment.path}
**Line:** ${comment.line}

**Description:**
${comment.description}

## Code at Issue Location (BEFORE this commit)
\`\`\`
${codeBeforeFix}
\`\`\`
${afterCodeSection}

## Changed Files in This Commit
${changedFiles.map((f) => `- ${f}`).join('\n')}
${commitMessagesSection}

${investigationStrategy}

## Response Format

IMPORTANT: Your response must be ONLY a JSON object with no other text. Do not explain your reasoning in prose - put your one-sentence explanation in the "reasoning" field.

{"status": "resolved|attempted_failed|not_attempted", "reasoning": "One sentence explaining your verdict"}`;
}

function createToolExecutor(ctx: FixJudgeContext): (name: string, input: Record<string, unknown>) => Promise<string> {
  return async (name: string, input: Record<string, unknown>): Promise<string> => {
    if (name === 'get_file_diff') {
      const path = input['path'] as string;
      const patch = ctx.patches.get(path);
      return patch ?? 'No changes found for this file';
    }

    if (name === 'get_file_at_commit') {
      const path = input['path'] as string;
      const commit = input['commit'] as 'before' | 'after';
      const startLine = input['startLine'] as number | undefined;
      const endLine = input['endLine'] as number | undefined;
      const sha = commit === 'before' ? ctx.baseSha : ctx.headSha;

      try {
        if (startLine !== undefined && endLine !== undefined) {
          return await fetchFileLines(ctx.octokit, ctx.owner, ctx.repo, path, sha, startLine, endLine);
        }

        const content = await fetchFileContent(ctx.octokit, ctx.owner, ctx.repo, path, sha);
        const lines = content.split('\n');

        if (lines.length > 100) {
          const numbered = lines.slice(0, 100).map((line, i) => `${i + 1}: ${line}`);
          return `${numbered.join('\n')}\n\n[... ${lines.length - 100} more lines truncated]`;
        }

        return lines.map((line, i) => `${i + 1}: ${line}`).join('\n');
      } catch (error) {
        return `Error fetching file: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    return `Unknown tool: ${name}`;
  };
}

/**
 * Evaluate whether a code change fixed a reported issue.
 * Uses Haiku with tool use to explore the changes.
 */
export async function evaluateFix(
  input: FixJudgeInput,
  context: FixJudgeContext,
  apiKey: string
): Promise<FixJudgeResult> {
  const fallback: FixJudgeResult = {
    verdict: { status: 'not_attempted', reasoning: 'Evaluation failed' },
    usage: emptyUsage(),
    usedFallback: true,
  };

  const prompt = buildPrompt(input);
  const executeTool = createToolExecutor(context);

  const result = await callHaikuWithTools({
    apiKey,
    prompt,
    schema: FixJudgeVerdictSchema,
    tools: TOOL_DEFINITIONS,
    executeTool,
    maxIterations: 5,
  });

  if (result.success) {
    return { verdict: result.data, usage: result.usage, usedFallback: false };
  }

  return { ...fallback, usage: result.usage };
}
