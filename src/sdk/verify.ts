import { z } from 'zod';
import type { SkillDefinition } from '../config/schema.js';
import { FindingSchema, type Finding, type UsageStats } from '../types/index.js';
import { aggregateUsage } from './usage.js';
import { extractBalancedJson } from './extract.js';
import { getRuntime, getRuntimeProviderOptions, type RuntimeName } from './runtimes/index.js';
import type { FindingProcessingEvent } from './types.js';
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
  finding: FindingSchema.optional(),
  reason: z.string().optional(),
});

type VerificationVerdict = z.infer<typeof VerificationVerdictSchema>;

const JSON_OBJECT_START = /\{/g;

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
- Reject findings when the path is mitigated, unreachable, intentional, outside skill scope, or not proven from the inspected code.
- Prefer rejection or lower severity when reachability or impact depends on unproven assumptions.
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

  return { ...verdict.finding, id: finding.id };
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

  const runtimeName = options.runtime ?? 'claude';
  const runtime = getRuntime(runtimeName);
  const systemPrompt = buildVerificationSystemPrompt(options.skill);
  const usage: UsageStats[] = [];
  const verified: Finding[] = [];

  for (const finding of findings) {
    if (options.abortController?.signal.aborted) {
      verified.push(finding);
      continue;
    }

    try {
      const { result } = await runtime.runSkill({
        systemPrompt,
        userPrompt: buildVerificationUserPrompt(finding, options.prContext),
        repoPath: options.repoPath,
        skillName: `${options.skill.name}:verification`,
        options: {
          model: options.model,
          maxTurns: options.maxTurns,
          abortController: options.abortController,
        },
        providerOptions: getRuntimeProviderOptions(runtimeName, {
          pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
        }),
      });

      if (result?.usage) {
        usage.push(result.usage);
      }

      const verdict = result?.status === 'success'
        ? parseVerificationVerdict(result.text)
        : null;
      const next = applyVerdict(finding, verdict);
      notifyVerdict(options, finding, verdict, next);
      if (next) {
        verified.push(next);
      }
    } catch {
      verified.push(finding);
    }
  }

  return {
    findings: verified,
    usage: usage.length > 0 ? aggregateUsage(usage) : undefined,
  };
}
