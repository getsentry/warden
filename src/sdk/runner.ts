import { query, type SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import type { SkillDefinition } from '../config/schema.js';
import { FindingSchema } from '../types/index.js';
import type { EventContext, SkillReport, Finding, UsageStats } from '../types/index.js';
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

/** Default concurrency for file-level parallel processing */
const DEFAULT_FILE_CONCURRENCY = 5;

/** Result from analyzing a single hunk */
interface HunkAnalysisResult {
  findings: Finding[];
  usage: UsageStats;
}

/**
 * Extract usage stats from an SDK result message.
 */
function extractUsage(result: SDKResultMessage): UsageStats {
  return {
    inputTokens: result.usage['input_tokens'],
    outputTokens: result.usage['output_tokens'],
    cacheReadInputTokens: result.usage['cache_read_input_tokens'] ?? 0,
    cacheCreationInputTokens: result.usage['cache_creation_input_tokens'] ?? 0,
    costUSD: result.total_cost_usd,
  };
}

/**
 * Create empty usage stats.
 */
function emptyUsage(): UsageStats {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    costUSD: 0,
  };
}

/**
 * Aggregate multiple usage stats into one.
 */
export function aggregateUsage(usages: UsageStats[]): UsageStats {
  return usages.reduce(
    (acc, u) => ({
      inputTokens: acc.inputTokens + u.inputTokens,
      outputTokens: acc.outputTokens + u.outputTokens,
      cacheReadInputTokens: (acc.cacheReadInputTokens ?? 0) + (u.cacheReadInputTokens ?? 0),
      cacheCreationInputTokens: (acc.cacheCreationInputTokens ?? 0) + (u.cacheCreationInputTokens ?? 0),
      costUSD: acc.costUSD + u.costUSD,
    }),
    emptyUsage()
  );
}

/**
 * Callbacks for progress reporting during skill execution.
 */
export interface SkillRunnerCallbacks {
  /** Start time of the skill execution (for elapsed time calculations) */
  skillStartTime?: number;
  onFileStart?: (file: string, index: number, total: number) => void;
  onHunkStart?: (file: string, hunkNum: number, totalHunks: number, lineRange: string) => void;
  onHunkComplete?: (file: string, hunkNum: number, findings: Finding[]) => void;
  onFileComplete?: (file: string, index: number, total: number) => void;
}

export interface SkillRunnerOptions {
  apiKey?: string;
  maxTurns?: number;
  /** Lines of context to include around each hunk */
  contextLines?: number;
  /** Process files in parallel (default: true) */
  parallel?: boolean;
  /** Max concurrent file analyses when parallel=true (default: 5) */
  concurrency?: number;
  /** Model to use for analysis (e.g., 'claude-sonnet-4-20250514'). Uses SDK default if not specified. */
  model?: string;
  /** Progress callbacks */
  callbacks?: SkillRunnerCallbacks;
  /** Abort controller for cancellation on SIGINT */
  abortController?: AbortController;
  /** Path to Claude Code CLI executable. Required in CI environments. */
  pathToClaudeCodeExecutable?: string;
}

/**
 * Builds the system prompt for hunk-based analysis.
 *
 * Future enhancement: Could have the agent output a structured `contextAssessment`
 * (applicationType, trustBoundaries, filesChecked) to cache across hunks, allow
 * user overrides, or build analytics. Not implemented since we don't consume it yet.
 */
function buildHunkSystemPrompt(skill: SkillDefinition): string {
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
- "suggestedFix" is optional - only include when you can provide a complete, correct fix. Omit if the fix would be incomplete or if you're uncertain about the correct solution.
- Keep descriptions SHORT (1-2 sentences max) - avoid lengthy explanations
- Be concise - focus only on the changes shown
</output_format>`,
  ];

  if (skill.rootDir) {
    sections.push(`<skill_resources>
This skill is located at: ${skill.rootDir}
You can read files from scripts/, references/, or assets/ subdirectories using the Read tool with the full path.
</skill_resources>`);
  }

  return sections.join('\n\n');
}

/**
 * Builds the user prompt for a single hunk.
 */
function buildHunkUserPrompt(skill: SkillDefinition, hunkCtx: HunkWithContext): string {
  return `Analyze this code change according to the "${skill.name}" skill criteria.

${formatHunkForAnalysis(hunkCtx)}

IMPORTANT: Only report findings that are explicitly covered by the skill instructions. Do not report general code quality issues, bugs, or improvements unless the skill specifically asks for them. Return an empty findings array if no issues match the skill's criteria.`;
}

