import { beforeAll, expect } from 'vitest';
import { describeEval } from 'vitest-evals';
import {
  createVerificationEvalHarness,
  discoverVerificationEvalScenarios,
  VerificationEvalOutputSchema,
} from './verification.js';

const apiKey = process.env['ANTHROPIC_API_KEY'];
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
      apiKey: apiKey ?? '',
      verbose: true,
    }),
    judgeThreshold: null,
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
          const output = VerificationEvalOutputSchema.parse(result.output);

          expect(output.verdict).toBe(meta.expectedVerdict);
          console.log(`\nverification: expected ${output.expectedVerdict}, got ${output.verdict}`);
          console.log(`  Findings: ${output.findings.length}`);
        },
      );
    }
  },
);
