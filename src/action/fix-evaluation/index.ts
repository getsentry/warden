import type { Octokit } from '@octokit/rest';
import type { ExistingComment } from '../../output/dedup.js';
import { generateContentHash } from '../../output/dedup.js';
import type { Finding, UsageStats } from '../../types/index.js';
import { aggregateUsage, emptyUsage } from '../../sdk/usage.js';
import type { EvaluateFixAttemptsContext, EvaluateFixAttemptsResult } from './types.js';
import { evaluateFix } from './judge.js';
import type { FixJudgeContext } from './judge.js';
import { fetchFollowUpChanges, fetchFileContent, formatFailedFixReply } from './github.js';

export { postThreadReply } from './github.js';
export type { EvaluateFixAttemptsResult } from './types.js';

/** Maximum comments to evaluate per run */
const MAX_EVALUATIONS = 20;

/** Number of lines of context around the finding location */
const CONTEXT_LINES = 20;

/**
 * Extract numbered lines from content.
 */
function extractLines(content: string, start: number, end: number): string {
  const lines = content.split('\n');
  return lines
    .slice(start - 1, end)
    .map((line, i) => `${start + i}: ${line}`)
    .join('\n');
}

/**
 * Fetch code snippet at a finding location at a specific commit.
 */
async function fetchCodeAtLocation(
  octokit: Octokit,
  owner: string,
  repo: string,
  comment: ExistingComment,
  sha: string,
  contextLines = CONTEXT_LINES
): Promise<string> {
  const targetLine = comment.line;
  const startLine = Math.max(1, targetLine - contextLines);
  const endLine = targetLine + contextLines;

  try {
    const content = await fetchFileContent(octokit, owner, repo, comment.path, sha);
    return extractLines(content, startLine, endLine);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Not Found')) {
      return '(file does not exist at this commit)';
    }
    throw error;
  }
}

/**
 * Check if a finding matches a comment (same location and similar content).
 */
function findingMatchesComment(finding: Finding, comment: ExistingComment): boolean {
  if (!finding.location) {
    return false;
  }

  if (finding.location.path !== comment.path) {
    return false;
  }

  const findingLine = finding.location.endLine ?? finding.location.startLine;
  const lineDiff = Math.abs(findingLine - comment.line);
  if (lineDiff > 5) {
    return false;
  }

  const findingHash = generateContentHash(finding.title, finding.description);
  if (findingHash === comment.contentHash) {
    return true;
  }

  const normalizedFindingTitle = finding.title.toLowerCase().trim();
  const normalizedCommentTitle = comment.title.toLowerCase().trim();
  return normalizedFindingTitle === normalizedCommentTitle;
}

/**
 * Check if an issue was re-detected in the current findings.
 */
function wasReDetected(comment: ExistingComment, currentFindings: Finding[]): boolean {
  return currentFindings.some((finding) => findingMatchesComment(finding, comment));
}

/**
 * Evaluate fix attempts for all unresolved Warden comments.
 *
 * Flow:
 * 1. Fetch patches between base and head SHAs
 * 2. For each unresolved comment, let judge explore changes with tools
 * 3. Cross-check against current findings for re-detection (safety override)
 * 4. Categorize into toResolve and toReply
 * 5. Accumulate usage stats from all evaluations
 */
