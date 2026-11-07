import { join } from 'node:path';
import { expect } from 'vitest';
import { describeEval } from 'vitest-evals';
import { resolveSkillAsync } from '@sentry/warden';
import {
  createWardenEvalHarness,
  createWardenEvalJudge,
  WardenEvalOutputSchema,
} from './harness.js';
import { discoverEvalScenarios } from './index.js';
import { formatEvalId, formatEvalTestName } from './names.js';
import { resolveEvalProvider } from './provider.js';
import type { EvalMeta } from './types.js';

/**
 * Pinned so a skill edit in warden-skills cannot silently move the matrix.
 * Bump deliberately and rerun with `run-evals` to record new results.
 */
const WARDEN_SKILLS_REMOTE = 'getsentry/warden-skills@daf01f970a28450627a8d2d61d9915a742a735e2';

/** Remote security skill under test. Its scenarios live in the category of the same name. */
const WRDN_SKILL = 'wrdn-authz';

const SECURITY_REVIEW_SKILL = '../warden/src/builtin-skills/security-review/SKILL.md';
const MATRIX_RUN_TIMEOUT_MS = 240_000;
const MATRIX_EVAL_TIMEOUT_MS = MATRIX_RUN_TIMEOUT_MS + 60_000;

const provider = resolveEvalProvider();
let wrdnSkillPath: Promise<string> | undefined;

// Fetch lazily inside tests so suites without credentials never touch the network.
function resolveWrdnSkillPath(): Promise<string> {
  wrdnSkillPath ??= resolveSkillAsync(WRDN_SKILL, undefined, { remote: WARDEN_SKILLS_REMOTE }).then((skill) => {
    if (!skill.rootDir) {
      throw new Error(`Remote skill ${WRDN_SKILL} resolved without a rootDir`);
    }
    return join(skill.rootDir, 'SKILL.md');
  });
  return wrdnSkillPath;
}

function describeLane(lane: string, evals: EvalMeta[], resolveMeta: (meta: EvalMeta) => Promise<EvalMeta>): void {
  describeEval(
    lane,
    {
      harness: createWardenEvalHarness({
        apiKey: provider.apiKey,
        model: provider.model,
        runtime: provider.runtime,
        auxiliaryModel: provider.auxiliaryModel,
        timeoutMs: MATRIX_RUN_TIMEOUT_MS,
        verbose: true,
      }),
      judges: [createWardenEvalJudge({ apiKey: provider.apiKey, model: provider.judgeModel })],
      judgeThreshold: 1,
      skipIf: () => !provider.enabled,
    },
    (it) => {
      for (const scenario of evals) {
        it(
          formatEvalTestName(scenario),
          { timeout: MATRIX_EVAL_TIMEOUT_MS },
          async ({ run }) => {
            const meta = await resolveMeta(scenario);
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
}

// Each scenario runs under security-review and under the wrdn skill that owns the
// category. A scenario only the wrdn lane passes is coverage security-review lacks.
const evals = discoverEvalScenarios({
  category: WRDN_SKILL,
  skill: SECURITY_REVIEW_SKILL,
  runtime: 'pi',
  model: 'anthropic/claude-sonnet-4-6',
});

describeLane(`security-matrix/${WRDN_SKILL}/security-review`, evals, async (meta) => meta);
describeLane(
  `security-matrix/${WRDN_SKILL}/${WRDN_SKILL}`,
  evals.map((meta) => ({ ...meta, skillName: WRDN_SKILL })),
  async (meta) => ({ ...meta, skillPath: await resolveWrdnSkillPath() }),
);
