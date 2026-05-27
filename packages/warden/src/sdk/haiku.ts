import Anthropic from '@anthropic-ai/sdk';
import type { Span } from '@sentry/node';
import type { z } from 'zod';
import type { UsageStats } from '../types/index.js';
import { Sentry } from '../sentry.js';
import { apiUsageToStats } from './pricing.js';
import { aggregateUsage, emptyUsage } from './usage.js';
import {
  setGenAiInputMessagesAttr,
  setGenAiOutputMessagesAttr,
  setGenAiUsageAttrs,
} from './otel.js';

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
  cache_creation?: {
    ephemeral_1h_input_tokens?: number | null;
    ephemeral_5m_input_tokens?: number | null;
  } | null;
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
  const rawCacheWrite = usage.cache_creation_input_tokens ?? 0;
  const tieredCacheWrite =
    (usage.cache_creation?.ephemeral_5m_input_tokens ?? 0) +
    (usage.cache_creation?.ephemeral_1h_input_tokens ?? 0);
  const cacheWrite = Math.max(rawCacheWrite, tieredCacheWrite);
  setGenAiUsageAttrs(span, {
    inputTokens: usage.input_tokens + cacheRead + cacheWrite,
    outputTokens: usage.output_tokens,
    cacheReadInputTokens: cacheRead,
    cacheCreationInputTokens: cacheWrite,
    cacheCreation5mInputTokens: usage.cache_creation?.ephemeral_5m_input_tokens ?? cacheWrite,
    cacheCreation1hInputTokens: usage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
    webSearchRequests: 0,
    costUSD: 0,
  });
  if (stopReason) {
    span.setAttribute('gen_ai.response.finish_reasons', [stopReason]);
  }
  if (responseText !== undefined) {
    setGenAiOutputMessagesAttr(span, responseText, stopReason);
  }
}

/**
 * Extract the first JSON object or array from LLM text.
 * Handles markdown code fences and prose before/after JSON.
 */
