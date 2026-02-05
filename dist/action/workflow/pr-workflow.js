/**
 * PR Workflow
 *
 * Handles pull_request and push events.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadWardenConfig, resolveTrigger } from '../../config/loader.js';
import { buildEventContext } from '../../event/context.js';
import { matchTrigger, shouldFail, countFindingsAtOrAbove } from '../../triggers/matcher.js';
import { fetchExistingComments, } from '../../output/dedup.js';
import { buildAnalyzedScope, findStaleComments, resolveStaleComments } from '../../output/stale.js';
import { findBotReviewState } from '../review-state.js';
import { processInBatches } from '../../utils/index.js';
import { executeTrigger } from '../triggers/executor.js';
import { postTriggerReview } from '../review/poster.js';
import { buildReviewCoordination, shouldResolveStaleComments } from '../review/coordination.js';
import { createCoreCheck, updateCoreCheck, buildCoreSummaryData, determineCoreConclusion, } from '../checks/manager.js';
import { setOutput, setFailed, logGroup, logGroupEnd, findClaudeCodeExecutable, handleTriggerErrors, collectTriggerErrors, computeWorkflowOutputs, setWorkflowOutputs, getAuthenticatedBotLogin, } from './base.js';
// -----------------------------------------------------------------------------
// Review State
// -----------------------------------------------------------------------------
/**
 * Get Warden's previous review state on a PR.
 * Returns the most recent review state if Warden (the authenticated app) previously reviewed.
 * Returns null if we can't reliably identify our own reviews (e.g., using PAT instead of GitHub App).
 */
