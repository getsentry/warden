import Anthropic from '@anthropic-ai/sdk';
import { customAlphabet } from 'nanoid';
import { FindingSchema } from '../types/index.js';
import type { Finding, UsageStats } from '../types/index.js';
import { Sentry } from '../sentry.js';
import { HAIKU_MODEL, setGenAiResponseAttrs } from './haiku.js';
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
        const response = await client.messages.create({
          model: HAIKU_MODEL,
          max_tokens: LLM_FALLBACK_MAX_TOKENS,
          messages: [
            {
              role: 'user',
              content: `Extract the findings JSON from this model output.
Return ONLY valid JSON in format: {"findings": [...]}
If no findings exist, return: {"findings": []}

Model output:
${truncatedText}`,
            },
          ],
        });

        const usage = apiUsageToStats(HAIKU_MODEL, response.usage);
        setGenAiResponseAttrs(span, response.usage, response.stop_reason);

        const content = response.content[0];
        if (!content || content.type !== 'text') {
          return {
            success: false,
            error: 'llm_unexpected_response',
            preview: rawText.slice(0, 200),
            usage,
          };
        }

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