export async function evaluateFixAttempts(
  octokit: Octokit,
  comments: ExistingComment[],
  context: EvaluateFixAttemptsContext,
  currentFindings: Finding[],
  apiKey: string
): Promise<EvaluateFixAttemptsResult> {
  const result: EvaluateFixAttemptsResult = {
    toResolve: [],
    toReply: [],
    skipped: 0,
    evaluated: 0,
    failedEvaluations: 0,
    usage: emptyUsage(),
  };

  // Filter to unresolved Warden comments only
  const unresolvedComments = comments.filter((c) => c.isWarden && !c.isResolved && c.threadId);

  if (unresolvedComments.length === 0) {
    return result;
  }

  // Fetch patches and commit messages between base and head
  const { patches, commitMessages } = await fetchFollowUpChanges(
    octokit,
    context.owner,
    context.repo,
    context.baseSha,
    context.headSha
  );

  if (patches.size === 0) {
    result.skipped = unresolvedComments.length;
    return result;
  }

  // Limit evaluations
  const commentsToEvaluate = unresolvedComments.slice(0, MAX_EVALUATIONS);
  if (unresolvedComments.length > MAX_EVALUATIONS) {
    result.skipped = unresolvedComments.length - MAX_EVALUATIONS;
    console.log(
      `Limiting fix evaluation to ${MAX_EVALUATIONS} of ${unresolvedComments.length} unresolved comments`
    );
  }

  const toolContext: FixJudgeContext = {
    octokit,
    owner: context.owner,
    repo: context.repo,
    baseSha: context.baseSha,
    headSha: context.headSha,
    patches,
  };

  const changedFiles = [...patches.keys()];
  const usages: UsageStats[] = [];

  for (let i = 0; i < commentsToEvaluate.length; i++) {
    const comment = commentsToEvaluate[i];
    if (!comment) continue;
    result.evaluated++;

    // Fetch code at the issue location before the fix
    let codeBeforeFix: string;
    try {
      codeBeforeFix = await fetchCodeAtLocation(
        octokit,
        context.owner,
        context.repo,
        comment,
        context.baseSha
      );
    } catch (error) {
      console.warn(`Failed to fetch code for ${comment.path}:${comment.line}: ${error}`);
      continue;
    }

    // Fetch code after fix (optional, reduces tool calls)
    let codeAfterFix: string | undefined;
    try {
      codeAfterFix = await fetchCodeAtLocation(
        octokit,
        context.owner,
        context.repo,
        comment,
        context.headSha
      );
    } catch {
      // Non-fatal: judge can still use tools to investigate
    }

    const startTime = performance.now();
    const evalResult = await evaluateFix(
      { comment, changedFiles, codeBeforeFix, codeAfterFix, commitMessages },
      toolContext,
      apiKey
    );
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);

    usages.push(evalResult.usage);

    // Log per-comment detail
    const totalTokens = evalResult.usage.inputTokens + evalResult.usage.outputTokens;
    const costStr = evalResult.usage.costUSD > 0 ? `, $${evalResult.usage.costUSD.toFixed(4)}` : '';
    const prefix = `  [${i + 1}/${commentsToEvaluate.length}] ${comment.path}:${comment.line} "${comment.title}"`;

    if (evalResult.usedFallback) {
      result.failedEvaluations++;
      console.warn(`${prefix} → fallback (${elapsed}s, ${totalTokens} tok${costStr})`);
      continue;
    }

    console.log(
      `${prefix} → ${evalResult.verdict.status} (${elapsed}s, ${totalTokens} tok${costStr})`
    );

    if (evalResult.verdict.status === 'attempted_failed') {
      console.log(`        Reason: "${evalResult.verdict.reasoning}"`);
    }

    if (evalResult.verdict.status === 'not_attempted') {
      continue;
    }

    // Check if the issue was re-detected (overrides LLM judgment)
    const reDetected = wasReDetected(comment, currentFindings);

    if (reDetected) {
      result.toReply.push({
        comment,
        replyBody: formatFailedFixReply(
          context.headSha,
          'The fix attempt was made, but the same issue was detected again in the updated code.'
        ),
        commitSha: context.headSha,
      });
      continue;
    }

    if (evalResult.verdict.status === 'resolved') {
      result.toResolve.push(comment);
    } else {
      result.toReply.push({
        comment,
        replyBody: formatFailedFixReply(context.headSha, evalResult.verdict.reasoning),
        commitSha: context.headSha,
      });
    }
  }

  result.usage = usages.length > 0 ? aggregateUsage(usages) : emptyUsage();

  return result;
}