/**
 * Result from extracting findings JSON from text.
 */
export type ExtractFindingsResult =
  | { success: true; findings: unknown[] }
  | { success: false; error: string; preview: string };

/**
 * Extract JSON object from text, handling nested braces correctly.
 * Starts from the given position and returns the balanced JSON object.
 */
export function extractBalancedJson(text: string, startIndex: number): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(startIndex, i + 1);
      }
    }
  }

  return null;
}

/**
 * Extract findings JSON from model output text.
 * Handles markdown code fences, prose before JSON, and nested objects.
 */
export function extractFindingsJson(rawText: string): ExtractFindingsResult {
  let text = rawText.trim();

  // Strip markdown code fences if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    text = codeBlockMatch[1].trim();
  }

  // Find the start of the findings JSON object (allow whitespace after opening brace)
  const findingsMatch = text.match(/\{\s*"findings"/);
  if (!findingsMatch || findingsMatch.index === undefined) {
    return {
      success: false,
      error: 'no_findings_json',
      preview: text.slice(0, 200),
    };
  }
  const findingsStart = findingsMatch.index;

  // Extract the balanced JSON object
  const jsonStr = extractBalancedJson(text, findingsStart);
  if (!jsonStr) {
    return {
      success: false,
      error: 'unbalanced_json',
      preview: text.slice(findingsStart, findingsStart + 200),
    };
  }

  // Parse the JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return {
      success: false,
      error: 'invalid_json',
      preview: jsonStr.slice(0, 200),
    };
  }

  // Validate structure
  if (typeof parsed !== 'object' || parsed === null || !('findings' in parsed)) {
    return {
      success: false,
      error: 'missing_findings_key',
      preview: jsonStr.slice(0, 200),
    };
  }

  const findings = (parsed as { findings: unknown }).findings;
  if (!Array.isArray(findings)) {
    return {
      success: false,
      error: 'findings_not_array',
      preview: jsonStr.slice(0, 200),
    };
  }

  return { success: true, findings };
}

/**
 * Parse findings from a hunk analysis result.
 */
