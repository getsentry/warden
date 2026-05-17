export const id = 696;
export const ids = [696];
export const modules = {

/***/ 50696:
/***/ ((__unused_webpack_module, __unused_webpack___webpack_exports__, __webpack_require__) => {


// EXTERNAL MODULE: ./node_modules/.pnpm/@octokit+rest@22.0.1/node_modules/@octokit/rest/dist-src/index.js + 20 modules
var dist_src = __webpack_require__(37623);
// EXTERNAL MODULE: ./src/sentry.ts
var sentry = __webpack_require__(16435);
// EXTERNAL MODULE: ./src/types/index.ts
var types = __webpack_require__(73244);
// EXTERNAL MODULE: ./src/utils/index.ts + 2 modules
var utils = __webpack_require__(54980);
;// CONCATENATED MODULE: ./src/action/inputs.ts
/**
 * Action Input Parsing and Validation
 *
 * Handles parsing inputs from GitHub Actions environment and validates them.
 */


// -----------------------------------------------------------------------------
// Input Parsing
// -----------------------------------------------------------------------------
/**
 * Get an input value from GitHub Actions environment.
 * Checks both hyphenated (native) and underscored (composite action) formats.
 */
function getInput(name, required = false) {
    // Check both hyphenated (native GitHub Actions) and underscored (composite action) formats
    const hyphenEnv = `INPUT_${name.toUpperCase()}`;
    const underscoreEnv = `INPUT_${name.toUpperCase().replace(/-/g, '_')}`;
    const value = process.env[hyphenEnv] ?? process.env[underscoreEnv] ?? '';
    if (required && !value) {
        throw new Error(`Input required and not supplied: ${name}`);
    }
    return value;
}
/**
 * Parse a string input as a boolean, returning undefined for unrecognized values.
 */
function parseBooleanInput(value) {
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    return undefined;
}
/**
 * Parse action inputs from the GitHub Actions environment.
 * Runtime-specific auth can be absent here; runtime setup validates it when needed.
 */
function parseActionInputs() {
    // Check for auth token: supports both API keys and OAuth tokens
    // Priority: input > WARDEN_ANTHROPIC_API_KEY > ANTHROPIC_API_KEY > CLAUDE_CODE_OAUTH_TOKEN
    const authToken = getInput('anthropic-api-key') ||
        process.env['WARDEN_ANTHROPIC_API_KEY'] ||
        process.env['ANTHROPIC_API_KEY'] ||
        process.env['CLAUDE_CODE_OAUTH_TOKEN'] ||
        '';
    // Detect token type: OAuth tokens start with 'sk-ant-oat', API keys are other 'sk-ant-' prefixes
    const isOAuthToken = authToken.startsWith('sk-ant-oat');
    const anthropicApiKey = isOAuthToken ? '' : authToken;
    const oauthToken = isOAuthToken ? authToken : '';
    const failOnInput = getInput('fail-on');
    const failOn = types/* SeverityThresholdSchema */.q$.safeParse(failOnInput).success
        ? failOnInput
        : undefined;
    const reportOnInput = getInput('report-on');
    const reportOn = types/* SeverityThresholdSchema */.q$.safeParse(reportOnInput).success
        ? reportOnInput
        : undefined;
    const maxFindingsParsed = parseInt(getInput('max-findings') || '50', 10);
    const parallelParsed = parseInt(getInput('parallel') || String(utils/* DEFAULT_CONCURRENCY */.WH), 10);
    const requestChanges = parseBooleanInput(getInput('request-changes'));
    const failCheck = parseBooleanInput(getInput('fail-check'));
    return {
        anthropicApiKey,
        oauthToken,
        githubToken: getInput('github-token') || process.env['GITHUB_TOKEN'] || '',
        baseConfigPath: getInput('base-config-path') || undefined,
        baseSkillRoot: getInput('base-skill-root') || undefined,
        configPath: getInput('config-path') || 'warden.toml',
        failOn,
        reportOn,
        maxFindings: Number.isNaN(maxFindingsParsed) ? 50 : maxFindingsParsed,
        requestChanges,
        failCheck,
        parallel: Number.isNaN(parallelParsed) ? utils/* DEFAULT_CONCURRENCY */.WH : parallelParsed,
    };
}
/**
 * Validate that required inputs are present.
 * Throws with a descriptive error if validation fails.
 */
function validateInputs(inputs) {
    if (!inputs.githubToken) {
        throw new Error('GitHub token is required');
    }
    if (inputs.baseSkillRoot && !inputs.baseConfigPath) {
        throw new Error('base-skill-root requires base-config-path');
    }
}
/**
 * Set up environment variables for authentication.
 * Sets appropriate env vars based on token type (API key vs OAuth).
 */
function setupAuthEnv(inputs) {
    delete process.env['CLAUDE_CODE_OAUTH_TOKEN'];
    delete process.env['WARDEN_ANTHROPIC_API_KEY'];
    delete process.env['ANTHROPIC_API_KEY'];
    if (inputs.oauthToken) {
        process.env['CLAUDE_CODE_OAUTH_TOKEN'] = inputs.oauthToken;
        return;
    }
    if (inputs.anthropicApiKey) {
        process.env['WARDEN_ANTHROPIC_API_KEY'] = inputs.anthropicApiKey;
        process.env['ANTHROPIC_API_KEY'] = inputs.anthropicApiKey;
    }
}

// EXTERNAL MODULE: external "node:fs"
var external_node_fs_ = __webpack_require__(73024);
// EXTERNAL MODULE: external "node:os"
var external_node_os_ = __webpack_require__(48161);
// EXTERNAL MODULE: external "node:path"
var external_node_path_ = __webpack_require__(76760);
// EXTERNAL MODULE: external "node:crypto"
var external_node_crypto_ = __webpack_require__(77598);
// EXTERNAL MODULE: ./src/utils/exec.ts
var exec = __webpack_require__(78879);
// EXTERNAL MODULE: ./src/utils/path.ts
var path = __webpack_require__(13701);
;// CONCATENATED MODULE: ./src/triggers/matcher.ts

/** Maximum number of patterns to cache (LRU eviction when exceeded) */
const GLOB_CACHE_MAX_SIZE = 1000;
/** Cache for compiled glob patterns with LRU eviction */
const globCache = new Map();
/** Clear the glob cache (useful for testing) */
function clearGlobCache() {
    globCache.clear();
}
/** Get current cache size (useful for testing) */
function getGlobCacheSize() {
    return globCache.size;
}
/**
 * Convert a glob pattern to a regex (cached with LRU eviction).
 */
function globToRegex(pattern) {
    const cached = globCache.get(pattern);
    if (cached) {
        // Move to end for LRU ordering (delete and re-add)
        globCache.delete(pattern);
        globCache.set(pattern, cached);
        return cached;
    }
    let regexPattern = '';
    for (let index = 0; index < pattern.length; index++) {
        const char = pattern[index];
        const nextChar = pattern[index + 1];
        const nextNextChar = pattern[index + 2];
        if (char === undefined) {
            break;
        }
        if (char === '*' && nextChar === '*' && nextNextChar === '/') {
            regexPattern += '(?:.*/)?';
            index += 2;
            continue;
        }
        if (char === '*' && nextChar === '*') {
            regexPattern += '.*';
            index += 1;
            continue;
        }
        if (char === '*') {
            regexPattern += '[^/]*';
            continue;
        }
        if (char === '?') {
            regexPattern += '[^/]';
            continue;
        }
        regexPattern += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
    const regex = new RegExp(`^${regexPattern}$`);
    // Evict oldest entry if cache is full
    if (globCache.size >= GLOB_CACHE_MAX_SIZE) {
        const oldestKey = globCache.keys().next().value;
        if (oldestKey !== undefined) {
            globCache.delete(oldestKey);
        }
    }
    globCache.set(pattern, regex);
    return regex;
}
/**
 * Match a glob pattern against a file path.
 * Supports ** for recursive matching and * for single directory matching.
 */
function matcher_matchGlob(pattern, path) {
    return globToRegex(pattern).test(path);
}
/**
 * Check if a file list matches the path filters.
 * Returns true if paths match (or no filters), false if all files are excluded.
 */
function matchPathFilters(filters, filenames) {
    const { paths: pathPatterns, ignorePaths: ignorePatterns } = filters;
    // Fail trigger match when path filters are defined but filenames unavailable
    if ((pathPatterns || ignorePatterns) && (!filenames || filenames.length === 0)) {
        return false;
    }
    if (pathPatterns && filenames) {
        const hasMatch = filenames.some((file) => pathPatterns.some((pattern) => matcher_matchGlob(pattern, file)));
        if (!hasMatch) {
            return false;
        }
    }
    if (ignorePatterns && filenames) {
        const allIgnored = filenames.every((file) => ignorePatterns.some((pattern) => matcher_matchGlob(pattern, file)));
        if (allIgnored) {
            return false;
        }
    }
    return true;
}
/**
 * Return a copy of the context with only files matching the path filters.
 * If no filters are set, returns the original context unchanged (no copy).
 */
function filterContextByPaths(context, filters) {
    const { paths: pathPatterns, ignorePaths: ignorePatterns } = filters;
    // No filters — return original reference
    if (!pathPatterns && !ignorePatterns) {
        return context;
    }
    // No PR context — nothing to filter
    if (!context.pullRequest) {
        return context;
    }
    let files = context.pullRequest.files;
    if (pathPatterns) {
        files = files.filter((f) => pathPatterns.some((pattern) => matcher_matchGlob(pattern, f.filename)));
    }
    if (ignorePatterns) {
        files = files.filter((f) => !ignorePatterns.some((pattern) => matcher_matchGlob(pattern, f.filename)));
    }
    return {
        ...context,
        pullRequest: {
            ...context.pullRequest,
            files,
        },
    };
}
/**
 * Check if a trigger matches the given event context and environment.
 *
 * Trigger types:
 * - '*' (wildcard): matches all environments, skips event/action checks
 * - 'local': matches only when environment is 'local' (local-only skills)
 * - 'pull_request': matches in 'github' (with event/action checks) and 'local' (path filters only)
 * - 'schedule': matches when event is schedule
 */
function matchTrigger(trigger, context, environment) {
    // Wildcard triggers match everywhere, only check path filters
    if (trigger.type === '*') {
        const filenames = context.pullRequest?.files.map((f) => f.filename);
        return matchPathFilters(trigger.filters, filenames);
    }
    // Type-based matching with early returns
    if (trigger.type === 'local') {
        if (environment !== 'local') {
            return false;
        }
    }
    if (trigger.type === 'pull_request') {
        if (environment === 'local') {
            // Local mode runs all skills — skip event/action checks, fall through to path filters
        }
        else {
            if (context.eventType !== 'pull_request') {
                return false;
            }
            if (!trigger.actions?.includes(context.action)) {
                return false;
            }
        }
    }
    if (trigger.type === 'schedule') {
        if (context.eventType !== 'schedule') {
            return false;
        }
        return (context.pullRequest?.files.length ?? 0) > 0;
    }
    // Apply path filters
    const filenames = context.pullRequest?.files.map((f) => f.filename);
    return matchPathFilters(trigger.filters, filenames);
}
/**
 * Check if a report has any findings at or above the given severity threshold.
 * Returns false if failOn is 'off' (disabled).
 */
function shouldFail(report, failOn) {
    if (failOn === 'off')
        return false;
    const threshold = types/* SEVERITY_ORDER */.B[failOn];
    return report.findings.some((f) => types/* SEVERITY_ORDER */.B[f.severity] <= threshold);
}
/**
 * Count findings at or above the given severity threshold.
 * Returns 0 if failOn is 'off' (disabled).
 */
function countFindingsAtOrAbove(report, failOn) {
    if (failOn === 'off')
        return 0;
    const threshold = types/* SEVERITY_ORDER */.B[failOn];
    return report.findings.filter((f) => types/* SEVERITY_ORDER */.B[f.severity] <= threshold).length;
}
/**
 * Count findings of a specific severity across multiple reports.
 */
function countSeverity(reports, severity) {
    return reports.reduce((count, report) => count + report.findings.filter((f) => f.severity === severity).length, 0);
}

;// CONCATENATED MODULE: ./src/action/workflow/base.ts
/**
 * Workflow Base
 *
 * Shared infrastructure for PR and schedule workflows.
 */







/**
 * Sentinel error thrown by setFailed() so the top-level catch handler
 * can distinguish expected failures from unexpected crashes.
 */
class ActionFailedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ActionFailedError';
    }
}
// -----------------------------------------------------------------------------
// GitHub Actions Helpers
// -----------------------------------------------------------------------------
/**
 * Set a GitHub Actions output variable.
 */
function setOutput(name, value) {
    const outputFile = process.env['GITHUB_OUTPUT'];
    if (outputFile) {
        const stringValue = String(value);
        // Use heredoc format with random delimiter for multiline values
        // Random delimiter prevents injection if value contains the delimiter
        if (stringValue.includes('\n')) {
            const delimiter = `ghadelim_${(0,external_node_crypto_.randomUUID)()}`;
            (0,external_node_fs_.appendFileSync)(outputFile, `${name}<<${delimiter}\n${stringValue}\n${delimiter}\n`);
        }
        else {
            (0,external_node_fs_.appendFileSync)(outputFile, `${name}=${stringValue}\n`);
        }
    }
}
/**
 * Fail the GitHub Action with an error message.
 * Throws ActionFailedError so spans end cleanly before the process exits.
 */
function setFailed(message) {
    throw new ActionFailedError(message);
}
/** Validate Claude runtime auth before invoking the Claude Code SDK. */
function ensureClaudeAuth(inputs) {
    if (inputs.anthropicApiKey || inputs.oauthToken) {
        return;
    }
    setFailed('Authentication not found. Provide an API key via anthropic-api-key input, ' +
        'WARDEN_ANTHROPIC_API_KEY env var, or OAuth token via CLAUDE_CODE_OAUTH_TOKEN env var.');
}
/**
 * Start a collapsible log group.
 */
function logGroup(name) {
    console.log(`::group::${name}`);
}
/**
 * End a collapsible log group.
 */
function logGroupEnd() {
    console.log('::endgroup::');
}
// -----------------------------------------------------------------------------
// Claude Code CLI
// -----------------------------------------------------------------------------
/**
 * Test whether a path is an executable file.
 */
function isExecutable(path) {
    try {
        (0,exec/* execFileNonInteractive */.FR)('test', ['-x', path]);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Find the Claude Code CLI executable path.
 * Required in CI environments where the SDK can't auto-detect the CLI location.
 */
async function findClaudeCodeExecutable() {
    // Check environment variable first (set by action.yml)
    const envPath = process.env['CLAUDE_CODE_PATH'];
    if (envPath && isExecutable(envPath)) {
        return envPath;
    }
    // Standard install location from claude.ai/install.sh
    const homeLocalBin = `${process.env['HOME']}/.local/bin/claude`;
    if (isExecutable(homeLocalBin)) {
        return homeLocalBin;
    }
    // Try which command
    try {
        const path = (0,exec/* execFileNonInteractive */.FR)('which', ['claude']);
        if (path)
            return path;
    }
    catch {
        // which command failed
    }
    // Other common installation paths as fallback
    const commonPaths = ['/usr/local/bin/claude', '/usr/bin/claude'];
    for (const p of commonPaths) {
        if (isExecutable(p))
            return p;
    }
    setFailed('Claude Code CLI not found. Ensure Claude Code is installed via https://claude.ai/install.sh');
}
// -----------------------------------------------------------------------------
// Trigger Error Handling
// -----------------------------------------------------------------------------
/**
 * Log trigger error summary and fail if all triggers failed.
 */
function handleTriggerErrors(triggerErrors, totalTriggers) {
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
function collectTriggerErrors(results) {
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
function computeWorkflowOutputs(reports) {
    return {
        findingsCount: reports.reduce((sum, r) => sum + r.findings.length, 0),
        highCount: countSeverity(reports, 'high'),
        summary: reports.map((r) => r.summary).join('\n'),
    };
}
/**
 * Set workflow output variables.
 */
function setWorkflowOutputs(outputs) {
    setOutput('findings-count', outputs.findingsCount);
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
async function getAuthenticatedBotLogin(octokit) {
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
async function getDefaultBranchFromAPI(octokit, owner, repo) {
    const { data } = await octokit.repos.get({ owner, repo });
    return data.default_branch;
}
// -----------------------------------------------------------------------------
// Findings Output File
// -----------------------------------------------------------------------------
function getFindingsOutputValue(filePath, repoPath) {
    const relativePath = (0,path/* normalizePath */.Fd)((0,external_node_path_.relative)(repoPath, filePath));
    return (0,path/* isRepoRelativePath */.Ms)(relativePath) ? relativePath : filePath;
}
/**
 * Get the path for the findings output file.
 *
 * Uses the GitHub Actions workspace when available so action consumers can pass
 * the output to upload actions that expect repo-relative paths. Falls back to
 * RUNNER_TEMP for local callers and tests.
 */
function getFindingsOutputPath(repoPath) {
    if (repoPath && process.env['GITHUB_WORKSPACE']) {
        return (0,external_node_path_.join)(repoPath, 'warden-findings.json');
    }
    const tmpDir = process.env['RUNNER_TEMP'] ?? (0,external_node_os_.tmpdir)();
    return (0,external_node_path_.join)(tmpDir, 'warden-findings.json');
}
/**
 * Write structured findings data to a JSON file for external export (GCS, S3, etc.).
 *
 * Sets `findings-file` to a repo-relative path when possible so downstream
 * steps can reference the path without tripping ignore processors on absolute
 * runner temp paths.
 */
function writeFindingsOutput(reports, context) {
    const filePath = getFindingsOutputPath(context.repoPath);
    const allFindings = reports.flatMap((r) => r.findings);
    const output = {
        version: '1',
        timestamp: new Date().toISOString(),
        repository: {
            owner: context.repository.owner,
            name: context.repository.name,
            fullName: context.repository.fullName,
        },
        event: context.eventType,
        ...(context.pullRequest && {
            pullRequest: {
                number: context.pullRequest.number,
                author: context.pullRequest.author,
                title: context.pullRequest.title,
                baseBranch: context.pullRequest.baseBranch,
                headBranch: context.pullRequest.headBranch,
                headSha: context.pullRequest.headSha,
            },
        }),
        runId: process.env['GITHUB_RUN_ID'] ?? '',
        summary: {
            totalFindings: allFindings.length,
            findingsBySeverity: {
                high: allFindings.filter((f) => f.severity === 'high').length,
                medium: allFindings.filter((f) => f.severity === 'medium').length,
                low: allFindings.filter((f) => f.severity === 'low').length,
            },
            totalSkills: reports.length,
        },
        skills: reports.map((r) => ({
            name: r.skill,
            summary: r.summary,
            model: r.model,
            durationMs: r.durationMs,
            usage: r.usage,
            findings: r.findings.map((f) => ({
                id: f.id,
                severity: f.severity,
                confidence: f.confidence,
                title: f.title,
                description: f.description,
                location: f.location,
                additionalLocations: f.additionalLocations,
                suggestedFix: f.suggestedFix,
            })),
        })),
    };
    (0,external_node_fs_.mkdirSync)((0,external_node_path_.dirname)(filePath), { recursive: true });
    (0,external_node_fs_.writeFileSync)(filePath, JSON.stringify(output, null, 2));
    setOutput('findings-file', getFindingsOutputValue(filePath, context.repoPath));
    return filePath;
}

// EXTERNAL MODULE: ./node_modules/.pnpm/smol-toml@1.6.0/node_modules/smol-toml/dist/index.js + 8 modules
var dist = __webpack_require__(52923);
// EXTERNAL MODULE: ./src/skills/loader.ts
var loader = __webpack_require__(83138);
// EXTERNAL MODULE: ./node_modules/.pnpm/zod@4.3.6/node_modules/zod/v4/classic/external.js + 8 modules
var external = __webpack_require__(19002);
;// CONCATENATED MODULE: ./src/sdk/runtimes/types.ts
/**
 * Runtime contract for model-backed providers.
 *
 * Warden's analysis pipeline builds prompts, handles retry policy, parses
 * findings, and aggregates report data. Runtime interfaces are backend
 * capabilities underneath that pipeline. Runtimes expose skill execution,
 * auxiliary model tasks, and synthesis tasks.
 *
 * Runtime implementations are responsible for backend-specific execution
 * details such as model identifiers, stream events, authentication side
 * channels, stderr/diagnostics, telemetry attributes, tool loops, and usage
 * normalization. Callers should be able to switch runtimes without changing
 * hunk parsing, extraction repair, deduplication, fix gates, or reporting.
 */

const RuntimeNameSchema = external["enum"](['claude', 'pi']);

;// CONCATENATED MODULE: ./src/config/schema.ts



// Tool names that can be allowed/denied
const ToolNameSchema = external["enum"]([
    'Read',
    'Write',
    'Edit',
    'Bash',
    'Glob',
    'Grep',
    'WebFetch',
    'WebSearch',
]);
// Tool configuration for skills
const ToolConfigSchema = external.object({
    allowed: external.array(ToolNameSchema).optional(),
    denied: external.array(ToolNameSchema).optional(),
});
// Skill definition
const SkillDefinitionSchema = external.object({
    name: external.string().min(1),
    description: external.string(),
    prompt: external.string(),
    tools: ToolConfigSchema.optional(),
    /** Directory where the skill was loaded from, for resolving resources (scripts/, references/, assets/) */
    rootDir: external.string().optional(),
});
// Schedule-specific configuration
const ScheduleConfigSchema = external.object({
    /** Title for the tracking issue (default: "Warden: {skillName}") */
    issueTitle: external.string().optional(),
    /** Create PR with fixes when suggestedFix is available */
    createFixPR: external.boolean().default(false),
    /** Branch prefix for fix PRs (default: "warden-fix") */
    fixBranchPrefix: external.string().default('warden-fix'),
});
// Trigger type: where the trigger runs
const TriggerTypeSchema = external["enum"](['pull_request', 'local', 'schedule']);

const AgentRuntimeConfigSchema = external.object({
    /** Model for repo-aware skill execution. Overrides legacy defaults.model. */
    model: external.string().optional(),
    /** Maximum agentic turns for repo-aware skill execution. Overrides legacy defaults.maxTurns. */
    maxTurns: external.number().int().positive().optional(),
}).strict();
const AuxiliaryRuntimeConfigSchema = external.object({
    /** Model for auxiliary structured model calls. Uses runtime default if omitted. */
    model: external.string().optional(),
    /** Max retries for auxiliary structured model calls. Overrides legacy auxiliaryMaxRetries. */
    maxRetries: external.number().int().positive().optional(),
}).strict();
const SynthesisRuntimeConfigSchema = external.object({
    /** Model for post-analysis synthesis/consolidation. Falls back to auxiliary.model if omitted. */
    model: external.string().optional(),
}).strict();
const VerificationConfigSchema = external.object({
    /** Verify candidate findings in a second read-only pass. Defaults to true. */
    enabled: external.boolean().optional(),
}).strict();
// Skill trigger definition (nested under [[skills.triggers]])
const SkillTriggerSchema = external.object({
    /** Trigger type: pull_request (GitHub), local (CLI), or schedule (cron) */
    type: TriggerTypeSchema,
    /** Actions to trigger on (only for pull_request type) */
    actions: external.array(external.string()).min(1).optional(),
    // Per-trigger overrides (flattened output fields)
    failOn: types/* SeverityThresholdSchema */.q$.optional(),
    reportOn: types/* SeverityThresholdSchema */.q$.optional(),
    maxFindings: external.number().int().positive().optional(),
    reportOnSuccess: external.boolean().optional(),
    /** Use REQUEST_CHANGES review event when findings exceed failOn */
    requestChanges: external.boolean().optional(),
    /** Fail the check run when findings exceed failOn */
    failCheck: external.boolean().optional(),
    model: external.string().optional(),
    maxTurns: external.number().int().positive().optional(),
    /** Minimum confidence level for findings. Findings below this are filtered from output. */
    minConfidence: types/* ConfidenceThresholdSchema */.HA.optional(),
    /** Schedule-specific configuration. Only used when type is 'schedule'. */
    schedule: ScheduleConfigSchema.optional(),
}).refine((data) => {
    // actions is required for pull_request type
    if (data.type === 'pull_request') {
        return data.actions !== undefined && data.actions.length > 0;
    }
    return true;
}, {
    message: "actions is required for pull_request triggers",
    path: ["actions"],
});
// Skill configuration (top-level [[skills]])
const SkillConfigSchema = external.object({
    name: external.string().min(1),
    /** Path patterns to include */
    paths: external.array(external.string()).optional(),
    /** Path patterns to exclude */
    ignorePaths: external.array(external.string()).optional(),
    /** Remote repository reference for the skill (e.g., "owner/repo" or "owner/repo@sha") */
    remote: external.string().optional(),
    // Flattened output fields (skill-level defaults)
    failOn: types/* SeverityThresholdSchema */.q$.optional(),
    reportOn: types/* SeverityThresholdSchema */.q$.optional(),
    maxFindings: external.number().int().positive().optional(),
    reportOnSuccess: external.boolean().optional(),
    /** Use REQUEST_CHANGES review event when findings exceed failOn */
    requestChanges: external.boolean().optional(),
    /** Fail the check run when findings exceed failOn */
    failCheck: external.boolean().optional(),
    /** Model to use for this skill (e.g., 'openai/gpt-5.5'). Uses SDK default if not specified. */
    model: external.string().optional(),
    /** Maximum agentic turns (API round-trips) per hunk analysis. Overrides defaults.maxTurns. */
    maxTurns: external.number().int().positive().optional(),
    /** Minimum confidence level for findings. Findings below this are filtered from output. */
    minConfidence: types/* ConfidenceThresholdSchema */.HA.optional(),
    /** Triggers defining when/where this skill runs. Omit to run everywhere (wildcard). */
    triggers: external.array(SkillTriggerSchema).optional(),
});
// Runner configuration
const RunnerConfigSchema = external.object({
    /** Max concurrent file analyses across all skills (default: 4) */
    concurrency: external.number().int().positive().optional(),
});
// File pattern for chunking configuration
const FilePatternSchema = external.object({
    /** Glob pattern to match files (e.g., "**\/pnpm-lock.yaml") */
    pattern: external.string(),
    /** How to handle matching files: 'per-hunk' (default), 'whole-file', or 'skip' */
    mode: external["enum"](['per-hunk', 'whole-file', 'skip']).default('skip'),
});
// Coalescing configuration for merging nearby hunks
const CoalesceConfigSchema = external.object({
    /** Enable hunk coalescing (default: true) */
    enabled: external.boolean().default(true),
    /** Max lines gap between hunks to merge (default: 30) */
    maxGapLines: external.number().int().nonnegative().default(30),
    /** Target max size per chunk in characters (default: 8000) */
    maxChunkSize: external.number().int().positive().default(8000),
});
// Chunking configuration for controlling how files are processed
const ChunkingConfigSchema = external.object({
    /** Patterns to control file processing mode */
    filePatterns: external.array(FilePatternSchema).optional(),
    /** Coalescing options for merging nearby hunks */
    coalesce: CoalesceConfigSchema.optional(),
    /** Max number of "other files" to list in hunk prompts for PR context. 0 disables the section entirely. Default: 50 */
    maxContextFiles: external.number().int().nonnegative().default(50),
});
// Default configuration that skills inherit from
const DefaultsSchema = external.object({
    /** Fail the build when findings meet this severity */
    failOn: types/* SeverityThresholdSchema */.q$.optional(),
    /** Only report findings at or above this severity */
    reportOn: types/* SeverityThresholdSchema */.q$.optional(),
    maxFindings: external.number().int().positive().optional(),
    /** Report even when there are no findings (default: false) */
    reportOnSuccess: external.boolean().optional(),
    /** Use REQUEST_CHANGES review event when findings exceed failOn. Default: false */
    requestChanges: external.boolean().optional(),
    /** Fail the check run when findings exceed failOn. Default: false */
    failCheck: external.boolean().optional(),
    /** Default model for all skills (e.g., 'openai/gpt-5.5') */
    model: external.string().optional(),
    /** Maximum agentic turns (API round-trips) per hunk analysis. Default: 50 */
    maxTurns: external.number().int().positive().optional(),
    /** Runtime backend for all model-backed execution. Default: pi */
    runtime: RuntimeNameSchema.optional(),
    /** Model defaults for repo-aware skill execution. */
    agent: AgentRuntimeConfigSchema.optional(),
    /** Model defaults for auxiliary structured model calls. */
    auxiliary: AuxiliaryRuntimeConfigSchema.optional(),
    /** Model defaults for post-analysis synthesis/consolidation. */
    synthesis: SynthesisRuntimeConfigSchema.optional(),
    /** Candidate finding verification. Enabled by default; set enabled=false to opt out. */
    verification: VerificationConfigSchema.optional(),
    /** Minimum confidence level for findings. Findings below this are filtered from output. Default: medium */
    minConfidence: types/* ConfidenceThresholdSchema */.HA.optional(),
    /** Path patterns to exclude from all skills */
    ignorePaths: external.array(external.string()).optional(),
    /** Default branch for the repository (e.g., 'main', 'master', 'develop'). Auto-detected if not specified. */
    defaultBranch: external.string().optional(),
    /** Chunking configuration for controlling how files are processed */
    chunking: ChunkingConfigSchema.optional(),
    /** Delay in milliseconds between batch starts when processing files in parallel. Default: 0 */
    batchDelayMs: external.number().int().nonnegative().optional(),
    /** Max retries for auxiliary structured model calls (extraction repair, merging, dedup, fix evaluation). Default: 5 */
    auxiliaryMaxRetries: external.number().int().positive().optional(),
});
// Log cleanup mode
const LogCleanupModeSchema = external["enum"](['ask', 'auto', 'never']);
// Logs configuration
const LogsConfigSchema = external.object({
    /** How to handle expired log files: 'ask' (default, prompt in TTY), 'auto' (silently delete), 'never' (keep all) */
    cleanup: LogCleanupModeSchema.default('ask'),
    /** Number of days to retain log files before considering them expired. Default: 30 */
    retentionDays: external.number().int().positive().default(30),
});
// Main warden.toml configuration
const WardenConfigSchema = external.object({
    version: external.literal(1),
    defaults: DefaultsSchema.optional(),
    skills: external.array(SkillConfigSchema).default([]),
    runner: RunnerConfigSchema.optional(),
    logs: LogsConfigSchema.optional(),
})
    .superRefine((config, ctx) => {
    const names = config.skills.map((s) => s.name);
    const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
    if (duplicates.length > 0) {
        ctx.addIssue({
            code: external.ZodIssueCode.custom,
            message: `Duplicate skill names: ${[...new Set(duplicates)].join(', ')}`,
            path: ['skills'],
        });
    }
    // Validate schedule skills have paths
    for (const [i, skill] of config.skills.entries()) {
        if (skill.triggers) {
            for (const trigger of skill.triggers) {
                if (trigger.type === 'schedule' && (!skill.paths || skill.paths.length === 0)) {
                    ctx.addIssue({
                        code: external.ZodIssueCode.custom,
                        message: "paths is required for skills with schedule triggers",
                        path: ['skills', i, 'paths'],
                    });
                }
            }
        }
    }
});

;// CONCATENATED MODULE: ./src/config/loader.ts






class ConfigLoadError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = 'ConfigLoadError';
    }
}
function parseConfigContent(content) {
    let rawConfig;
    try {
        rawConfig = (0,dist/* parse */.qg)(content);
    }
    catch (error) {
        throw new ConfigLoadError('Failed to parse TOML configuration', { cause: error });
    }
    // Detect legacy [[triggers]] format and provide migration guidance
    if (rawConfig && typeof rawConfig === 'object' && 'triggers' in rawConfig) {
        throw new ConfigLoadError('Legacy [[triggers]] format detected. Migrate to [[skills]] format:\n\n' +
            '  [[triggers]]               →  [[skills]]\n' +
            '  name = "my-skill"              name = "my-skill"\n' +
            '  event = "pull_request"     →  [[skills.triggers]]\n' +
            '  skill = "my-skill"              type = "pull_request"\n' +
            '  actions = [...]                 actions = [...]\n\n' +
            'See the migration guide for details.');
    }
    const result = WardenConfigSchema.safeParse(rawConfig);
    if (!result.success) {
        const issues = result.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
        throw new ConfigLoadError(`Invalid configuration:\n${issues}`);
    }
    return result.data;
}
function loadWardenConfigFile(configPath) {
    return sentry/* Sentry.startSpan */.sQ.startSpan({ op: 'config.load', name: 'load config' }, () => {
        if (!(0,external_node_fs_.existsSync)(configPath)) {
            throw new ConfigLoadError(`Configuration file not found: ${configPath}`);
        }
        let content;
        try {
            content = (0,external_node_fs_.readFileSync)(configPath, 'utf-8');
        }
        catch (error) {
            throw new ConfigLoadError(`Failed to read configuration file: ${configPath}`, { cause: error });
        }
        return parseConfigContent(content);
    });
}
function loadWardenConfig(configDir) {
    return loadWardenConfigFile(join(configDir, 'warden.toml'));
}
function mergeArray(base, overlay) {
    const merged = [...(base ?? []), ...(overlay ?? [])];
    return merged.length > 0 ? merged : undefined;
}
function mergeCoalesceConfig(base, overlay) {
    if (!base)
        return overlay;
    if (!overlay)
        return base;
    return { ...base, ...overlay };
}
function mergeChunkingConfig(base, overlay) {
    if (!base)
        return overlay;
    if (!overlay)
        return base;
    return {
        ...base,
        ...overlay,
        filePatterns: mergeArray(base.filePatterns, overlay.filePatterns),
        coalesce: mergeCoalesceConfig(base.coalesce, overlay.coalesce),
    };
}
function mergeNestedConfig(base, overlay) {
    if (!base)
        return overlay;
    if (!overlay)
        return base;
    return { ...base, ...overlay };
}
function mergeDefaults(base, overlay) {
    if (!base)
        return overlay;
    if (!overlay)
        return base;
    return {
        ...base,
        ...overlay,
        agent: mergeNestedConfig(base.agent, overlay.agent),
        auxiliary: mergeNestedConfig(base.auxiliary, overlay.auxiliary),
        synthesis: mergeNestedConfig(base.synthesis, overlay.synthesis),
        verification: mergeNestedConfig(base.verification, overlay.verification),
        ignorePaths: mergeArray(base.ignorePaths, overlay.ignorePaths),
        chunking: mergeChunkingConfig(base.chunking, overlay.chunking),
    };
}
function mergeRunnerConfig(base, overlay) {
    if (!base)
        return overlay;
    if (!overlay)
        return base;
    return { ...base, ...overlay };
}
function mergeLogsConfig(base, overlay) {
    if (!base)
        return overlay;
    if (!overlay)
        return base;
    return { ...base, ...overlay };
}
function inheritRepoLayerDefaults(base, repo) {
    const inherited = { ...(repo ?? {}) };
    if (base?.runtime !== undefined && inherited.runtime === undefined) {
        inherited.runtime = base.runtime;
    }
    const verification = mergeNestedConfig(base?.verification, repo?.verification);
    if (verification) {
        inherited.verification = verification;
    }
    return Object.keys(inherited).length > 0 ? inherited : undefined;
}
function withoutBaseDuplicateSkills(base, repo, options = {}) {
    const baseSkillNames = new Set(base.skills.map((skill) => skill.name));
    const skipped = new Set();
    const skills = repo.skills.filter((skill) => {
        if (!baseSkillNames.has(skill.name)) {
            return true;
        }
        skipped.add(skill.name);
        return false;
    });
    for (const skillName of skipped) {
        const basePath = options.baseConfigPath ?? 'base config';
        const repoPath = options.repoConfigPath ?? 'repo config';
        options.onWarning?.(`Skill "${skillName}" is defined in both ${basePath} and ${repoPath}. ` +
            'Using the base config skill and ignoring the repo config duplicate.');
    }
    return skipped.size > 0 ? { ...repo, skills } : repo;
}
function mergeWardenConfigs(base, overlay, options = {}) {
    const effectiveOverlay = withoutBaseDuplicateSkills(base, overlay, options);
    const mergedConfig = {
        version: 1,
        defaults: mergeDefaults(base.defaults, effectiveOverlay.defaults),
        skills: [...base.skills, ...effectiveOverlay.skills],
        runner: mergeRunnerConfig(base.runner, effectiveOverlay.runner),
        logs: mergeLogsConfig(base.logs, effectiveOverlay.logs),
    };
    const result = WardenConfigSchema.safeParse(mergedConfig);
    if (!result.success) {
        const issues = result.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
        throw new ConfigLoadError(`Invalid merged configuration:\n${issues}`);
    }
    return result.data;
}
function buildSkillRootsByName(repoPath, layered, baseSkillRoot) {
    const baseRoots = {};
    const repoRoots = {};
    if (layered.baseConfig) {
        const localBaseSkills = layered.baseConfig.skills.filter((skill) => !skill.remote);
        const localBaseSkillsRequiringRoot = localBaseSkills.filter((skill) => !(0,loader/* isBuiltinSkillName */.OB)(skill.name));
        if (localBaseSkillsRequiringRoot.length > 0 && !baseSkillRoot) {
            throw new ConfigLoadError('base-skill-root is required when the base config defines local skills');
        }
        if (baseSkillRoot) {
            const resolvedBaseSkillRoot = (0,external_node_path_.join)(repoPath, baseSkillRoot);
            if (!(0,external_node_fs_.existsSync)(resolvedBaseSkillRoot)) {
                throw new ConfigLoadError(`Skill root not found: ${resolvedBaseSkillRoot}`);
            }
            for (const skill of localBaseSkills) {
                baseRoots[skill.name] = resolvedBaseSkillRoot;
            }
        }
        else {
            for (const skill of localBaseSkills) {
                if ((0,loader/* isBuiltinSkillName */.OB)(skill.name)) {
                    baseRoots[skill.name] = undefined;
                }
            }
        }
    }
    if (layered.repoConfig) {
        for (const skill of layered.repoConfig.skills) {
            if (!skill.remote) {
                repoRoots[skill.name] = repoPath;
            }
        }
    }
    const result = {};
    if (Object.keys(baseRoots).length > 0) {
        result.base = baseRoots;
    }
    if (Object.keys(repoRoots).length > 0) {
        result.repo = repoRoots;
    }
    return result.base || result.repo ? result : undefined;
}
function loadLayeredWardenConfig(repoPath, options = {}) {
    const repoConfigPath = (0,external_node_path_.join)(repoPath, options.configPath ?? 'warden.toml');
    const baseConfigPath = options.baseConfigPath
        ? (0,external_node_path_.join)(repoPath, options.baseConfigPath)
        : undefined;
    if (baseConfigPath && !(0,external_node_fs_.existsSync)(baseConfigPath)) {
        throw new ConfigLoadError(`Configuration file not found: ${baseConfigPath}`);
    }
    if (!baseConfigPath) {
        const repoConfig = loadWardenConfigFile(repoConfigPath);
        return { config: repoConfig, repoConfig };
    }
    if ((0,external_node_path_.normalize)(baseConfigPath) === (0,external_node_path_.normalize)(repoConfigPath)) {
        throw new ConfigLoadError('base-config-path and config-path must point to different files');
    }
    const baseConfig = loadWardenConfigFile(baseConfigPath);
    if (!(0,external_node_fs_.existsSync)(repoConfigPath)) {
        return { config: baseConfig, baseConfig };
    }
    const repoConfig = withoutBaseDuplicateSkills(baseConfig, loadWardenConfigFile(repoConfigPath), {
        baseConfigPath: options.baseConfigPath,
        repoConfigPath: options.configPath ?? 'warden.toml',
        onWarning: options.onWarning,
    });
    return {
        config: mergeWardenConfigs(baseConfig, repoConfig),
        baseConfig,
        repoConfig,
    };
}
function resolveSkillSource(skill, skillRootsByName) {
    if (!skillRootsByName || !Object.hasOwn(skillRootsByName, skill.name)) {
        return {};
    }
    const skillRoot = skillRootsByName[skill.name];
    return {
        skillRoot,
        useBuiltinSkill: !skill.remote && skillRoot === undefined,
    };
}
/**
 * Convert empty strings to undefined.
 * GitHub Actions substitutes unconfigured secrets with empty strings,
 * so we need to treat '' as "not set" for optional config values.
 */
function emptyToUndefined(value) {
    return value === '' ? undefined : value;
}
/**
 * Resolve all skills in a config into a flat array of ResolvedTriggers.
 * Each skill x trigger combination produces one entry.
 * Skills with no triggers produce one wildcard entry (type: '*').
 *
 * Model precedence (highest to lowest):
 * 1. trigger-level model
 * 2. skill-level model
 * 3. defaults.agent.model
 * 4. defaults.model (legacy warden.toml [defaults])
 * 5. cliModel (--model flag)
 * 6. WARDEN_MODEL env var
 * 7. SDK default (not set here)
 */
function resolveSkillConfigs(config, cliModel, skillRootsByName) {
    const defaults = config.defaults;
    const envModel = emptyToUndefined(process.env['WARDEN_MODEL']);
    const result = [];
    const runtime = defaults?.runtime ?? 'pi';
    const auxiliaryModel = emptyToUndefined(defaults?.auxiliary?.model);
    const synthesisModel = emptyToUndefined(defaults?.synthesis?.model) ??
        auxiliaryModel;
    const auxiliaryMaxRetries = defaults?.auxiliary?.maxRetries ??
        defaults?.auxiliaryMaxRetries;
    const verifyFindings = defaults?.verification?.enabled !== false;
    for (const skill of config.skills) {
        const skillSource = resolveSkillSource(skill, skillRootsByName);
        const baseModel = emptyToUndefined(skill.model) ??
            emptyToUndefined(defaults?.agent?.model) ??
            emptyToUndefined(defaults?.model) ??
            emptyToUndefined(cliModel) ??
            envModel;
        const baseMaxTurns = skill.maxTurns ?? defaults?.agent?.maxTurns ?? defaults?.maxTurns;
        // Merge ignorePaths: skill-level + defaults (additive, not override)
        const mergedIgnorePaths = [
            ...(defaults?.ignorePaths ?? []),
            ...(skill.ignorePaths ?? []),
        ];
        const filters = {
            paths: skill.paths,
            ignorePaths: mergedIgnorePaths.length > 0 ? mergedIgnorePaths : undefined,
        };
        if (!skill.triggers || skill.triggers.length === 0) {
            // Wildcard: no triggers means run everywhere
            result.push({
                name: skill.name,
                skill: skill.name,
                type: '*',
                remote: skill.remote,
                ...skillSource,
                filters,
                failOn: skill.failOn ?? defaults?.failOn,
                reportOn: skill.reportOn ?? defaults?.reportOn,
                maxFindings: skill.maxFindings ?? defaults?.maxFindings,
                reportOnSuccess: skill.reportOnSuccess ?? defaults?.reportOnSuccess,
                requestChanges: skill.requestChanges ?? defaults?.requestChanges,
                failCheck: skill.failCheck ?? defaults?.failCheck,
                model: baseModel,
                maxTurns: baseMaxTurns,
                runtime,
                auxiliaryModel,
                synthesisModel,
                auxiliaryMaxRetries,
                verifyFindings,
                minConfidence: skill.minConfidence ?? defaults?.minConfidence,
                batchDelayMs: defaults?.batchDelayMs,
                maxContextFiles: defaults?.chunking?.maxContextFiles,
            });
        }
        else {
            for (const trigger of skill.triggers) {
                result.push({
                    name: skill.name,
                    skill: skill.name,
                    type: trigger.type,
                    actions: trigger.actions,
                    remote: skill.remote,
                    ...skillSource,
                    filters,
                    // 3-level merge: trigger > skill > defaults
                    failOn: trigger.failOn ?? skill.failOn ?? defaults?.failOn,
                    reportOn: trigger.reportOn ?? skill.reportOn ?? defaults?.reportOn,
                    maxFindings: trigger.maxFindings ?? skill.maxFindings ?? defaults?.maxFindings,
                    reportOnSuccess: trigger.reportOnSuccess ?? skill.reportOnSuccess ?? defaults?.reportOnSuccess,
                    requestChanges: trigger.requestChanges ?? skill.requestChanges ?? defaults?.requestChanges,
                    failCheck: trigger.failCheck ?? skill.failCheck ?? defaults?.failCheck,
                    model: emptyToUndefined(trigger.model) ?? baseModel,
                    maxTurns: trigger.maxTurns ?? baseMaxTurns,
                    runtime,
                    auxiliaryModel,
                    synthesisModel,
                    auxiliaryMaxRetries,
                    verifyFindings,
                    minConfidence: trigger.minConfidence ?? skill.minConfidence ?? defaults?.minConfidence,
                    batchDelayMs: defaults?.batchDelayMs,
                    maxContextFiles: defaults?.chunking?.maxContextFiles,
                    schedule: trigger.schedule,
                });
            }
        }
    }
    return result;
}
function resolveLayeredSkillConfigs(layered, cliModel, skillRootsByName) {
    if (layered.baseConfig && layered.repoConfig) {
        const repoConfig = withoutBaseDuplicateSkills(layered.baseConfig, layered.repoConfig);
        const repoConfigWithInheritedDefaults = {
            ...repoConfig,
            defaults: inheritRepoLayerDefaults(layered.baseConfig.defaults, repoConfig.defaults),
        };
        return [
            ...resolveSkillConfigs(layered.baseConfig, cliModel, skillRootsByName?.base),
            ...resolveSkillConfigs(repoConfigWithInheritedDefaults, cliModel, skillRootsByName?.repo),
        ];
    }
    if (layered.baseConfig) {
        return resolveSkillConfigs(layered.baseConfig, cliModel, skillRootsByName?.base);
    }
    if (layered.repoConfig) {
        return resolveSkillConfigs(layered.repoConfig, cliModel, skillRootsByName?.repo);
    }
    return resolveSkillConfigs(layered.config, cliModel, skillRootsByName?.repo ?? skillRootsByName?.base);
}

;// CONCATENATED MODULE: ./src/event/context.ts


// GitHub Action event payload schemas
const GitHubUserSchema = external.object({
    login: external.string(),
});
const GitHubRepoSchema = external.object({
    name: external.string(),
    full_name: external.string(),
    default_branch: external.string(),
    owner: GitHubUserSchema,
});
const GitHubPullRequestSchema = external.object({
    number: external.number(),
    title: external.string(),
    body: external.string().nullable(),
    user: GitHubUserSchema,
    base: external.object({
        ref: external.string(),
        sha: external.string(),
    }),
    head: external.object({
        ref: external.string(),
        sha: external.string(),
    }),
});
const GitHubEventPayloadSchema = external.object({
    action: external.string(),
    repository: GitHubRepoSchema,
    pull_request: GitHubPullRequestSchema.optional(),
});
class EventContextError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = 'EventContextError';
    }
}
async function buildEventContext(eventName, eventPayload, repoPath, octokit) {
    const payloadResult = GitHubEventPayloadSchema.safeParse(eventPayload);
    if (!payloadResult.success) {
        throw new EventContextError('Invalid event payload', { cause: payloadResult.error });
    }
    const payload = payloadResult.data;
    const repository = {
        owner: payload.repository.owner.login,
        name: payload.repository.name,
        fullName: payload.repository.full_name,
        defaultBranch: payload.repository.default_branch,
    };
    let pullRequest;
    if (eventName === 'pull_request' && payload.pull_request) {
        const pr = payload.pull_request;
        // Fetch files changed in the PR
        const files = await fetchPullRequestFiles(octokit, repository.owner, repository.name, pr.number);
        pullRequest = {
            number: pr.number,
            title: pr.title,
            body: pr.body,
            author: pr.user.login,
            baseBranch: pr.base.ref,
            headBranch: pr.head.ref,
            headSha: pr.head.sha,
            baseSha: pr.base.sha,
            files,
        };
    }
    const context = {
        eventType: eventName,
        action: payload.action,
        repository,
        pullRequest,
        diffContextSource: { type: 'working-tree' },
        repoPath,
    };
    // Validate the final context
    const result = types/* EventContextSchema */.hA.safeParse(context);
    if (!result.success) {
        throw new EventContextError('Failed to build valid event context', { cause: result.error });
    }
    return result.data;
}
async function fetchPullRequestFiles(octokit, owner, repo, pullNumber) {
    const files = await octokit.paginate(octokit.pulls.listFiles, {
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
    });
    return files.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch,
    }));
}

// EXTERNAL MODULE: ./node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.2.22_zod@4.3.6/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs
var sdk = __webpack_require__(86920);
// EXTERNAL MODULE: ./src/sdk/haiku.ts
var haiku = __webpack_require__(84107);
// EXTERNAL MODULE: ./src/sdk/otel.ts
var otel = __webpack_require__(70359);
// EXTERNAL MODULE: ./src/sdk/pricing.ts + 1 modules
var pricing = __webpack_require__(32173);
// EXTERNAL MODULE: ./src/sdk/usage.ts
var sdk_usage = __webpack_require__(72746);
;// CONCATENATED MODULE: ./src/sdk/runtimes/claude.ts






const DEFAULT_READ_ONLY_TOOLS = ['Read', 'Grep', 'Glob'];
const READ_ONLY_TOOLS = ['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch'];
const MUTATING_TOOLS = ['Write', 'Edit', 'Bash'];
const CLAUDE_AGENT_TOOLS = ['Task', 'TodoWrite'];
function getClaudeProviderOptions(providerOptions) {
    if (!providerOptions || typeof providerOptions !== 'object') {
        return {};
    }
    const { pathToClaudeCodeExecutable } = providerOptions;
    return {
        pathToClaudeCodeExecutable: typeof pathToClaudeCodeExecutable === 'string'
            ? pathToClaudeCodeExecutable
            : undefined,
    };
}
function missingApiKeyResult(kind) {
    return {
        success: false,
        error: `Anthropic API key required for Claude ${kind} runtime`,
        usage: (0,sdk_usage/* emptyUsage */.ly)(),
    };
}
function resolveClaudeSkillTools(tools, allowMutatingTools = false) {
    const denied = new Set(tools?.denied ?? []);
    const requested = tools?.allowed ?? DEFAULT_READ_ONLY_TOOLS;
    const availableTools = allowMutatingTools
        ? [...READ_ONLY_TOOLS, ...MUTATING_TOOLS]
        : READ_ONLY_TOOLS;
    const allowedTools = availableTools.filter((tool) => requested.includes(tool) && !denied.has(tool));
    const disallowedAvailableTools = availableTools.filter((tool) => !allowedTools.includes(tool));
    const disallowedMutatingTools = allowMutatingTools ? [] : [...MUTATING_TOOLS];
    return {
        allowedTools,
        disallowedTools: [...disallowedMutatingTools, ...disallowedAvailableTools, ...CLAUDE_AGENT_TOOLS],
    };
}
async function runStructured(request) {
    if (!request.apiKey) {
        return missingApiKeyResult(request.kind);
    }
    if (request.tools) {
        return (0,haiku/* callHaikuWithTools */.u2)({
            apiKey: request.apiKey,
            prompt: request.prompt,
            schema: request.schema,
            tools: request.tools.map(toAnthropicTool),
            executeTool: request.executeTool ?? (async () => ''),
            agentName: request.agentName,
            task: request.task,
            model: request.model,
            maxTokens: request.maxTokens,
            maxIterations: request.maxIterations,
            timeout: request.timeout,
            maxRetries: request.maxRetries,
        });
    }
    return (0,haiku/* callHaiku */.tQ)({
        apiKey: request.apiKey,
        prompt: request.prompt,
        schema: request.schema,
        agentName: request.agentName,
        task: request.task,
        model: request.model,
        maxTokens: request.maxTokens,
        timeout: request.timeout,
        maxRetries: request.maxRetries,
    });
}
function toAnthropicTool(tool) {
    return {
        name: tool.name,
        description: tool.description ?? '',
        input_schema: tool.inputSchema,
    };
}
function singleResponseModel(modelUsage) {
    const models = Object.keys(modelUsage ?? {});
    return models.length === 1 ? models[0] : undefined;
}
function statusFromClaudeSubtype(subtype) {
    switch (subtype) {
        case 'success':
            return 'success';
        case 'error_max_turns':
            return 'turn_limit';
        case 'error_max_budget_usd':
            return 'budget_limit';
        case 'error_max_structured_output_retries':
            return 'structured_output_error';
        case 'error_during_execution':
            return 'provider_error';
        default:
            return 'provider_error';
    }
}
function turnUsageToStats(turn) {
    return (0,pricing/* apiUsageToStats */.Y)(turn.model, {
        input_tokens: turn.inputTokens,
        output_tokens: turn.outputTokens,
        cache_read_input_tokens: turn.cacheRead,
        cache_creation_input_tokens: turn.cacheWrite,
        cache_creation: {
            ephemeral_5m_input_tokens: turn.cacheWrite5m,
            ephemeral_1h_input_tokens: turn.cacheWrite1h,
        },
        server_tool_use: {
            web_search_requests: turn.webSearchRequests,
        },
    });
}
function reconcileStreamedUsage(args) {
    const { result, streamedUsage, responseModel } = args;
    if (!streamedUsage) {
        return undefined;
    }
    const resultUsage = (0,sdk_usage/* extractUsage */.f5)(result);
    const resultTextTokens = result.subtype === 'success'
        ? (0,sdk_usage/* estimateTokens */.bP)(result.result.length)
        : 0;
    const outputTokens = Math.max(streamedUsage.outputTokens, resultUsage.outputTokens, resultTextTokens);
    const missingOutputTokens = outputTokens - streamedUsage.outputTokens;
    if (missingOutputTokens <= 0 || !responseModel) {
        return streamedUsage;
    }
    return (0,sdk_usage/* aggregateUsage */.Z$)([
        streamedUsage,
        (0,pricing/* apiUsageToStats */.Y)(responseModel, {
            input_tokens: 0,
            output_tokens: missingOutputTokens,
        }),
    ]);
}
function normalizeResult(result, usage, responseModel) {
    const errors = 'errors' in result ? result.errors : [];
    return {
        status: statusFromClaudeSubtype(result.subtype),
        text: result.subtype === 'success' ? result.result : '',
        errors,
        usage: usage ?? (0,sdk_usage/* extractUsage */.f5)(result),
        responseId: result.uuid,
        responseModel: responseModel ?? singleResponseModel(result.modelUsage),
        sessionId: result.session_id,
        durationMs: result.duration_ms,
        durationApiMs: result.duration_api_ms,
        numTurns: result.num_turns,
    };
}
function appendClaudeStderr(error, stderr) {
    const originalMessage = error instanceof Error ? error.message : String(error);
    const message = `${originalMessage}\nClaude Code stderr: ${stderr}`;
    if (error instanceof Error) {
        try {
            error.message = message;
            error.claudeStderr = stderr;
            return error;
        }
        catch {
            const enhancedError = new Error(message);
            enhancedError.cause = error;
            return enhancedError;
        }
    }
    return new Error(message);
}
const claudeRuntime = {
    name: 'claude',
    async runSkill(request) {
        const { systemPrompt, userPrompt, repoPath, options, skillName, providerOptions, tools, allowMutatingTools, } = request;
        const { maxTurns = 50, model, abortController } = options;
        const { pathToClaudeCodeExecutable } = getClaudeProviderOptions(providerOptions);
        const skillTools = resolveClaudeSkillTools(tools, allowMutatingTools);
        const modelId = model ?? 'unknown';
        return sentry/* Sentry.startSpan */.sQ.startSpan({
            op: 'gen_ai.invoke_agent',
            name: `invoke_agent ${skillName}`,
            attributes: {
                'gen_ai.operation.name': 'invoke_agent',
                'gen_ai.provider.name': 'anthropic',
                'gen_ai.agent.name': skillName,
                'gen_ai.request.model': modelId,
                'warden.request.max_turns': maxTurns,
            },
        }, async (span) => {
            (0,otel/* setGenAiSystemInstructionsAttr */.kq)(span, systemPrompt);
            (0,otel/* setGenAiInputMessagesAttr */.uQ)(span, [{ role: 'user', content: userPrompt }]);
            const stderrChunks = [];
            const stream = (0,sdk/* query */.P)({
                prompt: userPrompt,
                options: {
                    maxTurns,
                    cwd: repoPath,
                    systemPrompt,
                    // Hunk analysis is read-only; trusted internal writer tasks may opt
                    // into mutating tools explicitly at the runtime request boundary.
                    allowedTools: skillTools.allowedTools,
                    disallowedTools: skillTools.disallowedTools,
                    permissionMode: 'bypassPermissions',
                    // Prevent SDK from writing session .jsonl files and polluting Claude Code's session index.
                    persistSession: false,
                    model,
                    abortController,
                    pathToClaudeCodeExecutable,
                    stderr: (data) => {
                        stderrChunks.push(data);
                    },
                },
            });
            let resultMessage;
            let authError;
            // Per-turn tracing: buffer assistant messages and tool progress to create
            // child spans (gen_ai.chat + gen_ai.execute_tool) under the invoke_agent span.
            let turnCount = 0;
            let pendingTurn = null;
            const turnUsages = [];
            const responseModels = new Set();
            const pendingToolProgress = new Map();
            function flushPendingTurn() {
                if (!pendingTurn)
                    return;
                turnCount++;
                const turn = pendingTurn;
                const toolProgress = new Map(pendingToolProgress);
                pendingTurn = null;
                pendingToolProgress.clear();
                turnUsages.push(turnUsageToStats(turn));
                responseModels.add(turn.model);
                try {
                    const totalInput = turn.inputTokens + turn.cacheRead + turn.cacheWrite;
                    sentry/* Sentry.startSpan */.sQ.startSpan({
                        op: 'gen_ai.chat',
                        name: `chat ${skillName} turn ${turnCount}`,
                        attributes: {
                            'gen_ai.operation.name': 'chat',
                            'gen_ai.provider.name': 'anthropic',
                            'gen_ai.agent.name': skillName,
                            'gen_ai.request.model': modelId,
                            'gen_ai.response.model': turn.model,
                            'gen_ai.usage.input_tokens': totalInput,
                            'gen_ai.usage.output_tokens': turn.outputTokens,
                            'gen_ai.usage.input_tokens.cached': turn.cacheRead,
                            'gen_ai.usage.input_tokens.cache_write': turn.cacheWrite,
                            'gen_ai.usage.total_tokens': totalInput + turn.outputTokens,
                        },
                    }, () => {
                        for (const toolUse of turn.toolUses) {
                            const elapsed = toolProgress.get(toolUse.id);
                            const attributes = {
                                'gen_ai.operation.name': 'execute_tool',
                                'gen_ai.agent.name': skillName,
                                'gen_ai.tool.name': toolUse.name,
                            };
                            if (elapsed !== undefined) {
                                const endTime = Date.now() / 1000;
                                const parentSpan = sentry/* Sentry.getActiveSpan */.sQ.getActiveSpan();
                                const span = sentry/* Sentry.startInactiveSpan */.sQ.startInactiveSpan({
                                    op: 'gen_ai.execute_tool',
                                    name: toolUse.name,
                                    ...(parentSpan && { parentSpan }),
                                    startTime: Math.max(0, endTime - elapsed),
                                    attributes,
                                });
                                span.end(endTime);
                            }
                            else {
                                sentry/* Sentry.startSpan */.sQ.startSpan({
                                    op: 'gen_ai.execute_tool',
                                    name: toolUse.name,
                                    attributes,
                                }, () => undefined);
                            }
                        }
                    });
                }
                catch {
                    // Telemetry should never break the workflow.
                }
            }
            try {
                for await (const message of stream) {
                    if (message.type === 'assistant') {
                        flushPendingTurn();
                        const msg = message.message;
                        const cacheWrite5m = msg.usage?.cache_creation?.ephemeral_5m_input_tokens ?? 0;
                        const cacheWrite1h = msg.usage?.cache_creation?.ephemeral_1h_input_tokens ?? 0;
                        const toolUses = msg.content
                            .filter((block) => block.type === 'tool_use')
                            .map(({ id, name }) => ({ id, name }));
                        pendingTurn = {
                            toolUses,
                            inputTokens: msg.usage?.input_tokens ?? 0,
                            outputTokens: msg.usage?.output_tokens ?? 0,
                            cacheRead: msg.usage?.cache_read_input_tokens ?? 0,
                            cacheWrite: Math.max(msg.usage?.cache_creation_input_tokens ?? 0, cacheWrite5m + cacheWrite1h),
                            cacheWrite5m,
                            cacheWrite1h,
                            webSearchRequests: msg.usage?.server_tool_use?.web_search_requests ?? 0,
                            model: msg.model,
                        };
                    }
                    else if (message.type === 'tool_progress') {
                        pendingToolProgress.set(message.tool_use_id, message.elapsed_time_seconds);
                    }
                    else if (message.type === 'result') {
                        flushPendingTurn();
                        resultMessage = message;
                    }
                    else if (message.type === 'auth_status' && message.error) {
                        authError = message.error;
                    }
                }
            }
            catch (error) {
                const stderr = stderrChunks.join('').trim();
                if (stderr) {
                    throw appendClaudeStderr(error, stderr);
                }
                throw error;
            }
            finally {
                flushPendingTurn();
            }
            if (resultMessage) {
                const usage = resultMessage.usage;
                if (usage) {
                    const inputTokens = usage.input_tokens ?? 0;
                    const outputTokens = usage.output_tokens ?? 0;
                    const cacheRead = usage.cache_read_input_tokens ?? 0;
                    const cacheWrite5m = usage.cache_creation?.ephemeral_5m_input_tokens ?? 0;
                    const cacheWrite1h = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
                    const cacheWrite = Math.max(usage.cache_creation_input_tokens ?? 0, cacheWrite5m + cacheWrite1h);
                    const totalInputTokens = inputTokens + cacheRead + cacheWrite;
                    (0,otel/* setGenAiUsageAttrs */.qk)(span, {
                        inputTokens: totalInputTokens,
                        outputTokens,
                        cacheReadInputTokens: cacheRead,
                        cacheCreationInputTokens: cacheWrite,
                        cacheCreation5mInputTokens: cacheWrite5m,
                        cacheCreation1hInputTokens: cacheWrite1h,
                        webSearchRequests: usage.server_tool_use?.web_search_requests ?? 0,
                        costUSD: resultMessage.total_cost_usd ?? 0,
                    });
                }
                if (resultMessage.uuid) {
                    span.setAttribute('gen_ai.response.id', resultMessage.uuid);
                }
                if (resultMessage.modelUsage) {
                    const responseModel = singleResponseModel(resultMessage.modelUsage);
                    if (responseModel) {
                        span.setAttribute('gen_ai.response.model', responseModel);
                    }
                }
                if (resultMessage.subtype === 'success' && resultMessage.result) {
                    (0,otel/* setGenAiOutputMessagesAttr */.hX)(span, resultMessage.result);
                }
                else if (resultMessage.subtype !== 'success') {
                    span.setAttribute('error.type', resultMessage.subtype);
                }
                const optionalAttrs = {
                    'gen_ai.conversation.id': resultMessage.session_id,
                    'warden.sdk.duration_ms': resultMessage.duration_ms,
                    'warden.sdk.duration_api_ms': resultMessage.duration_api_ms,
                    'warden.sdk.num_turns': resultMessage.num_turns,
                };
                for (const [key, value] of Object.entries(optionalAttrs)) {
                    if (value !== undefined) {
                        span.setAttribute(key, value);
                    }
                }
            }
            const stderr = stderrChunks.join('').trim() || undefined;
            const streamedUsage = turnUsages.length > 0 ? (0,sdk_usage/* aggregateUsage */.Z$)(turnUsages) : undefined;
            const responseModel = responseModels.size === 1 ? [...responseModels][0] : undefined;
            return {
                result: resultMessage
                    ? normalizeResult(resultMessage, reconcileStreamedUsage({
                        result: resultMessage,
                        streamedUsage,
                        responseModel,
                    }), responseModel)
                    : undefined,
                authError,
                stderr,
            };
        });
    },
    async runAuxiliary(request) {
        return runStructured({ kind: 'auxiliary', ...request });
    },
    async runSynthesis(request) {
        return runStructured({ kind: 'synthesis', ...request });
    },
};

// EXTERNAL MODULE: ./src/sdk/runtimes/pi.ts
var pi = __webpack_require__(31460);
;// CONCATENATED MODULE: ./src/sdk/runtimes/index.ts


const RUNTIMES = {
    claude: claudeRuntime,
    pi: pi.piRuntime,
};


/** Return the runtime adapter for model-backed execution. */
function runtimes_getRuntime(name = 'pi') {
    const runtime = RUNTIMES[name];
    if (!runtime) {
        throw new Error(`Unsupported runtime: ${name}`);
    }
    return runtime;
}
/**
 * Build provider-specific runtime options at the runtime boundary.
 */
function getRuntimeProviderOptions(name, options) {
    if (name === 'claude') {
        return { pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable };
    }
    return undefined;
}

// EXTERNAL MODULE: ./node_modules/.pnpm/nanoid@5.1.6/node_modules/nanoid/index.js
var nanoid = __webpack_require__(85326);
;// CONCATENATED MODULE: ./src/sdk/prompt-sections.ts

const MAX_BODY_LENGTH = 1000;
/**
 * Build a tagged prompt section, omitting empty content.
 */
function prompt_sections_buildTaggedSection(tag, content) {
    const body = Array.isArray(content) ? content.join('\n') : content;
    if (body.trim().length === 0)
        return undefined;
    return `<${tag}>
${body}
</${tag}>`;
}
/**
 * Join prompt sections with consistent spacing, skipping omitted sections.
 */
function prompt_sections_joinPromptSections(sections) {
    return sections.filter((section) => Boolean(section)).join('\n\n');
}
/**
 * Build a tagged JSON-only output contract.
 */
function prompt_sections_buildJsonOutputSection(instructions) {
    const lines = [
        'Return only valid JSON. Do not include markdown, prose, code fences, or explanations.',
    ];
    const trimmedInstructions = instructions.trim();
    if (trimmedInstructions.length > 0) {
        lines.push('', trimmedInstructions);
    }
    return `<output_format>
${lines.join('\n')}
</output_format>`;
}
/**
 * Build tagged pull request context shared by Warden agents.
 */
function buildPullRequestContextSection(prContext) {
    if (!prContext?.title)
        return undefined;
    const lines = [`<title>${prContext.title}</title>`];
    if (prContext.body) {
        const body = prContext.body.length > MAX_BODY_LENGTH
            ? `${prContext.body.slice(0, MAX_BODY_LENGTH)}...`
            : prContext.body;
        lines.push('<body>', body, '</body>');
    }
    return prompt_sections_buildTaggedSection('pull_request_context', lines);
}
/**
 * Build a tagged file list section with optional current-file exclusion.
 */
function buildFileListSection(tag, files, options = {}) {
    const maxFiles = options.maxFiles ?? 50;
    const visibleFiles = options.currentFile
        ? files.filter((f) => f !== options.currentFile)
        : files;
    if (visibleFiles.length === 0 || maxFiles === 0)
        return undefined;
    const displayFiles = visibleFiles.slice(0, maxFiles);
    const remaining = visibleFiles.length - displayFiles.length;
    const lines = displayFiles.map((f) => `- ${f}`);
    if (remaining > 0) {
        lines.push(`- ... and ${remaining} more`);
    }
    return prompt_sections_buildTaggedSection(tag, lines);
}
/**
 * Build tagged changed-file context shared by Warden agents.
 */
function buildChangedFilesSection(prContext, currentFile) {
    if (!prContext)
        return undefined;
    return buildFileListSection('changed_files', prContext.changedFiles, {
        currentFile,
        maxFiles: prContext.maxContextFiles ?? 50,
    });
}
function formatFindingLocation(finding, style) {
    const loc = finding.location;
    if (!loc)
        return 'general';
    if (style === 'range' && loc.endLine) {
        return `${loc.path}:${loc.startLine}-${loc.endLine}`;
    }
    return `${loc.path}:${(0,types/* findingLine */.mC)(finding)}`;
}
/**
 * Format one finding for prompt lists shared by auxiliary agents.
 */
function formatFindingForPrompt(finding, options = {}) {
    const details = [];
    if (options.includeSeverity)
        details.push(`(${finding.severity})`);
    if (options.includeConfidence && finding.confidence) {
        details.push(`[confidence: ${finding.confidence}]`);
    }
    const prefix = details.length > 0 ? `${details.join(' ')} ` : '';
    const location = formatFindingLocation(finding, options.locationStyle ?? 'line');
    let text = `[${location}] ${prefix}"${finding.title}" - ${finding.description}`;
    if (options.includeVerification && finding.verification) {
        text += ` Verification: ${finding.verification}`;
    }
    const snippet = options.snippet?.(finding);
    if (snippet) {
        text += `\n   Code: ${snippet.split('\n').join('\n   ')}`;
    }
    return text;
}
/**
 * Format findings as a stable 1-based prompt list.
 */
function formatIndexedFindingsForPrompt(findings, options = {}) {
    return findings.map((finding, index) => {
        return `${index + 1}. ${formatFindingForPrompt(finding, options)}`;
    }).join('\n');
}

;// CONCATENATED MODULE: ./src/sdk/extract.ts







/** Pattern to match the start of findings JSON (allows whitespace after brace) */
const FINDINGS_JSON_START = /\{\s*"findings"/;
/** Return true when the selected runtime can authenticate outside a legacy Anthropic API key. */
function extract_canUseRuntimeAuth(options) {
    // A missing runtime means a direct helper call, not the configured pipeline default.
    return Boolean(options?.apiKey) || (options?.runtime ?? 'claude') !== 'claude';
}
/**
 * Extract JSON object from text, handling nested braces correctly.
 * Starts from the given position and returns the balanced JSON object.
 */
function extractBalancedJson(text, startIndex) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = startIndex; i < text.length; i++) {
        const char = text[i];
        if (escape) {
            escape = false;
            continue;
        }
        if (char === '\\' && inString) {
            escape = true;
            continue;
        }
        if (char === '"') {
            inString = !inString;
            continue;
        }
        if (inString)
            continue;
        if (char === '{')
            depth++;
        if (char === '}') {
            depth--;
            if (depth === 0) {
                return text.slice(startIndex, i + 1);
            }
        }
    }
    return null;
}
/**
 * Extract findings JSON from model output text.
 * Handles markdown code fences, prose before JSON, and nested objects.
 */
function extractFindingsJson(rawText) {
    const text = rawText.trim();
    // Find the start of the findings JSON object
    const findingsMatch = text.match(FINDINGS_JSON_START);
    if (!findingsMatch || findingsMatch.index === undefined) {
        return {
            success: false,
            error: 'no_findings_json',
            preview: text.slice(0, 200),
        };
    }
    const findingsStart = findingsMatch.index;
    // Extract the balanced JSON object
    const jsonStr = extractBalancedJson(text, findingsStart);
    if (!jsonStr) {
        return {
            success: false,
            error: 'unbalanced_json',
            preview: text.slice(findingsStart, findingsStart + 200),
        };
    }
    // Parse the JSON
    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    }
    catch {
        return {
            success: false,
            error: 'invalid_json',
            preview: jsonStr.slice(0, 200),
        };
    }
    // Validate structure
    if (typeof parsed !== 'object' || parsed === null || !('findings' in parsed)) {
        return {
            success: false,
            error: 'missing_findings_key',
            preview: jsonStr.slice(0, 200),
        };
    }
    const findings = parsed.findings;
    if (!Array.isArray(findings)) {
        return {
            success: false,
            error: 'findings_not_array',
            preview: jsonStr.slice(0, 200),
        };
    }
    return { success: true, findings };
}
/** Max characters to send to LLM fallback (roughly ~8k tokens) */
const LLM_FALLBACK_MAX_CHARS = 32000;
/** Max tokens for LLM fallback responses */
const LLM_FALLBACK_MAX_TOKENS = 4096;
/** Timeout for LLM fallback API calls in milliseconds */
const LLM_FALLBACK_TIMEOUT_MS = 30000;
/**
 * Truncate text for LLM fallback while preserving the findings JSON.
 *
 * Caller must ensure findings JSON exists in the text before calling.
 */
function truncateForLLMFallback(rawText, maxChars) {
    if (rawText.length <= maxChars) {
        return rawText;
    }
    const findingsIndex = rawText.match(FINDINGS_JSON_START)?.index ?? -1;
    // If findings starts within our budget, simple truncation from start preserves it
    if (findingsIndex < maxChars - 20) {
        return rawText.slice(0, maxChars) + '\n[... truncated]';
    }
    // Findings is beyond our budget - skip to just before it
    // Keep minimal context (10% of budget or 200 chars, whichever is smaller)
    const markerOverhead = 40;
    const usableBudget = maxChars - markerOverhead;
    const contextBefore = Math.min(200, Math.floor(usableBudget * 0.1), findingsIndex);
    const startIndex = findingsIndex - contextBefore;
    const endIndex = startIndex + usableBudget;
    const truncatedContent = rawText.slice(startIndex, endIndex);
    const suffix = endIndex < rawText.length ? '\n[... truncated]' : '';
    return '[... truncated ...]\n' + truncatedContent + suffix;
}
/**
 * Extract findings from malformed output using LLM as a fallback.
 * Uses the configured auxiliary runtime for lightweight, structured extraction.
 */
async function extractFindingsWithLLM(rawText, apiKeyOrOptions, maxRetries) {
    const options = typeof apiKeyOrOptions === 'object'
        ? apiKeyOrOptions
        : { apiKey: apiKeyOrOptions, maxRetries };
    const { apiKey, runtime, model } = options;
    const runtimeName = runtime ?? 'claude';
    if (!extract_canUseRuntimeAuth(options)) {
        return {
            success: false,
            error: 'no_api_key_for_fallback',
            preview: rawText.slice(0, 200),
        };
    }
    // If no findings anchor exists, there's nothing to extract
    if (!FINDINGS_JSON_START.test(rawText)) {
        return {
            success: false,
            error: 'no_findings_to_extract',
            preview: rawText.slice(0, 200),
        };
    }
    // Truncate input while preserving JSON boundaries
    const truncatedText = truncateForLLMFallback(rawText, LLM_FALLBACK_MAX_CHARS);
    const userContent = prompt_sections_joinPromptSections([
        `<task>
Extract the findings JSON from this model output.
</task>`,
        prompt_sections_buildJsonOutputSection(`Return this shape: {"findings": [...]}
If no findings exist, return: {"findings": []}`),
        prompt_sections_buildTaggedSection('model_output', truncatedText),
    ]);
    const result = await runtimes_getRuntime(runtimeName).runAuxiliary({
        task: 'extraction',
        agentName: options.agentName,
        apiKey,
        prompt: userContent,
        schema: external.object({ findings: external.array(external.unknown()) }),
        model,
        maxTokens: LLM_FALLBACK_MAX_TOKENS,
        timeout: LLM_FALLBACK_TIMEOUT_MS,
        maxRetries: options.maxRetries,
    });
    if (!result.success) {
        return {
            success: false,
            error: `llm_extraction_failed: ${result.error}`,
            preview: rawText.slice(0, 200),
            usage: result.usage,
        };
    }
    return {
        success: true,
        findings: result.data.findings,
        usage: result.usage,
    };
}
/** Unambiguous uppercase alphanumeric alphabet (no O/0, I/1). */
const SHORT_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Length of each generated short ID (before formatting). */
const SHORT_ID_LENGTH = 6;
/**
 * Generate a short human-readable ID for a finding.
 * Format: XXX-XXX (e.g., K7M-X9P)
 */
function generateShortId() {
    const raw = (0,nanoid/* customAlphabet */.d_)(SHORT_ID_ALPHABET, SHORT_ID_LENGTH)();
    return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}
/**
 * Validate and normalize findings from extracted JSON.
 * Replaces the LLM-provided ID with a short nanoid for stable cross-referencing.
 */
function validateFindings(findings, filename) {
    const validated = [];
    for (const f of findings) {
        // Normalize location path before validation
        if (typeof f === 'object' && f !== null && 'location' in f) {
            const loc = f['location'];
            if (loc && typeof loc === 'object') {
                loc['path'] = filename;
            }
        }
        const result = types/* FindingSchema */.p_.safeParse(f);
        if (result.success) {
            validated.push({
                ...result.data,
                id: generateShortId(),
                location: result.data.location ? { ...result.data.location, path: filename } : undefined,
            });
        }
    }
    return validated;
}
/**
 * Deduplicate findings by title and location.
 */
function deduplicateFindings(findings, onFindingProcessing) {
    const seen = new Map();
    return findings.filter((f) => {
        const key = `${f.title}:${f.location?.path}:${f.location?.startLine}`;
        const kept = seen.get(key);
        if (kept) {
            onFindingProcessing?.({
                stage: 'dedupe',
                action: 'dropped',
                finding: f,
                replacement: kept,
                reason: 'duplicate title and location',
            });
            return false;
        }
        seen.set(key, f);
        return true;
    });
}
// ---------------------------------------------------------------------------
// Cross-location merging
// ---------------------------------------------------------------------------
function locationKey(loc) {
    return `${loc.path}:${loc.startLine}:${loc.endLine ?? ''}`;
}
/**
 * Merge locations from loser findings into the winner.
 * Each loser's primary location and any existing additionalLocations are
 * appended to winner.additionalLocations (deduplicated).
 *
 * @param sortedGroup - Findings sorted by priority (winner first, losers after).
 * @returns A shallow copy of the winner with merged locations, or undefined if empty.
 */
function mergeGroupLocations(sortedGroup) {
    const winner = sortedGroup[0];
    if (!winner)
        return undefined;
    const losers = sortedGroup.slice(1);
    if (losers.length === 0)
        return winner;
    const extraLocations = winner.additionalLocations
        ? [...winner.additionalLocations]
        : [];
    for (const loser of losers) {
        if (loser.location) {
            extraLocations.push(loser.location);
        }
        if (loser.additionalLocations) {
            extraLocations.push(...loser.additionalLocations);
        }
    }
    if (extraLocations.length === 0)
        return winner;
    // Deduplicate by path:startLine:endLine, seeding with winner's primary location
    const seen = new Set();
    if (winner.location) {
        seen.add(locationKey(winner.location));
    }
    const uniqueLocations = extraLocations.filter((loc) => {
        const key = locationKey(loc);
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
    return { ...winner, additionalLocations: uniqueLocations };
}
/**
 * Apply LLM-returned merge groups to a list of findings.
 *
 * For each group, the highest-priority finding becomes the winner, and all
 * other findings' locations are folded into its additionalLocations.
 * Handles overlapping groups by substituting prior replacements and tracking
 * absorbed findings by their original identity.
 *
 * @param indexedFindings - The findings referenced by the 1-based group indices.
 * @param groups - Arrays of 1-based indices grouping findings by shared root cause.
 */
function applyMergeGroups(indexedFindings, groups) {
    const absorbed = new Set();
    const replacements = new Map();
    for (const group of groups) {
        const uniqueIndices = [...new Set(group)];
        if (uniqueIndices.length < 2)
            continue;
        const groupFindings = uniqueIndices
            .map((idx) => indexedFindings[idx - 1])
            .filter((f) => f !== undefined && !absorbed.has(f));
        if (groupFindings.length < 2)
            continue;
        // Sort to determine winner, then substitute any prior replacements
        // so that locations accumulated from earlier groups carry forward.
        const sorted = [...groupFindings].sort(types/* compareFindingPriority */.Lx);
        const winner = sorted[0];
        if (!winner)
            continue;
        for (let i = 0; i < sorted.length; i++) {
            const f = sorted[i];
            if (!f)
                continue;
            const existing = replacements.get(f);
            if (existing)
                sorted[i] = existing;
        }
        const merged = mergeGroupLocations(sorted);
        if (merged) {
            replacements.set(winner, merged);
        }
        for (const f of groupFindings) {
            if (f !== winner) {
                absorbed.add(f);
            }
        }
    }
    return { absorbed, replacements };
}
function sameLocation(a, b) {
    return Boolean(a && b && locationKey(a) === locationKey(b));
}
function findReplacementForAbsorbed(finding, replacements) {
    for (const replacement of replacements.values()) {
        if (replacement.additionalLocations?.some((loc) => sameLocation(loc, finding.location))) {
            return replacement;
        }
    }
    return undefined;
}
/** Schema for LLM merge response: groups of finding indices sharing a root cause. */
const MergeGroupsSchema = external.array(external.array(external.number().int()));
/**
 * Read a code snippet from disk around a given line.
 * Returns empty string on any I/O error.
 */
function readSnippet(repoPath, filePath, startLine, contextLines = 3) {
    try {
        const fullPath = (0,external_node_path_.join)(repoPath, filePath);
        const content = (0,external_node_fs_.readFileSync)(fullPath, 'utf-8');
        const lines = content.split('\n');
        const start = Math.max(0, startLine - 1 - contextLines);
        const end = Math.min(lines.length, startLine - 1 + contextLines + 1);
        return lines.slice(start, end).join('\n');
    }
    catch {
        return '';
    }
}
/**
 * Merge findings that describe the same issue across different code locations.
 *
 * Uses the configured auxiliary runtime to identify groups of findings about
 * the same root cause at different locations. For each group, the
 * highest-priority finding becomes the primary; other locations move to
 * `additionalLocations`.
 *
 * Skips entirely (no LLM call) when:
 * - Fewer than 2 findings have locations
 * - Claude runtime is selected and no API key is provided
 */
async function mergeCrossLocationFindings(findings, options) {
    const apiKey = options?.apiKey;
    const repoPath = options?.repoPath ?? '.';
    // Early exit: need at least 2 located findings to merge
    const withLocations = findings.filter((f) => f.location);
    if (withLocations.length < 2 || !extract_canUseRuntimeAuth(options)) {
        return { findings, mergedCount: 0 };
    }
    const findingDescriptions = formatIndexedFindingsForPrompt(withLocations, {
        locationStyle: 'range',
        snippet: (finding) => {
            const loc = finding.location;
            return loc ? readSnippet(repoPath, loc.path, loc.startLine) : undefined;
        },
    });
    const prompt = prompt_sections_joinPromptSections([
        `<task>
Identify which of these code review findings describe the SAME underlying issue appearing at different locations. Group them by shared root cause.
</task>`,
        `<findings>
${findingDescriptions}
</findings>`,
        prompt_sections_buildJsonOutputSection(`Return a JSON array of arrays, where each inner array contains the 1-based indices of findings about the same issue.
Singletons should not appear. Return [] if no findings describe the same issue.`),
    ]);
    const result = await runtimes_getRuntime(options?.runtime ?? 'claude').runSynthesis({
        task: 'consolidation',
        agentName: options?.agentName,
        apiKey,
        prompt,
        schema: MergeGroupsSchema,
        model: options?.model,
        maxTokens: 512,
        maxRetries: options?.maxRetries,
    });
    if (!result.success) {
        return { findings, mergedCount: 0, usage: result.usage };
    }
    const { absorbed, replacements } = applyMergeGroups(withLocations, result.data);
    if (absorbed.size === 0) {
        return { findings, mergedCount: 0, usage: result.usage };
    }
    for (const finding of absorbed) {
        options?.onFindingProcessing?.({
            stage: 'merge',
            action: 'merged',
            finding,
            replacement: findReplacementForAbsorbed(finding, replacements),
            reason: 'same root cause at another location',
        });
    }
    const merged = findings
        .filter((f) => !absorbed.has(f))
        .map((f) => replacements.get(f) ?? f);
    return { findings: merged, mergedCount: absorbed.size, usage: result.usage };
}

;// CONCATENATED MODULE: ./src/output/dedup.ts






/**
 * Generate a short content hash from title and description.
 * Used for exact-match deduplication.
 */
function generateContentHash(title, description) {
    const content = `${title}\n${description}`;
    return (0,external_node_crypto_.createHash)('sha256').update(content).digest('hex').slice(0, 8);
}
/**
 * Generate the marker HTML comment to embed in comment body.
 * Format: <!-- warden:v1:{path}:{line}:{contentHash} -->
 */
function generateMarker(path, line, contentHash) {
    return `<!-- warden:v1:${path}:${line}:${contentHash} -->`;
}
/**
 * Parse a Warden marker from a comment body.
 * Returns null if no valid marker is found.
 */
function parseMarker(body) {
    const match = body.match(/<!-- warden:v1:([^:]+):(\d+):([a-f0-9]+) -->/);
    if (!match || match.length < 4) {
        return null;
    }
    const path = match[1];
    const lineStr = match[2];
    const contentHash = match[3];
    // Validate that all capture groups exist (defensive, should always be true when regex matches)
    if (!path || !lineStr || !contentHash) {
        return null;
    }
    return {
        path,
        line: parseInt(lineStr, 10),
        contentHash,
    };
}
/**
 * Parse title and description from a Warden comment body.
 * Expected format: **:emoji: Title**\n\nDescription or **Title**\n\nDescription
 * Strips legacy [ID] prefix from titles for backward compat.
 */
function parseWardenComment(body) {
    // Match the title pattern: **:emoji: Title** or **Title**
    // Use non-greedy match to handle titles containing asterisks
    const titleMatch = body.match(/\*\*(?::[a-z_]+:\s*)?(.+?)\*\*/);
    if (!titleMatch || !titleMatch[1]) {
        return null;
    }
    // Strip legacy [ID] prefix (e.g., "[2K5-29B] Title" → "Title")
    const title = titleMatch[1].replace(/^\[[A-Z0-9-]+\]\s*/, '').trim();
    // Get the description - everything after the title until the first ---
    const titleEnd = body.indexOf('**', body.indexOf('**') + 2) + 2;
    const separatorIndex = body.indexOf('---');
    const descEnd = separatorIndex > -1 ? separatorIndex : body.length;
    const description = body.slice(titleEnd, descEnd).trim();
    return { title, description };
}
/**
 * Parse the finding ID from a Warden comment's attribution or legacy title.
 */
function parseWardenFindingId(body) {
    const attributionMatch = body.match(/(?:<sub>)?Identified by Warden (?!via\s)([^<\n\r]*)(?:<\/sub>|$)/m);
    if (attributionMatch?.[1]) {
        const idMatch = attributionMatch[1].match(/·\s*(?:`([^`]+)`|([^`\n\r]+))/);
        const id = (idMatch?.[1] ?? idMatch?.[2])?.trim();
        if (id)
            return id;
    }
    const titleMatch = body.match(/\*\*(?::[a-z_]+:\s*)?\[([^\]]+)\]\s*.+?\*\*/);
    return titleMatch?.[1]?.trim() || undefined;
}
/**
 * Check if a comment body is a Warden-generated comment.
 * Supports current muted format (<sub>Identified by Warden skill</sub>), and
 * legacy formats: backtick (Identified by Warden `skill`), bracket
 * (<sub>Identified by Warden [skill]</sub>), via
 * (<sub>Identified by Warden via `skill`</sub>), old
 * (<sub>warden: skill</sub>).
 */
function isWardenComment(body) {
    return (body.includes('<sub>Identified by Warden ') ||
        body.includes('Identified by Warden `') ||
        body.includes('<sub>warden:') ||
        body.includes('<!-- warden:v1:'));
}
function parsePlainSkillList(value) {
    return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}
/**
 * Parse skill names from a Warden comment's attribution line.
 * Supports five formats:
 * - Current: "<sub>Identified by Warden skill1, skill2 · id</sub>"
 * - Legacy backtick: "Identified by Warden `skill1`, `skill2` · id"
 * - Legacy bracket: "<sub>Identified by Warden [skill1], [skill2] · id</sub>"
 * - Legacy via: "<sub>Identified by Warden via `skill1`, `skill2` · severity</sub>"
 * - Legacy old: "<sub>warden: skill1, skill2</sub>"
 */
function parseWardenSkills(body) {
    // Try current muted format: <sub>Identified by Warden skill1, skill2 · id</sub>
    const plainSubMatch = body.match(/<sub>Identified by Warden (?!via\s)([^`[\]<]+?)(?:\s*·|<\/sub>)/);
    if (plainSubMatch?.[1]) {
        const skills = parsePlainSkillList(plainSubMatch[1]);
        if (skills.length > 0)
            return skills;
    }
    // Try legacy backtick format (no "via"): Identified by Warden `skill1`, `skill2` · id
    const backtickMatch = body.match(/Identified by Warden ((?:`[^`]+`(?:, )?)+)/);
    if (backtickMatch?.[1]) {
        const skills = [...backtickMatch[1].matchAll(/`([^`]+)`/g)]
            .map((m) => m[1])
            .filter((s) => s !== undefined);
        if (skills.length > 0)
            return skills;
    }
    // Try legacy bracket format: <sub>Identified by Warden [skill1], [skill2] · id</sub>
    const bracketMatch = body.match(/<sub>Identified by Warden ((?:\[[^\]]+\](?:, )?)+)/);
    if (bracketMatch?.[1]) {
        const skills = [...bracketMatch[1].matchAll(/\[([^\]]+)\]/g)]
            .map((m) => m[1])
            .filter((s) => s !== undefined);
        if (skills.length > 0)
            return skills;
    }
    // Try legacy via format: <sub>Identified by Warden via `skill1`, `skill2` · severity</sub>
    const viaMatch = body.match(/<sub>Identified by Warden via ([^·<]+)/);
    if (viaMatch?.[1]) {
        const skills = [...viaMatch[1].matchAll(/`([^`]+)`/g)]
            .map((m) => m[1])
            .filter((s) => s !== undefined);
        if (skills.length > 0)
            return skills;
    }
    // Fall back to legacy old format: <sub>warden: skill1, skill2</sub>
    const oldMatch = body.match(/<sub>warden:\s*([^<]+)<\/sub>/);
    if (!oldMatch?.[1]) {
        return [];
    }
    return oldMatch[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}
/**
 * Update a Warden comment body to add a new skill to the attribution.
 * Current format: Changes "<sub>Identified by Warden skill1 · id</sub>"
 *                 to "<sub>Identified by Warden skill1, skill2 · id</sub>"
 * Legacy backtick: Changes "Identified by Warden `skill1` · id"
 *                  to "Identified by Warden `skill1`, `skill2` · id"
 * Legacy bracket: Changes "<sub>Identified by Warden [skill1] · id</sub>"
 *                 to "<sub>Identified by Warden [skill1], [skill2] · id</sub>"
 * Legacy via: Changes "<sub>Identified by Warden via `skill1` · severity</sub>"
 *             to "<sub>Identified by Warden via `skill1`, `skill2` · severity</sub>"
 * Legacy old: Changes "<sub>warden: skill1</sub>" to "<sub>warden: skill1, skill2</sub>"
 * Returns null if skill is already listed or if no attribution tag exists.
 */
function updateWardenCommentBody(body, newSkill) {
    const existingSkills = parseWardenSkills(body);
    // If no existing attribution tag exists, we can't update it
    if (existingSkills.length === 0) {
        return null;
    }
    // Don't update if skill already listed
    if (existingSkills.includes(newSkill)) {
        return null;
    }
    // Check if it's the current muted format: <sub>Identified by Warden skill · id</sub>
    const plainSubFormatMatch = body.match(/<sub>Identified by Warden (?!via\s)[^`[\]<]+<\/sub>/);
    if (plainSubFormatMatch) {
        const allSkills = [...existingSkills, newSkill].join(', ');
        const subTagMatch = body.match(/<sub>Identified by Warden (?!via\s)([^<]*?)(\s*·[^<]*)?<\/sub>/);
        const suffix = subTagMatch?.[2] || '';
        return body.replace(/<sub>Identified by Warden (?!via\s)[^<]+<\/sub>/, () => `<sub>Identified by Warden ${allSkills}${suffix}</sub>`);
    }
    // Check if it's the legacy backtick format (no <sub>, no "via"): Identified by Warden `skill` · id
    const backtickFormatMatch = body.match(/Identified by Warden `[^`]+`/) && !body.includes('<sub>Identified by Warden');
    if (backtickFormatMatch) {
        const existingSkillsFormatted = existingSkills.map((s) => `\`${s}\``).join(', ');
        const lineMatch = body.match(/Identified by Warden ((?:`[^`]+`(?:, )?)+)(.*)/);
        const suffix = lineMatch?.[2] || '';
        return body.replace(/Identified by Warden (?:`[^`]+`(?:, )?)+.*/, () => `Identified by Warden ${existingSkillsFormatted}, \`${newSkill}\`${suffix}`);
    }
    // Check if it's the legacy bracket format: <sub>Identified by Warden [skill] · id</sub>
    const bracketFormatMatch = body.match(/<sub>Identified by Warden \[[^\]]+\]/);
    if (bracketFormatMatch) {
        const existingSkillsFormatted = existingSkills.map((s) => `[${s}]`).join(', ');
        const subTagMatch = body.match(/<sub>Identified by Warden ((?:\[[^\]]+\](?:, )?)+)(.*?)<\/sub>/);
        const suffix = subTagMatch?.[2] || '';
        return body.replace(/<sub>Identified by Warden [^<]+<\/sub>/, () => `<sub>Identified by Warden ${existingSkillsFormatted}, [${newSkill}]${suffix}</sub>`);
    }
    // Check if it's the legacy via format
    const viaFormatMatch = body.match(/<sub>Identified by Warden via `[^`]+`/);
    if (viaFormatMatch) {
        const existingSkillsFormatted = existingSkills.map((s) => `\`${s}\``).join(', ');
        // Extract the suffix (metadata) starting from the · separator, not from the skill list
        const subTagMatch = body.match(/<sub>Identified by Warden via ([^<]+)<\/sub>/);
        const fullContent = subTagMatch?.[1] || '';
        const separatorIndex = fullContent.indexOf(' · ');
        const suffix = separatorIndex >= 0 ? fullContent.slice(separatorIndex) : '';
        return body.replace(/<sub>Identified by Warden via [^<]+<\/sub>/, () => `<sub>Identified by Warden via ${existingSkillsFormatted}, \`${newSkill}\`${suffix}</sub>`);
    }
    // Legacy old format: <sub>warden: skill1, skill2</sub>
    const allSkills = [...existingSkills, newSkill].join(', ');
    // Use a replacer function to avoid special $ character interpretation in skill names
    return body.replace(/<sub>warden:\s*[^<]+<\/sub>/, () => `<sub>warden: ${allSkills}</sub>`);
}
const REVIEW_THREADS_QUERY = `
  query($owner: String!, $repo: String!, $prNumber: Int!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $prNumber) {
        reviewThreads(first: 100, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            isResolved
            comments(first: 1) {
              nodes {
                id
                databaseId
                body
                path
                line
                originalLine
              }
            }
          }
        }
      }
    }
  }
`;
/**
 * Fetch all existing review comments for a PR (both Warden and external).
 * Uses GraphQL to get thread IDs for stale comment resolution and node IDs for reactions.
 */
async function fetchExistingComments(octokit, owner, repo, prNumber) {
    const comments = [];
    // Use GraphQL to get thread IDs along with comment data
    let cursor = null;
    let hasNextPage = true;
    while (hasNextPage) {
        const response = await octokit.graphql(REVIEW_THREADS_QUERY, {
            owner,
            repo,
            prNumber,
            cursor,
        });
        const pullRequest = response.repository?.pullRequest;
        if (!pullRequest) {
            // PR doesn't exist or was deleted
            return comments;
        }
        const threads = pullRequest.reviewThreads;
        for (const thread of threads.nodes) {
            // Get the first comment in the thread
            const firstComment = thread.comments.nodes[0];
            if (!firstComment) {
                continue;
            }
            const isWarden = isWardenComment(firstComment.body);
            const marker = isWarden ? parseMarker(firstComment.body) : null;
            const parsed = parseWardenComment(firstComment.body);
            // For Warden comments, we need parsed title/description
            // For external comments, we extract what we can or use body as description
            const title = parsed?.title ?? '';
            const description = parsed?.description ?? firstComment.body.slice(0, 500);
            comments.push({
                id: firstComment.databaseId,
                path: marker?.path ?? firstComment.path,
                line: marker?.line ?? firstComment.line ?? firstComment.originalLine ?? 0,
                title,
                description,
                findingId: isWarden ? parseWardenFindingId(firstComment.body) : undefined,
                contentHash: marker?.contentHash ?? generateContentHash(title, description),
                threadId: thread.id,
                isResolved: thread.isResolved,
                isWarden,
                skills: isWarden ? parseWardenSkills(firstComment.body) : undefined,
                body: firstComment.body,
                commentNodeId: firstComment.id,
            });
        }
        hasNextPage = threads.pageInfo.hasNextPage;
        cursor = threads.pageInfo.endCursor;
    }
    return comments;
}
/**
 * @deprecated Use fetchExistingComments instead
 */
async function fetchExistingWardenComments(octokit, owner, repo, prNumber) {
    const allComments = await fetchExistingComments(octokit, owner, repo, prNumber);
    return allComments.filter((c) => c.isWarden);
}
/** Schema for validating LLM deduplication response with matched indices */
const DuplicateMatchesSchema = external.array(external.object({
    findingIndex: external.number().int(),
    existingIndex: external.number().int(),
}));
/**
 * Use LLM to identify which findings are semantic duplicates of existing comments.
 * Returns a Map of finding ID to matched ExistingComment, plus usage stats.
 */
async function findSemanticDuplicates(findings, existingComments, apiKey, options = {}) {
    if (findings.length === 0 || existingComments.length === 0) {
        return { matches: new Map() };
    }
    const existingList = existingComments
        .map((c, i) => `${i + 1}. [${c.path}:${c.line}] "${c.title}" - ${c.description}`)
        .join('\n');
    const findingsList = formatIndexedFindingsForPrompt(findings);
    const prompt = prompt_sections_joinPromptSections([
        `<task>
Compare these code review findings and identify duplicates.
</task>`,
        `<existing_comments>
${existingList}
</existing_comments>`,
        `<new_findings>
${findingsList}
</new_findings>`,
        `<deduplication_rules>
Return a JSON array of objects identifying which findings are DUPLICATES of which existing comments.
Only mark as duplicate if they describe the SAME issue at the SAME location (within a few lines).
Different issues at the same location are NOT duplicates.
</deduplication_rules>`,
        prompt_sections_buildJsonOutputSection(`[{"findingIndex": 1, "existingIndex": 2}]
where findingIndex is the 1-based index of the new finding and existingIndex is the 1-based index of the matching existing comment.
Return [] if none are duplicates.`),
    ]);
    const result = await runtimes_getRuntime(options.runtime ?? 'claude').runAuxiliary({
        task: 'deduplication',
        agentName: options.currentSkill,
        apiKey,
        prompt,
        schema: DuplicateMatchesSchema,
        model: options.model,
        maxTokens: 512,
        maxRetries: options.maxRetries,
    });
    if (!result.success) {
        console.warn(`LLM deduplication failed, falling back to hash-only: ${result.error}`);
        return { matches: new Map(), usage: result.usage };
    }
    const matches = new Map();
    for (const match of result.data) {
        const finding = findings[match.findingIndex - 1];
        const existing = existingComments[match.existingIndex - 1];
        if (finding && existing) {
            matches.set(finding.id, existing);
        }
    }
    return { matches, usage: result.usage };
}
const ADD_REACTION_MUTATION = `
  mutation($subjectId: ID!, $content: ReactionContent!) {
    addReaction(input: { subjectId: $subjectId, content: $content }) {
      reaction {
        content
      }
    }
  }
`;
/**
 * Update an existing Warden PR review comment via REST API.
 */
async function updateWardenComment(octokit, owner, repo, commentId, newBody) {
    await octokit.pulls.updateReviewComment({
        owner,
        repo,
        comment_id: commentId,
        body: newBody,
    });
}
/**
 * Add a reaction to an existing PR review comment.
 * Uses GraphQL to handle review comments.
 */
async function addReactionToComment(octokit, commentNodeId, reaction = 'EYES') {
    await octokit.graphql(ADD_REACTION_MUTATION, {
        subjectId: commentNodeId,
        content: reaction,
    });
}
/**
 * Process duplicate actions - update Warden comments and add reactions.
 * Returns counts of actions taken for logging.
 */
async function processDuplicateActions(octokit, owner, repo, actions, currentSkill) {
    let updated = 0;
    let reacted = 0;
    let skipped = 0;
    let failed = 0;
    for (const action of actions) {
        try {
            if (action.type === 'update_warden') {
                if (!action.existingComment.body) {
                    skipped++;
                    continue;
                }
                const newBody = updateWardenCommentBody(action.existingComment.body, currentSkill);
                // Only update if body actually changed (skill wasn't already listed)
                if (newBody) {
                    await updateWardenComment(octokit, owner, repo, action.existingComment.id, newBody);
                    // Update in-memory body so subsequent triggers see the updated content
                    action.existingComment.body = newBody;
                    updated++;
                }
                else {
                    skipped++;
                }
            }
            else if (action.type === 'react_external') {
                if (!action.existingComment.commentNodeId) {
                    skipped++;
                    continue;
                }
                await addReactionToComment(octokit, action.existingComment.commentNodeId);
                reacted++;
            }
        }
        catch (error) {
            console.warn(`Failed to process duplicate action for ${action.finding.title}: ${error}`);
            failed++;
        }
    }
    return { updated, reacted, skipped, failed };
}
/**
 * Convert a Finding to an ExistingComment for cross-trigger deduplication.
 * Returns null if the finding has no location.
 */
function findingToExistingComment(finding, skill) {
    if (!finding.location) {
        return null;
    }
    return {
        id: -1, // Newly posted comments don't have IDs yet
        path: finding.location.path,
        line: finding.location.endLine ?? finding.location.startLine,
        title: finding.title,
        description: finding.description,
        findingId: finding.id,
        contentHash: generateContentHash(finding.title, finding.description),
        isWarden: true,
        skills: skill ? [skill] : [],
    };
}
// -----------------------------------------------------------------------------
// Intra-batch consolidation
// -----------------------------------------------------------------------------
const PROXIMITY_THRESHOLD = 5;
/** Schema for LLM consolidation response: groups of finding indices that share a root cause. */
const ConsolidationGroupsSchema = external.array(external.array(external.number().int()));
/**
 * Group findings by file path, then identify clusters where findings are within
 * PROXIMITY_THRESHOLD lines of each other. Returns only clusters with 2+ findings.
 */
function findProximityClusters(findings) {
    // Group by file path
    const byPath = new Map();
    for (const f of findings) {
        const path = f.location?.path ?? '';
        const existing = byPath.get(path);
        if (existing) {
            existing.push(f);
        }
        else {
            byPath.set(path, [f]);
        }
    }
    const clusters = [];
    for (const group of byPath.values()) {
        if (group.length < 2)
            continue;
        // Sort by line number
        const sorted = [...group].sort((a, b) => (0,types/* findingLine */.mC)(a) - (0,types/* findingLine */.mC)(b));
        // Single-linkage clustering: consecutive findings within PROXIMITY_THRESHOLD
        // lines of each other are grouped together.
        const first = sorted[0];
        if (!first)
            continue;
        let current = [first];
        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            if (!prev || !curr)
                continue;
            if ((0,types/* findingLine */.mC)(curr) - (0,types/* findingLine */.mC)(prev) <= PROXIMITY_THRESHOLD) {
                current.push(curr);
            }
            else {
                if (current.length >= 2)
                    clusters.push(current);
                current = [curr];
            }
        }
        if (current.length >= 2)
            clusters.push(current);
    }
    return clusters;
}
/**
 * Consolidate findings within a single batch to remove duplicates that describe
 * the same root cause. Three-phase approach:
 *
 * 1. Hash dedup: remove exact duplicates (same path:line:contentHash)
 * 2. Proximity grouping: identify clusters of findings within 5 lines of each other
 * 3. LLM consolidation: ask the auxiliary runtime to group findings by root cause (only when proximity matches exist)
 *
 * For each group, keeps the highest-severity finding.
 */
async function consolidateBatchFindings(findings, options = {}) {
    if (findings.length <= 1) {
        return { findings, removedCount: 0 };
    }
    // Phase 1: Hash dedup within batch
    const seen = new Set();
    const hashDeduped = [];
    for (const f of findings) {
        const hash = generateContentHash(f.title, f.description);
        const line = (0,types/* findingLine */.mC)(f);
        const path = f.location?.path ?? '';
        const key = `${path}:${line}:${hash}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        hashDeduped.push(f);
    }
    const hashRemovedCount = findings.length - hashDeduped.length;
    if (hashRemovedCount > 0) {
        console.log(`Consolidate: ${hashRemovedCount} exact duplicate findings removed within batch`);
    }
    // Phase 2: Proximity grouping
    const clusters = findProximityClusters(hashDeduped);
    // If no proximity clusters, hash-only mode, or no runtime auth, return hash-deduped results.
    if (clusters.length === 0 || options.hashOnly || !extract_canUseRuntimeAuth(options)) {
        return { findings: hashDeduped, removedCount: hashRemovedCount };
    }
    // Phase 3: LLM consolidation for proximity clusters
    // Only send clustered findings to the LLM (deduplicated across clusters)
    const clusteredList = [...new Set(clusters.flat())];
    const findingsList = formatIndexedFindingsForPrompt(clusteredList, {
        includeSeverity: true,
    });
    const prompt = prompt_sections_joinPromptSections([
        `<task>
Group findings that describe the SAME root cause or bug.
</task>`,
        `<findings>
${findingsList}
</findings>`,
        `<deduplication_rules>
Return a JSON array of arrays, where each inner array contains the 1-based indices of findings that describe the same root cause.
Only group findings that are truly about the same underlying issue. Findings about different issues should NOT be grouped even if they're nearby.
Singletons (findings with no duplicates) should not appear in any group.
</deduplication_rules>`,
        prompt_sections_buildJsonOutputSection('Return the JSON array. Return [] if no findings share a root cause.'),
    ]);
    const result = await runtimes_getRuntime(options.runtime ?? 'claude').runAuxiliary({
        task: 'deduplication',
        agentName: options.agentName,
        apiKey: options.apiKey,
        prompt,
        schema: ConsolidationGroupsSchema,
        model: options.model,
        maxTokens: 512,
        maxRetries: options.maxRetries,
    });
    if (!result.success) {
        console.warn(`LLM batch consolidation failed, keeping all findings: ${result.error}`);
        return { findings: hashDeduped, removedCount: hashRemovedCount, usage: result.usage };
    }
    const { absorbed, replacements } = applyMergeGroups(clusteredList, result.data);
    if (absorbed.size === 0) {
        return { findings: hashDeduped, removedCount: hashRemovedCount, usage: result.usage };
    }
    const consolidated = hashDeduped
        .filter((f) => !absorbed.has(f))
        .map((f) => replacements.get(f) ?? f);
    const totalRemoved = hashRemovedCount + absorbed.size;
    console.log(`Consolidate: ${absorbed.size} findings merged by LLM (same root cause)`);
    return { findings: consolidated, removedCount: totalRemoved, usage: result.usage };
}
/**
 * Deduplicate findings against existing comments.
 * Returns non-duplicate findings and actions to take for duplicates.
 *
 * Deduplication is two-pass:
 * 1. Exact content hash match - instant match
 * 2. LLM semantic comparison for remaining findings (if API key provided)
 *
 * For duplicates:
 * - If matching a Warden comment: action to update attribution with new skill
 * - If matching an external comment: action to add reaction
 */
async function dedup_deduplicateFindings(findings, existingComments, options = {}) {
    if (findings.length === 0 || existingComments.length === 0) {
        return { newFindings: findings, duplicateActions: [] };
    }
    // Build maps of existing comments by location+hash for fast lookup
    const existingByKey = new Map();
    const wardenByKey = new Map();
    for (const c of existingComments) {
        const key = `${c.path}:${c.line}:${c.contentHash}`;
        existingByKey.set(key, c);
        if (c.isWarden) {
            wardenByKey.set(key, c);
        }
    }
    // First pass: find exact matches (same content at same location)
    const hashDedupedFindings = [];
    const duplicateActions = [];
    for (const finding of findings) {
        const hash = generateContentHash(finding.title, finding.description);
        const line = finding.location?.endLine ?? finding.location?.startLine ?? 0;
        const path = finding.location?.path ?? '';
        const key = `${path}:${line}:${hash}`;
        let matchingComment = existingByKey.get(key);
        // If no primary location match, check additional locations against our own comments.
        // This handles winner-flip scenarios where a merged finding's primary location changed
        // between runs but an additional location matches a previous Warden comment.
        if (!matchingComment && finding.additionalLocations) {
            for (const loc of finding.additionalLocations) {
                const addlLine = loc.endLine ?? loc.startLine;
                const addlKey = `${loc.path}:${addlLine}:${hash}`;
                const wardenMatch = wardenByKey.get(addlKey);
                if (wardenMatch) {
                    matchingComment = wardenMatch;
                    break;
                }
            }
        }
        if (matchingComment) {
            duplicateActions.push({
                type: matchingComment.isWarden ? 'update_warden' : 'react_external',
                finding,
                existingComment: matchingComment,
                matchType: 'hash',
            });
        }
        else {
            hashDedupedFindings.push(finding);
        }
    }
    if (duplicateActions.length > 0) {
        console.log(`Dedup: ${duplicateActions.length} findings matched by content hash`);
    }
    // If hash-only mode, no runtime auth, or no remaining findings, stop here.
    if (options.hashOnly || !extract_canUseRuntimeAuth(options) || hashDedupedFindings.length === 0) {
        return { newFindings: hashDedupedFindings, duplicateActions };
    }
    // Second pass: LLM semantic comparison for remaining findings
    const semanticResult = await findSemanticDuplicates(hashDedupedFindings, existingComments, options.apiKey, options);
    if (semanticResult.matches.size > 0) {
        console.log(`Dedup: ${semanticResult.matches.size} findings identified as semantic duplicates by LLM`);
    }
    const newFindings = [];
    for (const finding of hashDedupedFindings) {
        const matchingComment = semanticResult.matches.get(finding.id);
        if (matchingComment) {
            duplicateActions.push({
                type: matchingComment.isWarden ? 'update_warden' : 'react_external',
                finding,
                existingComment: matchingComment,
                matchType: 'semantic',
            });
        }
        else {
            newFindings.push(finding);
        }
    }
    return { newFindings, duplicateActions, dedupUsage: semanticResult.usage };
}

;// CONCATENATED MODULE: ./src/output/stale.ts

/**
 * Build the analyzed scope from file changes.
 */
function buildAnalyzedScope(fileChanges) {
    return {
        files: new Set(fileChanges.map((f) => f.filename)),
    };
}
/**
 * Check if a comment's file was in the analyzed scope.
 * Only comments on files that were analyzed should be considered for resolution.
 */
function isInAnalyzedScope(comment, scope) {
    return scope.files.has(comment.path);
}
/** Strip finding ID prefix like "[WRZ-XPL] " from a title */
function stripFindingIdPrefix(title) {
    return title.replace(/^\[[A-Z0-9]{3}-[A-Z0-9]{3}\]\s*/, '');
}
/**
 * Check if a single location matches a comment (same path, proximate line).
 */
function locationMatchesComment(location, comment) {
    if (location.path !== comment.path)
        return false;
    const line = location.endLine ?? location.startLine;
    return Math.abs(line - comment.line) <= 5;
}
/**
 * Check if a finding matches a comment (same location and similar content).
 * Checks both the primary location and any additional locations.
 */
function findingMatchesComment(finding, comment) {
    // Must have a location to match
    if (!finding.location) {
        return false;
    }
    // Check if any location (primary or additional) matches the comment path+line
    const locationMatches = locationMatchesComment(finding.location, comment) ||
        (finding.additionalLocations?.some((loc) => locationMatchesComment(loc, comment)) ?? false);
    if (!locationMatches) {
        return false;
    }
    // Check content hash for exact match
    const findingHash = generateContentHash(finding.title, finding.description);
    if (findingHash === comment.contentHash) {
        return true;
    }
    // If hashes don't match exactly, check if the title is similar enough
    // This handles cases where description might have minor changes
    // Strip ID prefix (e.g. "[WRZ-XPL] ") from comment titles before comparing
    const normalizedFindingTitle = finding.title.toLowerCase().trim();
    const normalizedCommentTitle = stripFindingIdPrefix(comment.title).toLowerCase().trim();
    return normalizedFindingTitle === normalizedCommentTitle;
}
/**
 * Find comments that no longer have matching findings (stale comments).
 * Only considers comments on files that were in the analyzed scope.
 */
function findStaleComments(existingComments, allFindings, scope) {
    const staleComments = [];
    for (const comment of existingComments) {
        // Skip comments that don't have thread IDs (can't resolve them)
        if (!comment.threadId) {
            continue;
        }
        // Skip already-resolved comments (nothing to do)
        if (comment.isResolved) {
            continue;
        }
        // Comments on files NOT in scope are orphaned (file renamed, reverted, etc.)
        if (!isInAnalyzedScope(comment, scope)) {
            staleComments.push(comment);
            continue;
        }
        // Check if any finding matches this comment
        const hasMatchingFinding = allFindings.some((finding) => findingMatchesComment(finding, comment));
        // If no matching finding, this comment is stale
        if (!hasMatchingFinding) {
            staleComments.push(comment);
        }
    }
    return staleComments;
}
const RESOLVE_THREAD_MUTATION = `
  mutation($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread {
        id
        isResolved
      }
    }
  }
`;
/** Maximum stale comments to resolve per run (matches default maxFindings) */
const MAX_STALE_RESOLUTIONS = 50;
/**
 * Resolve stale comment threads via GraphQL.
 * Returns the count and IDs of threads successfully resolved.
 * Limited to MAX_STALE_RESOLUTIONS per run as a safeguard.
 */
async function resolveStaleComments(octokit, staleComments) {
    const resolvedIds = new Set();
    const commentsToResolve = staleComments.slice(0, MAX_STALE_RESOLUTIONS);
    if (staleComments.length > MAX_STALE_RESOLUTIONS) {
        console.log(`Limiting stale comment resolution to ${MAX_STALE_RESOLUTIONS} of ${staleComments.length} comments`);
    }
    for (const comment of commentsToResolve) {
        if (!comment.threadId) {
            continue;
        }
        try {
            await octokit.graphql(RESOLVE_THREAD_MUTATION, {
                threadId: comment.threadId,
            });
            resolvedIds.add(comment.id);
        }
        catch (error) {
            const errorMessage = String(error);
            if (errorMessage.includes('Resource not accessible')) {
                // Permission error affects all threads; log once and stop trying
                console.warn(`Failed to resolve thread: GitHub App may need 'contents:write' permission. ` +
                    `See: https://github.com/orgs/community/discussions/44650`);
                break;
            }
            console.warn(`Failed to resolve thread for comment ${comment.id}: ${error}`);
        }
    }
    return { resolvedCount: resolvedIds.size, resolvedIds };
}

;// CONCATENATED MODULE: ./src/action/fix-evaluation/types.ts



const FixJudgeVerdictSchema = external.object({
    status: types/* FixStatusSchema */.$3,
    reasoning: external.string(),
});

;// CONCATENATED MODULE: ./src/cli/output/tty.ts

/**
 * Detect terminal capabilities.
 * @param colorOverride - Optional override for color support (--color / --no-color)
 */
function detectOutputMode(colorOverride) {
    // Check both stderr and stdout for TTY - some environments have TTY on one but not the other
    const streamIsTTY = (process.stderr.isTTY || process.stdout.isTTY) ?? false;
    // Treat dumb terminals as non-TTY (e.g., TERM=dumb used by some editors/agents)
    const term = process.env['TERM'] ?? '';
    const isDumbTerminal = term === 'dumb' || term === '';
    const isTTY = streamIsTTY && !isDumbTerminal;
    // Determine color support
    let supportsColor;
    if (colorOverride !== undefined) {
        supportsColor = colorOverride;
    }
    else if (process.env['NO_COLOR']) {
        supportsColor = false;
    }
    else if (process.env['FORCE_COLOR']) {
        supportsColor = true;
    }
    else {
        supportsColor = isTTY && chalk.level > 0;
    }
    // Configure chalk based on color support
    if (!supportsColor) {
        chalk.level = 0;
    }
    const columns = process.stderr.columns ?? process.stdout.columns ?? 80;
    return {
        isTTY,
        supportsColor,
        columns,
    };
}
/**
 * Get a timestamp for CI/non-TTY output.
 */
function timestamp() {
    return new Date().toISOString();
}
/**
 * Log a timestamped action message to stderr.
 * Used by action workflow steps (dedup, fix eval, stale resolution) for consistent output.
 */
function logAction(message) {
    console.error(`[${timestamp()}] warden: ${message}`);
}
/**
 * Log a timestamped warning to stderr.
 */
function warnAction(message) {
    console.error(`[${timestamp()}] warden: WARN: ${message}`);
}

;// CONCATENATED MODULE: ./src/action/fix-evaluation/github.ts

/**
 * Fetch the patches and commit messages between two commits.
 */
async function fetchFollowUpChanges(octokit, owner, repo, baseSha, headSha) {
    const { data } = await octokit.repos.compareCommits({
        owner,
        repo,
        base: baseSha,
        head: headSha,
    });
    const patches = new Map();
    for (const file of data.files ?? []) {
        if (file.patch) {
            patches.set(file.filename, file.patch);
        }
    }
    const commitMessages = [];
    for (const commit of data.commits ?? []) {
        if (commit.commit.message) {
            commitMessages.push(commit.commit.message);
        }
    }
    return { patches, commitMessages };
}
/**
 * Fetch file content at a specific commit SHA.
 */
async function fetchFileContent(octokit, owner, repo, path, sha) {
    const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: sha,
    });
    if (Array.isArray(data)) {
        throw new Error(`Path "${path}" is a directory, not a file`);
    }
    if (data.type !== 'file' || !data.content) {
        throw new Error(`Path "${path}" is not a file or content unavailable`);
    }
    return Buffer.from(data.content, 'base64').toString('utf-8');
}
/**
 * Fetch specific lines from a file at a commit.
 * startLine and endLine are 1-indexed and inclusive.
 */
async function fetchFileLines(octokit, owner, repo, path, sha, startLine, endLine) {
    const content = await fetchFileContent(octokit, owner, repo, path, sha);
    const lines = content.split('\n');
    return lines
        .slice(startLine - 1, endLine)
        .map((line, i) => `${startLine + i}: ${line}`)
        .join('\n');
}
const ADD_THREAD_REPLY_MUTATION = `
  mutation($threadId: ID!, $body: String!) {
    addPullRequestReviewThreadReply(input: {
      pullRequestReviewThreadId: $threadId,
      body: $body
    }) {
      comment {
        id
      }
    }
  }
`;
/**
 * Post a reply to a review thread.
 */
async function postThreadReply(octokit, threadId, body) {
    try {
        await octokit.graphql(ADD_THREAD_REPLY_MUTATION, {
            threadId,
            body,
        });
    }
    catch (error) {
        warnAction(`Failed to post thread reply: ${error}`);
        throw error;
    }
}
/**
 * Format a reply for a failed fix attempt.
 */
function formatFailedFixReply(commitSha, reasoning) {
    const shortSha = commitSha.slice(0, 7);
    return `**Fix attempt detected** (commit ${shortSha})

${reasoning}

The original issue appears unresolved. Please review and try again.

<sub>Evaluated by Warden</sub>`;
}

;// CONCATENATED MODULE: ./src/action/fix-evaluation/judge.ts






const TOOL_DEFINITIONS = [
    {
        name: 'get_file_diff',
        description: 'Get the unified diff showing what changed in a file between the two commits.',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'File path to get diff for' },
            },
            required: ['path'],
        },
    },
    {
        name: 'get_file_at_commit',
        description: 'Get file content at a specific commit. Use "before" for pre-fix state, "after" for post-fix state. Optionally specify line range.',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'File path to fetch' },
                commit: { type: 'string', enum: ['before', 'after'], description: 'before = pre-fix, after = post-fix' },
                startLine: { type: 'number', description: 'Start line (1-indexed, inclusive)' },
                endLine: { type: 'number', description: 'End line (1-indexed, inclusive)' },
            },
            required: ['path', 'commit'],
        },
    },
];
function buildPrompt(input) {
    const { comment, changedFiles, codeBeforeFix, codeAfterFix, commitMessages } = input;
    const afterCodeSection = codeAfterFix
        ? prompt_sections_buildTaggedSection('after_code', codeAfterFix)
        : undefined;
    const commitMessagesSection = commitMessages && commitMessages.length > 0
        ? prompt_sections_buildTaggedSection('developer_intent', [
            ...commitMessages.map((msg, i) => `${i + 1}. ${msg.split('\n')[0]}`),
            '',
            'Use these to help understand what the developer was trying to do. A commit mentioning "fix" or the issue topic suggests intent to address it.',
        ])
        : undefined;
    const investigationStrategy = codeAfterFix
        ? `Compare the BEFORE and AFTER code above to determine if the issue was fixed.
Use tools only if you need additional context:

- \`get_file_diff(path)\` - See unified diff of changes to a file
- \`get_file_at_commit(path, "before"|"after", startLine?, endLine?)\` - Read more file content if needed`
        : `Use tools to determine if the issue was fixed:

1. **Start with get_file_diff** on the issue's file (if changed) to see what was modified
2. **Use get_file_at_commit with "after"** to see the current state at the issue location
3. **Check related files** if the fix might involve changes elsewhere (imports, shared utilities, etc.)

Tools:
- \`get_file_diff(path)\` - See unified diff of changes to a file
- \`get_file_at_commit(path, "before"|"after", startLine?, endLine?)\` - Read file content at either commit`;
    return prompt_sections_joinPromptSections([
        `<task>
Judge whether a code change fixed a reported issue.
</task>`,
        `<key_question>
Does the reported issue still exist in the code after this commit?
</key_question>`,
        `<verdict_definitions>
Choose ONE verdict based on these criteria:

resolved - The issue NO LONGER EXISTS. Evidence:
- The problematic code was corrected (directly or via equivalent fix)
- The code was refactored in a way that eliminates the issue by design
- The problematic code was intentionally removed (file deleted, function removed, dead code cleaned up)

attempted_failed - A fix was CLEARLY ATTEMPTED but the issue PERSISTS. Evidence:
- Changes DIRECTLY modify the reported file at or near the issue location
- AND the changes appear specifically intended to address THIS issue
- BUT the core issue remains (wrong fix, incomplete fix, edge cases missed)
- Use this ONLY when there's clear evidence of intent to fix THIS specific issue
- Do NOT use for general refactoring, unrelated bug fixes, or changes to other files
- When in doubt between attempted_failed and not_attempted, prefer not_attempted

not_attempted - The issue was NOT ADDRESSED. Evidence:
- No changes to the problematic code or its logic
- Changes are unrelated (different feature, different bug, unrelated refactor)
- The reported code is identical or functionally unchanged
- Changes are in other files with no clear connection to the reported issue
</verdict_definitions>`,
        prompt_sections_buildTaggedSection('reported_issue', [
            `<title>${comment.title}</title>`,
            `<file>${comment.path}</file>`,
            `<line>${comment.line}</line>`,
            '<description>',
            comment.description,
            '</description>',
        ]),
        prompt_sections_buildTaggedSection('before_code', codeBeforeFix),
        afterCodeSection,
        buildFileListSection('changed_files', changedFiles),
        commitMessagesSection,
        prompt_sections_buildTaggedSection('investigation_strategy', investigationStrategy),
        prompt_sections_buildJsonOutputSection(`{"status": "resolved|attempted_failed|not_attempted", "reasoning": "One sentence explaining your verdict"}
Put your one-sentence explanation in the "reasoning" field.`),
    ]);
}
const GetFileDiffInput = external.object({
    path: external.string(),
});
const GetFileAtCommitInput = external.object({
    path: external.string(),
    commit: external["enum"](['before', 'after']),
    startLine: external.number().optional(),
    endLine: external.number().optional(),
});
function createToolExecutor(ctx) {
    return async (name, input) => {
        if (name === 'get_file_diff') {
            const parsed = GetFileDiffInput.safeParse(input);
            if (!parsed.success) {
                return `Invalid input: ${parsed.error.message}`;
            }
            const patch = ctx.patches.get(parsed.data.path);
            return patch ?? 'No changes found for this file';
        }
        if (name === 'get_file_at_commit') {
            const parsed = GetFileAtCommitInput.safeParse(input);
            if (!parsed.success) {
                return `Invalid input: ${parsed.error.message}`;
            }
            const { path, commit, startLine, endLine } = parsed.data;
            const sha = commit === 'before' ? ctx.baseSha : ctx.headSha;
            try {
                if (startLine !== undefined && endLine !== undefined) {
                    return await fetchFileLines(ctx.octokit, ctx.owner, ctx.repo, path, sha, startLine, endLine);
                }
                const content = await fetchFileContent(ctx.octokit, ctx.owner, ctx.repo, path, sha);
                const lines = content.split('\n');
                if (lines.length > 100) {
                    const numbered = lines.slice(0, 100).map((line, i) => `${i + 1}: ${line}`);
                    return `${numbered.join('\n')}\n\n[... ${lines.length - 100} more lines truncated]`;
                }
                return lines.map((line, i) => `${i + 1}: ${line}`).join('\n');
            }
            catch (error) {
                return `Error fetching file: ${error instanceof Error ? error.message : String(error)}`;
            }
        }
        return `Unknown tool: ${name}`;
    };
}
/**
 * Evaluate whether a code change fixed a reported issue.
 * Uses Haiku with tool use to explore the changes.
 */
async function evaluateFix(input, context, apiKey, runtimeOptionsOrMaxRetries) {
    const runtimeOptions = runtimeOptionsOrMaxRetries !== null && typeof runtimeOptionsOrMaxRetries === 'object'
        ? runtimeOptionsOrMaxRetries
        : runtimeOptionsOrMaxRetries == null
            ? {}
            : { maxRetries: runtimeOptionsOrMaxRetries };
    const fallback = {
        verdict: { status: 'not_attempted', reasoning: 'Evaluation failed' },
        usage: (0,sdk_usage/* emptyUsage */.ly)(),
        usedFallback: true,
    };
    const prompt = buildPrompt(input);
    const executeTool = createToolExecutor(context);
    const result = await runtimes_getRuntime(runtimeOptions.runtime).runAuxiliary({
        task: 'fix_evaluation',
        agentName: input.skillName,
        apiKey,
        prompt,
        schema: FixJudgeVerdictSchema,
        tools: TOOL_DEFINITIONS,
        executeTool,
        model: runtimeOptions.model,
        maxIterations: 5,
        maxRetries: runtimeOptions.maxRetries,
    });
    if (result.success) {
        return { verdict: result.data, usage: result.usage, usedFallback: false };
    }
    return { ...fallback, usage: result.usage };
}

;// CONCATENATED MODULE: ./src/action/fix-evaluation/index.ts







/** Maximum comments to evaluate per run */
const MAX_EVALUATIONS = 20;
const EVALUATION_FAILED_REASONING = 'Evaluation failed';
const RE_DETECTED_REASONING = 'The fix attempt was made, but the same issue was detected again in the updated code.';
/** Extract finding ID (e.g. "WRZ-XPL") from a comment title like "[WRZ-XPL] Some title" */
function extractFindingId(title) {
    const match = title.match(/^\[([^\]]+)\]\s*/);
    return match?.[1];
}
function getCommentFindingId(comment) {
    return comment.findingId ?? extractFindingId(comment.title) ?? (comment.body ? parseWardenFindingId(comment.body) : undefined);
}
function getCommentSkill(comment) {
    return comment.skills?.[0] ?? (comment.body ? parseWardenSkills(comment.body)[0] : undefined);
}
/** Number of lines of context around the finding location */
const CONTEXT_LINES = 20;
/**
 * Extract numbered lines from content.
 */
function extractLines(content, start, end) {
    const lines = content.split('\n');
    return lines
        .slice(start - 1, end)
        .map((line, i) => `${start + i}: ${line}`)
        .join('\n');
}
/**
 * Fetch code snippet at a finding location at a specific commit.
 */
async function fetchCodeAtLocation(octokit, owner, repo, comment, sha, contextLines = CONTEXT_LINES) {
    const targetLine = comment.line;
    const startLine = Math.max(1, targetLine - contextLines);
    const endLine = targetLine + contextLines;
    try {
        const content = await fetchFileContent(octokit, owner, repo, comment.path, sha);
        return extractLines(content, startLine, endLine);
    }
    catch (error) {
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
function wasReDetected(comment, currentFindings) {
    return currentFindings.some((finding) => findingMatchesComment(finding, comment));
}
function createFallbackEvaluation() {
    return {
        verdict: { status: 'not_attempted', reasoning: EVALUATION_FAILED_REASONING },
        usage: (0,sdk_usage/* emptyUsage */.ly)(),
        usedFallback: true,
    };
}
/**
 * Apply Warden's final verdict precedence and record the side effects for it.
 */
function recordEvaluationOutcome(args) {
    const { result, comment, findingId, skill, context, evalResult, durationMs, reDetected, uniqueCodeChangedThreadIds, uniqueResolvedThreadIds, } = args;
    if (evalResult.usedFallback) {
        result.failedEvaluations++;
    }
    let finalVerdict;
    let reasoning = evalResult.verdict.reasoning;
    if (reDetected) {
        finalVerdict = 're_detected';
        reasoning = RE_DETECTED_REASONING;
        if (comment.threadId) {
            uniqueCodeChangedThreadIds.add(comment.threadId);
        }
        result.toReply.push({
            comment,
            replyBody: formatFailedFixReply(context.headSha, RE_DETECTED_REASONING),
            commitSha: context.headSha,
        });
    }
    else if (evalResult.usedFallback) {
        finalVerdict = 'eval_error';
    }
    else if (evalResult.verdict.status === 'not_attempted') {
        finalVerdict = 'not_attempted';
    }
    else if (evalResult.verdict.status === 'resolved') {
        finalVerdict = 'resolved';
        if (comment.threadId) {
            uniqueCodeChangedThreadIds.add(comment.threadId);
            uniqueResolvedThreadIds.add(comment.threadId);
        }
        result.toResolve.push(comment);
    }
    else {
        finalVerdict = 'attempted_failed';
        if (comment.threadId) {
            uniqueCodeChangedThreadIds.add(comment.threadId);
        }
        result.toReply.push({
            comment,
            replyBody: formatFailedFixReply(context.headSha, evalResult.verdict.reasoning),
            commitSha: context.headSha,
        });
    }
    result.evaluations.push({
        findingId,
        skill,
        path: comment.path,
        line: comment.line,
        title: comment.title,
        verdict: finalVerdict,
        reasoning,
        durationMs,
        usage: evalResult.usage,
        usedFallback: evalResult.usedFallback,
    });
    (0,sentry/* emitFixEvalVerdictMetric */.E1)(finalVerdict, skill, { usedFallback: evalResult.usedFallback });
    return finalVerdict;
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
async function evaluateFixAttempts(octokit, comments, context, currentFindings, apiKey, runtimeOptionsOrMaxRetries) {
    const runtimeOptions = runtimeOptionsOrMaxRetries !== null && typeof runtimeOptionsOrMaxRetries === 'object'
        ? runtimeOptionsOrMaxRetries
        : runtimeOptionsOrMaxRetries == null
            ? {}
            : { maxRetries: runtimeOptionsOrMaxRetries };
    return sentry/* Sentry.startSpan */.sQ.startSpan({
        op: 'fix_eval.run',
        name: 'evaluate fix attempts',
        attributes: {
            'warden.fix_eval.comment_count': comments.length,
        },
    }, async (outerSpan) => {
        const result = {
            toResolve: [],
            toReply: [],
            skipped: 0,
            evaluated: 0,
            failedEvaluations: 0,
            uniqueFindingsEvaluated: 0,
            uniqueFindingsCodeChanged: 0,
            uniqueFindingsResolved: 0,
            usage: (0,sdk_usage/* emptyUsage */.ly)(),
            evaluations: [],
        };
        // Filter to unresolved Warden comments only
        const unresolvedComments = comments.filter((c) => c.isWarden && !c.isResolved && c.threadId);
        if (unresolvedComments.length === 0) {
            return result;
        }
        // Fetch patches and commit messages between base and head
        const { patches, commitMessages } = await fetchFollowUpChanges(octokit, context.owner, context.repo, context.baseSha, context.headSha);
        if (patches.size === 0) {
            result.skipped = unresolvedComments.length;
            return result;
        }
        // Limit evaluations
        const commentsToEvaluate = unresolvedComments.slice(0, MAX_EVALUATIONS);
        if (unresolvedComments.length > MAX_EVALUATIONS) {
            result.skipped = unresolvedComments.length - MAX_EVALUATIONS;
        }
        const toolContext = {
            octokit,
            owner: context.owner,
            repo: context.repo,
            baseSha: context.baseSha,
            headSha: context.headSha,
            patches,
        };
        const changedFiles = [...patches.keys()];
        const usages = [];
        const uniqueEvaluatedThreadIds = new Set();
        const uniqueCodeChangedThreadIds = new Set();
        const uniqueResolvedThreadIds = new Set();
        for (const comment of commentsToEvaluate) {
            const findingId = getCommentFindingId(comment);
            const skill = getCommentSkill(comment);
            // Fetch code at the issue location before the fix
            let codeBeforeFix;
            try {
                codeBeforeFix = await fetchCodeAtLocation(octokit, context.owner, context.repo, comment, context.baseSha);
            }
            catch (error) {
                sentry/* Sentry.captureException */.sQ.captureException(error, { tags: { operation: 'fetch_fix_context' } });
                result.skipped++;
                continue;
            }
            result.evaluated++;
            if (comment.threadId) {
                uniqueEvaluatedThreadIds.add(comment.threadId);
            }
            // Fetch code after fix (optional, reduces tool calls)
            let codeAfterFix;
            try {
                codeAfterFix = await fetchCodeAtLocation(octokit, context.owner, context.repo, comment, context.headSha);
            }
            catch {
                // Non-fatal: judge can still use tools to investigate
            }
            const reDetected = wasReDetected(comment, currentFindings);
            await sentry/* Sentry.startSpan */.sQ.startSpan({
                op: 'fix_eval.evaluate',
                name: `evaluate fix ${comment.path}:${comment.line}`,
                attributes: {
                    'code.file.path': comment.path,
                    'code.line.number': comment.line,
                    'warden.fix_eval.finding_id': findingId ?? 'unknown',
                    ...(skill && { 'gen_ai.agent.name': skill }),
                },
            }, async (evalSpan) => {
                const startTime = performance.now();
                let evalResult;
                try {
                    evalResult = await evaluateFix({ comment, skillName: skill, changedFiles, codeBeforeFix, codeAfterFix, commitMessages }, toolContext, apiKey, runtimeOptions);
                }
                catch (error) {
                    sentry/* Sentry.captureException */.sQ.captureException(error, { tags: { operation: 'evaluate_fix_attempt' } });
                    evalResult = createFallbackEvaluation();
                }
                const durationMs = performance.now() - startTime;
                evalSpan.setAttribute('warden.fix_eval.raw_verdict', evalResult.verdict.status);
                evalSpan.setAttribute('warden.fix_eval.used_fallback', evalResult.usedFallback);
                usages.push(evalResult.usage);
                const finalVerdict = recordEvaluationOutcome({
                    result,
                    comment,
                    findingId,
                    skill,
                    context,
                    evalResult,
                    durationMs,
                    reDetected,
                    uniqueCodeChangedThreadIds,
                    uniqueResolvedThreadIds,
                });
                evalSpan.setAttribute('warden.fix_eval.verdict', finalVerdict);
            });
        }
        result.usage = usages.length > 0 ? (0,sdk_usage/* aggregateUsage */.Z$)(usages) : (0,sdk_usage/* emptyUsage */.ly)();
        result.uniqueFindingsEvaluated = uniqueEvaluatedThreadIds.size;
        result.uniqueFindingsCodeChanged = uniqueCodeChangedThreadIds.size;
        result.uniqueFindingsResolved = uniqueResolvedThreadIds.size;
        const codeChangeRate = result.uniqueFindingsEvaluated > 0
            ? result.uniqueFindingsCodeChanged / result.uniqueFindingsEvaluated
            : 0;
        // Set summary attributes and emit metrics
        outerSpan.setAttribute('warden.fix_eval.evaluated', result.evaluated);
        outerSpan.setAttribute('warden.fix_eval.resolved', result.toResolve.length);
        outerSpan.setAttribute('warden.fix_eval.failed', result.failedEvaluations);
        outerSpan.setAttribute('warden.fix_eval.skipped', result.skipped);
        outerSpan.setAttribute('warden.fix_eval.unique_findings.evaluated', result.uniqueFindingsEvaluated);
        outerSpan.setAttribute('warden.fix_eval.unique_findings.code_changed', result.uniqueFindingsCodeChanged);
        outerSpan.setAttribute('warden.fix_eval.unique_findings.resolved', result.uniqueFindingsResolved);
        outerSpan.setAttribute('warden.fix_eval.unique_findings.code_change_rate', codeChangeRate);
        (0,sentry/* emitFixEvalMetrics */.ii)(result.evaluated, result.toResolve.length, result.failedEvaluations, result.skipped, result.uniqueFindingsEvaluated, result.uniqueFindingsCodeChanged, result.uniqueFindingsResolved);
        return result;
    });
}

// EXTERNAL MODULE: ./node_modules/.pnpm/chalk@5.6.2/node_modules/chalk/source/index.js + 3 modules
var source = __webpack_require__(29611);
// EXTERNAL MODULE: ./node_modules/.pnpm/figures@6.1.0/node_modules/figures/index.js + 1 modules
var node_modules_figures = __webpack_require__(87969);
;// CONCATENATED MODULE: ./src/cli/output/formatters.ts


/**
 * Capitalize the first letter of a string.
 * @example capitalize('critical') // 'Critical'
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
/**
 * Pluralize a word based on count.
 * @example pluralize(1, 'file') // 'file'
 * @example pluralize(2, 'file') // 'files'
 * @example pluralize(1, 'fix', 'fixes') // 'fix'
 * @example pluralize(2, 'fix', 'fixes') // 'fixes'
 */
function pluralize(count, singular, plural) {
    if (count === 1)
        return singular;
    return plural ?? `${singular}s`;
}
/**
 * Format a duration in milliseconds to a human-readable string.
 * Under 1s: "50ms". Under 60s: "3.2s". Over 60s: "5m 3s".
 */
function formatDuration(ms) {
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    const totalSeconds = ms / 1000;
    if (totalSeconds < 60) {
        const formatted = totalSeconds.toFixed(1);
        // toFixed(1) can round 59.95 to "60.0" — fall through to minutes format
        if (formatted !== '60.0') {
            return `${formatted}s`;
        }
    }
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = Math.round(totalSeconds % 60);
    if (seconds === 60) {
        minutes += 1;
        seconds = 0;
    }
    if (seconds === 0) {
        return `${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
}
/**
 * Format an elapsed time for display (e.g., "+0.8s", "+2m 3s").
 */
function formatElapsed(ms) {
    return `+${formatDuration(ms)}`;
}
/**
 * Format bytes into a compact human-readable size.
 */
function formatBytes(bytes) {
    if (bytes < 1024) {
        return `${bytes.toLocaleString()} B`;
    }
    const kb = bytes / 1024;
    if (kb < 1024) {
        return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}
/**
 * Severity configuration for display.
 */
const SEVERITY_CONFIG = {
    high: { color: source/* default */.Ay.red, symbol: node_modules_figures/* default */.Ay.bullet },
    medium: { color: source/* default */.Ay.yellow, symbol: node_modules_figures/* default */.Ay.bullet },
    low: { color: source/* default */.Ay.green, symbol: node_modules_figures/* default */.Ay.bullet },
};
/**
 * Format a severity dot for terminal output.
 */
function formatSeverityDot(severity) {
    const config = SEVERITY_CONFIG[severity];
    return config.color(config.symbol);
}
/**
 * Format a severity badge for terminal output (colored dot + severity text).
 */
function formatSeverityBadge(severity) {
    const config = SEVERITY_CONFIG[severity];
    return `${config.color(config.symbol)} ${config.color(`(${severity})`)}`;
}
/**
 * Format a severity for plain text (CI mode).
 */
function formatSeverityPlain(severity) {
    return `[${severity}]`;
}
/**
 * Confidence configuration for display.
 */
const CONFIDENCE_CONFIG = {
    high: { color: source/* default */.Ay.green },
    medium: { color: source/* default */.Ay.yellow },
    low: { color: source/* default */.Ay.red },
};
/**
 * Format a confidence badge for terminal output.
 * Returns empty string if confidence is undefined.
 */
function formatConfidenceBadge(confidence) {
    if (!confidence)
        return '';
    const config = CONFIDENCE_CONFIG[confidence];
    return config.color(`[${confidence} confidence]`);
}
/**
 * Format a file location string.
 */
function formatLocation(path, startLine, endLine) {
    if (!startLine) {
        return path;
    }
    if (endLine && endLine !== startLine) {
        return `${path}:${startLine}-${endLine}`;
    }
    return `${path}:${startLine}`;
}
/**
 * Format a finding for terminal display.
 */
function formatFindingCompact(finding) {
    const badge = formatSeverityBadge(finding.severity);
    const id = chalk.dim(`[${finding.id}]`);
    const location = finding.location
        ? chalk.dim(formatLocation(finding.location.path, finding.location.startLine, finding.location.endLine))
        : '';
    return `${badge} ${id} ${finding.title}${location ? ` ${location}` : ''}`;
}
/**
 * Format finding counts for display (with colored dots).
 */
function formatFindingCounts(counts) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) {
        return chalk.green('No findings');
    }
    const parts = [];
    if (counts.high > 0)
        parts.push(`${formatSeverityDot('high')} ${counts.high} high`);
    if (counts.medium > 0)
        parts.push(`${formatSeverityDot('medium')} ${counts.medium} medium`);
    if (counts.low > 0)
        parts.push(`${formatSeverityDot('low')} ${counts.low} low`);
    return `${total} finding${total === 1 ? '' : 's'}: ${parts.join('  ')}`;
}
/**
 * Format finding counts for plain text.
 */
function formatFindingCountsPlain(counts) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) {
        return 'No findings';
    }
    const parts = [];
    if (counts.high > 0)
        parts.push(`${counts.high} high`);
    if (counts.medium > 0)
        parts.push(`${counts.medium} medium`);
    if (counts.low > 0)
        parts.push(`${counts.low} low`);
    return `${total} finding${total === 1 ? '' : 's'} (${parts.join(', ')})`;
}
/**
 * Format a progress indicator like [1/3].
 */
function formatProgress(current, total) {
    return chalk.dim(`[${current}/${total}]`);
}
/**
 * Format file change summary.
 */
function formatFileStats(files) {
    const added = files.filter((f) => f.status === 'added').length;
    const modified = files.filter((f) => f.status === 'modified').length;
    const removed = files.filter((f) => f.status === 'removed').length;
    const parts = [];
    if (added > 0)
        parts.push(chalk.green(`+${added}`));
    if (modified > 0)
        parts.push(chalk.yellow(`~${modified}`));
    if (removed > 0)
        parts.push(chalk.red(`-${removed}`));
    return parts.length > 0 ? parts.join(' ') : '';
}
/**
 * Truncate a string to fit within a width, adding ellipsis if needed.
 */
function truncate(str, maxWidth) {
    if (str.length <= maxWidth) {
        return str;
    }
    if (maxWidth <= 3) {
        return str.slice(0, maxWidth);
    }
    return str.slice(0, maxWidth - 1) + figures.ellipsis;
}
/**
 * Pad a string on the right to reach a certain width.
 */
function padRight(str, width) {
    if (str.length >= width) {
        return str;
    }
    return str + ' '.repeat(width - str.length);
}
/**
 * Count findings by severity.
 */
function countBySeverity(findings) {
    const counts = {
        high: 0,
        medium: 0,
        low: 0,
    };
    for (const finding of findings) {
        counts[finding.severity]++;
    }
    return counts;
}
/**
 * Format a USD cost for display.
 */
function formatCost(costUSD) {
    return `$${costUSD.toFixed(2)}`;
}
/**
 * Calculate total cost across primary and auxiliary usage.
 */
function totalUsageCost(usage, auxiliaryUsage) {
    const hasAuxiliaryUsage = auxiliaryUsage !== undefined && Object.keys(auxiliaryUsage).length > 0;
    if (!usage && !hasAuxiliaryUsage)
        return undefined;
    return (usage?.costUSD ?? 0) + (auxiliaryUsage ? totalAuxiliaryCost(auxiliaryUsage) : 0);
}
/**
 * Format token counts for display.
 */
function formatTokens(tokens) {
    if (tokens >= 1_000_000) {
        return `${(tokens / 1_000_000).toFixed(1)}M`;
    }
    if (tokens >= 1_000) {
        return `${(tokens / 1_000).toFixed(1)}k`;
    }
    return String(tokens);
}
/**
 * Format usage stats for terminal display.
 */
function formatUsage(usage, auxiliaryUsage) {
    const inputStr = formatTokens(usage.inputTokens);
    const outputStr = formatTokens(usage.outputTokens);
    const costStr = formatCost(totalUsageCost(usage, auxiliaryUsage) ?? 0);
    return `${inputStr} in / ${outputStr} out · ${costStr}`;
}
/**
 * Format usage stats for plain text display.
 */
function formatUsagePlain(usage, auxiliaryUsage) {
    const inputStr = formatTokens(usage.inputTokens);
    const outputStr = formatTokens(usage.outputTokens);
    const costStr = formatCost(totalUsageCost(usage, auxiliaryUsage) ?? 0);
    return `${inputStr} input, ${outputStr} output, ${costStr}`;
}
/**
 * Calculate total auxiliary cost from an AuxiliaryUsageMap.
 */
function totalAuxiliaryCost(auxiliaryUsage) {
    return Object.values(auxiliaryUsage).reduce((sum, u) => sum + u.costUSD, 0);
}
/**
 * Format stats (duration, tokens, cost) into a compact single-line format.
 * Used for markdown footers in PR comments and check annotations.
 *
 * When auxiliaryUsage is provided, the cost shown is primary + auxiliary total,
 * with a breakdown suffix showing per-agent auxiliary costs.
 *
 * @example formatStatsCompact(15800, { inputTokens: 3000, outputTokens: 680, costUSD: 0.0048 })
 * // Returns: "⏱ 15.8s · 3.0k in / 680 out · $0.00"
 *
 * @example formatStatsCompact(15800, usage, { extraction: { ... costUSD: 0.001 } })
 * // Returns: "⏱ 15.8s · 3.0k in / 680 out · $0.01 (+extraction: $0.00)"
 */
function formatStatsCompact(durationMs, usage, auxiliaryUsage) {
    const parts = [];
    if (durationMs !== undefined) {
        parts.push(`⏱ ${formatDuration(durationMs)}`);
    }
    if (usage) {
        parts.push(`${formatTokens(usage.inputTokens)} in / ${formatTokens(usage.outputTokens)} out`);
        const costStr = formatCost(totalUsageCost(usage, auxiliaryUsage) ?? 0);
        parts.push(`${costStr}`);
    }
    return parts.join(' · ');
}

;// CONCATENATED MODULE: ./src/action/review-state.ts
/**
 * GitHub Review State Management
 *
 * Tracks the bot's previous review state on a PR for dismissal logic.
 */
const VALID_REVIEW_STATES = new Set(['CHANGES_REQUESTED', 'APPROVED', 'COMMENTED']);
function isValidReviewState(state) {
    return VALID_REVIEW_STATES.has(state);
}
/**
 * Find the bot's most recent review state on a PR.
 *
 * Used to determine if we should dismiss a previous REQUEST_CHANGES
 * when all issues are now resolved.
 *
 * Returns null if:
 * - Bot has no reviews on this PR
 * - Bot's most recent review was DISMISSED (user explicitly cleared it)
 */
function findBotReviewState(reviews, botLogin) {
    // GitHub API returns reviews in chronological order, search from end
    for (let i = reviews.length - 1; i >= 0; i--) {
        const review = reviews[i];
        if (!review?.user || review.user.login !== botLogin) {
            continue;
        }
        // User dismissed our review - don't look at older reviews
        if (review.state === 'DISMISSED') {
            return null;
        }
        if (isValidReviewState(review.state)) {
            return { state: review.state, reviewId: review.id };
        }
    }
    return null;
}

// EXTERNAL MODULE: ./src/sdk/errors.ts
var errors = __webpack_require__(93634);
;// CONCATENATED MODULE: ./src/sdk/auth.ts


/**
 * Pre-flight auth check: verify that authentication will work before starting analysis.
 *
 * - If an API key is provided, returns immediately (direct API auth).
 * - If no API key, verifies the `claude` binary exists on PATH so the SDK
 *   can use local Claude Code auth. Throws WardenAuthenticationError
 *   if the binary is missing.
 *
 * This catches the most common failure mode (binary not installed) early.
 * Subtler failures (binary exists but sandbox blocks IPC) are caught by the
 * isSubprocessError() handler in analyzeHunk().
 */
function verifyAuth({ apiKey }) {
    // Direct API auth — no subprocess needed
    if (apiKey)
        return;
    try {
        execFileNonInteractive('claude', ['--version'], { timeout: 5000 });
    }
    catch (error) {
        // execFileNonInteractive wraps spawn failures in ExecError.
        // The original error message (e.g., "spawn claude ENOENT") is in ExecError.stderr.
        const isNotFound = error instanceof ExecError
            ? error.stderr.includes('ENOENT')
            : error.code === 'ENOENT';
        if (isNotFound) {
            throw new WardenAuthenticationError('Claude Code CLI not found on PATH.\n' +
                'Either install Claude Code (https://claude.ai/install.sh) or set an API key.', { cause: error });
        }
        const detail = error instanceof ExecError ? error.stderr : error.message;
        throw new WardenAuthenticationError(`Claude Code CLI found but failed to execute: ${detail}\n` +
            'Check that the claude binary has correct permissions and can run in this environment.', { cause: error });
    }
}

;// CONCATENATED MODULE: ./src/sdk/retry.ts
/** Default retry configuration */
const DEFAULT_RETRY_CONFIG = {
    maxRetries: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 30000,
};
/**
 * Calculate delay for a retry attempt using exponential backoff.
 */
function calculateRetryDelay(attempt, config) {
    const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
    return Math.min(delay, config.maxDelayMs);
}
/**
 * Sleep for a specified duration, respecting abort signal.
 */
async function sleep(ms, abortSignal) {
    return new Promise((resolve, reject) => {
        if (abortSignal?.aborted) {
            reject(new Error('Aborted'));
            return;
        }
        const timeout = setTimeout(resolve, ms);
        abortSignal?.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Aborted'));
        }, { once: true });
    });
}

;// CONCATENATED MODULE: ./src/diff/parser.ts
/**
 * Unified diff parser - extracts hunks from patch strings
 */
/**
 * Parse a unified diff hunk header.
 * Format: @@ -oldStart,oldCount +newStart,newCount @@ optional header
 */
function parseHunkHeader(line) {
    const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
    if (!match || !match[1] || !match[3])
        return null;
    return {
        oldStart: parseInt(match[1], 10),
        oldCount: parseInt(match[2] ?? '1', 10),
        newStart: parseInt(match[3], 10),
        newCount: parseInt(match[4] ?? '1', 10),
        header: match[5]?.trim() || undefined,
    };
}
/**
 * Parse a unified diff patch into hunks.
 */
function parsePatch(patch) {
    const lines = patch.split('\n');
    const hunks = [];
    let currentHunk = null;
    for (const line of lines) {
        const header = parseHunkHeader(line);
        if (header) {
            // Save previous hunk if exists
            if (currentHunk) {
                hunks.push({
                    ...currentHunk,
                    content: currentHunk.contentParts.join('\n'),
                });
            }
            // Start new hunk with array-based content builder
            currentHunk = {
                ...header,
                contentParts: [line],
                lines: [],
            };
        }
        else if (currentHunk) {
            // Add line to current hunk (skip diff metadata lines)
            if (!line.startsWith('diff --git') &&
                !line.startsWith('index ') &&
                !line.startsWith('--- ') &&
                !line.startsWith('+++ ') &&
                !line.startsWith('\\ No newline')) {
                currentHunk.contentParts.push(line);
                currentHunk.lines.push(line);
            }
        }
    }
    // Don't forget the last hunk
    if (currentHunk) {
        hunks.push({
            ...currentHunk,
            content: currentHunk.contentParts.join('\n'),
        });
    }
    return hunks;
}
/**
 * Parse a file's patch into a structured diff object.
 */
function parseFileDiff(filename, patch, status = 'modified') {
    return {
        filename,
        status,
        hunks: parsePatch(patch),
        rawPatch: patch,
    };
}
/**
 * Get the line range covered by a hunk (in the new file).
 */
function getHunkLineRange(hunk) {
    return {
        start: hunk.newStart,
        end: hunk.newStart + hunk.newCount - 1,
    };
}
/**
 * Get an expanded line range for context.
 */
function getExpandedLineRange(hunk, contextLines = 20) {
    const range = getHunkLineRange(hunk);
    return {
        start: Math.max(1, range.start - contextLines),
        end: range.end + contextLines,
    };
}

// EXTERNAL MODULE: external "node:child_process"
var external_node_child_process_ = __webpack_require__(31421);
;// CONCATENATED MODULE: ./src/diff/context.ts





/** Cache for file contents to avoid repeated reads */
const fileCache = new Map();
/** Clear the file cache (useful for testing or long-running processes) */
function clearFileCache() {
    fileCache.clear();
}
/** Get cached file lines or read and cache them */
function normalizeOptions(options) {
    if (typeof options === 'number') {
        return {
            contextLines: options,
            contentSource: { type: 'working-tree' },
        };
    }
    return {
        contextLines: options.contextLines ?? 20,
        contentSource: options.contentSource ?? { type: 'working-tree' },
    };
}
function cacheKey(repoPath, filename, source) {
    const sourceKey = source.type === 'git-ref' ? `${source.type}:${source.ref}` : source.type;
    return `${sourceKey}:${repoPath}:${filename}`;
}
function isInsideRepo(repoPath, filename) {
    const resolvedRepo = (0,external_node_path_.resolve)(repoPath);
    const resolvedFile = (0,external_node_path_.resolve)((0,external_node_path_.join)(repoPath, filename));
    return resolvedFile === resolvedRepo || resolvedFile.startsWith(resolvedRepo + '/');
}
function readWorkingTreeLines(repoPath, filename) {
    const filePath = (0,external_node_path_.join)(repoPath, filename);
    if (!(0,external_node_fs_.existsSync)(filePath)) {
        return null;
    }
    try {
        const content = (0,external_node_fs_.readFileSync)(filePath, 'utf-8');
        return content.split('\n');
    }
    catch {
        // Binary file or read error
        return null;
    }
}
function readGitSourceLines(repoPath, filename, source) {
    const refPath = source.type === 'git-index'
        ? `:${filename}`
        : `${source.ref}:${filename}`;
    const result = (0,external_node_child_process_.spawnSync)('git', ['show', refPath], {
        cwd: repoPath,
        encoding: 'utf-8',
        env: { ...process.env, ...exec/* GIT_NON_INTERACTIVE_ENV */.OO },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (result.error || result.status !== 0 || typeof result.stdout !== 'string') {
        return null;
    }
    return result.stdout.split('\n');
}
/** Get cached file lines or read and cache them */
function getCachedFileLines(repoPath, filename, source) {
    const key = cacheKey(repoPath, filename, source);
    if (fileCache.has(key)) {
        return fileCache.get(key) ?? null;
    }
    if (!isInsideRepo(repoPath, filename)) {
        fileCache.set(key, null);
        return null;
    }
    const lines = source.type === 'working-tree'
        ? readWorkingTreeLines(repoPath, filename)
        : readGitSourceLines(repoPath, filename, source);
    fileCache.set(key, lines);
    return lines;
}
/**
 * Detect language from filename.
 */
function detectLanguage(filename) {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const languageMap = {
        ts: 'typescript',
        tsx: 'typescript',
        js: 'javascript',
        jsx: 'javascript',
        py: 'python',
        rb: 'ruby',
        go: 'go',
        rs: 'rust',
        java: 'java',
        kt: 'kotlin',
        cs: 'csharp',
        cpp: 'cpp',
        c: 'c',
        h: 'c',
        hpp: 'cpp',
        swift: 'swift',
        php: 'php',
        sh: 'bash',
        bash: 'bash',
        zsh: 'bash',
        yml: 'yaml',
        yaml: 'yaml',
        json: 'json',
        toml: 'toml',
        md: 'markdown',
        sql: 'sql',
        html: 'html',
        css: 'css',
        scss: 'scss',
        less: 'less',
    };
    return languageMap[ext] ?? ext;
}
/**
 * Read specific lines from a file using the cache.
 * Returns empty array if file doesn't exist or is binary.
 */
function readFileLines(repoPath, filename, source, startLine, endLine) {
    const lines = getCachedFileLines(repoPath, filename, source);
    if (!lines) {
        return [];
    }
    // Lines are 1-indexed, arrays are 0-indexed
    return lines.slice(startLine - 1, endLine);
}
/**
 * Expand a hunk with surrounding context from the actual file.
 */
function expandHunkContext(repoPath, filename, hunk, options = 20) {
    const { contextLines, contentSource } = normalizeOptions(options);
    // Defense-in-depth: ensure filename doesn't escape repo directory
    if (!isInsideRepo(repoPath, filename)) {
        return { filename, hunk, contextBefore: [], contextAfter: [], contextStartLine: 1, language: detectLanguage(filename) };
    }
    const expandedRange = getExpandedLineRange(hunk, contextLines);
    // Read context before the hunk
    const contextBefore = readFileLines(repoPath, filename, contentSource, expandedRange.start, hunk.newStart - 1);
    // Read context after the hunk
    const contextAfter = readFileLines(repoPath, filename, contentSource, hunk.newStart + hunk.newCount, expandedRange.end);
    return {
        filename,
        hunk,
        contextBefore,
        contextAfter,
        contextStartLine: expandedRange.start,
        language: detectLanguage(filename),
    };
}
/**
 * Expand all hunks in a parsed diff with context.
 */
function expandDiffContext(repoPath, diff, options = 20) {
    return diff.hunks.map((hunk) => expandHunkContext(repoPath, diff.filename, hunk, options));
}
/**
 * Format a hunk with context for LLM analysis.
 */
function formatHunkForAnalysis(hunkCtx) {
    const lines = [];
    lines.push(`## File: ${hunkCtx.filename}`);
    lines.push(`## Language: ${hunkCtx.language}`);
    lines.push(`## Hunk: lines ${hunkCtx.hunk.newStart}-${hunkCtx.hunk.newStart + hunkCtx.hunk.newCount - 1}`);
    if (hunkCtx.hunk.header) {
        lines.push(`## Scope: ${hunkCtx.hunk.header}`);
    }
    lines.push('');
    // Context before
    if (hunkCtx.contextBefore.length > 0) {
        lines.push(`### Context Before (lines ${hunkCtx.contextStartLine}-${hunkCtx.hunk.newStart - 1})`);
        lines.push('```' + hunkCtx.language);
        lines.push(hunkCtx.contextBefore.join('\n'));
        lines.push('```');
        lines.push('');
    }
    // The actual changes
    lines.push(`### Changes`);
    lines.push('```diff');
    lines.push(hunkCtx.hunk.content);
    lines.push('```');
    lines.push('');
    // Context after
    if (hunkCtx.contextAfter.length > 0) {
        const afterStart = hunkCtx.hunk.newStart + hunkCtx.hunk.newCount;
        const afterEnd = afterStart + hunkCtx.contextAfter.length - 1;
        lines.push(`### Context After (lines ${afterStart}-${afterEnd})`);
        lines.push('```' + hunkCtx.language);
        lines.push(hunkCtx.contextAfter.join('\n'));
        lines.push('```');
    }
    return lines.join('\n');
}

;// CONCATENATED MODULE: ./src/diff/classify.ts
/**
 * File classification for chunking - determines how files should be processed
 */

/**
 * Built-in patterns that are always applied before user patterns.
 * These skip common lock files, minified code, and build artifacts.
 */
const BUILTIN_SKIP_PATTERNS = [
    // Package manager lock files
    '**/pnpm-lock.yaml',
    '**/package-lock.json',
    '**/yarn.lock',
    '**/Cargo.lock',
    '**/go.sum',
    '**/poetry.lock',
    '**/composer.lock',
    '**/Gemfile.lock',
    '**/Pipfile.lock',
    '**/bun.lockb',
    // Minified/bundled code
    '**/*.min.js',
    '**/*.min.css',
    '**/*.bundle.js',
    '**/*.bundle.css',
    // Build artifacts
    '**/dist/**',
    '**/build/**',
    '**/node_modules/**',
    '**/.next/**',
    '**/out/**',
    '**/coverage/**',
    // Generated code
    '**/*.generated.*',
    '**/*.g.ts',
    '**/*.g.dart',
    '**/generated/**',
    '**/__generated__/**',
];
/**
 * Classify a file to determine how it should be processed.
 *
 * @param filename - The file path to classify
 * @param userPatterns - Optional user-defined patterns (can override built-ins)
 * @returns The processing mode: 'per-hunk', 'whole-file', or 'skip'
 *
 * Order of precedence:
 * 1. User patterns are checked first (higher priority, allows overriding built-ins)
 * 2. Built-in skip patterns are checked second
 * 3. Default is 'per-hunk' if no patterns match
 */
function classifyFile(filename, userPatterns) {
    // Check user patterns first (allows overriding built-in skips)
    for (const { pattern, mode } of userPatterns ?? []) {
        if (matcher_matchGlob(pattern, filename)) {
            return mode;
        }
    }
    // Check built-in skip patterns
    for (const pattern of BUILTIN_SKIP_PATTERNS) {
        if (matcher_matchGlob(pattern, filename)) {
            return 'skip';
        }
    }
    // Default: process per-hunk
    return 'per-hunk';
}
/**
 * Check if a file should be skipped based on classification.
 */
function shouldSkipFile(filename, userPatterns) {
    return classifyFile(filename, userPatterns) === 'skip';
}

;// CONCATENATED MODULE: ./src/diff/coalesce.ts
/**
 * Hunk coalescing and splitting - manages hunk sizes for LLM analysis.
 *
 * - splitLargeHunks: Breaks large hunks into smaller chunks at logical breakpoints
 * - coalesceHunks: Merges nearby small hunks into fewer, larger chunks
 *
 * Pipeline: parsePatch() → splitLargeHunks() → coalesceHunks() → expandDiffContext()
 */
/** Default maximum gap in lines between hunks to merge */
const DEFAULT_MAX_GAP_LINES = 30;
/** Default maximum chunk size in characters */
const DEFAULT_MAX_CHUNK_SIZE = 8000;
/**
 * Merge two adjacent hunks into one.
 *
 * The merged hunk spans from the start of the first hunk to the end of the second,
 * with content combined using '...' as a visual separator. When both hunks have
 * different headers (indicating different function/class scopes), both are preserved.
 */
function mergeHunks(a, b) {
    // Calculate the new range that spans both hunks
    const newStart = Math.min(a.newStart, b.newStart);
    const newEnd = Math.max(a.newStart + a.newCount, b.newStart + b.newCount);
    const oldStart = Math.min(a.oldStart, b.oldStart);
    const oldEnd = Math.max(a.oldStart + a.oldCount, b.oldStart + b.oldCount);
    // Combine headers when both exist and are different
    let header;
    if (a.header && b.header && a.header !== b.header) {
        header = `${a.header} → ${b.header}`;
    }
    else {
        header = a.header ?? b.header;
    }
    return {
        oldStart,
        oldCount: oldEnd - oldStart,
        newStart,
        newCount: newEnd - newStart,
        header,
        content: a.content + '\n...\n' + b.content,
        lines: [...a.lines, ...b.lines],
    };
}
/**
 * Calculate the gap in lines between two hunks.
 * Returns the number of lines between the end of hunk A and the start of hunk B.
 */
function calculateGap(a, b) {
    const aEnd = a.newStart + a.newCount;
    return b.newStart - aEnd;
}
/**
 * Coalesce hunks that are close together into larger chunks.
 *
 * This reduces the number of LLM API calls by merging nearby hunks,
 * while respecting size limits to keep chunks manageable.
 *
 * @param hunks - Array of hunks to coalesce
 * @param options - Coalescing options (maxGapLines, maxChunkSize)
 * @returns Array of coalesced hunks (may be smaller than input)
 *
 * Algorithm:
 * 1. Sort hunks by start line
 * 2. For each hunk, check if it can be merged with the previous:
 *    - Gap between hunks <= maxGapLines
 *    - Combined size <= maxChunkSize
 * 3. If both conditions are met, merge; otherwise start a new chunk
 */
function coalesceHunks(hunks, options = {}) {
    const { maxGapLines = DEFAULT_MAX_GAP_LINES, maxChunkSize = DEFAULT_MAX_CHUNK_SIZE } = options;
    // Nothing to coalesce with 0 or 1 hunks
    if (hunks.length <= 1) {
        return hunks;
    }
    // Sort hunks by start line to ensure we process them in order
    const sorted = [...hunks].sort((a, b) => a.newStart - b.newStart);
    const result = [];
    // sorted[0] is guaranteed to exist since we checked hunks.length > 1 above
    let current = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        const gap = calculateGap(current, next);
        const combinedSize = current.content.length + next.content.length;
        // Merge if: close enough AND combined size under limit
        if (gap <= maxGapLines && combinedSize <= maxChunkSize) {
            current = mergeHunks(current, next);
        }
        else {
            // Can't merge - save current and start a new chunk
            result.push(current);
            current = next;
        }
    }
    // Don't forget the last chunk
    result.push(current);
    return result;
}
/**
 * Check if coalescing would reduce the number of hunks.
 * Useful for deciding whether to show coalescing stats.
 */
function wouldCoalesceReduce(hunks, options = {}) {
    if (hunks.length <= 1)
        return false;
    const coalesced = coalesceHunks(hunks, options);
    return coalesced.length < hunks.length;
}
/**
 * Patterns that indicate logical breakpoints for splitting.
 * Prioritized in order: blank lines are best, then function/class definitions.
 */
const LOGICAL_BREAKPOINT_PATTERNS = [
    // Blank lines (highest priority - natural paragraph breaks)
    /^[ ]?$/,
    // Function/method definitions (various languages)
    /^[ ]?(export\s+)?(async\s+)?function\s+\w+/,
    /^[ ]?(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/,
    /^[ ]?(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?function/,
    /^[ ]?(public|private|protected)?\s*(static\s+)?(async\s+)?\w+\s*\([^)]*\)\s*[:{]/,
    /^[ ]?def\s+\w+/,
    /^[ ]?fn\s+\w+/,
    /^[ ]?func\s+\w+/,
    // Class/struct/interface definitions
    /^[ ]?(export\s+)?(abstract\s+)?class\s+\w+/,
    /^[ ]?(export\s+)?interface\s+\w+/,
    /^[ ]?(export\s+)?type\s+\w+\s*=/,
    /^[ ]?struct\s+\w+/,
    /^[ ]?impl\s+/,
    // Block comments (often precede logical sections)
    /^[ ]?\/\*\*/,
    /^[ ]?\/\//,
    /^[ ]?#\s/,
];
/**
 * Check if a line is a good logical breakpoint for splitting.
 * Returns a priority score (lower is better) or -1 if not a breakpoint.
 */
function getBreakpointPriority(line) {
    const index = LOGICAL_BREAKPOINT_PATTERNS.findIndex((pattern) => pattern.test(line));
    return index;
}
/**
 * Find the best split point in a range of lines.
 * Prefers logical breakpoints; falls back to midpoint if none found.
 *
 * @param lines - Array of lines to search
 * @param startIdx - Start index in the lines array
 * @param endIdx - End index (exclusive) in the lines array
 * @param targetIdx - Ideal split point (used for fallback)
 * @returns Index of the best split point
 */
function findBestSplitPoint(lines, startIdx, endIdx, targetIdx) {
    // Search window: look within 20% of chunk size from target
    const windowSize = Math.max(10, Math.floor((endIdx - startIdx) * 0.2));
    const searchStart = Math.max(startIdx + 1, targetIdx - windowSize);
    const searchEnd = Math.min(endIdx - 1, targetIdx + windowSize);
    let bestIdx = targetIdx;
    let bestPriority = Infinity;
    for (let i = searchStart; i <= searchEnd; i++) {
        const line = lines[i];
        if (line === undefined)
            continue;
        const priority = getBreakpointPriority(line);
        if (priority >= 0 && priority < bestPriority) {
            bestPriority = priority;
            bestIdx = i;
        }
    }
    return bestIdx;
}
/**
 * Create a sub-hunk from a portion of lines.
 *
 * @param originalHunk - The original hunk being split
 * @param lines - The lines for this sub-hunk
 * @param lineOffset - How many lines into the original hunk this sub-hunk starts
 */
function createSubHunk(originalHunk, lines, lineOffset) {
    // Calculate how many "new" lines we've passed to get the new start position
    // We need to count actual new-file lines, not just array indices
    let newLinesBeforeOffset = 0;
    let oldLinesBeforeOffset = 0;
    for (let i = 0; i < lineOffset && i < originalHunk.lines.length; i++) {
        const line = originalHunk.lines[i];
        if (line === undefined)
            continue;
        if (!line.startsWith('-')) {
            newLinesBeforeOffset++;
        }
        if (!line.startsWith('+')) {
            oldLinesBeforeOffset++;
        }
    }
    // Count lines in this sub-hunk (lines without '-' are in new file, without '+' are in old file)
    const newCount = lines.filter((line) => !line.startsWith('-')).length;
    const oldCount = lines.filter((line) => !line.startsWith('+')).length;
    // Build the @@ header for this sub-hunk
    const newStart = originalHunk.newStart + newLinesBeforeOffset;
    const oldStart = originalHunk.oldStart + oldLinesBeforeOffset;
    const header = originalHunk.header;
    const headerSuffix = header ? ` ${header}` : '';
    const hunkHeader = `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@${headerSuffix}`;
    return {
        oldStart,
        oldCount,
        newStart,
        newCount,
        header,
        content: [hunkHeader, ...lines].join('\n'),
        lines,
    };
}
/**
 * Split a single large hunk into smaller chunks.
 *
 * @param hunk - The hunk to split
 * @param maxChunkSize - Maximum size in characters per chunk
 * @returns Array of smaller hunks (may be single element if no split needed)
 */
function splitHunk(hunk, maxChunkSize) {
    // If hunk is small enough, return as-is
    if (hunk.content.length <= maxChunkSize) {
        return [hunk];
    }
    const result = [];
    const lines = hunk.lines;
    let currentStart = 0;
    while (currentStart < lines.length) {
        // Estimate how many lines fit in maxChunkSize
        // Use average line length as a rough guide
        const avgLineLength = hunk.content.length / Math.max(1, lines.length);
        const estimatedLines = Math.floor(maxChunkSize / avgLineLength);
        const targetEnd = Math.min(currentStart + estimatedLines, lines.length);
        // Calculate remaining content size
        const remainingLines = lines.slice(currentStart);
        const remainingSize = remainingLines.join('\n').length;
        // If remaining content fits in maxChunkSize, take it all
        if (remainingSize <= maxChunkSize) {
            result.push(createSubHunk(hunk, remainingLines, currentStart));
            break;
        }
        // Find best split point, ensuring we advance by at least one line
        let splitIdx = findBestSplitPoint(lines, currentStart, lines.length, targetEnd);
        if (splitIdx <= currentStart) {
            splitIdx = currentStart + 1;
        }
        // Extract lines for this chunk
        const chunkLines = lines.slice(currentStart, splitIdx);
        result.push(createSubHunk(hunk, chunkLines, currentStart));
        currentStart = splitIdx;
    }
    return result;
}
/**
 * Split large hunks into smaller chunks for LLM analysis.
 *
 * Large files (1000+ lines) that become single hunks in file-based analysis
 * can generate prompts exceeding practical limits. This function splits
 * such hunks at logical breakpoints (blank lines, function definitions)
 * to keep chunk sizes manageable.
 *
 * @param hunks - Array of hunks to potentially split
 * @param options - Split options (maxChunkSize)
 * @returns Array of hunks (may be larger than input if splits occurred)
 *
 * @example
 * // Pipeline usage:
 * const diff = parseFileDiff(filename, patch, status);
 * const splitHunks = splitLargeHunks(diff.hunks, { maxChunkSize: 8000 });
 * const coalescedHunks = coalesceHunks(splitHunks, { maxGapLines: 30 });
 */
function splitLargeHunks(hunks, options = {}) {
    const { maxChunkSize = DEFAULT_MAX_CHUNK_SIZE } = options;
    return hunks.flatMap((hunk) => splitHunk(hunk, maxChunkSize));
}

;// CONCATENATED MODULE: ./src/diff/index.ts






;// CONCATENATED MODULE: ./src/sdk/prompt.ts




/**
 * Builds the system prompt for hunk-based analysis.
 *
 * Future enhancement: Could have the agent output a structured `contextAssessment`
 * (applicationType, trustBoundaries, filesChecked) to cache across hunks, allow
 * user overrides, or build analytics. Not implemented since we don't consume it yet.
 */
function buildHunkSystemPrompt(skill) {
    const sections = [
        `<role>
You are a code analysis agent for Warden. You evaluate code changes against specific skill criteria and report findings ONLY when the code violates or conflicts with those criteria. You do not perform general code review or report issues outside the skill's scope.
</role>`,
        `<verification>
Before reporting a finding:
1. Read the relevant source code to understand the full context
2. Trace through the code path — follow imports, base classes, and indirect references, not just the immediate file
3. Verify your assumptions — confirm the issue exists, don't infer from incomplete information
4. Ensure the finding references lines within the hunk being analyzed
5. Document your verification in the 'verification' field of each finding
</verification>`,
        `<skill_instructions>
The following defines the ONLY criteria you should evaluate. Do not report findings outside this scope:

${skill.prompt}
</skill_instructions>`,
        prompt_sections_buildJsonOutputSection(`
Example response format:
{"findings": [{"id": "example-1", "severity": "medium", "confidence": "high", "title": "Issue title", "description": "Description", "location": {"path": "file.ts", "startLine": 10}}]}

Full schema:
{
  "findings": [
    {
      "id": "unique-identifier",
      "severity": "high|medium|low",
      "confidence": "high|medium|low",
      "title": "Short, specific title naming the broken behavior or risk (e.g. 'wasFailFastAborted never detects fail-fast abort')",
      "description": "Visible inline PR comment. Use one short, direct sentence whenever possible; two only if needed for the fix or impact.",
      "location": {
        "path": "path/to/file.ts",
        "startLine": 10,
        "endLine": 15
      },
      "verification": "Required. Detailed evidence for the collapsible verification block: files/functions checked, trigger conditions, expected vs actual behavior, and why mitigations do not apply.",
      "suggestedFix": {
        "description": "How to fix this issue",
        "diff": "unified diff format"
      }
    }
  ]
}

Requirements:
- Return valid JSON starting with {"findings":
- "findings" array can be empty if no issues found
- "location.path" is auto-filled from context - just provide startLine (and optionally endLine). Omit location entirely for general findings not about a specific line.
- "location.startLine" MUST be within the hunk line range (shown in the "## Hunk" header). If the issue originates in surrounding code, anchor to the nearest changed line in the hunk and note the actual location in the description.
- "confidence" reflects how certain you are this is a real issue given the codebase context
- "suggestedFix" is optional - only include when you can provide a complete, correct fix **to the file being analyzed**. Omit suggestedFix if:
  - The fix would be incomplete or you're uncertain about the correct solution
  - The fix requires changes to a different file or a new file (briefly name the fix in the description field instead)
- "description" is rendered directly in GitHub inline comments. Keep it brief and actionable, usually one sentence.
- Put proof, trace notes, checked files, and expected/actual breakdowns in "verification", not "description".
- Do not include severity, confidence, finding ID, skill name, or generic review framing in "description".
- Focus your analysis on the code changes in the hunk. Surrounding context and tool results are for understanding only -- all findings must reference lines within the hunk range.
`),
    ];
    const { rootDir } = skill;
    if (rootDir) {
        const resourceDirs = ['scripts', 'references', 'assets'].filter((dir) => (0,external_node_fs_.existsSync)((0,external_node_path_.join)(rootDir, dir)));
        if (resourceDirs.length > 0) {
            const dirList = resourceDirs.map((d) => `${d}/`).join(', ');
            sections.push(`<skill_resources>
This skill is located at: ${rootDir}
You can read files from ${dirList} subdirectories using the Read tool with the full path.
</skill_resources>`);
        }
    }
    return sections.join('\n\n');
}
/**
 * Builds the user prompt for a single hunk.
 */
function buildHunkUserPrompt(skill, hunkCtx, prContext) {
    return prompt_sections_joinPromptSections([
        `<task>
Analyze this code change according to the "${skill.name}" skill criteria.
</task>`,
        buildPullRequestContextSection(prContext),
        buildChangedFilesSection(prContext, hunkCtx.filename),
        formatHunkForAnalysis(hunkCtx),
        `<scope_reminder>
Only report findings that are explicitly covered by the skill instructions. Do not report general code quality issues, bugs, or improvements unless the skill specifically asks for them. Return an empty findings array if no issues match the skill's criteria.
</scope_reminder>`,
    ]);
}

;// CONCATENATED MODULE: ./src/sdk/json-output.ts




const JSON_REPAIR_MAX_CHARS = 60_000;
const JSON_REPAIR_MAX_TOKENS = 16_384;
const JSON_REPAIR_TIMEOUT_MS = 30_000;
function truncateForRepair(output) {
    if (output.length <= JSON_REPAIR_MAX_CHARS) {
        return output;
    }
    return `${output.slice(0, JSON_REPAIR_MAX_CHARS)}\n[... truncated]`;
}
function validationError(error) {
    return `validation_failed: ${error.message}`;
}
function parseExtractedJson(json, schema) {
    let parsed;
    try {
        parsed = JSON.parse(json);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: `invalid_json: ${message}`, json };
    }
    const validated = schema.safeParse(parsed);
    if (!validated.success) {
        return { success: false, error: validationError(validated.error), json };
    }
    return {
        success: true,
        data: validated.data,
        json,
        repaired: false,
    };
}
async function repairJsonOutput(output, schema, reason, repair) {
    const runtime = repair.runtime ?? getRuntime(repair.runtimeName ?? 'claude');
    if (!canUseRuntimeAuth({ apiKey: repair.apiKey, runtime: runtime.name })) {
        return {
            success: false,
            error: `${reason}; repair_skipped: missing_api_key`,
        };
    }
    const result = await runtime.runAuxiliary({
        task: 'extraction',
        agentName: repair.agentName,
        apiKey: repair.apiKey,
        model: repair.model,
        maxRetries: repair.maxRetries,
        maxTokens: repair.maxTokens ?? JSON_REPAIR_MAX_TOKENS,
        timeout: repair.timeout ?? JSON_REPAIR_TIMEOUT_MS,
        schema,
        prompt: joinPromptSections([
            `<task>
Extract and repair the JSON value from this model output.
</task>`,
            buildJsonOutputSection(`Return JSON accepted by the provided schema.
Preserve the model's structured content as much as possible.
If the output contains markdown fences, escaped newlines, or prose around JSON, remove only the wrapper/prose and repair JSON escaping.
Do not summarize or invent new content.`),
            buildTaggedSection('parse_error', reason),
            buildTaggedSection('model_output', truncateForRepair(output)),
        ]),
    });
    if (!result.success) {
        return {
            success: false,
            error: `${reason}; repair_failed: ${result.error}`,
            usage: result.usage,
        };
    }
    return {
        success: true,
        data: result.data,
        json: JSON.stringify(result.data),
        repaired: true,
        usage: result.usage,
    };
}
async function parseJsonFromOutput(options) {
    const json = extractJson(options.output);
    if (!json) {
        const reason = 'no_json';
        if (options.repair) {
            return repairJsonOutput(options.output, options.schema, reason, options.repair);
        }
        return { success: false, error: reason };
    }
    const parsed = parseExtractedJson(json, options.schema);
    if (parsed.success || !options.repair) {
        return parsed;
    }
    const repaired = await repairJsonOutput(options.output, options.schema, parsed.error, options.repair);
    if (!repaired.success && parsed.json) {
        return { ...repaired, json: parsed.json };
    }
    return repaired;
}

;// CONCATENATED MODULE: ./src/sdk/prepare.ts

/**
 * Group hunks by filename into PreparedFile entries.
 */
function groupHunksByFile(hunks) {
    const fileMap = new Map();
    for (const hunk of hunks) {
        const existing = fileMap.get(hunk.filename);
        if (existing) {
            existing.push(hunk);
        }
        else {
            fileMap.set(hunk.filename, [hunk]);
        }
    }
    return Array.from(fileMap, ([filename, fileHunks]) => ({ filename, hunks: fileHunks }));
}
/**
 * Prepare files for analysis by parsing patches into hunks with context.
 * Returns files that have changes to analyze and files that were skipped.
 */
function prepareFiles(context, options = {}) {
    const { contextLines = 20, chunking } = options;
    if (!context.pullRequest) {
        return { files: [], skippedFiles: [] };
    }
    const pr = context.pullRequest;
    const allHunks = [];
    const skippedFiles = [];
    for (const file of pr.files) {
        if (!file.patch)
            continue;
        // Check if this file should be skipped based on chunking patterns
        const mode = classifyFile(file.filename, chunking?.filePatterns);
        if (mode === 'skip') {
            skippedFiles.push({
                filename: file.filename,
                reason: 'builtin', // Could be enhanced to track which pattern matched
            });
            continue;
        }
        const statusMap = {
            added: 'added',
            removed: 'removed',
            modified: 'modified',
            renamed: 'renamed',
            copied: 'added',
            changed: 'modified',
            unchanged: 'modified',
        };
        const status = statusMap[file.status] ?? 'modified';
        const diff = parseFileDiff(file.filename, file.patch, status);
        // Skip files with no meaningful diff content (e.g., empty files)
        if (diff.hunks.length === 0 || diff.hunks.every((h) => h.newCount === 0 && h.oldCount === 0)) {
            skippedFiles.push({ filename: file.filename, reason: 'builtin' });
            continue;
        }
        // Split large hunks first (handles large files becoming single hunks)
        const splitHunks = splitLargeHunks(diff.hunks, {
            maxChunkSize: chunking?.coalesce?.maxChunkSize,
        });
        // Then coalesce nearby small ones if enabled (default: enabled)
        const coalesceEnabled = chunking?.coalesce?.enabled !== false;
        const hunks = coalesceEnabled
            ? coalesceHunks(splitHunks, {
                maxGapLines: chunking?.coalesce?.maxGapLines,
                maxChunkSize: chunking?.coalesce?.maxChunkSize,
            })
            : splitHunks;
        const hunksWithContext = expandDiffContext(context.repoPath, { ...diff, hunks }, {
            contextLines,
            contentSource: context.diffContextSource,
        });
        allHunks.push(...hunksWithContext);
    }
    return {
        files: groupHunksByFile(allHunks),
        skippedFiles,
    };
}

;// CONCATENATED MODULE: ./src/sdk/verify.ts








const VerificationVerdictSchema = external.object({
    verdict: external["enum"](['keep', 'revise', 'reject']),
    finding: types/* FindingSchema */.p_.nullish(),
    reason: external.string().optional(),
});
const JSON_OBJECT_START = /\{/g;
const VERIFICATION_CONCURRENCY = 4;
function isAbortRequested(error, abortController) {
    return (abortController?.signal.aborted ?? false) || (0,errors/* classifyError */.fe)(error).code === 'aborted';
}
function buildVerificationSystemPrompt(skill) {
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

${prompt_sections_buildJsonOutputSection(`
{"verdict":"keep|revise|reject","finding":{...},"reason":"short reason"}

Use "finding" only for verdict "revise". For revised findings, return the complete Warden finding object and keep the original id.
`)}`;
}
function buildVerificationUserPrompt(finding, prContext) {
    return prompt_sections_joinPromptSections([
        buildPullRequestContextSection(prContext),
        buildChangedFilesSection(prContext, finding.location?.path),
        prompt_sections_buildTaggedSection('candidate_finding', JSON.stringify(finding, null, 2)),
        `<task>
Verify this candidate. Return keep, revise, or reject.
</task>`,
    ]);
}
function parseVerificationVerdict(text) {
    for (const match of text.matchAll(JSON_OBJECT_START)) {
        if (match.index === undefined)
            continue;
        const json = extractBalancedJson(text, match.index);
        if (!json)
            continue;
        try {
            const parsed = JSON.parse(json);
            const result = VerificationVerdictSchema.safeParse(parsed);
            if (result.success) {
                return result.data;
            }
        }
        catch {
            // Keep scanning in case prose or another object appears before the verdict.
        }
    }
    return null;
}
function applyVerdict(finding, verdict) {
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
    }
    else {
        delete revised.location;
    }
    if (finding.additionalLocations) {
        revised.additionalLocations = finding.additionalLocations;
    }
    else {
        delete revised.additionalLocations;
    }
    if (finding.suggestedFix) {
        revised.suggestedFix = finding.suggestedFix;
    }
    else {
        delete revised.suggestedFix;
    }
    if (finding.elapsedMs !== undefined) {
        revised.elapsedMs = finding.elapsedMs;
    }
    else {
        delete revised.elapsedMs;
    }
    const result = types/* FindingSchema */.p_.safeParse(revised);
    return result.success ? result.data : finding;
}
function throwIfAuthenticationFailure(authError, result) {
    if (authError) {
        throw new errors/* WardenAuthenticationError */.Aq(authError);
    }
    if (!result)
        return;
    const authMessage = result.errors.find(errors/* isAuthenticationErrorMessage */.Ip);
    if (result.status === 'auth_error') {
        throw new errors/* WardenAuthenticationError */.Aq(authMessage);
    }
    if (authMessage) {
        throw new errors/* WardenAuthenticationError */.Aq(authMessage);
    }
}
function notifyVerdict(options, finding, verdict, next) {
    if (!verdict)
        return;
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
function keepFindingAfterInterruptedVerification(finding) {
    // An abort is inconclusive, not a verifier rejection. Preserve candidates so
    // interrupted runs report the partial findings already collected.
    return { finding };
}
/**
 * Verify candidate findings with a second read-only repo-aware agent pass.
 */
async function verifyFindings(findings, options) {
    if (findings.length === 0) {
        return { findings };
    }
    const runtimeName = options.runtime ?? 'pi';
    const runtime = runtimes_getRuntime(runtimeName);
    const systemPrompt = buildVerificationSystemPrompt(options.skill);
    const results = await (0,utils/* runPool */.kD)(findings, VERIFICATION_CONCURRENCY, async (finding) => {
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
        }
        catch (error) {
            if (isAbortRequested(error, options.abortController)) {
                return keepFindingAfterInterruptedVerification(finding);
            }
            if (error instanceof errors/* WardenAuthenticationError */.Aq) {
                throw error;
            }
            if ((0,errors/* isSubprocessError */.mu)(error)) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new errors/* WardenAuthenticationError */.Aq(`Claude Code subprocess failed (${errorMessage}).\n` +
                    `This usually means the claude CLI cannot run in this environment.`, { cause: error });
            }
            if ((0,errors/* isAuthenticationError */.HD)(error)) {
                throw new errors/* WardenAuthenticationError */.Aq(undefined, { cause: error });
            }
            return { finding };
        }
    });
    const verified = results.flatMap((result) => result.finding ? [result.finding] : []);
    const usage = results.map((result) => result.usage).filter((u) => u !== undefined);
    return {
        findings: verified,
        usage: usage.length > 0 ? (0,sdk_usage/* aggregateUsage */.Z$)(usage) : undefined,
    };
}

;// CONCATENATED MODULE: ./src/diff/apply.ts

/**
 * Apply a unified diff to file content.
 * Returns the modified content.
 */
function applyDiffToContent(content, diff) {
    const hunks = parsePatch(diff);
    if (hunks.length === 0) {
        throw new Error('No valid hunks found in diff');
    }
    const lines = content.split('\n');
    // Apply from bottom to top to avoid shifting line indices.
    const sortedHunks = [...hunks].sort((a, b) => b.oldStart - a.oldStart);
    for (const hunk of sortedHunks) {
        const oldLines = [];
        const newLines = [];
        for (const line of hunk.lines) {
            if (line.startsWith('-')) {
                oldLines.push(line.slice(1));
            }
            else if (line.startsWith('+')) {
                newLines.push(line.slice(1));
            }
            else if (line.startsWith(' ') || line === '') {
                const contextLine = line.startsWith(' ') ? line.slice(1) : line;
                oldLines.push(contextLine);
                newLines.push(contextLine);
            }
        }
        const startIndex = hunk.oldStart - 1;
        for (let i = 0; i < oldLines.length; i++) {
            const lineIndex = startIndex + i;
            if (lineIndex >= lines.length) {
                throw new Error(`Hunk context mismatch: line ${lineIndex + 1} doesn't exist`);
            }
            if (lines[lineIndex] !== oldLines[i]) {
                throw new Error(`Hunk context mismatch at line ${lineIndex + 1}: expected "${oldLines[i]}", got "${lines[lineIndex]}"`);
            }
        }
        lines.splice(startIndex, oldLines.length, ...newLines);
    }
    return lines.join('\n');
}

;// CONCATENATED MODULE: ./src/sdk/fix-quality.ts









const SEMANTIC_PROMPT_MAX_CHARS = 4000;
function stripSuggestedFix(finding) {
    const { suggestedFix, ...rest } = finding;
    void suggestedFix;
    return rest;
}
function normalizeDiffPath(rawPath) {
    const trimmed = rawPath.trim();
    if (trimmed.startsWith('a/') || trimmed.startsWith('b/')) {
        return trimmed.slice(2);
    }
    return trimmed;
}
function extractDiffPaths(diff) {
    const oldHeaders = diff.match(/^---\s+([^\n]+)$/gm) ?? [];
    const newHeaders = diff.match(/^\+\+\+\s+([^\n]+)$/gm) ?? [];
    const headerCount = Math.max(oldHeaders.length, newHeaders.length);
    const oldPath = oldHeaders[0]?.replace(/^---\s+/, '');
    const newPath = newHeaders[0]?.replace(/^\+\+\+\s+/, '');
    return { oldPath, newPath, headerCount };
}
function overlapsAnchor(diff, finding) {
    const location = finding.location;
    const anchorStart = location?.startLine;
    if (!anchorStart || !location)
        return false;
    const anchorEnd = location.endLine ?? anchorStart;
    const hunks = parsePatch(diff);
    if (hunks.length === 0)
        return false;
    return hunks.some((h) => {
        // Finding locations are in pre-fix file coordinates, so compare against
        // the old-side hunk range to avoid false mismatches when line counts shift.
        const start = h.oldStart;
        const end = h.oldStart + Math.max(h.oldCount, 1) - 1;
        return start <= anchorEnd && end >= anchorStart;
    });
}
function runDeterministicGate(finding, repoPath) {
    if (!finding.location?.path || !finding.suggestedFix?.diff)
        return { pass: false };
    const diff = finding.suggestedFix.diff;
    const hunks = parsePatch(diff);
    if (hunks.length === 0)
        return { pass: false };
    const { oldPath, newPath, headerCount } = extractDiffPaths(diff);
    if (headerCount > 1)
        return { pass: false };
    const findingPath = finding.location.path;
    if (oldPath && oldPath !== '/dev/null' && normalizeDiffPath(oldPath) !== findingPath) {
        return { pass: false };
    }
    if (newPath && newPath !== '/dev/null' && normalizeDiffPath(newPath) !== findingPath) {
        return { pass: false };
    }
    if (oldPath && newPath && oldPath !== '/dev/null' && newPath !== '/dev/null' && normalizeDiffPath(oldPath) !== normalizeDiffPath(newPath)) {
        return { pass: false };
    }
    if (!overlapsAnchor(diff, finding))
        return { pass: false };
    const fullPath = (0,external_node_path_.join)(repoPath, findingPath);
    const resolvedFull = (0,external_node_path_.resolve)(fullPath);
    const resolvedRepo = (0,external_node_path_.resolve)(repoPath);
    const inRepo = resolvedFull === resolvedRepo || resolvedFull.startsWith(resolvedRepo + external_node_path_.sep);
    if (!inRepo)
        return { pass: false };
    let fileContent;
    try {
        fileContent = (0,external_node_fs_.readFileSync)(fullPath, 'utf-8');
    }
    catch {
        return { pass: false };
    }
    try {
        const patchedContent = applyDiffToContent(fileContent, diff);
        return { pass: true, fileContent, patchedContent };
    }
    catch {
        return { pass: false };
    }
}
const SemanticFixVerdictSchema = external.object({
    verdict: external["enum"](['pass', 'fail']),
    reason: external.string().min(1),
});
async function runSemanticGate(finding, fileContent, patchedContent, options) {
    const { apiKey, runtime, model, maxRetries } = options;
    if (!extract_canUseRuntimeAuth(options)) {
        return { verdict: 'unavailable' };
    }
    const originalForPrompt = fileContent.slice(0, SEMANTIC_PROMPT_MAX_CHARS);
    const patchedForPrompt = patchedContent.slice(0, SEMANTIC_PROMPT_MAX_CHARS);
    const prompt = prompt_sections_joinPromptSections([
        `<task>
Judge whether this suggested code fix is valid.
</task>`,
        `<fix_quality_rule>
Pass only if the diff clearly addresses the stated issue without obvious regressions in the shown code.
</fix_quality_rule>`,
        prompt_sections_buildTaggedSection('issue', [
            `<title>${finding.title}</title>`,
            `<description>${finding.description}</description>`,
        ]),
        prompt_sections_buildTaggedSection('original_file', originalForPrompt),
        prompt_sections_buildTaggedSection('patched_file', patchedForPrompt),
        prompt_sections_buildTaggedSection('suggested_diff', finding.suggestedFix?.diff ?? ''),
        prompt_sections_buildJsonOutputSection('{"verdict":"pass|fail","reason":"..."}'),
    ]);
    const result = await runtimes_getRuntime(runtime ?? 'claude').runAuxiliary({
        task: 'fix_quality',
        agentName: options.agentName,
        apiKey,
        prompt,
        schema: SemanticFixVerdictSchema,
        model,
        maxTokens: 220,
        timeout: 8000,
        maxRetries: maxRetries ?? 1,
    });
    if (!result.success) {
        return { verdict: 'unavailable', usage: result.usage };
    }
    return { verdict: result.data.verdict, usage: result.usage };
}
async function sanitizeFindingsSuggestedFixes(findings, options) {
    const stats = {
        checked: 0,
        strippedDeterministic: 0,
        strippedSemantic: 0,
        semanticUnavailable: 0,
    };
    const semanticUsage = [];
    const sanitized = [];
    for (const finding of findings) {
        if (!finding.suggestedFix) {
            sanitized.push(finding);
            continue;
        }
        stats.checked++;
        const deterministic = runDeterministicGate(finding, options.repoPath);
        if (!deterministic.pass) {
            stats.strippedDeterministic++;
            const stripped = stripSuggestedFix(finding);
            options.onFindingProcessing?.({
                stage: 'fix_gate',
                action: 'stripped_fix',
                finding,
                replacement: stripped,
                reason: 'suggested fix failed deterministic validation',
            });
            sanitized.push(stripped);
            continue;
        }
        const semantic = await runSemanticGate(finding, deterministic.fileContent, deterministic.patchedContent, options);
        if (semantic.usage) {
            semanticUsage.push(semantic.usage);
        }
        if (semantic.verdict === 'fail') {
            stats.strippedSemantic++;
            const stripped = stripSuggestedFix(finding);
            options.onFindingProcessing?.({
                stage: 'fix_gate',
                action: 'stripped_fix',
                finding,
                replacement: stripped,
                reason: 'suggested fix failed semantic validation',
            });
            sanitized.push(stripped);
            continue;
        }
        if (semantic.verdict === 'unavailable') {
            stats.semanticUnavailable++;
        }
        sanitized.push(finding);
    }
    const usage = semanticUsage.length > 0 ? (0,sdk_usage/* aggregateUsage */.Z$)(semanticUsage) : undefined;
    return { findings: sanitized, stats, usage };
}

;// CONCATENATED MODULE: ./src/sdk/post-process.ts




/**
 * Run the shared post-analysis finding pipeline.
 */
async function postProcessFindings(findings, options) {
    const auxiliaryUsage = [];
    const uniqueFindings = deduplicateFindings(findings, options.onFindingProcessing);
    (0,sentry/* emitDedupMetrics */.Zn)(options.skill.name, findings.length, uniqueFindings.length);
    let currentFindings = uniqueFindings;
    if (options.verifyFindings !== false) {
        const verification = await verifyFindings(currentFindings, {
            repoPath: options.repoPath,
            skill: options.skill,
            apiKey: options.apiKey,
            runtime: options.runtime,
            model: options.auxiliaryModel,
            maxTurns: options.maxTurns,
            abortController: options.abortController,
            pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
            prContext: options.prContext,
            onFindingProcessing: options.onFindingProcessing,
        });
        currentFindings = verification.findings;
        if (verification.usage) {
            auxiliaryUsage.push({ agent: 'verification', usage: verification.usage });
        }
    }
    const mergeResult = await mergeCrossLocationFindings(currentFindings, {
        apiKey: options.apiKey,
        repoPath: options.repoPath,
        runtime: options.runtime,
        model: options.synthesisModel,
        maxRetries: options.auxiliaryMaxRetries,
        agentName: options.skill.name,
        onFindingProcessing: options.onFindingProcessing,
    });
    currentFindings = mergeResult.findings;
    if (mergeResult.usage) {
        auxiliaryUsage.push({ agent: 'merge', usage: mergeResult.usage });
    }
    const sanitized = await sanitizeFindingsSuggestedFixes(currentFindings, {
        repoPath: options.repoPath,
        apiKey: options.apiKey,
        runtime: options.runtime,
        model: options.auxiliaryModel,
        maxRetries: options.auxiliaryMaxRetries,
        agentName: options.skill.name,
        onFindingProcessing: options.onFindingProcessing,
    });
    currentFindings = sanitized.findings;
    if (sanitized.usage) {
        auxiliaryUsage.push({ agent: 'fix_gate', usage: sanitized.usage });
    }
    (0,sentry/* emitFixGateMetrics */.Xg)(options.skill.name, sanitized.stats.checked, sanitized.stats.strippedDeterministic, sanitized.stats.strippedSemantic, sanitized.stats.semanticUnavailable);
    if (sanitized.stats.checked > 0) {
        sentry/* logger */.vF.info('Suggested fix quality gate', {
            'warden.fix_gate.checked': sanitized.stats.checked,
            'warden.fix_gate.stripped_deterministic': sanitized.stats.strippedDeterministic,
            'warden.fix_gate.stripped_semantic': sanitized.stats.strippedSemantic,
            'warden.fix_gate.semantic_unavailable': sanitized.stats.semanticUnavailable,
        });
    }
    return { findings: currentFindings, auxiliaryUsage };
}

;// CONCATENATED MODULE: ./src/sdk/report-files.ts
/**
 * Return whether a final finding should be counted against a file.
 */
function findingAppliesToFile(finding, filename) {
    if (finding.location?.path === filename)
        return true;
    return finding.additionalLocations?.some((location) => location.path === filename) ?? false;
}
/**
 * Count final findings per file while preserving timing and usage metadata.
 */
function buildFileReports(files, findings) {
    return files.map((file) => ({
        filename: file.filename,
        findings: findings.filter((finding) => findingAppliesToFile(finding, file.filename)).length,
        durationMs: file.durationMs,
        usage: file.usage,
    }));
}

;// CONCATENATED MODULE: ./src/sdk/types.ts
/** Default concurrency for file-level parallel processing (standalone SDK usage only) */
const DEFAULT_FILE_CONCURRENCY = 5;
/** Threshold in characters above which to warn about large prompts (~25k tokens) */
const LARGE_PROMPT_THRESHOLD_CHARS = 100000;

;// CONCATENATED MODULE: ./src/sdk/analyze.ts













function notifyHunkFailed(callbacks, lineRange, message) {
    if (callbacks) {
        callbacks.onHunkFailed?.(lineRange, message);
        return;
    }
    console.error(`Hunk analysis failed for ${lineRange}.`);
}
function analyze_isAbortRequested(error, abortController) {
    return (abortController?.signal.aborted ?? false) || (0,errors/* classifyError */.fe)(error).code === 'aborted';
}
function isCircuitBreakerCode(code) {
    return code === 'auth_failed' || code === 'provider_unavailable' || code === 'invalid_model_selector';
}
function hunkFailureFromCircuit(reason, usage, attempts) {
    return {
        findings: [],
        usage: (0,sdk_usage/* aggregateUsage */.Z$)(usage),
        failed: true,
        extractionFailed: false,
        failureCode: reason.code,
        failureMessage: reason.message,
        attempts,
    };
}
function recordCircuitFailure(options, code, message) {
    if (!isCircuitBreakerCode(code))
        return undefined;
    options.circuitBreaker?.recordFailure(code, message);
    return options.circuitBreaker?.reason;
}
function allHunksFailedGuidance(runtime) {
    if ((runtime ?? 'pi') === 'pi') {
        return 'Verify Pi has credentials for the selected provider/model, or choose a configured Pi model.';
    }
    return "Verify WARDEN_ANTHROPIC_API_KEY is set correctly, or run 'claude login' when using the Claude runtime without an API key.";
}
/**
 * Parse findings from a hunk analysis result.
 * Uses a two-tier extraction strategy:
 * 1. Regex-based extraction (fast, handles well-formed output)
 * 2. LLM fallback using haiku (handles malformed output gracefully)
 */
async function parseHunkOutput(result, filename, skillName, options) {
    if (result.status !== 'success') {
        // SDK error - not an extraction failure, just no findings
        return { findings: [], extractionFailed: false, extractionMethod: 'none' };
    }
    // Tier 1: Try regex-based extraction first (fast)
    const extracted = extractFindingsJson(result.text);
    if (extracted.success) {
        return { findings: validateFindings(extracted.findings, filename), extractionFailed: false, extractionMethod: 'regex' };
    }
    // Tier 2: Try LLM fallback for malformed output
    const fallback = await extractFindingsWithLLM(result.text, {
        apiKey: options.apiKey,
        runtime: options.runtime,
        model: options.auxiliaryModel,
        maxRetries: options.auxiliaryMaxRetries,
        agentName: skillName,
    });
    if (fallback.success) {
        return { findings: validateFindings(fallback.findings, filename), extractionFailed: false, extractionMethod: 'llm', extractionUsage: fallback.usage };
    }
    // Both tiers failed - return extraction failure info
    return {
        findings: [],
        extractionFailed: true,
        extractionMethod: 'none',
        extractionError: fallback.error,
        extractionPreview: fallback.preview,
        extractionUsage: fallback.usage,
    };
}
/**
 * Filter findings whose startLine falls outside the hunk line range.
 * Findings without a location are kept (general findings).
 */
function filterOutOfRangeFindings(findings, hunkRange) {
    const filtered = [];
    const dropped = [];
    function isWithinHunk(finding) {
        if (!finding.location)
            return true;
        const { startLine } = finding.location;
        return startLine >= hunkRange.start && startLine <= hunkRange.end;
    }
    for (const finding of findings) {
        if (isWithinHunk(finding)) {
            filtered.push(finding);
        }
        else {
            dropped.push(finding);
        }
    }
    return { filtered, dropped };
}
/**
 * Analyze a single hunk with retry logic for transient failures.
 */
async function analyzeHunk(skill, hunkCtx, repoPath, options, callbacks, prContext) {
    const lineRange = callbacks?.lineRange ?? formatHunkLineRange(hunkCtx);
    return sentry/* Sentry.startSpan */.sQ.startSpan({
        op: 'skill.analyze_hunk',
        name: `analyze hunk ${hunkCtx.filename}:${lineRange}`,
        attributes: {
            'gen_ai.agent.name': skill.name,
            'code.file.path': hunkCtx.filename,
            'warden.hunk.line_range': lineRange,
        },
    }, async (span) => {
        const { abortController, retry } = options;
        const systemPrompt = buildHunkSystemPrompt(skill);
        const userPrompt = buildHunkUserPrompt(skill, hunkCtx, prContext);
        // Report prompt size information
        const systemChars = systemPrompt.length;
        const userChars = userPrompt.length;
        const totalChars = systemChars + userChars;
        const estimatedTokensCount = (0,sdk_usage/* estimateTokens */.bP)(totalChars);
        // Always call onPromptSize if provided (for debug mode)
        callbacks?.onPromptSize?.(callbacks.lineRange, systemChars, userChars, totalChars, estimatedTokensCount);
        // Warn about large prompts
        if (totalChars > LARGE_PROMPT_THRESHOLD_CHARS) {
            callbacks?.onLargePrompt?.(callbacks.lineRange, totalChars, estimatedTokensCount);
        }
        // Merge retry config with defaults
        const retryConfig = {
            ...DEFAULT_RETRY_CONFIG,
            ...retry,
        };
        let lastError;
        // Track accumulated usage across retry attempts for accurate cost reporting
        const accumulatedUsage = [];
        for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
            const circuitReason = options.circuitBreaker?.reason;
            if (circuitReason) {
                return hunkFailureFromCircuit(circuitReason, accumulatedUsage, attempt);
            }
            // Check for abort before each attempt
            if (abortController?.signal.aborted) {
                callbacks?.onHunkFailed?.(callbacks.lineRange, 'Analysis aborted');
                return {
                    findings: [],
                    usage: (0,sdk_usage/* aggregateUsage */.Z$)(accumulatedUsage),
                    failed: true,
                    extractionFailed: false,
                    failureCode: 'aborted',
                    failureMessage: 'Analysis aborted',
                    attempts: attempt,
                };
            }
            try {
                const runtimeName = options.runtime ?? 'pi';
                const runtime = runtimes_getRuntime(runtimeName);
                const { result: resultMessage, authError } = await runtime.runSkill({
                    apiKey: options.apiKey,
                    systemPrompt,
                    userPrompt,
                    repoPath,
                    skillName: skill.name,
                    tools: skill.tools,
                    options: {
                        maxTurns: options.maxTurns,
                        model: options.model,
                        abortController: options.abortController,
                    },
                    providerOptions: getRuntimeProviderOptions(runtimeName, {
                        pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
                    }),
                });
                // Check for authentication errors from auth_status messages
                // auth_status errors are always auth-related - throw immediately
                if (authError) {
                    throw new errors/* WardenAuthenticationError */.Aq(authError);
                }
                if (!resultMessage) {
                    notifyHunkFailed(callbacks, callbacks?.lineRange ?? lineRange, 'SDK returned no result');
                    return {
                        findings: [],
                        usage: (0,sdk_usage/* aggregateUsage */.Z$)(accumulatedUsage),
                        failed: true,
                        extractionFailed: false,
                        failureCode: 'sdk_error',
                        failureMessage: 'SDK returned no result',
                        attempts: attempt + 1,
                    };
                }
                // Extract usage from the result, regardless of success/error status
                const usage = resultMessage.usage;
                accumulatedUsage.push(usage);
                // Check if the SDK returned an error result (e.g., max turns, budget exceeded)
                const isError = resultMessage.status !== 'success';
                if (isError) {
                    // Extract error messages from SDK result
                    const errorMessages = resultMessage.errors;
                    // Check if any error indicates authentication failure
                    for (const err of errorMessages) {
                        if ((0,errors/* isAuthenticationErrorMessage */.Ip)(err)) {
                            throw new errors/* WardenAuthenticationError */.Aq();
                        }
                    }
                    // SDK error - log and return failure with error details
                    const errorSummary = errorMessages.length > 0
                        ? (0,errors/* sanitizeErrorMessage */.$w)(errorMessages.join('; '))
                        : `Runtime error: ${resultMessage.status}`;
                    const failureCode = resultMessage.status === 'turn_limit'
                        ? 'max_turns'
                        : resultMessage.status === 'provider_error'
                            ? 'provider_unavailable'
                            : 'sdk_error';
                    const failureMessage = `Runtime execution failed: ${errorSummary}`;
                    const openReason = recordCircuitFailure(options, failureCode, failureMessage);
                    notifyHunkFailed(callbacks, callbacks?.lineRange ?? lineRange, failureMessage);
                    if (openReason) {
                        return hunkFailureFromCircuit(openReason, accumulatedUsage, attempt + 1);
                    }
                    return {
                        findings: [],
                        usage: (0,sdk_usage/* aggregateUsage */.Z$)(accumulatedUsage),
                        failed: true,
                        extractionFailed: false,
                        failureCode,
                        failureMessage,
                        attempts: attempt + 1,
                    };
                }
                options.circuitBreaker?.recordSuccess();
                const parseResult = await parseHunkOutput(resultMessage, hunkCtx.filename, skill.name, options);
                // Filter findings outside hunk line range (defense-in-depth)
                const hunkRange = getHunkLineRange(hunkCtx.hunk);
                const { filtered: filteredFindings, dropped } = filterOutOfRangeFindings(parseResult.findings, hunkRange);
                if (dropped.length > 0) {
                    sentry/* Sentry.addBreadcrumb */.sQ.addBreadcrumb({
                        category: 'finding.out_of_range',
                        message: `Dropped ${dropped.length} finding(s) outside hunk range ${hunkRange.start}-${hunkRange.end}`,
                        level: 'warning',
                        data: {
                            skill: skill.name,
                            filename: hunkCtx.filename,
                            hunkRange,
                            droppedLines: dropped.map((f) => f.location?.startLine),
                        },
                    });
                }
                // Emit extraction metrics
                (0,sentry/* emitExtractionMetrics */.yI)(skill.name, parseResult.extractionMethod, filteredFindings.length);
                // Notify about extraction result (debug mode)
                callbacks?.onExtractionResult?.(callbacks.lineRange, filteredFindings.length, parseResult.extractionMethod);
                // Notify about extraction failure if callback provided
                if (parseResult.extractionFailed) {
                    callbacks?.onExtractionFailure?.(callbacks.lineRange, parseResult.extractionError ?? 'unknown_error', parseResult.extractionPreview ?? '');
                }
                span.setAttribute('warden.hunk.failed', false);
                span.setAttribute('warden.finding.count', filteredFindings.length);
                return {
                    findings: filteredFindings,
                    usage: (0,sdk_usage/* aggregateUsage */.Z$)(accumulatedUsage),
                    failed: false,
                    extractionFailed: parseResult.extractionFailed,
                    extractionError: parseResult.extractionError,
                    extractionPreview: parseResult.extractionPreview,
                    auxiliaryUsage: parseResult.extractionUsage
                        ? [{ agent: 'extraction', usage: parseResult.extractionUsage }]
                        : undefined,
                };
            }
            catch (error) {
                lastError = error;
                if (analyze_isAbortRequested(error, abortController)) {
                    callbacks?.onHunkFailed?.(callbacks.lineRange, 'Analysis aborted');
                    return {
                        findings: [],
                        usage: (0,sdk_usage/* aggregateUsage */.Z$)(accumulatedUsage),
                        failed: true,
                        extractionFailed: false,
                        failureCode: 'aborted',
                        failureMessage: 'Analysis aborted',
                        attempts: attempt + 1,
                    };
                }
                // Re-throw authentication errors (they shouldn't be retried)
                if (error instanceof errors/* WardenAuthenticationError */.Aq) {
                    const message = (0,errors/* sanitizeErrorMessage */.$w)(error.message);
                    options.circuitBreaker?.recordFailure('auth_failed', message);
                    throw error;
                }
                // Subprocess IPC failures (EPIPE, ECONNRESET, etc.) indicate the Claude CLI
                // can't communicate — surface as an auth error with actionable guidance
                if ((0,errors/* isSubprocessError */.mu)(error)) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    options.circuitBreaker?.recordFailure('auth_failed', (0,errors/* sanitizeErrorMessage */.$w)(errorMessage));
                    throw new errors/* WardenAuthenticationError */.Aq(`Claude Code subprocess failed (${errorMessage}).\n` +
                        `This usually means the claude CLI cannot run in this environment.`, { cause: error });
                }
                // Authentication errors should surface immediately with helpful guidance
                if ((0,errors/* isAuthenticationError */.HD)(error)) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    options.circuitBreaker?.recordFailure('auth_failed', (0,errors/* sanitizeErrorMessage */.$w)(errorMessage));
                    throw new errors/* WardenAuthenticationError */.Aq(undefined, { cause: error });
                }
                // Don't retry if not a retryable error or we've exhausted retries
                const shouldRetry = (0,errors/* isRetryableError */.$d)(error) && attempt < retryConfig.maxRetries;
                if (!shouldRetry) {
                    break;
                }
                // Calculate delay and wait before retry
                const delayMs = calculateRetryDelay(attempt, retryConfig);
                const errorMessage = (0,errors/* sanitizeErrorMessage */.$w)(error instanceof Error ? error.message : String(error));
                sentry/* Sentry.addBreadcrumb */.sQ.addBreadcrumb({
                    category: 'retry',
                    message: `Retrying hunk analysis`,
                    data: { attempt: attempt + 1, error: errorMessage, delayMs },
                    level: 'warning',
                });
                (0,sentry/* emitRetryMetric */.m0)(skill.name, attempt + 1);
                // Notify about retry in verbose mode
                callbacks?.onRetry?.(callbacks.lineRange, attempt + 1, retryConfig.maxRetries, errorMessage, delayMs);
                try {
                    await sleep(delayMs, abortController?.signal);
                }
                catch {
                    // Aborted during sleep
                    callbacks?.onHunkFailed?.(callbacks.lineRange, 'Analysis aborted during retry delay');
                    return {
                        findings: [],
                        usage: (0,sdk_usage/* aggregateUsage */.Z$)(accumulatedUsage),
                        failed: true,
                        extractionFailed: false,
                        failureCode: 'aborted',
                        failureMessage: 'Analysis aborted during retry delay',
                        attempts: attempt + 1,
                    };
                }
            }
        }
        // All attempts failed - return failure with any accumulated usage
        const finalError = (0,errors/* sanitizeErrorMessage */.$w)(lastError instanceof Error ? lastError.message : String(lastError));
        // Log the final error
        if (lastError) {
            notifyHunkFailed(callbacks, callbacks?.lineRange ?? lineRange, `All retry attempts failed: ${finalError}`);
        }
        // Also notify via callback if verbose
        if (options.verbose) {
            callbacks?.onRetry?.(callbacks.lineRange, retryConfig.maxRetries + 1, retryConfig.maxRetries, `Final failure: ${finalError}`, 0);
        }
        span.setAttribute('warden.hunk.failed', true);
        span.setAttribute('warden.finding.count', 0);
        const { code: retryCode, message } = (0,errors/* classifyError */.fe)(lastError);
        const retryMsg = (0,errors/* sanitizeErrorMessage */.$w)(message);
        const openReason = recordCircuitFailure(options, retryCode, retryMsg);
        if (openReason) {
            return hunkFailureFromCircuit(openReason, accumulatedUsage, retryConfig.maxRetries + 1);
        }
        return {
            findings: [],
            usage: (0,sdk_usage/* aggregateUsage */.Z$)(accumulatedUsage),
            failed: true,
            extractionFailed: false,
            failureCode: retryCode,
            failureMessage: `All retry attempts failed: ${retryMsg}`,
            attempts: retryConfig.maxRetries + 1,
        };
    });
}
/**
 * Format a hunk's line range as a display string (e.g. "10-20" or "10").
 */
function formatHunkLineRange(hunk) {
    const start = hunk.hunk.newStart;
    const end = start + hunk.hunk.newCount - 1;
    return start === end ? `${start}` : `${start}-${end}`;
}
/**
 * Attach elapsed time to findings if skill start time is available.
 */
function attachElapsedTime(findings, skillStartTime) {
    if (skillStartTime === undefined)
        return;
    const elapsedMs = Date.now() - skillStartTime;
    for (const finding of findings) {
        finding.elapsedMs = elapsedMs;
    }
}
/**
 * Analyze a single prepared file's hunks.
 */
async function analyzeFile(skill, file, repoPath, options = {}, callbacks, prContext) {
    return sentry/* Sentry.startSpan */.sQ.startSpan({
        op: 'skill.analyze_file',
        name: `analyze file ${file.filename}`,
        attributes: {
            'gen_ai.agent.name': skill.name,
            'code.file.path': file.filename,
            'warden.hunk.count': file.hunks.length,
        },
    }, async (span) => {
        const { abortController } = options;
        const fileFindings = [];
        const fileUsage = [];
        const fileAuxiliaryUsage = [];
        const hunkFailures = [];
        let failedHunks = 0;
        let failedExtractions = 0;
        for (const [hunkIndex, hunk] of file.hunks.entries()) {
            if (abortController?.signal.aborted)
                break;
            const lineRange = formatHunkLineRange(hunk);
            callbacks?.onHunkStart?.(hunkIndex + 1, file.hunks.length, lineRange);
            const hunkCallbacks = callbacks
                ? {
                    lineRange,
                    onLargePrompt: callbacks.onLargePrompt,
                    onPromptSize: callbacks.onPromptSize,
                    onRetry: callbacks.onRetry,
                    onExtractionFailure: callbacks.onExtractionFailure,
                    onExtractionResult: callbacks.onExtractionResult,
                    onHunkFailed: callbacks.onHunkFailed,
                }
                : undefined;
            const hunkStartTime = Date.now();
            const result = await analyzeHunk(skill, hunk, repoPath, options, hunkCallbacks, prContext);
            const hunkDurationMs = Date.now() - hunkStartTime;
            // `failed` and `extractionFailed` are conceptually mutually exclusive:
            // if analysis failed (no output produced), there's nothing to extract.
            // Use else-if so a future change that violates this invariant doesn't
            // silently double-count (one hunk → two hunkFailures entries +
            // failedHunks AND failedExtractions both incremented).
            if (result.failed && result.failureCode !== 'aborted') {
                failedHunks++;
                hunkFailures.push({
                    type: 'analysis',
                    filename: file.filename,
                    lineRange,
                    code: result.failureCode ?? 'unknown',
                    message: result.failureMessage ?? 'unknown error',
                    ...(result.attempts !== undefined ? { attempts: result.attempts } : {}),
                });
            }
            else if (result.extractionFailed) {
                failedExtractions++;
                hunkFailures.push({
                    type: 'extraction',
                    filename: file.filename,
                    lineRange,
                    code: (0,errors/* mapExtractionErrorCode */.bk)(result.extractionError),
                    message: result.extractionError ?? 'unknown extraction error',
                    ...(result.extractionPreview !== undefined ? { preview: result.extractionPreview } : {}),
                });
            }
            attachElapsedTime(result.findings, callbacks?.skillStartTime);
            callbacks?.onHunkComplete?.(hunkIndex + 1, result.findings, result.usage);
            const chunkResult = {
                filename: file.filename,
                model: options.model,
                index: hunkIndex + 1,
                total: file.hunks.length,
                lineRange,
                findings: result.findings,
                usage: result.usage,
                durationMs: hunkDurationMs,
                failed: result.failed && result.failureCode !== 'aborted',
                extractionFailed: result.extractionFailed,
                failureCode: result.failureCode,
                failureMessage: result.failureMessage,
                extractionError: result.extractionError,
                extractionPreview: result.extractionPreview,
                auxiliaryUsage: result.auxiliaryUsage,
            };
            callbacks?.onChunkComplete?.(chunkResult);
            fileFindings.push(...result.findings);
            fileUsage.push(result.usage);
            if (result.auxiliaryUsage) {
                fileAuxiliaryUsage.push(...result.auxiliaryUsage);
            }
        }
        span.setAttribute('warden.finding.count', fileFindings.length);
        span.setAttribute('warden.hunk.failed_count', failedHunks);
        span.setAttribute('warden.extraction.failed_count', failedExtractions);
        return {
            filename: file.filename,
            findings: fileFindings,
            usage: (0,sdk_usage/* aggregateUsage */.Z$)(fileUsage),
            failedHunks,
            failedExtractions,
            hunkFailures,
            auxiliaryUsage: fileAuxiliaryUsage.length > 0 ? fileAuxiliaryUsage : undefined,
        };
    });
}
/**
 * Generate a summary of findings.
 */
function generateSummary(skillName, findings) {
    if (findings.length === 0) {
        return `${skillName}: No issues found`;
    }
    const counts = {};
    for (const f of findings) {
        counts[f.severity] = (counts[f.severity] ?? 0) + 1;
    }
    const parts = [];
    if (counts['high'])
        parts.push(`${counts['high']} high`);
    if (counts['medium'])
        parts.push(`${counts['medium']} medium`);
    if (counts['low'])
        parts.push(`${counts['low']} low`);
    return `${skillName}: Found ${findings.length} issue${findings.length === 1 ? '' : 's'} (${parts.join(', ')})`;
}
/**
 * Run a skill on a PR, analyzing each hunk separately.
 */
async function runSkill(skill, context, options = {}) {
    return sentry/* Sentry.startSpan */.sQ.startSpan({
        op: 'skill.run',
        name: `run ${skill.name}`,
        attributes: {
            'gen_ai.agent.name': skill.name,
            ...(options.telemetryTriggerName ? { 'warden.trigger.name': options.telemetryTriggerName } : {}),
            'warden.file.count': context.pullRequest?.files.length ?? 0,
        },
    }, async (span) => {
        try {
            const report = await runSkillAnalysis(skill, context, options);
            span.setAttribute('warden.finding.count', report.findings.length);
            (0,sentry/* emitSkillMetrics */.s7)(report);
            return report;
        }
        catch (error) {
            span.setAttribute('warden.finding.count', 0);
            throw error;
        }
    });
}
async function runSkillAnalysis(skill, context, options = {}) {
    const { parallel = true, callbacks, abortController } = options;
    const startTime = Date.now();
    if (!context.pullRequest) {
        throw new errors/* SkillRunnerError */.cy('Pull request context required for skill execution');
    }
    const { files: fileHunks, skippedFiles } = prepareFiles(context, {
        contextLines: options.contextLines,
        // Note: chunking config should come from the caller (e.g., from warden.toml defaults)
        // For now, we use built-in defaults. The caller can pass explicit chunking config.
    });
    if (fileHunks.length === 0) {
        const report = {
            skill: skill.name,
            summary: 'No code changes to analyze',
            findings: [],
            usage: (0,sdk_usage/* emptyUsage */.ly)(),
            durationMs: Date.now() - startTime,
            model: options.model,
            runtime: options.runtime ?? 'pi',
        };
        if (skippedFiles.length > 0) {
            report.skippedFiles = skippedFiles;
        }
        return report;
    }
    const totalFiles = fileHunks.length;
    const totalHunks = fileHunks.reduce((sum, file) => sum + file.hunks.length, 0);
    const allFindings = [];
    // Track all usage stats for aggregation
    const allUsage = [];
    const allAuxiliaryUsage = [];
    // Track failed hunks across all files
    let totalFailedHunks = 0;
    let totalFailedExtractions = 0;
    // Build PR context for inclusion in prompts (helps LLM understand the full scope of changes)
    // For non-PR contexts (CLI file/diff mode), skip the "Other Files" list to avoid
    // bloating every hunk prompt with thousands of filenames.
    const isPullRequest = context.pullRequest.number !== 0;
    const prContext = {
        changedFiles: isPullRequest ? context.pullRequest.files.map((f) => f.filename) : [],
        title: context.pullRequest.title,
        body: context.pullRequest.body,
        maxContextFiles: options.maxContextFiles,
    };
    /**
     * Process all hunks for a single file sequentially.
     * Wraps analyzeFile with progress callbacks.
     */
    async function processFile(fileHunkEntry, fileIndex) {
        const { filename } = fileHunkEntry;
        callbacks?.onFileStart?.(filename, fileIndex, totalFiles);
        const fileCallbacks = {
            skillStartTime: callbacks?.skillStartTime,
            onHunkStart: (hunkNum, totalHunks, lineRange) => {
                callbacks?.onHunkStart?.(filename, hunkNum, totalHunks, lineRange);
            },
            onHunkComplete: (hunkNum, findings, usage) => {
                callbacks?.onHunkComplete?.(filename, hunkNum, findings, usage);
            },
            onLargePrompt: callbacks?.onLargePrompt
                ? (lineRange, chars, estTokens) => {
                    callbacks.onLargePrompt?.(filename, lineRange, chars, estTokens);
                }
                : undefined,
            onPromptSize: callbacks?.onPromptSize
                ? (lineRange, systemChars, userChars, totalCharsVal, estTokens) => {
                    callbacks.onPromptSize?.(filename, lineRange, systemChars, userChars, totalCharsVal, estTokens);
                }
                : undefined,
            onRetry: callbacks?.onRetry
                ? (lineRange, attemptNum, maxRetries, error, delayMs) => {
                    callbacks.onRetry?.(filename, lineRange, attemptNum, maxRetries, error, delayMs);
                }
                : undefined,
            onExtractionFailure: callbacks?.onExtractionFailure
                ? (lineRange, error, preview) => {
                    callbacks.onExtractionFailure?.(filename, lineRange, error, preview);
                }
                : undefined,
            onExtractionResult: callbacks?.onExtractionResult
                ? (lineRange, findingsCount, method) => {
                    callbacks.onExtractionResult?.(filename, lineRange, findingsCount, method);
                }
                : undefined,
            onHunkFailed: callbacks?.onHunkFailed
                ? (lineRange, error) => {
                    callbacks.onHunkFailed?.(filename, lineRange, error);
                }
                : undefined,
        };
        const result = await analyzeFile(skill, fileHunkEntry, context.repoPath, options, fileCallbacks, prContext);
        callbacks?.onFileComplete?.(filename, fileIndex, totalFiles);
        return result;
    }
    /** Process a file with timing, returning a self-contained result. */
    async function processFileWithTiming(fileHunkEntry, fileIndex) {
        const fileStart = Date.now();
        const result = await processFile(fileHunkEntry, fileIndex);
        const durationMs = Date.now() - fileStart;
        return { filename: fileHunkEntry.filename, result, durationMs };
    }
    // Collect results in input order (Promise.all preserves order)
    const fileResults = [];
    // Process files - parallel or sequential based on options
    if (parallel) {
        // Process files with sliding-window concurrency pool
        const fileConcurrency = options.concurrency ?? DEFAULT_FILE_CONCURRENCY;
        const batchDelayMs = options.batchDelayMs ?? 0;
        fileResults.push(...await (0,utils/* runPool */.kD)(fileHunks, fileConcurrency, async (fileHunkEntry, index) => {
            // Rate-limit: delay items beyond the first concurrent wave
            if (index >= fileConcurrency && batchDelayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
            }
            return processFileWithTiming(fileHunkEntry, index);
        }, { shouldAbort: () => abortController?.signal.aborted ?? false }));
    }
    else {
        // Process files sequentially
        for (const [fileIndex, fileHunkEntry] of fileHunks.entries()) {
            // Check for abort before starting new file
            if (abortController?.signal.aborted)
                break;
            fileResults.push(await processFileWithTiming(fileHunkEntry, fileIndex));
        }
    }
    // Accumulate results from ordered fileResults
    const allHunkFailures = [];
    for (const fr of fileResults) {
        allFindings.push(...fr.result.findings);
        allUsage.push(fr.result.usage);
        totalFailedHunks += fr.result.failedHunks;
        totalFailedExtractions += fr.result.failedExtractions;
        if (fr.result.hunkFailures.length > 0) {
            allHunkFailures.push(...fr.result.hunkFailures);
        }
        if (fr.result.auxiliaryUsage) {
            allAuxiliaryUsage.push(...fr.result.auxiliaryUsage);
        }
    }
    // All hunks failed — typically a systemic problem (auth, subprocess, etc).
    // Throw so direct SDK consumers (evals, scheduled workflows) keep their
    // prior exception-based contract. The CLI path (tasks.ts) has its own
    // all-hunks-fail detection that emits a structured JSONL record instead.
    // Count both analysis and extraction failures: each hunk contributes to
    // at most one (analyzeFile makes them mutually exclusive), and an
    // extraction-only failure scenario would otherwise slip through silently.
    const totalAttemptFailures = totalFailedHunks + totalFailedExtractions;
    const circuitReason = options.circuitBreaker?.reason;
    if (circuitReason && totalAttemptFailures > 0 && allFindings.length === 0) {
        throw new errors/* SkillRunnerError */.cy(circuitReason.message, { code: circuitReason.code });
    }
    if (totalAttemptFailures > 0 && totalAttemptFailures === totalHunks && allFindings.length === 0) {
        const analysisFailures = allHunkFailures.filter((failure) => failure.type === 'analysis');
        if (analysisFailures.length > 0
            && analysisFailures.every((failure) => failure.code === 'invalid_model_selector')) {
            throw new errors/* SkillRunnerError */.cy(analysisFailures[0]?.message ?? 'Invalid Pi model selector.', { code: 'invalid_model_selector' });
        }
        if (analysisFailures.length > 0
            && analysisFailures.every((failure) => failure.code === 'provider_unavailable')) {
            throw new errors/* SkillRunnerError */.cy(`Provider unavailable: all ${totalHunks} chunk${totalHunks === 1 ? '' : 's'} failed to analyze. Warden stopped early.`, { code: 'provider_unavailable' });
        }
        throw new errors/* SkillRunnerError */.cy(`All ${totalHunks} chunk${totalHunks === 1 ? '' : 's'} failed to analyze. ` +
            `This usually indicates an authentication problem. ${allHunksFailedGuidance(options.runtime)}`, { code: 'all_hunks_failed' });
    }
    const processed = await postProcessFindings(allFindings, {
        skill,
        repoPath: context.repoPath,
        apiKey: options.apiKey,
        runtime: options.runtime,
        auxiliaryModel: options.auxiliaryModel,
        synthesisModel: options.synthesisModel,
        auxiliaryMaxRetries: options.auxiliaryMaxRetries,
        verifyFindings: options.verifyFindings,
        maxTurns: options.maxTurns,
        abortController: options.abortController,
        pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
        prContext,
        onFindingProcessing: options.callbacks?.onFindingProcessing,
    });
    const finalFindings = processed.findings;
    allAuxiliaryUsage.push(...processed.auxiliaryUsage);
    // Generate summary
    const summary = generateSummary(skill.name, finalFindings);
    // Aggregate usage across all hunks
    const totalUsage = (0,sdk_usage/* aggregateUsage */.Z$)(allUsage);
    const report = {
        skill: skill.name,
        summary,
        findings: finalFindings,
        usage: totalUsage,
        durationMs: Date.now() - startTime,
        model: options.model,
        files: buildFileReports(fileResults.map((fr) => ({
            filename: fr.filename,
            durationMs: fr.durationMs,
            usage: fr.result.usage,
        })), finalFindings),
    };
    report.runtime = options.runtime ?? 'pi';
    if (skippedFiles.length > 0) {
        report.skippedFiles = skippedFiles;
    }
    if (totalFailedHunks > 0) {
        report.failedHunks = totalFailedHunks;
    }
    if (totalFailedExtractions > 0) {
        report.failedExtractions = totalFailedExtractions;
    }
    if (allHunkFailures.length > 0) {
        report.hunkFailures = allHunkFailures;
    }
    const auxUsage = (0,sdk_usage/* aggregateAuxiliaryUsage */.RL)(allAuxiliaryUsage);
    if (auxUsage) {
        report.auxiliaryUsage = auxUsage;
    }
    return report;
}

;// CONCATENATED MODULE: ./src/sdk/runner.ts
/**
 * SDK Runner - Main orchestration for skill execution.
 *
 * This module re-exports functionality from focused submodules:
 * - errors.ts: Error classes and classification (SkillRunnerError, WardenAuthenticationError)
 * - retry.ts: Retry logic with exponential backoff
 * - usage.ts: Usage stats extraction and aggregation
 * - prompt.ts: Prompt building for skills
 * - extract.ts: JSON extraction from model output
 * - prepare.ts: File preparation for analysis
 * - analyze.ts: Hunk and file analysis orchestration
 * - types.ts: Shared interfaces
 */
// Re-export error classes and utilities

// Re-export auth utilities

// Re-export retry utilities

// Re-export usage utilities

// Re-export pricing utilities

// Re-export prompt building (with legacy alias)

// Legacy export for backwards compatibility

// Re-export extraction utilities


// Re-export file preparation

// Re-export verification utilities


// Re-export analysis functions

// Re-export runtime registry and adapter contracts


;// CONCATENATED MODULE: ./src/sdk/circuit-breaker.ts

const DEFAULT_MAX_CONSECUTIVE_PROVIDER_FAILURES = 5;
function providerUnavailableMessage(count, lastMessage) {
    const detail = (0,errors/* sanitizeErrorMessage */.$w)(lastMessage).trim();
    const suffix = detail ? ` Last error: ${detail}` : '';
    return `Provider unavailable after ${count} consecutive failures. Warden stopped early.${suffix}`;
}
/**
 * Tracks unrecoverable provider failures across a Warden run.
 */
class circuit_breaker_ProviderFailureCircuitBreaker {
    consecutiveProviderFailures = 0;
    openReason;
    maxConsecutiveProviderFailures;
    abortController;
    constructor(options = {}) {
        this.maxConsecutiveProviderFailures =
            options.maxConsecutiveProviderFailures ?? DEFAULT_MAX_CONSECUTIVE_PROVIDER_FAILURES;
        this.abortController = options.abortController;
    }
    get reason() {
        return this.openReason;
    }
    recordSuccess() {
        if (this.openReason)
            return;
        this.consecutiveProviderFailures = 0;
    }
    recordFailure(code, message) {
        if (this.openReason)
            return;
        if (code === 'auth_failed' || code === 'invalid_model_selector') {
            this.open({ code, message });
            return;
        }
        if (code !== 'provider_unavailable')
            return;
        this.consecutiveProviderFailures++;
        if (this.consecutiveProviderFailures >= this.maxConsecutiveProviderFailures) {
            this.open({
                code,
                message: providerUnavailableMessage(this.consecutiveProviderFailures, message),
            });
        }
    }
    open(reason) {
        this.openReason = reason;
        if (!this.abortController?.signal.aborted) {
            this.abortController?.abort();
        }
    }
}

;// CONCATENATED MODULE: ./src/cli/output/verbosity.ts
/**
 * Verbosity levels for CLI output.
 */
var verbosity_Verbosity;
(function (Verbosity) {
    /** Errors + final summary only */
    Verbosity[Verbosity["Quiet"] = 0] = "Quiet";
    /** Normal output with progress */
    Verbosity[Verbosity["Normal"] = 1] = "Normal";
    /** Real-time findings, hunk details */
    Verbosity[Verbosity["Verbose"] = 2] = "Verbose";
    /** Token counts, latencies, debug info */
    Verbosity[Verbosity["Debug"] = 3] = "Debug";
})(verbosity_Verbosity || (verbosity_Verbosity = {}));
/**
 * Parse verbosity from CLI flags.
 * @param quiet - If true, return Quiet
 * @param verboseCount - Number of -v flags (0, 1, or 2+)
 * @param debug - If true, return Debug (overrides verbose count)
 */
function parseVerbosity(quiet, verboseCount, debug) {
    if (quiet) {
        return verbosity_Verbosity.Quiet;
    }
    if (debug || verboseCount >= 2) {
        return verbosity_Verbosity.Debug;
    }
    if (verboseCount === 1) {
        return verbosity_Verbosity.Verbose;
    }
    return verbosity_Verbosity.Normal;
}

;// CONCATENATED MODULE: ./src/cli/output/icons.ts
/**
 * Unicode icons for CLI output.
 * Uses CHECK MARK (U+2713) instead of HEAVY CHECK MARK (U+2714) to avoid emoji rendering.
 */
/** Check mark for completed/success states */
const ICON_CHECK = '✓'; // U+2713 CHECK MARK
/** Down arrow for skipped states */
const ICON_SKIPPED = '↓'; // U+2193 DOWNWARDS ARROW
/** Braille spinner frames for loading animation */
const SPINNER_FRAMES = (/* unused pure expression or super */ null && (['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F']));
/** Circle for pending states */
const ICON_PENDING = '\u25CB'; // ○ WHITE CIRCLE
/** X mark for error states */
const ICON_ERROR = '\u2717'; // ✗ BALLOT X

;// CONCATENATED MODULE: ./src/cli/output/tasks.ts
/**
 * Task execution for skills.
 * Callback-based state updates for CLI and Ink rendering.
 *
 * Reporter spec: specs/reporters.md
 */












function allAnalysisFailuresHaveCode(hunkFailures, code) {
    const analysisFailures = hunkFailures.filter((failure) => failure.type === 'analysis');
    return (analysisFailures.length > 0
        && analysisFailures.every((failure) => failure.code === code));
}
function firstAnalysisFailureMessage(hunkFailures, code) {
    return hunkFailures.find((failure) => failure.type === 'analysis' && failure.code === code)?.message;
}
function summarizeRunFailure(args) {
    const { totalHunks, hunkFailures, circuitReason, runtime } = args;
    if (circuitReason) {
        return circuitReason;
    }
    if (allAnalysisFailuresHaveCode(hunkFailures, 'auth_failed')) {
        return {
            code: 'auth_failed',
            message: 'Authentication failed. Warden stopped early.',
        };
    }
    if (allAnalysisFailuresHaveCode(hunkFailures, 'invalid_model_selector')) {
        return {
            code: 'invalid_model_selector',
            message: firstAnalysisFailureMessage(hunkFailures, 'invalid_model_selector') ?? 'Invalid Pi model selector.',
        };
    }
    if (allAnalysisFailuresHaveCode(hunkFailures, 'provider_unavailable')) {
        return {
            code: 'provider_unavailable',
            message: `Provider unavailable: all ${totalHunks} chunk${totalHunks === 1 ? '' : 's'} failed to analyze. Warden stopped early.`,
        };
    }
    return {
        code: 'all_hunks_failed',
        message: `All ${totalHunks} chunk${totalHunks === 1 ? '' : 's'} failed to analyze. ` +
            `This usually indicates an authentication problem. ` +
            ((runtime ?? 'pi') === 'claude'
                ? `Verify WARDEN_ANTHROPIC_API_KEY is set correctly, or run 'claude login' when using the Claude runtime without an API key.`
                : `Verify WARDEN_MODEL and the WARDEN-prefixed provider API key for that model are set correctly.`),
    };
}
/**
 * Write a log-mode message to stderr with timestamp prefix.
 * Used for non-TTY / plain output.
 */
function logPlain(message) {
    console.error(`[${timestamp()}] warden: ${message}`);
}
/**
 * Write a debug-level message to stderr.
 * Uses chalk.dim formatting in TTY mode, timestamped "DEBUG:" prefix otherwise.
 */
function debugLog(mode, message) {
    if (mode.isTTY) {
        console.error(source/* default */.Ay.dim(`[debug] ${message}`));
    }
    else {
        logPlain(`DEBUG: ${message}`);
    }
}
/**
 * Format a finding's location as a compact string, falling back to 'unknown'.
 */
function findingLocation(finding) {
    if (!finding.location)
        return 'unknown';
    return formatLocation(finding.location.path, finding.location.startLine, finding.location.endLine);
}
function findingSummary(finding) {
    return `${findingLocation(finding)}: ${finding.title}`;
}
function formatFindingProcessingEvent(event) {
    const reason = event.reason ? ` (${event.reason})` : '';
    const replacement = event.replacement ? ` -> ${findingSummary(event.replacement)}` : '';
    return `${event.stage}:${event.action} ${findingSummary(event.finding)}${replacement}${reason}`;
}
/**
 * Run a single skill task.
 */
async function runSkillTask(options, fileConcurrency, callbacks, semaphore) {
    const { name, displayName = name, triggerName, failOn, minConfidence, resolveSkill, context, runnerOptions = {} } = options;
    return sentry/* Sentry.startSpan */.sQ.startSpan({ op: 'skill.run', name: `run ${displayName}` }, async (span) => {
        span.setAttribute('gen_ai.agent.name', displayName);
        if (triggerName) {
            span.setAttribute('warden.trigger.name', triggerName);
        }
        const files = context.pullRequest?.files ?? [];
        span.setAttribute('warden.file.count', files.length);
        sentry/* logger */.vF.info(sentry/* logger */.vF.fmt `Skill execution started: ${displayName}`, {
            'warden.file.count': files.length,
        });
        const startTime = Date.now();
        const runtime = runnerOptions.runtime ?? 'pi';
        // Mirror of the inner-scope `skill` so the outer catch can use
        // report.skill when resolveSkill succeeded but a later step threw.
        // Stays undefined only if resolveSkill itself failed.
        let resolvedSkillName;
        try {
            let skill;
            try {
                skill = await resolveSkill();
                resolvedSkillName = skill.name;
                span.setAttribute('gen_ai.agent.name', skill.name);
            }
            catch (err) {
                if (err instanceof errors/* WardenAuthenticationError */.Aq)
                    throw err;
                const message = err instanceof Error ? err.message : String(err);
                throw new errors/* SkillRunnerError */.cy(message, { cause: err, code: 'skill_resolution_failed' });
            }
            // Prepare files (parse patches into hunks)
            const { files: preparedFiles, skippedFiles } = prepareFiles(context, {
                contextLines: runnerOptions.contextLines,
            });
            if (preparedFiles.length === 0) {
                // No files to analyze - skip
                const skippedReport = {
                    skill: skill.name,
                    summary: 'No code changes to analyze',
                    findings: [],
                    usage: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
                    durationMs: Date.now() - startTime,
                    model: runnerOptions?.model,
                    runtime,
                    skippedFiles: skippedFiles.length > 0 ? skippedFiles : undefined,
                };
                span.setAttribute('warden.finding.count', 0);
                callbacks.onSkillSkipped(name);
                // Also fire onSkillComplete so the incremental JSONL writer records the skipped skill.
                callbacks.onSkillComplete(name, skippedReport);
                return {
                    name,
                    report: skippedReport,
                    failOn,
                    minConfidence,
                };
            }
            // Initialize file states
            const fileStates = preparedFiles.map((file) => ({
                filename: file.filename,
                status: 'pending',
                currentHunk: 0,
                totalHunks: file.hunks.length,
                findings: [],
            }));
            // Notify skill start
            callbacks.onSkillStart({
                name,
                displayName,
                status: 'running',
                startTime,
                files: fileStates,
                findings: [],
            });
            // Build PR context for inclusion in prompts (if available)
            // For non-PR contexts (CLI file/diff mode), skip the "Other Files" list to avoid
            // bloating every hunk prompt with thousands of filenames.
            const isPullRequest = context.pullRequest ? context.pullRequest.number !== 0 : false;
            const prContext = context.pullRequest
                ? {
                    changedFiles: isPullRequest ? context.pullRequest.files.map((f) => f.filename) : [],
                    title: context.pullRequest.title,
                    body: context.pullRequest.body,
                    maxContextFiles: runnerOptions.maxContextFiles,
                }
                : undefined;
            // Process files with concurrency
            const processFile = async (prepared, index) => {
                const filename = prepared.filename;
                const fileStartTime = Date.now();
                // Update file state to running (local + callback)
                const localState = fileStates[index];
                if (localState)
                    localState.status = 'running';
                callbacks.onFileUpdate(name, filename, { status: 'running' });
                const fileCallbacks = {
                    skillStartTime: startTime,
                    onHunkStart: (hunkNum, totalHunks, lineRange) => {
                        callbacks.onFileUpdate(name, filename, {
                            currentHunk: hunkNum,
                            totalHunks,
                        });
                        callbacks.onHunkStart?.(name, filename, hunkNum, totalHunks, lineRange);
                    },
                    onHunkComplete: (_hunkNum, findings, usage) => {
                        // Accumulate findings and usage for this file
                        const current = fileStates[index];
                        if (current) {
                            current.findings.push(...findings);
                            if (current.usage) {
                                current.usage.inputTokens += usage.inputTokens;
                                current.usage.outputTokens += usage.outputTokens;
                                current.usage.costUSD += usage.costUSD;
                                if (usage.cacheReadInputTokens) {
                                    current.usage.cacheReadInputTokens = (current.usage.cacheReadInputTokens ?? 0) + usage.cacheReadInputTokens;
                                }
                                if (usage.cacheCreationInputTokens) {
                                    current.usage.cacheCreationInputTokens = (current.usage.cacheCreationInputTokens ?? 0) + usage.cacheCreationInputTokens;
                                }
                                if (usage.cacheCreation5mInputTokens) {
                                    current.usage.cacheCreation5mInputTokens = (current.usage.cacheCreation5mInputTokens ?? 0) + usage.cacheCreation5mInputTokens;
                                }
                                if (usage.cacheCreation1hInputTokens) {
                                    current.usage.cacheCreation1hInputTokens = (current.usage.cacheCreation1hInputTokens ?? 0) + usage.cacheCreation1hInputTokens;
                                }
                                if (usage.webSearchRequests) {
                                    current.usage.webSearchRequests = (current.usage.webSearchRequests ?? 0) + usage.webSearchRequests;
                                }
                            }
                            else {
                                current.usage = { ...usage };
                            }
                            callbacks.onFileUpdate(name, filename, { usage: current.usage });
                        }
                    },
                    onLargePrompt: callbacks.onLargePrompt
                        ? (lineRange, chars, estimatedTokens) => {
                            callbacks.onLargePrompt?.(name, filename, lineRange, chars, estimatedTokens);
                        }
                        : undefined,
                    onPromptSize: callbacks.onPromptSize
                        ? (lineRange, systemChars, userChars, totalChars, estimatedTokens) => {
                            callbacks.onPromptSize?.(name, filename, lineRange, systemChars, userChars, totalChars, estimatedTokens);
                        }
                        : undefined,
                    onExtractionResult: callbacks.onExtractionResult
                        ? (lineRange, findingsCount, method) => {
                            callbacks.onExtractionResult?.(name, filename, lineRange, findingsCount, method);
                        }
                        : undefined,
                    onChunkComplete: callbacks.onChunkComplete
                        ? (chunk) => {
                            callbacks.onChunkComplete?.(skill.name, chunk);
                        }
                        : undefined,
                    onHunkFailed: callbacks.onHunkFailed
                        ? (lineRange, error) => {
                            callbacks.onHunkFailed?.(name, filename, lineRange, error);
                        }
                        : undefined,
                    onExtractionFailure: callbacks.onExtractionFailure
                        ? (lineRange, error, preview) => {
                            callbacks.onExtractionFailure?.(name, filename, lineRange, error, preview);
                        }
                        : undefined,
                    onRetry: callbacks.onRetry
                        ? (lineRange, attempt, maxRetries, error, delayMs) => {
                            callbacks.onRetry?.(name, filename, lineRange, attempt, maxRetries, error, delayMs);
                        }
                        : undefined,
                };
                const result = await analyzeFile(skill, prepared, context.repoPath, runnerOptions, fileCallbacks, prContext);
                // Detect if this file was aborted before any real work happened
                const fileDurationMs = Date.now() - fileStartTime;
                const aborted = runnerOptions.abortController?.signal.aborted ?? false;
                const noWork = !result.usage || (result.usage.inputTokens === 0 && result.usage.outputTokens === 0);
                const fileStatus = (aborted && noWork) ? 'skipped' : 'done';
                if (localState)
                    localState.status = fileStatus;
                callbacks.onFileUpdate(name, filename, {
                    status: fileStatus,
                    findings: result.findings,
                    usage: result.usage,
                    durationMs: fileDurationMs,
                });
                return {
                    findings: result.findings,
                    usage: result.usage,
                    durationMs: fileDurationMs,
                    failedHunks: result.failedHunks,
                    failedExtractions: result.failedExtractions,
                    hunkFailures: result.hunkFailures,
                    auxiliaryUsage: result.auxiliaryUsage,
                };
            };
            // Return an empty result for files skipped due to abort
            const processSkippedFile = (index) => {
                const localState = fileStates[index];
                if (localState)
                    localState.status = 'skipped';
                const filename = preparedFiles[index]?.filename ?? 'unknown';
                callbacks.onFileUpdate(name, filename, { status: 'skipped' });
                return { findings: [], durationMs: 0, failedHunks: 0, failedExtractions: 0, hunkFailures: [] };
            };
            // Process files with sliding-window concurrency pool
            const batchDelayMs = runnerOptions.batchDelayMs ?? 0;
            const shouldAbort = () => runnerOptions.abortController?.signal.aborted ?? false;
            // The effective concurrency for batch delay: when a semaphore gates work,
            // use its permit count (the actual concurrency limit) rather than fileConcurrency.
            const effectiveConcurrency = semaphore ? semaphore.initialPermits : fileConcurrency;
            const allResults = await (0,utils/* runPool */.kD)(preparedFiles, fileConcurrency, async (file, index) => {
                if (semaphore)
                    await semaphore.acquire();
                try {
                    // Check abort after acquiring the semaphore -- the file may have
                    // been queued behind others and a SIGINT could have arrived while waiting.
                    if (shouldAbort())
                        return processSkippedFile(index);
                    // Rate-limit: delay items beyond the first concurrent wave
                    if (index >= effectiveConcurrency && batchDelayMs > 0) {
                        await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
                    }
                    return await processFile(file, index);
                }
                finally {
                    if (semaphore)
                        semaphore.release();
                }
            }, { shouldAbort });
            // Mark never-dispatched files as skipped
            for (const fileState of fileStates) {
                if (fileState.status === 'pending') {
                    callbacks.onFileUpdate(name, fileState.filename, { status: 'skipped' });
                }
            }
            // Build report
            const duration = Date.now() - startTime;
            const allFindings = allResults.flatMap((r) => r.findings);
            const allUsage = allResults.map((r) => r.usage).filter((u) => u !== undefined);
            const allAuxEntries = allResults.flatMap((r) => r.auxiliaryUsage ?? []);
            const totalFailedHunks = allResults.reduce((sum, r) => sum + r.failedHunks, 0);
            const totalFailedExtractions = allResults.reduce((sum, r) => sum + r.failedExtractions, 0);
            const allHunkFailures = allResults.flatMap((r) => r.hunkFailures);
            const totalHunks = preparedFiles.reduce((sum, f) => sum + f.hunks.length, 0);
            // Each hunk contributes to at most one of failedHunks / failedExtractions
            // (mutually exclusive in analyzeFile), so summing them gives the total
            // failed-hunk count. Counting only analysis failures would miss the
            // scenario where every hunk's SDK call succeeded but every extraction
            // failed — a silent zero-findings run otherwise.
            const totalAttemptFailures = totalFailedHunks + totalFailedExtractions;
            const circuitReason = runnerOptions.circuitBreaker?.reason;
            if (totalHunks > 0
                && allFindings.length === 0
                && totalAttemptFailures > 0
                && (circuitReason
                    || (totalAttemptFailures === totalHunks
                        && !(runnerOptions.abortController?.signal.aborted ?? false)))) {
                const auxUsage = (0,sdk_usage/* aggregateAuxiliaryUsage */.RL)(allAuxEntries);
                const error = summarizeRunFailure({
                    totalHunks,
                    hunkFailures: allHunkFailures,
                    circuitReason,
                    runtime: runnerOptions.runtime,
                });
                const errorReport = {
                    skill: skill.name,
                    summary: `${skill.name}: failed (${error.code})`,
                    findings: [],
                    usage: (0,sdk_usage/* aggregateUsage */.Z$)(allUsage),
                    durationMs: duration,
                    model: runnerOptions?.model,
                    runtime,
                    // Preserve per-file metadata (timing, partial usage, attempted
                    // filenames) on failure runs too — `warden runs` and JSONL
                    // consumers iterate this array to count attempted files. Without
                    // it, a failed run shows totalFiles: 0.
                    files: preparedFiles.map((file, i) => {
                        const r = allResults[i];
                        return {
                            filename: file.filename,
                            findings: r?.findings.length ?? 0,
                            durationMs: r?.durationMs,
                            usage: r?.usage,
                        };
                    }),
                    failedHunks: totalFailedHunks,
                    hunkFailures: allHunkFailures,
                    error: {
                        code: error.code,
                        message: error.message,
                        timestamp: new Date().toISOString(),
                    },
                };
                if (totalFailedExtractions > 0)
                    errorReport.failedExtractions = totalFailedExtractions;
                if (skippedFiles.length > 0)
                    errorReport.skippedFiles = skippedFiles;
                if (auxUsage)
                    errorReport.auxiliaryUsage = auxUsage;
                span.setAttribute('warden.finding.count', 0);
                callbacks.onSkillError(name, error.message);
                // Mirror the success path: emit a final completion event with the
                // (errored) report so terminal renderers print the per-skill
                // summary line. Without this, console mode shows the error string
                // alone with no breakdown of timing, cost, or attempted files.
                callbacks.onSkillUpdate(name, {
                    status: 'error',
                    durationMs: duration,
                    findings: [],
                    usage: errorReport.usage,
                    auxiliaryUsage: errorReport.auxiliaryUsage,
                });
                callbacks.onSkillComplete(name, errorReport);
                // Carry a typed error alongside the report so consumers that re-throw
                // (action executor, Sentry.captureException) preserve the ErrorCode.
                const runnerError = new errors/* SkillRunnerError */.cy(error.message, { code: error.code });
                return { name, report: errorReport, error: runnerError, failOn, minConfidence };
            }
            const processed = await postProcessFindings(allFindings, {
                skill,
                repoPath: context.repoPath,
                apiKey: runnerOptions.apiKey,
                runtime: runnerOptions.runtime,
                auxiliaryModel: runnerOptions.auxiliaryModel,
                synthesisModel: runnerOptions.synthesisModel,
                auxiliaryMaxRetries: runnerOptions.auxiliaryMaxRetries,
                verifyFindings: runnerOptions.verifyFindings,
                maxTurns: runnerOptions.maxTurns,
                abortController: runnerOptions.abortController,
                pathToClaudeCodeExecutable: runnerOptions.pathToClaudeCodeExecutable,
                prContext,
                onFindingProcessing: (event) => {
                    callbacks.onFindingProcessing?.(name, event);
                },
            });
            const finalFindings = processed.findings;
            allAuxEntries.push(...processed.auxiliaryUsage);
            const report = {
                skill: skill.name,
                summary: generateSummary(skill.name, finalFindings),
                findings: finalFindings,
                usage: (0,sdk_usage/* aggregateUsage */.Z$)(allUsage),
                durationMs: duration,
                model: runnerOptions?.model,
                runtime,
                files: buildFileReports(preparedFiles.map((file, i) => {
                    const r = allResults[i];
                    return {
                        filename: file.filename,
                        durationMs: r?.durationMs,
                        usage: r?.usage,
                    };
                }), finalFindings),
            };
            if (skippedFiles.length > 0) {
                report.skippedFiles = skippedFiles;
            }
            if (totalFailedHunks > 0) {
                report.failedHunks = totalFailedHunks;
            }
            if (totalFailedExtractions > 0) {
                report.failedExtractions = totalFailedExtractions;
            }
            if (allHunkFailures.length > 0) {
                report.hunkFailures = allHunkFailures;
            }
            const auxUsage = (0,sdk_usage/* aggregateAuxiliaryUsage */.RL)(allAuxEntries);
            if (auxUsage) {
                report.auxiliaryUsage = auxUsage;
            }
            span.setAttribute('warden.finding.count', report.findings.length);
            // Emit metrics and log completion
            (0,sentry/* emitSkillMetrics */.s7)(report);
            sentry/* logger */.vF.info(sentry/* logger */.vF.fmt `Skill execution complete: ${displayName}`, {
                'warden.finding.count': report.findings.length,
                'duration_ms': report.durationMs,
            });
            // Notify skill complete
            callbacks.onSkillUpdate(name, {
                status: 'done',
                durationMs: duration,
                findings: finalFindings,
                usage: report.usage,
                auxiliaryUsage: report.auxiliaryUsage,
            });
            callbacks.onSkillComplete(name, report);
            return { name, report, failOn, minConfidence };
        }
        catch (err) {
            const { code, message } = (0,errors/* classifyError */.fe)(err);
            callbacks.onSkillError(name, message);
            // Use the resolved skill name when available so JSONL output matches
            // the success path's identifier. Falls back to the trigger name only
            // when resolveSkill itself threw.
            const skillName = resolvedSkillName ?? name;
            const errorReport = {
                skill: skillName,
                summary: `${skillName}: failed (${code})`,
                findings: [],
                durationMs: Date.now() - startTime,
                model: runnerOptions?.model,
                runtime,
                error: { code, message, timestamp: new Date().toISOString() },
            };
            span.setAttribute('warden.finding.count', 0);
            // Mirror the success / all-hunks-fail paths: emit a final completion
            // event so non-TTY (log-mode) renderers print a per-skill summary
            // line for the failure. Without this, log mode shows only the
            // bare error string with no timing or duration.
            callbacks.onSkillUpdate(name, {
                status: 'error',
                durationMs: errorReport.durationMs,
                findings: [],
            });
            callbacks.onSkillComplete(name, errorReport);
            return { name, report: errorReport, error: err, failOn, minConfidence };
        }
    });
}
/**
 * Create default progress callbacks for console output.
 * In TTY mode: colored icons, chalk formatting.
 * In non-TTY/log mode: timestamped lines with finding details.
 */
function createDefaultCallbacks(tasks, mode, verbosity) {
    /** Resolve the display name for a skill, falling back to the raw name. */
    function displayNameFor(name) {
        return tasks.find((t) => t.name === name)?.displayName ?? name;
    }
    /** Track per-skill skipped file counts for collapsed summary in non-TTY mode. */
    const skippedCounts = new Map();
    // Skipped skills also fire onSkillComplete (for the JSONL writer).
    // Suppress the duplicate "completed" line for those names.
    const skippedSkills = new Set();
    return {
        onSkillStart: (skill) => {
            if (verbosity === verbosity_Verbosity.Quiet)
                return;
            if (!mode.isTTY) {
                const fileCount = skill.files.length;
                logPlain(`Running ${displayNameFor(skill.name)} (${fileCount} ${pluralize(fileCount, 'file')})...`);
            }
        },
        onSkillUpdate: () => { },
        onFileUpdate: (_skillName, filename, updates) => {
            if (updates.status === 'skipped') {
                skippedCounts.set(_skillName, (skippedCounts.get(_skillName) ?? 0) + 1);
                return;
            }
            if (verbosity === verbosity_Verbosity.Quiet || mode.isTTY)
                return;
            if (updates.status !== 'done')
                return;
            const duration = updates.durationMs !== undefined ? formatDuration(updates.durationMs) : '?';
            const cost = updates.usage ? ` ${formatCost(updates.usage.costUSD)}` : '';
            const n = updates.findings?.length ?? 0;
            const suffix = n > 0 ? ` ${n} ${pluralize(n, 'finding')}` : '';
            logPlain(`  ${displayNameFor(_skillName)} > ${filename} done ${duration}${cost}${suffix}`);
        },
        onHunkStart: (skillName, filename, hunkNum, totalHunks, lineRange) => {
            if (verbosity === verbosity_Verbosity.Quiet || mode.isTTY)
                return;
            logPlain(`  ${displayNameFor(skillName)} > ${filename} [${hunkNum}/${totalHunks}] ${lineRange}`);
        },
        onSkillComplete: (name, report) => {
            if (verbosity === verbosity_Verbosity.Quiet)
                return;
            if (skippedSkills.has(name))
                return;
            const displayName = displayNameFor(name);
            // Errored runs render as failures, not as misleading "completed -
            // 0 findings" lines with a green checkmark. onSkillError already
            // printed the error message; this line carries timing only.
            if (report.error) {
                if (mode.isTTY) {
                    const duration = report.durationMs !== undefined ? ` ${source/* default */.Ay.dim(`[${formatDuration(report.durationMs)}]`)}` : '';
                    console.error(`${source/* default */.Ay.red('✗')} ${displayName}${duration} ${source/* default */.Ay.red(`(${report.error.code})`)}`);
                }
                else {
                    const duration = report.durationMs !== undefined ? formatDuration(report.durationMs) : '?';
                    logPlain(`${displayName} failed in ${duration} (${report.error.code})`);
                }
                return;
            }
            if (mode.isTTY) {
                const duration = report.durationMs !== undefined ? ` ${source/* default */.Ay.dim(`[${formatDuration(report.durationMs)}]`)}` : '';
                console.error(`${source/* default */.Ay.green(ICON_CHECK)} ${displayName}${duration}`);
                // Debug: log finding details
                if (verbosity >= verbosity_Verbosity.Debug && report.findings.length > 0) {
                    for (const finding of report.findings) {
                        debugLog(mode, `${formatSeverityPlain(finding.severity)} ${findingLocation(finding)}: ${finding.title}`);
                        if (finding.suggestedFix) {
                            debugLog(mode, `  fix: ${finding.suggestedFix.description}`);
                        }
                    }
                }
            }
            else {
                // Log mode: timestamped completion with duration and finding summary
                const duration = report.durationMs !== undefined ? formatDuration(report.durationMs) : '?';
                const counts = countBySeverity(report.findings);
                const summary = formatFindingCountsPlain(counts);
                logPlain(`${displayName} completed in ${duration} - ${summary}`);
                // Show per-finding lines at Verbose+ verbosity in log mode
                // (the final report already shows findings with full detail)
                if (verbosity >= verbosity_Verbosity.Verbose) {
                    for (const finding of report.findings) {
                        logPlain(`  ${formatSeverityPlain(finding.severity)} ${findingLocation(finding)}: ${finding.title}`);
                        if (verbosity >= verbosity_Verbosity.Debug && finding.suggestedFix) {
                            logPlain(`    fix: ${finding.suggestedFix.description}`);
                        }
                    }
                }
                const skipped = skippedCounts.get(name) ?? 0;
                if (skipped > 0) {
                    logPlain(`  ${skipped} ${pluralize(skipped, 'file')} skipped`);
                }
            }
        },
        onSkillSkipped: (name) => {
            skippedSkills.add(name);
            if (verbosity === verbosity_Verbosity.Quiet)
                return;
            const displayName = displayNameFor(name);
            if (mode.isTTY) {
                console.error(`${source/* default */.Ay.yellow(ICON_SKIPPED)} ${displayName} ${source/* default */.Ay.dim('[skipped]')}`);
            }
            else {
                logPlain(`${displayName} skipped`);
            }
        },
        onSkillError: (name, error) => {
            if (verbosity === verbosity_Verbosity.Quiet)
                return;
            const displayName = displayNameFor(name);
            if (mode.isTTY) {
                console.error(`${source/* default */.Ay.red('\u2717')} ${displayName} - ${source/* default */.Ay.red(error)}`);
            }
            else {
                logPlain(`ERROR: ${displayName} - ${error}`);
                const skipped = skippedCounts.get(name) ?? 0;
                if (skipped > 0) {
                    logPlain(`  ${skipped} ${pluralize(skipped, 'file')} skipped`);
                }
            }
        },
        // Warn about large prompts (always shown unless quiet)
        onLargePrompt: (_skillName, filename, lineRange, chars, estimatedTokens) => {
            if (verbosity === verbosity_Verbosity.Quiet)
                return;
            const location = `${filename}:${lineRange}`;
            const size = `${Math.round(chars / 1000)}k chars (~${Math.round(estimatedTokens / 1000)}k tokens)`;
            if (mode.isTTY) {
                console.error(`${source/* default */.Ay.yellow(node_modules_figures/* default */.Ay.warning)}  Large prompt for ${location}: ${size}`);
            }
            else {
                logPlain(`WARN: Large prompt for ${location}: ${size}`);
            }
        },
        // Debug mode: show prompt sizes
        onPromptSize: verbosity >= verbosity_Verbosity.Debug
            ? (_skillName, filename, lineRange, systemChars, userChars, totalChars, estimatedTokens) => {
                const location = `${filename}:${lineRange}`;
                debugLog(mode, `Prompt for ${location}: system=${systemChars}, user=${userChars}, total=${totalChars} chars (~${estimatedTokens} tokens)`);
            }
            : undefined,
        // Debug mode: show extraction results
        onExtractionResult: verbosity >= verbosity_Verbosity.Debug
            ? (_skillName, filename, lineRange, findingsCount, method) => {
                debugLog(mode, `Extracted ${findingsCount} ${pluralize(findingsCount, 'finding')} from ${filename}:${lineRange} via ${method}`);
            }
            : undefined,
        onFindingProcessing: verbosity >= verbosity_Verbosity.Debug
            ? (_skillName, event) => {
                debugLog(mode, formatFindingProcessingEvent(event));
            }
            : undefined,
        // Verbose mode: show per-hunk analysis failures (spec: event #16 hunk_failed)
        onHunkFailed: verbosity >= verbosity_Verbosity.Verbose
            ? (_skillName, filename, lineRange, error) => {
                const location = `${filename}:${lineRange}`;
                if (mode.isTTY) {
                    console.error(`${source/* default */.Ay.yellow(node_modules_figures/* default */.Ay.warning)}  Chunk failed: ${location} ${source/* default */.Ay.dim(`\u2014 ${error}`)}`);
                }
                else {
                    logPlain(`WARN: Chunk failed: ${location} \u2014 ${error}`);
                }
            }
            : undefined,
        // Verbose mode: show per-hunk extraction failures (spec: event #17 extraction_failure)
        onExtractionFailure: verbosity >= verbosity_Verbosity.Verbose
            ? (_skillName, filename, lineRange, error, preview) => {
                const location = `${filename}:${lineRange}`;
                if (mode.isTTY) {
                    console.error(`${source/* default */.Ay.yellow(node_modules_figures/* default */.Ay.warning)}  Extraction failed: ${location} ${source/* default */.Ay.dim(`\u2014 ${error}`)}`);
                    if (verbosity >= verbosity_Verbosity.Debug && preview) {
                        debugLog(mode, `  Output preview: ${preview.slice(0, 200)}`);
                    }
                }
                else {
                    logPlain(`WARN: Extraction failed: ${location} \u2014 ${error}`);
                    if (verbosity >= verbosity_Verbosity.Debug && preview) {
                        logPlain(`DEBUG: Output preview: ${preview.slice(0, 200)}`);
                    }
                }
            }
            : undefined,
        // Verbose mode: show retry attempts (spec: event #18 retry)
        onRetry: verbosity >= verbosity_Verbosity.Verbose
            ? (_skillName, filename, lineRange, attempt, maxRetries, error, delayMs) => {
                const location = `${filename}:${lineRange}`;
                const retryInfo = `attempt ${attempt}/${maxRetries}`;
                const delay = delayMs > 0 ? `, retrying in ${Math.round(delayMs / 1000)}s` : '';
                if (mode.isTTY) {
                    debugLog(mode, `Retry ${location} (${retryInfo}${delay}): ${error}`);
                }
                else {
                    logPlain(`WARN: Retry ${location} (${retryInfo}${delay}): ${error}`);
                }
            }
            : undefined,
    };
}
function composeAbortControllers(...controllers) {
    const composed = new AbortController();
    for (const ctrl of controllers) {
        if (ctrl?.signal.aborted) {
            composed.abort();
            return composed;
        }
        ctrl?.signal.addEventListener('abort', () => composed.abort(), { once: true });
    }
    return composed;
}
/**
 * Share abort/circuit state across task runner options.
 */
function composeTasksWithFailFast(tasks, failFastController, circuitBreaker, circuitAbortController) {
    if (!failFastController && !circuitBreaker && !circuitAbortController)
        return tasks;
    return tasks.map((task) => ({
        ...task,
        runnerOptions: {
            ...task.runnerOptions,
            abortController: composeAbortControllers(task.runnerOptions?.abortController, failFastController, circuitAbortController),
            circuitBreaker: task.runnerOptions?.circuitBreaker ?? circuitBreaker,
        },
    }));
}
/**
 * Launch all skill tasks in parallel using a shared semaphore for concurrency.
 */
async function runComposedSkillTasks(tasks, callbacks, semaphore) {
    const results = await runPool(tasks, tasks.length, (task) => runSkillTask(task, Number.MAX_SAFE_INTEGER, callbacks, semaphore), { shouldAbort: () => tasks[0]?.runnerOptions?.abortController?.signal.aborted ?? false });
    return results;
}
/**
 * Run multiple skill tasks with optional concurrency.
 * Uses callbacks to report progress for Ink rendering.
 */
async function runSkillTasks(tasks, options, callbacks) {
    const { mode, verbosity, concurrency, failFastController, onSkillComplete, onChunkComplete } = options;
    // Global semaphore gates file-level work across all skills.
    // All skills launch immediately so the UI shows them as "running",
    // but only `concurrency` files will be analysed at any time.
    const semaphore = new Semaphore(concurrency);
    const effectiveCallbacks = callbacks ?? createDefaultCallbacks(tasks, mode, verbosity);
    const wrappedCallbacks = {
        ...effectiveCallbacks,
        ...(onSkillComplete || failFastController
            ? {
                onSkillComplete: (name, report) => {
                    effectiveCallbacks.onSkillComplete(name, report);
                    try {
                        onSkillComplete?.(report);
                    }
                    catch { /* streaming hook must not break the run */ }
                    if (failFastController && report.findings.length > 0) {
                        failFastController.abort();
                    }
                },
            }
            : {}),
        ...(onChunkComplete
            ? {
                onChunkComplete: (name, chunk) => {
                    effectiveCallbacks.onChunkComplete?.(name, chunk);
                    try {
                        onChunkComplete(name, chunk);
                    }
                    catch { /* streaming hook must not break the run */ }
                },
            }
            : {}),
    };
    // Output SKILLS header (TTY only - in log mode, "Running..." lines are sufficient)
    if (verbosity !== Verbosity.Quiet && tasks.length > 0 && mode.isTTY) {
        console.error(chalk.bold('SKILLS'));
    }
    const circuitAbortController = new AbortController();
    const circuitBreaker = new ProviderFailureCircuitBreaker({ abortController: circuitAbortController });
    const composedTasks = composeTasksWithFailFast(tasks, failFastController, circuitBreaker, circuitAbortController);
    // Listen for abort signal to show interrupt message (non-TTY only; Ink handles TTY)
    const abortSignal = composedTasks[0]?.runnerOptions?.abortController?.signal;
    if (abortSignal && !abortSignal.aborted && !mode.isTTY && verbosity !== Verbosity.Quiet) {
        abortSignal.addEventListener('abort', () => {
            // Only show interrupt message for user SIGINT, not fail-fast
            if (!failFastController?.signal.aborted && !circuitAbortController.signal.aborted) {
                logPlain('Interrupted, finishing up... (press Ctrl+C again to force exit)');
            }
        }, { once: true });
    }
    // Show fail-fast message when triggered (non-TTY only)
    if (failFastController && !mode.isTTY && verbosity !== Verbosity.Quiet) {
        failFastController.signal.addEventListener('abort', () => {
            logPlain('Stopping \u2014 finding detected (--fail-fast)');
        }, { once: true });
    }
    // Launch all skills in parallel; the semaphore is the sole concurrency gate.
    return runComposedSkillTasks(composedTasks, wrappedCallbacks, semaphore);
}

;// CONCATENATED MODULE: ./src/output/renderer.ts




function renderSkillReport(report, options = {}) {
    const { includeSuggestions = true, maxFindings, groupByFile = true, reportOn, minConfidence, failOn, requestChanges, checkRunUrl, totalFindings, allFindings } = options;
    // Filter by reportOn threshold and confidence, then apply maxFindings limit
    const filteredFindings = (0,types/* filterFindings */.Ni)(report.findings, reportOn, minConfidence);
    const findings = maxFindings ? filteredFindings.slice(0, maxFindings) : filteredFindings;
    const sortedFindings = [...findings].sort((a, b) => types/* SEVERITY_ORDER */.B[a.severity] - types/* SEVERITY_ORDER */.B[b.severity]);
    // Calculate how many findings were filtered out
    const total = totalFindings ?? report.findings.length;
    const hiddenCount = total - sortedFindings.length;
    // Use allFindings for failOn evaluation if provided (e.g., when report.findings was modified for dedup)
    // Apply confidence filtering to failOn evaluation too
    const findingsForFailOn = (0,types/* filterFindings */.Ni)(allFindings ?? report.findings, undefined, minConfidence);
    const review = renderReview(sortedFindings, report, includeSuggestions, failOn, findingsForFailOn, requestChanges);
    const summaryComment = renderSummaryComment(report, sortedFindings, groupByFile, checkRunUrl, hiddenCount);
    return { review, summaryComment };
}
function renderReview(findings, report, includeSuggestions, failOn, allFindings, requestChanges) {
    const findingsWithLocation = findings.filter((f) => f.location);
    const findingsWithoutLocation = findings.filter((f) => !f.location);
    // Determine review event type based on failOn threshold against ALL findings.
    // Use allFindings (or report.findings) so failOn operates independently of reportOn and deduplication.
    const event = determineReviewEvent(allFindings ?? report.findings, failOn, requestChanges);
    // No inline comments to post. Create a review only for REQUEST_CHANGES or locationless findings.
    if (findingsWithLocation.length === 0) {
        if (findingsWithoutLocation.length > 0) {
            return {
                event,
                body: renderFindingsBody(findingsWithoutLocation, report.skill),
                comments: [],
            };
        }
        // Generic fallback for REQUEST_CHANGES when failOn triggers on findings below reportOn threshold
        if (event === 'REQUEST_CHANGES') {
            return {
                event,
                body: 'Findings exceed the configured threshold. See the GitHub Check for details.',
                comments: [],
            };
        }
        return undefined;
    }
    const comments = findingsWithLocation.map((finding) => {
        const location = finding.location;
        if (!location) {
            throw new Error('Unexpected: finding without location in filtered list');
        }
        let body = `**${(0,utils/* escapeHtml */.ZD)(finding.title)}**\n\n${(0,utils/* escapeHtml */.ZD)(finding.description)}`;
        if (finding.verification) {
            body += `\n\n${renderVerification(finding.verification)}`;
        }
        if (includeSuggestions && finding.suggestedFix) {
            body += `\n\n${renderSuggestion(finding.suggestedFix.description, finding.suggestedFix.diff)}`;
        }
        // Additional locations section
        if (finding.additionalLocations?.length) {
            body += '\n\n<details><summary>Also found at ' +
                `${finding.additionalLocations.length} additional ` +
                pluralize(finding.additionalLocations.length, 'location') +
                '</summary>\n\n';
            for (const loc of finding.additionalLocations) {
                const range = loc.endLine ? `${loc.startLine}-${loc.endLine}` : `${loc.startLine}`;
                body += `- \`${loc.path}:${range}\`\n`;
            }
            body += '\n</details>';
        }
        // Add attribution footer with skill name and finding ID
        body += `\n\n${renderAttributionFooter(report.skill, finding.id)}`;
        // Add deduplication marker
        const contentHash = generateContentHash(finding.title, finding.description);
        const line = location.endLine ?? location.startLine;
        body += `\n${generateMarker(location.path, line, contentHash)}`;
        const isMultiLine = location.endLine && location.startLine !== location.endLine;
        return {
            body,
            path: location.path,
            line: location.endLine ?? location.startLine,
            side: 'RIGHT',
            start_line: isMultiLine ? location.startLine : undefined,
            start_side: isMultiLine ? 'RIGHT' : undefined,
        };
    });
    // Include locationless findings in the review body when mixed with inline comments
    const body = findingsWithoutLocation.length > 0
        ? renderFindingsBody(findingsWithoutLocation, report.skill)
        : '';
    return {
        event,
        body,
        comments,
    };
}
/**
 * Determine the PR review event type based on failOn threshold.
 * Returns:
 * - REQUEST_CHANGES if failOn is set and findings meet/exceed the threshold
 * - COMMENT otherwise
 *
 * Clearing a previous REQUEST_CHANGES is handled by dismissing the review
 * in the PR workflow, not by posting an APPROVE.
 */
function determineReviewEvent(findings, failOn, requestChanges) {
    if (!requestChanges)
        return 'COMMENT';
    const hasActiveThreshold = failOn && failOn !== 'off';
    const hasBlockingFinding = hasActiveThreshold &&
        findings.some((f) => types/* SEVERITY_ORDER */.B[f.severity] <= types/* SEVERITY_ORDER */.B[failOn]);
    if (hasBlockingFinding) {
        return 'REQUEST_CHANGES';
    }
    return 'COMMENT';
}
function renderSuggestion(description, diff) {
    const suggestionLines = diff
        .split('\n')
        .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
        .map((line) => line.slice(1));
    if (suggestionLines.length === 0) {
        return `**Suggested fix:** ${(0,utils/* escapeHtml */.ZD)(description)}`;
    }
    return `**Suggested fix:** ${(0,utils/* escapeHtml */.ZD)(description)}\n\n\`\`\`suggestion\n${suggestionLines.join('\n')}\n\`\`\``;
}
function renderVerification(verification) {
    return `<details><summary>Verification</summary>\n\n${(0,utils/* escapeHtml */.ZD)(verification)}\n\n</details>`;
}
function renderHiddenFindingsLink(hiddenCount, checkRunUrl) {
    return `[View ${hiddenCount} additional ${pluralize(hiddenCount, 'finding')} in Checks](${checkRunUrl})`;
}
function renderAttributionFooter(skill, findingId) {
    const idSuffix = findingId ? ` · ${(0,utils/* escapeHtml */.ZD)(findingId)}` : '';
    return `<sub>Identified by Warden ${(0,utils/* escapeHtml */.ZD)(skill)}${idSuffix}</sub>`;
}
function renderSummaryComment(report, findings, groupByFile, checkRunUrl, hiddenCount) {
    const lines = [];
    lines.push(`## ${report.skill}`);
    lines.push('');
    lines.push((0,utils/* escapeHtml */.ZD)(report.summary));
    lines.push('');
    if (findings.length === 0) {
        lines.push('No findings to report.');
    }
    else {
        const counts = countBySeverity(findings);
        lines.push('### Summary');
        lines.push('');
        lines.push(`| Severity | Count |
|----------|-------|
${Object.entries(counts)
            .filter(([, count]) => count > 0)
            .sort(([a], [b]) => types/* SEVERITY_ORDER */.B[a] - types/* SEVERITY_ORDER */.B[b])
            .map(([severity, count]) => `| ${capitalize(severity)} | ${count} |`)
            .join('\n')}`);
        lines.push('');
        lines.push('### Findings');
        lines.push('');
        if (groupByFile) {
            const byFile = groupFindingsByFile(findings);
            for (const [file, fileFindings] of Object.entries(byFile)) {
                lines.push(`#### \`${file}\``);
                lines.push('');
                for (const finding of fileFindings) {
                    lines.push(renderFindingItem(finding));
                }
                lines.push('');
            }
            const noLocation = findings.filter((f) => !f.location);
            if (noLocation.length > 0) {
                lines.push('#### General');
                lines.push('');
                for (const finding of noLocation) {
                    lines.push(renderFindingItem(finding));
                }
            }
        }
        else {
            for (const finding of findings) {
                lines.push(renderFindingItem(finding));
            }
        }
    }
    // Add link to full report if there are hidden findings
    if (hiddenCount && hiddenCount > 0 && checkRunUrl) {
        lines.push('');
        lines.push(renderHiddenFindingsLink(hiddenCount, checkRunUrl));
    }
    // Add stats footer
    const statsLine = formatStatsCompact(report.durationMs, report.usage, report.auxiliaryUsage);
    if (statsLine) {
        lines.push('', '---', `<sub>${statsLine}</sub>`);
    }
    return lines.join('\n');
}
function formatLineRange(loc) {
    if (loc.endLine && loc.endLine !== loc.startLine) {
        return `L${loc.startLine}-${loc.endLine}`;
    }
    return `L${loc.startLine}`;
}
function renderFindingItem(finding) {
    const location = finding.location ? ` (${formatLineRange(finding.location)})` : '';
    const extra = finding.additionalLocations?.length
        ? ` (+${finding.additionalLocations.length} more ${pluralize(finding.additionalLocations.length, 'location')})`
        : '';
    return `- \`${finding.id}\` **${(0,utils/* escapeHtml */.ZD)(finding.title)}**${location}${extra} · ${finding.severity}: ${(0,utils/* escapeHtml */.ZD)(finding.description)}`;
}
/** Render findings as markdown for inclusion in a review body. */
function renderFindingsBody(findings, skill) {
    const lines = [];
    for (const finding of findings) {
        const location = finding.location
            ? ` (\`${finding.location.path}:${finding.location.startLine}\`)`
            : '';
        lines.push(`**${(0,utils/* escapeHtml */.ZD)(finding.title)}**${location}`);
        lines.push('');
        lines.push((0,utils/* escapeHtml */.ZD)(finding.description));
        lines.push('');
        if (finding.verification) {
            lines.push(renderVerification(finding.verification));
            lines.push('');
        }
    }
    lines.push(renderAttributionFooter(skill));
    return lines.join('\n');
}
function groupFindingsByFile(findings) {
    const groups = {};
    for (const finding of findings) {
        if (finding.location) {
            const path = finding.location.path;
            groups[path] ??= [];
            groups[path].push(finding);
        }
    }
    return groups;
}

;// CONCATENATED MODULE: ./src/output/github-checks.ts



/**
 * Maximum number of annotations per API call (GitHub limit).
 */
const MAX_ANNOTATIONS_PER_REQUEST = 50;
/**
 * Map severity levels to GitHub annotation levels.
 * high -> failure, medium -> warning, low -> notice
 */
function severityToAnnotationLevel(severity) {
    switch (severity) {
        case 'high':
            return 'failure';
        case 'medium':
            return 'warning';
        case 'low':
            return 'notice';
    }
}
/**
 * Convert findings to GitHub Check annotations.
 * Only findings with locations can be converted to annotations.
 * Returns at most MAX_ANNOTATIONS_PER_REQUEST annotations.
 * If reportOn is specified, only include findings at or above that severity.
 */
function findingsToAnnotations(findings, reportOn, minConfidence) {
    // Filter by reportOn threshold and confidence if specified
    const filtered = (0,types/* filterFindings */.Ni)(findings, reportOn, minConfidence);
    // Filter to findings with location using type predicate
    const withLocation = filtered.filter((f) => Boolean(f.location));
    // Sort by severity (most severe first)
    const sorted = [...withLocation].sort((a, b) => types/* SEVERITY_ORDER */.B[a.severity] - types/* SEVERITY_ORDER */.B[b.severity]);
    // Limit to max annotations
    const limited = sorted.slice(0, MAX_ANNOTATIONS_PER_REQUEST);
    const annotations = [];
    for (const finding of limited) {
        if (annotations.length >= MAX_ANNOTATIONS_PER_REQUEST)
            break;
        // Primary location annotation
        annotations.push({
            path: finding.location.path,
            start_line: finding.location.startLine,
            end_line: finding.location.endLine ?? finding.location.startLine,
            annotation_level: severityToAnnotationLevel(finding.severity),
            message: (0,utils/* escapeHtml */.ZD)(finding.description),
            title: (0,utils/* escapeHtml */.ZD)(finding.title),
        });
        // Additional location annotations
        if (finding.additionalLocations) {
            for (const loc of finding.additionalLocations) {
                if (annotations.length >= MAX_ANNOTATIONS_PER_REQUEST)
                    break;
                annotations.push({
                    path: loc.path,
                    start_line: loc.startLine,
                    end_line: loc.endLine ?? loc.startLine,
                    annotation_level: severityToAnnotationLevel(finding.severity),
                    message: (0,utils/* escapeHtml */.ZD)(finding.description),
                    title: `[${finding.id}] ${(0,utils/* escapeHtml */.ZD)(finding.title)} (additional location)`,
                });
            }
        }
    }
    return annotations;
}
/**
 * Determine the check conclusion based on findings and failOn threshold.
 * - No findings: success
 * - Findings, none >= failOn: neutral
 * - Findings >= failOn threshold: failure
 */
function determineConclusion(findings, failOn, failCheck) {
    if (findings.length === 0) {
        return 'success';
    }
    if (!failOn || failOn === 'off') {
        // No failure threshold or disabled, findings exist but don't cause failure
        return 'neutral';
    }
    const failOnOrder = types/* SEVERITY_ORDER */.B[failOn];
    const hasFailingSeverity = findings.some((f) => types/* SEVERITY_ORDER */.B[f.severity] <= failOnOrder);
    return hasFailingSeverity && failCheck ? 'failure' : 'neutral';
}
/**
 * Create a check run for a skill.
 * The check is created with status: in_progress.
 */
async function createSkillCheck(octokit, skillName, options) {
    const { data } = await octokit.checks.create({
        owner: options.owner,
        repo: options.repo,
        name: `warden: ${skillName}`,
        head_sha: options.headSha,
        status: 'in_progress',
        started_at: new Date().toISOString(),
    });
    return {
        checkRunId: data.id,
        url: data.html_url ?? '',
    };
}
/**
 * Update a skill check with results.
 * Completes the check with conclusion, summary, and annotations.
 */
async function updateSkillCheck(octokit, checkRunId, report, options) {
    // Conclusion is based on confidence-filtered findings (consistent with CLI path)
    const filteredForConclusion = (0,types/* filterFindings */.Ni)(report.findings, undefined, options.minConfidence);
    const conclusion = determineConclusion(filteredForConclusion, options.failOn, options.failCheck);
    // Annotations are filtered by reportOn threshold and confidence
    const annotations = findingsToAnnotations(report.findings, options.reportOn, options.minConfidence);
    const summary = buildSkillSummary(report);
    const filteredCount = filteredForConclusion.length;
    const title = filteredCount === 0
        ? 'No issues'
        : `${filteredCount} issue${filteredCount === 1 ? '' : 's'}`;
    await octokit.checks.update({
        owner: options.owner,
        repo: options.repo,
        check_run_id: checkRunId,
        status: 'completed',
        conclusion,
        completed_at: new Date().toISOString(),
        output: {
            title,
            summary,
            annotations,
        },
    });
}
/**
 * Mark a skill check as failed due to execution error.
 */
async function failSkillCheck(octokit, checkRunId, error, options) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await octokit.checks.update({
        owner: options.owner,
        repo: options.repo,
        check_run_id: checkRunId,
        status: 'completed',
        conclusion: 'failure',
        completed_at: new Date().toISOString(),
        output: {
            title: 'Skill execution failed',
            summary: `Error: ${errorMessage}`,
        },
    });
}
/**
 * Create the core warden check run.
 * The check is created with status: in_progress.
 */
async function createCoreCheck(octokit, options) {
    const { data } = await octokit.checks.create({
        owner: options.owner,
        repo: options.repo,
        name: 'warden',
        head_sha: options.headSha,
        status: 'in_progress',
        started_at: new Date().toISOString(),
    });
    return {
        checkRunId: data.id,
        url: data.html_url ?? '',
    };
}
/**
 * Update the core warden check with overall summary.
 */
async function updateCoreCheck(octokit, checkRunId, summaryData, conclusion, options) {
    const summary = buildCoreSummary(summaryData);
    const title = summaryData.totalFindings === 0
        ? 'No issues'
        : `${summaryData.totalFindings} issue${summaryData.totalFindings === 1 ? '' : 's'}`;
    await octokit.checks.update({
        owner: options.owner,
        repo: options.repo,
        check_run_id: checkRunId,
        status: 'completed',
        conclusion,
        completed_at: new Date().toISOString(),
        output: {
            title,
            summary,
        },
    });
}
/**
 * Format a file location as a markdown code span.
 */
function github_checks_formatLocation(location) {
    const { path, startLine, endLine } = location;
    const lineRange = endLine && endLine !== startLine ? `${startLine}-${endLine}` : `${startLine}`;
    return `\`${path}:${lineRange}\``;
}
/**
 * Render findings grouped by severity as collapsible markdown sections.
 */
function renderFindingsSections(findings) {
    const lines = [];
    const findingsBySeverity = new Map();
    for (const finding of findings) {
        const existing = findingsBySeverity.get(finding.severity) ?? [];
        existing.push(finding);
        findingsBySeverity.set(finding.severity, existing);
    }
    const severityOrder = ['high', 'medium', 'low'];
    for (const severity of severityOrder) {
        const group = findingsBySeverity.get(severity);
        if (!group?.length)
            continue;
        const label = severity.charAt(0).toUpperCase() + severity.slice(1);
        lines.push(`### ${label}`, '');
        for (const finding of group) {
            const location = finding.location ? ` - ${github_checks_formatLocation(finding.location)}` : '';
            lines.push('<details>');
            lines.push(`<summary><strong>${(0,utils/* escapeHtml */.ZD)(finding.title)}</strong>${location}</summary>`, '');
            lines.push((0,utils/* escapeHtml */.ZD)(finding.description), '');
            if (finding.additionalLocations?.length) {
                lines.push('Also found at:');
                for (const loc of finding.additionalLocations) {
                    lines.push(`- ${github_checks_formatLocation(loc)}`);
                }
                lines.push('');
            }
            lines.push('</details>', '');
        }
    }
    return lines;
}
/**
 * Render a stats footer line (duration, tokens, cost).
 */
function renderStatsFooter(durationMs, usage, auxiliaryUsage) {
    const cost = totalUsageCost(usage, auxiliaryUsage);
    if (durationMs === undefined && !usage && cost === undefined)
        return [];
    const parts = [];
    if (durationMs !== undefined) {
        parts.push(`⏱ ${formatDuration(durationMs)}`);
    }
    if (usage) {
        parts.push(`${formatTokens(usage.inputTokens)} in / ${formatTokens(usage.outputTokens)} out`);
    }
    if (cost !== undefined) {
        parts.push(`${formatCost(cost)}`);
    }
    return ['---', `<sub>${parts.join(' · ')}</sub>`];
}
/**
 * Build the summary markdown for a skill check.
 */
function buildSkillSummary(report) {
    const lines = [(0,utils/* escapeHtml */.ZD)(report.summary), ''];
    if (report.findings.length === 0) {
        lines.push('No issues found.');
    }
    else {
        const sortedFindings = [...report.findings].sort((a, b) => types/* SEVERITY_ORDER */.B[a.severity] - types/* SEVERITY_ORDER */.B[b.severity]);
        lines.push(...renderFindingsSections(sortedFindings));
    }
    lines.push(...renderStatsFooter(report.durationMs, report.usage, report.auxiliaryUsage));
    return lines.join('\n');
}
/** Maximum findings to show in the summary */
const MAX_SUMMARY_FINDINGS = 10;
/**
 * Build the summary markdown for the core warden check.
 */
function buildCoreSummary(data) {
    const lines = [];
    // Sort findings by severity and take top N
    const sortedFindings = [...data.findings].sort((a, b) => types/* SEVERITY_ORDER */.B[a.severity] - types/* SEVERITY_ORDER */.B[b.severity]);
    const topFindings = sortedFindings.slice(0, MAX_SUMMARY_FINDINGS);
    if (topFindings.length > 0) {
        lines.push(...renderFindingsSections(topFindings));
        if (data.totalFindings > topFindings.length) {
            const remaining = data.totalFindings - topFindings.length;
            lines.push(`*...and ${remaining} more*`, '');
        }
    }
    else {
        lines.push('No issues found.', '');
    }
    // Skills table in collapsible section
    const hasSkillStats = data.skillResults.some((s) => s.durationMs !== undefined || s.usage || s.auxiliaryUsage);
    const skillPlural = data.totalSkills === 1 ? '' : 's';
    lines.push('<details>');
    lines.push(`<summary>${data.totalSkills} skill${skillPlural} analyzed</summary>`, '');
    if (hasSkillStats) {
        lines.push('| Skill | Findings | Duration | Cost |', '|-------|----------|----------|------|');
        for (const skill of data.skillResults) {
            const duration = skill.durationMs !== undefined ? formatDuration(skill.durationMs) : '-';
            const costUSD = totalUsageCost(skill.usage, skill.auxiliaryUsage);
            const cost = costUSD !== undefined ? formatCost(costUSD) : '-';
            lines.push(`| ${skill.name} | ${skill.findingCount} | ${duration} | ${cost} |`);
        }
    }
    else {
        lines.push('| Skill | Findings |', '|-------|----------|');
        for (const skill of data.skillResults) {
            lines.push(`| ${skill.name} | ${skill.findingCount} |`);
        }
    }
    lines.push('', '</details>', '');
    lines.push(...renderStatsFooter(data.totalDurationMs, data.totalUsage, data.totalAuxiliaryUsage));
    return lines.join('\n');
}
/**
 * Aggregate severity counts from multiple reports.
 */
function aggregateSeverityCounts(reports) {
    const counts = {
        high: 0,
        medium: 0,
        low: 0,
    };
    for (const report of reports) {
        for (const finding of report.findings) {
            counts[finding.severity]++;
        }
    }
    return counts;
}

// EXTERNAL MODULE: ./src/sdk/runtimes/model-selectors.ts
var model_selectors = __webpack_require__(71025);
;// CONCATENATED MODULE: ./src/action/error-reporting.ts


function shouldFingerprintTriggerError(code) {
    return (code === 'provider_unavailable'
        || code === 'all_hunks_failed'
        || code === 'invalid_model_selector');
}
/**
 * Capture trigger failures with stable tags and grouped fingerprints.
 */
function captureActionTriggerError(error, context) {
    const { code } = (0,errors/* classifyError */.fe)(error);
    sentry/* Sentry.captureException */.sQ.captureException(error, {
        tags: {
            'warden.trigger.name': context.triggerName,
            'gen_ai.agent.name': context.skillName,
            'warden.error.code': code,
        },
        ...(shouldFingerprintTriggerError(code) ? { fingerprint: ['warden', code] } : {}),
    });
    return code;
}

;// CONCATENATED MODULE: ./src/action/triggers/executor.ts
/**
 * Trigger Executor
 *
 * Executes a single trigger and manages associated GitHub check runs.
 * Extracted from main.ts to enable isolated testing and clearer dependencies.
 */













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
async function executeTrigger(trigger, deps) {
    return sentry/* Sentry.startSpan */.sQ.startSpan({ op: 'trigger.execute', name: `execute ${trigger.name}` }, async (span) => {
        span.setAttribute('gen_ai.agent.name', trigger.skill);
        span.setAttribute('warden.trigger.name', trigger.name);
        const { octokit, context, anthropicApiKey, claudePath } = deps;
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
        const minConfidence = trigger.minConfidence ?? 'medium';
        const requestChanges = trigger.requestChanges ?? deps.globalRequestChanges;
        const failCheck = trigger.failCheck ?? deps.globalFailCheck;
        const skillRoot = trigger.useBuiltinSkill ? undefined : (trigger.skillRoot ?? context.repoPath);
        try {
            (0,model_selectors/* assertValidPiModelSelectors */.lG)([trigger]);
            const taskOptions = {
                name: trigger.name,
                displayName: trigger.skill,
                triggerName: trigger.name,
                failOn,
                resolveSkill: () => (0,loader/* resolveSkillAsync */.Cy)(trigger.skill, skillRoot, {
                    remote: trigger.remote,
                }),
                context: filterContextByPaths(context, trigger.filters),
                runnerOptions: {
                    apiKey: anthropicApiKey,
                    model: trigger.model,
                    runtime: trigger.runtime,
                    auxiliaryModel: trigger.auxiliaryModel,
                    synthesisModel: trigger.synthesisModel,
                    maxTurns: trigger.maxTurns,
                    batchDelayMs: trigger.batchDelayMs,
                    maxContextFiles: trigger.maxContextFiles,
                    pathToClaudeCodeExecutable: claudePath,
                    auxiliaryMaxRetries: trigger.auxiliaryMaxRetries,
                    verifyFindings: trigger.verifyFindings,
                    abortController: deps.abortController,
                    circuitBreaker: deps.circuitBreaker,
                },
            };
            const callbacks = createDefaultCallbacks([taskOptions], CI_OUTPUT_MODE, verbosity_Verbosity.Normal);
            const fileConcurrency = deps.semaphore ? Number.MAX_SAFE_INTEGER : DEFAULT_FILE_CONCURRENCY;
            const result = await runSkillTask(taskOptions, fileConcurrency, callbacks, deps.semaphore);
            const report = result.report;
            if (!report) {
                throw result.error ?? new Error('Skill task returned no report');
            }
            // runSkillTask now synthesizes a report even on failure so the CLI
            // can log it as JSONL. The action's fail-check path still expects a
            // thrown error, so re-throw when the report carries one. Preserve
            // the ErrorCode in the fallback so Sentry / failSkillCheck see a
            // typed error.
            if (report.error) {
                throw (result.error ??
                    new errors/* SkillRunnerError */.cy(report.error.message, { code: report.error.code }));
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
                        minConfidence,
                        failCheck,
                    });
                }
                catch (error) {
                    console.error(`::warning::Failed to update skill check for ${trigger.skill}: ${error}`);
                }
            }
            const maxFindings = trigger.maxFindings ?? deps.globalMaxFindings;
            const renderResult = reportOn !== 'off'
                ? renderSkillReport(report, {
                    maxFindings,
                    reportOn,
                    minConfidence,
                    failOn,
                    requestChanges,
                    checkRunUrl: skillCheckUrl,
                    totalFindings: report.findings.length,
                })
                : undefined;
            logGroupEnd();
            return {
                triggerName: trigger.name,
                report,
                renderResult,
                failOn,
                reportOn,
                minConfidence,
                reportOnSuccess: trigger.reportOnSuccess,
                requestChanges,
                failCheck,
                checkRunUrl: skillCheckUrl,
                maxFindings,
            };
        }
        catch (error) {
            if (error instanceof ActionFailedError)
                throw error;
            captureActionTriggerError(error, {
                triggerName: trigger.name,
                skillName: trigger.skill,
            });
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
    });
}

;// CONCATENATED MODULE: ./src/action/review/poster.ts
/**
 * Review Poster
 *
 * Handles posting GitHub PR reviews with deduplication.
 * Extracted from main.ts to isolate the complex review posting state machine.
 */







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
/**
 * Move inline comments into the review body as markdown.
 * Used as a fallback when GitHub rejects inline comments (e.g. lines outside the diff).
 */
function moveCommentsToBody(renderResult, findings, skill) {
    if (!renderResult.review) {
        return renderResult;
    }
    const body = renderFindingsBody(findings, skill);
    return {
        ...renderResult,
        review: {
            ...renderResult.review,
            body,
            comments: [],
        },
    };
}
/**
 * Check if an error is a GitHub 422 "line could not be resolved" error.
 */
function isLineResolutionError(error) {
    if (!(error instanceof Error))
        return false;
    const msg = error.message.toLowerCase();
    return msg.includes('pull_request_review_thread.line') ||
        msg.includes('line must be part of the diff') ||
        msg.includes('line could not be resolved');
}
// -----------------------------------------------------------------------------
// Main Review Posting Logic
// -----------------------------------------------------------------------------
/**
 * Post a review for a single trigger result.
 *
 * Handles:
 * - Filtering findings by reportOn threshold
 * - Deduplicating against existing comments
 * - Processing duplicate actions (reactions, updates)
 * - Posting the final review
 */
async function postTriggerReview(ctx, deps) {
    const { result, existingComments, apiKey } = ctx;
    const { octokit, context } = deps;
    const newComments = [];
    const activeWardenCommentIds = new Set();
    if (!result.report) {
        return { posted: false, newComments, activeWardenCommentIds, shouldFail: false };
    }
    // Filter findings by reportOn threshold and confidence
    const filteredFindings = (0,types/* filterFindings */.Ni)(result.report.findings, result.reportOn, result.minConfidence);
    const reportOnSuccess = result.reportOnSuccess ?? false;
    // Skip if nothing to post
    if (!result.renderResult || (filteredFindings.length === 0 && !reportOnSuccess)) {
        return { posted: false, newComments, activeWardenCommentIds, shouldFail: false };
    }
    try {
        // Cross-location merging already happened in runSkillTask().
        // Consolidate findings within this batch (intra-batch dedup).
        let findingsToPost = filteredFindings;
        const canUseAuxiliaryRuntime = extract_canUseRuntimeAuth({ apiKey, runtime: ctx.runtime });
        if (findingsToPost.length > 1) {
            const consolidateResult = await consolidateBatchFindings(findingsToPost, {
                apiKey,
                runtime: ctx.runtime,
                model: ctx.model,
                hashOnly: !canUseAuxiliaryRuntime,
                maxRetries: ctx.maxRetries,
                agentName: result.report.skill,
            });
            findingsToPost = consolidateResult.findings;
            if (consolidateResult.usage) {
                const consolidateAux = { consolidate: consolidateResult.usage };
                result.report.auxiliaryUsage = (0,sdk_usage/* mergeAuxiliaryUsage */.wV)(result.report.auxiliaryUsage, consolidateAux);
            }
            if (consolidateResult.removedCount > 0) {
                logAction(`Consolidated ${consolidateResult.removedCount} duplicate findings within batch for ${result.triggerName}`);
            }
        }
        // Deduplicate findings against existing comments
        let dedupResult;
        if (existingComments.length > 0 && findingsToPost.length > 0) {
            dedupResult = await dedup_deduplicateFindings(findingsToPost, existingComments, {
                apiKey,
                runtime: ctx.runtime,
                model: ctx.model,
                currentSkill: result.report.skill,
                maxRetries: ctx.maxRetries,
            });
            findingsToPost = dedupResult.newFindings;
            // Merge dedup usage into the report's auxiliary usage
            if (dedupResult.dedupUsage) {
                const dedupAux = { dedup: dedupResult.dedupUsage };
                result.report.auxiliaryUsage = (0,sdk_usage/* mergeAuxiliaryUsage */.wV)(result.report.auxiliaryUsage, dedupAux);
            }
            if (dedupResult.duplicateActions.length > 0) {
                logAction(`Found ${dedupResult.duplicateActions.length} duplicate findings for ${result.triggerName}`);
            }
            for (const action of dedupResult.duplicateActions) {
                if (action.existingComment.isWarden && action.existingComment.id > 0) {
                    activeWardenCommentIds.add(action.existingComment.id);
                }
            }
        }
        // Process duplicate actions (update Warden comments, add reactions)
        if (dedupResult?.duplicateActions.length) {
            const actionCounts = await processDuplicateActions(octokit, context.repository.owner, context.repository.name, dedupResult.duplicateActions, result.report.skill);
            if (actionCounts.updated > 0) {
                logAction(`Updated ${actionCounts.updated} existing Warden comments with skill attribution`);
            }
            if (actionCounts.reacted > 0) {
                logAction(`Added reactions to ${actionCounts.reacted} existing external comments`);
            }
            if (actionCounts.failed > 0) {
                warnAction(`Failed to process ${actionCounts.failed} duplicate actions`);
            }
        }
        // Check if failOn threshold is met (even if all findings deduplicated, we still need REQUEST_CHANGES)
        // Filter by confidence first so low-confidence findings don't trigger REQUEST_CHANGES
        const useRequestChanges = result.requestChanges ?? false;
        const reportForFail = { ...result.report, findings: (0,types/* filterFindings */.Ni)(result.report.findings, undefined, result.minConfidence) };
        const needsRequestChanges = useRequestChanges && result.failOn && shouldFail(reportForFail, result.failOn);
        // Only post if we have non-duplicate findings, reportOnSuccess, or REQUEST_CHANGES needed
        if (findingsToPost.length > 0 || reportOnSuccess || needsRequestChanges) {
            // Re-render with deduplicated findings if any were removed
            const renderResultToPost = findingsToPost.length !== filteredFindings.length
                ? renderSkillReport({ ...result.report, findings: findingsToPost }, {
                    maxFindings: result.maxFindings,
                    reportOn: result.reportOn,
                    minConfidence: result.minConfidence,
                    failOn: result.failOn,
                    requestChanges: result.requestChanges,
                    checkRunUrl: result.checkRunUrl,
                    totalFindings: result.report.findings.length,
                    // Pass original findings for failOn evaluation (not affected by dedup)
                    allFindings: result.report.findings,
                })
                : result.renderResult;
            // Apply maxFindings limit consistently for both the fallback body and dedup tracking
            const postedFindings = result.maxFindings
                ? findingsToPost.slice(0, result.maxFindings)
                : findingsToPost;
            try {
                await postReviewToGitHub(octokit, context, renderResultToPost);
            }
            catch (error) {
                if (!isLineResolutionError(error)) {
                    throw error;
                }
                warnAction(`Inline comments failed for ${result.triggerName}, posting findings in review body`);
                const fallback = moveCommentsToBody(renderResultToPost, postedFindings, result.report.skill);
                await postReviewToGitHub(octokit, context, fallback);
            }
            for (const finding of postedFindings) {
                const comment = findingToExistingComment(finding, result.report.skill);
                if (comment) {
                    newComments.push(comment);
                }
            }
            return { posted: true, newComments, activeWardenCommentIds, shouldFail: false };
        }
        return { posted: false, newComments, activeWardenCommentIds, shouldFail: false };
    }
    catch (error) {
        warnAction(`Failed to post review for ${result.triggerName}: ${error}`);
        return { posted: false, newComments, activeWardenCommentIds, shouldFail: false };
    }
}

;// CONCATENATED MODULE: ./src/action/review/coordination.ts
/**
 * Review Coordination
 *
 * Safety checks for stale comment resolution across multiple triggers.
 */
// -----------------------------------------------------------------------------
// Functions
// -----------------------------------------------------------------------------
/**
 * Check if stale comment resolution should proceed.
 *
 * Returns false if any trigger failed, because failed triggers may have
 * had findings that we can no longer verify are fixed.
 */
function shouldResolveStaleComments(results) {
    return results.every((r) => !r.error);
}

;// CONCATENATED MODULE: ./src/action/checks/manager.ts
/**
 * Check Manager
 *
 * Manages GitHub Check runs for Warden triggers.
 * Wraps the core github-checks module with action-specific logic.
 */


// Re-export types and functions that are used directly

// -----------------------------------------------------------------------------
// Aggregate Functions
// -----------------------------------------------------------------------------
/**
 * Aggregate usage stats from multiple reports.
 */
function aggregateUsage(reports) {
    const reportsWithUsage = reports.filter((r) => r.usage);
    if (reportsWithUsage.length === 0)
        return undefined;
    const seed = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        cacheCreation5mInputTokens: 0,
        cacheCreation1hInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0,
    };
    return reportsWithUsage.reduce((acc, r) => {
        acc.inputTokens += r.usage?.inputTokens ?? 0;
        acc.outputTokens += r.usage?.outputTokens ?? 0;
        acc.cacheReadInputTokens = (acc.cacheReadInputTokens ?? 0) + (r.usage?.cacheReadInputTokens ?? 0);
        acc.cacheCreationInputTokens = (acc.cacheCreationInputTokens ?? 0) + (r.usage?.cacheCreationInputTokens ?? 0);
        acc.cacheCreation5mInputTokens = (acc.cacheCreation5mInputTokens ?? 0) + (r.usage?.cacheCreation5mInputTokens ?? 0);
        acc.cacheCreation1hInputTokens = (acc.cacheCreation1hInputTokens ?? 0) + (r.usage?.cacheCreation1hInputTokens ?? 0);
        acc.webSearchRequests = (acc.webSearchRequests ?? 0) + (r.usage?.webSearchRequests ?? 0);
        acc.costUSD += r.usage?.costUSD ?? 0;
        return acc;
    }, seed);
}
/**
 * Build core check summary data from trigger results.
 */
function buildCoreSummaryData(results, reports) {
    // Aggregate auxiliary usage across all reports
    let totalAuxiliaryUsage;
    for (const r of reports) {
        if (r.auxiliaryUsage) {
            totalAuxiliaryUsage = (0,sdk_usage/* mergeAuxiliaryUsage */.wV)(totalAuxiliaryUsage, r.auxiliaryUsage);
        }
    }
    return {
        totalSkills: results.length,
        totalFindings: reports.reduce((sum, r) => sum + r.findings.length, 0),
        findingsBySeverity: aggregateSeverityCounts(reports),
        totalDurationMs: reports.some((r) => r.durationMs !== undefined)
            ? reports.reduce((sum, r) => sum + (r.durationMs ?? 0), 0)
            : undefined,
        totalUsage: aggregateUsage(reports),
        totalAuxiliaryUsage,
        findings: reports.flatMap((r) => r.findings),
        skillResults: results.map((r) => ({
            name: r.triggerName,
            findingCount: r.report?.findings.length ?? 0,
            conclusion: r.report
                ? determineConclusion(r.report.findings, r.failOn, r.failCheck)
                : 'failure',
            durationMs: r.report?.durationMs,
            usage: r.report?.usage,
            auxiliaryUsage: r.report?.auxiliaryUsage,
        })),
    };
}
/**
 * Determine overall core check conclusion.
 */
function determineCoreConclusion(shouldFailAction, totalFindings) {
    if (shouldFailAction) {
        return 'failure';
    }
    if (totalFindings > 0) {
        return 'neutral';
    }
    return 'success';
}

;// CONCATENATED MODULE: ./src/action/workflow/pr-workflow.ts
/**
 * PR Workflow
 *
 * Handles pull_request and push events.
 */




















function resolveWorkflowAuxiliaryOptions(layered) {
    const baseDefaults = layered.baseConfig?.defaults;
    const repoDefaults = layered.repoConfig?.defaults ?? layered.config.defaults;
    return {
        // These workflow-scoped auxiliary calls are not tied to an individual
        // trigger, so the org base config remains the enforced baseline and the
        // repo layer only fills fields the base omits.
        runtime: baseDefaults?.runtime ?? repoDefaults?.runtime ?? 'pi',
        model: emptyToUndefined(baseDefaults?.auxiliary?.model) ??
            emptyToUndefined(repoDefaults?.auxiliary?.model),
        maxRetries: baseDefaults?.auxiliary?.maxRetries ??
            baseDefaults?.auxiliaryMaxRetries ??
            repoDefaults?.auxiliary?.maxRetries ??
            repoDefaults?.auxiliaryMaxRetries,
    };
}
// -----------------------------------------------------------------------------
// Fix Evaluation Logging
// -----------------------------------------------------------------------------
function logFixEvaluation(ev, index, total) {
    const totalTokens = ev.usage.inputTokens + ev.usage.outputTokens;
    const costStr = ev.usage.costUSD > 0 ? `, ${formatCost(ev.usage.costUSD)}` : '';
    const idPrefix = ev.findingId ? `${ev.findingId} ` : '';
    const verdict = ev.verdict;
    const line = `  [${index + 1}/${total}] ${idPrefix}${ev.path}:${ev.line} → ${verdict} (${formatDuration(ev.durationMs)}, ${formatTokens(totalTokens)} tok${costStr})`;
    if (ev.usedFallback) {
        warnAction(line);
    }
    else {
        logAction(line);
    }
    if (ev.verdict === 'attempted_failed' && ev.reasoning) {
        logAction(`        reason: "${ev.reasoning}"`);
    }
}
// -----------------------------------------------------------------------------
// Phase Functions
// -----------------------------------------------------------------------------
/**
 * Parse event payload, build context, load config, match triggers.
 */
async function initializeWorkflow(octokit, inputs, eventName, eventPath, repoPath) {
    let eventPayload;
    try {
        eventPayload = JSON.parse((0,external_node_fs_.readFileSync)(eventPath, 'utf-8'));
    }
    catch (error) {
        sentry/* Sentry.captureException */.sQ.captureException(error, { tags: { operation: 'read_event_payload' } });
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
        sentry/* Sentry.captureException */.sQ.captureException(error, { tags: { operation: 'build_event_context' } });
        setFailed(`Failed to build event context: ${error}`);
    }
    (0,sentry/* setRepositoryScope */.vx)(context.repository.fullName);
    logGroup('Loading configuration');
    if (inputs.baseConfigPath) {
        console.log(`Base config path: ${inputs.baseConfigPath}`);
    }
    if (inputs.baseSkillRoot) {
        console.log(`Base skill root: ${inputs.baseSkillRoot}`);
    }
    console.log(`Repo config path: ${inputs.configPath}`);
    logGroupEnd();
    let runnerConcurrency;
    let auxiliaryOptions = { runtime: 'pi' };
    let skillRootsByName;
    try {
        const layered = loadLayeredWardenConfig(repoPath, {
            baseConfigPath: inputs.baseConfigPath,
            configPath: inputs.configPath,
            onWarning: (message) => console.log(`::warning::${message}`),
        });
        // The org base config is an enforced baseline. Repo config extends the run
        // with additional repo-local triggers, but does not override these
        // action-level settings for the global workflow.
        runnerConcurrency =
            layered.baseConfig?.runner?.concurrency ??
                layered.repoConfig?.runner?.concurrency ??
                layered.config.runner?.concurrency;
        auxiliaryOptions = resolveWorkflowAuxiliaryOptions(layered);
        skillRootsByName = buildSkillRootsByName(repoPath, layered, inputs.baseSkillRoot);
        const resolvedTriggers = resolveLayeredSkillConfigs(layered, undefined, skillRootsByName);
        const matchedTriggers = resolvedTriggers.filter((t) => matchTrigger(t, context, 'github'));
        if (matchedTriggers.length > 0) {
            logGroup('Matched triggers');
            for (const trigger of matchedTriggers) {
                console.log(`- ${trigger.name}: ${trigger.skill}`);
            }
            logGroupEnd();
        }
        else {
            console.log('No triggers matched for this event');
        }
        return { context, runnerConcurrency, auxiliaryOptions, matchedTriggers };
    }
    catch (error) {
        if (error instanceof ConfigLoadError &&
            error.message.includes('not found') &&
            !inputs.baseConfigPath) {
            console.log('::warning::No warden.toml found. Skipping analysis.');
            return null;
        }
        throw error;
    }
}
/**
 * Fetch the bot's previous review state on a PR.
 * Returns null if the bot has no actionable reviews or identity cannot be determined.
 */
async function fetchPreviousReviewInfo(octokit, context) {
    if (!context.pullRequest) {
        return null;
    }
    try {
        const botLogin = await getAuthenticatedBotLogin(octokit);
        if (!botLogin) {
            logAction('Skipping dismiss flow: cannot identify bot (using PAT or GITHUB_TOKEN instead of GitHub App)');
            return null;
        }
        // Note: No pagination. PRs with 100+ reviews are rare; if Warden's review
        // is beyond page 1, user can manually dismiss. Not worth the complexity.
        const { data: reviews } = await octokit.pulls.listReviews({
            owner: context.repository.owner,
            repo: context.repository.name,
            pull_number: context.pullRequest.number,
            per_page: 100,
        });
        return findBotReviewState(reviews, botLogin);
    }
    catch (error) {
        warnAction(`Failed to fetch previous review info: ${error}`);
        return null;
    }
}
/**
 * Create core check and fetch previous review info. PR-only.
 */
async function setupGitHubState(octokit, context) {
    if (!context.pullRequest) {
        return { previousReviewInfo: null };
    }
    let coreCheckId;
    let previousReviewInfo = null;
    // Create core warden check
    try {
        const coreCheck = await createCoreCheck(octokit, {
            owner: context.repository.owner,
            repo: context.repository.name,
            headSha: context.pullRequest.headSha,
        });
        coreCheckId = coreCheck.checkRunId;
        logAction(`Created core check: ${coreCheck.url}`);
    }
    catch (error) {
        sentry/* Sentry.captureException */.sQ.captureException(error, { tags: { operation: 'create_core_check' } });
        warnAction(`Failed to create core check: ${error}`);
    }
    previousReviewInfo = await fetchPreviousReviewInfo(octokit, context);
    if (previousReviewInfo) {
        logAction(`Previous Warden review state: ${previousReviewInfo.state}`);
    }
    return { coreCheckId, previousReviewInfo };
}
/**
 * Run all matched triggers in parallel batches.
 */
async function executeAllTriggers(matchedTriggers, octokit, context, runnerConcurrency, inputs) {
    const concurrency = runnerConcurrency ?? inputs.parallel;
    const usesClaudeRuntime = matchedTriggers.some((trigger) => (trigger.runtime ?? 'pi') === 'claude');
    if (usesClaudeRuntime) {
        ensureClaudeAuth(inputs);
    }
    const claudePath = usesClaudeRuntime ? await findClaudeCodeExecutable() : undefined;
    const semaphore = new utils/* Semaphore */.jf(concurrency);
    const abortController = new AbortController();
    const circuitBreaker = new circuit_breaker_ProviderFailureCircuitBreaker({ abortController });
    // Limit trigger dispatch too; the semaphore only gates work after a trigger starts.
    return (0,utils/* runPool */.kD)(matchedTriggers, concurrency, (trigger) => executeTrigger(trigger, {
        octokit,
        context,
        anthropicApiKey: inputs.anthropicApiKey,
        claudePath,
        globalFailOn: inputs.failOn,
        globalReportOn: inputs.reportOn,
        globalMaxFindings: inputs.maxFindings,
        globalRequestChanges: inputs.requestChanges,
        globalFailCheck: inputs.failCheck,
        semaphore,
        abortController,
        circuitBreaker,
    }), { shouldAbort: () => abortController.signal.aborted });
}
/**
 * Fetch existing comments, post reviews with cross-trigger dedup, accumulate failure state.
 */
async function postReviewsAndTrackFailures(octokit, context, results, inputs, auxiliaryOptions) {
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
                logAction(`Found ${fetchedComments.length} existing comments for deduplication (${wardenCount} Warden, ${externalCount} external)`);
            }
        }
        catch (error) {
            sentry/* Sentry.captureException */.sQ.captureException(error, { tags: { operation: 'fetch_existing_comments' } });
            warnAction(`Failed to fetch existing comments for deduplication: ${error}`);
        }
    }
    // Post reviews to GitHub (sequentially to avoid rate limits)
    const reports = [];
    const activeWardenCommentIds = new Set();
    let shouldFailAction = false;
    const failureReasons = [];
    for (const result of results) {
        if (result.report) {
            reports.push(result.report);
            // Post review
            const postResult = await postTriggerReview({
                result,
                existingComments,
                apiKey: inputs.anthropicApiKey,
                runtime: auxiliaryOptions.runtime,
                model: auxiliaryOptions.model,
                maxRetries: auxiliaryOptions.maxRetries,
            }, { octokit, context });
            // Add newly posted comments to existing comments for cross-trigger deduplication
            existingComments.push(...postResult.newComments);
            postResult.activeWardenCommentIds.forEach((id) => activeWardenCommentIds.add(id));
            // Check if we should fail based on this trigger's config
            // Filter by confidence first so low-confidence findings don't cause failure
            const failCheck = result.failCheck ?? false;
            const reportForFail = { ...result.report, findings: (0,types/* filterFindings */.Ni)(result.report.findings, undefined, result.minConfidence) };
            if (failCheck && result.failOn && shouldFail(reportForFail, result.failOn)) {
                shouldFailAction = true;
                const count = countFindingsAtOrAbove(reportForFail, result.failOn);
                failureReasons.push(`${result.triggerName}: Found ${count} ${result.failOn}+ severity issues`);
            }
        }
    }
    return {
        reports,
        fetchedComments,
        existingComments,
        activeWardenCommentIds,
        shouldFailAction,
        failureReasons,
    };
}
/**
 * Evaluate fix attempts on unresolved comments and resolve stale comments.
 *
 * Returns whether all Warden comments are resolved after evaluation.
 */
async function evaluateFixesAndResolveStale(octokit, context, fetchedComments, allFindings, activeWardenCommentIds, canResolveStale, anthropicApiKey, auxiliaryOptions) {
    const wardenComments = fetchedComments.filter((c) => c.isWarden);
    const commentsResolvedByFixEval = new Set();
    const commentsEvaluatedByFixEval = new Set();
    const commentsResolvedByStale = new Set();
    const commentsForFixEvaluation = wardenComments.filter((c) => !activeWardenCommentIds.has(c.id));
    const fixEvaluationRuntime = auxiliaryOptions.runtime ?? 'pi';
    const canUseFixEvaluationRuntime = extract_canUseRuntimeAuth({
        apiKey: anthropicApiKey,
        runtime: fixEvaluationRuntime,
    });
    // Evaluate follow-up commit fix attempts
    if (context.pullRequest &&
        commentsForFixEvaluation.length > 0 &&
        canResolveStale &&
        canUseFixEvaluationRuntime) {
        try {
            logGroup('Fix evaluation');
            const unresolvedCount = commentsForFixEvaluation.filter((c) => !c.isResolved && c.threadId).length;
            if (unresolvedCount > 0) {
                logAction(`Fix evaluation: evaluating ${unresolvedCount} unresolved comments`);
            }
            const fixEvaluation = await evaluateFixAttempts(octokit, commentsForFixEvaluation, {
                owner: context.repository.owner,
                repo: context.repository.name,
                baseSha: context.pullRequest.baseSha,
                headSha: context.pullRequest.headSha,
            }, allFindings, anthropicApiKey, { ...auxiliaryOptions, runtime: fixEvaluationRuntime });
            // Log per-evaluation details
            fixEvaluation.evaluations.forEach((ev, i) => logFixEvaluation(ev, i, fixEvaluation.evaluations.length));
            // Resolve successful fixes
            if (fixEvaluation.toResolve.length > 0) {
                const { resolvedCount, resolvedIds } = await resolveStaleComments(octokit, fixEvaluation.toResolve);
                if (resolvedCount > 0) {
                    logAction(`Resolved ${resolvedCount} comments via fix evaluation`);
                }
                // Track only actually resolved comments for allResolved check
                resolvedIds.forEach((id) => commentsResolvedByFixEval.add(id));
            }
            // Post replies for failed fixes and track them so stale pass doesn't override
            for (const reply of fixEvaluation.toReply) {
                commentsEvaluatedByFixEval.add(reply.comment.id);
                if (reply.comment.threadId) {
                    try {
                        await postThreadReply(octokit, reply.comment.threadId, reply.replyBody);
                    }
                    catch (error) {
                        sentry/* Sentry.captureException */.sQ.captureException(error, { tags: { operation: 'post_thread_reply' } });
                    }
                }
            }
            if (fixEvaluation.evaluated > 0) {
                const totalTokens = fixEvaluation.usage.inputTokens + fixEvaluation.usage.outputTokens;
                let usageStr = '';
                if (totalTokens > 0) {
                    usageStr = `, ${formatTokens(totalTokens)} tok, ${formatCost(fixEvaluation.usage.costUSD)}`;
                }
                logAction(`Fix evaluation: ${fixEvaluation.toResolve.length} resolved, ` +
                    `${fixEvaluation.toReply.length} need attention, ` +
                    `${fixEvaluation.skipped} skipped` +
                    usageStr);
            }
            logGroupEnd();
        }
        catch (error) {
            sentry/* Sentry.captureException */.sQ.captureException(error, { tags: { operation: 'evaluate_fix_attempts' } });
            warnAction(`Failed to evaluate fix attempts: ${error}`);
            logGroupEnd();
        }
    }
    // Resolve stale Warden comments (comments that no longer have matching findings)
    // Exclude comments already handled by fix evaluation (resolved or flagged as needing attention)
    if (context.pullRequest && wardenComments.length > 0 && canResolveStale) {
        try {
            const scope = buildAnalyzedScope(context.pullRequest.files);
            const commentsForStaleCheck = wardenComments.filter((c) => !activeWardenCommentIds.has(c.id) &&
                !commentsResolvedByFixEval.has(c.id) &&
                !commentsEvaluatedByFixEval.has(c.id));
            const staleComments = findStaleComments(commentsForStaleCheck, allFindings, scope);
            if (staleComments.length > 0) {
                const { resolvedCount, resolvedIds } = await resolveStaleComments(octokit, staleComments);
                if (resolvedCount > 0) {
                    logAction(`Resolved ${resolvedCount} stale Warden comments`);
                    (0,sentry/* emitStaleResolutionMetric */.fL)(resolvedCount);
                    // Emit per-skill breakdown (only count actually resolved comments)
                    const bySkill = new Map();
                    for (const c of staleComments) {
                        if (!resolvedIds.has(c.id))
                            continue;
                        const skill = c.skills?.[0];
                        if (skill) {
                            bySkill.set(skill, (bySkill.get(skill) ?? 0) + 1);
                        }
                    }
                    for (const [skill, count] of bySkill) {
                        (0,sentry/* emitStaleResolutionMetric */.fL)(count, skill);
                    }
                }
                resolvedIds.forEach((id) => commentsResolvedByStale.add(id));
            }
        }
        catch (error) {
            sentry/* Sentry.captureException */.sQ.captureException(error, { tags: { operation: 'resolve_stale_comments' } });
            warnAction(`Failed to resolve stale comments: ${error}`);
        }
    }
    else if (!canResolveStale && wardenComments.length > 0) {
        logAction('Skipping stale comment resolution due to trigger failures');
    }
    // Determine if all unresolved Warden comments were resolved during this run
    const unresolvedBefore = wardenComments.filter((c) => !c.isResolved);
    const allResolved = unresolvedBefore.every((c) => commentsResolvedByFixEval.has(c.id) || commentsResolvedByStale.has(c.id));
    return {
        allResolved,
        autoResolvedByFixEvaluation: commentsResolvedByFixEval.size,
        autoResolvedByStaleCheck: commentsResolvedByStale.size,
    };
}
/**
 * Dismiss review, set outputs, update core check, fail action.
 */
async function finalizeWorkflow(octokit, context, previousReviewInfo, coreCheckId, results, reports, shouldFailAction, failureReasons, canResolveStale) {
    // Dismiss previous CHANGES_REQUESTED if all blocking issues are resolved.
    // Requires: all triggers succeeded, current run would not request changes,
    // and at least one trigger has an active failOn (prevents accidental dismiss when config changes).
    const wouldRequestChanges = results.some((r) => {
        if (!r.failOn || r.failOn === 'off' || !(r.requestChanges ?? false) || !r.report)
            return false;
        const filtered = { ...r.report, findings: (0,types/* filterFindings */.Ni)(r.report.findings, undefined, r.minConfidence) };
        return shouldFail(filtered, r.failOn);
    });
    const hasActiveFailOn = results.some((r) => r.failOn && r.failOn !== 'off');
    if (context.pullRequest &&
        previousReviewInfo?.state === 'CHANGES_REQUESTED' &&
        canResolveStale &&
        !wouldRequestChanges &&
        hasActiveFailOn) {
        try {
            await octokit.pulls.dismissReview({
                owner: context.repository.owner,
                repo: context.repository.name,
                pull_number: context.pullRequest.number,
                review_id: previousReviewInfo.reviewId,
                message: 'All previously reported issues have been resolved.',
            });
            logAction('Dismissed previous CHANGES_REQUESTED review');
        }
        catch (error) {
            sentry/* Sentry.captureException */.sQ.captureException(error, { tags: { operation: 'dismiss_review' } });
            warnAction(`Failed to dismiss previous review: ${error}`);
        }
    }
    // Set outputs
    const outputs = computeWorkflowOutputs(reports);
    setWorkflowOutputs(outputs);
    // Write structured findings to file for external export (GCS, S3, etc.)
    try {
        const findingsPath = writeFindingsOutput(reports, context);
        logAction(`Findings written to ${findingsPath}`);
    }
    catch (error) {
        warnAction(`Failed to write findings output: ${error}`);
    }
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
            sentry/* Sentry.captureException */.sQ.captureException(error, { tags: { operation: 'update_core_check' } });
            warnAction(`Failed to update core check: ${error}`);
        }
    }
    if (shouldFailAction) {
        setFailed(failureReasons.join('; '));
    }
    logAction(`Analysis complete: ${outputs.findingsCount} total findings`);
}
/**
 * Clean up orphaned Warden comments when no triggers matched.
 *
 * Runs fix evaluation and stale resolution on existing comments so that
 * comments from earlier pushes get resolved even when the current push
 * only touches files outside all skills' paths filters.
 */
async function cleanupOrphanedComments(octokit, context, inputs, auxiliaryOptions) {
    if (!context.pullRequest) {
        return;
    }
    let existingComments;
    try {
        existingComments = await fetchExistingComments(octokit, context.repository.owner, context.repository.name, context.pullRequest.number);
    }
    catch (error) {
        warnAction(`Failed to fetch existing comments for cleanup: ${error}`);
        return;
    }
    const wardenComments = existingComments.filter((c) => c.isWarden);
    if (wardenComments.length === 0) {
        return;
    }
    if ((auxiliaryOptions.runtime ?? 'pi') === 'claude') {
        ensureClaudeAuth(inputs);
    }
    logAction(`No triggers matched, but found ${wardenComments.length} existing Warden comments. Running cleanup.`);
    const { allResolved, autoResolvedByFixEvaluation, autoResolvedByStaleCheck } = await evaluateFixesAndResolveStale(octokit, context, existingComments, [], new Set(), true, inputs.anthropicApiKey, auxiliaryOptions);
    const activeSpan = sentry/* Sentry.getActiveSpan */.sQ.getActiveSpan();
    activeSpan?.setAttribute('warden.feedback.auto_resolve.fix_eval_count', autoResolvedByFixEvaluation);
    activeSpan?.setAttribute('warden.feedback.auto_resolve.stale_count', autoResolvedByStaleCheck);
    // Dismiss CHANGES_REQUESTED only if every unresolved comment was resolved
    if (allResolved) {
        const previousReviewInfo = await fetchPreviousReviewInfo(octokit, context);
        if (previousReviewInfo?.state === 'CHANGES_REQUESTED') {
            try {
                await octokit.pulls.dismissReview({
                    owner: context.repository.owner,
                    repo: context.repository.name,
                    pull_number: context.pullRequest.number,
                    review_id: previousReviewInfo.reviewId,
                    message: 'All previously reported issues have been resolved.',
                });
                logAction('Dismissed previous CHANGES_REQUESTED review');
            }
            catch (error) {
                warnAction(`Failed to dismiss previous review: ${error}`);
            }
        }
    }
}
// -----------------------------------------------------------------------------
// Main PR Workflow
// -----------------------------------------------------------------------------
async function runPRWorkflow(octokit, inputs, eventName, eventPath, repoPath) {
    return sentry/* Sentry.startSpan */.sQ.startSpan({ op: 'workflow.run', name: 'review pull_request' }, async (span) => {
        const initResult = await sentry/* Sentry.startSpan */.sQ.startSpan({ op: 'workflow.init', name: 'initialize workflow' }, () => initializeWorkflow(octokit, inputs, eventName, eventPath, repoPath));
        if (!initResult) {
            setOutput('findings-count', 0);
            setOutput('high-count', 0);
            setOutput('summary', 'No warden.toml found');
            try {
                const fullName = process.env['GITHUB_REPOSITORY'] ?? '';
                const [o = '', n = ''] = fullName.split('/');
                writeFindingsOutput([], {
                    eventType: 'pull_request',
                    action: '',
                    repository: { owner: o, name: n, fullName, defaultBranch: '' },
                    repoPath,
                });
            }
            catch { /* non-fatal */ }
            return;
        }
        const { context, runnerConcurrency, auxiliaryOptions, matchedTriggers } = initResult;
        span.setAttribute('warden.trigger.count', matchedTriggers.length);
        // Set Sentry context after building event context
        if (context.pullRequest) {
            sentry/* Sentry.setUser */.sQ.setUser({ username: context.pullRequest.author });
        }
        sentry/* Sentry.setContext */.sQ.setContext('repository', {
            owner: context.repository.owner,
            name: context.repository.name,
        });
        if (context.pullRequest) {
            sentry/* Sentry.setContext */.sQ.setContext('pull_request', {
                number: context.pullRequest.number,
                baseBranch: context.pullRequest.baseBranch,
                headBranch: context.pullRequest.headBranch,
            });
        }
        (0,sentry/* emitRunMetric */.LW)();
        const traceId = span.spanContext().traceId;
        sentry/* logger */.vF.info('Workflow initialized', {
            'warden.trigger.count': matchedTriggers.length,
            'trace.id': traceId,
        });
        if (matchedTriggers.length === 0) {
            await cleanupOrphanedComments(octokit, context, inputs, auxiliaryOptions);
            setOutput('findings-count', 0);
            setOutput('high-count', 0);
            setOutput('summary', 'No triggers matched');
            try {
                writeFindingsOutput([], context);
            }
            catch { /* non-fatal */ }
            return;
        }
        const { coreCheckId, previousReviewInfo } = await sentry/* Sentry.startSpan */.sQ.startSpan({ op: 'workflow.setup', name: 'setup github state' }, () => setupGitHubState(octokit, context));
        const results = await sentry/* Sentry.startSpan */.sQ.startSpan({
            op: 'workflow.execute',
            name: 'execute triggers',
            attributes: { 'warden.trigger.count': matchedTriggers.length },
        }, () => executeAllTriggers(matchedTriggers, octokit, context, runnerConcurrency, inputs));
        const reviewPhase = await sentry/* Sentry.startSpan */.sQ.startSpan({ op: 'workflow.review', name: 'post reviews' }, () => postReviewsAndTrackFailures(octokit, context, results, inputs, auxiliaryOptions));
        const triggerErrors = collectTriggerErrors(results);
        handleTriggerErrors(triggerErrors, matchedTriggers.length);
        const canResolveStale = shouldResolveStaleComments(results);
        const allFindings = reviewPhase.reports.flatMap((r) => r.findings);
        span.setAttribute('warden.finding.count', allFindings.length);
        await sentry/* Sentry.startSpan */.sQ.startSpan({ op: 'workflow.resolve', name: 'resolve stale comments' }, async (resolveSpan) => {
            const resolutionResult = await evaluateFixesAndResolveStale(octokit, context, reviewPhase.fetchedComments, allFindings, reviewPhase.activeWardenCommentIds, canResolveStale, inputs.anthropicApiKey, auxiliaryOptions);
            resolveSpan.setAttribute('warden.feedback.auto_resolve.fix_eval_count', resolutionResult.autoResolvedByFixEvaluation);
            resolveSpan.setAttribute('warden.feedback.auto_resolve.stale_count', resolutionResult.autoResolvedByStaleCheck);
        });
        await finalizeWorkflow(octokit, context, previousReviewInfo, coreCheckId, results, reviewPhase.reports, reviewPhase.shouldFailAction, reviewPhase.failureReasons, canResolveStale);
    });
}

// EXTERNAL MODULE: ./node_modules/.pnpm/fast-glob@3.3.3/node_modules/fast-glob/out/index.js
var out = __webpack_require__(80197);
var out_default = /*#__PURE__*/__webpack_require__.n(out);
// EXTERNAL MODULE: ./node_modules/.pnpm/ignore@7.0.5/node_modules/ignore/index.js
var ignore = __webpack_require__(94877);
var ignore_default = /*#__PURE__*/__webpack_require__.n(ignore);
;// CONCATENATED MODULE: ./src/cli/files.ts







function hasGlobCharacters(pattern) {
    return pattern.includes('*') || pattern.includes('?');
}
function expandDirectoryPattern(pattern, cwd) {
    if (hasGlobCharacters(pattern)) {
        return pattern;
    }
    try {
        if (!(0,external_node_fs_.statSync)((0,external_node_path_.resolve)(cwd, pattern)).isDirectory()) {
            return pattern;
        }
    }
    catch {
        return pattern;
    }
    const normalized = (0,path/* normalizePath */.Fd)(pattern).replace(/\/+$/, '');
    if (normalized === '' || normalized === '.') {
        return '**';
    }
    return `${normalized}/**`;
}
/**
 * Find the git root directory by walking up from the given path.
 * Returns the git root path, or null if not in a git repository.
 */
function findGitRoot(startPath) {
    try {
        const root = (0,exec/* execGitNonInteractive */.rd)(['rev-parse', '--show-toplevel'], {
            cwd: (0,external_node_path_.resolve)(startPath),
        });
        return root ? (0,external_node_path_.resolve)(root) : null;
    }
    catch {
        return null;
    }
}
/**
 * Prefix gitignore patterns with a directory path.
 * Handles negation patterns, leading slashes, and preserves comments/empty lines.
 *
 * Note: Patterns without slashes (like *.log) are intentionally NOT prefixed
 * with **\/ because the ignore package handles them correctly - they match
 * at any depth relative to the .gitignore location when the path being tested
 * is relative to the git root with the subdir prefix included.
 */
function prefixGitignorePatterns(content, prefix) {
    return content
        .split('\n')
        .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            return line;
        }
        // Handle negation patterns
        const isNegation = trimmed.startsWith('!');
        const pattern = isNegation ? trimmed.slice(1) : trimmed;
        // Handle patterns with leading slash (anchored to .gitignore location)
        // Remove leading slash to avoid double slashes: /build -> subdir/build
        const cleanPattern = pattern.startsWith('/') ? pattern.slice(1) : pattern;
        const prefixedPattern = `${prefix}/${cleanPattern}`;
        return isNegation ? `!${prefixedPattern}` : prefixedPattern;
    })
        .join('\n');
}
/**
 * Load all .gitignore files in the repository.
 * Returns an ignore instance that can check if a file path should be ignored.
 *
 * The ignore package handles the complexity of gitignore semantics:
 * - Patterns are applied relative to their .gitignore location
 * - Negation patterns (!) work correctly
 * - Directory patterns with trailing / work correctly
 */
function loadGitignoreRules(gitRoot) {
    const ig = ignore_default()();
    // Always ignore .git directory
    ig.add('.git');
    // Use git to discover .gitignore files. This naturally skips ignored
    // directories (node_modules, .venv, vendor, etc.) without maintaining
    // a hardcoded exclusion list.
    let gitignoreFiles;
    try {
        const output = (0,exec/* execGitNonInteractive */.rd)(['ls-files', '--cached', '--others', '--exclude-standard', '.gitignore', '**/.gitignore'], { cwd: gitRoot });
        gitignoreFiles = output
            ? output.split('\n').map((f) => (0,external_node_path_.resolve)(gitRoot, f))
            : [];
    }
    catch {
        // Not a real git repo or git not available. Walk directories manually,
        // skipping common large directories that would never contain relevant
        // .gitignore files.
        gitignoreFiles = out_default().sync('**/.gitignore', {
            cwd: gitRoot,
            absolute: true,
            dot: true,
            ignore: ['**/.git/**', '**/node_modules/**'],
        });
    }
    // Sort by path depth (root first, then nested).
    // Normalize to forward slashes so depth counting works on Windows too.
    gitignoreFiles.sort((a, b) => (0,path/* normalizePath */.Fd)(a).split('/').length - (0,path/* normalizePath */.Fd)(b).split('/').length);
    // Process gitignore files from root down (parent rules apply first)
    for (const gitignorePath of gitignoreFiles) {
        try {
            const content = (0,external_node_fs_.readFileSync)(gitignorePath, 'utf-8');
            // Use normalized paths for relative calculation
            const relativeDir = (0,path/* normalizePath */.Fd)((0,external_node_path_.relative)(gitRoot, (0,external_node_path_.dirname)(gitignorePath)));
            if (relativeDir) {
                ig.add(prefixGitignorePatterns(content, relativeDir));
            }
            else {
                ig.add(content);
            }
        }
        catch {
            // Ignore read errors (e.g., permission issues)
        }
    }
    return ig;
}
/**
 * Expand glob patterns to a list of file paths.
 *
 * By default, respects .gitignore files to automatically exclude ignored
 * directories like node_modules/. This can be disabled by setting
 * gitignore: false.
 */
async function expandFileGlobs(patterns, cwdOrOptions = process.cwd()) {
    const options = typeof cwdOrOptions === 'string' ? { cwd: cwdOrOptions } : cwdOrOptions;
    // Resolve to absolute path to handle relative paths like '.' or 'src'
    const cwd = (0,external_node_path_.resolve)(options.cwd ?? process.cwd());
    const useGitignore = options.gitignore ?? true;
    const expandedPatterns = patterns.map((pattern) => expandDirectoryPattern(pattern, cwd));
    // Get all matching files first
    const files = await out_default()(expandedPatterns, {
        cwd,
        onlyFiles: true,
        absolute: true,
        dot: false,
        // Always exclude .git directory
        ignore: ['**/.git/**'],
    });
    // If gitignore is disabled, return files as-is
    if (!useGitignore) {
        return files.sort();
    }
    // Find git root - if not in a git repo, don't apply gitignore rules
    const gitRoot = findGitRoot(cwd);
    if (!gitRoot) {
        return files.sort();
    }
    // Load and apply gitignore rules
    const ig = loadGitignoreRules(gitRoot);
    // Filter files using gitignore rules
    // Normalize paths to forward slashes for consistent matching
    const filteredFiles = files.filter((file) => {
        const relativePath = (0,path/* normalizePath */.Fd)((0,external_node_path_.relative)(gitRoot, file));
        if (!(0,path/* isRepoRelativePath */.Ms)(relativePath)) {
            return true;
        }
        return !ig.ignores(relativePath);
    });
    return filteredFiles.sort();
}
/**
 * Create a unified diff patch for a file, treating entire content as added.
 */
function createPatchFromContent(content) {
    const lines = content.split('\n');
    const lineCount = lines.length;
    // Handle empty files
    if (lineCount === 0 || (lineCount === 1 && lines[0] === '')) {
        return '@@ -0,0 +0,0 @@\n';
    }
    // Create patch header showing all lines as additions
    const patchLines = [`@@ -0,0 +1,${lineCount} @@`];
    for (const line of lines) {
        patchLines.push(`+${line}`);
    }
    return patchLines.join('\n');
}
/**
 * Read a file and create a synthetic FileChange treating it as newly added.
 */
function createSyntheticFileChange(absolutePath, basePath) {
    const content = (0,external_node_fs_.readFileSync)(absolutePath, 'utf-8');
    const lines = content.split('\n');
    const lineCount = lines.length;
    const relativePath = (0,path/* normalizePath */.Fd)((0,external_node_path_.relative)(basePath, absolutePath));
    const patch = createPatchFromContent(content);
    return {
        filename: relativePath,
        status: 'added',
        additions: lineCount,
        deletions: 0,
        patch,
        chunks: (0,types/* countPatchChunks */.kV)(patch),
    };
}
/**
 * Process a list of file paths into FileChange objects.
 */
function createSyntheticFileChanges(absolutePaths, basePath) {
    return absolutePaths.map((filePath) => createSyntheticFileChange(filePath, basePath));
}
/**
 * Expand glob patterns and create FileChange objects for all matching files.
 */
async function expandAndCreateFileChanges(patterns, cwd = process.cwd()) {
    const resolvedCwd = (0,external_node_path_.resolve)(cwd);
    const files = await expandFileGlobs(patterns, resolvedCwd);
    return createSyntheticFileChanges(files, resolvedCwd);
}

;// CONCATENATED MODULE: ./src/event/schedule-context.ts


/**
 * Build an EventContext for scheduled runs.
 *
 * Creates a synthetic pullRequest context from file globs using real repo info.
 * The runner processes this normally because the files have patch data.
 */
async function buildScheduleEventContext(options) {
    const { patterns, ignorePatterns, repoPath, owner, name, defaultBranch, headSha, } = options;
    // Expand glob patterns and create FileChange objects with full content as patch
    let fileChanges = await expandAndCreateFileChanges(patterns, repoPath);
    // Filter out ignored patterns
    if (ignorePatterns && ignorePatterns.length > 0) {
        fileChanges = fileChanges.filter((file) => {
            const isIgnored = ignorePatterns.some((pattern) => matcher_matchGlob(pattern, file.filename));
            return !isIgnored;
        });
    }
    return {
        eventType: 'schedule',
        action: 'scheduled',
        repository: {
            owner,
            name,
            fullName: `${owner}/${name}`,
            defaultBranch,
        },
        // Synthetic pullRequest context for runner compatibility
        pullRequest: {
            number: 0, // No actual PR
            title: 'Scheduled Analysis',
            body: null,
            author: 'warden',
            baseBranch: defaultBranch,
            headBranch: defaultBranch,
            headSha,
            baseSha: headSha, // No actual base for scheduled runs
            files: fileChanges,
        },
        diffContextSource: { type: 'working-tree' },
        repoPath,
    };
}
/**
 * Filter file changes to only include files matching the given patterns.
 * Used when a schedule trigger has specific path filters.
 */
function filterFilesByPatterns(files, patterns, ignorePatterns) {
    let filtered = files.filter((file) => patterns.some((pattern) => matchGlob(pattern, file.filename)));
    if (ignorePatterns && ignorePatterns.length > 0) {
        filtered = filtered.filter((file) => {
            const isIgnored = ignorePatterns.some((pattern) => matchGlob(pattern, file.filename));
            return !isIgnored;
        });
    }
    return filtered;
}

;// CONCATENATED MODULE: ./src/output/issue-renderer.ts



/**
 * Render skill reports as a GitHub issue body.
 */
function renderIssueBody(reports, options) {
    const { commitSha, runTimestamp, repoOwner, repoName } = options;
    const lines = [];
    // Header with timestamp and commit
    const shortSha = commitSha.slice(0, 7);
    const timestamp = runTimestamp.toISOString();
    lines.push('## Warden Scheduled Scan Results');
    lines.push('');
    lines.push(`**Run:** ${timestamp}`);
    lines.push(`**Commit:** \`${shortSha}\``);
    lines.push('');
    // Collect all findings
    const allFindings = reports.flatMap((r) => r.findings);
    if (allFindings.length === 0) {
        lines.push('**No issues found.** The scheduled scan completed without finding any issues.');
        lines.push('');
        lines.push('---');
        lines.push('*Generated by [Warden](https://github.com/getsentry/warden)*');
        return lines.join('\n');
    }
    // Severity summary table
    const counts = countBySeverity(allFindings);
    lines.push('### Summary');
    lines.push('');
    lines.push('| Severity | Count |');
    lines.push('|----------|-------|');
    for (const severity of ['high', 'medium', 'low']) {
        if (counts[severity] > 0) {
            lines.push(`| ${capitalize(severity)} | ${counts[severity]} |`);
        }
    }
    lines.push('');
    // Findings grouped by file
    lines.push('### Findings');
    lines.push('');
    // Sort findings by severity, then by file
    const sortedFindings = [...allFindings].sort((a, b) => {
        const severityDiff = types/* SEVERITY_ORDER */.B[a.severity] - types/* SEVERITY_ORDER */.B[b.severity];
        if (severityDiff !== 0)
            return severityDiff;
        const aPath = a.location?.path ?? '';
        const bPath = b.location?.path ?? '';
        return aPath.localeCompare(bPath);
    });
    const byFile = issue_renderer_groupFindingsByFile(sortedFindings);
    const canLink = repoOwner && repoName;
    for (const [file, fileFindings] of Object.entries(byFile)) {
        if (canLink) {
            lines.push(`#### [\`${file}\`](https://github.com/${repoOwner}/${repoName}/blob/${commitSha}/${file})`);
        }
        else {
            lines.push(`#### \`${file}\``);
        }
        lines.push('');
        for (const finding of fileFindings) {
            lines.push(issue_renderer_renderFindingItem(finding, { commitSha, repoOwner, repoName }));
        }
        lines.push('');
    }
    // General findings (no location)
    const noLocation = sortedFindings.filter((f) => !f.location);
    if (noLocation.length > 0) {
        lines.push('#### General');
        lines.push('');
        for (const finding of noLocation) {
            lines.push(issue_renderer_renderFindingItem(finding, { commitSha, repoOwner, repoName }));
        }
        lines.push('');
    }
    // Per-skill summaries if multiple skills
    if (reports.length > 1) {
        lines.push('### Skill Summaries');
        lines.push('');
        for (const report of reports) {
            lines.push(`**${report.skill}:** ${(0,utils/* escapeHtml */.ZD)(report.summary)}`);
            lines.push('');
        }
    }
    // Footer
    lines.push('---');
    lines.push('*Generated by [Warden](https://github.com/getsentry/warden)*');
    return lines.join('\n');
}
function issue_renderer_groupFindingsByFile(findings) {
    const groups = {};
    for (const finding of findings) {
        if (finding.location) {
            const path = finding.location.path;
            groups[path] ??= [];
            groups[path].push(finding);
        }
    }
    return groups;
}
function issue_renderer_formatLineRange(loc) {
    if (loc.endLine && loc.endLine !== loc.startLine) {
        return `L${loc.startLine}-L${loc.endLine}`;
    }
    return `L${loc.startLine}`;
}
function issue_renderer_renderFindingItem(finding, ctx) {
    const { commitSha, repoOwner, repoName } = ctx;
    const canLink = repoOwner && repoName && finding.location;
    let locationStr = '';
    if (finding.location) {
        const lineRange = issue_renderer_formatLineRange(finding.location);
        if (canLink) {
            locationStr = ` ([${lineRange}](https://github.com/${repoOwner}/${repoName}/blob/${commitSha}/${finding.location.path}#${lineRange}))`;
        }
        else {
            locationStr = ` (${lineRange})`;
        }
    }
    let line = `- \`${finding.id}\` **${(0,utils/* escapeHtml */.ZD)(finding.title)}**${locationStr} · ${finding.severity}`;
    line += `\n  ${(0,utils/* escapeHtml */.ZD)(finding.description)}`;
    if (finding.suggestedFix) {
        line += `\n  *Suggested fix:* ${(0,utils/* escapeHtml */.ZD)(finding.suggestedFix.description)}`;
    }
    return line;
}
/**
 * Render a brief status update for when no new findings are found.
 */
function renderNoFindingsUpdate(commitSha, runTimestamp) {
    const shortSha = commitSha.slice(0, 7);
    const timestamp = runTimestamp.toISOString();
    return [
        '## Latest Scan: No Issues Found',
        '',
        `Scan completed at ${timestamp} (commit \`${shortSha}\`) with no issues.`,
        '',
        '---',
        '*Generated by [Warden](https://github.com/getsentry/warden)*',
    ].join('\n');
}

;// CONCATENATED MODULE: ./src/output/github-issues.ts




/**
 * Create or update a GitHub issue with findings.
 * Searches for existing open issue by title prefix, updates if found.
 */
async function createOrUpdateIssue(octokit, owner, repo, reports, options) {
    const { title, commitSha } = options;
    const allFindings = reports.flatMap((r) => r.findings);
    const now = new Date();
    // Search for existing open issue with matching title
    const existingIssue = await findExistingIssue(octokit, owner, repo, title);
    // Render the issue body
    const body = allFindings.length > 0
        ? renderIssueBody(reports, {
            commitSha,
            runTimestamp: now,
            repoOwner: owner,
            repoName: repo,
        })
        : renderNoFindingsUpdate(commitSha, now);
    if (existingIssue) {
        // Update existing issue
        await octokit.issues.update({
            owner,
            repo,
            issue_number: existingIssue.number,
            body,
        });
        return {
            issueNumber: existingIssue.number,
            issueUrl: existingIssue.html_url,
            created: false,
        };
    }
    // Skip creating new issue if no findings
    if (allFindings.length === 0) {
        return null;
    }
    // Create new issue
    const { data: newIssue } = await octokit.issues.create({
        owner,
        repo,
        title,
        body,
    });
    return {
        issueNumber: newIssue.number,
        issueUrl: newIssue.html_url,
        created: true,
    };
}
async function findExistingIssue(octokit, owner, repo, title) {
    // Search for open issues with exact title match
    const { data: issues } = await octokit.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        per_page: 100,
    });
    const matching = issues.find((issue) => issue.title === title);
    return matching ? { number: matching.number, html_url: matching.html_url } : null;
}
/**
 * Create a PR with fixes applied.
 * Uses GitHub Git API to create branch, apply changes, and open PR.
 */
async function createFixPR(octokit, owner, repo, findings, options) {
    const { branchPrefix, baseBranch, baseSha, repoPath, triggerName } = options;
    // Collect fixable findings (have suggestedFix.diff and location.path)
    const fixable = findings.filter((f) => f.suggestedFix?.diff && f.location?.path);
    if (fixable.length === 0) {
        return null;
    }
    // Group fixes by file
    const fixesByFile = new Map();
    for (const finding of fixable) {
        // We know location exists because of the filter above
        const path = finding.location?.path;
        if (!path)
            continue;
        const existing = fixesByFile.get(path) ?? [];
        existing.push(finding);
        fixesByFile.set(path, existing);
    }
    // Generate branch name with timestamp
    const timestamp = Date.now();
    const safeTriggerName = triggerName.replace(/[^a-zA-Z0-9-]/g, '-');
    const branchName = `${branchPrefix}/${safeTriggerName}-${timestamp}`;
    // Apply fixes and create blobs for modified files
    const treeItems = [];
    const appliedFindings = [];
    for (const [filePath, fileFindings] of fixesByFile) {
        try {
            // Read current file content (validate path stays within repo)
            const fullPath = (0,external_node_path_.join)(repoPath, filePath);
            const resolvedFull = (0,external_node_path_.resolve)(fullPath);
            const resolvedRepo = (0,external_node_path_.resolve)(repoPath);
            if (!resolvedFull.startsWith(resolvedRepo + '/')) {
                console.error(`Skipping fix for path outside repo: ${filePath}`);
                continue;
            }
            let content = (0,external_node_fs_.readFileSync)(fullPath, 'utf-8');
            // Sort findings by line number descending to apply from bottom to top
            const sortedFindings = [...fileFindings].sort((a, b) => {
                const aLine = a.location?.startLine ?? 0;
                const bLine = b.location?.startLine ?? 0;
                return bLine - aLine;
            });
            // Apply each fix, tracking per-file so we only count after blob succeeds
            const fileAppliedFindings = [];
            for (const finding of sortedFindings) {
                const diff = finding.suggestedFix?.diff;
                if (!diff)
                    continue;
                try {
                    content = applyDiffToContent(content, diff);
                    fileAppliedFindings.push(finding);
                }
                catch (err) {
                    console.error(`Failed to apply fix for ${finding.title}: ${err}`);
                }
            }
            // Skip files where no fixes were actually applied
            if (fileAppliedFindings.length === 0)
                continue;
            // Create blob with modified content
            const { data: blob } = await octokit.git.createBlob({
                owner,
                repo,
                content: Buffer.from(content).toString('base64'),
                encoding: 'base64',
            });
            treeItems.push({
                path: filePath,
                mode: '100644',
                type: 'blob',
                sha: blob.sha,
            });
            // Only count fixes after blob creation succeeds
            appliedFindings.push(...fileAppliedFindings);
        }
        catch (err) {
            console.error(`Failed to process fixes for ${filePath}: ${err}`);
        }
    }
    if (treeItems.length === 0 || appliedFindings.length === 0) {
        return null;
    }
    // Create tree with new blobs
    const { data: tree } = await octokit.git.createTree({
        owner,
        repo,
        base_tree: baseSha,
        tree: treeItems,
    });
    // Create commit
    const { data: commit } = await octokit.git.createCommit({
        owner,
        repo,
        message: `fix: Apply ${appliedFindings.length} automated ${appliedFindings.length === 1 ? 'fix' : 'fixes'} from Warden\n\nTrigger: ${triggerName}\n\nCo-Authored-By: Warden <noreply@getsentry.com>`,
        tree: tree.sha,
        parents: [baseSha],
    });
    // Create branch
    await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: commit.sha,
    });
    // Create PR
    const { data: pr } = await octokit.pulls.create({
        owner,
        repo,
        title: `fix: Warden automated fixes for ${triggerName}`,
        head: branchName,
        base: baseBranch,
        body: [
            '## Summary',
            '',
            `This PR contains ${appliedFindings.length} automated ${appliedFindings.length === 1 ? 'fix' : 'fixes'} generated by Warden.`,
            '',
            '### Applied Fixes',
            '',
            ...appliedFindings.map((f) => {
                const path = f.location?.path ?? 'unknown';
                const line = f.location?.startLine ?? 0;
                return `- **${f.title}** (${path}:${line})`;
            }),
            '',
            '---',
            '*Generated by [Warden](https://github.com/getsentry/warden)*',
        ].join('\n'),
    });
    return {
        prNumber: pr.number,
        prUrl: pr.html_url,
        branch: branchName,
        fixCount: appliedFindings.length,
    };
}

;// CONCATENATED MODULE: ./src/action/workflow/schedule.ts
/**
 * Schedule Workflow
 *
 * Handles schedule and workflow_dispatch events.
 */











async function runScheduleWorkflow(octokit, inputs, repoPath) {
    return sentry/* Sentry.startSpan */.sQ.startSpan({ op: 'workflow.run', name: 'review schedule' }, (span) => runScheduleWorkflowInner(octokit, inputs, repoPath, span));
}
async function runScheduleWorkflowInner(octokit, inputs, repoPath, workflowSpan) {
    const githubRepository = process.env['GITHUB_REPOSITORY'];
    (0,sentry/* setRepositoryScope */.vx)(githubRepository);
    logGroup('Loading configuration');
    if (inputs.baseConfigPath) {
        console.log(`Base config path: ${inputs.baseConfigPath}`);
    }
    if (inputs.baseSkillRoot) {
        console.log(`Base skill root: ${inputs.baseSkillRoot}`);
    }
    console.log(`Repo config path: ${inputs.configPath}`);
    logGroupEnd();
    let scheduleTriggers;
    let skillRootsByName;
    try {
        const layered = loadLayeredWardenConfig(repoPath, {
            baseConfigPath: inputs.baseConfigPath,
            configPath: inputs.configPath,
            onWarning: (message) => console.log(`::warning::${message}`),
        });
        skillRootsByName = buildSkillRootsByName(repoPath, layered, inputs.baseSkillRoot);
        scheduleTriggers = resolveLayeredSkillConfigs(layered, undefined, skillRootsByName)
            .filter((t) => t.type === 'schedule');
    }
    catch (error) {
        if (error instanceof ConfigLoadError &&
            error.message.includes('not found') &&
            !inputs.baseConfigPath) {
            console.log('::warning::No warden.toml found. Skipping analysis.');
            setOutput('findings-count', 0);
            setOutput('high-count', 0);
            setOutput('summary', 'No warden.toml found');
            try {
                const fullName = process.env['GITHUB_REPOSITORY'] ?? '';
                const [o = '', n = ''] = fullName.split('/');
                workflowSpan.setAttribute('warden.trigger.count', 0);
                workflowSpan.setAttribute('warden.finding.count', 0);
                writeFindingsOutput([], {
                    eventType: 'schedule',
                    action: 'scheduled',
                    repository: { owner: o, name: n, fullName, defaultBranch: '' },
                    repoPath,
                });
            }
            catch { /* non-fatal */ }
            return;
        }
        throw error;
    }
    workflowSpan.setAttribute('warden.trigger.count', scheduleTriggers.length);
    (0,sentry/* emitRunMetric */.LW)();
    const traceId = workflowSpan.spanContext?.().traceId;
    sentry/* logger */.vF.info('Workflow initialized', {
        'warden.trigger.count': scheduleTriggers.length,
        ...(traceId ? { 'trace.id': traceId } : {}),
    });
    if (scheduleTriggers.length === 0) {
        console.log('No schedule triggers configured');
        setOutput('findings-count', 0);
        setOutput('high-count', 0);
        setOutput('summary', 'No schedule triggers configured');
        workflowSpan.setAttribute('warden.finding.count', 0);
        try {
            const fullName = process.env['GITHUB_REPOSITORY'] ?? '';
            const [o = '', n = ''] = fullName.split('/');
            writeFindingsOutput([], {
                eventType: 'schedule',
                action: 'scheduled',
                repository: { owner: o, name: n, fullName, defaultBranch: '' },
                repoPath,
            });
        }
        catch { /* non-fatal */ }
        return;
    }
    // Get repo info from environment
    if (!githubRepository) {
        setFailed('GITHUB_REPOSITORY environment variable not set');
    }
    const [owner, repo] = githubRepository.split('/');
    if (!owner || !repo) {
        setFailed('Invalid GITHUB_REPOSITORY format');
    }
    const headSha = process.env['GITHUB_SHA'] ?? '';
    if (!headSha) {
        setFailed('GITHUB_SHA environment variable not set');
    }
    const defaultBranch = await getDefaultBranchFromAPI(octokit, owner, repo);
    logGroup('Processing schedule triggers');
    for (const trigger of scheduleTriggers) {
        console.log(`- ${trigger.name}: ${trigger.skill}`);
    }
    logGroupEnd();
    const allReports = [];
    let totalFindings = 0;
    const failureReasons = [];
    const triggerErrors = [];
    let shouldFailAction = false;
    // Process each schedule trigger
    for (const resolved of scheduleTriggers) {
        logGroup(`Running trigger: ${resolved.name} (skill: ${resolved.skill})`);
        try {
            (0,model_selectors/* assertValidPiModelSelectors */.lG)([resolved]);
            // Build context from paths filter
            const patterns = resolved.filters?.paths ?? ['**/*'];
            const ignorePatterns = resolved.filters?.ignorePaths;
            const context = await buildScheduleEventContext({
                patterns,
                ignorePatterns,
                repoPath,
                owner,
                name: repo,
                defaultBranch,
                headSha,
            });
            // Skip if no matching files
            if (!context.pullRequest?.files.length) {
                console.log(`No files match trigger ${resolved.name}`);
                logGroupEnd();
                continue;
            }
            console.log(`Found ${context.pullRequest.files.length} files matching patterns`);
            // Run skill
            const skillRoot = resolved.useBuiltinSkill ? undefined : (resolved.skillRoot ?? repoPath);
            const skill = await (0,loader/* resolveSkillAsync */.Cy)(resolved.skill, skillRoot, {
                remote: resolved.remote,
            });
            const usesClaudeRuntime = (resolved.runtime ?? 'pi') === 'claude';
            if (usesClaudeRuntime) {
                ensureClaudeAuth(inputs);
            }
            const claudePath = usesClaudeRuntime ? await findClaudeCodeExecutable() : undefined;
            const report = await runSkill(skill, context, {
                apiKey: inputs.anthropicApiKey,
                model: resolved.model,
                runtime: resolved.runtime,
                auxiliaryModel: resolved.auxiliaryModel,
                synthesisModel: resolved.synthesisModel,
                maxTurns: resolved.maxTurns,
                batchDelayMs: resolved.batchDelayMs,
                maxContextFiles: resolved.maxContextFiles,
                auxiliaryMaxRetries: resolved.auxiliaryMaxRetries,
                verifyFindings: resolved.verifyFindings,
                telemetryTriggerName: resolved.name,
                pathToClaudeCodeExecutable: claudePath,
            });
            console.log(`Found ${report.findings.length} findings`);
            allReports.push(report);
            totalFindings += report.findings.length;
            // Create/update issue with findings
            const scheduleConfig = resolved.schedule ?? {};
            const issueTitle = scheduleConfig.issueTitle ?? `Warden: ${resolved.name}`;
            const issueResult = await createOrUpdateIssue(octokit, owner, repo, [report], {
                title: issueTitle,
                commitSha: headSha,
            });
            if (issueResult) {
                console.log(`${issueResult.created ? 'Created' : 'Updated'} issue #${issueResult.issueNumber}`);
                console.log(`Issue URL: ${issueResult.issueUrl}`);
            }
            // Create fix PR if enabled and there are fixable findings
            if (scheduleConfig.createFixPR) {
                const fixResult = await createFixPR(octokit, owner, repo, report.findings, {
                    branchPrefix: scheduleConfig.fixBranchPrefix ?? 'warden-fix',
                    baseBranch: defaultBranch,
                    baseSha: headSha,
                    repoPath,
                    triggerName: resolved.name,
                });
                if (fixResult) {
                    console.log(`Created fix PR #${fixResult.prNumber} with ${fixResult.fixCount} fixes`);
                    console.log(`PR URL: ${fixResult.prUrl}`);
                }
            }
            // Check failure condition
            // Filter by confidence first so low-confidence findings don't cause failure
            const failOn = resolved.failOn ?? inputs.failOn;
            const failCheck = resolved.failCheck ?? inputs.failCheck ?? false;
            const reportForFail = { ...report, findings: (0,types/* filterFindings */.Ni)(report.findings, undefined, resolved.minConfidence ?? 'medium') };
            if (failCheck && failOn && shouldFail(reportForFail, failOn)) {
                shouldFailAction = true;
                const count = countFindingsAtOrAbove(reportForFail, failOn);
                failureReasons.push(`${resolved.name}: Found ${count} ${failOn}+ severity issues`);
            }
            logGroupEnd();
        }
        catch (error) {
            if (error instanceof ActionFailedError)
                throw error;
            captureActionTriggerError(error, {
                triggerName: resolved.name,
                skillName: resolved.skill,
            });
            const errorMessage = error instanceof Error ? error.message : String(error);
            triggerErrors.push(`${resolved.name}: ${errorMessage}`);
            console.error(`::warning::Trigger ${resolved.name} failed: ${error}`);
            logGroupEnd();
        }
    }
    handleTriggerErrors(triggerErrors, scheduleTriggers.length);
    // Set outputs
    const highCount = countSeverity(allReports, 'high');
    workflowSpan.setAttribute('warden.finding.count', totalFindings);
    setOutput('findings-count', totalFindings);
    setOutput('high-count', highCount);
    setOutput('summary', allReports.map((r) => r.summary).join('\n') || 'Scheduled analysis complete');
    // Write structured findings to file for external export (GCS, S3, etc.)
    try {
        const findingsPath = writeFindingsOutput(allReports, {
            eventType: 'schedule',
            action: 'scheduled',
            repository: { owner, name: repo, fullName: `${owner}/${repo}`, defaultBranch },
            repoPath,
        });
        console.log(`Findings written to ${findingsPath}`);
    }
    catch (error) {
        console.error(`::warning::Failed to write findings output: ${error}`);
    }
    if (shouldFailAction) {
        setFailed(failureReasons.join('; '));
    }
    console.log(`\nScheduled analysis complete: ${totalFindings} total findings`);
}

;// CONCATENATED MODULE: ./src/action/run.ts
/**
 * GitHub Action Runner
 *
 * main.ts installs action-bundle compatibility hooks before loading this
 * module. Workflow modules own trigger-level error handling.
 */






(0,sentry/* initSentry */.ig)('action');
async function run() {
    const inputs = parseActionInputs();
    validateInputs(inputs);
    const eventName = process.env['GITHUB_EVENT_NAME'];
    const eventPath = process.env['GITHUB_EVENT_PATH'];
    const repoPath = process.env['GITHUB_WORKSPACE'];
    if (!eventName || !eventPath || !repoPath) {
        setFailed('This action must be run in a GitHub Actions environment');
    }
    (0,sentry/* setGitHubActionScope */.gs)(eventName);
    (0,sentry/* setRepositoryScope */.vx)(process.env['GITHUB_REPOSITORY']);
    setupAuthEnv(inputs);
    const octokit = new dist_src/* Octokit */.E({ auth: inputs.githubToken });
    if (eventName === 'schedule' || eventName === 'workflow_dispatch') {
        return runScheduleWorkflow(octokit, inputs, repoPath);
    }
    return runPRWorkflow(octokit, inputs, eventName, eventPath, repoPath);
}
run()
    .then(() => (0,sentry/* flushSentry */.KR)())
    .catch(async (error) => {
    if (error instanceof ActionFailedError) {
        console.error(`::error::${error.message}`);
    }
    else {
        sentry/* Sentry.captureException */.sQ.captureException(error);
        console.error(`::error::Unexpected error: ${error}`);
    }
    await (0,sentry/* flushSentry */.KR)();
    process.exit(1);
});


/***/ }),

/***/ 83138:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Cy: () => (/* binding */ resolveSkillAsync),
/* harmony export */   OB: () => (/* binding */ isBuiltinSkillName),
/* harmony export */   hl: () => (/* binding */ loadSkillFromMarkdown),
/* harmony export */   qA: () => (/* binding */ AGENT_MARKER_FILE),
/* harmony export */   vN: () => (/* binding */ SkillLoaderError)
/* harmony export */ });
/* unused harmony exports SKILL_DIRECTORIES, BUILTIN_SKILL_DIRECTORIES, AGENT_DIRECTORIES, resolveSkillPath, clearSkillsCache, loadSkillFromFile, loadSkillsFromDirectory, discoverAllSkills, discoverAllAgents, resolveAgentAsync */
/* harmony import */ var node_fs_promises__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(51455);
/* harmony import */ var node_fs_promises__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_fs_promises__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(76760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(node_path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(73024);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var node_url__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(73136);
/* harmony import */ var node_url__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(node_url__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _sentry_dotagents_lib__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(45639);
/* harmony import */ var _utils_path_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(13701);






class SkillLoaderError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = 'SkillLoaderError';
    }
}
/** Cache for loaded skills directories to avoid repeated disk reads */
const skillsCache = new Map();
/**
 * Conventional skill directories, checked in priority order.
 *
 * Skills are discovered from these directories in order:
 * 1. .warden/skills - Repo-local generated skills
 * 2. .agents/skills - Primary authored skills
 * 3. .claude/skills - Backup (matches Claude Code convention)
 *
 * Skills follow the agentskills.io specification:
 * - skill-name/SKILL.md (directory with SKILL.md inside - preferred)
 * - skill-name.md (flat markdown with SKILL.md frontmatter format)
 *
 * When a skill name exists in multiple directories, the first one found wins.
 */
const SKILL_DIRECTORIES = [
    '.warden/skills',
    '.agents/skills',
    '.claude/skills',
];
/**
 * Package-native Warden skills, resolved by name without installation.
 *
 * Repo-local conventional skills take precedence over these defaults so teams
 * can override built-ins with their own policy.
 */
const BUILTIN_SKILL_DIRECTORIES = [
    'src/builtin-skills',
];
/**
 * Conventional agent directories, checked in priority order.
 *
 * Agents are discovered from these directories in order:
 * 1. .agents/agents - Primary (recommended)
 * 2. .claude/agents - Backup (matches Claude Code convention)
 * 3. .warden/agents - Legacy
 *
 * Agents use the same format as skills but with AGENT.md marker files.
 */
const AGENT_DIRECTORIES = [
    '.agents/agents',
    '.claude/agents',
    '.warden/agents',
];
/** Marker filename for agent definitions */
const AGENT_MARKER_FILE = 'AGENT.md';
/**
 * Resolve a skill path, handling absolute paths, tilde expansion, and relative paths.
 */
function resolveSkillPath(nameOrPath, repoRoot) {
    return (0,_utils_path_js__WEBPACK_IMPORTED_MODULE_5__/* .resolvePathTarget */ .BI)(nameOrPath, repoRoot);
}
/**
 * Resolve the package root from source or compiled dist locations.
 */
function resolvePackageRoot() {
    const __filename = (0,node_url__WEBPACK_IMPORTED_MODULE_3__.fileURLToPath)(import.meta.url);
    return (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)((0,node_path__WEBPACK_IMPORTED_MODULE_1__.dirname)(__filename), '..', '..');
}
/**
 * Return true when a skill name resolves to a package-native built-in skill.
 */
function isBuiltinSkillName(name) {
    if ((0,_utils_path_js__WEBPACK_IMPORTED_MODULE_5__/* .isPathLike */ .RA)(name)) {
        return false;
    }
    const packageRoot = resolvePackageRoot();
    for (const dir of BUILTIN_SKILL_DIRECTORIES) {
        const dirPath = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(packageRoot, dir);
        if ((0,node_fs__WEBPACK_IMPORTED_MODULE_2__.existsSync)((0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(dirPath, name, 'SKILL.md')) ||
            (0,node_fs__WEBPACK_IMPORTED_MODULE_2__.existsSync)((0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(dirPath, `${name}.md`))) {
            return true;
        }
    }
    return false;
}
/**
 * Clear the skills cache. Useful for testing or when skills may have changed.
 */
function clearSkillsCache() {
    skillsCache.clear();
}
/**
 * Extract the markdown body that follows the SKILL.md YAML frontmatter.
 * Returns the empty string if the file lacks a frontmatter block.
 */
function extractBody(content) {
    const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
    return match?.[1] ?? '';
}
/**
 * Load a skill from a SKILL.md file (agentskills.io format).
 *
 * Frontmatter parsing and `allowed-tools` interpretation are delegated to
 * `@sentry/dotagents-lib`; this wrapper attaches warden-specific fields
 * (`prompt` body, `rootDir`, `tools.allowed`) and translates lib errors to
 * `SkillLoaderError` for callers that catch on warden's error type.
 */
async function loadSkillFromMarkdown(filePath, options) {
    let meta;
    try {
        meta = await (0,_sentry_dotagents_lib__WEBPACK_IMPORTED_MODULE_4__/* .loadSkillMd */ .h3)(filePath, { onWarning: options?.onWarning });
    }
    catch (err) {
        if (err instanceof _sentry_dotagents_lib__WEBPACK_IMPORTED_MODULE_4__/* .SkillLoadError */ .ai) {
            throw new SkillLoaderError(err.message, { cause: err });
        }
        throw err;
    }
    // Lib doesn't return the body; re-read for the markdown content. Cheap —
    // the OS file cache catches the second read.
    const content = await (0,node_fs_promises__WEBPACK_IMPORTED_MODULE_0__.readFile)(filePath, 'utf-8');
    const body = extractBody(content);
    return {
        name: meta.name,
        description: meta.description,
        prompt: body.trim(),
        tools: meta.allowedTools !== undefined ? { allowed: meta.allowedTools } : undefined,
        rootDir: (0,node_path__WEBPACK_IMPORTED_MODULE_1__.dirname)(filePath),
    };
}
/**
 * Load a skill from a file (agentskills.io format .md files).
 */
async function loadSkillFromFile(filePath) {
    const ext = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.extname)(filePath).toLowerCase();
    if (ext === '.md') {
        return loadSkillFromMarkdown(filePath);
    }
    throw new SkillLoaderError(`Unsupported skill file: ${filePath}. Skills must be .md files following the agentskills.io format.`);
}
/**
 * Load all skills from a directory.
 *
 * Supports the agentskills.io specification:
 * - skill-name/SKILL.md (directory with SKILL.md inside - preferred)
 * - skill-name.md (flat markdown with SKILL.md frontmatter format)
 *
 * Results are cached to avoid repeated disk reads.
 *
 * @returns Map of skill name to LoadedSkill (includes entry path for tracking)
 */
async function loadSkillsFromDirectory(dirPath, options) {
    const markerFile = options?.markerFile ?? 'SKILL.md';
    const cacheKey = `${dirPath}:${markerFile}`;
    // Check cache first
    const cached = skillsCache.get(cacheKey);
    if (cached) {
        return cached;
    }
    const skills = new Map();
    let entries;
    try {
        entries = await readdir(dirPath);
    }
    catch {
        skillsCache.set(cacheKey, skills);
        return skills;
    }
    // Process entries following agentskills.io format priority:
    // 1. Directories with marker file (preferred)
    // 2. Flat .md files with valid frontmatter
    for (const entry of entries) {
        const entryPath = join(dirPath, entry);
        // Check for agentskills.io format: entry-name/{markerFile} (preferred)
        const markerPath = join(entryPath, markerFile);
        if (existsSync(markerPath)) {
            try {
                const skill = await loadSkillFromMarkdown(markerPath, { onWarning: options?.onWarning });
                skills.set(skill.name, { skill, entry });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                options?.onWarning?.(`Failed to load skill from ${markerPath}: ${message}`);
            }
            continue;
        }
        // Check for flat .md files (with frontmatter format)
        if (entry.endsWith('.md')) {
            try {
                const skill = await loadSkillFromMarkdown(entryPath, { onWarning: options?.onWarning });
                skills.set(skill.name, { skill, entry });
            }
            catch (error) {
                // Skip files without YAML frontmatter (e.g., README.md, documentation)
                // but warn about files that have frontmatter but are malformed.
                // Lib's loadSkillMd throws "No YAML frontmatter in <path>" for the
                // no-frontmatter case; everything else (missing required field,
                // unparseable YAML) is a real malformation worth reporting.
                const message = error instanceof Error ? error.message : String(error);
                if (!message.includes('No YAML frontmatter')) {
                    options?.onWarning?.(`Failed to load skill from ${entry}: ${message}`);
                }
            }
        }
    }
    skillsCache.set(cacheKey, skills);
    return skills;
}
/**
 * Discover all entries (skills or agents) from conventional directories.
 * Scans directories in order; first occurrence of a name wins.
 */
async function discoverFromDirectories(rootDir, directories, options, sourceLabel) {
    const result = new Map();
    for (const dir of directories) {
        const dirPath = join(rootDir, dir);
        if (!existsSync(dirPath))
            continue;
        const loaded = await loadSkillsFromDirectory(dirPath, options);
        for (const [name, entry] of loaded) {
            if (!result.has(name)) {
                result.set(name, {
                    skill: entry.skill,
                    directory: sourceLabel ? sourceLabel(dir) : `./${dir}`,
                    path: join(dirPath, entry.entry),
                });
            }
        }
    }
    return result;
}
async function discoverBuiltinSkills(options) {
    return discoverFromDirectories(resolvePackageRoot(), BUILTIN_SKILL_DIRECTORIES, options, () => 'built-in');
}
/**
 * Discover all available skills from conventional directories.
 *
 * @param repoRoot - Repository root path for finding skills
 * @param options - Options for skill loading (e.g., warning callback)
 * @returns Map of skill name to discovered skill info
 */
async function discoverAllSkills(repoRoot, options) {
    const discovered = repoRoot
        ? await discoverFromDirectories(repoRoot, SKILL_DIRECTORIES, options)
        : new Map();
    const builtin = await discoverBuiltinSkills(options);
    for (const [name, entry] of builtin) {
        if (!discovered.has(name)) {
            discovered.set(name, entry);
        }
    }
    return discovered;
}
/**
 * Resolve a skill or agent by name or path.
 *
 * Resolution order:
 * 1. Remote repository (if remote option is set)
 * 2. Direct path (if nameOrPath contains / or \ or starts with .)
 *    - Directory: load marker file from it
 *    - File: load the .md file directly
 * 3. Conventional directories (if repoRoot provided)
 * 4. Package-native built-in directories (skills only)
 */
async function resolveEntry(nameOrPath, repoRoot, options, config) {
    const { remote, offline } = options ?? {};
    // 1. Remote repository resolution takes priority when specified
    if (remote) {
        // Dynamic import to avoid circular dependencies
        const { resolveRemoteSkill, resolveRemoteAgent } = await __webpack_require__.e(/* import() */ 159).then(__webpack_require__.bind(__webpack_require__, 62159));
        const resolver = config.kind === 'skill' ? resolveRemoteSkill : resolveRemoteAgent;
        return resolver(remote, nameOrPath, { offline });
    }
    // 2. Direct path resolution
    if ((0,_utils_path_js__WEBPACK_IMPORTED_MODULE_5__/* .isPathLike */ .RA)(nameOrPath)) {
        const resolvedPath = resolveSkillPath(nameOrPath, repoRoot);
        const markerPath = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(resolvedPath, config.markerFile);
        if ((0,node_fs__WEBPACK_IMPORTED_MODULE_2__.existsSync)(markerPath)) {
            return loadSkillFromMarkdown(markerPath);
        }
        if ((0,node_fs__WEBPACK_IMPORTED_MODULE_2__.existsSync)(resolvedPath)) {
            return loadSkillFromFile(resolvedPath);
        }
        throw new SkillLoaderError(`${config.label} not found at path: ${nameOrPath}`);
    }
    // 3. Check conventional directories
    if (repoRoot) {
        for (const dir of config.directories) {
            const dirPath = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(repoRoot, dir);
            const markerPath = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(dirPath, nameOrPath, config.markerFile);
            if ((0,node_fs__WEBPACK_IMPORTED_MODULE_2__.existsSync)(markerPath)) {
                return loadSkillFromMarkdown(markerPath);
            }
            const mdPath = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(dirPath, `${nameOrPath}.md`);
            if ((0,node_fs__WEBPACK_IMPORTED_MODULE_2__.existsSync)(mdPath)) {
                return loadSkillFromMarkdown(mdPath);
            }
        }
    }
    if (config.builtinDirectories) {
        const packageRoot = resolvePackageRoot();
        for (const dir of config.builtinDirectories) {
            const dirPath = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(packageRoot, dir);
            const markerPath = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(dirPath, nameOrPath, config.markerFile);
            if ((0,node_fs__WEBPACK_IMPORTED_MODULE_2__.existsSync)(markerPath)) {
                return loadSkillFromMarkdown(markerPath);
            }
            const mdPath = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(dirPath, `${nameOrPath}.md`);
            if ((0,node_fs__WEBPACK_IMPORTED_MODULE_2__.existsSync)(mdPath)) {
                return loadSkillFromMarkdown(mdPath);
            }
        }
    }
    throw new SkillLoaderError(`${config.label} not found: ${nameOrPath}`);
}
const SKILL_RESOLVE_CONFIG = {
    markerFile: 'SKILL.md',
    directories: SKILL_DIRECTORIES,
    builtinDirectories: BUILTIN_SKILL_DIRECTORIES,
    label: 'Skill',
    kind: 'skill',
};
const AGENT_RESOLVE_CONFIG = {
    markerFile: AGENT_MARKER_FILE,
    directories: AGENT_DIRECTORIES,
    label: 'Agent',
    kind: 'agent',
};
/**
 * Resolve a skill by name or path.
 *
 * Resolution order:
 * 1. Remote repository (if remote option is set)
 * 2. Direct path (if nameOrPath contains / or \ or starts with .)
 *    - Directory: load SKILL.md from it
 *    - File: load the .md file directly
 * 3. Conventional directories (if repoRoot provided)
 *    - .warden/skills/{name}/SKILL.md or .warden/skills/{name}.md
 *    - .agents/skills/{name}/SKILL.md or .agents/skills/{name}.md
 *    - .claude/skills/{name}/SKILL.md or .claude/skills/{name}.md
 * 4. Package-native built-in skills
 *    - src/builtin-skills/{name}/SKILL.md or src/builtin-skills/{name}.md
 */
async function resolveSkillAsync(nameOrPath, repoRoot, options) {
    return resolveEntry(nameOrPath, repoRoot, options, SKILL_RESOLVE_CONFIG);
}
/**
 * Discover all available agents from conventional directories.
 *
 * @param repoRoot - Repository root path for finding agents
 * @param options - Options for loading (e.g., warning callback)
 * @returns Map of agent name to discovered agent info
 */
async function discoverAllAgents(repoRoot, options) {
    if (!repoRoot) {
        return new Map();
    }
    return discoverFromDirectories(repoRoot, AGENT_DIRECTORIES, {
        ...options,
        markerFile: AGENT_MARKER_FILE,
    });
}
/**
 * Resolve an agent by name or path.
 *
 * Resolution order:
 * 1. Remote repository (if remote option is set)
 * 2. Direct path (if nameOrPath contains / or \ or starts with .)
 *    - Directory: load AGENT.md from it
 *    - File: load the .md file directly
 * 3. Conventional directories (if repoRoot provided)
 *    - .agents/agents/{name}/AGENT.md or .agents/agents/{name}.md
 *    - .claude/agents/{name}/AGENT.md or .claude/agents/{name}.md
 *    - .warden/agents/{name}/AGENT.md or .warden/agents/{name}.md
 */
async function resolveAgentAsync(nameOrPath, repoRoot, options) {
    return resolveEntry(nameOrPath, repoRoot, options, AGENT_RESOLVE_CONFIG);
}


/***/ })

};
