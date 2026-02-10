import type { Finding, UsageStats } from '../types/index.js';
/** Pattern to match the start of findings JSON (allows whitespace after brace) */
export declare const FINDINGS_JSON_START: RegExp;
/**
 * Result from extracting findings JSON from text.
 */
export type ExtractFindingsResult = {
    success: true;
    findings: unknown[];
    usage?: UsageStats;
} | {
    success: false;
    error: string;
    preview: string;
    usage?: UsageStats;
};
/**
 * Extract JSON object from text, handling nested braces correctly.
 * Starts from the given position and returns the balanced JSON object.
 */
export declare function extractBalancedJson(text: string, startIndex: number): string | null;
/**
 * Extract findings JSON from model output text.
 * Handles markdown code fences, prose before JSON, and nested objects.
 */
export declare function extractFindingsJson(rawText: string): ExtractFindingsResult;
/**
 * Truncate text for LLM fallback while preserving the findings JSON.
 *
 * Caller must ensure findings JSON exists in the text before calling.
 */
export declare function truncateForLLMFallback(rawText: string, maxChars: number): string;
/**
 * Extract findings from malformed output using LLM as a fallback.
 * Uses claude-haiku-4-5 for lightweight, fast extraction.
 */
export declare function extractFindingsWithLLM(rawText: string, apiKey?: string): Promise<ExtractFindingsResult>;
/** Length of each generated short ID (before formatting). */
export declare const SHORT_ID_LENGTH = 6;
/**
 * Generate a short human-readable ID for a finding.
 * Format: XXX-XXX (e.g., K7M-X9P)
 */
export declare function generateShortId(): string;
/**
 * Validate and normalize findings from extracted JSON.
 * Replaces the LLM-provided ID with a short nanoid for stable cross-referencing.
 */
export declare function validateFindings(findings: unknown[], filename: string): Finding[];
/**
 * Deduplicate findings by title and location.
 */
export declare function deduplicateFindings(findings: Finding[]): Finding[];
//# sourceMappingURL=extract.d.ts.map