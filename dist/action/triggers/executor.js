/**
 * Trigger Executor
 *
 * Executes a single trigger and manages associated GitHub check runs.
 * Extracted from main.ts to enable isolated testing and clearer dependencies.
 */
import { resolveSkillAsync } from '../../skills/loader.js';
import { filterContextByPaths } from '../../triggers/matcher.js';
import { runSkillTask, createDefaultCallbacks } from '../../cli/output/tasks.js';
import { renderSkillReport } from '../../output/renderer.js';
import { createSkillCheck, updateSkillCheck, failSkillCheck, } from '../../output/github-checks.js';
import { logGroup, logGroupEnd } from '../workflow/base.js';
import { DEFAULT_FILE_CONCURRENCY } from '../../sdk/types.js';
import { Verbosity } from '../../cli/output/verbosity.js';
/** Log-mode output for CI: no TTY, no color. */
const CI_OUTPUT_MODE = { isTTY: false, supportsColor: false, columns: 120 };
// -----------------------------------------------------------------------------
// Executor
// -----------------------------------------------------------------------------
/**
 * Execute a single trigger and return results.
 *
 * Handles:
 * - Creating/updating GitHub check runs
 * - Running the skill via Claude Code SDK
 * - Rendering results for GitHub review
 */
export async function executeTrigger(trigger, deps) {
    const { octokit, context, config, anthropicApiKey, claudePath, previousReviewState } = deps;
    logGroup(`Running trigger: ${trigger.name} (skill: ${trigger.skill})`);
    // Create skill check (only for PRs)
    let skillCheckId;
    let skillCheckUrl;
    if (context.pullRequest) {
        try {
            const skillCheck = await createSkillCheck(octokit, trigger.skill, {
                owner: context.repository.owner,
                repo: context.repository.name,
                headSha: context.pullRequest.headSha,
            });
            skillCheckId = skillCheck.checkRunId;
            skillCheckUrl = skillCheck.url;
        }
        catch (error) {
            console.error(`::warning::Failed to create skill check for ${trigger.skill}: ${error}`);
        }
    }
    const failOn = trigger.failOn ?? deps.globalFailOn;
    const reportOn = trigger.reportOn ?? deps.globalReportOn;
    try {
        const taskOptions = {
            name: trigger.name,
            displayName: trigger.skill,
            failOn,
            resolveSkill: () => resolveSkillAsync(trigger.skill, context.repoPath, {
                remote: trigger.remote,
            }),
            context: filterContextByPaths(context, trigger.filters),
            runnerOptions: {
                apiKey: anthropicApiKey,
                model: trigger.model,
                maxTurns: trigger.maxTurns,
                batchDelayMs: config.defaults?.batchDelayMs,
                pathToClaudeCodeExecutable: claudePath,
            },
        };
        const callbacks = createDefaultCallbacks([taskOptions], CI_OUTPUT_MODE, Verbosity.Normal);
        const result = await runSkillTask(taskOptions, DEFAULT_FILE_CONCURRENCY, callbacks);
        const report = result.report;
        if (!report) {
            throw result.error ?? new Error('Skill task returned no report');
        }
        console.log(`Found ${report.findings.length} findings`);
        // Update skill check with results
        if (skillCheckId && context.pullRequest) {
            try {
                await updateSkillCheck(octokit, skillCheckId, report, {
                    owner: context.repository.owner,
                    repo: context.repository.name,
                    headSha: context.pullRequest.headSha,
                    failOn,
                    reportOn,
                });
            }
            catch (error) {
                console.error(`::warning::Failed to update skill check for ${trigger.skill}: ${error}`);
            }
        }
        // Render if we're going to post comments OR if we might need to approve
        // (approval can happen even with no comments when previousReviewState is CHANGES_REQUESTED)
        const mightNeedApproval = previousReviewState === 'CHANGES_REQUESTED' && failOn && failOn !== 'off';
        const maxFindings = trigger.maxFindings ?? deps.globalMaxFindings;
        const renderResult = reportOn !== 'off' || mightNeedApproval
            ? renderSkillReport(report, {
                maxFindings,
                reportOn,
                failOn,
                checkRunUrl: skillCheckUrl,
                totalFindings: report.findings.length,
                previousReviewState,
            })
            : undefined;
        logGroupEnd();
        return {
            triggerName: trigger.name,
            report,
            renderResult,
            failOn,
            reportOn,
            reportOnSuccess: trigger.reportOnSuccess,
            checkRunUrl: skillCheckUrl,
            maxFindings,
            previousReviewState,
        };
    }
    catch (error) {
        // Mark skill check as failed
        if (skillCheckId && context.pullRequest) {
            try {
                await failSkillCheck(octokit, skillCheckId, error, {
                    owner: context.repository.owner,
                    repo: context.repository.name,
                    headSha: context.pullRequest.headSha,
                });
            }
            catch (checkError) {
                console.error(`::warning::Failed to mark skill check as failed: ${checkError}`);
            }
        }
        console.error(`::warning::Trigger ${trigger.name} failed: ${error}`);
        logGroupEnd();
        return { triggerName: trigger.name, error };
    }
}
//# sourceMappingURL=executor.js.map