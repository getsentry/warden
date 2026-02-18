import type { Octokit } from '@octokit/rest';
import type { ExistingComment } from '../../output/dedup.js';
import type { Finding, UsageStats } from '../../types/index.js';
import { aggregateUsage, emptyUsage } from '../../sdk/usage.js';
import { findingMatchesComment } from '../../output/stale.js';
import { Sentry, emitFixEvalMetrics } from '../../sentry.js';
import type { EvaluateFixAttemptsContext, EvaluateFixAttemptsResult, FixEvaluation } from './types.js';
import { evaluateFix } from './judge.js';
import type { FixJudgeContext } from './judge.js';
import { fetchFollowUpChanges, fetchFileContent, formatFailedFixReply } from './github.js';

export { postThreadReply } from './github.js';
export type { EvaluateFixAttemptsResult, FixEvaluation } from './types.js';

/** Maximum comments to evaluate per run */
const MAX_EVALUATIONS = 20;

/** Extract finding ID (e.g. "WRZ-XPL") from a comment title like "[WRZ-XPL] Some title" */
function extractFindingId(title: string): string | undefined {
  const match = title.match(/^\[([A-Z0-9]{3}-[A-Z0-9]{3})\]\s*/);
  return match?.[1];
}

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
  apiKey: string,
  maxRetries?: number
): Promise<EvaluateFixAttemptsResult> {
  return Sentry.startSpan(
    {
      op: 'fix_eval.run',
      name: 'evaluate fix attempts',
      attributes: {
        'fix_eval.comment_count': comments.length,
      },
    },
    async (outerSpan) => {
      const result: EvaluateFixAttemptsResult = {
        toResolve: [],
        toReply: [],
        skipped: 0,
        evaluated: 0,
        failedEvaluations: 0,
        usage: emptyUsage(),
        evaluations: [],
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

      for (const comment of commentsToEvaluate) {
        const findingId = extractFindingId(comment.title);

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
          Sentry.captureException(error, { tags: { operation: 'fetch_fix_context' } });
          result.skipped++;
          continue;
        }

        result.evaluated++;

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

        const evalResultData = await Sentry.startSpan(
          {
            op: 'fix_eval.evaluate',
            name: `evaluate fix ${comment.path}:${comment.line}`,
            attributes: {
              'code.filepath': comment.path,
              'code.line': comment.line,
              'fix_eval.finding_id': findingId ?? 'unknown',
            },
          },
          async (evalSpan) => {
            const startTime = performance.now();
            const evalResult = await evaluateFix(
              { comment, changedFiles, codeBeforeFix, codeAfterFix, commitMessages },
              toolContext,
              apiKey,
              maxRetries
            );
            const durationMs = performance.now() - startTime;

            evalSpan.setAttribute('fix_eval.verdict', evalResult.verdict.status);
            evalSpan.setAttribute('fix_eval.used_fallback', evalResult.usedFallback);

            return { evalResult, durationMs };
          },
        );

        const { evalResult, durationMs } = evalResultData;
        usages.push(evalResult.usage);

        if (evalResult.usedFallback) {
          result.failedEvaluations++;
          result.evaluations.push({
            findingId,
            path: comment.path,
            line: comment.line,
            title: comment.title,
            verdict: evalResult.verdict.status,
            reasoning: evalResult.verdict.reasoning,
            durationMs,
            usage: evalResult.usage,
            usedFallback: true,
          });
          continue;
        }

        if (evalResult.verdict.status === 'not_attempted') {
          result.evaluations.push({
            findingId,
            path: comment.path,
            line: comment.line,
            title: comment.title,
            verdict: 'not_attempted',
            reasoning: evalResult.verdict.reasoning,
            durationMs,
            usage: evalResult.usage,
            usedFallback: false,
          });
          continue;
        }

        // Check if the issue was re-detected (overrides LLM judgment)
        const reDetected = wasReDetected(comment, currentFindings);
        let finalVerdict: FixEvaluation['verdict'] = evalResult.verdict.status;

        if (reDetected) {
          finalVerdict = 're_detected';
          result.toReply.push({
            comment,
            replyBody: formatFailedFixReply(
              context.headSha,
              'The fix attempt was made, but the same issue was detected again in the updated code.'
            ),
            commitSha: context.headSha,
          });
        } else if (evalResult.verdict.status === 'resolved') {
          result.toResolve.push(comment);
        } else {
          result.toReply.push({
            comment,
            replyBody: formatFailedFixReply(context.headSha, evalResult.verdict.reasoning),
            commitSha: context.headSha,
          });
        }

        result.evaluations.push({
          findingId,
          path: comment.path,
          line: comment.line,
          title: comment.title,
          verdict: finalVerdict,
          reasoning: evalResult.verdict.reasoning,
          durationMs,
          usage: evalResult.usage,
          usedFallback: false,
        });
      }

      result.usage = usages.length > 0 ? aggregateUsage(usages) : emptyUsage();

      // Set summary attributes and emit metrics
      outerSpan.setAttribute('fix_eval.evaluated', result.evaluated);
      outerSpan.setAttribute('fix_eval.resolved', result.toResolve.length);
      outerSpan.setAttribute('fix_eval.failed', result.failedEvaluations);
      outerSpan.setAttribute('fix_eval.skipped', result.skipped);
      emitFixEvalMetrics(result.evaluated, result.toResolve.length, result.failedEvaluations, result.skipped);

      return result;
    },
  );
}
