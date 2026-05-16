import { z } from 'zod';
import type { SkillDefinition } from '../config/schema.js';
import { FindingSchema, type Finding, type UsageStats } from '../types/index.js';
import { aggregateUsage } from './usage.js';
import { extractBalancedJson } from './extract.js';
import {
  WardenAuthenticationError,
  classifyError,
  isAuthenticationError,
  isAuthenticationErrorMessage,
  isSubprocessError,
} from './errors.js';
import {
  getRuntime,
  getRuntimeProviderOptions,
  type RuntimeName,
  type SkillRunResult,
} from './runtimes/index.js';
import type { FindingProcessingEvent } from './types.js';
import { runPool } from '../utils/index.js';
import {
  buildChangedFilesSection,
  buildJsonOutputSection,
  buildPullRequestContextSection,
  buildTaggedSection,
  joinPromptSections,
  type PromptPRContext,
} from './prompt-sections.js';

export interface VerifyFindingsOptions {
  repoPath: string;
  skill: SkillDefinition;
  apiKey?: string;
  runtime?: RuntimeName;
  model?: string;
  maxTurns?: number;
  abortController?: AbortController;
  pathToClaudeCodeExecutable?: string;
  prContext?: PromptPRContext;
  onFindingProcessing?: (event: FindingProcessingEvent) => void;
}

export interface VerifyFindingsResult {
  findings: Finding[];
  usage?: UsageStats;
}

const VerificationVerdictSchema = z.object({
  verdict: z.enum(['keep', 'revise', 'reject']),
  finding: FindingSchema.nullish(),
  reason: z.string().optional(),
});

type VerificationVerdict = z.infer<typeof VerificationVerdictSchema>;

interface VerificationTaskResult {
  finding?: Finding;
  usage?: UsageStats;
}

