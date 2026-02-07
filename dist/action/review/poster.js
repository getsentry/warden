/**
 * Review Poster
 *
 * Handles posting GitHub PR reviews with deduplication and coordination.
 * Extracted from main.ts to isolate the complex review posting state machine.
 */
import { filterFindingsBySeverity } from '../../types/index.js';
import { shouldFail } from '../../triggers/matcher.js';
import { renderSkillReport } from '../../output/renderer.js';
import { deduplicateFindings, processDuplicateActions, findingToExistingComment, } from '../../output/dedup.js';
import { mergeAuxiliaryUsage } from '../../sdk/usage.js';
import { applyCoordinationToReview } from '../review-state.js';
// -----------------------------------------------------------------------------
// GitHub Review Posting
// -----------------------------------------------------------------------------
/**
 * Post a PR review to GitHub.
 */
async function postReviewToGitHub(octokit, context, result) {
    if (!context.pullRequest) {
        return;
    }
    // Only post PR reviews with inline comments - skip standalone summary comments
    // as they add noise without providing actionable inline feedback
    if (!result.review) {
        return;
    }
    const { owner, name: repo } = context.repository;
    const pullNumber = context.pullRequest.number;
    const commitId = context.pullRequest.headSha;
    const reviewComments = result.review.comments
        .filter((c) => Boolean(c.path && c.line))
        .map((c) => ({
        path: c.path,
        line: c.line,
        side: c.side ?? 'RIGHT',
        body: c.body,
        start_line: c.start_line,
        start_side: c.start_line ? c.start_side ?? 'RIGHT' : undefined,
    }));
    await octokit.pulls.createReview({
        owner,
        repo,
        pull_number: pullNumber,
        commit_id: commitId,
        event: result.review.event,
        body: result.review.body,
        comments: reviewComments,
    });
}
// -----------------------------------------------------------------------------
// Main Review Posting Logic
// -----------------------------------------------------------------------------
/**
 * Post a review for a single trigger result.
 *
 * Handles:
 * - Filtering findings by commentOn threshold
 * - Deduplicating against existing comments
 * - Processing duplicate actions (reactions, updates)
 * - Applying coordination decisions
 * - Posting the final review
 */
export async function postTriggerReview(ctx, deps) {
    const { result, coordination, existingComments, apiKey } = ctx;
    const { octokit, context } = deps;
    const newComments = [];
    if (!result.report) {
        return { posted: false, newComments, shouldFail: false };
    }
    const needsApproval = coordination?.reviewEvent === 'APPROVE';
    if (coordination?.approvalSuppressed) {
        console.log(`Suppressing APPROVE for ${result.triggerName}: ${coordination.suppressionReason}`);
    }
    // Filter findings by commentOn threshold
    const filteredFindings = filterFindingsBySeverity(result.report.findings, result.commentOn);
    const commentOnSuccess = result.commentOnSuccess ?? false;
    // Skip if nothing to post
    if (!result.renderResult || (filteredFindings.length === 0 && !commentOnSuccess && !needsApproval)) {
        return { posted: false, newComments, shouldFail: false };
    }
    try {
        // Deduplicate findings against existing comments
        let findingsToPost = filteredFindings;
        let dedupResult;
        if (existingComments.length > 0 && filteredFindings.length > 0) {
            dedupResult = await deduplicateFindings(filteredFindings, existingComments, {
                apiKey,
                currentSkill: result.report.skill,
            });
            findingsToPost = dedupResult.newFindings;
            // Merge dedup usage into the report's auxiliary usage
            if (dedupResult.dedupUsage) {
                const dedupAux = { dedup: dedupResult.dedupUsage };
                result.report.auxiliaryUsage = mergeAuxiliaryUsage(result.report.auxiliaryUsage, dedupAux);
            }
            if (dedupResult.duplicateActions.length > 0) {
                console.log(`Found ${dedupResult.duplicateActions.length} duplicate findings for ${result.triggerName}`);
            }
        }
        // Process duplicate actions (update Warden comments, add reactions)
        if (dedupResult && dedupResult.duplicateActions.length > 0) {
            const actionCounts = await processDuplicateActions(octokit, context.repository.owner, context.repository.name, dedupResult.duplicateActions, result.report.skill);
            if (actionCounts.updated > 0) {
                console.log(`Updated ${actionCounts.updated} existing Warden comments with skill attribution`);
            }
            if (actionCounts.reacted > 0) {
                console.log(`Added reactions to ${actionCounts.reacted} existing external comments`);
            }
            if (actionCounts.failed > 0) {
                console.warn(`::warning::Failed to process ${actionCounts.failed} duplicate actions`);
            }
        }
        // Check if failOn threshold is met (even if all findings deduplicated, we still need REQUEST_CHANGES)
        const needsRequestChanges = result.failOn && shouldFail(result.report, result.failOn);
        // Only post if we have non-duplicate findings, commentOnSuccess, approval needed, or REQUEST_CHANGES needed
        if (findingsToPost.length > 0 || commentOnSuccess || needsApproval || needsRequestChanges) {
            // Re-render with deduplicated findings if any were removed
            // Don't pass previousReviewState if this trigger's approval was suppressed
            // (to avoid re-rendering as APPROVE when coordination decided otherwise)
            const effectivePreviousReviewState = coordination?.approvalSuppressed
                ? null
                : result.previousReviewState;
            let renderResultToPost = findingsToPost.length !== filteredFindings.length
                ? renderSkillReport({ ...result.report, findings: findingsToPost }, {
                    maxFindings: result.maxFindings,
                    commentOn: result.commentOn,
                    failOn: result.failOn,
                    checkRunUrl: result.checkRunUrl,
                    totalFindings: result.report.findings.length,
                    // Pass original findings for failOn evaluation (not affected by dedup)
                    allFindings: result.report.findings,
                    previousReviewState: effectivePreviousReviewState,
                })
                : result.renderResult;
            // Apply coordinated review event (may downgrade APPROVE to COMMENT and clear body)
            if (renderResultToPost?.review) {
                const coordinatedReview = applyCoordinationToReview(renderResultToPost.review, coordination);
                if (coordinatedReview !== renderResultToPost.review) {
                    renderResultToPost = { ...renderResultToPost, review: coordinatedReview };
                }
            }
            await postReviewToGitHub(octokit, context, renderResultToPost);
            // Add newly posted findings to list for cross-trigger deduplication
            // Only include findings up to maxFindings since that's what was actually posted
            const postedFindings = result.maxFindings
                ? findingsToPost.slice(0, result.maxFindings)
                : findingsToPost;
            for (const finding of postedFindings) {
                const comment = findingToExistingComment(finding, result.report.skill);
                if (comment) {
                    newComments.push(comment);
                }
            }
            return { posted: true, newComments, shouldFail: false };
        }
        return { posted: false, newComments, shouldFail: false };
    }
    catch (error) {
        console.error(`::warning::Failed to post review for ${result.triggerName}: ${error}`);
        return { posted: false, newComments, shouldFail: false };
    }
}
//# sourceMappingURL=poster.js.map