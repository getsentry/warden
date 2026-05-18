import { z } from 'zod';
import { namedJudge } from 'vitest-evals';
import type { JudgeContext } from 'vitest-evals';
import {
  normalizeContent,
  normalizeMetadata,
  toJsonValue,
  type Harness,
} from 'vitest-evals/harness';
import { runJudge } from './judge.js';
import { runEvalSkill, type RunEvalOptions } from './runner.js';
import { evalPassed, type EvalMeta, type JudgeResponse } from './types.js';
import { usageToSummary } from './usage.js';
import { FindingSchema } from '../../../src/types/index.js';
import type { Finding, SkillReport, UsageStats } from '../../../src/types/index.js';

export const WardenEvalOutputSchema = z.object({
  name: z.string(),
  summary: z.string(),
  skill: z.string(),
  runtime: z.string().optional(),
  model: z.string().optional(),
  findings: z.array(FindingSchema),
  failedHunks: z.number().int().nonnegative().optional(),
  failedExtractions: z.number().int().nonnegative().optional(),
});
export type WardenEvalOutput = z.infer<typeof WardenEvalOutputSchema>;

function usageMetadata(usage: UsageStats | undefined): Record<string, unknown> | undefined {
  if (!usage) {
    return undefined;
  }

  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costUSD: usage.costUSD,
  };
}

function reportToOutput(name: string, report: SkillReport): WardenEvalOutput {
  return {
    name,
    summary: report.summary,
    skill: report.skill,
    runtime: report.runtime,
    model: report.model,
    findings: report.findings,
    failedHunks: report.failedHunks,
    failedExtractions: report.failedExtractions,
  };
}

function failedJudgeReasons(
  meta: EvalMeta,
  response: JudgeResponse,
  findings: Finding[]
): string[] {
  const reasons: string[] = [];

  for (let i = 0; i < meta.should_find.length; i++) {
    const assertion = meta.should_find[i];
    if (!assertion?.required) {
      continue;
    }

    const verdict = response.expectations[i];
    if (!verdict) {
      reasons.push(`missing verdict for should_find[${i}]`);
      continue;
    }

    const matchedFinding = verdict.matchedFindingIndex === null
      ? undefined
      : findings[verdict.matchedFindingIndex];
    if (!verdict.met) {
      reasons.push(`should_find[${i}] not met: ${verdict.reasoning}`);
    } else if (assertion.severity) {
      if (!matchedFinding) {
        reasons.push(`should_find[${i}] severity could not be checked: no matched finding`);
      } else if (matchedFinding.severity !== assertion.severity) {
        reasons.push(
          `should_find[${i}] severity mismatch: expected ${assertion.severity}, got ${matchedFinding.severity}`
        );
      }
    }
  }

  for (let i = 0; i < meta.should_not_find.length; i++) {
    const verdict = response.antiExpectations[i];
    if (verdict?.violated) {
      reasons.push(`should_not_find[${i}] violated: ${verdict.reasoning}`);
    }
  }

  return reasons;
}

export function createWardenEvalHarness(options: RunEvalOptions): Harness<EvalMeta> {
  return {
    name: 'warden',
    prompt: async () => {
      throw new Error('Warden eval judges use runJudge directly.');
    },
    run: async (meta, context) => {
      const modelOverride = typeof context.metadata['model'] === 'string'
        ? context.metadata['model']
        : undefined;
      const runtimeOverride = context.metadata['runtime'] === 'claude'
        || context.metadata['runtime'] === 'pi'
          ? context.metadata['runtime']
          : undefined;
      const result = await runEvalSkill(meta, {
        ...options,
        model: modelOverride ?? options.model,
        runtime: runtimeOverride ?? options.runtime,
      });
      const output = reportToOutput(result.name, result.report);

      return {
        output: toJsonValue(output),
        session: {
          messages: [
            {
              role: 'user',
              content: normalizeContent({
                name: result.name,
                given: meta.given,
                shouldFind: meta.should_find,
                shouldNotFind: meta.should_not_find,
              }),
            },
            {
              role: 'assistant',
              content: normalizeContent(output),
            },
          ],
          outputText: result.report.summary,
          provider: result.report.runtime,
          model: result.report.model,
          metadata: normalizeMetadata({
            category: meta.category,
            scenario: meta.name,
            skill: result.report.skill,
          }),
        },
        usage: usageToSummary({
          provider: result.report.runtime ?? 'unknown',
          model: result.report.model ?? 'unknown',
          usage: result.report.usage,
        }),
        timings: { totalMs: result.durationMs },
        artifacts: {
          logs: toJsonValue(result.logs) ?? [],
        },
        errors: result.report.error
          ? [{
              type: result.report.error.code,
              message: result.report.error.message,
            }]
          : [],
      };
    },
  };
}

export function createWardenEvalJudge(apiKey: string) {
  return namedJudge<JudgeContext<EvalMeta>>('WardenEvalJudge', async ({ inputValue, run }) => {
    const output = WardenEvalOutputSchema.safeParse(run.output);
    if (!output.success) {
      return {
        score: 0,
        metadata: {
          rationale: `Invalid Warden harness output: ${output.error.message}`,
        },
      };
    }

    const meta = inputValue;
    const findings = output.data.findings;
    const judgeResult = await runJudge(meta, findings, apiKey);
    if (judgeResult.error) {
      return {
        score: 0,
        metadata: {
          rationale: `Judge failed: ${judgeResult.error}`,
          output: judgeResult.response,
          usage: usageMetadata(judgeResult.usage),
        },
      };
    }

    const passed = evalPassed(meta, judgeResult.response, findings);
    const reasons = failedJudgeReasons(meta, judgeResult.response, findings);

    return {
      score: passed ? 1 : 0,
      metadata: {
        rationale: reasons.length > 0 ? reasons.join('; ') : 'All eval assertions passed.',
        output: judgeResult.response,
        usage: usageMetadata(judgeResult.usage),
      },
    };
  });
}