const JSON_OBJECT_START = /\{/g;
const VERIFICATION_CONCURRENCY = 4;

function isAbortRequested(error: unknown, abortController?: AbortController): boolean {
  return (abortController?.signal.aborted ?? false) || classifyError(error).code === 'aborted';
}

function buildVerificationSystemPrompt(skill: SkillDefinition): string {
  return `<role>
You are Warden's finding verifier. You validate one candidate finding at a time.
Your job is to deeply trace the code, look for mitigations and intent, then keep, revise, or reject the candidate.
</role>

<tools>
Use read-only tools to inspect the repository. Read the reported file and use Grep/Glob to trace callers, imports, wrappers, guards, validators, and related code.
</tools>

<skill_instructions>
The candidate was produced for this skill. Use these criteria as the only scope for verification:

${skill.prompt}
</skill_instructions>

<verification_stance>
- Keep findings only when the issue is still real after tracing.
- Revise findings when the issue is real but the severity, confidence, title, description, or verification needs a narrower scope.
- Reject findings when the path is mitigated, unreachable, intentional, outside skill scope, or lacks a concrete code-level violation of the skill criteria.
- Do not reject solely because broader repository invariants or caller behavior are incomplete in the inspected context. If the changed code shows a concrete source, boundary, and sink with no verified mitigation, keep or revise the finding.
- When reachability or impact is plausible but not fully proven, keep the finding and revise severity, confidence, or scope instead of rejecting it.
</verification_stance>

${buildJsonOutputSection(`
{"verdict":"keep|revise|reject","finding":{...},"reason":"short reason"}

Use "finding" only for verdict "revise". For revised findings, return the complete Warden finding object and keep the original id.
`)}`;
}

function buildVerificationUserPrompt(finding: Finding, prContext?: PromptPRContext): string {
  return joinPromptSections([
    buildPullRequestContextSection(prContext),
    buildChangedFilesSection(prContext, finding.location?.path),
    buildTaggedSection('candidate_finding', JSON.stringify(finding, null, 2)),
    `<task>
Verify this candidate. Return keep, revise, or reject.
</task>`,
  ]);
}

function parseVerificationVerdict(text: string): VerificationVerdict | null {
  for (const match of text.matchAll(JSON_OBJECT_START)) {
    if (match.index === undefined) continue;

    const json = extractBalancedJson(text, match.index);
    if (!json) continue;

    try {
      const parsed = JSON.parse(json);
      const result = VerificationVerdictSchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
    } catch {
      // Keep scanning in case prose or another object appears before the verdict.
    }
  }

  return null;
}

function applyVerdict(finding: Finding, verdict: VerificationVerdict | null): Finding | null {
  if (!verdict || verdict.verdict === 'keep') {
    return finding;
  }

  if (verdict.verdict === 'reject') {
    return null;
  }

  if (!verdict.finding) {
    return finding;
  }

  // Verification runs after hunk validation, so revisions keep the original
  // validated anchors and fix payload.
  const revised = { ...verdict.finding, id: finding.id };

  if (finding.location) {
    revised.location = finding.location;
  } else {
    delete revised.location;
  }

  if (finding.additionalLocations) {
    revised.additionalLocations = finding.additionalLocations;
  } else {
    delete revised.additionalLocations;
  }

  if (finding.suggestedFix) {
    revised.suggestedFix = finding.suggestedFix;
  } else {
    delete revised.suggestedFix;
  }

  if (finding.elapsedMs !== undefined) {
    revised.elapsedMs = finding.elapsedMs;
  } else {
    delete revised.elapsedMs;
  }

  const result = FindingSchema.safeParse(revised);
  return result.success ? result.data : finding;
}

function throwIfAuthenticationFailure(
  authError: string | undefined,
  result: SkillRunResult | undefined
): void {
  if (authError) {
    throw new WardenAuthenticationError(authError);
  }

  if (!result) return;

  const authMessage = result.errors.find(isAuthenticationErrorMessage);
  if (result.status === 'auth_error') {
    throw new WardenAuthenticationError(authMessage);
  }

  if (authMessage) {
    throw new WardenAuthenticationError(authMessage);
  }
}

function notifyVerdict(
  options: VerifyFindingsOptions,
  finding: Finding,
  verdict: VerificationVerdict | null,
  next: Finding | null
): void {
  if (!verdict) return;

  if (verdict.verdict === 'reject') {
    options.onFindingProcessing?.({
      stage: 'verification',
      action: 'rejected',
      finding,
      reason: verdict.reason,
    });
    return;
  }

  if (verdict.verdict === 'revise' && next) {
    options.onFindingProcessing?.({
      stage: 'verification',
      action: 'revised',
      finding,
      replacement: next,
      reason: verdict.reason,
    });
  }
}

function keepFindingAfterInterruptedVerification(finding: Finding): VerificationTaskResult {
  // An abort is inconclusive, not a verifier rejection. Preserve candidates so
  // interrupted runs report the partial findings already collected.
  return { finding };
}

/**
 * Verify candidate findings with a second read-only repo-aware agent pass.
 */
export async function verifyFindings(
  findings: Finding[],
  options: VerifyFindingsOptions
): Promise<VerifyFindingsResult> {
  if (findings.length === 0) {
    return { findings };
  }

  const runtimeName = options.runtime ?? 'pi';
  const runtime = getRuntime(runtimeName);
  const systemPrompt = buildVerificationSystemPrompt(options.skill);

  const results = await runPool<Finding, VerificationTaskResult>(
    findings,
    VERIFICATION_CONCURRENCY,
    async (finding) => {
      if (options.abortController?.signal.aborted) {
        return keepFindingAfterInterruptedVerification(finding);
      }

      try {
        const { result, authError } = await runtime.runSkill({
          apiKey: options.apiKey,
          systemPrompt,
          userPrompt: buildVerificationUserPrompt(finding, options.prContext),
          repoPath: options.repoPath,
          skillName: `${options.skill.name}:verification`,
          options: {
            model: options.model,
            maxTurns: options.maxTurns,
            abortController: options.abortController,
          },
          tools: options.skill.tools,
          providerOptions: getRuntimeProviderOptions(runtimeName, {
            pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
          }),
        });

        throwIfAuthenticationFailure(authError, result);

        const verdict = result?.status === 'success'
          ? parseVerificationVerdict(result.text)
          : null;
        const next = applyVerdict(finding, verdict);
        notifyVerdict(options, finding, verdict, next);
        return { finding: next ?? undefined, usage: result?.usage };
      } catch (error) {
        if (isAbortRequested(error, options.abortController)) {
          return keepFindingAfterInterruptedVerification(finding);
        }

        if (error instanceof WardenAuthenticationError) {
          throw error;
        }

        if (isSubprocessError(error)) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new WardenAuthenticationError(
            `Claude Code subprocess failed (${errorMessage}).\n` +
            `This usually means the claude CLI cannot run in this environment.`,
            { cause: error }
          );
        }

        if (isAuthenticationError(error)) {
          throw new WardenAuthenticationError(undefined, { cause: error });
        }

        return { finding };
      }
    }
  );

  const verified = results.flatMap((result) => result.finding ? [result.finding] : []);
  const usage = results.map((result) => result.usage).filter((u): u is UsageStats => u !== undefined);

  return {
    findings: verified,
    usage: usage.length > 0 ? aggregateUsage(usage) : undefined,
  };
}
