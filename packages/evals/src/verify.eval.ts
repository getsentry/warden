import { describeEval } from 'vitest-evals';
import {
  createVerificationEvalHarness,
  createVerificationEvalJudge,
  discoverVerificationEvalScenarios,
  VerificationEvalOutputSchema,
} from './verify.js';
import { formatEvalTestName } from './names.js';
import {
  DEFAULT_EVAL_RUNTIME,
  defaultEvalModel,
  getEvalProviderApiKey,
  getEvalRuntimeApiKey,
} from './auth.js';

const model = defaultEvalModel();
const apiKey = getEvalRuntimeApiKey(model);
const evals = discoverVerificationEvalScenarios({
  category: 'verification',
  skill: '../warden/src/builtin-skills/security-review/SKILL.md',
  runtime: DEFAULT_EVAL_RUNTIME,
  model,
});

describeEval(
  'verification',
  {
    harness: createVerificationEvalHarness({
      apiKey,
      verbose: true,
    }),
    judges: [createVerificationEvalJudge()],
    judgeThreshold: 1,
    skipIf: () => !getEvalRuntimeApiKey(model) && !getEvalProviderApiKey(model),
  },
  (it) => {
    for (const meta of evals) {
      it(
        formatEvalTestName(meta),
        { timeout: 120_000 },
        async ({ run }) => {
          const result = await run(meta);
          const output = VerificationEvalOutputSchema.safeParse(result.output);

          if (output.success) {
            console.log(`\nverification: expected ${output.data.expectedVerdict}, got ${output.data.verdict}`);
            console.log(`  Findings: ${output.data.findings.length}`);
          } else {
            console.log(`\nverification: invalid harness output: ${output.error.message}`);
          }
        },
      );
    }
  },
);
