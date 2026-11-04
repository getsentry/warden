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
  category: 'security-review',
  skill: '../warden/src/builtin-skills/security-review/SKILL.md',
  runtime: 'pi',
  model: 'anthropic/claude-sonnet-4-6',
});

describeEval(
  'security-review',
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
          console.log(`\n${output.summary}`);
          console.log(`  Findings: ${output.findings.length}`);
        },
      );
    }
  },
);