async function getWardenPreviousReviewState(octokit, owner, repo, prNumber) {
    try {
        // Get the authenticated bot's login to identify our own reviews
        const botLogin = await getAuthenticatedBotLogin(octokit);
        // Without a bot login, we can't reliably identify our own reviews.
        // Skip approval flow to avoid approving based on another bot's review.
        if (!botLogin) {
            console.log('Skipping approval flow: cannot identify bot (using PAT or GITHUB_TOKEN instead of GitHub App)');
            return null;
        }
        // Note: No pagination. PRs with 100+ reviews are rare; if Warden's review
        // is beyond page 1, user can manually dismiss. Not worth the complexity.
        const { data: reviews } = await octokit.pulls.listReviews({
            owner,
            repo,
            pull_number: prNumber,
            per_page: 100,
        });
        return findBotReviewState(reviews, botLogin);
    }
    catch (error) {
        console.warn(`::warning::Failed to fetch previous review state: ${error}`);
        return null;
    }
}
// -----------------------------------------------------------------------------
// Main PR Workflow
// -----------------------------------------------------------------------------
export async function runPRWorkflow(octokit, inputs, eventName, eventPath, repoPath) {
    let eventPayload;
    try {
        eventPayload = JSON.parse(readFileSync(eventPath, 'utf-8'));
    }
    catch (error) {
        setFailed(`Failed to read event payload: ${error}`);
    }
    logGroup('Building event context');
    console.log(`Event: ${eventName}`);
    console.log(`Workspace: ${repoPath}`);
    logGroupEnd();
    let context;
    try {
        context = await buildEventContext(eventName, eventPayload, repoPath, octokit);
    }
    catch (error) {
        setFailed(`Failed to build event context: ${error}`);
    }
    logGroup('Loading configuration');
    console.log(`Config path: ${inputs.configPath}`);
    logGroupEnd();
    const configFullPath = join(repoPath, inputs.configPath);
    const config = loadWardenConfig(dirname(configFullPath));
    // Resolve triggers with defaults and match
    const resolvedTriggers = config.triggers.map((t) => resolveTrigger(t, config));
    const matchedTriggers = resolvedTriggers.filter((t) => matchTrigger(t, context, 'github'));
    if (matchedTriggers.length === 0) {
        console.log('No triggers matched for this event');
        setOutput('findings-count', 0);
        setOutput('critical-count', 0);
        setOutput('high-count', 0);
        setOutput('summary', 'No triggers matched');
        return;
    }
    logGroup('Matched triggers');
    for (const trigger of matchedTriggers) {
        console.log(`- ${trigger.name}: ${trigger.skill}`);
    }
    logGroupEnd();
    // Create core warden check (only for PRs)
    let coreCheckId;
    if (context.pullRequest) {
        try {
            const coreCheck = await createCoreCheck(octokit, {
                owner: context.repository.owner,
                repo: context.repository.name,
                headSha: context.pullRequest.headSha,
            });
            coreCheckId = coreCheck.checkRunId;
            console.log(`Created core check: ${coreCheck.url}`);
        }
        catch (error) {
            console.error(`::warning::Failed to create core check: ${error}`);
        }
    }
    // Fetch previous review state for APPROVE logic (only for PRs)
    let previousReviewState = null;
    if (context.pullRequest) {
        previousReviewState = await getWardenPreviousReviewState(octokit, context.repository.owner, context.repository.name, context.pullRequest.number);
        if (previousReviewState) {
            console.log(`Previous Warden review state: ${previousReviewState}`);
        }
    }
    // Run triggers in parallel
    const concurrency = config.runner?.concurrency ?? inputs.parallel;
    const claudePath = findClaudeCodeExecutable();
    const results = await processInBatches(matchedTriggers, (trigger) => executeTrigger(trigger, {
        octokit,
        context,
        config,
        anthropicApiKey: inputs.anthropicApiKey,
        claudePath,
        previousReviewState,
        globalFailOn: inputs.failOn,
        globalCommentOn: inputs.commentOn,
        globalMaxFindings: inputs.maxFindings,
    }), concurrency);
    // Fetch existing comments for deduplication (only for PRs)
    // Keep original list separate for stale detection (modified list includes newly posted comments)
    let fetchedComments = [];
    let existingComments = [];
    if (context.pullRequest) {
        try {
            fetchedComments = await fetchExistingComments(octokit, context.repository.owner, context.repository.name, context.pullRequest.number);
            existingComments = [...fetchedComments];
            if (fetchedComments.length > 0) {
                const wardenCount = fetchedComments.filter((c) => c.isWarden).length;
                const externalCount = fetchedComments.length - wardenCount;
                console.log(`Found ${fetchedComments.length} existing comments for deduplication (${wardenCount} Warden, ${externalCount} external)`);
            }
        }
        catch (error) {
            console.warn(`::warning::Failed to fetch existing comments for deduplication: ${error}`);
        }
    }
    // Post reviews to GitHub (sequentially to avoid rate limits)
    const reports = [];
    let shouldFailAction = false;
    const failureReasons = [];
    // Coordinate review events across triggers to ensure consistent PR state
    const reviewCoordination = buildReviewCoordination(results);
    // Use index-based lookup to handle duplicate trigger names correctly
    for (const [i, result] of results.entries()) {
        const coordination = reviewCoordination[i];
        if (result.report) {
            reports.push(result.report);
            // Post review
            const postResult = await postTriggerReview({
                result,
                coordination,
                existingComments,
                apiKey: inputs.anthropicApiKey,
            }, { octokit, context });
            // Add newly posted comments to existing comments for cross-trigger deduplication
            existingComments.push(...postResult.newComments);
            // Check if we should fail based on this trigger's config
            if (result.failOn && shouldFail(result.report, result.failOn)) {
                shouldFailAction = true;
                const count = countFindingsAtOrAbove(result.report, result.failOn);
                failureReasons.push(`${result.triggerName}: Found ${count} ${result.failOn}+ severity issues`);
            }
        }
    }
    // Collect trigger errors for summary
    const triggerErrors = collectTriggerErrors(results);
    handleTriggerErrors(triggerErrors, matchedTriggers.length);
    // Resolve stale Warden comments (comments that no longer have matching findings)
    // Use fetchedComments (not existingComments) to only check comments that have threadIds
    // Only resolve if ALL triggers succeeded - otherwise findings may be missing due to failures
    // Filter to only Warden comments - we don't resolve external comments
    const canResolveStale = shouldResolveStaleComments(results);
    const wardenComments = fetchedComments.filter((c) => c.isWarden);
    if (context.pullRequest && wardenComments.length > 0 && canResolveStale) {
        try {
            const allFindings = reports.flatMap((r) => r.findings);
            const scope = buildAnalyzedScope(context.pullRequest.files);
            const staleComments = findStaleComments(wardenComments, allFindings, scope);
            if (staleComments.length > 0) {
                const resolvedCount = await resolveStaleComments(octokit, staleComments);
                if (resolvedCount > 0) {
                    console.log(`Resolved ${resolvedCount} stale Warden comments`);
                }
            }
        }
        catch (error) {
            console.warn(`::warning::Failed to resolve stale comments: ${error}`);
        }
    }
    else if (!canResolveStale && wardenComments.length > 0) {
        console.log('Skipping stale comment resolution due to trigger failures');
    }
    // Set outputs
    const outputs = computeWorkflowOutputs(reports);
    setWorkflowOutputs(outputs);
    // Update core check with overall summary
    if (coreCheckId && context.pullRequest) {
        try {
            const summaryData = buildCoreSummaryData(results, reports);
            const coreConclusion = determineCoreConclusion(shouldFailAction, outputs.findingsCount);
            await updateCoreCheck(octokit, coreCheckId, summaryData, coreConclusion, {
                owner: context.repository.owner,
                repo: context.repository.name,
            });
        }
        catch (error) {
            console.error(`::warning::Failed to update core check: ${error}`);
        }
    }
    if (shouldFailAction) {
        setFailed(failureReasons.join('; '));
    }
    console.log(`\nAnalysis complete: ${outputs.findingsCount} total findings`);
}
//# sourceMappingURL=pr-workflow.js.map