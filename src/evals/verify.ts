import { existsSync, readFileSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { z } from 'zod';
import { namedJudge } from 'vitest-evals';
import type { JudgeContext } from 'vitest-evals';
import {
  normalizeContent,
  normalizeMetadata,
  toJsonValue,
  type Harness,
} from 'vitest-evals/harness';
import { resolveSkillAsync } from '../skills/loader.js';
import { verifyFindings } from '../sdk/verify.js';
import { FindingSchema, type Finding, type UsageStats } from '../types/index.js';
import { RuntimeNameSchema, type RuntimeName } from '../sdk/runtimes/types.js';
import { discoverEvalScenarioFiles, resolveEvalSkillName } from './index.js';
import { formatEvalId } from './names.js';
import { setupEvalRepo } from './runner.js';
import type { EvalMeta } from './types.js';
import { usageToSummary } from './usage.js';

const DEFAULT_VERIFICATION_RUNTIME: RuntimeName = 'pi';
const DEFAULT_VERIFICATION_MODEL = 'anthropic/claude-sonnet-4-6';

const VerificationVerdictSchema = z.enum(['keep', 'reject']);

const VerificationExpectationSchema = z.object({
  verdict: VerificationVerdictSchema,
});

const VerificationScenarioFileSchema = z.object({
  name: z.string().optional(),
  given: z.string(),
  files: z.array(z.string()).min(1),
  candidate: FindingSchema,
  expect: VerificationExpectationSchema,
  model: z.string().optional(),
  runtime: RuntimeNameSchema.optional(),
});

export const VerificationEvalOutputSchema = z.object({
  name: z.string(),
  given: z.string(),
  expectedVerdict: VerificationVerdictSchema,
  verdict: VerificationVerdictSchema,
  runtime: RuntimeNameSchema,
  model: z.string(),
  findings: z.array(FindingSchema),
});
export type VerificationEvalOutput = z.infer<typeof VerificationEvalOutputSchema>;

export interface VerificationEvalMeta {
  name: string;
  category: string;
  skillName: string;
  given: string;
  skillPath: string;
  filePaths: string[];
  candidate: Finding;
  expectedVerdict: z.infer<typeof VerificationVerdictSchema>;
  model: string;
  runtime: RuntimeName;
}

export interface VerificationScenarioSetOptions {
  category: string;
  skill: string;
  runtime?: RuntimeName;
  model?: string;
  baseDir?: string;
}

export interface RunVerificationEvalOptions {
  apiKey: string;
  runtime?: RuntimeName;
  model?: string;
  verbose?: boolean;
}

interface VerificationEvalRunResult {
  name: string;
  meta: VerificationEvalMeta;
  findings: Finding[];
  verdict: z.infer<typeof VerificationVerdictSchema>;
  logs: string[];
  durationMs: number;
  usage?: UsageStats;
}

function getEvalsDir(): string {
  return join(import.meta.dirname, '..', '..', 'evals');
}

function loadVerificationScenario(filePath: string) {
  const content = readFileSync(filePath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid verification eval ${filePath}: ${message}`);
  }

  const validated = VerificationScenarioFileSchema.safeParse(parsed);
  if (!validated.success) {
    const issues = validated.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
    throw new Error(`Invalid verification eval ${filePath}: ${issues}`);
  }
  return validated.data;
}

function copiedFixturePath(srcPath: string): string {
  return `${basename(dirname(srcPath))}/${basename(srcPath)}`;
}

export function resolveVerificationEvalMeta(
  scenarioPath: string,
  options: VerificationScenarioSetOptions
): VerificationEvalMeta {
  const evalsDir = options.baseDir ?? getEvalsDir();
  const scenario = loadVerificationScenario(scenarioPath);
  const name = scenario.name ?? basename(scenarioPath).replace(/\.json$/, '');
  const skillPath = join(evalsDir, options.skill);

  if (!existsSync(skillPath)) {
    throw new Error(`Verification eval skill not found for ${options.category}/${name}: ${options.skill}`);
  }

  const filePaths = scenario.files.map((file) => {
    const filePath = join(evalsDir, file);
    if (!existsSync(filePath)) {
      throw new Error(`Verification eval fixture not found for ${options.category}/${name}: ${file}`);
    }
    return filePath;
  });

  return {
    name,
    category: options.category,
    skillName: resolveEvalSkillName(skillPath),
    given: scenario.given,
    skillPath,
    filePaths,
    candidate: scenario.candidate,
    expectedVerdict: scenario.expect.verdict,
    model: scenario.model ?? options.model ?? DEFAULT_VERIFICATION_MODEL,
    runtime: scenario.runtime ?? options.runtime ?? DEFAULT_VERIFICATION_RUNTIME,
  };
}

export function discoverVerificationEvalScenarios(options: VerificationScenarioSetOptions): VerificationEvalMeta[] {
  return discoverEvalScenarioFiles(options.category, options.baseDir)
    .map((file) => resolveVerificationEvalMeta(file, options));
}

export async function runVerificationEval(
  meta: VerificationEvalMeta,
  options: RunVerificationEvalOptions
): Promise<VerificationEvalRunResult> {
  const startTime = Date.now();
  const name = formatEvalId(meta);
  const logs: string[] = [];

  const log = (msg: string): void => {
    logs.push(`[${Date.now() - startTime}ms] ${msg}`);
    if (options.verbose) {
      console.log(`  [eval:${name}] ${msg}`);
    }
  };

  const repoMeta: EvalMeta = {
    name: meta.name,
    category: meta.category,
    skillName: meta.skillName,
    given: meta.given,
    skillPath: meta.skillPath,
    filePaths: meta.filePaths,
    model: meta.model,
    runtime: meta.runtime,
    should_find: [{ finding: meta.given, required: true }],
    should_not_find: [],
  };

  let repoDir: string | undefined;
  try {
    repoDir = setupEvalRepo(repoMeta, log);
    const skillSrcDir = dirname(meta.skillPath);
    const skillPath = existsSync(join(skillSrcDir, 'SKILL.md'))
      ? join(repoDir, '.warden', 'skills', basename(skillSrcDir))
      : join(repoDir, '.warden', 'skills', basename(meta.skillPath));
    const skill = await resolveSkillAsync(skillPath);
    const runtime = options.runtime ?? meta.runtime;
    const model = options.model ?? meta.model;

    log(`Verifying candidate with model: ${model} [${runtime}]`);
    const result = await verifyFindings([meta.candidate], {
      repoPath: repoDir,
      skill,
      apiKey: options.apiKey,
      runtime,
      model,
      prContext: {
        title: meta.given,
        changedFiles: meta.filePaths.map(copiedFixturePath),
      },
    });

    const verdict = result.findings.length > 0 ? 'keep' : 'reject';
    log(`Verifier returned ${verdict} (${result.findings.length} finding(s))`);

    return {
      name,
      meta,
      findings: result.findings,
      verdict,
      logs,
      durationMs: Date.now() - startTime,
      usage: result.usage,
    };
  } finally {
    if (repoDir) {
      rmSync(repoDir, { recursive: true, force: true });
    }
  }
}

export function createVerificationEvalHarness(options: RunVerificationEvalOptions): Harness<VerificationEvalMeta> {
  return {
    name: 'warden-verification',
    prompt: async () => {
      throw new Error('Warden verification evals use runVerificationEval directly.');
    },
    run: async (meta, context) => {
      const modelOverride = typeof context.metadata['model'] === 'string'
        ? context.metadata['model']
        : undefined;
      const runtimeOverride = context.metadata['runtime'] === 'claude'
        || context.metadata['runtime'] === 'pi'
          ? context.metadata['runtime']
          : undefined;
      const model = modelOverride ?? options.model ?? meta.model;
      const runtime = runtimeOverride ?? options.runtime ?? meta.runtime;
      const result = await runVerificationEval(meta, {
        ...options,
        model,
        runtime,
      });
      const output: VerificationEvalOutput = {
        name: result.name,
        given: meta.given,
        expectedVerdict: meta.expectedVerdict,
        verdict: result.verdict,
        runtime,
        model,
        findings: result.findings,
      };

      return {
        output: toJsonValue(output),
        session: {
          messages: [
            {
              role: 'user',
              content: normalizeContent({
                given: meta.given,
                candidate: meta.candidate,
                expectedVerdict: meta.expectedVerdict,
              }),
            },
            {
              role: 'assistant',
              content: normalizeContent(output),
            },
          ],
          outputText: result.verdict,
          provider: runtime,
          model,
          metadata: normalizeMetadata({
            category: meta.category,
            scenario: meta.name,
            skill: meta.skillName,
            skillPath: meta.skillPath,
          }),
        },
        usage: usageToSummary({ provider: runtime, model, usage: result.usage }),
        timings: { totalMs: result.durationMs },
        artifacts: {
          logs: toJsonValue(result.logs) ?? [],
        },
        errors: [],
      };
    },
  };
}

/** Creates the deterministic judge for verifier-only eval verdicts. */
export function createVerificationEvalJudge() {
  return namedJudge<JudgeContext<VerificationEvalMeta>>('WardenVerificationEvalJudge', async ({ inputValue, run }) => {
    const output = VerificationEvalOutputSchema.safeParse(run.output);
    if (!output.success) {
      return {
        score: 0,
        metadata: {
          rationale: `Invalid Warden verification output: ${output.error.message}`,
        },
      };
    }

    const passed = output.data.verdict === inputValue.expectedVerdict;

    return {
      score: passed ? 1 : 0,
      metadata: {
        rationale: passed
          ? 'Verifier verdict matched expected result.'
          : `Expected ${inputValue.expectedVerdict}, got ${output.data.verdict}.`,
        expectedVerdict: inputValue.expectedVerdict,
        verdict: output.data.verdict,
        findings: output.data.findings.length,
      },
    };
  });
}