function parseHunkOutput(result: SDKResultMessage, filename: string): Finding[] {
  if (result.subtype !== 'success') {
    console.error(`Hunk analysis failed: ${result.subtype}`);
    return [];
  }

  const extracted = extractFindingsJson(result.result);

  if (!extracted.success) {
    const suffix = extracted.preview.length >= 200 ? '...' : '';
    console.error(`${extracted.error}: ${extracted.preview}${suffix}`);
    return [];
  }

  // Validate findings using FindingSchema and ensure correct file path
  return extracted.findings
    .map((f) => {
      // Ensure location has correct file path before validation
      if (typeof f === 'object' && f !== null && 'location' in f) {
        const obj = f as Record<string, unknown>;
        if (obj['location'] && typeof obj['location'] === 'object') {
          obj['location'] = { ...(obj['location'] as object), path: filename };
        }
      }
      return f;
    })
    .filter((f): f is Finding => FindingSchema.safeParse(f).success)
    .map((f) => ({
      ...f,
      // Ensure location has correct file path (in case location was missing before)
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
): Promise<HunkAnalysisResult> {
  const { maxTurns = 50, model, abortController, pathToClaudeCodeExecutable } = options;

  const systemPrompt = buildHunkSystemPrompt(skill);
  const userPrompt = buildHunkUserPrompt(skill, hunkCtx);

  try {
    const stream = query({
      prompt: userPrompt,
      options: {
        maxTurns,
        cwd: repoPath,
        systemPrompt,
        // Only allow read-only tools - context is already provided in the prompt
        allowedTools: ['Read', 'Grep'],
        // Explicitly block modification/side-effect tools as defense-in-depth
        disallowedTools: ['Write', 'Edit', 'Bash', 'WebFetch', 'WebSearch', 'Task', 'TodoWrite'],
        permissionMode: 'bypassPermissions',
        model,
        abortController,
        pathToClaudeCodeExecutable,
      },
    });

    let resultMessage: SDKResultMessage | undefined;

    for await (const message of stream) {
      if (message.type === 'result') {
        resultMessage = message;
      }
    }

    if (!resultMessage) {
      return { findings: [], usage: emptyUsage() };
    }

    return {
      findings: parseHunkOutput(resultMessage, hunkCtx.filename),
      usage: extractUsage(resultMessage),
    };
  } catch (error) {
    // Handle SDK errors (subprocess crashes, API errors, etc.) gracefully
    // so one failing hunk doesn't kill the entire run
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Hunk analysis failed for ${hunkCtx.filename}: ${errorMessage}`);
    return { findings: [], usage: emptyUsage() };
  }
}

/**
 * Deduplicate findings by id and location.
 */
export function deduplicateFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.id}:${f.location?.path}:${f.location?.startLine}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * A file prepared for analysis with its hunks.
 */
export interface PreparedFile {
  filename: string;
  hunks: HunkWithContext[];
}

function groupHunksByFile(hunks: HunkWithContext[]): PreparedFile[] {
  const fileMap = new Map<string, HunkWithContext[]>();

  for (const hunk of hunks) {
    const existing = fileMap.get(hunk.filename);
    if (existing) {
      existing.push(hunk);
    } else {
      fileMap.set(hunk.filename, [hunk]);
    }
  }

  return Array.from(fileMap, ([filename, fileHunks]) => ({ filename, hunks: fileHunks }));
}

/**
 * Get line range string for a hunk.
 */
function getHunkLineRange(hunk: HunkWithContext): string {
  const start = hunk.hunk.newStart;
  const end = start + hunk.hunk.newCount - 1;
  return start === end ? `${start}` : `${start}-${end}`;
}

/**
 * Attach elapsed time to findings if skill start time is available.
 */
function attachElapsedTime(findings: Finding[], skillStartTime: number | undefined): void {
  if (skillStartTime === undefined) return;
  const elapsedMs = Date.now() - skillStartTime;
  for (const finding of findings) {
    finding.elapsedMs = elapsedMs;
  }
}

/**
 * Options for preparing files for analysis.
 */
export interface PrepareFilesOptions {
  /** Lines of context to include around each hunk */
  contextLines?: number;
}

/**
 * Prepare files for analysis by parsing patches into hunks with context.
 * Returns files that have changes to analyze.
 */
export function prepareFiles(
  context: EventContext,
  options: PrepareFilesOptions = {}
): PreparedFile[] {
  const { contextLines = 20 } = options;

  if (!context.pullRequest) {
    return [];
  }

  const pr = context.pullRequest;
  const allHunks: HunkWithContext[] = [];

  for (const file of pr.files) {
    if (!file.patch) continue;

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

  return groupHunksByFile(allHunks);
}

/**
 * Callbacks for per-file analysis progress.
 */
export interface FileAnalysisCallbacks {
  skillStartTime?: number;
  onHunkStart?: (hunkNum: number, totalHunks: number, lineRange: string) => void;
  onHunkComplete?: (hunkNum: number, findings: Finding[]) => void;
}

/**
 * Result from analyzing a single file.
 */
export interface FileAnalysisResult {
  filename: string;
  findings: Finding[];
  usage: UsageStats;
}

/**
 * Analyze a single prepared file's hunks.
 */
export async function analyzeFile(
  skill: SkillDefinition,
  file: PreparedFile,
  repoPath: string,
  options: SkillRunnerOptions = {},
  callbacks?: FileAnalysisCallbacks
): Promise<FileAnalysisResult> {
  const { abortController } = options;
  const fileFindings: Finding[] = [];
  const fileUsage: UsageStats[] = [];

  for (const [hunkIndex, hunk] of file.hunks.entries()) {
    if (abortController?.signal.aborted) break;

    const lineRange = getHunkLineRange(hunk);
    callbacks?.onHunkStart?.(hunkIndex + 1, file.hunks.length, lineRange);

    const result = await analyzeHunk(skill, hunk, repoPath, options);

    attachElapsedTime(result.findings, callbacks?.skillStartTime);
    callbacks?.onHunkComplete?.(hunkIndex + 1, result.findings);

    fileFindings.push(...result.findings);
    fileUsage.push(result.usage);
  }

  return {
    filename: file.filename,
    findings: fileFindings,
    usage: aggregateUsage(fileUsage),
  };
}

/**
 * Run a skill on a PR, analyzing each hunk separately.
 */
export async function runSkill(
  skill: SkillDefinition,
  context: EventContext,
  options: SkillRunnerOptions = {}
): Promise<SkillReport> {
  const { parallel = true, callbacks, abortController } = options;
  const startTime = Date.now();

  if (!context.pullRequest) {
    throw new SkillRunnerError('Pull request context required for skill execution');
  }

  // Prepare files using shared logic
  const fileHunks = prepareFiles(context, { contextLines: options.contextLines });

  if (fileHunks.length === 0) {
    return {
      skill: skill.name,
      summary: 'No code changes to analyze',
      findings: [],
      usage: emptyUsage(),
      durationMs: Date.now() - startTime,
    };
  }

  const totalFiles = fileHunks.length;
  const allFindings: Finding[] = [];

  // Track all usage stats for aggregation
  const allUsage: UsageStats[] = [];

  /**
   * Process all hunks for a single file sequentially.
   */
  async function processFile(
    fileHunkEntry: PreparedFile,
    fileIndex: number
  ): Promise<{ findings: Finding[]; usage: UsageStats[] }> {
    const { filename, hunks } = fileHunkEntry;
    const fileFindings: Finding[] = [];
    const fileUsage: UsageStats[] = [];

    // Report file start
    callbacks?.onFileStart?.(filename, fileIndex, totalFiles);

    // Process hunks sequentially within each file
    for (const [hunkIndex, hunk] of hunks.entries()) {
      // Check for abort before starting new hunk
      if (abortController?.signal.aborted) break;

      const lineRange = getHunkLineRange(hunk);

      callbacks?.onHunkStart?.(filename, hunkIndex + 1, hunks.length, lineRange);

      const result = await analyzeHunk(skill, hunk, context.repoPath, options);

      attachElapsedTime(result.findings, callbacks?.skillStartTime);
      callbacks?.onHunkComplete?.(filename, hunkIndex + 1, result.findings);
      fileFindings.push(...result.findings);
      fileUsage.push(result.usage);
    }

    // Report file complete
    callbacks?.onFileComplete?.(filename, fileIndex, totalFiles);

    return { findings: fileFindings, usage: fileUsage };
  }

  // Process files - parallel or sequential based on options
  if (parallel) {
    // Process files in parallel with concurrency limit
    const fileConcurrency = options.concurrency ?? DEFAULT_FILE_CONCURRENCY;

    for (let i = 0; i < fileHunks.length; i += fileConcurrency) {
      // Check for abort before starting new batch
      if (abortController?.signal.aborted) break;

      const batch = fileHunks.slice(i, i + fileConcurrency);
      const batchPromises = batch.map((fileHunkEntry, batchIndex) =>
        processFile(fileHunkEntry, i + batchIndex)
      );

      const batchResults = await Promise.all(batchPromises);
      for (const result of batchResults) {
        allFindings.push(...result.findings);
        allUsage.push(...result.usage);
      }
    }
  } else {
    // Process files sequentially
    for (const [fileIndex, fileHunkEntry] of fileHunks.entries()) {
      // Check for abort before starting new file
      if (abortController?.signal.aborted) break;

      const result = await processFile(fileHunkEntry, fileIndex);
      allFindings.push(...result.findings);
      allUsage.push(...result.usage);
    }
  }

  // Deduplicate findings
  const uniqueFindings = deduplicateFindings(allFindings);

  // Generate summary
  const summary = generateSummary(skill.name, uniqueFindings);

  // Aggregate usage across all hunks
  const totalUsage = aggregateUsage(allUsage);

  return {
    skill: skill.name,
    summary,
    findings: uniqueFindings,
    usage: totalUsage,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Generate a summary of findings.
 */
export function generateSummary(skillName: string, findings: Finding[]): string {
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
