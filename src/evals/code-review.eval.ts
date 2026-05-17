import { expect } from 'vitest';
import { describeEval } from 'vitest-evals';
import {
  createWardenEvalHarness,
  createWardenEvalJudge,
  WardenEvalOutputSchema,
} from './harness.js';
import { discoverEvalScenarios } from './index.js';

const apiKey = process.env['ANTHROPIC_API_KEY'] ?? '';
const evals = discoverEvalScenarios({
  category: 'code-review',
  skill: '../src/builtin-skills/code-review/SKILL.md',
  runtime: 'pi',
  model: 'anthropic/claude-sonnet-4-6',
});

describeEval(
  'code-review',
  {
    harness: createWardenEvalHarness({
      apiKey,
      verbose: true,
    }),
    judges: [createWardenEvalJudge(apiKey)],
    judgeThreshold: 1,
    skipIf: () => !apiKey,
  },
  (it) => {
    for (const meta of evals) {
      it(
        `${meta.name}: ${meta.given}`,
        { timeout: 180_000 },
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
