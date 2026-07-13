import { expect } from 'vitest';
import { describeEval } from 'vitest-evals';
import {
  createWardenEvalHarness,
  createWardenEvalJudge,
  WardenEvalOutputSchema,
} from './harness.js';
import { discoverEvals } from './index.js';
import { formatEvalId, formatEvalTestName } from './names.js';
import {
  DEFAULT_EVAL_RUNTIME,
  defaultEvalModel,
  getEvalProviderApiKey,
  getEvalRuntimeApiKey,
} from './auth.js';

const model = defaultEvalModel();
const apiKey = getEvalRuntimeApiKey(model);
const providerApiKey = getEvalProviderApiKey(model);
const evals = discoverEvals();

describeEval(
  'e2e',
  {
    harness: createWardenEvalHarness({
      apiKey,
      runtime: DEFAULT_EVAL_RUNTIME,
      model,
      verbose: true,
    }),
    judges: [createWardenEvalJudge(apiKey)],
    judgeThreshold: 1,
    skipIf: () => !providerApiKey,
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
