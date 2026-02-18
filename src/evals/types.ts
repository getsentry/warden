import { z } from 'zod';
import { SeveritySchema } from '../types/index.js';
import type { SkillReport, UsageStats } from '../types/index.js';

/** Default model for eval skill execution and judging. */
export const DEFAULT_EVAL_MODEL = 'claude-sonnet-4-6';

/**
 * A "should find" assertion in BDD style.
 */
export const ShouldFindSchema = z.object({
  /** Natural language description of the expected finding for the LLM judge */
  finding: z.string(),
  /** Expected severity level (hint for the judge, not a strict match) */
  severity: SeveritySchema.optional(),
  /** If true (default), eval fails when this is not found */
  required: z.boolean().default(true),
});
export type ShouldFind = z.infer<typeof ShouldFindSchema>;

/**
 * A single eval scenario within a YAML eval file.
 */
export const EvalScenarioSchema = z.object({
  /** Scenario name (e.g., "null-property-access") */
  name: z.string(),
  /** What this eval tests (BDD "given" / description) */
  given: z.string(),
  /** Fixture files to use, relative to evals/ directory */
  files: z.array(z.string()).min(1),
  /** Model override for this specific scenario */
  model: z.string().optional(),
  /** What Warden should find (BDD "then") */
  should_find: z.array(ShouldFindSchema).min(1),
  /** What Warden should NOT report (precision assertions) */
  should_not_find: z.array(z.string()).default([]),
});
export type EvalScenario = z.infer<typeof EvalScenarioSchema>;

/**
 * Root schema for a YAML eval file. Each file defines a category of evals
 * sharing a common skill.
 *
 * Example YAML:
 *   skill: skills/bug-detection.md
 *   evals:
 *     - name: null-property-access
 *       given: code that accesses .find() result without null checking
 *       files: [fixtures/null-property-access/handler.ts]
 *       should_find:
 *         - finding: null access on user.name
 *           severity: high
 */
export const EvalFileSchema = z.object({
  /** Skill to run, relative to evals/ directory */
  skill: z.string(),
  /** Default model for all evals in this file */
  model: z.string().default(DEFAULT_EVAL_MODEL),
  /** List of eval scenarios */
  evals: z.array(EvalScenarioSchema).min(1),
});
export type EvalFile = z.infer<typeof EvalFileSchema>;

/**
 * Resolved eval metadata ready for execution. Combines the file-level
 * defaults with scenario-level overrides.
 */
export interface EvalMeta {
  /** Scenario name (e.g., "null-property-access") */
  name: string;
  /** Category name from the YAML filename (e.g., "bug-detection") */
  category: string;
  /** What this eval tests (BDD "given") */
  given: string;
  /** Resolved absolute path to the skill file */
  skillPath: string;
  /** Resolved absolute paths to fixture files */
  filePaths: string[];
  /** Model to use for skill execution */
  model: string;
  /** What Warden should find */
  should_find: ShouldFind[];
  /** What Warden should NOT report */
  should_not_find: string[];
}

/**
 * Judge verdict for a single expectation.
 */
export const ExpectationVerdictSchema = z.object({
  /** Whether this expectation was met */
  met: z.boolean(),
  /** Which finding matched (by index), or null if none */
  matchedFindingIndex: z.number().int().nonnegative().nullable(),
  /** Brief reasoning from the judge */
  reasoning: z.string(),
});
export type ExpectationVerdict = z.infer<typeof ExpectationVerdictSchema>;

/**
 * Judge verdict for a single anti-expectation.
 */
export const AntiExpectationVerdictSchema = z.object({
  /** Whether a finding violated this anti-expectation (true = violation found) */
  violated: z.boolean(),
  /** Which finding violated (by index), or null if none */
  violatingFindingIndex: z.number().int().nonnegative().nullable(),
  /** Brief reasoning from the judge */
  reasoning: z.string(),
});
export type AntiExpectationVerdict = z.infer<typeof AntiExpectationVerdictSchema>;

/**
 * Complete judge response for an eval.
 */
export const JudgeResponseSchema = z.object({
  expectations: z.array(ExpectationVerdictSchema),
  antiExpectations: z.array(AntiExpectationVerdictSchema),
});
export type JudgeResponse = z.infer<typeof JudgeResponseSchema>;

/**
 * Result of running a single eval scenario.
 */
export interface EvalResult {
  /** Display name (e.g., "bug-detection/null-property-access") */
  name: string;
  /** Eval metadata */
  meta: EvalMeta;
  /** Whether the eval passed overall */
  passed: boolean;
  /** Skill report from the agent run */
  report: SkillReport;
  /** Judge response with per-expectation verdicts */
  judgeResponse: JudgeResponse;
  /** Verbose logs from the agent run */
  logs: string[];
  /** Total duration of the eval (agent + judge) in ms */
  durationMs: number;
  /** Usage from the skill run */
  skillUsage?: UsageStats;
  /** Usage from the judge call */
  judgeUsage?: UsageStats;
}

/**
 * Determine if an eval passed based on judge response and eval metadata.
 */
export function evalPassed(meta: EvalMeta, judgeResponse: JudgeResponse): boolean {
  // Check required should_find assertions are met
  for (let i = 0; i < meta.should_find.length; i++) {
    const assertion = meta.should_find[i];
    const verdict = judgeResponse.expectations[i];
    if (assertion?.required && !verdict?.met) {
      return false;
    }
  }

  // Check no should_not_find assertions are violated
  for (const verdict of judgeResponse.antiExpectations) {
    if (verdict.violated) {
      return false;
    }
  }

  return true;
}

/**
 * Format an eval result for human-readable output.
 */
export function formatEvalResult(result: EvalResult): string {
  const status = result.passed ? 'PASS' : 'FAIL';
  const lines: string[] = [];

  lines.push(`[${status}] ${result.name}`);
  lines.push(`  Given: ${result.meta.given}`);
  lines.push(`  Findings: ${result.report.findings.length}`);

  for (let i = 0; i < result.meta.should_find.length; i++) {
    const assertion = result.meta.should_find[i];
    const verdict = result.judgeResponse.expectations[i];
    const mark = verdict?.met ? 'PASS' : 'FAIL';
    const req = assertion?.required ? '' : ' (optional)';
    lines.push(`  [${mark}] should find: ${assertion?.finding ?? 'unknown'}${req}`);
    if (verdict?.reasoning) {
      lines.push(`    -> ${verdict.reasoning}`);
    }
  }

  for (let i = 0; i < result.meta.should_not_find.length; i++) {
    const assertion = result.meta.should_not_find[i];
    const verdict = result.judgeResponse.antiExpectations[i];
    const mark = verdict?.violated ? 'FAIL' : 'PASS';
    lines.push(`  [${mark}] should not find: ${assertion ?? 'unknown'}`);
    if (verdict?.reasoning) {
      lines.push(`    -> ${verdict.reasoning}`);
    }
  }

  return lines.join('\n');
}
