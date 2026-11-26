import { z } from 'zod';
import { getRuntime, type Finding, type UsageStats } from '@sentry/warden';
import type { SuiteEntry } from './entries.js';

const JUDGE_MAX_TOKENS = 2048;
const JUDGE_TIMEOUT_MS = 60_000;

const VerdictSchema = z.object({
  matched: z.boolean(),
  reasoning: z.string(),
});

export interface EntryVerdict {
  hit: boolean;
  reasoning: string;
  usage?: UsageStats;
}

/** Findings a skill reported in any of the entry's target files. */
export function candidateFindings(entry: SuiteEntry, findings: Finding[]): Finding[] {
  return findings.filter((finding) => finding.location && entry.targets.includes(finding.location.path));
}

/** Build the corpus semantic-match prompt for one entry. */
export function buildScorePrompt(entry: SuiteEntry, findings: Finding[]): string {
  const location = entry.lines ? `${entry.targets[0]} lines ${entry.lines}` : entry.targets.join(', ');
  const block = findings.map((finding, index) => {
    const loc = finding.location;
    const lines = loc?.endLine ? `${loc.startLine}-${loc.endLine}` : `${loc?.startLine ?? '?'}`;
    return `[${index}] ${loc?.path}:${lines}\n    title: ${finding.title}\n    description: ${finding.description}`;
  }).join('\n\n');

  return `You score a security code reviewer against a known vulnerability.

## Known vulnerability
Location: ${location}
${entry.summary}

## Reported findings
${block}

## Rule
A finding matches when it would lead a reviewer to the same bug in roughly the
same code location. Wording and exact line numbers do not need to match. A
finding about a different bug in the same file does not match, even when it is
real. A broad finding that only names the file or the bug class without this
specific flaw does not match.

Respond with ONLY a JSON object:
{"matched": true, "reasoning": "one sentence"}`;
}

/** Decide whether a skill's findings name the entry's bug. No candidates means no hit and no model call. */
export async function scoreEntry(
  entry: SuiteEntry,
  findings: Finding[],
  options: { model: string; apiKey?: string },
): Promise<EntryVerdict> {
  const candidates = candidateFindings(entry, findings);
  if (candidates.length === 0) {
    return { hit: false, reasoning: 'no findings in target files' };
  }

  const result = await getRuntime('pi').runAuxiliary({
    task: 'eval_judge',
    agentName: 'security-eval-judge',
    apiKey: options.apiKey || undefined,
    prompt: buildScorePrompt(entry, candidates),
    schema: VerdictSchema,
    model: options.model,
    maxTokens: JUDGE_MAX_TOKENS,
    timeout: JUDGE_TIMEOUT_MS,
    maxRetries: 2,
  });
  if (!result.success) {
    throw new Error(`Judge failed for ${entry.id}: ${result.error}`);
  }
  return { hit: result.data.matched, reasoning: result.data.reasoning, usage: result.usage };
}
