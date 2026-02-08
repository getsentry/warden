/**
 * Workflow Base
 *
 * Shared infrastructure for PR and schedule workflows.
 */
import { appendFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { execNonInteractive } from '../../utils/exec.js';
import { countSeverity } from '../../triggers/matcher.js';
// -----------------------------------------------------------------------------
// GitHub Actions Helpers
// -----------------------------------------------------------------------------
/**
 * Set a GitHub Actions output variable.
 */
export function setOutput(name, value) {
    const outputFile = process.env['GITHUB_OUTPUT'];
    if (outputFile) {
        const stringValue = String(value);
        // Use heredoc format with random delimiter for multiline values
        // Random delimiter prevents injection if value contains the delimiter
        if (stringValue.includes('\n')) {
            const delimiter = `ghadelim_${randomUUID()}`;
            appendFileSync(outputFile, `${name}<<${delimiter}\n${stringValue}\n${delimiter}\n`);
        }
        else {
            appendFileSync(outputFile, `${name}=${stringValue}\n`);
        }
    }
}
/**
 * Fail the GitHub Action with an error message.
 */
export function setFailed(message) {
    console.error(`::error::${message}`);
    process.exit(1);
}
/**
 * Start a collapsible log group.
 */
export function logGroup(name) {
    console.log(`::group::${name}`);
}
/**
 * End a collapsible log group.
 */
export function logGroupEnd() {
    console.log('::endgroup::');
}
// -----------------------------------------------------------------------------
// Claude Code CLI
// -----------------------------------------------------------------------------
/**
 * Find the Claude Code CLI executable path.
 * Required in CI environments where the SDK can't auto-detect the CLI location.
 */
export function findClaudeCodeExecutable() {
    // Check environment variable first (set by action.yml)
    const envPath = process.env['CLAUDE_CODE_PATH'];
    if (envPath) {
        try {
            execNonInteractive(`test -x "${envPath}"`);
            return envPath;
        }
        catch {
            // Path from env doesn't exist, continue to fallbacks
        }
    }
    // Standard install location from claude.ai/install.sh
    const homeLocalBin = `${process.env['HOME']}/.local/bin/claude`;
    try {
        execNonInteractive(`test -x "${homeLocalBin}"`);
        return homeLocalBin;
    }
    catch {
        // Not found in standard location
    }
    // Try which command
    try {
        const path = execNonInteractive('which claude');
        if (path) {
            return path;
        }
    }
    catch {
        // which command failed
    }
    // Other common installation paths as fallback
    const commonPaths = ['/usr/local/bin/claude', '/usr/bin/claude'];
    for (const p of commonPaths) {
        try {
            execNonInteractive(`test -x "${p}"`);
            return p;
        }
        catch {
            // Path doesn't exist or isn't executable
        }
    }
    setFailed('Claude Code CLI not found. Ensure Claude Code is installed via https://claude.ai/install.sh');
}
// -----------------------------------------------------------------------------
// Trigger Error Handling
// -----------------------------------------------------------------------------
/**
 * Log trigger error summary and fail if all triggers failed.
 */
export function handleTriggerErrors(triggerErrors, totalTriggers) {
    if (triggerErrors.length === 0) {
        return;
    }
    logGroup('Trigger Errors Summary');
    for (const err of triggerErrors) {
        console.error(`  - ${err}`);
    }
    logGroupEnd();
    // Fail if ALL triggers failed (no successful analysis was performed)
    if (triggerErrors.length === totalTriggers && totalTriggers > 0) {
        setFailed(`All ${totalTriggers} trigger(s) failed: ${triggerErrors.join('; ')}`);
    }
}
/**
 * Collect error messages from trigger results.
 */
export function collectTriggerErrors(results) {
    return results
        .filter((r) => r.error)
        .map((r) => {
        const errorMessage = r.error instanceof Error ? r.error.message : String(r.error);
        return `${r.triggerName}: ${errorMessage}`;
    });
}
/**
 * Compute workflow outputs from reports.
 */
export function computeWorkflowOutputs(reports) {
    return {
        findingsCount: reports.reduce((sum, r) => sum + r.findings.length, 0),
        criticalCount: countSeverity(reports, 'critical'),
        highCount: countSeverity(reports, 'high'),
        summary: reports.map((r) => r.summary).join('\n'),
    };
}
/**
 * Set workflow output variables.
 */
export function setWorkflowOutputs(outputs) {
    setOutput('findings-count', outputs.findingsCount);
    setOutput('critical-count', outputs.criticalCount);
    setOutput('high-count', outputs.highCount);
    setOutput('summary', outputs.summary);
}
// -----------------------------------------------------------------------------
// GitHub API Helpers
// -----------------------------------------------------------------------------
/**
 * Get the authenticated bot's login name.
 *
 * Tries three strategies in order:
 * 1. GraphQL `viewer` query (works for both installation tokens and PATs)
 * 2. `octokit.apps.getAuthenticated()` → `${slug}[bot]` (GitHub App JWT fallback)
 * 3. `octokit.users.getAuthenticated()` (PAT fallback)
 */
export async function getAuthenticatedBotLogin(octokit) {
    // Strategy 1: GraphQL viewer (works for installation tokens and PATs)
    try {
        const result = await octokit.graphql('query { viewer { login } }');
        if (result.viewer?.login) {
            return result.viewer.login;
        }
    }
    catch {
        // GraphQL may not be available or may fail for certain token types
    }
    // Strategy 2: GitHub App JWT endpoint
    try {
        const { data: app } = await octokit.apps.getAuthenticated();
        if (app?.slug) {
            return `${app.slug}[bot]`;
        }
    }
    catch {
        // Not a GitHub App token
    }
    // Strategy 3: PAT user endpoint
    try {
        const { data: user } = await octokit.users.getAuthenticated();
        return user.login;
    }
    catch {
        // Token doesn't have user scope
    }
    return null;
}
/**
 * Get the default branch for a repository from the GitHub API.
 */
export async function getDefaultBranchFromAPI(octokit, owner, repo) {
    const { data } = await octokit.repos.get({ owner, repo });
    return data.default_branch;
}
//# sourceMappingURL=base.js.map