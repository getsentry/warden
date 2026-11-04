import { expect } from 'vitest';
import { describeEval } from 'vitest-evals';
import {
  createWardenEvalHarness,
  createWardenEvalJudge,
  WardenEvalOutputSchema,
} from './harness.js';
import { discoverEvals } from './index.js';
import { formatEvalId, formatEvalTestName } from './names.js';
import { resolveEvalProvider } from './provider.js';

const provider = resolveEvalProvider();
const evals = discoverEvals();

describeEval(
  'e2e',
  {
    harness: createWardenEvalHarness({
      apiKey: provider.apiKey,
      model: provider.model,
      runtime: provider.runtime,
      verbose: true,
    }),
    judges: [createWardenEvalJudge({ apiKey: provider.apiKey, model: provider.judgeModel })],
    judgeThreshold: 1,
    skipIf: () => !provider.enabled,
  },
  (it) => {
    for (const meta of evals) {
      it(
        formatEvalTestName(meta),
        { timeout: 120_000 },
        async ({ run }) => {
          const result = await run(meta);
          const output = WardenEvalOutputSchema.parse(result.output);

          expect(output.name).toBe(formatEvalId(meta));
          console.log(`\n${output.summary ?? 'No summary'}`);
          console.log(`  Findings: ${output.findings?.length ?? 0}`);
        },
      );
    }
  },
);
