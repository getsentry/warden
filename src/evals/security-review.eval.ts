import { beforeAll, expect } from 'vitest';
import { describeEval } from 'vitest-evals';
import {
  createWardenEvalHarness,
  createWardenEvalJudge,
  WardenEvalOutputSchema,
} from './harness.js';
import { discoverEvalScenarios } from './index.js';

const apiKey = process.env['ANTHROPIC_API_KEY'];
const evals = discoverEvalScenarios({
  category: 'security-review',
  skill: '../src/builtin-skills/security-review/SKILL.md',
  runtime: 'pi',
  model: 'anthropic/claude-sonnet-4-6',
});

describeEval(
  'security-review',
  {
    harness: createWardenEvalHarness({
      apiKey: apiKey ?? '',
      verbose: true,
    }),
    judges: apiKey ? [createWardenEvalJudge(apiKey)] : [],
    judgeThreshold: 1,
  },
  (it) => {
    beforeAll(() => {
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY required for evals');
      }
    });

    for (const meta of evals) {
      it(
        `${meta.name}: ${meta.given}`,
        { timeout: 120_000 },
        async ({ run }) => {
          const result = await run(meta);
          const output = WardenEvalOutputSchema.parse(result.output);

          expect(output.name).toBe(`${meta.category}/${meta.name}`);
          console.log(`\n${output.summary}`);
          console.log(`  Findings: ${output.findings.length}`);
        },
      );
    }
  },
);
