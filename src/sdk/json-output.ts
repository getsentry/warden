import type { z } from 'zod';
import type { UsageStats } from '../types/index.js';
import { extractJson } from './haiku.js';
import { buildJsonOutputSection, buildTaggedSection, joinPromptSections } from './prompt-sections.js';
import { getRuntime, type Runtime, type RuntimeName } from './runtimes/index.js';

const JSON_REPAIR_MAX_CHARS = 60_000;
const JSON_REPAIR_MAX_TOKENS = 16_384;
const JSON_REPAIR_TIMEOUT_MS = 30_000;

export type ParseJsonFromOutputResult<T> =
  | { success: true; data: T; json: string; repaired: boolean; usage?: UsageStats }
  | { success: false; error: string; json?: string; usage?: UsageStats };

export interface JsonOutputRepairOptions {
  apiKey?: string;
  runtime?: Runtime;
  runtimeName?: RuntimeName;
  model?: string;
  maxRetries?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface ParseJsonFromOutputOptions<T> {
  output: string;
  schema: z.ZodType<T>;
  repair?: JsonOutputRepairOptions;
}

function truncateForRepair(output: string): string {
  if (output.length <= JSON_REPAIR_MAX_CHARS) {
    return output;
  }
  return `${output.slice(0, JSON_REPAIR_MAX_CHARS)}\n[... truncated]`;
}

function validationError(error: z.ZodError): string {
  return `validation_failed: ${error.message}`;
}

function parseExtractedJson<T>(json: string, schema: z.ZodType<T>): ParseJsonFromOutputResult<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `invalid_json: ${message}`, json };
  }

  const validated = schema.safeParse(parsed);
  if (!validated.success) {
    return { success: false, error: validationError(validated.error), json };
  }

  return {
    success: true,
    data: validated.data,
    json,
    repaired: false,
  };
}

async function repairJsonOutput<T>(
  output: string,
  schema: z.ZodType<T>,
  reason: string,
  repair: JsonOutputRepairOptions,
): Promise<ParseJsonFromOutputResult<T>> {
  if (!repair.apiKey) {
    return {
      success: false,
      error: `${reason}; repair_skipped: missing_api_key`,
    };
  }

  const runtime = repair.runtime ?? getRuntime(repair.runtimeName);
  const result = await runtime.runAuxiliary({
    task: 'extraction',
    apiKey: repair.apiKey,
    model: repair.model,
    maxRetries: repair.maxRetries,
    maxTokens: repair.maxTokens ?? JSON_REPAIR_MAX_TOKENS,
    timeout: repair.timeout ?? JSON_REPAIR_TIMEOUT_MS,
    schema,
    prompt: joinPromptSections([
      `<task>
Extract and repair the JSON value from this model output.
</task>`,
      buildJsonOutputSection(`Return JSON accepted by the provided schema.
Preserve the model's structured content as much as possible.
If the output contains markdown fences, escaped newlines, or prose around JSON, remove only the wrapper/prose and repair JSON escaping.
Do not summarize or invent new content.`),
      buildTaggedSection('parse_error', reason),
      buildTaggedSection('model_output', truncateForRepair(output)),
    ]),
  });

  if (!result.success) {
    return {
      success: false,
      error: `${reason}; repair_failed: ${result.error}`,
      usage: result.usage,
    };
  }

  return {
    success: true,
    data: result.data,
    json: JSON.stringify(result.data),
    repaired: true,
    usage: result.usage,
  };
}

export async function parseJsonFromOutput<T>(
  options: ParseJsonFromOutputOptions<T>,
): Promise<ParseJsonFromOutputResult<T>> {
  const json = extractJson(options.output);
  if (!json) {
    const reason = 'no_json';
    if (options.repair) {
      return repairJsonOutput(options.output, options.schema, reason, options.repair);
    }
    return { success: false, error: reason };
  }

  const parsed = parseExtractedJson(json, options.schema);
  if (parsed.success || !options.repair) {
    return parsed;
  }

  const repaired = await repairJsonOutput(options.output, options.schema, parsed.error, options.repair);
  if (!repaired.success && parsed.json) {
    return { ...repaired, json: parsed.json };
  }
  return repaired;
}
