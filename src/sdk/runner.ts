import { query, type SDKResultMessage } from '@anthropic-ai/claude-code';
import type { SkillDefinition } from '../config/schema.js';
import type { EventContext, SkillReport, Finding } from '../types/index.js';
import {
  parseFileDiff,
  expandDiffContext,
  formatHunkForAnalysis,
  type HunkWithContext,
} from '../diff/index.js';

export class SkillRunnerError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SkillRunnerError';
  }
}

export interface SkillRunnerOptions {
  apiKey?: string;
  maxTurns?: number;
  /** Lines of context to include around each hunk */
  contextLines?: number;
  /** Process hunks in parallel (default: true) */
  parallel?: boolean;
  /** Max concurrent hunk analyses when parallel=true (default: 5) */
  concurrency?: number;
  /** Model to use for analysis (e.g., 'claude-sonnet-4-20250514'). Uses SDK default if not specified. */
  model?: string;
}

/**
 * Process items with limited concurrency using chunked batches.
 */
async function processInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize: number
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Builds the system prompt for hunk-based analysis.
 */
function buildHunkSystemPrompt(skill: SkillDefinition): string {
  return `You are a code analysis agent for Warden. You analyze code changes and report findings in a structured JSON format.

## Your Analysis Task

${skill.prompt}

## Output Format

Return ONLY a JSON object (no markdown fences, no explanation):

{
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
      }
    }
  ]
}

Requirements:
- Return ONLY valid JSON
- "findings" array can be empty if no issues found
- "location" is required - use the file path and line numbers from the context provided
- "suggestedFix" is optional
- Be concise - focus only on the changes shown`;
}

/**
 * Builds the user prompt for a single hunk.
 */
function buildHunkUserPrompt(hunkCtx: HunkWithContext): string {
  return `Analyze this code change for issues:

${formatHunkForAnalysis(hunkCtx)}

Focus only on the changes shown. Report any issues found, or return an empty findings array if the code looks good.`;
}

/**
 * Parse findings from a hunk analysis result.
 */
function parseHunkOutput(result: SDKResultMessage, filename: string): Finding[] {
  if (result.subtype !== 'success') {
    // Don't fail the whole run for one hunk
    console.error(`Hunk analysis failed: ${result.subtype}`);
    return [];
  }

  const text = result.result;

  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('No JSON found in hunk output');
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    console.error('Failed to parse hunk JSON output');
    return [];
  }

  // Validate findings array
  if (typeof parsed !== 'object' || parsed === null || !('findings' in parsed)) {
    return [];
  }

  const findings = (parsed as { findings: unknown }).findings;
  if (!Array.isArray(findings)) {
    return [];
  }

  // Validate and filter findings, ensuring they have the correct file path
  return findings
    .filter((f): f is Finding => {
      if (typeof f !== 'object' || f === null) return false;
      const obj = f as Record<string, unknown>;
      return (
        typeof obj['id'] === 'string' &&
        typeof obj['severity'] === 'string' &&
        typeof obj['title'] === 'string' &&
        typeof obj['description'] === 'string'
      );
    })
    .map((f) => ({
      ...f,
      // Ensure location has correct file path
      location: f.location ? { ...f.location, path: filename } : undefined,
    }));
}

/**
 * Analyze a single hunk.
 */
async function analyzeHunk(
  skill: SkillDefinition,
  hunkCtx: HunkWithContext,
  repoPath: string,
  options: SkillRunnerOptions
): Promise<Finding[]> {
  const { maxTurns = 5, model } = options;

  const systemPrompt = buildHunkSystemPrompt(skill);
  const userPrompt = buildHunkUserPrompt(hunkCtx);

  const stream = query({
    prompt: userPrompt,
    options: {
      maxTurns,
      cwd: repoPath,
      customSystemPrompt: systemPrompt,
      // Minimal tools for hunk analysis - context is already provided
      allowedTools: ['Read', 'Grep'],
      disallowedTools: ['Write', 'Edit', 'Bash', 'WebFetch', 'WebSearch'],
      permissionMode: 'bypassPermissions',
      model,
    },
  });

  let resultMessage: SDKResultMessage | undefined;

  for await (const message of stream) {
    if (message.type === 'result') {
      resultMessage = message;
    }
  }

  if (!resultMessage) {
    return [];
  }

  return parseHunkOutput(resultMessage, hunkCtx.filename);
}

/**
 * Deduplicate findings by id and location.
 */
function deduplicateFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.id}:${f.location?.path}:${f.location?.startLine}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Run a skill on a PR, analyzing each hunk separately.
 */
export async function runSkill(
  skill: SkillDefinition,
  context: EventContext,
  options: SkillRunnerOptions = {}
): Promise<SkillReport> {
  const { contextLines = 20, parallel = true } = options;

  if (!context.pullRequest) {
    throw new SkillRunnerError('Pull request context required for skill execution');
  }

  const pr = context.pullRequest;
  const allFindings: Finding[] = [];

  // Collect all hunks from all files
  const allHunks: HunkWithContext[] = [];

  for (const file of pr.files) {
    if (!file.patch) continue;

    // Map file status to diff parser's expected types
    const statusMap: Record<string, 'added' | 'removed' | 'modified' | 'renamed'> = {
      added: 'added',
      removed: 'removed',
      modified: 'modified',
      renamed: 'renamed',
      copied: 'added',
      changed: 'modified',
      unchanged: 'modified',
    };
    const status = statusMap[file.status] ?? 'modified';

    const diff = parseFileDiff(file.filename, file.patch, status);
    const hunksWithContext = expandDiffContext(context.repoPath, diff, contextLines);
    allHunks.push(...hunksWithContext);
  }

  if (allHunks.length === 0) {
    return {
      skill: skill.name,
      summary: 'No code changes to analyze',
      findings: [],
    };
  }

  // Analyze hunks
  if (parallel) {
    // Process hunks in parallel with concurrency limit
    const { concurrency = 5 } = options;
    const results = await processInBatches(
      allHunks,
      (hunk) => analyzeHunk(skill, hunk, context.repoPath, options),
      concurrency
    );
    for (const findings of results) {
      allFindings.push(...findings);
    }
  } else {
    // Process hunks sequentially
    for (const hunk of allHunks) {
      const findings = await analyzeHunk(skill, hunk, context.repoPath, options);
      allFindings.push(...findings);
    }
  }

  // Deduplicate findings
  const uniqueFindings = deduplicateFindings(allFindings);

  // Generate summary
  const summary = generateSummary(skill.name, uniqueFindings);

  return {
    skill: skill.name,
    summary,
    findings: uniqueFindings,
  };
}

/**
 * Generate a summary of findings.
 */
function generateSummary(skillName: string, findings: Finding[]): string {
  if (findings.length === 0) {
    return `${skillName}: No issues found`;
  }

  const counts: Record<string, number> = {};
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  }

  const parts: string[] = [];
  if (counts['critical']) parts.push(`${counts['critical']} critical`);
  if (counts['high']) parts.push(`${counts['high']} high`);
  if (counts['medium']) parts.push(`${counts['medium']} medium`);
  if (counts['low']) parts.push(`${counts['low']} low`);
  if (counts['info']) parts.push(`${counts['info']} info`);

  return `${skillName}: Found ${findings.length} issue${findings.length === 1 ? '' : 's'} (${parts.join(', ')})`;
}

// Legacy export for backwards compatibility
export { buildHunkSystemPrompt as buildSystemPrompt };
