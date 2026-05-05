import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import type { ToolName } from '../config/schema.js';
import type { UsageStats } from '../types/index.js';
import { parseJsonFromOutput, type ParseJsonFromOutputResult } from '../sdk/json-output.js';
import { buildJsonOutputSection, buildTaggedSection, joinPromptSections } from '../sdk/prompt-sections.js';
import { aggregateUsage, emptyUsage } from '../sdk/usage.js';
import type { Runtime, SkillRunResult } from '../sdk/runtimes/index.js';

const SKILL_BUILDER_READ_TOOLS: ToolName[] = ['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch'];
const SKILL_BUILDER_WRITE_TOOLS: ToolName[] = ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash', 'WebFetch', 'WebSearch'];
const STRUCTURED_REPAIR_MAX_TURNS = 1;
const STRUCTURED_REPAIR_MAX_CHARS = 60_000;

export interface StructuredSkillBuilderAgentResult<T> {
  data: T;
  usage: UsageStats;
  durationMs: number;
  responseModel?: string;
  numTurns?: number;
}

interface StructuredSkillBuilderAgentFailureDetails {
  rawText?: string;
  stderr?: string;
  usage?: UsageStats;
  durationMs?: number;
  responseModel?: string;
  numTurns?: number;
}

export class StructuredSkillBuilderAgentError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StructuredSkillBuilderAgentError';
  }
}

function formatRuntimeFailure(result: SkillRunResult): string {
  if (result.errors.length > 0) {
    return result.errors.join('; ');
  }
  return `Runtime status: ${result.status}`;
}

function previewText(value: string | undefined, maxLength = 1200): string {
  const trimmed = value?.trim();
  if (!trimmed) return '<empty>';
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}...`;
}

function formatAgentFailure(message: string, details: StructuredSkillBuilderAgentFailureDetails): string {
  const lines = [message];
  if (details.responseModel) {
    lines.push(`  Model: ${details.responseModel}`);
  }
  if (details.durationMs !== undefined) {
    lines.push(`  Duration: ${(details.durationMs / 1000).toFixed(1)}s`);
  }
  if (details.usage) {
    lines.push(
      `  Usage: ${details.usage.inputTokens.toLocaleString()} input / ` +
      `${details.usage.outputTokens.toLocaleString()} output tokens / ` +
      `$${details.usage.costUSD.toFixed(4)}`
    );
  }
  if (details.numTurns !== undefined) {
    lines.push(`  Turns: ${details.numTurns}`);
  }
  if (details.stderr?.trim()) {
    lines.push('  Claude Code stderr:');
    lines.push(`  ${previewText(details.stderr).replace(/\n/g, '\n  ')}`);
  }
  if (details.rawText !== undefined) {
    lines.push('  Raw output:');
    lines.push(`  ${previewText(details.rawText).replace(/\n/g, '\n  ')}`);
  }
  return lines.join('\n');
}

function resultFailureDetails(
  result: SkillRunResult | undefined,
  stderr: string | undefined,
  startedAt: number,
): StructuredSkillBuilderAgentFailureDetails {
  return {
    rawText: result?.text,
    stderr,
    usage: result?.usage,
    durationMs: result?.durationMs ?? performance.now() - startedAt,
    responseModel: result?.responseModel,
    numTurns: result?.numTurns,
  };
}

function truncateForRepair(output: string): string {
  if (output.length <= STRUCTURED_REPAIR_MAX_CHARS) {
    return output;
  }
  return `${output.slice(0, STRUCTURED_REPAIR_MAX_CHARS)}\n[... truncated]`;
}

function structuredRepairSystemPrompt(): string {
  return `You repair model output into strict JSON for Warden.

Return only valid JSON matching the provided JSON Schema. Do not include markdown, prose, code fences, or explanations. Preserve the original structured content whenever possible and do not invent extra fields.`;
}

function structuredRepairPrompt<T>(args: {
  schema: z.ZodType<T>;
  output: string;
  reason: string;
}): string {
  return joinPromptSections([
    `<task>
Repair this model output into valid JSON that matches the provided JSON Schema.
</task>`,
    buildJsonOutputSection(`Remove surrounding prose or markdown only when needed.
