import Anthropic from '@anthropic-ai/sdk';
import type { Finding } from '../types/index.js';
import { apiUsageToStats } from '../sdk/pricing.js';
import { emptyUsage } from '../sdk/usage.js';
import { extractJson } from '../sdk/haiku.js';
import type { EvalMeta, JudgeResponse } from './types.js';
import { DEFAULT_EVAL_MODEL, JudgeResponseSchema } from './types.js';
import type { UsageStats } from '../types/index.js';

const JUDGE_MODEL = DEFAULT_EVAL_MODEL;
const JUDGE_MAX_TOKENS = 4096;
const JUDGE_TIMEOUT_MS = 60_000;

export interface JudgeResult {
  response: JudgeResponse;
  usage: UsageStats;
}

/**
 * Build the judge prompt that evaluates agent findings against BDD assertions.
 */
function buildJudgePrompt(meta: EvalMeta, findings: Finding[]): string {
  const findingsBlock = findings.length > 0
    ? findings.map((f, i) => {
        const loc = f.location ? ` (${f.location.path}:${f.location.startLine})` : '';
        return `  [${i}] severity=${f.severity} confidence=${f.confidence ?? 'unset'}${loc}\n      title: ${f.title}\n      description: ${f.description}`;
      }).join('\n\n')
    : '  (no findings reported)';

  const shouldFindBlock = meta.should_find.map((e, i) => {
    const sev = e.severity ? ` [expected severity: ${e.severity}]` : '';
    const req = e.required ? ' (REQUIRED)' : ' (optional)';
    return `  [${i}] ${e.finding}${sev}${req}`;
  }).join('\n');

  const shouldNotFindBlock = meta.should_not_find.length > 0
    ? meta.should_not_find.map((a, i) => `  [${i}] ${a}`).join('\n')
    : '  (none)';

  return `You are an eval judge for a code analysis tool called Warden. Your job is to
determine whether the tool's findings match the expected behavioral outcomes.

## Scenario
Given: ${meta.given}

## Agent Findings
${findingsBlock}

## Should Find (what the agent SHOULD have detected)
${shouldFindBlock}

## Should Not Find (what the agent should NOT have reported)
${shouldNotFindBlock}

## Instructions

For each "should find" assertion, determine if ANY of the agent's findings satisfy it.
A finding satisfies an assertion if it describes the same issue, even if worded differently.
The severity hint is guidance, not a strict requirement: if the finding describes the
right issue at a close severity level, it still counts as met.

For each "should not find" assertion, determine if ANY of the agent's findings violate it.
A violation means the agent reported something it should not have.

## Response Format

Respond with ONLY a JSON object. No explanation, no markdown fences.

{
  "expectations": [
    {
      "met": true,
      "matchedFindingIndex": 0,
      "reasoning": "Finding [0] identifies the null access bug on user.name"
    }
  ],
  "antiExpectations": [
    {
      "violated": false,
      "violatingFindingIndex": null,
      "reasoning": "No findings report style issues"
    }
  ]
}

Requirements:
- "expectations" array must have exactly ${meta.should_find.length} entries (one per should_find, in order)
- "antiExpectations" array must have exactly ${meta.should_not_find.length} entries (one per should_not_find, in order)
- "matchedFindingIndex" is the index of the matched finding, or null if no match
- "violatingFindingIndex" is the index of the violating finding, or null if no violation
- Keep reasoning to one sentence`;
}

/**
 * Run the LLM judge to evaluate agent findings against eval assertions.
 */
export async function runJudge(
  meta: EvalMeta,
  findings: Finding[],
  apiKey: string
): Promise<JudgeResult> {
  const client = new Anthropic({ apiKey, timeout: JUDGE_TIMEOUT_MS });

  const prompt = buildJudgePrompt(meta, findings);

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: prompt },
  ];

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: JUDGE_MODEL,
      max_tokens: JUDGE_MAX_TOKENS,
      messages,
    });
  } catch (error) {
    // On API failure, return a judge response marking everything as failed
    const failedExpectations = meta.should_find.map(() => ({
      met: false,
      matchedFindingIndex: null,
      reasoning: `Judge API call failed: ${error instanceof Error ? error.message : String(error)}`,
    }));
    const failedAntiExpectations = meta.should_not_find.map(() => ({
      violated: false,
      violatingFindingIndex: null,
      reasoning: 'Judge API call failed, assuming no violation',
    }));
    return {
      response: { expectations: failedExpectations, antiExpectations: failedAntiExpectations },
      usage: emptyUsage(),
    };
  }

  const usage = apiUsageToStats(JUDGE_MODEL, response.usage);

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text'
  );

  if (!textBlock) {
    return {
      response: buildFallbackResponse(meta, 'No text in judge response'),
      usage,
    };
  }

  const jsonStr = extractJson(textBlock.text);

  if (!jsonStr) {
    return {
      response: buildFallbackResponse(meta, 'No JSON found in judge response'),
      usage,
    };
  }

  const parsed = JSON.parse(jsonStr);
  const validated = JudgeResponseSchema.safeParse(parsed);

  if (!validated.success) {
    return {
      response: buildFallbackResponse(meta, `Judge response validation failed: ${validated.error.message}`),
      usage,
    };
  }

  // Validate array lengths match assertions
  const judgeResp = validated.data;
  if (judgeResp.expectations.length !== meta.should_find.length) {
    return {
      response: buildFallbackResponse(meta, `Judge returned ${judgeResp.expectations.length} verdicts, expected ${meta.should_find.length}`),
      usage,
    };
  }
  if (judgeResp.antiExpectations.length !== meta.should_not_find.length) {
    return {
      response: buildFallbackResponse(meta, `Judge returned ${judgeResp.antiExpectations.length} anti-verdicts, expected ${meta.should_not_find.length}`),
      usage,
    };
  }

  return { response: judgeResp, usage };
}

/**
 * Build a fallback judge response when parsing fails.
 * Marks all assertions as not met with the error reason.
 */
function buildFallbackResponse(meta: EvalMeta, reason: string): JudgeResponse {
  return {
    expectations: meta.should_find.map(() => ({
      met: false,
      matchedFindingIndex: null,
      reasoning: reason,
    })),
    antiExpectations: meta.should_not_find.map(() => ({
      violated: false,
      violatingFindingIndex: null,
      reasoning: 'Judge failed, assuming no violation',
    })),
  };
}