export function extractJson(text: string): string | null {
  const stripped = text.trim();

  // Try parsing the whole thing first (common case: clean JSON output)
  try {
    JSON.parse(stripped);
    return stripped;
  } catch {
    // Fall through to extraction
  }

  // Try every object/array opener. This handles prose, fenced JSON, orphaned
  // prefill, and markdown fences embedded inside JSON string values.
  for (let start = 0; start < stripped.length; start++) {
    const opener = stripped[start];
    if (opener !== '{' && opener !== '[') {
      continue;
    }

    const stack = [opener === '{' ? '}' : ']'];
    let inString = false;
    let escape = false;

    for (let i = start + 1; i < stripped.length; i++) {
      const char = stripped[i];

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

      if (inString) {
        continue;
      }

      if (char === '{') {
        stack.push('}');
        continue;
      }
      if (char === '[') {
        stack.push(']');
        continue;
      }

      const expectedCloser = stack[stack.length - 1];
      if (char === '}' || char === ']') {
        if (char !== expectedCloser) {
          break;
        }
        stack.pop();
        if (stack.length === 0) {
          const candidate = stripped.slice(start, i + 1);
          try {
            JSON.parse(candidate);
            return candidate;
          } catch {
            break;
          }
        }
      }
    }
  }

  return null;
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
  agentName?: string;
  task?: string;
  model?: string;
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
  const { apiKey, prompt, schema, agentName, task, model = HAIKU_MODEL, maxTokens = DEFAULT_MAX_TOKENS, timeout = DEFAULT_TIMEOUT_MS, maxRetries = DEFAULT_AUXILIARY_MAX_RETRIES } = options;

  return Sentry.startSpan(
    {
      op: 'gen_ai.chat',
      name: `chat ${model}`,
      attributes: {
        'gen_ai.operation.name': 'chat',
        'gen_ai.provider.name': 'anthropic',
        ...(agentName ? { 'gen_ai.agent.name': agentName } : {}),
        ...(task ? { 'warden.ai.task': task } : {}),
        'gen_ai.request.model': model,
        'gen_ai.request.max_tokens': maxTokens,
        'gen_ai.output.type': 'json',
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

      setGenAiInputMessagesAttr(span, messages);

      try {
        const response = await client.messages.create({
          model,
          max_tokens: maxTokens,
          messages,
        });

        const usage = apiUsageToStats(model, response.usage);

        const content = response.content[0];
        if (!content || content.type !== 'text') {
          setGenAiResponseAttrs(span, response.usage, response.stop_reason);
          span.setAttribute('error.type', 'empty_response');
          return { success: false, error: 'Empty response from model', usage };
        }

        let fullText = content.text;
        if (prefill) {
          fullText = prefill + fullText;
        }
        setGenAiResponseAttrs(span, response.usage, response.stop_reason, fullText);
        const jsonStr = extractJson(fullText);
        if (!jsonStr) {
          span.setAttribute('error.type', 'invalid_json');
          return { success: false, error: 'No JSON found in response', usage };
        }

        const parsed = JSON.parse(jsonStr);
        const validated = schema.safeParse(parsed);

        if (!validated.success) {
          span.setAttribute('error.type', 'validation_error');
          return { success: false, error: `Validation failed: ${validated.error.message}`, usage };
        }

        return { success: true, data: validated.data, usage };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        span.setAttribute('error.type', error instanceof Error ? error.name : '_OTHER');
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
  agentName?: string;
  task?: string;
  model?: string;
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
    agentName,
    task,
    model = HAIKU_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    maxIterations = 5,
    timeout = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_AUXILIARY_MAX_RETRIES,
  } = options;

  return Sentry.startSpan(
    {
      op: 'gen_ai.chat',
      name: `chat ${model}`,
      attributes: {
        'gen_ai.operation.name': 'chat',
        'gen_ai.provider.name': 'anthropic',
        ...(agentName ? { 'gen_ai.agent.name': agentName } : {}),
        ...(task ? { 'warden.ai.task': task } : {}),
        'gen_ai.request.model': model,
        'gen_ai.request.max_tokens': maxTokens,
        'gen_ai.output.type': 'json',
      },
    },
    async (span) => {
      const client = new Anthropic({ apiKey, timeout, maxRetries });

      // No prefill for tool-use loops: prefill biases the model to output JSON
      // immediately instead of calling tools to gather information first.
      const messages: Anthropic.MessageParam[] = [
        { role: 'user', content: prompt },
      ];

      setGenAiInputMessagesAttr(span, messages);

      const usages: UsageStats[] = [];
      // Accumulate raw API usage across iterations so setGenAiResponseAttrs
      // can compute totals consistently (input_tokens + cache subsets).
      const cumulativeUsage = {
        input_tokens: 0,
        output_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_creation: {
          ephemeral_5m_input_tokens: 0,
          ephemeral_1h_input_tokens: 0,
        },
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
            model,
            max_tokens: maxTokens,
            messages,
            tools,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          span.setAttribute('error.type', error instanceof Error ? error.name : '_OTHER');
          return { success: false, error: message, usage: currentUsage() };
        }

        usages.push(apiUsageToStats(model, response.usage));
        cumulativeUsage.input_tokens += response.usage.input_tokens;
        cumulativeUsage.output_tokens += response.usage.output_tokens;
        cumulativeUsage.cache_read_input_tokens += response.usage.cache_read_input_tokens ?? 0;
        cumulativeUsage.cache_creation_input_tokens += response.usage.cache_creation_input_tokens ?? 0;
        cumulativeUsage.cache_creation.ephemeral_5m_input_tokens +=
          response.usage.cache_creation?.ephemeral_5m_input_tokens ?? 0;
        cumulativeUsage.cache_creation.ephemeral_1h_input_tokens +=
          response.usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;

        // Handle tool use
        if (response.stop_reason === 'tool_use') {
          const toolUseBlocks = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
          );

          if (toolUseBlocks.length === 0) {
            span.setAttribute('error.type', 'missing_tool_call');
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
                  ...(agentName ? { 'gen_ai.agent.name': agentName } : {}),
                  ...(task ? { 'warden.ai.task': task } : {}),
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
          span.setAttribute('error.type', 'unexpected_stop_reason');
          return { success: false, error: `Unexpected stop reason: ${response.stop_reason}`, usage: aggregateUsage(usages) };
        }

        const textBlock = response.content.find(
          (b): b is Anthropic.TextBlock => b.type === 'text'
        );

        if (!textBlock) {
          setFinalSpanAttrs(response.stop_reason);
          span.setAttribute('error.type', 'empty_response');
          return { success: false, error: 'No text in final response', usage: aggregateUsage(usages) };
        }

        setFinalSpanAttrs(response.stop_reason, textBlock.text);

        const jsonStr = extractJson(textBlock.text);
        if (!jsonStr) {
          span.setAttribute('error.type', 'invalid_json');
          return { success: false, error: 'No JSON found in response', usage: aggregateUsage(usages) };
        }

        const parsed = JSON.parse(jsonStr);
        const validated = schema.safeParse(parsed);

        if (!validated.success) {
          span.setAttribute('error.type', 'validation_error');
          return { success: false, error: `Validation failed: ${validated.error.message}`, usage: aggregateUsage(usages) };
        }

        return { success: true, data: validated.data, usage: aggregateUsage(usages) };
      }

      // Max iterations exceeded - still record usage on span
      setFinalSpanAttrs();

      span.setAttribute('error.type', 'max_tool_iterations');
      return { success: false, error: 'Max tool iterations exceeded', usage: aggregateUsage(usages) };
    },
  );
}
