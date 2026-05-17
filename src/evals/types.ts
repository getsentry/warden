import { z } from 'zod';
import { RuntimeNameSchema } from '../sdk/runtimes/types.js';
import { SeveritySchema } from '../types/index.js';
import type { Finding } from '../types/index.js';
import type { RuntimeName } from '../sdk/runtimes/types.js';

/** Default model for eval skill execution and judging. */
export const DEFAULT_EVAL_MODEL = 'claude-sonnet-4-6';

/** Default runtime for eval skill execution. */
export const DEFAULT_EVAL_RUNTIME: RuntimeName = 'claude';

/**
 * A "should find" assertion in BDD style.
 */
export const ShouldFindSchema = z.object({
  /** Natural language description of the expected finding for the LLM judge */
  finding: z.string(),
  /** Expected severity level. When provided, evals require an exact normalized match. */
  severity: SeveritySchema.optional(),
  /** If true (default), eval fails when this is not found */
  required: z.boolean().default(true),
});
export type ShouldFind = z.infer<typeof ShouldFindSchema>;

/**
 * Maintainer-only provenance for standalone evals. Runners ignore this field.
 */
export const EvalScenarioNotesSchema = z.object({
  /** Original PR, issue, benchmark, or other source URL. */
  source: z.string().optional(),
  /** Which source side was captured when scaffolded from a PR. */
  side: z.string().optional(),
  /** Optional copied source notes, such as a PR body. */
  body: z.string().optional(),
}).passthrough();

/**
 * A single eval scenario within a YAML eval file or standalone JSON file.
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
  /** Runtime override for this specific scenario */
  runtime: RuntimeNameSchema.optional(),
  /** What Warden should find (BDD "then") */
  should_find: z.array(ShouldFindSchema).min(1),
  /** What Warden should NOT report (precision assertions) */
  should_not_find: z.array(z.string()).default([]),
  /** Optional maintainer-only provenance, ignored by eval execution */
  notes: EvalScenarioNotesSchema.optional(),
});
export type EvalScenario = z.infer<typeof EvalScenarioSchema>;

/**
 * A standalone eval scenario file. The scenario name defaults to the file
 * basename so adding cases does not require repeating it in JSON.
 */
export const EvalScenarioFileSchema = EvalScenarioSchema.extend({
  name: z.string().optional(),
});
export type EvalScenarioFile = z.infer<typeof EvalScenarioFileSchema>;

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
  /** Default runtime for all evals in this file */
  runtime: RuntimeNameSchema.default(DEFAULT_EVAL_RUNTIME),
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
  /** Category name from the YAML filename (e.g., "eval-bug-detection") */
  category: string;
  /** Resolved skill name from the skill frontmatter or file path */
  skillName: string;
  /** What this eval tests (BDD "given") */
  given: string;
  /** Resolved absolute path to the skill file */
  skillPath: string;
  /** Resolved absolute paths to fixture files */
  filePaths: string[];
  /** Model to use for skill execution */
  model: string;
  /** Runtime to use for skill execution */
  runtime: RuntimeName;
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
 * Determine if an eval passed based on judge response and eval metadata.
 */
export function evalPassed(
  meta: EvalMeta,
  judgeResponse: JudgeResponse,
  findings?: Finding[]
): boolean {
  // Check required should_find assertions are met
  for (let i = 0; i < meta.should_find.length; i++) {
    const assertion = meta.should_find[i];
    const verdict = judgeResponse.expectations[i];
    if (assertion?.required && !verdict?.met) {
      return false;
    }

    if (assertion?.required && assertion.severity && verdict?.met && findings) {
      const matchedFinding = verdict.matchedFindingIndex === null
        ? undefined
        : findings[verdict.matchedFindingIndex];
      if (matchedFinding?.severity !== assertion.severity) {
        return false;
      }
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
