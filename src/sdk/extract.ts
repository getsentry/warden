import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import { FindingSchema, compareFindingPriority } from '../types/index.js';
import type { Finding, Location, UsageStats } from '../types/index.js';
import { Sentry } from '../sentry.js';
import { callHaiku, HAIKU_MODEL, setGenAiResponseAttrs } from './haiku.js';
import { apiUsageToStats } from './pricing.js';

/** Pattern to match the start of findings JSON (allows whitespace after brace) */
export const FINDINGS_JSON_START = /\{\s*"findings"/;

/**
 * Result from extracting findings JSON from text.
 */
export type ExtractFindingsResult =
  | { success: true; findings: unknown[]; usage?: UsageStats }
  | { success: false; error: string; preview: string; usage?: UsageStats };

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

  // Strip markdown code fences if present (handles any language tag: ```json, ```typescript, ```c++, etc.)
  const codeBlockMatch = text.match(/```[\w+#-]*\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    text = codeBlockMatch[1].trim();
  }

  // Find the start of the findings JSON object
  const findingsMatch = text.match(FINDINGS_JSON_START);
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

/** Max characters to send to LLM fallback (roughly ~8k tokens) */
const LLM_FALLBACK_MAX_CHARS = 32000;

/** Max tokens for LLM fallback responses */
const LLM_FALLBACK_MAX_TOKENS = 4096;

/** Timeout for LLM fallback API calls in milliseconds */
const LLM_FALLBACK_TIMEOUT_MS = 30000;

/**
 * Truncate text for LLM fallback while preserving the findings JSON.
 *
 * Caller must ensure findings JSON exists in the text before calling.
 */
export function truncateForLLMFallback(rawText: string, maxChars: number): string {
  if (rawText.length <= maxChars) {
    return rawText;
  }

  const findingsIndex = rawText.match(FINDINGS_JSON_START)?.index ?? -1;

  // If findings starts within our budget, simple truncation from start preserves it
  if (findingsIndex < maxChars - 20) {
    return rawText.slice(0, maxChars) + '\n[... truncated]';
  }

  // Findings is beyond our budget - skip to just before it
  // Keep minimal context (10% of budget or 200 chars, whichever is smaller)
  const markerOverhead = 40;
  const usableBudget = maxChars - markerOverhead;
  const contextBefore = Math.min(200, Math.floor(usableBudget * 0.1), findingsIndex);
  const startIndex = findingsIndex - contextBefore;
  const endIndex = startIndex + usableBudget;

  const truncatedContent = rawText.slice(startIndex, endIndex);
  const suffix = endIndex < rawText.length ? '\n[... truncated]' : '';

  return '[... truncated ...]\n' + truncatedContent + suffix;
}

/**
 * Extract findings from malformed output using LLM as a fallback.
 * Uses Haiku for lightweight, fast extraction.
 */
export async function extractFindingsWithLLM(
  rawText: string,
  apiKey?: string
): Promise<ExtractFindingsResult> {
  if (!apiKey) {
    return {
      success: false,
      error: 'no_api_key_for_fallback',
      preview: rawText.slice(0, 200),
    };
  }

  // If no findings anchor exists, there's nothing to extract
  if (!FINDINGS_JSON_START.test(rawText)) {
    return {
      success: false,
      error: 'no_findings_to_extract',
      preview: rawText.slice(0, 200),
    };
  }

  // Truncate input while preserving JSON boundaries
  const truncatedText = truncateForLLMFallback(rawText, LLM_FALLBACK_MAX_CHARS);

  return Sentry.startSpan(
    {
      op: 'gen_ai.chat',
      name: `chat ${HAIKU_MODEL}`,
      attributes: {
        'gen_ai.operation.name': 'chat',
        'gen_ai.provider.name': 'anthropic',
        'gen_ai.request.model': HAIKU_MODEL,
        'gen_ai.request.max_tokens': LLM_FALLBACK_MAX_TOKENS,
      },
    },
    async (span) => {
      try {
        const client = new Anthropic({ apiKey, timeout: LLM_FALLBACK_TIMEOUT_MS });
        const userContent = `Extract the findings JSON from this model output.
Return ONLY valid JSON in format: {"findings": [...]}
If no findings exist, return: {"findings": []}

Model output:
${truncatedText}`;
        const messages: Anthropic.MessageParam[] = [
          { role: 'user', content: userContent },
        ];

        span.setAttribute('gen_ai.request.messages', JSON.stringify(messages));

        const response = await client.messages.create({
          model: HAIKU_MODEL,
          max_tokens: LLM_FALLBACK_MAX_TOKENS,
          messages,
        });

        const usage = apiUsageToStats(HAIKU_MODEL, response.usage);

        const content = response.content[0];
        if (!content || content.type !== 'text') {
          setGenAiResponseAttrs(span, response.usage, response.stop_reason);
          return {
            success: false,
            error: 'llm_unexpected_response',
            preview: rawText.slice(0, 200),
            usage,
          };
        }

        setGenAiResponseAttrs(span, response.usage, response.stop_reason, content.text);

        // Parse the LLM response as JSON
        const result = extractFindingsJson(content.text);
        return { ...result, usage };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: `llm_extraction_failed: ${errorMessage}`,
          preview: rawText.slice(0, 200),
        };
      }
    },
  );
}

/** Unambiguous uppercase alphanumeric alphabet (no O/0, I/1). */
const SHORT_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Length of each generated short ID (before formatting). */
export const SHORT_ID_LENGTH = 6;

/**
 * Generate a short human-readable ID for a finding.
 * Format: XXX-XXX (e.g., K7M-X9P)
 */
export function generateShortId(): string {
  const raw = customAlphabet(SHORT_ID_ALPHABET, SHORT_ID_LENGTH)();
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

/**
 * Validate and normalize findings from extracted JSON.
 * Replaces the LLM-provided ID with a short nanoid for stable cross-referencing.
 */
export function validateFindings(findings: unknown[], filename: string): Finding[] {
  const validated: Finding[] = [];

  for (const f of findings) {
    // Normalize location path before validation
    if (typeof f === 'object' && f !== null && 'location' in f) {
      const loc = (f as Record<string, unknown>)['location'];
      if (loc && typeof loc === 'object') {
        (loc as Record<string, unknown>)['path'] = filename;
      }
    }

    const result = FindingSchema.safeParse(f);
    if (result.success) {
      validated.push({
        ...result.data,
        id: generateShortId(),
        location: result.data.location ? { ...result.data.location, path: filename } : undefined,
      });
    }
  }

  return validated;
}

/**
 * Deduplicate findings by title and location.
 */
export function deduplicateFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.title}:${f.location?.path}:${f.location?.startLine}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Cross-location merging
// ---------------------------------------------------------------------------

/**
 * Transfer locations from loser findings to the winner.
 * Each loser's primary location and any existing additionalLocations are
 * appended to winner.additionalLocations. Mutates the winner in place.
 *
 * @param sortedGroup - Findings sorted by priority (winner first, losers after).
 * @returns The winner finding with merged locations, or undefined if the group is empty.
 */
export function mergeGroupLocations(sortedGroup: Finding[]): Finding | undefined {
  const winner = sortedGroup[0];
  if (!winner) return undefined;

  const losers = sortedGroup.slice(1);
  if (losers.length === 0) return winner;

  const extraLocations: Location[] = winner.additionalLocations
    ? [...winner.additionalLocations]
    : [];

  for (const loser of losers) {
    if (loser.location) {
      extraLocations.push(loser.location);
    }
    if (loser.additionalLocations) {
      extraLocations.push(...loser.additionalLocations);
    }
  }

  if (extraLocations.length === 0) return winner;

  // Deduplicate locations by path:startLine:endLine, seeding with winner's primary location
  const seen = new Set<string>();
  if (winner.location) {
    seen.add(`${winner.location.path}:${winner.location.startLine}:${winner.location.endLine ?? ''}`);
  }
  const uniqueLocations = extraLocations.filter((loc) => {
    const key = `${loc.path}:${loc.startLine}:${loc.endLine ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Return a shallow copy to avoid mutating the original finding
  return { ...winner, additionalLocations: uniqueLocations };
}

/** Schema for LLM merge response: groups of finding indices sharing a root cause. */
const MergeGroupsSchema = z.array(z.array(z.number().int()));

/**
 * Result from merging cross-location findings.
 */
export interface MergeResult {
  findings: Finding[];
  mergedCount: number;
  usage?: UsageStats;
}

/**
 * Read a code snippet from disk around a given line.
 * Returns empty string on any I/O error.
 */
function readSnippet(repoPath: string, filePath: string, startLine: number, contextLines = 3): string {
  try {
    const fullPath = join(repoPath, filePath);
    const content = readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    const start = Math.max(0, startLine - 1 - contextLines);
    const end = Math.min(lines.length, startLine - 1 + contextLines + 1);
    return lines.slice(start, end).join('\n');
  } catch {
    return '';
  }
}

/**
 * Merge findings that describe the same issue across different code locations.
 *
 * Uses Haiku to identify groups of findings about the same root cause at
 * different locations. For each group, the highest-priority finding becomes
 * the primary; other locations move to `additionalLocations`.
 *
 * Skips entirely (no LLM call) when:
 * - Fewer than 2 findings have locations
 * - No API key is provided
 */
export async function mergeCrossLocationFindings(
  findings: Finding[],
  options?: { apiKey?: string; repoPath?: string }
): Promise<MergeResult> {
  const apiKey = options?.apiKey;
  const repoPath = options?.repoPath ?? '.';

  // Early exit: need at least 2 located findings to merge
  const withLocations = findings.filter((f) => f.location);
  if (withLocations.length < 2 || !apiKey) {
    return { findings, mergedCount: 0 };
  }

  // Build context for each finding (all have locations per the filter above)
  const findingDescriptions = withLocations.map((f, i) => {
    const loc = f.location;
    if (!loc) return ''; // Unreachable: filtered above, satisfies type narrowing
    const range = loc.endLine ? `${loc.startLine}-${loc.endLine}` : `${loc.startLine}`;
    const snippet = readSnippet(repoPath, loc.path, loc.startLine);
    const codeBlock = snippet ? `\n   Code: ${snippet.split('\n').join('\n   ')}` : '';
    return `${i + 1}. [${loc.path}:${range}] "${f.title}" - ${f.description}${codeBlock}`;
  });

  const prompt = `Identify which of these code review findings describe the SAME underlying issue appearing at different locations. Group them by shared root cause.

Findings:
${findingDescriptions.join('\n')}

Return a JSON array of arrays, where each inner array contains the 1-based indices of findings about the same issue.
Singletons should not appear. Return [] if no findings describe the same issue.`;

  const result = await callHaiku({
    apiKey,
    prompt,
    schema: MergeGroupsSchema,
    maxTokens: 512,
  });

  if (!result.success) {
    return { findings, mergedCount: 0, usage: result.usage };
  }

  // Process groups: merge locations into winner
  const absorbed = new Set<Finding>();
  // Map from original finding to its merged replacement (with additionalLocations)
  const replacements = new Map<Finding, Finding>();

  for (const group of result.data) {
    // Deduplicate indices to prevent the winner from being absorbed
    const uniqueIndices = [...new Set(group)];
    if (uniqueIndices.length < 2) continue;

    const groupFindings = uniqueIndices
      .map((idx) => withLocations[idx - 1])
      .filter((f): f is Finding => f !== undefined && !absorbed.has(f));

    if (groupFindings.length < 2) continue;

    // Pick winner: highest severity → confidence → path → line
    const sorted = [...groupFindings].sort(compareFindingPriority);
    const winner = sorted[0];
    // Substitute any existing replacements to preserve locations from prior groups.
    // This covers both winners and losers that accumulated locations earlier.
    for (let i = 0; i < sorted.length; i++) {
      const f = sorted[i];
      if (!f) continue;
      const existing = replacements.get(f);
      if (existing) sorted[i] = existing;
    }
    const merged = mergeGroupLocations(sorted);
    if (winner && merged) {
      replacements.set(winner, merged);
    }

    // Track original findings (not substituted replacements) so the final
    // filter on original references correctly removes absorbed items.
    for (const f of groupFindings) {
      if (f !== winner) {
        absorbed.add(f);
      }
    }
  }

  if (absorbed.size === 0) {
    return { findings, mergedCount: 0, usage: result.usage };
  }

  const merged = findings
    .filter((f) => !absorbed.has(f))
    .map((f) => replacements.get(f) ?? f);
  return { findings: merged, mergedCount: absorbed.size, usage: result.usage };
}
