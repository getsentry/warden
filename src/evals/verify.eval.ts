import { describeEval } from 'vitest-evals';
import {
  createVerificationEvalHarness,
  createVerificationEvalJudge,
  discoverVerificationEvalScenarios,
  VerificationEvalOutputSchema,
} from './verify.js';
import { formatEvalTestName } from './names.js';

const apiKey = process.env['ANTHROPIC_API_KEY'] ?? '';
const evals = discoverVerificationEvalScenarios({
  category: 'verification',
  skill: '../src/builtin-skills/security-review/SKILL.md',
  runtime: 'pi',
  model: 'anthropic/claude-sonnet-4-6',
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
    skipIf: () => !apiKey,
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
