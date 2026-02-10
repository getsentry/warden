import Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';
import type { UsageStats } from '../types/index.js';
/**
 * Extract the first JSON object or array from LLM text.
 * Handles markdown code fences and prose before/after JSON.
 */
export declare function extractJson(text: string): string | null;
/**
 * Result from a structured Haiku call.
 */
export type HaikuResult<T> = {
    success: true;
    data: T;
    usage: UsageStats;
} | {
    success: false;
    error: string;
    usage: UsageStats;
};
/**
 * Options for callHaiku.
 */
export interface CallHaikuOptions<T> {
    apiKey: string;
    prompt: string;
    schema: z.ZodType<T>;
    maxTokens?: number;
    timeout?: number;
}
/**
 * Single-turn structured Haiku call.
 * Auto-prefills based on Zod schema type, extracts JSON, validates with Zod.
 */
export declare function callHaiku<T>(options: CallHaikuOptions<T>): Promise<HaikuResult<T>>;
/**
 * Options for callHaikuWithTools.
 */
export interface CallHaikuWithToolsOptions<T> {
    apiKey: string;
    prompt: string;
    schema: z.ZodType<T>;
    tools: Anthropic.Tool[];
    executeTool: (name: string, input: Record<string, unknown>) => Promise<string>;
    maxTokens?: number;
    maxIterations?: number;
    timeout?: number;
}
/**
 * Multi-turn Haiku call with tool use loop.
 * Iterates tool calls until the model produces a final text response.
 * Accumulates usage across all iterations.
 */
export declare function callHaikuWithTools<T>(options: CallHaikuWithToolsOptions<T>): Promise<HaikuResult<T>>;
//# sourceMappingURL=haiku.d.ts.map