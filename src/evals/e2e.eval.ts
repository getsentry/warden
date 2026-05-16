import { expect } from 'vitest';
import { describeEval } from 'vitest-evals';
import {
  createWardenEvalHarness,
  createWardenEvalJudge,
  WardenEvalOutputSchema,
} from './harness.js';
import { discoverEvals } from './index.js';

const apiKey = process.env['ANTHROPIC_API_KEY'] ?? '';
const evals = discoverEvals();

describeEval(
  'e2e',
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
        `${meta.category}/${meta.name}: ${meta.given}`,
        { timeout: 120_000 },
        async ({ run }) => {
          const result = await run(meta);
          const output = WardenEvalOutputSchema.parse(result.output);

          expect(output.name).toBe(`${meta.category}/${meta.name}`);
          console.log(`\n${output.summary ?? 'No summary'}`);
          console.log(`  Findings: ${output.findings?.length ?? 0}`);
        },
      );
    }
  },
);
