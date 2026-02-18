import Anthropic from '@anthropic-ai/sdk';
import type { Span } from '@sentry/node';
import type { z } from 'zod';
import type { UsageStats } from '../types/index.js';
import { Sentry } from '../sentry.js';
import { apiUsageToStats } from './pricing.js';
import { aggregateUsage, emptyUsage } from './usage.js';

export const HAIKU_MODEL = 'claude-haiku-4-5';
export const DEFAULT_AUXILIARY_MAX_RETRIES = 5;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Anthropic Messages API usage shape accepted by setGenAiResponseAttrs.
 */
interface ApiResponseUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/**
 * Set standard gen_ai response attributes on a Sentry span.
 *
 * Follows the same token accounting as analyze.ts: gen_ai.usage.input_tokens
 * is the total (non-cached + cache_read + cache_creation), with cache fields
 * as subsets.
 */
export function setGenAiResponseAttrs(
  span: Span,
  usage: ApiResponseUsage,
  stopReason?: string | null,
  responseText?: string
): void {
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const totalInput = usage.input_tokens + cacheRead + cacheWrite;
  span.setAttribute('gen_ai.usage.input_tokens', totalInput);
  span.setAttribute('gen_ai.usage.output_tokens', usage.output_tokens);
  span.setAttribute('gen_ai.usage.input_tokens.cached', cacheRead);
  span.setAttribute('gen_ai.usage.input_tokens.cache_write', cacheWrite);
  span.setAttribute('gen_ai.usage.total_tokens', totalInput + usage.output_tokens);
  if (stopReason) {
    span.setAttribute('gen_ai.response.finish_reasons', [stopReason]);
  }
  if (responseText !== undefined) {
    span.setAttribute('gen_ai.response.text', JSON.stringify([responseText]));
  }
}

/**
 * Strip markdown code fences from text.
 */
function stripCodeFences(text: string): string {
  const match = text.match(/```[\w+#-]*\s*([\s\S]*?)```/);
  return match?.[1]?.trim() ?? text;
}

/**
 * Extract the first JSON object or array from LLM text.
 * Handles markdown code fences and prose before/after JSON.
 */
export function extractJson(text: string): string | null {
  const stripped = stripCodeFences(text).trim();

  // Try parsing the whole thing first (common case: clean JSON output)
  try {
    JSON.parse(stripped);
    return stripped;
  } catch {
    // Fall through to extraction
  }

  // Find first { or [
  const objStart = stripped.indexOf('{');
  const arrStart = stripped.indexOf('[');
  let start: number;
  if (objStart === -1) {
    start = arrStart;
  } else if (arrStart === -1) {
    start = objStart;
  } else {
    start = Math.min(objStart, arrStart);
  }

  if (start === -1) {
    return null;
  }

  // Find each potential closer and try parsing - first valid JSON wins
  const closer = stripped[start] === '{' ? '}' : ']';
  let searchFrom = start;

  while (true) {
    const end = stripped.indexOf(closer, searchFrom + 1);
    if (end === -1) {
      return null;
    }

    const candidate = stripped.slice(start, end + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      searchFrom = end;
    }
  }
}

/**
 * Result from a structured Haiku call.
 */
export type HaikuResult<T> =
  | { success: true; data: T; usage: UsageStats }
  | { success: false; error: string; usage: UsageStats };

/**
 * Options for callHaiku.
 */
export interface CallHaikuOptions<T> {
  apiKey: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Infer prefill character from schema type to force JSON output.
 */
function inferPrefill(schema: z.ZodType): string | undefined {
  // Check for ZodObject (name === 'ZodObject')
  if ('_def' in schema && (schema as { _def: { typeName?: string } })._def.typeName === 'ZodObject') return '{';
  // Check for ZodArray
  if ('_def' in schema && (schema as { _def: { typeName?: string } })._def.typeName === 'ZodArray') return '[';
  return undefined;
}

/**
 * Single-turn structured Haiku call.
 * Auto-prefills based on Zod schema type, extracts JSON, validates with Zod.
 */
export async function callHaiku<T>(options: CallHaikuOptions<T>): Promise<HaikuResult<T>> {
  const { apiKey, prompt, schema, maxTokens = DEFAULT_MAX_TOKENS, timeout = DEFAULT_TIMEOUT_MS, maxRetries = DEFAULT_AUXILIARY_MAX_RETRIES } = options;

  return Sentry.startSpan(
    {
      op: 'gen_ai.chat',
      name: `chat ${HAIKU_MODEL}`,
      attributes: {
        'gen_ai.operation.name': 'chat',
        'gen_ai.provider.name': 'anthropic',
        'gen_ai.request.model': HAIKU_MODEL,
        'gen_ai.request.max_tokens': maxTokens,
      },
    },
    async (span) => {
      const client = new Anthropic({ apiKey, timeout, maxRetries });
      const prefill = inferPrefill(schema);

      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: prompt },
      ];
      if (prefill) {
        messages.push({ role: 'assistant', content: prefill });
      }

      span.setAttribute('gen_ai.request.messages', JSON.stringify(messages));

      try {
        const response = await client.messages.create({
          model: HAIKU_MODEL,
          max_tokens: maxTokens,
          messages,
        });

        const usage = apiUsageToStats(HAIKU_MODEL, response.usage);

        const content = response.content[0];
        if (!content || content.type !== 'text') {
          setGenAiResponseAttrs(span, response.usage, response.stop_reason);
          return { success: false, error: 'Empty response from model', usage };
        }

        let fullText = content.text;
        if (prefill) {
          fullText = prefill + fullText;
        }
        setGenAiResponseAttrs(span, response.usage, response.stop_reason, fullText);
        const jsonStr = extractJson(fullText);
        if (!jsonStr) {
          return { success: false, error: 'No JSON found in response', usage };
        }

        const parsed = JSON.parse(jsonStr);
        const validated = schema.safeParse(parsed);

        if (!validated.success) {
          return { success: false, error: `Validation failed: ${validated.error.message}`, usage };
        }

        return { success: true, data: validated.data, usage };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message, usage: emptyUsage() };
      }
    },
  );
}

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
  maxRetries?: number;
}

