import { join } from 'node:path';
import { afterAll, expect } from 'vitest';
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
import {
  matrixScenarioKind,
  summarizeSecurityMatrix,
  type MatrixLane,
  type MatrixResult,
} from './security-matrix.js';
import type { EvalMeta } from './types.js';

/**
 * Pinned so a skill edit in warden-skills cannot silently move the matrix.
 * Bump deliberately and rerun with `run-evals` to record new results.
 */
const WARDEN_SKILLS_REMOTE = 'getsentry/warden-skills@daf01f970a28450627a8d2d61d9915a742a735e2';

/** Remote security skills under test. Each skill's scenarios live in the category of the same name. */
const MATRIX_SKILLS = ['wrdn-authz', 'wrdn-code-execution', 'wrdn-data-exfil', 'wrdn-dos-review'] as const;

const SECURITY_REVIEW_SKILL = '../warden/src/builtin-skills/security-review/SKILL.md';
const MATRIX_RUN_TIMEOUT_MS = 240_000;
const MATRIX_EVAL_TIMEOUT_MS = MATRIX_RUN_TIMEOUT_MS + 60_000;

const provider = resolveEvalProvider();
const remoteSkillPaths = new Map<string, Promise<string>>();
const results: MatrixResult[] = [];

// Fetch lazily inside tests so suites without credentials never touch the network.
function resolveRemoteSkillPath(name: string): Promise<string> {
  let path = remoteSkillPaths.get(name);
  if (!path) {
    path = resolveSkillAsync(name, undefined, { remote: WARDEN_SKILLS_REMOTE }).then((skill) => {
      if (!skill.rootDir) {
        throw new Error(`Remote skill ${name} resolved without a rootDir`);
      }
      return join(skill.rootDir, 'SKILL.md');
    });
    remoteSkillPaths.set(name, path);
  }
  return path;
}

function describeLane(
  skill: string,
  lane: MatrixLane,
  evals: EvalMeta[],
  resolveMeta: (meta: EvalMeta) => Promise<EvalMeta>,
): void {
  const laneSkill = lane === 'skill' ? skill : 'security-review';
  describeEval(
    `security-matrix/${skill}/${laneSkill}`,
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
            const record = (passed: boolean) => results.push({
              skill,
              scenario: scenario.name,
              kind: matrixScenarioKind(scenario),
              lane,
              passed,
            });
            const meta = await resolveMeta(scenario);
            try {
              // run() throws when the judge score misses the threshold.
              const result = await run(meta);
              const output = WardenEvalOutputSchema.parse(result.output);
              expect(output.name).toBe(formatEvalId(meta));
              record(true);
              console.log(`\n${output.summary}`);
              console.log(`  Findings: ${output.findings.length}`);
            } catch (error) {
              record(false);
              throw error;
            }
          },
        );
      }
    },
  );
}

// Each scenario runs under security-review and under the wrdn skill that owns the
// category. A bug only the wrdn lane catches is coverage security-review lacks.
for (const skill of MATRIX_SKILLS) {
  const evals = discoverEvalScenarios({
    category: skill,
    skill: SECURITY_REVIEW_SKILL,
    runtime: 'pi',
    model: 'anthropic/claude-sonnet-4-6',
  });

  describeLane(skill, 'security-review', evals, async (meta) => meta);
  describeLane(
    skill,
    'skill',
    evals.map((meta) => ({ ...meta, skillName: skill })),
    async (meta) => ({ ...meta, skillPath: await resolveRemoteSkillPath(skill) }),
  );
}

afterAll(() => {
  if (results.length > 0) {
    console.log(`\n${summarizeSecurityMatrix(results)}`);
  }
});