Preserve the original structured content as much as possible.
Do not invent extra fields.`),
    buildTaggedSection('parse_error', args.reason),
    buildTaggedSection('json_schema', JSON.stringify(z.toJSONSchema(args.schema), null, 2)),
    buildTaggedSection('model_output', truncateForRepair(args.output)),
  ]);
}

async function repairStructuredSkillBuilderOutput<T>(args: {
  runtime: Runtime;
  repoPath: string;
  skillName: string;
  schema: z.ZodType<T>;
  output: string;
  reason: string;
  model?: string;
  abortController?: AbortController;
}): Promise<ParseJsonFromOutputResult<T>> {
  const response = await args.runtime.runSkill({
    systemPrompt: structuredRepairSystemPrompt(),
    userPrompt: structuredRepairPrompt({
      schema: args.schema,
      output: args.output,
      reason: args.reason,
    }),
    repoPath: args.repoPath,
    skillName: `${args.skillName}:structured-output-repair`,
    tools: { allowed: [] },
    options: {
      model: args.model,
      maxTurns: STRUCTURED_REPAIR_MAX_TURNS,
      abortController: args.abortController,
    },
  });

  if (response.authError) {
    return {
      success: false,
      error: `repair_failed: ${response.authError}`,
    };
  }
  if (!response.result) {
    return {
      success: false,
      error: 'repair_failed: no_result',
    };
  }
  if (response.result.status !== 'success') {
    return {
      success: false,
      error: `repair_failed: ${formatRuntimeFailure(response.result)}`,
      usage: response.result.usage,
    };
  }

  const parsed = await parseJsonFromOutput({
    output: response.result.text,
    schema: args.schema,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: `repair_failed: ${parsed.error}`,
      json: parsed.json,
      usage: response.result.usage,
    };
  }

  return {
    success: true,
    data: parsed.data,
    json: parsed.json,
    repaired: true,
    usage: response.result.usage,
  };
}

export async function runStructuredSkillBuilderAgent<T>(args: {
  runtime: Runtime;
  repoPath: string;
  skillName: string;
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  model?: string;
  maxTurns?: number;
  writeAccess?: boolean;
  abortController?: AbortController;
  repair?: {
    apiKey?: string;
    model?: string;
    maxRetries?: number;
  };
}): Promise<StructuredSkillBuilderAgentResult<T>> {
  const startedAt = performance.now();
  const { runtime } = args;
  const response = await runtime.runSkill({
    systemPrompt: args.systemPrompt,
    userPrompt: args.userPrompt,
    repoPath: args.repoPath,
    skillName: args.skillName,
    tools: { allowed: args.writeAccess ? SKILL_BUILDER_WRITE_TOOLS : SKILL_BUILDER_READ_TOOLS },
    allowMutatingTools: args.writeAccess,
    options: {
      model: args.model,
      maxTurns: args.maxTurns,
      abortController: args.abortController,
    },
  });

  if (response.authError) {
    throw new StructuredSkillBuilderAgentError(response.authError);
  }
  if (!response.result) {
    throw new StructuredSkillBuilderAgentError(formatAgentFailure(
      'Skill builder agent returned no result',
      resultFailureDetails(undefined, response.stderr, startedAt),
    ));
  }
  if (response.result.status !== 'success') {
    throw new StructuredSkillBuilderAgentError(formatAgentFailure(
      formatRuntimeFailure(response.result),
      resultFailureDetails(response.result, response.stderr, startedAt),
    ));
  }

  const repairUsages: UsageStats[] = [];
  let parsed = await parseJsonFromOutput({
    output: response.result.text,
    schema: args.schema,
  });
  if (!parsed.success) {
    const skillRepair = await repairStructuredSkillBuilderOutput({
      runtime,
      repoPath: args.repoPath,
      skillName: args.skillName,
      schema: args.schema,
      output: response.result.text,
      reason: parsed.error,
      model: args.repair?.model ?? args.model,
      abortController: args.abortController,
    });
    if (skillRepair.usage) {
      repairUsages.push(skillRepair.usage);
    }
    if (skillRepair.success) {
      parsed = skillRepair;
    } else if (args.repair?.apiKey) {
      const auxiliaryRepair = await parseJsonFromOutput({
        output: response.result.text,
        schema: args.schema,
        repair: {
          runtime,
          apiKey: args.repair.apiKey,
          model: args.repair.model,
          maxRetries: args.repair.maxRetries,
        },
      });
      if (auxiliaryRepair.usage) {
        repairUsages.push(auxiliaryRepair.usage);
      }
      parsed = auxiliaryRepair.success
        ? auxiliaryRepair
        : {
          ...auxiliaryRepair,
          error: `${skillRepair.error}; ${auxiliaryRepair.error}`,
          json: auxiliaryRepair.json ?? skillRepair.json ?? parsed.json,
        };
    } else {
      parsed = skillRepair;
    }
  }

  if (!parsed.success) {
    const label = parsed.error.startsWith('no_json')
      ? `Skill builder agent returned no JSON: ${parsed.error}`
      : parsed.error.startsWith('invalid_json')
        ? `Skill builder agent returned invalid JSON: ${parsed.error}`
        : `Skill builder agent output failed validation or repair: ${parsed.error}`;
    throw new StructuredSkillBuilderAgentError(
      formatAgentFailure(
        label,
        {
          ...resultFailureDetails(response.result, response.stderr, startedAt),
          rawText: parsed.json ?? response.result.text,
          usage: aggregateUsage([response.result.usage ?? emptyUsage(), ...repairUsages]),
        },
      ),
    );
  }

  const usage = aggregateUsage([response.result.usage ?? emptyUsage(), ...repairUsages]);

  return {
    data: parsed.data,
    usage,
    durationMs: response.result.durationMs ?? performance.now() - startedAt,
    responseModel: response.result.responseModel,
    numTurns: response.result.numTurns,
  };
}
