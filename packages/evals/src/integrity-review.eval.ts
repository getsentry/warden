import { expect } from 'vitest';
import { describeEval } from 'vitest-evals';
import {
  createWardenEvalHarness,
  createWardenEvalJudge,
  WardenEvalOutputSchema,
} from './harness.js';
import { discoverEvalScenarios } from './index.js';
import { formatEvalId, formatEvalTestName } from './names.js';
import { resolveEvalProvider } from './provider.js';

const provider = resolveEvalProvider();
const evals = discoverEvalScenarios({
  category: 'integrity-review',
  skill: '../warden/src/builtin-skills/integrity-review/SKILL.md',
  runtime: 'pi',
  model: 'openai/gpt-6-luna',
});
// Multi-file fixtures run several hunks plus verification and merge passes,
// which can exceed the 120s the single-file suites use.
const INTEGRITY_REVIEW_RUN_TIMEOUT_MS = 180_000;
const INTEGRITY_REVIEW_EVAL_TIMEOUT_MS = INTEGRITY_REVIEW_RUN_TIMEOUT_MS + 60_000;

describeEval(
  'integrity-review',
  {
    harness: createWardenEvalHarness({
      apiKey: provider.apiKey,
      model: provider.model,
      runtime: provider.runtime,
      auxiliaryModel: provider.auxiliaryModel,
      timeoutMs: INTEGRITY_REVIEW_RUN_TIMEOUT_MS,
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
