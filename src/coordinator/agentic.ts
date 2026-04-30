import { performance } from 'node:perf_hooks';
import type { z } from 'zod';
import type { ToolName } from '../config/schema.js';
import type { UsageStats } from '../types/index.js';
import { parseJsonFromOutput } from '../sdk/json-output.js';
import { aggregateUsage, emptyUsage } from '../sdk/usage.js';
import type { Runtime, SkillRunResult } from '../sdk/runtimes/index.js';

const SUPERWARDEN_AGENT_TOOLS: ToolName[] = ['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch'];

export interface StructuredSuperwardenAgentResult<T> {
  data: T;
  usage: UsageStats;
  durationMs: number;
  responseModel?: string;
  numTurns?: number;
}

interface StructuredSuperwardenAgentFailureDetails {
  rawText?: string;
  stderr?: string;
  usage?: UsageStats;
  durationMs?: number;
  responseModel?: string;
  numTurns?: number;
}

export class StructuredSuperwardenAgentError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StructuredSuperwardenAgentError';
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

function formatAgentFailure(message: string, details: StructuredSuperwardenAgentFailureDetails): string {
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
): StructuredSuperwardenAgentFailureDetails {
  return {
    rawText: result?.text,
    stderr,
    usage: result?.usage,
    durationMs: result?.durationMs ?? performance.now() - startedAt,
    responseModel: result?.responseModel,
    numTurns: result?.numTurns,
  };
}

export async function runStructuredSuperwardenAgent<T>(args: {
  runtime: Runtime;
  repoPath: string;
  skillName: string;
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  model?: string;
  maxTurns?: number;
  abortController?: AbortController;
  repair?: {
    apiKey?: string;
    model?: string;
    maxRetries?: number;
  };
}): Promise<StructuredSuperwardenAgentResult<T>> {
  const startedAt = performance.now();
  const { runtime } = args;
  const response = await runtime.runSkill({
    systemPrompt: args.systemPrompt,
    userPrompt: args.userPrompt,
    repoPath: args.repoPath,
    skillName: args.skillName,
    tools: { allowed: SUPERWARDEN_AGENT_TOOLS },
    options: {
      model: args.model,
      maxTurns: args.maxTurns,
      abortController: args.abortController,
    },
  });

  if (response.authError) {
    throw new StructuredSuperwardenAgentError(response.authError);
  }
  if (!response.result) {
    throw new StructuredSuperwardenAgentError(formatAgentFailure(
      'Superwarden agent returned no result',
      resultFailureDetails(undefined, response.stderr, startedAt),
    ));
  }
  if (response.result.status !== 'success') {
    throw new StructuredSuperwardenAgentError(formatAgentFailure(
      formatRuntimeFailure(response.result),
      resultFailureDetails(response.result, response.stderr, startedAt),
    ));
  }

  const parsed = await parseJsonFromOutput({
    output: response.result.text,
    schema: args.schema,
    repair: args.repair ? {
      runtime,
      apiKey: args.repair.apiKey,
      model: args.repair.model,
      maxRetries: args.repair.maxRetries,
    } : undefined,
  });

  if (!parsed.success) {
    const label = parsed.error.startsWith('no_json')
      ? `Superwarden agent returned no JSON: ${parsed.error}`
      : parsed.error.startsWith('invalid_json')
        ? `Superwarden agent returned invalid JSON: ${parsed.error}`
        : `Superwarden agent output failed validation or repair: ${parsed.error}`;
    throw new StructuredSuperwardenAgentError(
      formatAgentFailure(
        label,
        {
          ...resultFailureDetails(response.result, response.stderr, startedAt),
          rawText: parsed.json ?? response.result.text,
          usage: parsed.usage
            ? aggregateUsage([response.result.usage ?? emptyUsage(), parsed.usage])
            : response.result.usage,
        },
      ),
    );
  }

  const usage = parsed.usage
    ? aggregateUsage([response.result.usage ?? emptyUsage(), parsed.usage])
    : response.result.usage ?? emptyUsage();

  return {
    data: parsed.data,
    usage,
    durationMs: response.result.durationMs ?? performance.now() - startedAt,
    responseModel: response.result.responseModel,
    numTurns: response.result.numTurns,
  };
}
