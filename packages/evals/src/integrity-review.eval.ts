import { expect } from 'vitest';
import { describeEval } from 'vitest-evals';
import {
  createWardenEvalHarness,
  createWardenEvalJudge,
  WardenEvalOutputSchema,
} from './harness.js';
import { discoverEvalScenarios } from './index.js';
import { formatEvalId, formatEvalTestName } from './names.js';

const apiKey = process.env['ANTHROPIC_API_KEY'] ?? '';
const evals = discoverEvalScenarios({
  category: 'integrity-review',
  skill: '../warden/src/builtin-skills/integrity-review/SKILL.md',
  runtime: 'pi',
  model: 'anthropic/claude-sonnet-4-6',
});
// Multi-file fixtures run several hunks plus verification and merge passes,
// which can exceed the 120s the single-file suites use.
const INTEGRITY_REVIEW_RUN_TIMEOUT_MS = 180_000;
const INTEGRITY_REVIEW_EVAL_TIMEOUT_MS = INTEGRITY_REVIEW_RUN_TIMEOUT_MS + 60_000;

describeEval(
  'integrity-review',
  {
    harness: createWardenEvalHarness({
      apiKey,
      timeoutMs: INTEGRITY_REVIEW_RUN_TIMEOUT_MS,
      verbose: true,
    }),
    judges: [createWardenEvalJudge(apiKey)],
    judgeThreshold: 1,
    skipIf: () => !apiKey,
  },
  (it) => {
    for (const meta of evals) {
      it(
        formatEvalTestName(meta),
        { timeout: INTEGRITY_REVIEW_EVAL_TIMEOUT_MS },
        async ({ run }) => {
          const result = await run(meta);
          const output = WardenEvalOutputSchema.parse(result.output);

          expect(output.name).toBe(formatEvalId(meta));
          console.log(`\n${output.summary}`);
          console.log(`  Findings: ${output.findings.length}`);
        },
      );
    }
  },
);
