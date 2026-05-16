import { expect } from 'vitest';
import { describeEval } from 'vitest-evals';
import {
  createVerificationEvalHarness,
  createVerificationEvalJudge,
  discoverVerificationEvalScenarios,
  VerificationEvalOutputSchema,
} from './verify.js';

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
        `${meta.name}: ${meta.given}`,
        { timeout: 120_000 },
        async ({ run }) => {
          const result = await run(meta);
          const output = VerificationEvalOutputSchema.parse(result.output);

          expect(output.verdict).toBe(meta.expectedVerdict);
          console.log(`\nverification: expected ${output.expectedVerdict}, got ${output.verdict}`);
          console.log(`  Findings: ${output.findings.length}`);
        },
      );
    }
  },
);