/**
 * Multi-turn Haiku call with tool use loop.
 * Iterates tool calls until the model produces a final text response.
 * Accumulates usage across all iterations.
 */
export async function callHaikuWithTools<T>(options: CallHaikuWithToolsOptions<T>): Promise<HaikuResult<T>> {
  const {
    apiKey,
    prompt,
    schema,
    tools,
    executeTool,
    maxTokens = DEFAULT_MAX_TOKENS,
    maxIterations = 5,
    timeout = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_AUXILIARY_MAX_RETRIES,
  } = options;

  return Sentry.startSpan(
    {
      op: 'gen_ai.chat',
      name: `chat ${HAIKU_MODEL}`,
      attributes: {
        'gen_ai.operation.name': 'chat',
        'gen_ai.provider.name': 'anthropic',
        'gen_ai.request.model': HAIKU_MODEL,
        'gen_ai.request.max_tokens': maxTokens,
      },
    },
    async (span) => {
      const client = new Anthropic({ apiKey, timeout, maxRetries });

      // No prefill for tool-use loops: prefill biases the model to output JSON
      // immediately instead of calling tools to gather information first.
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: prompt },
      ];

      span.setAttribute('gen_ai.request.messages', JSON.stringify(messages));

      const usages: UsageStats[] = [];
      // Accumulate raw API usage across iterations so setGenAiResponseAttrs
      // can compute totals consistently (input_tokens + cache subsets).
      const cumulativeUsage = {
        input_tokens: 0,
        output_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      };

      function setFinalSpanAttrs(stopReason?: string | null, responseText?: string): void {
        setGenAiResponseAttrs(span, cumulativeUsage, stopReason, responseText);
      }

      function currentUsage(): UsageStats {
        return usages.length > 0 ? aggregateUsage(usages) : emptyUsage();
      }

      for (let iteration = 0; iteration < maxIterations; iteration++) {
        let response: Anthropic.Message;
        try {
          response = await client.messages.create({
            model: HAIKU_MODEL,
            max_tokens: maxTokens,
            messages,
            tools,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { success: false, error: message, usage: currentUsage() };
        }

        usages.push(apiUsageToStats(HAIKU_MODEL, response.usage));
        cumulativeUsage.input_tokens += response.usage.input_tokens;
        cumulativeUsage.output_tokens += response.usage.output_tokens;
        cumulativeUsage.cache_read_input_tokens += response.usage.cache_read_input_tokens ?? 0;
        cumulativeUsage.cache_creation_input_tokens += response.usage.cache_creation_input_tokens ?? 0;

        // Handle tool use
        if (response.stop_reason === 'tool_use') {
          const toolUseBlocks = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
          );

          if (toolUseBlocks.length === 0) {
            return { success: false, error: 'Tool use indicated but no tool calls found', usage: aggregateUsage(usages) };
          }

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of toolUseBlocks) {
            await Sentry.startSpan(
              {
                op: 'gen_ai.execute_tool',
                name: `execute_tool ${block.name}`,
                attributes: {
                  'gen_ai.operation.name': 'execute_tool',
                  'gen_ai.tool.name': block.name,
                },
              },
              async () => {
                try {
                  const result = await executeTool(block.name, block.input as Record<string, unknown>);
                  toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
                } catch (error) {
                  const errMsg = error instanceof Error ? error.message : String(error);
                  toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: errMsg, is_error: true });
                }
              },
            );
          }

          messages.push({ role: 'assistant', content: response.content });
          messages.push({ role: 'user', content: toolResults });
          continue;
        }

        // Final response - extract text and set span attributes
        if (response.stop_reason !== 'end_turn' && response.stop_reason !== 'max_tokens') {
          setFinalSpanAttrs(response.stop_reason);
          return { success: false, error: `Unexpected stop reason: ${response.stop_reason}`, usage: aggregateUsage(usages) };
        }

        const textBlock = response.content.find(
          (b): b is Anthropic.TextBlock => b.type === 'text'
        );

        if (!textBlock) {
          setFinalSpanAttrs(response.stop_reason);
          return { success: false, error: 'No text in final response', usage: aggregateUsage(usages) };
        }

        setFinalSpanAttrs(response.stop_reason, textBlock.text);

        const jsonStr = extractJson(textBlock.text);
        if (!jsonStr) {
          return { success: false, error: 'No JSON found in response', usage: aggregateUsage(usages) };
        }

        const parsed = JSON.parse(jsonStr);
        const validated = schema.safeParse(parsed);

        if (!validated.success) {
          return { success: false, error: `Validation failed: ${validated.error.message}`, usage: aggregateUsage(usages) };
        }

        return { success: true, data: validated.data, usage: aggregateUsage(usages) };
      }

      // Max iterations exceeded - still record usage on span
      setFinalSpanAttrs();

      return { success: false, error: 'Max tool iterations exceeded', usage: aggregateUsage(usages) };
    },
  );
}
