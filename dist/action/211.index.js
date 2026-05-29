export const id = 211;
export const ids = [211];
export const modules = {

/***/ 28865:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   OZ: () => (/* reexport safe */ _output_github_checks_js__WEBPACK_IMPORTED_MODULE_0__.OZ),
/* harmony export */   R2: () => (/* reexport safe */ _output_github_checks_js__WEBPACK_IMPORTED_MODULE_0__.R2),
/* harmony export */   YX: () => (/* binding */ buildCoreSummaryData),
/* harmony export */   Zv: () => (/* reexport safe */ _output_github_checks_js__WEBPACK_IMPORTED_MODULE_0__.Zv),
/* harmony export */   ar: () => (/* binding */ determineCoreConclusion),
/* harmony export */   c: () => (/* reexport safe */ _output_github_checks_js__WEBPACK_IMPORTED_MODULE_0__.c),
/* harmony export */   uP: () => (/* reexport safe */ _output_github_checks_js__WEBPACK_IMPORTED_MODULE_0__.uP)
/* harmony export */ });
/* unused harmony export aggregateUsage */
/* harmony import */ var _output_github_checks_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(138);
/* harmony import */ var _sdk_usage_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(44759);
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
            totalAuxiliaryUsage = (0,_sdk_usage_js__WEBPACK_IMPORTED_MODULE_1__/* .mergeAuxiliaryUsage */ .wV)(totalAuxiliaryUsage, r.auxiliaryUsage);
        }
    }
    return {
        totalSkills: results.length,
        totalFindings: reports.reduce((sum, r) => sum + r.findings.length, 0),
        findingsBySeverity: (0,_output_github_checks_js__WEBPACK_IMPORTED_MODULE_0__/* .aggregateSeverityCounts */ .nO)(reports),
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
                ? (0,_output_github_checks_js__WEBPACK_IMPORTED_MODULE_0__/* .determineConclusion */ .Hx)(r.report.findings, r.failOn, r.failCheck)
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


/***/ }),

/***/ 29547:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   T: () => (/* binding */ captureActionTriggerError)
/* harmony export */ });
/* harmony import */ var _sentry_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(30340);
/* harmony import */ var _sdk_errors_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(98229);


function shouldFingerprintTriggerError(code) {
    return (code === 'provider_unavailable'
        || code === 'all_hunks_failed'
        || code === 'invalid_model_selector');
}
/**
 * Capture trigger failures with stable tags and grouped fingerprints.
 */
function captureActionTriggerError(error, context) {
    const { code } = (0,_sdk_errors_js__WEBPACK_IMPORTED_MODULE_1__/* .classifyError */ .fe)(error);
    _sentry_js__WEBPACK_IMPORTED_MODULE_0__/* .Sentry.captureException */ .sQ.captureException(error, {
        tags: {
            'warden.trigger.name': context.triggerName,
            'gen_ai.agent.name': context.skillName,
            'warden.error.code': code,
        },
        ...(shouldFingerprintTriggerError(code) ? { fingerprint: ['warden', code] } : {}),
    });
    return code;
}


/***/ }),

/***/ 45154:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  Z: () => (/* binding */ evaluateFixAttempts),
  l: () => (/* reexport */ postThreadReply)
});

// EXTERNAL MODULE: ./src/output/dedup.ts
var dedup = __webpack_require__(3941);
// EXTERNAL MODULE: ./src/sdk/usage.ts
var usage = __webpack_require__(44759);
// EXTERNAL MODULE: ./src/output/stale.ts
var stale = __webpack_require__(95768);
// EXTERNAL MODULE: ./src/sentry.ts
var sentry = __webpack_require__(30340);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/schemas.js + 2 modules
var schemas = __webpack_require__(53391);
// EXTERNAL MODULE: ./src/sdk/prompt-sections.ts
var prompt_sections = __webpack_require__(49893);
// EXTERNAL MODULE: ./src/sdk/runtimes/index.ts + 1 modules
var runtimes = __webpack_require__(23473);
// EXTERNAL MODULE: ./src/types/index.ts
var types = __webpack_require__(78481);
;// CONCATENATED MODULE: ./src/action/fix-evaluation/types.ts



const FixJudgeVerdictSchema = schemas/* object */.Ik({
    status: types/* FixStatusSchema */.$3,
    reasoning: schemas/* string */.Yj(),
});

// EXTERNAL MODULE: ./src/cli/output/tty.ts
var tty = __webpack_require__(80029);
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
        (0,tty/* warnAction */.T6)(`Failed to post thread reply: ${error}`);
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
        ? (0,prompt_sections/* buildTaggedSection */.sG)('after_code', codeAfterFix)
        : undefined;
    const commitMessagesSection = commitMessages && commitMessages.length > 0
        ? (0,prompt_sections/* buildTaggedSection */.sG)('developer_intent', [
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
    return (0,prompt_sections/* joinPromptSections */.hZ)([
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
        (0,prompt_sections/* buildTaggedSection */.sG)('reported_issue', [
            `<title>${comment.title}</title>`,
            `<file>${comment.path}</file>`,
            `<line>${comment.line}</line>`,
            '<description>',
            comment.description,
            '</description>',
        ]),
        (0,prompt_sections/* buildTaggedSection */.sG)('before_code', codeBeforeFix),
        afterCodeSection,
        (0,prompt_sections/* buildFileListSection */.Oy)('changed_files', changedFiles),
        commitMessagesSection,
        (0,prompt_sections/* buildTaggedSection */.sG)('investigation_strategy', investigationStrategy),
        (0,prompt_sections/* buildJsonOutputSection */.j2)(`{"status": "resolved|attempted_failed|not_attempted", "reasoning": "One sentence explaining your verdict"}
Put your one-sentence explanation in the "reasoning" field.`),
    ]);
}
const GetFileDiffInput = schemas/* object */.Ik({
    path: schemas/* string */.Yj(),
});
const GetFileAtCommitInput = schemas/* object */.Ik({
    path: schemas/* string */.Yj(),
    commit: schemas/* enum */.k5(['before', 'after']),
    startLine: schemas/* number */.ai().optional(),
    endLine: schemas/* number */.ai().optional(),
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
        usage: (0,usage/* emptyUsage */.ly)(),
        usedFallback: true,
    };
    const prompt = buildPrompt(input);
    const executeTool = createToolExecutor(context);
    const result = await (0,runtimes/* getRuntime */.fr)(runtimeOptions.runtime).runAuxiliary({
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
    return comment.findingId ?? extractFindingId(comment.title) ?? (comment.body ? (0,dedup/* parseWardenFindingId */.rW)(comment.body) : undefined);
}
function getCommentSkill(comment) {
    return comment.skills?.[0] ?? (comment.body ? (0,dedup/* parseWardenSkills */.dh)(comment.body)[0] : undefined);
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
    return currentFindings.some((finding) => (0,stale/* findingMatchesComment */.i0)(finding, comment));
}
function createFallbackEvaluation() {
    return {
        verdict: { status: 'not_attempted', reasoning: EVALUATION_FAILED_REASONING },
        usage: (0,usage/* emptyUsage */.ly)(),
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
            usage: (0,usage/* emptyUsage */.ly)(),
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
        result.usage = usages.length > 0 ? (0,usage/* aggregateUsage */.Z$)(usages) : (0,usage/* emptyUsage */.ly)();
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


/***/ }),

/***/ 93857:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   C1: () => (/* binding */ validateInputs),
/* harmony export */   HC: () => (/* binding */ parseActionInputs),
/* harmony export */   Tw: () => (/* binding */ setupAuthEnv)
/* harmony export */ });
/* harmony import */ var _types_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(78481);
/* harmony import */ var _utils_index_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(36137);
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
    const failOn = _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SeverityThresholdSchema */ .q$.safeParse(failOnInput).success
        ? failOnInput
        : undefined;
    const reportOnInput = getInput('report-on');
    const reportOn = _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SeverityThresholdSchema */ .q$.safeParse(reportOnInput).success
        ? reportOnInput
        : undefined;
    const maxFindingsParsed = parseInt(getInput('max-findings') || '50', 10);
    const parallelParsed = parseInt(getInput('parallel') || String(_utils_index_js__WEBPACK_IMPORTED_MODULE_1__/* .DEFAULT_CONCURRENCY */ .WH), 10);
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
        parallel: Number.isNaN(parallelParsed) ? _utils_index_js__WEBPACK_IMPORTED_MODULE_1__/* .DEFAULT_CONCURRENCY */ .WH : parallelParsed,
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


/***/ }),

/***/ 52552:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   a: () => (/* binding */ findBotReviewState)
/* harmony export */ });
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


/***/ }),

/***/ 48352:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   t: () => (/* binding */ shouldResolveStaleComments)
/* harmony export */ });
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


/***/ }),

/***/ 44602:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   v: () => (/* binding */ postTriggerReview)
/* harmony export */ });
/* harmony import */ var _types_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(78481);
/* harmony import */ var _triggers_matcher_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(49431);
/* harmony import */ var _output_renderer_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(21242);
/* harmony import */ var _output_dedup_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(3941);
/* harmony import */ var _sdk_usage_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(44759);
/* harmony import */ var _sdk_extract_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(29709);
/* harmony import */ var _cli_output_tty_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(80029);
/**
 * Review Poster
 *
 * Handles posting GitHub PR reviews with deduplication.
 * Extracted from main.ts to isolate the complex review posting state machine.
 */







function emptyReviewPostResult(newComments, activeWardenCommentIds, findingObservations = []) {
    return { posted: false, newComments, activeWardenCommentIds, findingObservations, shouldFail: false };
}
function buildDedupeObservations(actions, skill) {
    return actions.map((action) => ({
        outcome: 'deduped',
        finding: action.finding,
        skill,
        dedupe: {
            source: action.existingComment.isWarden ? 'warden' : 'external',
            matchType: action.matchType,
            existingFindingId: action.existingComment.findingId,
            ...(action.existingComment.id > 0 ? { existingCommentId: action.existingComment.id } : {}),
            existingThreadId: action.existingComment.threadId,
            existingResolved: action.existingComment.isResolved,
            actor: action.existingComment.actor,
        },
    }));
}
function recenterReportFindingIds(reportFindings, actions) {
    if (actions.length === 0) {
        return reportFindings;
    }
    const ids = new Map(actions
        .filter((action) => action.originalFindingId !== action.finding.id)
        .map((action) => [action.originalFindingId, action.finding.id]));
    if (ids.size === 0) {
        return reportFindings;
    }
    return reportFindings.map((finding) => {
        const recenteredId = ids.get(finding.id);
        return recenteredId ? { ...finding, id: recenteredId } : finding;
    });
}
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
    const body = (0,_output_renderer_js__WEBPACK_IMPORTED_MODULE_2__/* .renderFindingsBody */ .D)(findings, skill);
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
    const findingObservations = [];
    if (!result.report) {
        return emptyReviewPostResult(newComments, activeWardenCommentIds);
    }
    const skill = result.report.skill;
    // Filter findings by reportOn threshold and confidence
    const filteredFindings = (0,_types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .filterFindings */ .Ni)(result.report.findings, result.reportOn, result.minConfidence);
    const reportOnSuccess = result.reportOnSuccess ?? false;
    // Skip if review rendering is disabled. In the normal action path this is
    // only possible when reportOn is "off", which leaves no filtered findings.
    if (!result.renderResult) {
        if (filteredFindings.length > 0) {
            console.warn(`::warning::Trigger ${result.triggerName} produced reportable findings without a render result`);
        }
        return emptyReviewPostResult(newComments, activeWardenCommentIds, findingObservations);
    }
    if (filteredFindings.length === 0 && !reportOnSuccess) {
        return emptyReviewPostResult(newComments, activeWardenCommentIds, findingObservations);
    }
    let findingsToMarkFailed = filteredFindings;
    try {
        // Cross-location merging already happened in runSkillTask().
        // Consolidate findings within this batch (intra-batch dedup).
        let findingsToPost = filteredFindings;
        const canUseAuxiliaryRuntime = (0,_sdk_extract_js__WEBPACK_IMPORTED_MODULE_4__/* .canUseRuntimeAuth */ .ad)({ apiKey, runtime: ctx.runtime });
        if (findingsToPost.length > 1) {
            const consolidateResult = await (0,_output_dedup_js__WEBPACK_IMPORTED_MODULE_3__/* .consolidateBatchFindings */ .aw)(findingsToPost, {
                apiKey,
                runtime: ctx.runtime,
                model: ctx.model,
                hashOnly: !canUseAuxiliaryRuntime,
                maxRetries: ctx.maxRetries,
                agentName: skill,
            });
            findingsToPost = consolidateResult.findings;
            findingsToMarkFailed = findingsToPost;
            for (const finding of consolidateResult.removedFindings ?? []) {
                findingObservations.push({
                    outcome: 'skipped',
                    finding,
                    skill,
                    skippedReason: 'duplicate_in_batch',
                });
            }
            if (consolidateResult.usage) {
                const consolidateAux = { consolidate: consolidateResult.usage };
                result.report.auxiliaryUsage = (0,_sdk_usage_js__WEBPACK_IMPORTED_MODULE_5__/* .mergeAuxiliaryUsage */ .wV)(result.report.auxiliaryUsage, consolidateAux);
            }
            if (consolidateResult.removedCount > 0) {
                (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_6__/* .logAction */ .d5)(`Consolidated ${consolidateResult.removedCount} duplicate findings within batch for ${result.triggerName}`);
            }
        }
        // Deduplicate findings against existing comments
        let dedupResult;
        if (existingComments.length > 0 && findingsToPost.length > 0) {
            dedupResult = await (0,_output_dedup_js__WEBPACK_IMPORTED_MODULE_3__/* .deduplicateFindings */ .v9)(findingsToPost, existingComments, {
                apiKey,
                runtime: ctx.runtime,
                model: ctx.model,
                currentSkill: skill,
                maxRetries: ctx.maxRetries,
            });
            result.report.findings = recenterReportFindingIds(result.report.findings, dedupResult.duplicateActions);
            findingsToPost = dedupResult.newFindings;
            findingsToMarkFailed = findingsToPost;
            findingObservations.push(...buildDedupeObservations(dedupResult.duplicateActions, skill));
            // Merge dedup usage into the report's auxiliary usage
            if (dedupResult.dedupUsage) {
                const dedupAux = { dedup: dedupResult.dedupUsage };
                result.report.auxiliaryUsage = (0,_sdk_usage_js__WEBPACK_IMPORTED_MODULE_5__/* .mergeAuxiliaryUsage */ .wV)(result.report.auxiliaryUsage, dedupAux);
            }
            if (dedupResult.duplicateActions.length > 0) {
                (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_6__/* .logAction */ .d5)(`Found ${dedupResult.duplicateActions.length} duplicate findings for ${result.triggerName}`);
            }
            for (const action of dedupResult.duplicateActions) {
                if (action.existingComment.isWarden && action.existingComment.id > 0) {
                    activeWardenCommentIds.add(action.existingComment.id);
                }
            }
        }
        // Process duplicate actions (update Warden comments, add reactions)
        if (dedupResult?.duplicateActions.length) {
            const actionCounts = await (0,_output_dedup_js__WEBPACK_IMPORTED_MODULE_3__/* .processDuplicateActions */ .G$)(octokit, context.repository.owner, context.repository.name, dedupResult.duplicateActions, skill);
            if (actionCounts.updated > 0) {
                (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_6__/* .logAction */ .d5)(`Updated ${actionCounts.updated} existing Warden comments with skill attribution`);
            }
            if (actionCounts.reacted > 0) {
                (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_6__/* .logAction */ .d5)(`Added reactions to ${actionCounts.reacted} existing external comments`);
            }
            if (actionCounts.failed > 0) {
                (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_6__/* .warnAction */ .T6)(`Failed to process ${actionCounts.failed} duplicate actions`);
            }
        }
        // Check if failOn threshold is met (even if all findings deduplicated, we still need REQUEST_CHANGES)
        // Filter by confidence first so low-confidence findings don't trigger REQUEST_CHANGES
        const useRequestChanges = result.requestChanges ?? false;
        const reportForFail = { ...result.report, findings: (0,_types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .filterFindings */ .Ni)(result.report.findings, undefined, result.minConfidence) };
        const needsRequestChanges = useRequestChanges && result.failOn && (0,_triggers_matcher_js__WEBPACK_IMPORTED_MODULE_1__/* .shouldFail */ .W9)(reportForFail, result.failOn);
        // Only post if we have non-duplicate findings, reportOnSuccess, or REQUEST_CHANGES needed
        if (findingsToPost.length > 0 || reportOnSuccess || needsRequestChanges) {
            // Re-render with deduplicated findings if any were removed
            const renderResultToPost = findingsToPost.length !== filteredFindings.length
                ? (0,_output_renderer_js__WEBPACK_IMPORTED_MODULE_2__/* .renderSkillReport */ .K)({ ...result.report, findings: findingsToPost }, {
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
            const skippedFindings = result.maxFindings
                ? findingsToPost.slice(result.maxFindings)
                : [];
            // Only overflow-eligible findings should be marked failed if posting throws
            findingsToMarkFailed = postedFindings;
            for (const finding of skippedFindings) {
                findingObservations.push({
                    outcome: 'skipped',
                    finding,
                    skill,
                    skippedReason: 'max_findings',
                });
            }
            try {
                await postReviewToGitHub(octokit, context, renderResultToPost);
            }
            catch (error) {
                if (!isLineResolutionError(error)) {
                    throw error;
                }
                (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_6__/* .warnAction */ .T6)(`Inline comments failed for ${result.triggerName}, posting findings in review body`);
                const fallback = moveCommentsToBody(renderResultToPost, postedFindings, skill);
                await postReviewToGitHub(octokit, context, fallback);
            }
            for (const finding of postedFindings) {
                findingObservations.push({ outcome: 'posted', finding, skill });
                const comment = (0,_output_dedup_js__WEBPACK_IMPORTED_MODULE_3__/* .findingToExistingComment */ .Xi)(finding, skill);
                if (comment) {
                    newComments.push(comment);
                }
            }
            return {
                posted: true,
                newComments,
                activeWardenCommentIds,
                findingObservations,
                shouldFail: false,
            };
        }
        return emptyReviewPostResult(newComments, activeWardenCommentIds, findingObservations);
    }
    catch (error) {
        (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_6__/* .warnAction */ .T6)(`Failed to post review for ${result.triggerName}: ${error}`);
        return {
            posted: false,
            newComments,
            activeWardenCommentIds,
            findingObservations: [
                ...findingObservations,
                ...findingsToMarkFailed.map((finding) => ({ outcome: 'failed', finding, skill })),
            ],
            shouldFail: false,
        };
    }
}


/***/ }),

/***/ 61211:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _octokit_rest__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(5798);
/* harmony import */ var _sentry_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(30340);
/* harmony import */ var _inputs_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(93857);
/* harmony import */ var _workflow_base_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(78000);
/* harmony import */ var _workflow_pr_workflow_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(39422);
/* harmony import */ var _workflow_schedule_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(30517);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_workflow_pr_workflow_js__WEBPACK_IMPORTED_MODULE_3__, _workflow_schedule_js__WEBPACK_IMPORTED_MODULE_4__]);
([_workflow_pr_workflow_js__WEBPACK_IMPORTED_MODULE_3__, _workflow_schedule_js__WEBPACK_IMPORTED_MODULE_4__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);
/**
 * GitHub Action Runner
 *
 * main.ts installs action-bundle compatibility hooks before loading this
 * module. Workflow modules own trigger-level error handling.
 */






(0,_sentry_js__WEBPACK_IMPORTED_MODULE_0__/* .initSentry */ .ig)('action');
async function run() {
    const inputs = (0,_inputs_js__WEBPACK_IMPORTED_MODULE_1__/* .parseActionInputs */ .HC)();
    (0,_inputs_js__WEBPACK_IMPORTED_MODULE_1__/* .validateInputs */ .C1)(inputs);
    const eventName = process.env['GITHUB_EVENT_NAME'];
    const eventPath = process.env['GITHUB_EVENT_PATH'];
    const repoPath = process.env['GITHUB_WORKSPACE'];
    if (!eventName || !eventPath || !repoPath) {
        (0,_workflow_base_js__WEBPACK_IMPORTED_MODULE_2__/* .setFailed */ .C1)('This action must be run in a GitHub Actions environment');
    }
    (0,_sentry_js__WEBPACK_IMPORTED_MODULE_0__/* .setGitHubActionScope */ .gs)(eventName);
    (0,_sentry_js__WEBPACK_IMPORTED_MODULE_0__/* .setRepositoryScope */ .vx)(process.env['GITHUB_REPOSITORY']);
    (0,_inputs_js__WEBPACK_IMPORTED_MODULE_1__/* .setupAuthEnv */ .Tw)(inputs);
    const octokit = new _octokit_rest__WEBPACK_IMPORTED_MODULE_5__/* .Octokit */ .E({ auth: inputs.githubToken });
    if (eventName === 'schedule' || eventName === 'workflow_dispatch') {
        return (0,_workflow_schedule_js__WEBPACK_IMPORTED_MODULE_4__/* .runScheduleWorkflow */ .y)(octokit, inputs, repoPath);
    }
    return (0,_workflow_pr_workflow_js__WEBPACK_IMPORTED_MODULE_3__/* .runPRWorkflow */ .r)(octokit, inputs, eventName, eventPath, repoPath);
}
run()
    .then(() => (0,_sentry_js__WEBPACK_IMPORTED_MODULE_0__/* .flushSentry */ .KR)())
    .catch(async (error) => {
    if (error instanceof _workflow_base_js__WEBPACK_IMPORTED_MODULE_2__/* .ActionFailedError */ .Ah) {
        console.error(`::error::${error.message}`);
    }
    else {
        _sentry_js__WEBPACK_IMPORTED_MODULE_0__/* .Sentry.captureException */ .sQ.captureException(error);
        console.error(`::error::Unexpected error: ${error}`);
    }
    await (0,_sentry_js__WEBPACK_IMPORTED_MODULE_0__/* .flushSentry */ .KR)();
    process.exit(1);
});

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 19533:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   k: () => (/* binding */ executeTrigger)
/* harmony export */ });
/* harmony import */ var _sentry_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(30340);
/* harmony import */ var _workflow_base_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(78000);
/* harmony import */ var _skills_loader_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(34691);
/* harmony import */ var _triggers_matcher_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(49431);
/* harmony import */ var _cli_output_tasks_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(5836);
/* harmony import */ var _output_renderer_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(21242);
/* harmony import */ var _output_github_checks_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(138);
/* harmony import */ var _sdk_types_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(88973);
/* harmony import */ var _sdk_errors_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(98229);
/* harmony import */ var _cli_output_verbosity_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(21307);
/* harmony import */ var _sdk_runtimes_model_selectors_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(85286);
/* harmony import */ var _error_reporting_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(29547);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_cli_output_tasks_js__WEBPACK_IMPORTED_MODULE_4__]);
_cli_output_tasks_js__WEBPACK_IMPORTED_MODULE_4__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];
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
    return _sentry_js__WEBPACK_IMPORTED_MODULE_0__/* .Sentry.startSpan */ .sQ.startSpan({ op: 'trigger.execute', name: `execute ${trigger.name}` }, async (span) => {
        span.setAttribute('gen_ai.agent.name', trigger.skill);
        span.setAttribute('warden.trigger.name', trigger.name);
        const { octokit, context, anthropicApiKey, claudePath } = deps;
        (0,_workflow_base_js__WEBPACK_IMPORTED_MODULE_1__/* .logGroup */ .QT)(`Running trigger: ${trigger.name} (skill: ${trigger.skill})`);
        // Create skill check (only for PRs)
        let skillCheckId;
        let skillCheckUrl;
        if (context.pullRequest) {
            try {
                const skillCheck = await (0,_output_github_checks_js__WEBPACK_IMPORTED_MODULE_6__/* .createSkillCheck */ .uP)(octokit, trigger.skill, {
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
            (0,_sdk_runtimes_model_selectors_js__WEBPACK_IMPORTED_MODULE_9__/* .assertValidPiModelSelectors */ .lG)([trigger]);
            const taskOptions = {
                name: trigger.name,
                displayName: trigger.skill,
                triggerName: trigger.name,
                failOn,
                resolveSkill: () => (0,_skills_loader_js__WEBPACK_IMPORTED_MODULE_2__/* .resolveSkillAsync */ .Cy)(trigger.skill, skillRoot, {
                    remote: trigger.remote,
                }),
                context: (0,_triggers_matcher_js__WEBPACK_IMPORTED_MODULE_3__/* .filterContextByPaths */ .Lb)(context, trigger.filters),
                runnerOptions: {
                    apiKey: anthropicApiKey,
                    model: trigger.model,
                    runtime: trigger.runtime,
                    reasoningEffort: trigger.reasoningEffort,
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
            const callbacks = (0,_cli_output_tasks_js__WEBPACK_IMPORTED_MODULE_4__/* .createDefaultCallbacks */ .O7)([taskOptions], CI_OUTPUT_MODE, _cli_output_verbosity_js__WEBPACK_IMPORTED_MODULE_8__/* .Verbosity */ .W.Normal);
            const fileConcurrency = deps.semaphore ? Number.MAX_SAFE_INTEGER : _sdk_types_js__WEBPACK_IMPORTED_MODULE_11__/* .DEFAULT_FILE_CONCURRENCY */ .f;
            const result = await (0,_cli_output_tasks_js__WEBPACK_IMPORTED_MODULE_4__/* .runSkillTask */ .UG)(taskOptions, fileConcurrency, callbacks, deps.semaphore);
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
                    new _sdk_errors_js__WEBPACK_IMPORTED_MODULE_7__/* .SkillRunnerError */ .cy(report.error.message, { code: report.error.code }));
            }
            console.log(`Found ${report.findings.length} findings`);
            // Update skill check with results
            if (skillCheckId && context.pullRequest) {
                try {
                    await (0,_output_github_checks_js__WEBPACK_IMPORTED_MODULE_6__/* .updateSkillCheck */ .Zv)(octokit, skillCheckId, report, {
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
                ? (0,_output_renderer_js__WEBPACK_IMPORTED_MODULE_5__/* .renderSkillReport */ .K)(report, {
                    maxFindings,
                    reportOn,
                    minConfidence,
                    failOn,
                    requestChanges,
                    checkRunUrl: skillCheckUrl,
                    totalFindings: report.findings.length,
                })
                : undefined;
            (0,_workflow_base_js__WEBPACK_IMPORTED_MODULE_1__/* .logGroupEnd */ .TN)();
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
            if (error instanceof _workflow_base_js__WEBPACK_IMPORTED_MODULE_1__/* .ActionFailedError */ .Ah)
                throw error;
            (0,_error_reporting_js__WEBPACK_IMPORTED_MODULE_10__/* .captureActionTriggerError */ .T)(error, {
                triggerName: trigger.name,
                skillName: trigger.skill,
            });
            // Mark skill check as failed
            if (skillCheckId && context.pullRequest) {
                try {
                    await (0,_output_github_checks_js__WEBPACK_IMPORTED_MODULE_6__/* .failSkillCheck */ .OZ)(octokit, skillCheckId, error, {
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
            (0,_workflow_base_js__WEBPACK_IMPORTED_MODULE_1__/* .logGroupEnd */ .TN)();
            return { triggerName: trigger.name, error };
        }
    });
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 78000:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  Ah: () => (/* binding */ ActionFailedError),
  sl: () => (/* binding */ collectTriggerErrors),
  dV: () => (/* binding */ computeWorkflowOutputs),
  $m: () => (/* binding */ ensureClaudeAuth),
  Uf: () => (/* binding */ getAuthenticatedBotLogin),
  YL: () => (/* binding */ getDefaultBranchFromAPI),
  a3: () => (/* binding */ handleTriggerErrors),
  QT: () => (/* binding */ logGroup),
  TN: () => (/* binding */ logGroupEnd),
  bZ: () => (/* binding */ prepareRuntimeEnvironment),
  C1: () => (/* binding */ setFailed),
  uH: () => (/* binding */ setOutput),
  wZ: () => (/* binding */ setWorkflowOutputs),
  JR: () => (/* binding */ writeFindingsOutput)
});

// UNUSED EXPORTS: findClaudeCodeExecutable, getFindingsOutputPath

// EXTERNAL MODULE: external "node:fs"
var external_node_fs_ = __webpack_require__(73024);
// EXTERNAL MODULE: external "node:os"
var external_node_os_ = __webpack_require__(48161);
// EXTERNAL MODULE: external "node:path"
var external_node_path_ = __webpack_require__(76760);
// EXTERNAL MODULE: external "node:crypto"
var external_node_crypto_ = __webpack_require__(77598);
// EXTERNAL MODULE: ./src/utils/exec.ts
var exec = __webpack_require__(82224);
// EXTERNAL MODULE: ./src/utils/path.ts
var path = __webpack_require__(60702);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/schemas.js + 2 modules
var schemas = __webpack_require__(53391);
// EXTERNAL MODULE: ./src/types/index.ts
var types = __webpack_require__(78481);
;// CONCATENATED MODULE: ./src/action/reporting/outcomes.ts


const DedupeDetailSchema = schemas/* object */.Ik({
    source: schemas/* enum */.k5(['warden', 'external']),
    matchType: schemas/* enum */.k5(['hash', 'semantic']),
    existingFindingId: schemas/* string */.Yj().optional(),
    existingCommentId: schemas/* number */.ai().int().positive().optional(),
    existingThreadId: schemas/* string */.Yj().optional(),
    existingResolved: schemas/* boolean */.zM().optional(),
    actor: schemas/* string */.Yj().optional(),
});
const FindingObservationSchema = schemas/* discriminatedUnion */.gM('outcome', [
    schemas/* object */.Ik({
        outcome: schemas/* literal */.eu('posted'),
        finding: types/* FindingSchema */.p_,
        skill: schemas/* string */.Yj().optional(),
    }),
    schemas/* object */.Ik({
        outcome: schemas/* literal */.eu('deduped'),
        finding: types/* FindingSchema */.p_,
        skill: schemas/* string */.Yj().optional(),
        dedupe: DedupeDetailSchema,
    }),
    schemas/* object */.Ik({
        outcome: schemas/* literal */.eu('skipped'),
        finding: types/* FindingSchema */.p_,
        skill: schemas/* string */.Yj().optional(),
        skippedReason: schemas/* enum */.k5(['max_findings', 'duplicate_in_batch']),
    }),
    schemas/* object */.Ik({
        outcome: schemas/* literal */.eu('resolved'),
        finding: types/* FindingSchema */.p_,
        skill: schemas/* string */.Yj().optional(),
        resolvedReason: schemas/* enum */.k5(['fix_evaluation', 'stale_check']),
    }),
    schemas/* object */.Ik({
        outcome: schemas/* literal */.eu('failed'),
        finding: types/* FindingSchema */.p_,
        skill: schemas/* string */.Yj().optional(),
    }),
]);

;// CONCATENATED MODULE: ./src/action/reporting/output.ts



const ExportedFindingSchema = schemas/* object */.Ik({
    id: schemas/* string */.Yj(),
    severity: types/* FindingSchema */.p_.shape.severity,
    confidence: types/* FindingSchema */.p_.shape.confidence,
    title: schemas/* string */.Yj(),
    description: schemas/* string */.Yj(),
    location: types/* LocationSchema */.TH.optional(),
    additionalLocations: schemas/* array */.YO(types/* LocationSchema */.TH).optional(),
    suggestedFix: types/* SuggestedFixSchema */.W8.optional(),
    sourceSnippet: types/* SourceSnippetSchema */.Ot.optional(),
});
const FindingsOutputSchema = schemas/* object */.Ik({
    version: schemas/* literal */.eu('1'),
    timestamp: schemas/* string */.Yj().datetime(),
    repository: schemas/* object */.Ik({
        owner: schemas/* string */.Yj(),
        name: schemas/* string */.Yj(),
        fullName: schemas/* string */.Yj(),
    }),
    event: types/* GitHubEventTypeSchema */.bN,
    pullRequest: schemas/* object */.Ik({
        number: schemas/* number */.ai().int(),
        author: schemas/* string */.Yj(),
        title: schemas/* string */.Yj(),
        baseBranch: schemas/* string */.Yj(),
        headBranch: schemas/* string */.Yj(),
        headSha: schemas/* string */.Yj(),
    }).optional(),
    runId: schemas/* string */.Yj(),
    summary: schemas/* object */.Ik({
        totalFindings: schemas/* number */.ai().int().nonnegative(),
        findingsBySeverity: schemas/* object */.Ik({
            high: schemas/* number */.ai().int().nonnegative(),
            medium: schemas/* number */.ai().int().nonnegative(),
            low: schemas/* number */.ai().int().nonnegative(),
        }),
        totalSkills: schemas/* number */.ai().int().nonnegative(),
    }),
    skills: schemas/* array */.YO(schemas/* object */.Ik({
        name: schemas/* string */.Yj(),
        summary: schemas/* string */.Yj(),
        model: schemas/* string */.Yj().optional(),
        durationMs: schemas/* number */.ai().nonnegative().optional(),
        usage: types/* UsageStatsSchema */.Ur.optional(),
        findings: schemas/* array */.YO(ExportedFindingSchema),
    })),
    findingObservations: schemas/* array */.YO(FindingObservationSchema),
});
/** Build the public findings export payload. */
function buildFindingsOutput(reports, context, findingObservations = [], options = {}) {
    const allFindings = reports.flatMap((r) => r.findings);
    const output = {
        version: '1',
        timestamp: options.timestamp ?? new Date().toISOString(),
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
        runId: options.runId ?? process.env['GITHUB_RUN_ID'] ?? '',
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
                sourceSnippet: f.sourceSnippet,
            })),
        })),
        findingObservations,
    };
    return FindingsOutputSchema.parse(output);
}

// EXTERNAL MODULE: ./src/triggers/matcher.ts
var matcher = __webpack_require__(49431);
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
/** Prepare runtime-specific process dependencies required by matched triggers. */
async function prepareRuntimeEnvironment(triggers, inputs) {
    const runtimes = new Set();
    for (const trigger of triggers) {
        runtimes.add(trigger.runtime ?? 'pi');
    }
    const env = {};
    for (const runtime of runtimes) {
        switch (runtime) {
            case 'pi':
                break;
            case 'claude':
                ensureClaudeAuth(inputs);
                env.pathToClaudeCodeExecutable = await findClaudeCodeExecutable();
                break;
        }
    }
    return env;
}
// -----------------------------------------------------------------------------
// Claude Code CLI
// -----------------------------------------------------------------------------
const CLAUDE_CODE_VERSION = '2.1.32';
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
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
function findInstalledClaudeCodeExecutable() {
    const envPath = process.env['CLAUDE_CODE_PATH'];
    if (envPath && isExecutable(envPath)) {
        return envPath;
    }
    // Standard install location from claude.ai/install.sh
    const home = process.env['HOME'];
    const homeLocalBin = home ? `${home}/.local/bin/claude` : undefined;
    if (homeLocalBin && isExecutable(homeLocalBin)) {
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
    return undefined;
}
async function installClaudeCodeExecutable() {
    console.log(`Installing Claude Code v${CLAUDE_CODE_VERSION}...`);
    for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`Installation attempt ${attempt}...`);
        try {
            const output = (0,exec/* execNonInteractive */.zt)(`curl -fsSL https://claude.ai/install.sh | bash -s -- "${CLAUDE_CODE_VERSION}"`, { timeout: 120_000 });
            if (output) {
                console.log(output);
            }
            console.log('Claude Code installed successfully');
            return;
        }
        catch (error) {
            if (attempt === 3) {
                setFailed(`Failed to install Claude Code after 3 attempts: ${error}`);
            }
            console.log('Installation failed, retrying...');
            await sleep(5000);
        }
    }
}
/**
 * Find the Claude Code CLI executable path, installing it on demand when the
 * selected runtime needs Claude Code in CI.
 */
async function findClaudeCodeExecutable() {
    const existingPath = findInstalledClaudeCodeExecutable();
    if (existingPath) {
        return existingPath;
    }
    await installClaudeCodeExecutable();
    const installedPath = findInstalledClaudeCodeExecutable();
    if (installedPath) {
        return installedPath;
    }
    setFailed('Claude Code CLI not found after installation. Ensure Claude Code is installed via https://claude.ai/install.sh');
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
        highCount: (0,matcher/* countSeverity */.jC)(reports, 'high'),
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
function writeFindingsOutput(reports, context, findingObservations = []) {
    const filePath = getFindingsOutputPath(context.repoPath);
    const output = buildFindingsOutput(reports, context, findingObservations);
    (0,external_node_fs_.mkdirSync)((0,external_node_path_.dirname)(filePath), { recursive: true });
    (0,external_node_fs_.writeFileSync)(filePath, JSON.stringify(output, null, 2));
    setOutput('findings-file', getFindingsOutputValue(filePath, context.repoPath));
    return filePath;
}


/***/ }),

/***/ 39422:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   r: () => (/* binding */ runPRWorkflow)
/* harmony export */ });
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(73024);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _sentry_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(30340);
/* harmony import */ var _config_loader_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(60866);
/* harmony import */ var _event_context_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(58147);
/* harmony import */ var _triggers_matcher_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(49431);
/* harmony import */ var _output_dedup_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(3941);
/* harmony import */ var _output_stale_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(95768);
/* harmony import */ var _types_index_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(78481);
/* harmony import */ var _utils_index_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(36137);
/* harmony import */ var _fix_evaluation_index_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(45154);
/* harmony import */ var _sdk_usage_js__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(44759);
/* harmony import */ var _cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(80029);
/* harmony import */ var _cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(43171);
/* harmony import */ var _review_state_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(52552);
/* harmony import */ var _triggers_executor_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(19533);
/* harmony import */ var _review_poster_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(44602);
/* harmony import */ var _review_coordination_js__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(48352);
/* harmony import */ var _sdk_extract_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(29709);
/* harmony import */ var _sdk_circuit_breaker_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(71794);
/* harmony import */ var _checks_manager_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(28865);
/* harmony import */ var _base_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(78000);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_triggers_executor_js__WEBPACK_IMPORTED_MODULE_12__]);
_triggers_executor_js__WEBPACK_IMPORTED_MODULE_12__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];
/**
 * PR Workflow
 *
 * Handles pull_request and push events.
 */





















function existingCommentToFinding(comment) {
    const location = comment.path && comment.line > 0
        ? {
            path: comment.path,
            startLine: comment.line,
            endLine: comment.line,
        }
        : undefined;
    return {
        id: comment.findingId ?? `comment-${comment.id}`,
        severity: comment.severity ?? 'low',
        title: comment.title,
        description: comment.description,
        ...(comment.confidence ? { confidence: comment.confidence } : {}),
        ...(location ? { location } : {}),
    };
}
function reportsPullRequestCheck(trigger, context) {
    return (Boolean(context.pullRequest) &&
        (trigger.type === 'pull_request' || trigger.type === '*'));
}
function checkOptionsForPullRequest(context) {
    if (!context.pullRequest) {
        return undefined;
    }
    return {
        owner: context.repository.owner,
        repo: context.repository.name,
        headSha: context.pullRequest.headSha,
    };
}
function resolveWorkflowAuxiliaryOptions(layered) {
    const baseDefaults = layered.baseConfig?.defaults;
    const repoDefaults = layered.repoConfig?.defaults ?? layered.config.defaults;
    return {
        // These workflow-scoped auxiliary calls are not tied to an individual
        // trigger, so the org base config remains the enforced baseline and the
        // repo layer only fills fields the base omits.
        runtime: baseDefaults?.runtime ?? repoDefaults?.runtime ?? 'pi',
        model: (0,_config_loader_js__WEBPACK_IMPORTED_MODULE_2__/* .emptyToUndefined */ .Zu)(baseDefaults?.auxiliary?.model) ??
            (0,_config_loader_js__WEBPACK_IMPORTED_MODULE_2__/* .emptyToUndefined */ .Zu)(repoDefaults?.auxiliary?.model),
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
    const costStr = ev.usage.costUSD > 0 ? `, ${(0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_10__/* .formatCost */ .BD)(ev.usage.costUSD)}` : '';
    const idPrefix = ev.findingId ? `${ev.findingId} ` : '';
    const verdict = ev.verdict;
    const line = `  [${index + 1}/${total}] ${idPrefix}${ev.path}:${ev.line} → ${verdict} (${(0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_10__/* .formatDuration */ .a3)(ev.durationMs)}, ${(0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_10__/* .formatTokens */ ._y)(totalTokens)} tok${costStr})`;
    if (ev.usedFallback) {
        (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(line);
    }
    else {
        (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)(line);
    }
    if (ev.verdict === 'attempted_failed' && ev.reasoning) {
        (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)(`        reason: "${ev.reasoning}"`);
    }
}
function groupCommentsForFixEvaluation(comments, headSha) {
    const groups = new Map();
    let currentHeadCount = 0;
    let missingOriginalCommitCount = 0;
    for (const comment of comments) {
        const originalCommitSha = comment.originalCommitSha;
        if (!originalCommitSha) {
            missingOriginalCommitCount++;
            continue;
        }
        if (originalCommitSha === headSha) {
            currentHeadCount++;
            continue;
        }
        const group = groups.get(originalCommitSha);
        if (group) {
            group.push(comment);
        }
        else {
            groups.set(originalCommitSha, [comment]);
        }
    }
    return { groups, currentHeadCount, missingOriginalCommitCount };
}
function mergeFixEvaluationResults(results) {
    return {
        toResolve: results.flatMap((result) => result.toResolve),
        toReply: results.flatMap((result) => result.toReply),
        skipped: results.reduce((total, result) => total + result.skipped, 0),
        evaluated: results.reduce((total, result) => total + result.evaluated, 0),
        failedEvaluations: results.reduce((total, result) => total + result.failedEvaluations, 0),
        uniqueFindingsEvaluated: results.reduce((total, result) => total + result.uniqueFindingsEvaluated, 0),
        uniqueFindingsCodeChanged: results.reduce((total, result) => total + result.uniqueFindingsCodeChanged, 0),
        uniqueFindingsResolved: results.reduce((total, result) => total + result.uniqueFindingsResolved, 0),
        usage: (0,_sdk_usage_js__WEBPACK_IMPORTED_MODULE_19__/* .aggregateUsage */ .Z$)(results.map((result) => result.usage)),
        evaluations: results.flatMap((result) => result.evaluations),
    };
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
        eventPayload = JSON.parse((0,node_fs__WEBPACK_IMPORTED_MODULE_0__.readFileSync)(eventPath, 'utf-8'));
    }
    catch (error) {
        _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.captureException */ .sQ.captureException(error, { tags: { operation: 'read_event_payload' } });
        (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .setFailed */ .C1)(`Failed to read event payload: ${error}`);
    }
    (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .logGroup */ .QT)('Building event context');
    console.log(`Event: ${eventName}`);
    console.log(`Workspace: ${repoPath}`);
    (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .logGroupEnd */ .TN)();
    let context;
    try {
        context = await (0,_event_context_js__WEBPACK_IMPORTED_MODULE_3__/* .buildEventContext */ .e)(eventName, eventPayload, repoPath, octokit);
    }
    catch (error) {
        _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.captureException */ .sQ.captureException(error, { tags: { operation: 'build_event_context' } });
        (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .setFailed */ .C1)(`Failed to build event context: ${error}`);
    }
    (0,_sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .setRepositoryScope */ .vx)(context.repository.fullName);
    (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .logGroup */ .QT)('Loading configuration');
    if (inputs.baseConfigPath) {
        console.log(`Base config path: ${inputs.baseConfigPath}`);
    }
    if (inputs.baseSkillRoot) {
        console.log(`Base skill root: ${inputs.baseSkillRoot}`);
    }
    console.log(`Repo config path: ${inputs.configPath}`);
    (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .logGroupEnd */ .TN)();
    let runnerConcurrency;
    let auxiliaryOptions = { runtime: 'pi' };
    let skillRootsByName;
    try {
        const layered = (0,_config_loader_js__WEBPACK_IMPORTED_MODULE_2__/* .loadLayeredWardenConfig */ .M3)(repoPath, {
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
        skillRootsByName = (0,_config_loader_js__WEBPACK_IMPORTED_MODULE_2__/* .buildSkillRootsByName */ .hd)(repoPath, layered, inputs.baseSkillRoot);
        const resolvedTriggers = (0,_config_loader_js__WEBPACK_IMPORTED_MODULE_2__/* .resolveLayeredSkillConfigs */ .Ln)(layered, undefined, skillRootsByName);
        const matchedTriggers = resolvedTriggers.filter((t) => (0,_triggers_matcher_js__WEBPACK_IMPORTED_MODULE_4__/* .matchTrigger */ .QW)(t, context, 'github'));
        const skippedTriggers = resolvedTriggers.filter((t) => reportsPullRequestCheck(t, context) && !matchedTriggers.includes(t));
        if (matchedTriggers.length > 0) {
            (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .logGroup */ .QT)('Matched triggers');
            for (const trigger of matchedTriggers) {
                console.log(`- ${trigger.name}: ${trigger.skill}`);
            }
            (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .logGroupEnd */ .TN)();
        }
        else {
            console.log('No triggers matched for this event');
        }
        return { context, runnerConcurrency, auxiliaryOptions, matchedTriggers, skippedTriggers };
    }
    catch (error) {
        if (error instanceof _config_loader_js__WEBPACK_IMPORTED_MODULE_2__/* .ConfigLoadError */ .tx &&
            error.message.includes('not found') &&
            !inputs.baseConfigPath) {
            const message = 'No warden.toml found. Skipping analysis.';
            console.log(`::warning::${message}`);
            return {
                context,
                runnerConcurrency,
                auxiliaryOptions,
                matchedTriggers: [],
                skippedTriggers: [],
                skipCoreCheck: {
                    title: 'No warden.toml found',
                    message,
                },
            };
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
        const botLogin = await (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .getAuthenticatedBotLogin */ .Uf)(octokit);
        if (!botLogin) {
            (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)('Skipping dismiss flow: cannot identify bot (using PAT or GITHUB_TOKEN instead of GitHub App)');
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
        return (0,_review_state_js__WEBPACK_IMPORTED_MODULE_11__/* .findBotReviewState */ .a)(reviews, botLogin);
    }
    catch (error) {
        (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(`Failed to fetch previous review info: ${error}`);
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
        const coreCheck = await (0,_checks_manager_js__WEBPACK_IMPORTED_MODULE_16__/* .createCoreCheck */ .c)(octokit, {
            owner: context.repository.owner,
            repo: context.repository.name,
            headSha: context.pullRequest.headSha,
        });
        coreCheckId = coreCheck.checkRunId;
        (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)(`Created core check: ${coreCheck.url}`);
    }
    catch (error) {
        _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.captureException */ .sQ.captureException(error, { tags: { operation: 'create_core_check' } });
        (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(`Failed to create core check: ${error}`);
    }
    previousReviewInfo = await fetchPreviousReviewInfo(octokit, context);
    if (previousReviewInfo) {
        (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)(`Previous Warden review state: ${previousReviewInfo.state}`);
    }
    return { coreCheckId, previousReviewInfo };
}
/**
 * Run all matched triggers in parallel batches.
 */
async function executeAllTriggers(matchedTriggers, octokit, context, runnerConcurrency, inputs) {
    const concurrency = runnerConcurrency ?? inputs.parallel;
    const runtimeEnv = await (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .prepareRuntimeEnvironment */ .bZ)(matchedTriggers, inputs);
    const semaphore = new _utils_index_js__WEBPACK_IMPORTED_MODULE_8__/* .Semaphore */ .jf(concurrency);
    const abortController = new AbortController();
    const circuitBreaker = new _sdk_circuit_breaker_js__WEBPACK_IMPORTED_MODULE_15__/* .ProviderFailureCircuitBreaker */ .j({ abortController });
    // Limit trigger dispatch too; the semaphore only gates work after a trigger starts.
    return (0,_utils_index_js__WEBPACK_IMPORTED_MODULE_8__/* .runPool */ .kD)(matchedTriggers, concurrency, (trigger) => (0,_triggers_executor_js__WEBPACK_IMPORTED_MODULE_12__/* .executeTrigger */ .k)(trigger, {
        octokit,
        context,
        anthropicApiKey: inputs.anthropicApiKey,
        claudePath: runtimeEnv.pathToClaudeCodeExecutable,
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
            fetchedComments = await (0,_output_dedup_js__WEBPACK_IMPORTED_MODULE_5__/* .fetchExistingComments */ .kX)(octokit, context.repository.owner, context.repository.name, context.pullRequest.number);
            existingComments = [...fetchedComments];
            if (fetchedComments.length > 0) {
                const wardenCount = fetchedComments.filter((c) => c.isWarden).length;
                const externalCount = fetchedComments.length - wardenCount;
                (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)(`Found ${fetchedComments.length} existing comments for deduplication (${wardenCount} Warden, ${externalCount} external)`);
            }
        }
        catch (error) {
            _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.captureException */ .sQ.captureException(error, { tags: { operation: 'fetch_existing_comments' } });
            (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(`Failed to fetch existing comments for deduplication: ${error}`);
        }
    }
    // Post reviews to GitHub (sequentially to avoid rate limits)
    const reports = [];
    const activeWardenCommentIds = new Set();
    const findingObservations = [];
    let shouldFailAction = false;
    const failureReasons = [];
    for (const result of results) {
        if (result.report) {
            reports.push(result.report);
            // Post review
            const postResult = await (0,_review_poster_js__WEBPACK_IMPORTED_MODULE_13__/* .postTriggerReview */ .v)({
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
            findingObservations.push(...postResult.findingObservations);
            // Check if we should fail based on this trigger's config
            // Filter by confidence first so low-confidence findings don't cause failure
            const failCheck = result.failCheck ?? false;
            const reportForFail = { ...result.report, findings: (0,_types_index_js__WEBPACK_IMPORTED_MODULE_7__/* .filterFindings */ .Ni)(result.report.findings, undefined, result.minConfidence) };
            if (failCheck && result.failOn && (0,_triggers_matcher_js__WEBPACK_IMPORTED_MODULE_4__/* .shouldFail */ .W9)(reportForFail, result.failOn)) {
                shouldFailAction = true;
                const count = (0,_triggers_matcher_js__WEBPACK_IMPORTED_MODULE_4__/* .countFindingsAtOrAbove */ .tH)(reportForFail, result.failOn);
                failureReasons.push(`${result.triggerName}: Found ${count} ${result.failOn}+ severity issues`);
            }
        }
    }
    return {
        reports,
        fetchedComments,
        existingComments,
        activeWardenCommentIds,
        findingObservations,
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
    const findingObservations = [];
    const commentsForFixEvaluation = wardenComments.filter((c) => !activeWardenCommentIds.has(c.id));
    const fixEvaluationRuntime = auxiliaryOptions.runtime ?? 'pi';
    const canUseFixEvaluationRuntime = (0,_sdk_extract_js__WEBPACK_IMPORTED_MODULE_14__/* .canUseRuntimeAuth */ .ad)({
        apiKey: anthropicApiKey,
        runtime: fixEvaluationRuntime,
    });
    // Evaluate follow-up commit fix attempts
    if (context.pullRequest &&
        commentsForFixEvaluation.length > 0 &&
        canResolveStale &&
        canUseFixEvaluationRuntime) {
        try {
            (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .logGroup */ .QT)('Fix evaluation');
            // Only evaluate comments that were posted on an earlier commit. If a comment was
            // posted on the current headSha there are no follow-up changes to evaluate yet, and
            // running fix evaluation would compare the entire PR diff (PR base to head) against a
            // finding from this same run, producing spurious "Fix attempt detected" replies.
            const headSha = context.pullRequest.headSha;
            const { groups: commentsByOriginalCommit, currentHeadCount, missingOriginalCommitCount, } = groupCommentsForFixEvaluation(commentsForFixEvaluation, headSha);
            const unresolvedCount = [...commentsByOriginalCommit.values()]
                .flat()
                .filter((c) => !c.isResolved && c.threadId).length;
            if (unresolvedCount > 0) {
                (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)(`Fix evaluation: evaluating ${unresolvedCount} unresolved comments`);
            }
            else {
                (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)(`Fix evaluation: no eligible comments (${currentHeadCount} current head, ` +
                    `${missingOriginalCommitCount} missing original commit)`);
            }
            const groupResults = [];
            for (const [commentBaseSha, groupComments] of commentsByOriginalCommit) {
                groupResults.push(await (0,_fix_evaluation_index_js__WEBPACK_IMPORTED_MODULE_9__/* .evaluateFixAttempts */ .Z)(octokit, groupComments, {
                    owner: context.repository.owner,
                    repo: context.repository.name,
                    baseSha: commentBaseSha,
                    headSha,
                }, allFindings, anthropicApiKey, { ...auxiliaryOptions, runtime: fixEvaluationRuntime }));
            }
            const fixEvaluation = mergeFixEvaluationResults(groupResults);
            // Log per-evaluation details
            fixEvaluation.evaluations.forEach((ev, i) => logFixEvaluation(ev, i, fixEvaluation.evaluations.length));
            // Resolve successful fixes
            if (fixEvaluation.toResolve.length > 0) {
                const { resolvedCount, resolvedIds } = await (0,_output_stale_js__WEBPACK_IMPORTED_MODULE_6__/* .resolveStaleComments */ .AG)(octokit, fixEvaluation.toResolve);
                if (resolvedCount > 0) {
                    (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)(`Resolved ${resolvedCount} comments via fix evaluation`);
                }
                // Track only actually resolved comments for allResolved check
                resolvedIds.forEach((id) => commentsResolvedByFixEval.add(id));
                for (const comment of fixEvaluation.toResolve) {
                    if (!resolvedIds.has(comment.id))
                        continue;
                    findingObservations.push({
                        outcome: 'resolved',
                        finding: existingCommentToFinding(comment),
                        skill: comment.skills?.[0],
                        resolvedReason: 'fix_evaluation',
                    });
                }
            }
            // Post replies for failed fixes and track them so stale pass doesn't override
            for (const reply of fixEvaluation.toReply) {
                commentsEvaluatedByFixEval.add(reply.comment.id);
                if (reply.comment.threadId) {
                    try {
                        await (0,_fix_evaluation_index_js__WEBPACK_IMPORTED_MODULE_9__/* .postThreadReply */ .l)(octokit, reply.comment.threadId, reply.replyBody);
                    }
                    catch (error) {
                        _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.captureException */ .sQ.captureException(error, { tags: { operation: 'post_thread_reply' } });
                    }
                }
            }
            if (fixEvaluation.evaluated > 0) {
                const totalTokens = fixEvaluation.usage.inputTokens + fixEvaluation.usage.outputTokens;
                let usageStr = '';
                if (totalTokens > 0) {
                    usageStr = `, ${(0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_10__/* .formatTokens */ ._y)(totalTokens)} tok, ${(0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_10__/* .formatCost */ .BD)(fixEvaluation.usage.costUSD)}`;
                }
                (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)(`Fix evaluation: ${fixEvaluation.toResolve.length} resolved, ` +
                    `${fixEvaluation.toReply.length} need attention, ` +
                    `${fixEvaluation.skipped} skipped` +
                    usageStr);
            }
            (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .logGroupEnd */ .TN)();
        }
        catch (error) {
            _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.captureException */ .sQ.captureException(error, { tags: { operation: 'evaluate_fix_attempts' } });
            (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(`Failed to evaluate fix attempts: ${error}`);
            (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .logGroupEnd */ .TN)();
        }
    }
    // Resolve stale Warden comments (comments that no longer have matching findings)
    // Exclude comments already handled by fix evaluation (resolved or flagged as needing attention)
    if (context.pullRequest && wardenComments.length > 0 && canResolveStale) {
        try {
            const scope = (0,_output_stale_js__WEBPACK_IMPORTED_MODULE_6__/* .buildAnalyzedScope */ .B8)(context.pullRequest.files);
            const commentsForStaleCheck = wardenComments.filter((c) => !activeWardenCommentIds.has(c.id) &&
                !commentsResolvedByFixEval.has(c.id) &&
                !commentsEvaluatedByFixEval.has(c.id));
            const staleComments = (0,_output_stale_js__WEBPACK_IMPORTED_MODULE_6__/* .findStaleComments */ .t8)(commentsForStaleCheck, allFindings, scope);
            if (staleComments.length > 0) {
                const { resolvedCount, resolvedIds } = await (0,_output_stale_js__WEBPACK_IMPORTED_MODULE_6__/* .resolveStaleComments */ .AG)(octokit, staleComments);
                if (resolvedCount > 0) {
                    (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)(`Resolved ${resolvedCount} stale Warden comments`);
                    (0,_sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .emitStaleResolutionMetric */ .fL)(resolvedCount);
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
                        (0,_sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .emitStaleResolutionMetric */ .fL)(count, skill);
                    }
                }
                resolvedIds.forEach((id) => commentsResolvedByStale.add(id));
                for (const comment of staleComments) {
                    if (!resolvedIds.has(comment.id))
                        continue;
                    findingObservations.push({
                        outcome: 'resolved',
                        finding: existingCommentToFinding(comment),
                        skill: comment.skills?.[0],
                        resolvedReason: 'stale_check',
                    });
                }
            }
        }
        catch (error) {
            _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.captureException */ .sQ.captureException(error, { tags: { operation: 'resolve_stale_comments' } });
            (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(`Failed to resolve stale comments: ${error}`);
        }
    }
    else if (!canResolveStale && wardenComments.length > 0) {
        (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)('Skipping stale comment resolution due to trigger failures');
    }
    // Determine if all unresolved Warden comments were resolved during this run
    const unresolvedBefore = wardenComments.filter((c) => !c.isResolved);
    const allResolved = unresolvedBefore.every((c) => commentsResolvedByFixEval.has(c.id) || commentsResolvedByStale.has(c.id));
    return {
        allResolved,
        autoResolvedByFixEvaluation: commentsResolvedByFixEval.size,
        autoResolvedByStaleCheck: commentsResolvedByStale.size,
        findingObservations,
    };
}
/**
 * Dismiss review, set outputs, update core check, fail action.
 */
async function finalizeWorkflow(octokit, context, previousReviewInfo, coreCheckId, results, reports, findingObservations, shouldFailAction, failureReasons, canResolveStale, triggerErrors) {
    // Dismiss previous CHANGES_REQUESTED if all blocking issues are resolved.
    // Requires: all triggers succeeded, current run would not request changes,
    // and at least one trigger has an active failOn (prevents accidental dismiss when config changes).
    const wouldRequestChanges = results.some((r) => {
        if (!r.failOn || r.failOn === 'off' || !(r.requestChanges ?? false) || !r.report)
            return false;
        const filtered = { ...r.report, findings: (0,_types_index_js__WEBPACK_IMPORTED_MODULE_7__/* .filterFindings */ .Ni)(r.report.findings, undefined, r.minConfidence) };
        return (0,_triggers_matcher_js__WEBPACK_IMPORTED_MODULE_4__/* .shouldFail */ .W9)(filtered, r.failOn);
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
            (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)('Dismissed previous CHANGES_REQUESTED review');
        }
        catch (error) {
            _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.captureException */ .sQ.captureException(error, { tags: { operation: 'dismiss_review' } });
            (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(`Failed to dismiss previous review: ${error}`);
        }
    }
    // Set outputs
    const outputs = (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .computeWorkflowOutputs */ .dV)(reports);
    (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .setWorkflowOutputs */ .wZ)(outputs);
    // Write structured findings to file for external export (GCS, S3, etc.)
    try {
        const findingsPath = (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .writeFindingsOutput */ .JR)(reports, context, findingObservations);
        (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)(`Findings written to ${findingsPath}`);
    }
    catch (error) {
        (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(`Failed to write findings output: ${error}`);
    }
    // Update core check with overall summary
    if (coreCheckId && context.pullRequest) {
        try {
            const summaryData = (0,_checks_manager_js__WEBPACK_IMPORTED_MODULE_16__/* .buildCoreSummaryData */ .YX)(results, reports);
            const coreConclusion = (0,_checks_manager_js__WEBPACK_IMPORTED_MODULE_16__/* .determineCoreConclusion */ .ar)(shouldFailAction || triggerErrors.length > 0, outputs.findingsCount);
            await (0,_checks_manager_js__WEBPACK_IMPORTED_MODULE_16__/* .updateCoreCheck */ .R2)(octokit, coreCheckId, summaryData, coreConclusion, {
                owner: context.repository.owner,
                repo: context.repository.name,
            });
        }
        catch (error) {
            _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.captureException */ .sQ.captureException(error, { tags: { operation: 'update_core_check' } });
            (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(`Failed to update core check: ${error}`);
        }
    }
    if (shouldFailAction) {
        (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .setFailed */ .C1)(failureReasons.join('; '));
    }
    (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)(`Analysis complete: ${outputs.findingsCount} total findings`);
}
/** Complete the core check for a PR run that intentionally skipped analysis. */
async function completeSkippedCoreCheck(octokit, context, coreCheckId, skipped) {
    const options = checkOptionsForPullRequest(context);
    if (!coreCheckId || !options) {
        return;
    }
    try {
        await (0,_checks_manager_js__WEBPACK_IMPORTED_MODULE_16__/* .updateCoreCheck */ .R2)(octokit, coreCheckId, {
            ...(0,_checks_manager_js__WEBPACK_IMPORTED_MODULE_16__/* .buildCoreSummaryData */ .YX)([], []),
            title: skipped.title,
            message: skipped.message,
        }, 'neutral', options);
    }
    catch (error) {
        _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.captureException */ .sQ.captureException(error, { tags: { operation: 'update_core_check_skipped' } });
        (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(`Failed to update core check: ${error}`);
    }
}
/** Complete per-skill checks for configured PR triggers that did not run. */
async function completeSkippedSkillChecks(octokit, context, skippedTriggers) {
    const options = checkOptionsForPullRequest(context);
    if (!options || skippedTriggers.length === 0) {
        return;
    }
    for (const trigger of skippedTriggers) {
        try {
            const skillCheck = await (0,_checks_manager_js__WEBPACK_IMPORTED_MODULE_16__/* .createSkillCheck */ .uP)(octokit, trigger.skill, options);
            await (0,_checks_manager_js__WEBPACK_IMPORTED_MODULE_16__/* .updateSkillCheck */ .Zv)(octokit, skillCheck.checkRunId, {
                skill: trigger.skill,
                summary: 'Trigger did not run for this event.',
                findings: [],
            }, {
                ...options,
                failOn: trigger.failOn,
                reportOn: trigger.reportOn,
                minConfidence: trigger.minConfidence ?? 'medium',
                failCheck: trigger.failCheck,
                conclusion: 'neutral',
                title: 'Skipped',
            });
        }
        catch (error) {
            _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.captureException */ .sQ.captureException(error, {
                tags: {
                    operation: 'update_skipped_skill_check',
                    trigger_name: trigger.name,
                    skill_name: trigger.skill,
                },
            });
            (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(`Failed to update skipped skill check for ${trigger.skill}: ${error}`);
        }
    }
}
/**
 * Fail per-skill checks when workflow setup fails before triggers are dispatched.
 */
async function failUndispatchedSkillChecks(octokit, context, triggers, error) {
    const options = checkOptionsForPullRequest(context);
    if (!options || triggers.length === 0) {
        return;
    }
    for (const trigger of triggers) {
        try {
            const skillCheck = await (0,_checks_manager_js__WEBPACK_IMPORTED_MODULE_16__/* .createSkillCheck */ .uP)(octokit, trigger.skill, options);
            await (0,_checks_manager_js__WEBPACK_IMPORTED_MODULE_16__/* .failSkillCheck */ .OZ)(octokit, skillCheck.checkRunId, error, options);
        }
        catch (checkError) {
            _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.captureException */ .sQ.captureException(checkError, {
                tags: {
                    operation: 'fail_undispatched_skill_check',
                    trigger_name: trigger.name,
                    skill_name: trigger.skill,
                },
            });
            (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(`Failed to mark skill check as failed for ${trigger.skill}: ${checkError}`);
        }
    }
}
/**
 * Mark the core check failed when an early PR workflow phase fails after check creation.
 */
async function failCoreCheck(octokit, context, coreCheckId, error) {
    const options = checkOptionsForPullRequest(context);
    if (!coreCheckId || !options) {
        return;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    try {
        await (0,_checks_manager_js__WEBPACK_IMPORTED_MODULE_16__/* .updateCoreCheck */ .R2)(octokit, coreCheckId, {
            ...(0,_checks_manager_js__WEBPACK_IMPORTED_MODULE_16__/* .buildCoreSummaryData */ .YX)([], []),
            title: 'Warden failed',
            message: `Error: ${errorMessage}`,
        }, 'failure', options);
    }
    catch (checkError) {
        _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.captureException */ .sQ.captureException(checkError, { tags: { operation: 'fail_core_check' } });
        (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(`Failed to mark core check as failed: ${checkError}`);
    }
}
async function runOrFailCore(octokit, context, coreCheckId, operation) {
    try {
        return await operation();
    }
    catch (error) {
        await failCoreCheck(octokit, context, coreCheckId, error);
        throw error;
    }
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
        return [];
    }
    let existingComments;
    try {
        existingComments = await (0,_output_dedup_js__WEBPACK_IMPORTED_MODULE_5__/* .fetchExistingComments */ .kX)(octokit, context.repository.owner, context.repository.name, context.pullRequest.number);
    }
    catch (error) {
        (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(`Failed to fetch existing comments for cleanup: ${error}`);
        return [];
    }
    const wardenComments = existingComments.filter((c) => c.isWarden);
    if (wardenComments.length === 0) {
        return [];
    }
    if ((auxiliaryOptions.runtime ?? 'pi') === 'claude') {
        (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .ensureClaudeAuth */ .$m)(inputs);
    }
    (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)(`No triggers matched, but found ${wardenComments.length} existing Warden comments. Running cleanup.`);
    const { allResolved, autoResolvedByFixEvaluation, autoResolvedByStaleCheck, findingObservations } = await evaluateFixesAndResolveStale(octokit, context, existingComments, [], new Set(), true, inputs.anthropicApiKey, auxiliaryOptions);
    const activeSpan = _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.getActiveSpan */ .sQ.getActiveSpan();
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
                (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .logAction */ .d5)('Dismissed previous CHANGES_REQUESTED review');
            }
            catch (error) {
                (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(`Failed to dismiss previous review: ${error}`);
            }
        }
    }
    return findingObservations;
}
// -----------------------------------------------------------------------------
// Main PR Workflow
// -----------------------------------------------------------------------------
async function runPRWorkflow(octokit, inputs, eventName, eventPath, repoPath) {
    return _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.startSpan */ .sQ.startSpan({ op: 'workflow.run', name: 'review pull_request' }, async (span) => {
        const initResult = await _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.startSpan */ .sQ.startSpan({ op: 'workflow.init', name: 'initialize workflow' }, () => initializeWorkflow(octokit, inputs, eventName, eventPath, repoPath));
        const { context, runnerConcurrency, auxiliaryOptions, matchedTriggers, skippedTriggers, skipCoreCheck, } = initResult;
        span.setAttribute('warden.trigger.count', matchedTriggers.length);
        // Set Sentry context after building event context
        if (context.pullRequest) {
            _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.setUser */ .sQ.setUser({ username: context.pullRequest.author });
        }
        _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.setContext */ .sQ.setContext('repository', {
            owner: context.repository.owner,
            name: context.repository.name,
        });
        if (context.pullRequest) {
            _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.setContext */ .sQ.setContext('pull_request', {
                number: context.pullRequest.number,
                baseBranch: context.pullRequest.baseBranch,
                headBranch: context.pullRequest.headBranch,
            });
        }
        (0,_sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .emitRunMetric */ .LW)();
        const traceId = span.spanContext().traceId;
        _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .logger */ .vF.info('Workflow initialized', {
            'warden.trigger.count': matchedTriggers.length,
            'trace.id': traceId,
        });
        const { coreCheckId, previousReviewInfo } = await _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.startSpan */ .sQ.startSpan({ op: 'workflow.setup', name: 'setup github state' }, () => setupGitHubState(octokit, context));
        await completeSkippedSkillChecks(octokit, context, skippedTriggers);
        if (skipCoreCheck) {
            (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .setOutput */ .uH)('findings-count', 0);
            (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .setOutput */ .uH)('high-count', 0);
            (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .setOutput */ .uH)('summary', skipCoreCheck.title);
            try {
                (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .writeFindingsOutput */ .JR)([], context);
            }
            catch (error) {
                (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(`Failed to write findings output: ${error}`);
            }
            await completeSkippedCoreCheck(octokit, context, coreCheckId, skipCoreCheck);
            return;
        }
        if (matchedTriggers.length === 0) {
            await runOrFailCore(octokit, context, coreCheckId, async () => {
                const cleanupFindingObservations = await cleanupOrphanedComments(octokit, context, inputs, auxiliaryOptions);
                (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .setOutput */ .uH)('findings-count', 0);
                (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .setOutput */ .uH)('high-count', 0);
                (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .setOutput */ .uH)('summary', 'No triggers matched');
                try {
                    (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .writeFindingsOutput */ .JR)([], context, cleanupFindingObservations);
                }
                catch (error) {
                    (0,_cli_output_tty_js__WEBPACK_IMPORTED_MODULE_18__/* .warnAction */ .T6)(`Failed to write findings output: ${error}`);
                }
                await completeSkippedCoreCheck(octokit, context, coreCheckId, {
                    title: 'No triggers matched',
                    message: 'No triggers matched for this event.',
                });
            });
            return;
        }
        let results;
        try {
            results = await _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.startSpan */ .sQ.startSpan({
                op: 'workflow.execute',
                name: 'execute triggers',
                attributes: { 'warden.trigger.count': matchedTriggers.length },
            }, () => executeAllTriggers(matchedTriggers, octokit, context, runnerConcurrency, inputs));
        }
        catch (error) {
            await failUndispatchedSkillChecks(octokit, context, matchedTriggers, error);
            await failCoreCheck(octokit, context, coreCheckId, error);
            throw error;
        }
        const reviewPhase = await runOrFailCore(octokit, context, coreCheckId, () => _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.startSpan */ .sQ.startSpan({ op: 'workflow.review', name: 'post reviews' }, () => postReviewsAndTrackFailures(octokit, context, results, inputs, auxiliaryOptions)));
        const triggerErrors = (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .collectTriggerErrors */ .sl)(results);
        const canResolveStale = (0,_review_coordination_js__WEBPACK_IMPORTED_MODULE_20__/* .shouldResolveStaleComments */ .t)(results);
        const allFindings = reviewPhase.reports.flatMap((r) => r.findings);
        span.setAttribute('warden.finding.count', allFindings.length);
        await runOrFailCore(octokit, context, coreCheckId, () => _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.startSpan */ .sQ.startSpan({ op: 'workflow.resolve', name: 'resolve stale comments' }, async (resolveSpan) => {
            const resolutionResult = await evaluateFixesAndResolveStale(octokit, context, reviewPhase.fetchedComments, allFindings, reviewPhase.activeWardenCommentIds, canResolveStale, inputs.anthropicApiKey, auxiliaryOptions);
            resolveSpan.setAttribute('warden.feedback.auto_resolve.fix_eval_count', resolutionResult.autoResolvedByFixEvaluation);
            resolveSpan.setAttribute('warden.feedback.auto_resolve.stale_count', resolutionResult.autoResolvedByStaleCheck);
            reviewPhase.findingObservations.push(...resolutionResult.findingObservations);
        }));
        await finalizeWorkflow(octokit, context, previousReviewInfo, coreCheckId, results, reviewPhase.reports, reviewPhase.findingObservations, reviewPhase.shouldFailAction, reviewPhase.failureReasons, canResolveStale, triggerErrors);
        (0,_base_js__WEBPACK_IMPORTED_MODULE_17__/* .handleTriggerErrors */ .a3)(triggerErrors, matchedTriggers.length);
    });
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 30517:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   y: () => (/* binding */ runScheduleWorkflow)
/* harmony export */ });
/* harmony import */ var _config_loader_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(60866);
/* harmony import */ var _event_schedule_context_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(65997);
/* harmony import */ var _sdk_runner_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(45452);
/* harmony import */ var _sdk_runtimes_model_selectors_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(85286);
/* harmony import */ var _output_github_issues_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(67034);
/* harmony import */ var _triggers_matcher_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(49431);
/* harmony import */ var _skills_loader_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(34691);
/* harmony import */ var _types_index_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(78481);
/* harmony import */ var _sentry_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(30340);
/* harmony import */ var _base_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(78000);
/* harmony import */ var _error_reporting_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(29547);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_sdk_runner_js__WEBPACK_IMPORTED_MODULE_2__]);
_sdk_runner_js__WEBPACK_IMPORTED_MODULE_2__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];
/**
 * Schedule Workflow
 *
 * Handles schedule and workflow_dispatch events.
 */











async function runScheduleWorkflow(octokit, inputs, repoPath) {
    return _sentry_js__WEBPACK_IMPORTED_MODULE_8__/* .Sentry.startSpan */ .sQ.startSpan({ op: 'workflow.run', name: 'review schedule' }, (span) => runScheduleWorkflowInner(octokit, inputs, repoPath, span));
}
async function runScheduleWorkflowInner(octokit, inputs, repoPath, workflowSpan) {
    const githubRepository = process.env['GITHUB_REPOSITORY'];
    (0,_sentry_js__WEBPACK_IMPORTED_MODULE_8__/* .setRepositoryScope */ .vx)(githubRepository);
    (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .logGroup */ .QT)('Loading configuration');
    if (inputs.baseConfigPath) {
        console.log(`Base config path: ${inputs.baseConfigPath}`);
    }
    if (inputs.baseSkillRoot) {
        console.log(`Base skill root: ${inputs.baseSkillRoot}`);
    }
    console.log(`Repo config path: ${inputs.configPath}`);
    (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .logGroupEnd */ .TN)();
    let scheduleTriggers;
    let skillRootsByName;
    try {
        const layered = (0,_config_loader_js__WEBPACK_IMPORTED_MODULE_0__/* .loadLayeredWardenConfig */ .M3)(repoPath, {
            baseConfigPath: inputs.baseConfigPath,
            configPath: inputs.configPath,
            onWarning: (message) => console.log(`::warning::${message}`),
        });
        skillRootsByName = (0,_config_loader_js__WEBPACK_IMPORTED_MODULE_0__/* .buildSkillRootsByName */ .hd)(repoPath, layered, inputs.baseSkillRoot);
        scheduleTriggers = (0,_config_loader_js__WEBPACK_IMPORTED_MODULE_0__/* .resolveLayeredSkillConfigs */ .Ln)(layered, undefined, skillRootsByName)
            .filter((t) => t.type === 'schedule');
    }
    catch (error) {
        if (error instanceof _config_loader_js__WEBPACK_IMPORTED_MODULE_0__/* .ConfigLoadError */ .tx &&
            error.message.includes('not found') &&
            !inputs.baseConfigPath) {
            console.log('::warning::No warden.toml found. Skipping analysis.');
            (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .setOutput */ .uH)('findings-count', 0);
            (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .setOutput */ .uH)('high-count', 0);
            (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .setOutput */ .uH)('summary', 'No warden.toml found');
            try {
                const fullName = process.env['GITHUB_REPOSITORY'] ?? '';
                const [o = '', n = ''] = fullName.split('/');
                workflowSpan.setAttribute('warden.trigger.count', 0);
                workflowSpan.setAttribute('warden.finding.count', 0);
                (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .writeFindingsOutput */ .JR)([], {
                    eventType: 'schedule',
                    action: 'scheduled',
                    repository: { owner: o, name: n, fullName, defaultBranch: '' },
                    repoPath,
                });
            }
            catch (writeError) {
                console.error(`::warning::Failed to write findings output: ${writeError}`);
            }
            return;
        }
        throw error;
    }
    workflowSpan.setAttribute('warden.trigger.count', scheduleTriggers.length);
    (0,_sentry_js__WEBPACK_IMPORTED_MODULE_8__/* .emitRunMetric */ .LW)();
    const traceId = workflowSpan.spanContext?.().traceId;
    _sentry_js__WEBPACK_IMPORTED_MODULE_8__/* .logger */ .vF.info('Workflow initialized', {
        'warden.trigger.count': scheduleTriggers.length,
        ...(traceId ? { 'trace.id': traceId } : {}),
    });
    if (scheduleTriggers.length === 0) {
        console.log('No schedule triggers configured');
        (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .setOutput */ .uH)('findings-count', 0);
        (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .setOutput */ .uH)('high-count', 0);
        (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .setOutput */ .uH)('summary', 'No schedule triggers configured');
        workflowSpan.setAttribute('warden.finding.count', 0);
        try {
            const fullName = process.env['GITHUB_REPOSITORY'] ?? '';
            const [o = '', n = ''] = fullName.split('/');
            (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .writeFindingsOutput */ .JR)([], {
                eventType: 'schedule',
                action: 'scheduled',
                repository: { owner: o, name: n, fullName, defaultBranch: '' },
                repoPath,
            });
        }
        catch (writeError) {
            console.error(`::warning::Failed to write findings output: ${writeError}`);
        }
        return;
    }
    // Get repo info from environment
    if (!githubRepository) {
        (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .setFailed */ .C1)('GITHUB_REPOSITORY environment variable not set');
    }
    const [owner, repo] = githubRepository.split('/');
    if (!owner || !repo) {
        (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .setFailed */ .C1)('Invalid GITHUB_REPOSITORY format');
    }
    const headSha = process.env['GITHUB_SHA'] ?? '';
    if (!headSha) {
        (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .setFailed */ .C1)('GITHUB_SHA environment variable not set');
    }
    const defaultBranch = await (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .getDefaultBranchFromAPI */ .YL)(octokit, owner, repo);
    (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .logGroup */ .QT)('Processing schedule triggers');
    for (const trigger of scheduleTriggers) {
        console.log(`- ${trigger.name}: ${trigger.skill}`);
    }
    (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .logGroupEnd */ .TN)();
    const allReports = [];
    let totalFindings = 0;
    const failureReasons = [];
    const triggerErrors = [];
    let shouldFailAction = false;
    // Process each schedule trigger
    for (const resolved of scheduleTriggers) {
        (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .logGroup */ .QT)(`Running trigger: ${resolved.name} (skill: ${resolved.skill})`);
        try {
            (0,_sdk_runtimes_model_selectors_js__WEBPACK_IMPORTED_MODULE_3__/* .assertValidPiModelSelectors */ .lG)([resolved]);
            // Build context from paths filter
            const patterns = resolved.filters?.paths ?? ['**/*'];
            const ignorePatterns = resolved.filters?.ignorePaths;
            const context = await (0,_event_schedule_context_js__WEBPACK_IMPORTED_MODULE_1__/* .buildScheduleEventContext */ .J)({
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
                (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .logGroupEnd */ .TN)();
                continue;
            }
            console.log(`Found ${context.pullRequest.files.length} files matching patterns`);
            // Run skill
            const skillRoot = resolved.useBuiltinSkill ? undefined : (resolved.skillRoot ?? repoPath);
            const skill = await (0,_skills_loader_js__WEBPACK_IMPORTED_MODULE_6__/* .resolveSkillAsync */ .Cy)(resolved.skill, skillRoot, {
                remote: resolved.remote,
            });
            const runtimeEnv = await (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .prepareRuntimeEnvironment */ .bZ)([resolved], inputs);
            const report = await (0,_sdk_runner_js__WEBPACK_IMPORTED_MODULE_2__/* .runSkill */ .pd)(skill, context, {
                apiKey: inputs.anthropicApiKey,
                model: resolved.model,
                runtime: resolved.runtime,
                reasoningEffort: resolved.reasoningEffort,
                auxiliaryModel: resolved.auxiliaryModel,
                synthesisModel: resolved.synthesisModel,
                maxTurns: resolved.maxTurns,
                batchDelayMs: resolved.batchDelayMs,
                maxContextFiles: resolved.maxContextFiles,
                auxiliaryMaxRetries: resolved.auxiliaryMaxRetries,
                verifyFindings: resolved.verifyFindings,
                telemetryTriggerName: resolved.name,
                pathToClaudeCodeExecutable: runtimeEnv.pathToClaudeCodeExecutable,
            });
            console.log(`Found ${report.findings.length} findings`);
            allReports.push(report);
            totalFindings += report.findings.length;
            // Create/update issue with findings
            const scheduleConfig = resolved.schedule ?? {};
            const issueTitle = scheduleConfig.issueTitle ?? `Warden: ${resolved.name}`;
            const issueResult = await (0,_output_github_issues_js__WEBPACK_IMPORTED_MODULE_4__/* .createOrUpdateIssue */ .w)(octokit, owner, repo, [report], {
                title: issueTitle,
                commitSha: headSha,
            });
            if (issueResult) {
                console.log(`${issueResult.created ? 'Created' : 'Updated'} issue #${issueResult.issueNumber}`);
                console.log(`Issue URL: ${issueResult.issueUrl}`);
            }
            // Create fix PR if enabled and there are fixable findings
            if (scheduleConfig.createFixPR) {
                const fixResult = await (0,_output_github_issues_js__WEBPACK_IMPORTED_MODULE_4__/* .createFixPR */ .y)(octokit, owner, repo, report.findings, {
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
            const reportForFail = { ...report, findings: (0,_types_index_js__WEBPACK_IMPORTED_MODULE_7__/* .filterFindings */ .Ni)(report.findings, undefined, resolved.minConfidence ?? 'medium') };
            if (failCheck && failOn && (0,_triggers_matcher_js__WEBPACK_IMPORTED_MODULE_5__/* .shouldFail */ .W9)(reportForFail, failOn)) {
                shouldFailAction = true;
                const count = (0,_triggers_matcher_js__WEBPACK_IMPORTED_MODULE_5__/* .countFindingsAtOrAbove */ .tH)(reportForFail, failOn);
                failureReasons.push(`${resolved.name}: Found ${count} ${failOn}+ severity issues`);
            }
            (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .logGroupEnd */ .TN)();
        }
        catch (error) {
            if (error instanceof _base_js__WEBPACK_IMPORTED_MODULE_9__/* .ActionFailedError */ .Ah)
                throw error;
            (0,_error_reporting_js__WEBPACK_IMPORTED_MODULE_10__/* .captureActionTriggerError */ .T)(error, {
                triggerName: resolved.name,
                skillName: resolved.skill,
            });
            const errorMessage = error instanceof Error ? error.message : String(error);
            triggerErrors.push(`${resolved.name}: ${errorMessage}`);
            console.error(`::warning::Trigger ${resolved.name} failed: ${error}`);
            (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .logGroupEnd */ .TN)();
        }
    }
    (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .handleTriggerErrors */ .a3)(triggerErrors, scheduleTriggers.length);
    // Set outputs
    const highCount = (0,_triggers_matcher_js__WEBPACK_IMPORTED_MODULE_5__/* .countSeverity */ .jC)(allReports, 'high');
    workflowSpan.setAttribute('warden.finding.count', totalFindings);
    (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .setOutput */ .uH)('findings-count', totalFindings);
    (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .setOutput */ .uH)('high-count', highCount);
    (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .setOutput */ .uH)('summary', allReports.map((r) => r.summary).join('\n') || 'Scheduled analysis complete');
    // Write structured findings to file for external export (GCS, S3, etc.)
    try {
        const findingsPath = (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .writeFindingsOutput */ .JR)(allReports, {
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
        (0,_base_js__WEBPACK_IMPORTED_MODULE_9__/* .setFailed */ .C1)(failureReasons.join('; '));
    }
    console.log(`\nScheduled analysis complete: ${totalFindings} total findings`);
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 4257:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* unused harmony exports buildLocalEventContext, buildFileEventContext */
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(76760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_path__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _output_index_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1978);
/* harmony import */ var _files_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(20453);
/* harmony import */ var _git_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(20190);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_output_index_js__WEBPACK_IMPORTED_MODULE_1__]);
_output_index_js__WEBPACK_IMPORTED_MODULE_1__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];




/**
 * Convert git file change to EventContext FileChange format.
 */
function toFileChange(file) {
    return {
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch,
        chunks: file.chunks,
    };
}
/**
 * Build an EventContext from local git repository state.
 * Creates a synthetic pull_request event from git diff.
 *
 * When analyzing a specific commit (head is set), uses the actual commit
 * message as title/body to provide intent context to the LLM.
 */
function buildLocalEventContext(options = {}) {
    const cwd = options.cwd ?? process.cwd();
    const repoPath = getRepoRoot(cwd);
    const { owner, name } = getRepoName(cwd);
    const defaultBranch = options.defaultBranch ?? getDefaultBranch(cwd);
    // When staged, always diff against HEAD (index vs HEAD)
    const staged = options.staged ?? false;
    const base = staged ? 'HEAD' : (options.base ?? defaultBranch);
    const head = options.head; // undefined means working tree
    const currentBranch = getCurrentBranch(cwd);
    const headSha = head ? resolveRef(head, cwd) : getHeadSha(cwd);
    const changedFiles = getChangedFilesWithPatches(base, head, cwd, { staged });
    const files = changedFiles.map(toFileChange);
    // Use actual commit message when analyzing a specific commit
    let title;
    let body;
    if (head) {
        const commitMsg = getCommitMessage(head, cwd);
        title = commitMsg.subject || `Commit ${head}`;
        body = commitMsg.body || `Analyzing changes in ${head}`;
    }
    else if (staged) {
        title = `Staged changes: ${currentBranch}`;
        body = `Analyzing staged changes`;
    }
    else {
        title = `Local changes: ${currentBranch}`;
        body = `Analyzing local changes from ${base} to working tree`;
    }
    const diffContextSource = staged
        ? { type: 'git-index' }
        : head
            ? { type: 'git-ref', ref: headSha }
            : { type: 'working-tree' };
    return {
        eventType: 'pull_request',
        action: 'opened',
        repository: {
            owner,
            name,
            fullName: `${owner}/${name}`,
            defaultBranch,
        },
        pullRequest: {
            number: 0, // Local run, no real PR number
            title,
            body,
            author: 'local',
            baseBranch: base,
            headBranch: currentBranch,
            headSha,
            baseSha: resolveRef(base, cwd),
            files,
        },
        diffContextSource,
        repoPath,
    };
}
/**
 * Build an EventContext from a list of files or glob patterns.
 * Creates a synthetic pull_request event treating files as newly added.
 * This allows analysis without requiring git or a warden.toml config.
 */
async function buildFileEventContext(options) {
    const cwd = options.cwd ?? process.cwd();
    const dirName = basename(cwd);
    const files = await expandAndCreateFileChanges(options.patterns, cwd);
    return {
        eventType: 'pull_request',
        action: 'opened',
        repository: {
            owner: 'local',
            name: dirName,
            fullName: `local/${dirName}`,
            defaultBranch: 'main',
        },
        pullRequest: {
            number: 0,
            title: 'File analysis',
            body: `Analyzing ${files.length} ${pluralize(files.length, 'file')}`,
            author: 'local',
            baseBranch: 'main',
            headBranch: 'file-analysis',
            headSha: 'file-analysis',
            baseSha: 'file-analysis',
            files,
        },
        diffContextSource: { type: 'working-tree' },
        repoPath: cwd,
    };
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 20453:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Rq: () => (/* binding */ expandAndCreateFileChanges)
/* harmony export */ });
/* unused harmony exports expandFileGlobs, createPatchFromContent, createSyntheticFileChange, createSyntheticFileChanges */
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(73024);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(76760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(node_path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var fast_glob__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(22457);
/* harmony import */ var fast_glob__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(fast_glob__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var ignore__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(22881);
/* harmony import */ var ignore__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(ignore__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _types_index_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(78481);
/* harmony import */ var _utils_exec_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(82224);
/* harmony import */ var _utils_path_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(60702);







function hasGlobCharacters(pattern) {
    return pattern.includes('*') || pattern.includes('?');
}
function expandDirectoryPattern(pattern, cwd) {
    if (hasGlobCharacters(pattern)) {
        return pattern;
    }
    try {
        if (!(0,node_fs__WEBPACK_IMPORTED_MODULE_0__.statSync)((0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(cwd, pattern)).isDirectory()) {
            return pattern;
        }
    }
    catch {
        return pattern;
    }
    const normalized = (0,_utils_path_js__WEBPACK_IMPORTED_MODULE_6__/* .normalizePath */ .Fd)(pattern).replace(/\/+$/, '');
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
        const root = (0,_utils_exec_js__WEBPACK_IMPORTED_MODULE_5__/* .execGitNonInteractive */ .rd)(['rev-parse', '--show-toplevel'], {
            cwd: (0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(startPath),
        });
        return root ? (0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(root) : null;
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
    const ig = ignore__WEBPACK_IMPORTED_MODULE_3___default()();
    // Always ignore .git directory
    ig.add('.git');
    // Use git to discover .gitignore files. This naturally skips ignored
    // directories (node_modules, .venv, vendor, etc.) without maintaining
    // a hardcoded exclusion list.
    let gitignoreFiles;
    try {
        const output = (0,_utils_exec_js__WEBPACK_IMPORTED_MODULE_5__/* .execGitNonInteractive */ .rd)(['ls-files', '--cached', '--others', '--exclude-standard', '.gitignore', '**/.gitignore'], { cwd: gitRoot });
        gitignoreFiles = output
            ? output.split('\n').map((f) => (0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(gitRoot, f))
            : [];
    }
    catch {
        // Not a real git repo or git not available. Walk directories manually,
        // skipping common large directories that would never contain relevant
        // .gitignore files.
        gitignoreFiles = fast_glob__WEBPACK_IMPORTED_MODULE_2___default().sync('**/.gitignore', {
            cwd: gitRoot,
            absolute: true,
            dot: true,
            ignore: ['**/.git/**', '**/node_modules/**'],
        });
    }
    // Sort by path depth (root first, then nested).
    // Normalize to forward slashes so depth counting works on Windows too.
    gitignoreFiles.sort((a, b) => (0,_utils_path_js__WEBPACK_IMPORTED_MODULE_6__/* .normalizePath */ .Fd)(a).split('/').length - (0,_utils_path_js__WEBPACK_IMPORTED_MODULE_6__/* .normalizePath */ .Fd)(b).split('/').length);
    // Process gitignore files from root down (parent rules apply first)
    for (const gitignorePath of gitignoreFiles) {
        try {
            const content = (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.readFileSync)(gitignorePath, 'utf-8');
            // Use normalized paths for relative calculation
            const relativeDir = (0,_utils_path_js__WEBPACK_IMPORTED_MODULE_6__/* .normalizePath */ .Fd)((0,node_path__WEBPACK_IMPORTED_MODULE_1__.relative)(gitRoot, (0,node_path__WEBPACK_IMPORTED_MODULE_1__.dirname)(gitignorePath)));
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
    const cwd = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(options.cwd ?? process.cwd());
    const useGitignore = options.gitignore ?? true;
    const expandedPatterns = patterns.map((pattern) => expandDirectoryPattern(pattern, cwd));
    // Get all matching files first
    const files = await fast_glob__WEBPACK_IMPORTED_MODULE_2___default()(expandedPatterns, {
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
        const relativePath = (0,_utils_path_js__WEBPACK_IMPORTED_MODULE_6__/* .normalizePath */ .Fd)((0,node_path__WEBPACK_IMPORTED_MODULE_1__.relative)(gitRoot, file));
        if (!(0,_utils_path_js__WEBPACK_IMPORTED_MODULE_6__/* .isRepoRelativePath */ .Ms)(relativePath)) {
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
    const content = (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.readFileSync)(absolutePath, 'utf-8');
    const lines = content.split('\n');
    const lineCount = lines.length;
    const relativePath = (0,_utils_path_js__WEBPACK_IMPORTED_MODULE_6__/* .normalizePath */ .Fd)((0,node_path__WEBPACK_IMPORTED_MODULE_1__.relative)(basePath, absolutePath));
    const patch = createPatchFromContent(content);
    return {
        filename: relativePath,
        status: 'added',
        additions: lineCount,
        deletions: 0,
        patch,
        chunks: (0,_types_index_js__WEBPACK_IMPORTED_MODULE_4__/* .countPatchChunks */ .kV)(patch),
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
    const resolvedCwd = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.resolve)(cwd);
    const files = await expandFileGlobs(patterns, resolvedCwd);
    return createSyntheticFileChanges(files, resolvedCwd);
}


/***/ }),

/***/ 20190:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* unused harmony exports getCurrentBranch, getHeadSha, resolveRef, getDefaultBranch, getRepoRoot, getRepoName, getGitHubRepoUrl, getChangedFiles, getFilePatch, getChangedFilesWithPatches, hasUncommittedChanges, refExists, getCommitMessage */
/* harmony import */ var _types_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(78481);
/* harmony import */ var _utils_exec_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(82224);


/**
 * Execute a git command and return stdout.
 * Uses array-based arguments to avoid shell injection.
 */
function git(args, cwd = process.cwd()) {
    try {
        return execGitNonInteractive(args, { cwd });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Git command failed: git ${args.join(' ')}\n${message}`, { cause: error });
    }
}
/**
 * Get the current branch name.
 */
function getCurrentBranch(cwd = process.cwd()) {
    return git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
}
/**
 * Get the HEAD commit SHA.
 */
function getHeadSha(cwd = process.cwd()) {
    return resolveRef('HEAD', cwd);
}
/**
 * Resolve a ref (branch name, tag, SHA) to a full commit SHA.
 */
function resolveRef(ref, cwd = process.cwd()) {
    return git(['rev-parse', ref], cwd);
}
/**
 * Detect the default branch by checking common branch names locally.
 * Also checks remote tracking refs (origin/*) for shallow clones
 * where local branches may not exist (e.g. GitHub Actions).
 * Does not perform any remote operations to avoid SSH prompts.
 */
function getDefaultBranch(cwd = process.cwd()) {
    // Check common default branches locally (no remote operations)
    for (const branch of ['main', 'master', 'develop']) {
        try {
            git(['rev-parse', '--verify', branch], cwd);
            return branch;
        }
        catch {
            // Try next branch
        }
    }
    // Check remote tracking refs (common in shallow clones / CI)
    for (const branch of ['main', 'master', 'develop']) {
        try {
            git(['rev-parse', '--verify', `origin/${branch}`], cwd);
            return `origin/${branch}`;
        }
        catch {
            // Try next branch
        }
    }
    // Check remote HEAD symbolic ref (set by clone, no network needed)
    try {
        const remoteHead = git(['symbolic-ref', 'refs/remotes/origin/HEAD'], cwd);
        if (remoteHead) {
            // Returns e.g. "refs/remotes/origin/main" → extract "origin/main"
            const match = remoteHead.match(/refs\/remotes\/(.*)/);
            if (match?.[1]) {
                return match[1];
            }
        }
    }
    catch {
        // No remote HEAD configured
    }
    // Check git config for user-configured default branch
    try {
        const configuredDefault = git(['config', 'init.defaultBranch'], cwd);
        if (configuredDefault) {
            return configuredDefault;
        }
    }
    catch {
        // Config not set
    }
    return 'main'; // Default fallback
}
/**
 * Get the repository root path.
 */
function getRepoRoot(cwd = process.cwd()) {
    return git(['rev-parse', '--show-toplevel'], cwd);
}
/**
 * Get the repository name from the git remote or directory name.
 */
function getRepoName(cwd = process.cwd()) {
    try {
        const remoteUrl = git(['config', '--get', 'remote.origin.url'], cwd);
        // Handle SSH: git@github.com:owner/repo.git
        // Handle HTTPS: https://github.com/owner/repo.git
        const match = remoteUrl.match(/[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
        if (match && match[1] && match[2]) {
            return { owner: match[1], name: match[2] };
        }
    }
    catch {
        // No remote configured
    }
    // Fall back to directory name
    const repoRoot = getRepoRoot(cwd);
    const dirName = repoRoot.split('/').pop() ?? 'unknown';
    return { owner: 'local', name: dirName };
}
/**
 * Get the GitHub repository URL if the remote is on GitHub.
 * Returns null if the remote is not GitHub or not configured.
 */
function getGitHubRepoUrl(cwd = process.cwd()) {
    try {
        const remoteUrl = git(['config', '--get', 'remote.origin.url'], cwd);
        // Handle SSH: git@github.com:owner/repo.git
        const sshMatch = remoteUrl.match(/git@github\.com:([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
        if (sshMatch && sshMatch[1] && sshMatch[2]) {
            return `https://github.com/${sshMatch[1]}/${sshMatch[2]}`;
        }
        // Handle HTTPS: https://github.com/owner/repo.git
        const httpsMatch = remoteUrl.match(/https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
        if (httpsMatch && httpsMatch[1] && httpsMatch[2]) {
            return `https://github.com/${httpsMatch[1]}/${httpsMatch[2]}`;
        }
    }
    catch {
        // No remote configured
    }
    return null;
}
/**
 * Map git status letter to FileChange status.
 */
function mapStatus(status) {
    switch (status[0]) {
        case 'A':
            return 'added';
        case 'D':
            return 'removed';
        case 'M':
            return 'modified';
        case 'R':
            return 'renamed';
        case 'C':
            return 'copied';
        default:
            return 'modified';
    }
}
/**
 * Build the git diff arguments for a given base/head/staged configuration.
 * Extra flags (e.g. '--name-status') are placed before the ref, matching
 * the documented git-diff synopsis: git diff [<options>] [<commit>] ...
 */
function buildDiffArgs(base, head, options, extraFlags) {
    const flags = extraFlags ?? [];
    if (options?.staged) {
        return ['diff', ...flags, '--cached'];
    }
    const diffRef = head ? `${base}...${head}` : base;
    return ['diff', ...flags, diffRef];
}
/**
 * Get list of changed files between two refs.
 * If head is undefined, compares against the working tree.
 * If options.staged is true, compares only staged changes against HEAD.
 */
function getChangedFiles(base, head, cwd = process.cwd(), options) {
    // Get file statuses
    const nameStatusOutput = git(buildDiffArgs(base, head, options, ['--name-status']), cwd);
    if (!nameStatusOutput) {
        return [];
    }
    const files = [];
    for (const line of nameStatusOutput.split('\n')) {
        if (!line.trim())
            continue;
        const parts = line.split('\t');
        const status = parts[0] ?? '';
        // For renames, format is "R100\told-name\tnew-name"
        const filename = parts.length > 2 ? (parts[2] ?? '') : (parts[1] ?? '');
        if (!filename)
            continue;
        files.push({
            filename,
            status: mapStatus(status),
            additions: 0,
            deletions: 0,
        });
    }
    // Get numstat for additions/deletions
    const numstatOutput = git(buildDiffArgs(base, head, options, ['--numstat']), cwd);
    if (numstatOutput) {
        for (const line of numstatOutput.split('\n')) {
            if (!line.trim())
                continue;
            const parts = line.split('\t');
            const additions = parts[0] ?? '0';
            const deletions = parts[1] ?? '0';
            const filename = parts[2] ?? '';
            const file = files.find((f) => f.filename === filename);
            if (file) {
                file.additions = additions === '-' ? 0 : parseInt(additions, 10);
                file.deletions = deletions === '-' ? 0 : parseInt(deletions, 10);
            }
        }
    }
    return files;
}
/**
 * Get the patch for a specific file.
 */
function getFilePatch(base, head, filename, cwd = process.cwd(), options) {
    try {
        return git([...buildDiffArgs(base, head, options), '--', filename], cwd);
    }
    catch {
        return undefined;
    }
}
/**
 * Parse a combined diff output into individual file patches.
 */
function parseCombinedDiff(diffOutput) {
    const patches = new Map();
    if (!diffOutput)
        return patches;
    // Split by "diff --git" but keep the delimiter
    const parts = diffOutput.split(/(?=^diff --git )/m);
    for (const part of parts) {
        if (!part.trim())
            continue;
        // Extract filename from "diff --git a/path b/path" line
        const match = part.match(/^diff --git a\/(.+?) b\/(.+?)\n/);
        if (match) {
            // Use the "b" path (destination) as the filename
            const filename = match[2];
            if (filename) {
                patches.set(filename, part);
            }
        }
    }
    return patches;
}
/**
 * Get patches for all changed files in a single git command.
 */
function getChangedFilesWithPatches(base, head, cwd = process.cwd(), options) {
    const files = getChangedFiles(base, head, cwd, options);
    if (files.length === 0) {
        return files;
    }
    // Get all patches in a single git diff command
    try {
        const combinedDiff = git(buildDiffArgs(base, head, options), cwd);
        const patches = parseCombinedDiff(combinedDiff);
        for (const file of files) {
            file.patch = patches.get(file.filename);
            file.chunks = countPatchChunks(file.patch);
        }
    }
    catch {
        // Fall back to per-file patches if combined diff fails
        for (const file of files) {
            file.patch = getFilePatch(base, head, file.filename, cwd, options);
            file.chunks = countPatchChunks(file.patch);
        }
    }
    return files;
}
/**
 * Check if there are uncommitted changes in the working tree.
 */
function hasUncommittedChanges(cwd = process.cwd()) {
    const status = git(['status', '--porcelain'], cwd);
    return status.length > 0;
}
/**
 * Check if a ref exists.
 */
function refExists(ref, cwd = process.cwd()) {
    try {
        git(['rev-parse', '--verify', ref], cwd);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get the commit message for a specific ref.
 * Returns subject (first line) and body (remaining lines) separately.
 */
function getCommitMessage(ref, cwd = process.cwd()) {
    // %s = subject, %b = body
    const subject = git(['log', '-1', `--format=%s`, ref], cwd);
    const body = git(['log', '-1', `--format=%b`, ref], cwd);
    return { subject, body };
}


/***/ }),

/***/ 8899:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* unused harmony export BoxRenderer */

/**
 * Unicode box-drawing characters for TTY mode.
 */
const BOX = {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    leftT: '├',
    rightT: '┤',
};
/**
 * Renders box-style containers for terminal output.
 * Supports TTY mode with Unicode box characters and CI mode with plain text.
 */
class BoxRenderer {
    title;
    badge;
    mode;
    width;
    lines = [];
    constructor(options) {
        this.title = options.title;
        this.badge = options.badge;
        this.mode = options.mode;
        // Calculate width based on terminal columns, with min/max constraints
        const minWidth = options.minWidth ?? 50;
        const maxWidth = Math.min(options.mode.columns - 2, 100);
        this.width = Math.max(minWidth, maxWidth);
    }
    /**
     * Render the top border with title and optional badge.
     * TTY: ┌─ title ─────────────────────── badge ─┐
     * CI:  === title (badge) ===
     */
    header() {
        if (this.mode.isTTY) {
            const titlePart = `${BOX.horizontal} ${this.title} `;
            const badgePart = this.badge ? ` ${this.badge} ${BOX.horizontal}` : BOX.horizontal;
            const titleLen = this.stripAnsi(titlePart).length;
            const badgeLen = this.stripAnsi(badgePart).length;
            const fillLen = Math.max(0, this.width - titleLen - badgeLen - 2);
            const fill = BOX.horizontal.repeat(fillLen);
            this.lines.push(chalk.dim(BOX.topLeft) +
                chalk.dim(BOX.horizontal) + ' ' +
                chalk.bold(this.title) +
                ' ' + chalk.dim(fill) +
                (this.badge ? chalk.dim(` ${this.badge} `) : '') +
                chalk.dim(BOX.horizontal + BOX.topRight));
        }
        else {
            const badgePart = this.badge ? ` (${this.badge})` : '';
            this.lines.push(`=== ${this.title}${badgePart} ===`);
        }
        return this;
    }
    /**
     * Get the available content width (excluding borders and padding).
     */
    get contentWidth() {
        return this.width - 4; // 2 for borders + 2 for padding spaces
    }
    /**
     * Add content lines with side borders (TTY) or plain (CI).
     * Long lines are automatically wrapped to fit within the box.
     */
    content(contentLines) {
        const lines = Array.isArray(contentLines) ? contentLines : [contentLines];
        for (const line of lines) {
            // Wrap long lines to fit within the box
            const wrappedLines = this.wrapLine(line);
            for (const wrappedLine of wrappedLines) {
                if (this.mode.isTTY) {
                    const strippedLen = this.stripAnsi(wrappedLine).length;
                    const padding = Math.max(0, this.width - strippedLen - 4);
                    this.lines.push(chalk.dim(BOX.vertical) + ' ' + wrappedLine + ' '.repeat(padding) + ' ' + chalk.dim(BOX.vertical));
                }
                else {
                    this.lines.push(wrappedLine);
                }
            }
        }
        return this;
    }
    /**
     * Wrap a line to fit within the content width.
     * Preserves leading indentation on wrapped lines.
     */
    wrapLine(line) {
        const maxWidth = this.contentWidth;
        const stripped = this.stripAnsi(line);
        // If it fits, return as-is
        if (stripped.length <= maxWidth) {
            return [line];
        }
        // For lines with ANSI codes, we need to be careful.
        // For simplicity, if the line has ANSI codes and is too long,
        // we'll wrap the stripped version and lose formatting on continuation lines.
        const hasAnsi = line !== stripped;
        // Detect leading indentation
        const indentMatch = stripped.match(/^(\s*)/);
        const indent = indentMatch?.[1] ?? '';
        const textToWrap = hasAnsi ? stripped : line;
        const result = [];
        let remaining = textToWrap;
        let isFirstLine = true;
        while (remaining.length > 0) {
            const currentIndent = isFirstLine ? '' : indent;
            const availableWidth = maxWidth - currentIndent.length;
            if (this.stripAnsi(remaining).length <= availableWidth) {
                result.push(currentIndent + remaining);
                break;
            }
            // Find a good break point (prefer word boundaries)
            let breakPoint = availableWidth;
            const searchStart = Math.max(0, availableWidth - 20);
            for (let i = availableWidth; i >= searchStart; i--) {
                if (remaining[i] === ' ') {
                    breakPoint = i;
                    break;
                }
            }
            // If no space found, hard break at max width
            if (breakPoint === availableWidth && remaining[availableWidth] !== ' ') {
                breakPoint = availableWidth;
            }
            const chunk = remaining.slice(0, breakPoint);
            result.push(currentIndent + chunk);
            // Skip the space at the break point if there is one
            remaining = remaining.slice(breakPoint).trimStart();
            isFirstLine = false;
        }
        return result;
    }
    /**
     * Add an empty content line.
     */
    blank() {
        return this.content('');
    }
    /**
     * Render a horizontal divider.
     * TTY: ├─────────────────────────────────────────────┤
     * CI:  ---
     */
    divider() {
        if (this.mode.isTTY) {
            const fill = BOX.horizontal.repeat(this.width - 2);
            this.lines.push(chalk.dim(BOX.leftT + fill + BOX.rightT));
        }
        else {
            this.lines.push('---');
        }
        return this;
    }
    /**
     * Render the bottom border.
     * TTY: └─────────────────────────────────────────────┘
     * CI:  (nothing in CI mode - just ends)
     */
    footer() {
        if (this.mode.isTTY) {
            const fill = BOX.horizontal.repeat(this.width - 2);
            this.lines.push(chalk.dim(BOX.bottomLeft + fill + BOX.bottomRight));
        }
        return this;
    }
    /**
     * Get all rendered lines.
     */
    render() {
        return [...this.lines];
    }
    /**
     * Get the rendered output as a single string.
     */
    toString() {
        return this.lines.join('\n');
    }
    /**
     * Strip ANSI escape codes from a string for length calculation.
     */
    stripAnsi(str) {
        // oxlint-disable-next-line no-control-regex
        return str.replace(/\x1b\[[0-9;]*m/g, '');
    }
}


/***/ }),

/***/ 43171:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Ac: () => (/* binding */ formatStatsCompact),
/* harmony export */   BD: () => (/* binding */ formatCost),
/* harmony export */   Ot: () => (/* binding */ countBySeverity),
/* harmony export */   Xr: () => (/* binding */ formatFindingCountsPlain),
/* harmony export */   ZH: () => (/* binding */ capitalize),
/* harmony export */   _y: () => (/* binding */ formatTokens),
/* harmony export */   a3: () => (/* binding */ formatDuration),
/* harmony export */   j$: () => (/* binding */ formatLocation),
/* harmony export */   lg: () => (/* binding */ totalUsageCost),
/* harmony export */   td: () => (/* binding */ pluralize),
/* harmony export */   xz: () => (/* binding */ formatSeverityPlain)
/* harmony export */ });
/* unused harmony exports formatElapsed, formatBytes, formatSeverityDot, formatSeverityBadge, formatConfidenceBadge, formatFindingCompact, formatFindingCounts, formatProgress, formatFileStats, truncate, padRight, formatUsage, formatUsagePlain, totalAuxiliaryCost */
/* harmony import */ var chalk__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(39559);
/* harmony import */ var figures__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(58653);


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
    high: { color: chalk__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay.red, symbol: figures__WEBPACK_IMPORTED_MODULE_1__/* ["default"] */ .Ay.bullet },
    medium: { color: chalk__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay.yellow, symbol: figures__WEBPACK_IMPORTED_MODULE_1__/* ["default"] */ .Ay.bullet },
    low: { color: chalk__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay.green, symbol: figures__WEBPACK_IMPORTED_MODULE_1__/* ["default"] */ .Ay.bullet },
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
    high: { color: chalk__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay.green },
    medium: { color: chalk__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay.yellow },
    low: { color: chalk__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Ay.red },
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


/***/ }),

/***/ 5832:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   hP: () => (/* binding */ ICON_CHECK),
/* harmony export */   xj: () => (/* binding */ ICON_SKIPPED)
/* harmony export */ });
/* unused harmony exports SPINNER_FRAMES, ICON_PENDING, ICON_ERROR */
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


/***/ }),

/***/ 1978:
/***/ ((module, __unused_webpack___webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony import */ var _verbosity_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(21307);
/* harmony import */ var _reporter_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(34593);
/* harmony import */ var _formatters_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(43171);
/* harmony import */ var _tasks_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(5836);
/* harmony import */ var _ink_runner_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(10483);
/* harmony import */ var _box_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(8899);
/* harmony import */ var _jsonl_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(47628);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_tasks_js__WEBPACK_IMPORTED_MODULE_3__, _ink_runner_js__WEBPACK_IMPORTED_MODULE_4__]);
([_tasks_js__WEBPACK_IMPORTED_MODULE_3__, _ink_runner_js__WEBPACK_IMPORTED_MODULE_4__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);










__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 10483:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* unused harmony exports getSkillCostUSD, runSkillTasksWithInk */
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(43663);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(54583);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var ink__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(22687);
/* harmony import */ var _tasks_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(5836);
/* harmony import */ var _formatters_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(43171);
/* harmony import */ var _utils_index_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(36137);
/* harmony import */ var _verbosity_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(21307);
/* harmony import */ var _sdk_circuit_breaker_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(71794);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([ink__WEBPACK_IMPORTED_MODULE_2__, _tasks_js__WEBPACK_IMPORTED_MODULE_3__]);
([ink__WEBPACK_IMPORTED_MODULE_2__, _tasks_js__WEBPACK_IMPORTED_MODULE_3__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);

/**
 * Ink-based skill runner with real-time progress display.
 *
 * While skills run, the dynamic Ink area shows running skills and active files.
 * After Ink unmounts, the full per-skill + per-file breakdown is printed to
 * stderr, followed by the normal findings report.
 *
 * UI updates are batched via setImmediate() to prevent rapid consecutive
 * rerender() calls from producing duplicate output lines.
 *
 * Reporter spec: specs/reporters.md
 * Terminal output design guide: specs/terminal-output.md
 */











function Spinner() {
    const [frame, setFrame] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => {
            setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
        }, 80);
        return () => clearInterval(timer);
    }, []);
    return _jsx(Text, { color: "yellow", children: SPINNER_FRAMES[frame] });
}
function FileProgress({ file }) {
    const filename = truncate(file.filename, 50);
    return (_jsxs(Box, { children: [_jsx(Spinner, {}), _jsxs(Text, { children: [" ", filename, " [", file.currentHunk, "/", file.totalHunks, "]"] })] }));
}
function getSkillCostUSD(skill) {
    const hasFileUsage = skill.files.some((file) => file.usage !== undefined);
    const primaryCost = skill.usage?.costUSD
        ?? (hasFileUsage ? skill.files.reduce((sum, file) => sum + (file.usage?.costUSD ?? 0), 0) : undefined);
    const auxiliaryCost = skill.auxiliaryUsage ? totalAuxiliaryCost(skill.auxiliaryUsage) : 0;
    if (primaryCost === undefined && auxiliaryCost === 0) {
        return undefined;
    }
    return (primaryCost ?? 0) + auxiliaryCost;
}
function RunningSkill({ skill }) {
    const activeFiles = skill.files.filter((f) => f.status === 'running');
    const doneCount = skill.files.filter((f) => f.status === 'done' || f.status === 'skipped').length;
    const totalCount = skill.files.length;
    const findingCount = skill.files.reduce((sum, f) => sum + f.findings.length, 0);
    const cost = getSkillCostUSD(skill);
    return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Box, { children: [_jsx(Spinner, {}), _jsxs(Text, { children: [" ", skill.displayName] }), totalCount > 0 && _jsxs(Text, { dimColor: true, children: ["  [", doneCount, "/", totalCount, " files]"] }), findingCount > 0 && _jsxs(Text, { children: ["  ", findingCount, " ", findingCount === 1 ? 'finding' : 'findings'] }), cost !== undefined && cost > 0 && _jsxs(Text, { dimColor: true, children: ["  ", formatCost(cost)] })] }), activeFiles.map((file) => (_jsx(Box, { marginLeft: 2, children: _jsx(FileProgress, { file: file }) }, file.filename)))] }));
}
function CompletedSkill({ skill }) {
    if (skill.status === 'skipped') {
        return (_jsxs(Text, { children: [_jsx(Text, { color: "yellow", children: ICON_SKIPPED }), " ", skill.displayName, " ", _jsx(Text, { dimColor: true, children: "[skipped]" })] }));
    }
    const findingCount = skill.findings.length;
    const cost = getSkillCostUSD(skill);
    const duration = skill.durationMs ? formatDuration(skill.durationMs) : undefined;
    if (skill.status === 'error') {
        return (_jsxs(Text, { children: [_jsx(Text, { color: "red", children: ICON_ERROR }), " ", skill.displayName, duration && _jsxs(Text, { dimColor: true, children: [" [", duration, "]"] })] }));
    }
    return (_jsxs(Text, { children: [_jsx(Text, { color: "green", children: ICON_CHECK }), " ", skill.displayName, duration && _jsxs(Text, { dimColor: true, children: [" [", duration, "]"] }), findingCount > 0 && _jsxs(Text, { children: ["  ", findingCount, " ", findingCount === 1 ? 'finding' : 'findings'] }), cost !== undefined && cost > 0 && _jsxs(Text, { dimColor: true, children: ["  ", formatCost(cost)] })] }));
}
function SkillRunner({ skills, warnings, interrupted, failFastTriggered }) {
    const completed = skills.filter((s) => s.status === 'done' || s.status === 'skipped' || s.status === 'error');
    const running = skills.filter((s) => s.status === 'running');
    const pending = skills.filter((s) => s.status === 'pending');
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Static, { items: warnings, children: (warning, index) => (_jsx(Text, { children: warning }, index)) }), completed.map((skill) => (_jsx(CompletedSkill, { skill: skill }, skill.name))), running.map((skill) => (_jsx(RunningSkill, { skill: skill }, skill.name))), pending.map((skill) => (_jsxs(Text, { dimColor: true, children: [ICON_PENDING, " ", skill.displayName] }, skill.name))), failFastTriggered && (_jsxs(Text, { color: "yellow", dimColor: true, children: [figures.warning, " Stopping ", '\u2014', " finding detected (--fail-fast)"] })), interrupted && !failFastTriggered && (_jsxs(Text, { color: "yellow", dimColor: true, children: [figures.warning, " Interrupted, finishing up... (press Ctrl+C again to force exit)"] }))] }));
}
/** Create a terminal skill state for skills that were skipped or errored before starting. */
function makeTerminalSkillState(tasks, name, overrides) {
    const task = tasks.find((t) => t.name === name);
    return {
        name,
        displayName: task?.displayName ?? name,
        status: 'pending',
        files: [],
        findings: [],
        ...overrides,
    };
}
/** No-op callbacks for quiet mode. */
const noop = () => {
    return;
};
const noopCallbacks = {
    onSkillStart: noop,
    onSkillUpdate: noop,
    onFileUpdate: noop,
    onChunkComplete: noop,
    onSkillComplete: noop,
    onSkillSkipped: noop,
    onSkillError: noop,
};
function syncFileFindingsWithFinalReport(files, findings) {
    return files.map((file) => ({
        ...file,
        findings: findings.filter((finding) => findingAppliesToFile(finding, file.filename)),
    }));
}
/** Severity levels in display order. */
const SEVERITY_LEVELS = (/* unused pure expression or super */ null && (['high', 'medium', 'low']));
/** Print the per-file line within a skill summary. */
function printFileSummary(file) {
    if (file.status === 'done') {
        const filename = truncate(file.filename, 50);
        const counts = countBySeverity(file.findings);
        let line = `  ${chalk.green(ICON_CHECK)} ${filename} ${chalk.dim(`[${file.totalHunks}/${file.totalHunks}]`)}`;
        const severityParts = SEVERITY_LEVELS
            .filter((s) => counts[s] > 0)
            .map((s) => `${formatSeverityDot(s)} ${counts[s]}`);
        if (severityParts.length > 0)
            line += `  ${severityParts.join('  ')}`;
        if (file.durationMs !== undefined)
            line += chalk.dim(`  ${formatDuration(file.durationMs)}`);
        if (file.usage !== undefined)
            line += chalk.dim(`  ${formatCost(file.usage.costUSD)}`);
        process.stderr.write(`${line}\n`);
    }
}
/** Print the full skill + file breakdown to stderr after Ink unmounts. */
function printSkillSummary(skillStates) {
    for (const skill of skillStates) {
        const duration = skill.durationMs ? chalk.dim(` [${formatDuration(skill.durationMs)}]`) : '';
        const cost = getSkillCostUSD(skill);
        const costText = cost !== undefined && cost > 0 ? chalk.dim(`  ${formatCost(cost)}`) : '';
        if (skill.status === 'done') {
            process.stderr.write(`${chalk.green(ICON_CHECK)} ${skill.displayName}${duration}${costText}\n`);
        }
        else if (skill.status === 'skipped') {
            process.stderr.write(`${chalk.yellow(ICON_SKIPPED)} ${skill.displayName} ${chalk.dim('[skipped]')}\n`);
        }
        else if (skill.status === 'error') {
            process.stderr.write(`${chalk.red(ICON_ERROR)} ${skill.displayName}${duration}\n`);
            if (skill.error) {
                process.stderr.write(`${chalk.red(`  Error: ${skill.error}`)}\n`);
            }
        }
        if (skill.status === 'done' || skill.status === 'error') {
            for (const file of skill.files) {
                printFileSummary(file);
            }
            const skippedCount = skill.files.filter((f) => f.status === 'skipped').length;
            if (skippedCount > 0) {
                process.stderr.write(`  ${chalk.dim(`${skippedCount} ${pluralize(skippedCount, 'file')} skipped`)}\n`);
            }
        }
    }
}
/**
 * Run skill tasks with Ink-based real-time progress display.
 */
async function runSkillTasksWithInk(tasks, options) {
    const { verbosity, concurrency, failFastController, onSkillComplete: streamHook, onChunkComplete } = options;
    const fireStreamHook = streamHook
        ? (report) => {
            try {
                streamHook(report);
            }
            catch { /* streaming hook must not break the run */ }
        }
        : undefined;
    if (tasks.length === 0 || verbosity === Verbosity.Quiet) {
        // No tasks or quiet mode - run without UI using global semaphore.
        const semaphore = new Semaphore(concurrency);
        const circuitAbortController = new AbortController();
        const circuitBreaker = new ProviderFailureCircuitBreaker({ abortController: circuitAbortController });
        const composedTasks = composeTasksWithFailFast(tasks, failFastController, circuitBreaker, circuitAbortController);
        const callbacks = {
            ...noopCallbacks,
            ...(fireStreamHook || failFastController
                ? {
                    onSkillComplete: (name, report) => {
                        noopCallbacks.onSkillComplete(name, report);
                        fireStreamHook?.(report);
                        if (failFastController && report.findings.length > 0) {
                            failFastController.abort();
                        }
                    },
                }
                : {}),
            ...(onChunkComplete
                ? {
                    onChunkComplete: (name, chunk) => {
                        noopCallbacks.onChunkComplete?.(name, chunk);
                        try {
                            onChunkComplete(name, chunk);
                        }
                        catch { /* streaming hook must not break the run */ }
                    },
                }
                : {}),
        };
        return runComposedSkillTasks(composedTasks, callbacks, semaphore);
    }
    // Track skill states
    const skillStates = [];
    // Warnings are rendered via Ink's Static component so they appear above the
    // dynamic spinner area without corrupting it.
    const warnings = [];
    // Track interrupt state for rendering in the Ink component
    let interrupted = false;
    let failFastTriggered = false;
    process.stderr.write(`${chalk.bold('SKILLS')}\n`);
    // Create Ink instance
    const { rerender, unmount, clear } = render(_jsx(SkillRunner, { skills: skillStates, warnings: [], interrupted: false, failFastTriggered: false }), { stdout: process.stderr });
    // Batch UI updates to prevent rapid consecutive rerenders that cause duplicate lines.
    // Without batching, multiple callbacks firing in quick succession (e.g., 5 files
    // starting simultaneously) trigger 5 immediate rerenders, which Ink cannot
    // process correctly, resulting in the same line appearing multiple times.
    let updatePending = false;
    let unmounted = false;
    const updateUI = () => {
        if (updatePending || unmounted)
            return;
        updatePending = true;
        setImmediate(() => {
            updatePending = false;
            if (unmounted)
                return;
            rerender(_jsx(SkillRunner, { skills: [...skillStates], warnings: [...warnings], interrupted: interrupted, failFastTriggered: failFastTriggered }));
        });
    };
    // Listen for abort signal to show interrupt message in the Ink UI
    const abortSignal = tasks[0]?.runnerOptions?.abortController?.signal;
    if (abortSignal && !abortSignal.aborted) {
        abortSignal.addEventListener('abort', () => {
            // Only show interrupt message for user SIGINT, not fail-fast
            if (!failFastController?.signal.aborted) {
                interrupted = true;
                updateUI();
            }
        }, { once: true });
    }
    // Show fail-fast message when triggered
    if (failFastController) {
        failFastController.signal.addEventListener('abort', () => {
            failFastTriggered = true;
            updateUI();
        }, { once: true });
    }
    // Callbacks to update state
    const callbacks = {
        onSkillStart: (skill) => {
            skillStates.push(skill);
            updateUI();
        },
        onSkillUpdate: (name, updates) => {
            const idx = skillStates.findIndex((s) => s.name === name);
            const existing = skillStates[idx];
            if (idx >= 0 && existing) {
                const next = { ...existing, ...updates };
                if (updates.findings !== undefined) {
                    next.files = syncFileFindingsWithFinalReport(next.files, updates.findings);
                }
                skillStates[idx] = next;
                updateUI();
            }
        },
        onFileUpdate: (skillName, filename, updates) => {
            const skill = skillStates.find((s) => s.name === skillName);
            if (skill) {
                const file = skill.files.find((f) => f.filename === filename);
                if (file) {
                    Object.assign(file, updates);
                    updateUI();
                }
            }
        },
        onSkillComplete: (name, report) => {
            fireStreamHook?.(report);
            const idx = skillStates.findIndex((s) => s.name === name);
            const existing = skillStates[idx];
            if (idx >= 0 && existing) {
                skillStates[idx] = {
                    ...existing,
                    status: existing.status === 'error' || existing.status === 'skipped' ? existing.status : 'done',
                    durationMs: report.durationMs,
                    findings: report.findings,
                    usage: report.usage,
                    auxiliaryUsage: report.auxiliaryUsage,
                    files: syncFileFindingsWithFinalReport(existing.files, report.findings),
                };
            }
            if (failFastController && report.findings.length > 0) {
                failFastController.abort();
            }
            updateUI();
        },
        onChunkComplete: (name, chunk) => {
            try {
                onChunkComplete?.(name, chunk);
            }
            catch { /* streaming hook must not break the run */ }
        },
        onSkillSkipped: (name) => {
            skillStates.push(makeTerminalSkillState(tasks, name, { status: 'skipped' }));
            updateUI();
        },
        onSkillError: (name, error) => {
            const idx = skillStates.findIndex((s) => s.name === name);
            const existing = skillStates[idx];
            if (idx >= 0 && existing) {
                skillStates[idx] = { ...existing, status: 'error', error };
            }
            else {
                skillStates.push(makeTerminalSkillState(tasks, name, { status: 'error', error }));
            }
            updateUI();
        },
        onLargePrompt: (_skillName, filename, lineRange, chars, estimatedTokens) => {
            const location = `${filename}:${lineRange}`;
            const size = `${Math.round(chars / 1000)}k chars (~${Math.round(estimatedTokens / 1000)}k tokens)`;
            warnings.push(`${chalk.yellow(figures.warning)}  Large prompt for ${location}: ${size}`);
            updateUI();
        },
        onPromptSize: verbosity >= Verbosity.Debug
            ? (_skillName, filename, lineRange, systemChars, userChars, totalChars, estimatedTokens) => {
                const location = `${filename}:${lineRange}`;
                warnings.push(chalk.dim(`[debug] Prompt for ${location}: system=${systemChars}, user=${userChars}, total=${totalChars} chars (~${estimatedTokens} tokens)`));
                updateUI();
            }
            : undefined,
        onHunkFailed: verbosity >= Verbosity.Verbose
            ? (_skillName, filename, lineRange, error) => {
                const location = `${filename}:${lineRange}`;
                warnings.push(`${chalk.yellow(figures.warning)}  Chunk failed: ${location} ${chalk.dim(`\u2014 ${error}`)}`);
                updateUI();
            }
            : undefined,
        onExtractionFailure: verbosity >= Verbosity.Verbose
            ? (_skillName, filename, lineRange, error, preview) => {
                const location = `${filename}:${lineRange}`;
                warnings.push(`${chalk.yellow(figures.warning)}  Extraction failed: ${location} ${chalk.dim(`\u2014 ${error}`)}`);
                if (verbosity >= Verbosity.Debug && preview) {
                    warnings.push(chalk.dim(`[debug]   Output preview: ${preview.slice(0, 200)}`));
                }
                updateUI();
            }
            : undefined,
        onRetry: verbosity >= Verbosity.Verbose
            ? (_skillName, filename, lineRange, attempt, maxRetries, error, delayMs) => {
                const location = `${filename}:${lineRange}`;
                const retryInfo = `attempt ${attempt}/${maxRetries}`;
                const delay = delayMs > 0 ? `, retrying in ${Math.round(delayMs / 1000)}s` : '';
                warnings.push(chalk.dim(`[debug] Retry ${location} (${retryInfo}${delay}): ${error}`));
                updateUI();
            }
            : undefined,
    };
    // Global semaphore gates file-level work across all skills.
    const semaphore = new Semaphore(concurrency);
    // Compose per-task abort controllers: fire on SIGINT, fail-fast, or provider circuit breaker.
    const circuitAbortController = new AbortController();
    const circuitBreaker = new ProviderFailureCircuitBreaker({ abortController: circuitAbortController });
    const composedTasks = composeTasksWithFailFast(tasks, failFastController, circuitBreaker, circuitAbortController);
    // Launch all skills in parallel; the semaphore is the sole concurrency gate.
    const results = await runComposedSkillTasks(composedTasks, callbacks, semaphore);
    // Flush any pending setImmediate from updateUI so last-tick warnings are
    // rendered before we tear down. setImmediate is FIFO, so our callback runs
    // after the queued rerender.
    await new Promise((resolve) => setImmediate(resolve));
    unmounted = true;
    clear();
    unmount();
    printSkillSummary(skillStates);
    return results;
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 47628:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* unused harmony exports MODEL_DEFAULT_SENTINEL, generateRunId, shortRunId, getRepoLogPath, JsonlRunMetadataSchema, JsonlFileRecordSchema, JsonlChunkRecordSchema, JsonlRecordSchema, JsonlSummaryRecordSchema, JsonlFixEvalDetailSchema, JsonlFixEvaluationRecordSchema, buildRunMetadata, buildSkillJsonlRecord, buildSummaryJsonlRecord, renderJsonlSkillLine, renderJsonlSummaryLine, renderJsonlChunkLine, renderJsonlChunkRecords, initJsonlFile, appendJsonlLine, renderJsonlString, writeJsonlReport, writeJsonlContent, readJsonlLog, parseJsonlReports, parseLogMetadata */
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(73024);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_crypto__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(77598);
/* harmony import */ var node_crypto__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(node_crypto__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(76760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(node_path__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(53391);
/* harmony import */ var _types_index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(78481);
/* harmony import */ var _sentry_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(30340);
/* harmony import */ var _formatters_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(43171);








/**
 * Sentinel value recorded in JSONL metadata when no model is explicitly configured.
 */
const MODEL_DEFAULT_SENTINEL = '(default)';
/**
 * Generate a unique run ID for this execution.
 */
function generateRunId() {
    return randomUUID();
}
/**
 * Get the first 8 hex chars (no dashes) of a UUID for use in filenames.
 */
function shortRunId(runId) {
    return runId.replace(/-/g, '').slice(0, 8);
}
/**
 * Get the repo-local log file path.
 * Returns: {repoRoot}/.warden/logs/{runId8}-{ISO-datetime}.jsonl
 */
function getRepoLogPath(repoRoot, runId, timestamp = new Date()) {
    const ts = timestamp.toISOString().replace(/[:.]/g, '-');
    return join(repoRoot, '.warden', 'logs', `${shortRunId(runId)}-${ts}.jsonl`);
}
/**
 * JSONL record schemas for Warden's structured run output.
 *
 * Formal JSON Schema: specs/jsonl-schema.json
 * Example payloads:   specs/jsonl-examples.jsonl
 * Reporter spec:      specs/reporters.md Section 3 "JSONL Specification"
 *
 * BACKWARD COMPATIBILITY: breaking on-disk JSONL log formats is NEVER
 * ALLOWED. Users keep .warden/logs/*.jsonl across versions. The schema
 * may evolve — new optional fields, additive enum values, normalization
 * — but every historical shape must continue to parse cleanly. Field
 * renames require a preprocess that maps the old name to the new one
 * (see FileReportSchema's `findingCount → findings` preprocess in
 * src/types/index.ts). Removing a field is fine; making it optional in
 * the schema preserves old logs. If you can't reconcile an old shape
 * with a preprocess, the change is wrong — find a different path.
 */
/** Metadata common to every JSONL record. */
const JsonlRunMetadataSchema = zod__WEBPACK_IMPORTED_MODULE_6__/* .object */ .Ik({
    timestamp: zod__WEBPACK_IMPORTED_MODULE_6__/* .string */ .Yj().datetime(),
    durationMs: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().nonnegative(),
    cwd: zod__WEBPACK_IMPORTED_MODULE_6__/* .string */ .Yj(),
    runId: zod__WEBPACK_IMPORTED_MODULE_6__/* .string */ .Yj(),
    traceId: zod__WEBPACK_IMPORTED_MODULE_6__/* .string */ .Yj().optional(),
    model: zod__WEBPACK_IMPORTED_MODULE_6__/* .string */ .Yj().optional(),
    headSha: zod__WEBPACK_IMPORTED_MODULE_6__/* .string */ .Yj().optional(),
});
/** Per-file breakdown within a skill record (re-exported from shared types). */
const JsonlFileRecordSchema = (/* unused pure expression or super */ null && (FileReportSchema));
/** Unit of work scanned by Warden. New run logs contain only this record type. */
const JsonlChunkRecordSchema = zod__WEBPACK_IMPORTED_MODULE_6__/* .object */ .Ik({
    schemaVersion: zod__WEBPACK_IMPORTED_MODULE_6__/* .literal */ .eu(1),
    run: JsonlRunMetadataSchema,
    skill: zod__WEBPACK_IMPORTED_MODULE_6__/* .string */ .Yj(),
    model: zod__WEBPACK_IMPORTED_MODULE_6__/* .string */ .Yj().optional(),
    chunk: zod__WEBPACK_IMPORTED_MODULE_6__/* .object */ .Ik({
        file: zod__WEBPACK_IMPORTED_MODULE_6__/* .string */ .Yj(),
        index: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().int().positive(),
        total: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().int().positive(),
        lineRange: zod__WEBPACK_IMPORTED_MODULE_6__/* .string */ .Yj(),
    }),
    status: zod__WEBPACK_IMPORTED_MODULE_6__/* ["enum"] */ .k5(['ok', 'error', 'skipped']),
    findings: zod__WEBPACK_IMPORTED_MODULE_6__/* .array */ .YO(_types_index_js__WEBPACK_IMPORTED_MODULE_3__/* .FindingSchema */ .p_),
    usage: _types_index_js__WEBPACK_IMPORTED_MODULE_3__/* .UsageStatsSchema */ .Ur.optional(),
    durationMs: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().nonnegative(),
    auxiliaryUsage: _types_index_js__WEBPACK_IMPORTED_MODULE_3__/* .AuxiliaryUsageMapSchema */ .xb.optional(),
    error: _types_index_js__WEBPACK_IMPORTED_MODULE_3__/* .SkillErrorSchema */ .J1.optional(),
    skippedFiles: zod__WEBPACK_IMPORTED_MODULE_6__/* .array */ .YO(_types_index_js__WEBPACK_IMPORTED_MODULE_3__/* .SkippedFileSchema */ .AU).optional(),
});
/**
 * One skill's analysis results. This is the shared SkillReport plus a `run`
 * block of run-wide metadata, so any new SkillReport field is automatically
 * part of the JSONL contract without a parallel schema.
 */
const JsonlRecordSchema = _types_index_js__WEBPACK_IMPORTED_MODULE_3__/* .SkillReportSchema */ .r6.extend({
    run: JsonlRunMetadataSchema,
});
/** Normalized output shape — what we emit. */
const BySeverityOutputSchema = zod__WEBPACK_IMPORTED_MODULE_6__/* .object */ .Ik({
    high: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().int().nonnegative(),
    medium: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().int().nonnegative(),
    low: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().int().nonnegative(),
});
/**
 * Severity breakdown in the summary record.
 *
 * Parse-time accepts any string keys (legacy logs may emit 5-level severities
 * like 'critical'/'info'); a transform normalizes 'critical' → 'high' and
 * 'info' → 'low' and drops unknown keys. The piped output shape is the
 * strict `{ high, medium, low }` triple we emit going forward, so
 * JSON-Schema derivation describes the output contract (not the lax input).
 */
const BySeveritySchema = zod__WEBPACK_IMPORTED_MODULE_6__/* .record */ .g1(zod__WEBPACK_IMPORTED_MODULE_6__/* .string */ .Yj(), zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().int().nonnegative())
    .transform((obj) => {
    const result = { high: 0, medium: 0, low: 0 };
    for (const [key, value] of Object.entries(obj)) {
        const normalized = key === 'critical' ? 'high' : key === 'info' ? 'low' : key;
        if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
            result[normalized] += value;
        }
    }
    return result;
})
    .pipe(BySeverityOutputSchema);
/** Aggregate summary across all skills (always the last JSONL line). */
const JsonlSummaryRecordSchema = zod__WEBPACK_IMPORTED_MODULE_6__/* .object */ .Ik({
    run: JsonlRunMetadataSchema,
    type: zod__WEBPACK_IMPORTED_MODULE_6__/* .literal */ .eu('summary'),
    totalFindings: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().int().nonnegative(),
    bySeverity: BySeveritySchema,
    usage: _types_index_js__WEBPACK_IMPORTED_MODULE_3__/* .UsageStatsSchema */ .Ur.optional(),
    totalSkippedFiles: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().int().nonnegative().optional(),
    auxiliaryUsage: _types_index_js__WEBPACK_IMPORTED_MODULE_3__/* .AuxiliaryUsageMapSchema */ .xb.optional(),
    failedSkills: zod__WEBPACK_IMPORTED_MODULE_6__/* .array */ .YO(zod__WEBPACK_IMPORTED_MODULE_6__/* .string */ .Yj()).optional(),
    totalFailedHunks: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().int().nonnegative().optional(),
    totalFailedExtractions: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().int().nonnegative().optional(),
    /**
     * Top-level run error captured before any skill ran (e.g. auth failure,
     * config load error). Skill-level errors live on the SkillRecord; this
     * is for failures that prevent the per-skill loop from starting.
     */
    error: _types_index_js__WEBPACK_IMPORTED_MODULE_3__/* .SkillErrorSchema */ .J1.optional(),
});
/** Per-evaluation detail for fix evaluation records. */
const JsonlFixEvalDetailSchema = zod__WEBPACK_IMPORTED_MODULE_6__/* .object */ .Ik({
    path: zod__WEBPACK_IMPORTED_MODULE_6__/* .string */ .Yj(),
    line: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().int().positive(),
    findingId: zod__WEBPACK_IMPORTED_MODULE_6__/* .string */ .Yj().optional(),
    verdict: zod__WEBPACK_IMPORTED_MODULE_6__/* .union */ .KC([_types_index_js__WEBPACK_IMPORTED_MODULE_3__/* .FixStatusSchema */ .$3, zod__WEBPACK_IMPORTED_MODULE_6__/* .literal */ .eu('re_detected'), zod__WEBPACK_IMPORTED_MODULE_6__/* .literal */ .eu('eval_error')]),
    reasoning: zod__WEBPACK_IMPORTED_MODULE_6__/* .string */ .Yj().optional(),
    durationMs: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().nonnegative(),
    usage: _types_index_js__WEBPACK_IMPORTED_MODULE_3__/* .UsageStatsSchema */ .Ur,
    usedFallback: zod__WEBPACK_IMPORTED_MODULE_6__/* .boolean */ .zM().optional(),
});
/** Fix evaluation results record. */
const JsonlFixEvaluationRecordSchema = zod__WEBPACK_IMPORTED_MODULE_6__/* .object */ .Ik({
    run: JsonlRunMetadataSchema,
    type: zod__WEBPACK_IMPORTED_MODULE_6__/* .literal */ .eu('fix-evaluation'),
    evaluated: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().int().nonnegative(),
    resolved: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().int().nonnegative(),
    needsAttention: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().int().nonnegative(),
    skipped: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().int().nonnegative(),
    failedEvaluations: zod__WEBPACK_IMPORTED_MODULE_6__/* .number */ .ai().int().nonnegative(),
    usage: _types_index_js__WEBPACK_IMPORTED_MODULE_3__/* .UsageStatsSchema */ .Ur.optional(),
    evaluations: zod__WEBPACK_IMPORTED_MODULE_6__/* .array */ .YO(JsonlFixEvalDetailSchema).optional(),
});
/**
 * Aggregate usage stats from reports.
 */
function aggregateUsage(reports) {
    const usages = reports.map((r) => r.usage).filter((u) => u !== undefined);
    if (usages.length === 0)
        return undefined;
    return usages.reduce((acc, u) => ({
        inputTokens: acc.inputTokens + u.inputTokens,
        outputTokens: acc.outputTokens + u.outputTokens,
        cacheReadInputTokens: (acc.cacheReadInputTokens ?? 0) + (u.cacheReadInputTokens ?? 0),
        cacheCreationInputTokens: (acc.cacheCreationInputTokens ?? 0) + (u.cacheCreationInputTokens ?? 0),
        cacheCreation5mInputTokens: (acc.cacheCreation5mInputTokens ?? 0) + (u.cacheCreation5mInputTokens ?? 0),
        cacheCreation1hInputTokens: (acc.cacheCreation1hInputTokens ?? 0) + (u.cacheCreation1hInputTokens ?? 0),
        webSearchRequests: (acc.webSearchRequests ?? 0) + (u.webSearchRequests ?? 0),
        costUSD: acc.costUSD + u.costUSD,
    }));
}
/**
 * Build a JSONL run metadata block. `durationMs` is a snapshot at write
 * time for skill records, the run total on the trailing summary record.
 */
function buildRunMetadata(options) {
    return {
        timestamp: (options.timestamp ?? new Date()).toISOString(),
        durationMs: options.durationMs,
        cwd: options.cwd ?? process.cwd(),
        runId: options.runId,
        traceId: options.traceId,
        model: options.model,
        headSha: options.headSha,
    };
}
/** Build a skill JSONL record, dropping zero-valued optional fields. */
function buildSkillJsonlRecord(report, run) {
    const trimmed = {
        ...report,
        skippedFiles: report.skippedFiles?.length ? report.skippedFiles : undefined,
        failedHunks: report.failedHunks || undefined,
        failedExtractions: report.failedExtractions || undefined,
        hunkFailures: report.hunkFailures?.length ? report.hunkFailures : undefined,
    };
    return { ...trimmed, run };
}
/** Build the aggregate summary JSONL record. */
function buildSummaryJsonlRecord(reports, run, error) {
    const allFindings = reports.flatMap((r) => r.findings);
    const totalSkippedFiles = reports.reduce((n, r) => n + (r.skippedFiles?.length ?? 0), 0);
    const totalAuxiliaryUsage = reports.reduce((acc, r) => mergeAuxiliaryUsage(acc, r.auxiliaryUsage), undefined);
    const failedSkills = reports.filter((r) => r.error).map((r) => r.skill);
    const totalFailedHunks = reports.reduce((n, r) => n + (r.failedHunks ?? 0), 0);
    const totalFailedExtractions = reports.reduce((n, r) => n + (r.failedExtractions ?? 0), 0);
    return {
        run,
        type: 'summary',
        totalFindings: allFindings.length,
        bySeverity: countBySeverity(allFindings),
        usage: aggregateUsage(reports),
        totalSkippedFiles: totalSkippedFiles > 0 ? totalSkippedFiles : undefined,
        auxiliaryUsage: totalAuxiliaryUsage,
        failedSkills: failedSkills.length > 0 ? failedSkills : undefined,
        totalFailedHunks: totalFailedHunks > 0 ? totalFailedHunks : undefined,
        totalFailedExtractions: totalFailedExtractions > 0 ? totalFailedExtractions : undefined,
        error,
    };
}
/** Render a single skill JSONL record as one line including trailing newline. */
function renderJsonlSkillLine(report, run) {
    return JSON.stringify(buildSkillJsonlRecord(report, run)) + '\n';
}
/** Render the summary JSONL record as one line including trailing newline. */
function renderJsonlSummaryLine(reports, run, error) {
    return JSON.stringify(buildSummaryJsonlRecord(reports, run, error)) + '\n';
}
/** Render one chunk result record as one JSONL line. */
function renderJsonlChunkLine(record) {
    return JSON.stringify(JsonlChunkRecordSchema.parse(record)) + '\n';
}
function renderJsonlChunkRecords(records) {
    return records.map((record) => renderJsonlChunkLine(record)).join('');
}
/** Create parent dirs and truncate the file to empty. */
function initJsonlFile(outputPath) {
    const resolvedPath = resolve(process.cwd(), outputPath);
    mkdirSync(dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, '');
}
/**
 * Append a pre-rendered line (must include its trailing newline).
 * This uses one synchronous append call so parallel skill callbacks in this
 * process cannot interleave partial JSON records.
 */
function appendJsonlLine(outputPath, line) {
    const resolvedPath = resolve(process.cwd(), outputPath);
    mkdirSync(dirname(resolvedPath), { recursive: true });
    appendFileSync(resolvedPath, line);
}
/**
 * Render skill reports as a JSONL string.
 * Each line contains one skill report with run metadata.
 * A final summary line is appended at the end.
 */
function renderJsonlString(reports, durationMs, options) {
    const runMetadata = buildRunMetadata({
        runId: options?.runId ?? generateRunId(),
        durationMs,
        timestamp: options?.timestamp,
        traceId: options?.traceId,
        model: options?.model,
        headSha: options?.headSha,
        cwd: options?.cwd,
    });
    const lines = [];
    for (const report of reports) {
        lines.push(JSON.stringify(buildSkillJsonlRecord(report, runMetadata)));
    }
    lines.push(JSON.stringify(buildSummaryJsonlRecord(reports, runMetadata, options?.error)));
    return lines.join('\n') + '\n';
}
/**
 * Write skill reports to a JSONL file.
 */
function writeJsonlReport(outputPath, reports, durationMs, options) {
    const resolvedPath = resolve(process.cwd(), outputPath);
    const content = renderJsonlString(reports, durationMs, options);
    mkdirSync(dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, content);
}
/**
 * Write pre-rendered JSONL content to a file path.
 */
function writeJsonlContent(outputPath, content) {
    const resolvedPath = resolve(process.cwd(), outputPath);
    mkdirSync(dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, content);
}
/**
 * Read a JSONL log file and return its contents.
 */
function readJsonlLog(logPath) {
    return readFileSync(logPath, 'utf-8');
}
function summarizeFindings(skill, findings) {
    if (findings.length === 0)
        return `${skill}: No issues found`;
    const counts = countBySeverity(findings);
    const parts = [
        counts.high ? `${counts.high} high` : undefined,
        counts.medium ? `${counts.medium} medium` : undefined,
        counts.low ? `${counts.low} low` : undefined,
    ].filter(Boolean);
    return `${skill}: Found ${findings.length} ${findings.length === 1 ? 'issue' : 'issues'} (${parts.join(', ')})`;
}
function addUsage(a, b) {
    if (!a)
        return b;
    if (!b)
        return a;
    return {
        inputTokens: a.inputTokens + b.inputTokens,
        outputTokens: a.outputTokens + b.outputTokens,
        cacheReadInputTokens: (a.cacheReadInputTokens ?? 0) + (b.cacheReadInputTokens ?? 0),
        cacheCreationInputTokens: (a.cacheCreationInputTokens ?? 0) + (b.cacheCreationInputTokens ?? 0),
        cacheCreation5mInputTokens: (a.cacheCreation5mInputTokens ?? 0) + (b.cacheCreation5mInputTokens ?? 0),
        cacheCreation1hInputTokens: (a.cacheCreation1hInputTokens ?? 0) + (b.cacheCreation1hInputTokens ?? 0),
        webSearchRequests: (a.webSearchRequests ?? 0) + (b.webSearchRequests ?? 0),
        costUSD: a.costUSD + b.costUSD,
    };
}
function reportsFromChunks(chunks) {
    const bySkill = new Map();
    for (const chunk of chunks) {
        const records = bySkill.get(chunk.skill) ?? [];
        records.push(chunk);
        bySkill.set(chunk.skill, records);
    }
    const reports = [];
    for (const [skill, records] of bySkill) {
        const reportLevelError = records.find(isReportLevelErrorRecord)?.error;
        const chunkRecords = records.filter((record) => !isReportLevelErrorRecord(record));
        const aggregateRecords = chunkRecords.length > 0 ? chunkRecords : records;
        const findings = aggregateRecords.flatMap((r) => r.findings);
        const usage = aggregateRecords.reduce((acc, r) => addUsage(acc, r.usage), undefined);
        const auxiliaryUsage = aggregateRecords.reduce((acc, r) => mergeAuxiliaryUsage(acc, r.auxiliaryUsage), undefined);
        const filesByName = new Map();
        const hunkFailures = [];
        const skippedFiles = records.flatMap((r) => r.skippedFiles ?? []);
        for (const record of aggregateRecords) {
            const existing = filesByName.get(record.chunk.file);
            if (record.chunk.file) {
                filesByName.set(record.chunk.file, {
                    filename: record.chunk.file,
                    findings: (existing?.findings ?? 0) + record.findings.length,
                    durationMs: (existing?.durationMs ?? 0) + record.durationMs,
                    usage: addUsage(existing?.usage, record.usage),
                });
            }
            if (record.status === 'error' && record.error && !isReportLevelErrorRecord(record)) {
                hunkFailures.push({
                    type: isExtractionErrorCode(record.error.code) ? 'extraction' : 'analysis',
                    filename: record.chunk.file,
                    lineRange: record.chunk.lineRange,
                    code: record.error.code,
                    message: record.error.message,
                });
            }
        }
        const failedHunks = chunkRecords.filter((r) => r.status === 'error' && r.error && !isExtractionErrorCode(r.error.code)).length;
        const failedExtractions = chunkRecords.filter((r) => r.status === 'error' && r.error && isExtractionErrorCode(r.error.code)).length;
        const allChunksFailed = chunkRecords.length > 0 &&
            findings.length === 0 &&
            chunkRecords.every((record) => record.status === 'error');
        const report = {
            skill,
            summary: summarizeFindings(skill, findings),
            findings,
            durationMs: aggregateRecords.reduce((sum, r) => sum + r.durationMs, 0),
            usage,
            files: [...filesByName.values()],
            model: aggregateRecords.find((r) => r.model)?.model,
        };
        if (reportLevelError) {
            report.error = reportLevelError;
        }
        else if (allChunksFailed) {
            report.error = {
                code: 'all_hunks_failed',
                message: `All ${chunkRecords.length} ${chunkRecords.length === 1 ? 'chunk' : 'chunks'} failed to analyze.`,
            };
        }
        if (auxiliaryUsage)
            report.auxiliaryUsage = auxiliaryUsage;
        if (failedHunks > 0)
            report.failedHunks = failedHunks;
        if (failedExtractions > 0)
            report.failedExtractions = failedExtractions;
        if (hunkFailures.length > 0)
            report.hunkFailures = hunkFailures;
        if (skippedFiles.length > 0)
            report.skippedFiles = skippedFiles;
        reports.push(report);
    }
    return reports;
}
function isReportLevelErrorRecord(record) {
    return record.status === 'error' && record.chunk.file === '' && Boolean(record.error);
}
function parseJsonlReports(content) {
    const lines = content.trim().split('\n').filter((line) => line.trim());
    const reports = [];
    const chunks = [];
    let runMetadata;
    let totalDurationMs = 0;
    for (const line of lines) {
        try {
            const parsed = JSON.parse(line);
            const chunk = JsonlChunkRecordSchema.safeParse(parsed);
            if (chunk.success) {
                chunks.push(chunk.data);
                if (!runMetadata)
                    runMetadata = chunk.data.run;
                totalDurationMs = Math.max(totalDurationMs, chunk.data.run.durationMs);
                continue;
            }
            // Skip summary record (but capture metadata from it)
            if (parsed.type === 'summary') {
                const summary = JsonlSummaryRecordSchema.parse(parsed);
                runMetadata = summary.run;
                totalDurationMs = summary.run.durationMs;
                continue;
            }
            // Fix-evaluation records are valid JSONL but not SkillReports; let
            // them pass through silently so we don't warn on every line of a log
            // that contains them.
            if (parsed.type === 'fix-evaluation')
                continue;
            // A JsonlRecord is a SkillReport + { run }. Strip `run` to get the
            // SkillReport without rebuilding it field-by-field.
            const { run, ...report } = JsonlRecordSchema.parse(parsed);
            reports.push(report);
            // Capture run metadata from first record if no summary yet
            if (!runMetadata) {
                runMetadata = run;
                totalDurationMs = run.durationMs;
            }
        }
        catch (err) {
            logger.warn('Skipping malformed JSONL line', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    return { reports: [...reports, ...reportsFromChunks(chunks)], runMetadata, totalDurationMs };
}
/**
 * Parse a JSONL log file's summary, skill names, and high-level metadata.
 * Returns undefined when the file can't be read or contains no parseable
 * records; in-progress files (valid records but no summary yet) return
 * metadata with `inProgress: true`.
 */
function parseLogMetadata(filePath) {
    let content;
    try {
        content = readFileSync(filePath, 'utf-8');
    }
    catch {
        return undefined;
    }
    const lines = content.trim().split('\n').filter((l) => l.trim());
    let summary;
    let firstRun;
    const skills = [];
    let model;
    let headSha;
    const uniqueFiles = new Set();
    const chunks = [];
    let recognizedRecords = 0;
    for (const line of lines) {
        try {
            const parsed = JSON.parse(line);
            const chunk = JsonlChunkRecordSchema.safeParse(parsed);
            if (chunk.success) {
                chunks.push(chunk.data);
                recognizedRecords++;
                if (!skills.includes(chunk.data.skill)) {
                    skills.push(chunk.data.skill);
                }
                if (!model && chunk.data.model) {
                    model = chunk.data.model;
                }
                if (!model && chunk.data.run.model) {
                    model = chunk.data.run.model;
                }
                if (!headSha && chunk.data.run.headSha) {
                    headSha = chunk.data.run.headSha;
                }
                if (!firstRun)
                    firstRun = chunk.data.run;
                if (chunk.data.chunk.file) {
                    uniqueFiles.add(chunk.data.chunk.file);
                }
            }
            else if (parsed.type === 'summary') {
                summary = JsonlSummaryRecordSchema.parse(parsed);
                recognizedRecords++;
                if (!model && parsed.run?.model && typeof parsed.run.model === 'string') {
                    model = parsed.run.model;
                }
                if (!headSha && parsed.run?.headSha && typeof parsed.run.headSha === 'string') {
                    headSha = parsed.run.headSha;
                }
                if (!firstRun)
                    firstRun = summary.run;
            }
            else if (parsed.skill && typeof parsed.skill === 'string') {
                recognizedRecords++;
                if (!skills.includes(parsed.skill)) {
                    skills.push(parsed.skill);
                }
                if (!model && parsed.run?.model && typeof parsed.run.model === 'string') {
                    model = parsed.run.model;
                }
                if (!headSha && parsed.run?.headSha && typeof parsed.run.headSha === 'string') {
                    headSha = parsed.run.headSha;
                }
                if (!firstRun && parsed.run) {
                    const runResult = JsonlRunMetadataSchema.safeParse(parsed.run);
                    if (runResult.success)
                        firstRun = runResult.data;
                }
                if (Array.isArray(parsed.files)) {
                    for (const f of parsed.files) {
                        if (f && typeof f.filename === 'string') {
                            uniqueFiles.add(f.filename);
                        }
                    }
                }
            }
        }
        catch (err) {
            logger.warn('Skipping malformed JSONL line', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    // Empty or fully corrupt files (no parseable records) surface as
    // "parse error" in the list, not as in-progress runs.
    if (recognizedRecords === 0 && lines.length > 0)
        return undefined;
    if (!summary && chunks.length > 0) {
        const reports = reportsFromChunks(chunks);
        const lastDuration = chunks.reduce((max, chunk) => Math.max(max, chunk.run.durationMs), 0);
        const firstChunk = chunks[0];
        if (!firstChunk)
            return undefined;
        const run = { ...(firstRun ?? firstChunk.run), durationMs: lastDuration };
        summary = buildSummaryJsonlRecord(reports, run);
    }
    return {
        summary,
        inProgress: chunks.length > 0 ? !existsSync(`${filePath}.done`) : !summary && !existsSync(`${filePath}.done`),
        runMetadata: summary?.run ?? firstRun,
        skills,
        model,
        headSha,
        totalFiles: uniqueFiles.size,
    };
}


/***/ }),

/***/ 34593:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* unused harmony export Reporter */
/* harmony import */ var _verbosity_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(21307);
/* harmony import */ var _formatters_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(43171);
/* harmony import */ var _box_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(8899);
/* harmony import */ var _utils_index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(36137);









/**
 * Map a file change status to its single-character symbol.
 */
function statusSymbol(status) {
    if (status === 'added')
        return '+';
    if (status === 'removed')
        return '-';
    return '~';
}
/**
 * Map a file change status to a colored symbol for TTY output.
 */
function coloredStatusSymbol(status) {
    const sym = statusSymbol(status);
    if (status === 'added')
        return chalk.green(sym);
    if (status === 'removed')
        return chalk.red(sym);
    return chalk.yellow(sym);
}
/**
 * ASCII art logo for TTY header.
 */
const LOGO = `
 __    __              _
/ / /\\ \\ \\__ _ _ __ __| | ___ _ __
\\ \\/  \\/ / _\` | '__/ _\` |/ _ \\ '_ \\
 \\  /\\  / (_| | | | (_| |  __/ | | |
  \\/  \\/ \\__,_|_|  \\__,_|\\___|_| |_|
`.replace(/^\n/, '');
/**
 * Main reporter class for CLI output.
 * Handles different verbosity levels and TTY/non-TTY modes.
 *
 * Reporter spec: specs/reporters.md
 */
class Reporter {
    mode;
    verbosity;
    constructor(mode, verbosity) {
        this.mode = mode;
        this.verbosity = verbosity;
    }
    /**
     * Output to stderr (status messages).
     */
    log(message) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        console.error(message);
    }
    /**
     * Output to stderr with timestamp (plain/log mode).
     */
    logPlain(message) {
        console.error(`[${timestamp()}] warden: ${message}`);
    }
    /**
     * Print the header with logo and version.
     */
    header() {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        if (this.mode.isTTY) {
            this.log('');
            for (const line of LOGO.split('\n')) {
                this.log(chalk.dim(line));
            }
            this.log(chalk.dim(`v${getVersion()}`));
            this.log('');
        }
        else {
            this.logPlain(`Warden v${getVersion()}`);
        }
    }
    /**
     * Start the context section (e.g., "Analyzing changes from HEAD~3...")
     */
    startContext(description) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        if (this.mode.isTTY) {
            this.log(chalk.dim(description));
            this.log('');
        }
        else {
            this.logPlain(description);
        }
    }
    /**
     * Display the list of files being analyzed.
     */
    contextFiles(files) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        const totalChunks = files.reduce((sum, f) => sum + (f.chunks ?? 0), 0);
        const displayFiles = files.slice(0, 10);
        if (this.mode.isTTY) {
            this.log(chalk.bold('FILES') +
                chalk.cyan(`  ${files.length} files`) +
                chalk.dim(` · ${totalChunks} chunks`));
            for (const file of displayFiles) {
                const chunkInfo = file.chunks ? chalk.dim(` (${file.chunks} ${pluralize(file.chunks, 'chunk')})`) : '';
                this.log(`  ${coloredStatusSymbol(file.status)} ${file.filename}${chunkInfo}`);
            }
            if (files.length > 10) {
                this.log(chalk.dim(`  ... and ${files.length - 10} more`));
            }
            this.log('');
        }
        else {
            this.logPlain(`Found ${files.length} changed files with ${totalChunks} chunks`);
            for (const file of displayFiles) {
                const chunkInfo = file.chunks ? ` (${file.chunks} ${pluralize(file.chunks, 'chunk')})` : '';
                this.logPlain(`  ${statusSymbol(file.status)} ${file.filename}${chunkInfo}`);
            }
            if (files.length > 10) {
                this.logPlain(`  ... and ${files.length - 10} more`);
            }
        }
    }
    /**
     * Aggregate usage stats from multiple reports.
     */
    aggregateUsage(reports) {
        const usages = reports.map((r) => r.usage).filter((u) => u !== undefined);
        if (usages.length === 0)
            return undefined;
        return usages.reduce((acc, u) => ({
            inputTokens: acc.inputTokens + u.inputTokens,
            outputTokens: acc.outputTokens + u.outputTokens,
            cacheReadInputTokens: (acc.cacheReadInputTokens ?? 0) + (u.cacheReadInputTokens ?? 0),
            cacheCreationInputTokens: (acc.cacheCreationInputTokens ?? 0) + (u.cacheCreationInputTokens ?? 0),
            cacheCreation5mInputTokens: (acc.cacheCreation5mInputTokens ?? 0) + (u.cacheCreation5mInputTokens ?? 0),
            cacheCreation1hInputTokens: (acc.cacheCreation1hInputTokens ?? 0) + (u.cacheCreation1hInputTokens ?? 0),
            webSearchRequests: (acc.webSearchRequests ?? 0) + (u.webSearchRequests ?? 0),
            costUSD: acc.costUSD + u.costUSD,
        }));
    }
    /**
     * Aggregate auxiliary usage stats from multiple reports.
     */
    aggregateAuxiliaryUsage(reports) {
        let totalAuxiliaryUsage;
        for (const report of reports) {
            if (report.auxiliaryUsage) {
                totalAuxiliaryUsage = mergeAuxiliaryUsage(totalAuxiliaryUsage, report.auxiliaryUsage);
            }
        }
        return totalAuxiliaryUsage;
    }
    /**
     * Render the summary section.
     */
    renderSummary(reports, totalDuration, options) {
        const allFindings = [];
        let totalFailedHunks = 0;
        let totalFailedExtractions = 0;
        let totalSkippedFiles = 0;
        for (const report of reports) {
            allFindings.push(...report.findings);
            totalFailedHunks += report.failedHunks ?? 0;
            totalFailedExtractions += report.failedExtractions ?? 0;
            totalSkippedFiles += report.skippedFiles?.length ?? 0;
        }
        const counts = countBySeverity(allFindings);
        const totalUsage = this.aggregateUsage(reports);
        const totalAuxiliaryUsage = this.aggregateAuxiliaryUsage(reports);
        if (this.verbosity === Verbosity.Quiet) {
            // Quiet mode: just output the summary line
            const countStr = formatFindingCountsPlain(counts);
            console.log(countStr);
            return;
        }
        if (this.mode.isTTY) {
            this.log(chalk.bold('SUMMARY'));
            this.log(formatFindingCounts(counts));
            if (totalFailedHunks > 0) {
                this.log(chalk.yellow(`${figures.warning}  ${totalFailedHunks} ${pluralize(totalFailedHunks, 'chunk')} failed to analyze`));
            }
            if (totalFailedExtractions > 0) {
                this.log(chalk.yellow(`${figures.warning}  ${totalFailedExtractions} finding ${pluralize(totalFailedExtractions, 'extraction')} failed`));
            }
            if ((totalFailedHunks > 0 || totalFailedExtractions > 0) && this.verbosity < Verbosity.Verbose) {
                this.log(chalk.dim('  Use -v for failure details'));
            }
            if (totalSkippedFiles > 0) {
                this.log(chalk.dim(`${totalSkippedFiles} ${pluralize(totalSkippedFiles, 'file')} skipped`));
            }
            const durationLine = `Analysis completed in ${formatDuration(totalDuration)}`;
            if (totalUsage) {
                this.log(chalk.dim(`${durationLine} · ${formatUsage(totalUsage, totalAuxiliaryUsage)}`));
            }
            else {
                this.log(chalk.dim(durationLine));
            }
            if (options?.traceId && this.verbosity >= Verbosity.Verbose) {
                this.log(chalk.dim(`Trace: ${options.traceId}`));
            }
        }
        else {
            this.logPlain(`Summary: ${formatFindingCountsPlain(counts)}`);
            if (totalFailedHunks > 0) {
                this.logPlain(`WARN: ${totalFailedHunks} ${pluralize(totalFailedHunks, 'chunk')} failed to analyze`);
            }
            if (totalFailedExtractions > 0) {
                this.logPlain(`WARN: ${totalFailedExtractions} finding ${pluralize(totalFailedExtractions, 'extraction')} failed`);
            }
            if ((totalFailedHunks > 0 || totalFailedExtractions > 0) && this.verbosity < Verbosity.Verbose) {
                this.logPlain('Use -v for failure details');
            }
            if (totalSkippedFiles > 0) {
                this.logPlain(`${totalSkippedFiles} ${pluralize(totalSkippedFiles, 'file')} skipped`);
            }
            if (totalUsage) {
                this.logPlain(`Usage: ${formatUsagePlain(totalUsage, totalAuxiliaryUsage)}`);
            }
            this.logPlain(`Total time: ${formatDuration(totalDuration)}`);
            if (options?.traceId && this.verbosity >= Verbosity.Verbose) {
                this.logPlain(`Trace: ${options.traceId}`);
            }
        }
    }
    /**
     * Display the configuration section with triggers.
     */
    configTriggers(loaded, matched, triggers) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        if (this.mode.isTTY) {
            this.log(chalk.bold('CONFIG') +
                chalk.cyan(`  ${loaded} triggers`) +
                chalk.dim(` · ${matched} matched`));
            // Show matched triggers
            for (const trigger of triggers) {
                this.log(`  ${chalk.green(ICON_CHECK)} ${trigger.name} ${chalk.dim(`(${trigger.skill})`)}`);
            }
            this.log('');
        }
        else {
            this.logPlain(`Config: ${loaded} triggers, ${matched} matched`);
            for (const trigger of triggers) {
                this.logPlain(`  ${trigger.name} (${trigger.skill})`);
            }
        }
    }
    /**
     * Log a step message.
     */
    step(message) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        if (this.mode.isTTY) {
            this.log(`${chalk.cyan(figures.arrowRight)} ${message}`);
        }
        else {
            this.logPlain(message);
        }
    }
    /**
     * Log a success message.
     */
    success(message) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        if (this.mode.isTTY) {
            this.log(`${chalk.green(ICON_CHECK)} ${message}`);
        }
        else {
            this.logPlain(message);
        }
    }
    /**
     * Log a file creation message (green "Created" prefix, no icon).
     */
    created(filename) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        if (this.mode.isTTY) {
            this.log(`${chalk.green('Created')} ${filename}`);
        }
        else {
            this.logPlain(`Created ${filename}`);
        }
    }
    /**
     * Log a skipped file message (yellow "Skipped" prefix with reason).
     */
    skipped(filename, reason) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        const suffix = reason ? chalk.dim(` (${reason})`) : '';
        if (this.mode.isTTY) {
            this.log(`${chalk.yellow('Skipped')} ${filename}${suffix}`);
        }
        else {
            this.logPlain(`Skipped ${filename}${reason ? ` (${reason})` : ''}`);
        }
    }
    /**
     * Log a warning message.
     */
    warning(message) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        if (this.mode.isTTY) {
            this.log(`${chalk.yellow(figures.warning)}  ${message}`);
        }
        else {
            this.logPlain(`WARN: ${message}`);
        }
    }
    /**
     * Log an error message.
     * Errors are always shown, even in quiet mode.
     */
    error(message) {
        if (this.mode.isTTY) {
            console.error(`${chalk.red(figures.cross)} ${message}`);
        }
        else {
            console.error(`[${timestamp()}] warden: ERROR: ${message}`);
        }
    }
    /**
     * Log a debug message.
     */
    debug(message) {
        if (this.verbosity < Verbosity.Debug) {
            return;
        }
        if (this.mode.isTTY) {
            this.log(chalk.dim(`[debug] ${message}`));
        }
        else {
            this.logPlain(`DEBUG: ${message}`);
        }
    }
    /**
     * Log a hint/tip message.
     */
    tip(message) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        if (this.mode.isTTY) {
            this.log(chalk.dim(`Tip: ${message}`));
        }
        // No tips in CI mode
    }
    /**
     * Log dim/subtle text (visible at normal verbosity, hidden in quiet mode).
     */
    dim(message) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        if (this.mode.isTTY) {
            this.log(chalk.dim(message));
        }
        else {
            this.logPlain(message);
        }
    }
    /**
     * Log plain text (no prefix).
     */
    text(message) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        if (this.mode.isTTY) {
            this.log(message);
        }
        else {
            this.logPlain(message);
        }
    }
    /**
     * Log bold text.
     */
    bold(message) {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        if (this.mode.isTTY) {
            this.log(chalk.bold(message));
        }
        else {
            this.logPlain(message);
        }
    }
    /**
     * Output a blank line.
     */
    blank() {
        if (this.verbosity === Verbosity.Quiet) {
            return;
        }
        this.log('');
    }
    /**
     * Render an empty state box (e.g., "No changes found").
     */
    renderEmptyState(message, tip) {
        if (this.verbosity === Verbosity.Quiet) {
            console.log(message);
            return;
        }
        if (this.mode.isTTY) {
            const box = new BoxRenderer({
                title: 'warden',
                mode: this.mode,
            });
            box.header();
            box.blank();
            box.content(`${chalk.yellow(figures.warning)}  ${message}`);
            if (tip) {
                box.blank();
                box.content(chalk.dim(`Tip: ${tip}`));
            }
            box.blank();
            box.footer();
            for (const line of box.render()) {
                this.log(line);
            }
        }
        else {
            this.logPlain(`WARN: ${message}`);
            if (tip) {
                this.logPlain(`Tip: ${tip}`);
            }
        }
    }
}


/***/ }),

/***/ 5836:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   O7: () => (/* binding */ createDefaultCallbacks),
/* harmony export */   UG: () => (/* binding */ runSkillTask)
/* harmony export */ });
/* unused harmony exports composeTasksWithFailFast, runComposedSkillTasks, runSkillTasks */
/* harmony import */ var _sentry_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(30340);
/* harmony import */ var _sdk_errors_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(98229);
/* harmony import */ var _sdk_runner_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(45452);
/* harmony import */ var _sdk_circuit_breaker_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(71794);
/* harmony import */ var _sdk_report_files_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(79418);
/* harmony import */ var chalk__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(39559);
/* harmony import */ var figures__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(58653);
/* harmony import */ var _verbosity_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(21307);
/* harmony import */ var _icons_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(5832);
/* harmony import */ var _tty_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(80029);
/* harmony import */ var _formatters_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(43171);
/* harmony import */ var _utils_index_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(36137);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_sdk_runner_js__WEBPACK_IMPORTED_MODULE_2__]);
_sdk_runner_js__WEBPACK_IMPORTED_MODULE_2__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];
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
    console.error(`[${(0,_tty_js__WEBPACK_IMPORTED_MODULE_7__/* .timestamp */ .vE)()}] warden: ${message}`);
}
/**
 * Write a debug-level message to stderr.
 * Uses chalk.dim formatting in TTY mode, timestamped "DEBUG:" prefix otherwise.
 */
function debugLog(mode, message) {
    if (mode.isTTY) {
        console.error(chalk__WEBPACK_IMPORTED_MODULE_8__/* ["default"] */ .Ay.dim(`[debug] ${message}`));
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
    return (0,_formatters_js__WEBPACK_IMPORTED_MODULE_5__/* .formatLocation */ .j$)(finding.location.path, finding.location.startLine, finding.location.endLine);
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
    return _sentry_js__WEBPACK_IMPORTED_MODULE_0__/* .Sentry.startSpan */ .sQ.startSpan({ op: 'skill.run', name: `run ${displayName}` }, async (span) => {
        span.setAttribute('gen_ai.agent.name', displayName);
        if (triggerName) {
            span.setAttribute('warden.trigger.name', triggerName);
        }
        const files = context.pullRequest?.files ?? [];
        span.setAttribute('warden.file.count', files.length);
        _sentry_js__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .vF.info(_sentry_js__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .vF.fmt `Skill execution started: ${displayName}`, {
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
                if (err instanceof _sdk_errors_js__WEBPACK_IMPORTED_MODULE_1__/* .WardenAuthenticationError */ .Aq)
                    throw err;
                const message = err instanceof Error ? err.message : String(err);
                throw new _sdk_errors_js__WEBPACK_IMPORTED_MODULE_1__/* .SkillRunnerError */ .cy(message, { cause: err, code: 'skill_resolution_failed' });
            }
            // Prepare files (parse patches into hunks)
            const { files: preparedFiles, skippedFiles } = (0,_sdk_runner_js__WEBPACK_IMPORTED_MODULE_2__/* .prepareFiles */ .t9)(context, {
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
                const result = await (0,_sdk_runner_js__WEBPACK_IMPORTED_MODULE_2__/* .analyzeFile */ .xy)(skill, prepared, context.repoPath, runnerOptions, fileCallbacks, prContext);
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
            const allResults = await (0,_utils_index_js__WEBPACK_IMPORTED_MODULE_6__/* .runPool */ .kD)(preparedFiles, fileConcurrency, async (file, index) => {
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
                const auxUsage = (0,_sdk_runner_js__WEBPACK_IMPORTED_MODULE_2__/* .aggregateAuxiliaryUsage */ .RL)(allAuxEntries);
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
                    usage: (0,_sdk_runner_js__WEBPACK_IMPORTED_MODULE_2__/* .aggregateUsage */ .Z$)(allUsage),
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
                const runnerError = new _sdk_errors_js__WEBPACK_IMPORTED_MODULE_1__/* .SkillRunnerError */ .cy(error.message, { code: error.code });
                return { name, report: errorReport, error: runnerError, failOn, minConfidence };
            }
            const processed = await (0,_sdk_runner_js__WEBPACK_IMPORTED_MODULE_2__/* .postProcessFindings */ .yp)(allFindings, {
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
                summary: (0,_sdk_runner_js__WEBPACK_IMPORTED_MODULE_2__/* .generateSummary */ .ur)(skill.name, finalFindings),
                findings: finalFindings,
                usage: (0,_sdk_runner_js__WEBPACK_IMPORTED_MODULE_2__/* .aggregateUsage */ .Z$)(allUsage),
                durationMs: duration,
                model: runnerOptions?.model,
                runtime,
                files: (0,_sdk_report_files_js__WEBPACK_IMPORTED_MODULE_9__/* .buildFileReports */ .K)(preparedFiles.map((file, i) => {
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
            const auxUsage = (0,_sdk_runner_js__WEBPACK_IMPORTED_MODULE_2__/* .aggregateAuxiliaryUsage */ .RL)(allAuxEntries);
            if (auxUsage) {
                report.auxiliaryUsage = auxUsage;
            }
            span.setAttribute('warden.finding.count', report.findings.length);
            // Emit metrics and log completion
            (0,_sentry_js__WEBPACK_IMPORTED_MODULE_0__/* .emitSkillMetrics */ .s7)(report);
            _sentry_js__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .vF.info(_sentry_js__WEBPACK_IMPORTED_MODULE_0__/* .logger */ .vF.fmt `Skill execution complete: ${displayName}`, {
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
            const { code, message } = (0,_sdk_errors_js__WEBPACK_IMPORTED_MODULE_1__/* .classifyError */ .fe)(err);
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
            if (verbosity === _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Quiet)
                return;
            if (!mode.isTTY) {
                const fileCount = skill.files.length;
                logPlain(`Running ${displayNameFor(skill.name)} (${fileCount} ${(0,_formatters_js__WEBPACK_IMPORTED_MODULE_5__/* .pluralize */ .td)(fileCount, 'file')})...`);
            }
        },
        onSkillUpdate: () => { },
        onFileUpdate: (_skillName, filename, updates) => {
            if (updates.status === 'skipped') {
                skippedCounts.set(_skillName, (skippedCounts.get(_skillName) ?? 0) + 1);
                return;
            }
            if (verbosity === _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Quiet || mode.isTTY)
                return;
            if (updates.status !== 'done')
                return;
            const duration = updates.durationMs !== undefined ? (0,_formatters_js__WEBPACK_IMPORTED_MODULE_5__/* .formatDuration */ .a3)(updates.durationMs) : '?';
            const cost = updates.usage ? ` ${(0,_formatters_js__WEBPACK_IMPORTED_MODULE_5__/* .formatCost */ .BD)(updates.usage.costUSD)}` : '';
            const n = updates.findings?.length ?? 0;
            const suffix = n > 0 ? ` ${n} ${(0,_formatters_js__WEBPACK_IMPORTED_MODULE_5__/* .pluralize */ .td)(n, 'finding')}` : '';
            logPlain(`  ${displayNameFor(_skillName)} > ${filename} done ${duration}${cost}${suffix}`);
        },
        onHunkStart: (skillName, filename, hunkNum, totalHunks, lineRange) => {
            if (verbosity === _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Quiet || mode.isTTY)
                return;
            logPlain(`  ${displayNameFor(skillName)} > ${filename} [${hunkNum}/${totalHunks}] ${lineRange}`);
        },
        onSkillComplete: (name, report) => {
            if (verbosity === _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Quiet)
                return;
            if (skippedSkills.has(name))
                return;
            const displayName = displayNameFor(name);
            // Errored runs render as failures, not as misleading "completed -
            // 0 findings" lines with a green checkmark. onSkillError already
            // printed the error message; this line carries timing only.
            if (report.error) {
                if (mode.isTTY) {
                    const duration = report.durationMs !== undefined ? ` ${chalk__WEBPACK_IMPORTED_MODULE_8__/* ["default"] */ .Ay.dim(`[${(0,_formatters_js__WEBPACK_IMPORTED_MODULE_5__/* .formatDuration */ .a3)(report.durationMs)}]`)}` : '';
                    console.error(`${chalk__WEBPACK_IMPORTED_MODULE_8__/* ["default"] */ .Ay.red('✗')} ${displayName}${duration} ${chalk__WEBPACK_IMPORTED_MODULE_8__/* ["default"] */ .Ay.red(`(${report.error.code})`)}`);
                }
                else {
                    const duration = report.durationMs !== undefined ? (0,_formatters_js__WEBPACK_IMPORTED_MODULE_5__/* .formatDuration */ .a3)(report.durationMs) : '?';
                    logPlain(`${displayName} failed in ${duration} (${report.error.code})`);
                }
                return;
            }
            if (mode.isTTY) {
                const duration = report.durationMs !== undefined ? ` ${chalk__WEBPACK_IMPORTED_MODULE_8__/* ["default"] */ .Ay.dim(`[${(0,_formatters_js__WEBPACK_IMPORTED_MODULE_5__/* .formatDuration */ .a3)(report.durationMs)}]`)}` : '';
                console.error(`${chalk__WEBPACK_IMPORTED_MODULE_8__/* ["default"] */ .Ay.green(_icons_js__WEBPACK_IMPORTED_MODULE_10__/* .ICON_CHECK */ .hP)} ${displayName}${duration}`);
                // Debug: log finding details
                if (verbosity >= _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Debug && report.findings.length > 0) {
                    for (const finding of report.findings) {
                        debugLog(mode, `${(0,_formatters_js__WEBPACK_IMPORTED_MODULE_5__/* .formatSeverityPlain */ .xz)(finding.severity)} ${findingLocation(finding)}: ${finding.title}`);
                        if (finding.suggestedFix) {
                            debugLog(mode, `  fix: ${finding.suggestedFix.description}`);
                        }
                    }
                }
            }
            else {
                // Log mode: timestamped completion with duration and finding summary
                const duration = report.durationMs !== undefined ? (0,_formatters_js__WEBPACK_IMPORTED_MODULE_5__/* .formatDuration */ .a3)(report.durationMs) : '?';
                const counts = (0,_formatters_js__WEBPACK_IMPORTED_MODULE_5__/* .countBySeverity */ .Ot)(report.findings);
                const summary = (0,_formatters_js__WEBPACK_IMPORTED_MODULE_5__/* .formatFindingCountsPlain */ .Xr)(counts);
                logPlain(`${displayName} completed in ${duration} - ${summary}`);
                // Show per-finding lines at Verbose+ verbosity in log mode
                // (the final report already shows findings with full detail)
                if (verbosity >= _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Verbose) {
                    for (const finding of report.findings) {
                        logPlain(`  ${(0,_formatters_js__WEBPACK_IMPORTED_MODULE_5__/* .formatSeverityPlain */ .xz)(finding.severity)} ${findingLocation(finding)}: ${finding.title}`);
                        if (verbosity >= _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Debug && finding.suggestedFix) {
                            logPlain(`    fix: ${finding.suggestedFix.description}`);
                        }
                    }
                }
                const skipped = skippedCounts.get(name) ?? 0;
                if (skipped > 0) {
                    logPlain(`  ${skipped} ${(0,_formatters_js__WEBPACK_IMPORTED_MODULE_5__/* .pluralize */ .td)(skipped, 'file')} skipped`);
                }
            }
        },
        onSkillSkipped: (name) => {
            skippedSkills.add(name);
            if (verbosity === _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Quiet)
                return;
            const displayName = displayNameFor(name);
            if (mode.isTTY) {
                console.error(`${chalk__WEBPACK_IMPORTED_MODULE_8__/* ["default"] */ .Ay.yellow(_icons_js__WEBPACK_IMPORTED_MODULE_10__/* .ICON_SKIPPED */ .xj)} ${displayName} ${chalk__WEBPACK_IMPORTED_MODULE_8__/* ["default"] */ .Ay.dim('[skipped]')}`);
            }
            else {
                logPlain(`${displayName} skipped`);
            }
        },
        onSkillError: (name, error) => {
            if (verbosity === _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Quiet)
                return;
            const displayName = displayNameFor(name);
            if (mode.isTTY) {
                console.error(`${chalk__WEBPACK_IMPORTED_MODULE_8__/* ["default"] */ .Ay.red('\u2717')} ${displayName} - ${chalk__WEBPACK_IMPORTED_MODULE_8__/* ["default"] */ .Ay.red(error)}`);
            }
            else {
                logPlain(`ERROR: ${displayName} - ${error}`);
                const skipped = skippedCounts.get(name) ?? 0;
                if (skipped > 0) {
                    logPlain(`  ${skipped} ${(0,_formatters_js__WEBPACK_IMPORTED_MODULE_5__/* .pluralize */ .td)(skipped, 'file')} skipped`);
                }
            }
        },
        // Warn about large prompts (always shown unless quiet)
        onLargePrompt: (_skillName, filename, lineRange, chars, estimatedTokens) => {
            if (verbosity === _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Quiet)
                return;
            const location = `${filename}:${lineRange}`;
            const size = `${Math.round(chars / 1000)}k chars (~${Math.round(estimatedTokens / 1000)}k tokens)`;
            if (mode.isTTY) {
                console.error(`${chalk__WEBPACK_IMPORTED_MODULE_8__/* ["default"] */ .Ay.yellow(figures__WEBPACK_IMPORTED_MODULE_11__/* ["default"] */ .Ay.warning)}  Large prompt for ${location}: ${size}`);
            }
            else {
                logPlain(`WARN: Large prompt for ${location}: ${size}`);
            }
        },
        // Debug mode: show prompt sizes
        onPromptSize: verbosity >= _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Debug
            ? (_skillName, filename, lineRange, systemChars, userChars, totalChars, estimatedTokens) => {
                const location = `${filename}:${lineRange}`;
                debugLog(mode, `Prompt for ${location}: system=${systemChars}, user=${userChars}, total=${totalChars} chars (~${estimatedTokens} tokens)`);
            }
            : undefined,
        // Debug mode: show extraction results
        onExtractionResult: verbosity >= _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Debug
            ? (_skillName, filename, lineRange, findingsCount, method) => {
                debugLog(mode, `Extracted ${findingsCount} ${(0,_formatters_js__WEBPACK_IMPORTED_MODULE_5__/* .pluralize */ .td)(findingsCount, 'finding')} from ${filename}:${lineRange} via ${method}`);
            }
            : undefined,
        onFindingProcessing: verbosity >= _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Debug
            ? (_skillName, event) => {
                debugLog(mode, formatFindingProcessingEvent(event));
            }
            : undefined,
        // Verbose mode: show per-hunk analysis failures (spec: event #16 hunk_failed)
        onHunkFailed: verbosity >= _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Verbose
            ? (_skillName, filename, lineRange, error) => {
                const location = `${filename}:${lineRange}`;
                if (mode.isTTY) {
                    console.error(`${chalk__WEBPACK_IMPORTED_MODULE_8__/* ["default"] */ .Ay.yellow(figures__WEBPACK_IMPORTED_MODULE_11__/* ["default"] */ .Ay.warning)}  Chunk failed: ${location} ${chalk__WEBPACK_IMPORTED_MODULE_8__/* ["default"] */ .Ay.dim(`\u2014 ${error}`)}`);
                }
                else {
                    logPlain(`WARN: Chunk failed: ${location} \u2014 ${error}`);
                }
            }
            : undefined,
        // Verbose mode: show per-hunk extraction failures (spec: event #17 extraction_failure)
        onExtractionFailure: verbosity >= _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Verbose
            ? (_skillName, filename, lineRange, error, preview) => {
                const location = `${filename}:${lineRange}`;
                if (mode.isTTY) {
                    console.error(`${chalk__WEBPACK_IMPORTED_MODULE_8__/* ["default"] */ .Ay.yellow(figures__WEBPACK_IMPORTED_MODULE_11__/* ["default"] */ .Ay.warning)}  Extraction failed: ${location} ${chalk__WEBPACK_IMPORTED_MODULE_8__/* ["default"] */ .Ay.dim(`\u2014 ${error}`)}`);
                    if (verbosity >= _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Debug && preview) {
                        debugLog(mode, `  Output preview: ${preview.slice(0, 200)}`);
                    }
                }
                else {
                    logPlain(`WARN: Extraction failed: ${location} \u2014 ${error}`);
                    if (verbosity >= _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Debug && preview) {
                        logPlain(`DEBUG: Output preview: ${preview.slice(0, 200)}`);
                    }
                }
            }
            : undefined,
        // Verbose mode: show retry attempts (spec: event #18 retry)
        onRetry: verbosity >= _verbosity_js__WEBPACK_IMPORTED_MODULE_4__/* .Verbosity */ .W.Verbose
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
/**
 * Share abort/circuit state across task runner options.
 */
function composeTasksWithFailFast(tasks, failFastController, circuitBreaker, circuitAbortController) {
    if (!failFastController && !circuitBreaker && !circuitAbortController)
        return tasks;
    const sharedAbortController = new AbortController();
    const taskControllers = new Set();
    const composedTaskControllers = new WeakMap();
    const abortAll = () => {
        sharedAbortController.abort();
        for (const controller of taskControllers) {
            controller.abort();
        }
    };
    for (const source of [failFastController, circuitAbortController]) {
        if (!source)
            continue;
        if (source.signal.aborted) {
            abortAll();
        }
        else {
            source.signal.addEventListener('abort', abortAll, { once: true });
        }
    }
    const composeAbortController = (taskController) => {
        if (!taskController)
            return sharedAbortController;
        const cached = composedTaskControllers.get(taskController);
        if (cached)
            return cached;
        const composed = new AbortController();
        composedTaskControllers.set(taskController, composed);
        taskControllers.add(composed);
        const abortTask = () => composed.abort();
        if (sharedAbortController.signal.aborted || taskController.signal.aborted) {
            abortTask();
        }
        else {
            taskController.signal.addEventListener('abort', abortTask, { once: true });
        }
        return composed;
    };
    return tasks.map((task) => ({
        ...task,
        runnerOptions: {
            ...task.runnerOptions,
            abortController: composeAbortController(task.runnerOptions?.abortController),
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

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 80029:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   T6: () => (/* binding */ warnAction),
/* harmony export */   d5: () => (/* binding */ logAction),
/* harmony export */   vE: () => (/* binding */ timestamp)
/* harmony export */ });
/* unused harmony export detectOutputMode */

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


/***/ }),

/***/ 21307:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   W: () => (/* binding */ Verbosity)
/* harmony export */ });
/* unused harmony export parseVerbosity */
/**
 * Verbosity levels for CLI output.
 */
var Verbosity;
(function (Verbosity) {
    /** Errors + final summary only */
    Verbosity[Verbosity["Quiet"] = 0] = "Quiet";
    /** Normal output with progress */
    Verbosity[Verbosity["Normal"] = 1] = "Normal";
    /** Real-time findings, hunk details */
    Verbosity[Verbosity["Verbose"] = 2] = "Verbose";
    /** Token counts, latencies, debug info */
    Verbosity[Verbosity["Debug"] = 3] = "Debug";
})(Verbosity || (Verbosity = {}));
/**
 * Parse verbosity from CLI flags.
 * @param quiet - If true, return Quiet
 * @param verboseCount - Number of -v flags (0, 1, or 2+)
 * @param debug - If true, return Debug (overrides verbose count)
 */
function parseVerbosity(quiet, verboseCount, debug) {
    if (quiet) {
        return Verbosity.Quiet;
    }
    if (debug || verboseCount >= 2) {
        return Verbosity.Debug;
    }
    if (verboseCount === 1) {
        return Verbosity.Verbose;
    }
    return Verbosity.Normal;
}


/***/ }),

/***/ 60866:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  tx: () => (/* binding */ ConfigLoadError),
  hd: () => (/* binding */ buildSkillRootsByName),
  Zu: () => (/* binding */ emptyToUndefined),
  M3: () => (/* binding */ loadLayeredWardenConfig),
  Ln: () => (/* binding */ resolveLayeredSkillConfigs)
});

// UNUSED EXPORTS: loadWardenConfig, loadWardenConfigFile, mergeWardenConfigs, resolveSkillConfigs

// EXTERNAL MODULE: external "node:fs"
var external_node_fs_ = __webpack_require__(73024);
// EXTERNAL MODULE: external "node:path"
var external_node_path_ = __webpack_require__(76760);
// EXTERNAL MODULE: ../../node_modules/.pnpm/smol-toml@1.6.1/node_modules/smol-toml/dist/index.js + 8 modules
var dist = __webpack_require__(46394);
// EXTERNAL MODULE: ./src/sentry.ts
var sentry = __webpack_require__(30340);
// EXTERNAL MODULE: ./src/skills/loader.ts
var loader = __webpack_require__(34691);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/schemas.js + 2 modules
var schemas = __webpack_require__(53391);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/compat.js
var compat = __webpack_require__(44657);
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

const RuntimeNameSchema = schemas/* enum */.k5(['claude', 'pi']);

// EXTERNAL MODULE: ./src/types/index.ts
var types = __webpack_require__(78481);
;// CONCATENATED MODULE: ./src/config/schema.ts



// Tool names that can be allowed/denied
const ToolNameSchema = schemas/* enum */.k5([
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
const ToolConfigSchema = schemas/* object */.Ik({
    allowed: schemas/* array */.YO(ToolNameSchema).optional(),
    denied: schemas/* array */.YO(ToolNameSchema).optional(),
});
// Skill definition
const SkillDefinitionSchema = schemas/* object */.Ik({
    name: schemas/* string */.Yj().min(1),
    description: schemas/* string */.Yj(),
    prompt: schemas/* string */.Yj(),
    tools: ToolConfigSchema.optional(),
    /** Directory where the skill was loaded from, for resolving resources (scripts/, references/, assets/) */
    rootDir: schemas/* string */.Yj().optional(),
});
// Schedule-specific configuration
const ScheduleConfigSchema = schemas/* object */.Ik({
    /** Title for the tracking issue (default: "Warden: {skillName}") */
    issueTitle: schemas/* string */.Yj().optional(),
    /** Create PR with fixes when suggestedFix is available */
    createFixPR: schemas/* boolean */.zM().default(false),
    /** Branch prefix for fix PRs (default: "warden-fix") */
    fixBranchPrefix: schemas/* string */.Yj().default('warden-fix'),
});
// Trigger type: where the trigger runs
const TriggerTypeSchema = schemas/* enum */.k5(['pull_request', 'local', 'schedule']);

const ReasoningEffortSchema = schemas/* enum */.k5(['off', 'low', 'medium', 'high', 'xhigh']);
const AgentRuntimeConfigSchema = schemas/* object */.Ik({
    /** Model for repo-aware skill execution. Overrides legacy defaults.model. */
    model: schemas/* string */.Yj().optional(),
    /** Maximum agentic turns for repo-aware skill execution. Overrides legacy defaults.maxTurns. */
    maxTurns: schemas/* number */.ai().int().positive().optional(),
    /** Reasoning effort to use for repo-aware skill execution. Uses runtime default when omitted. */
    reasoningEffort: ReasoningEffortSchema.optional(),
}).strict();
const AuxiliaryRuntimeConfigSchema = schemas/* object */.Ik({
    /** Model for auxiliary structured model calls. Uses runtime default if omitted. */
    model: schemas/* string */.Yj().optional(),
    /** Max retries for auxiliary structured model calls. Overrides legacy auxiliaryMaxRetries. */
    maxRetries: schemas/* number */.ai().int().positive().optional(),
}).strict();
const SynthesisRuntimeConfigSchema = schemas/* object */.Ik({
    /** Model for post-analysis synthesis/consolidation. Falls back to auxiliary.model if omitted. */
    model: schemas/* string */.Yj().optional(),
}).strict();
const VerificationConfigSchema = schemas/* object */.Ik({
    /** Verify candidate findings in a second read-only pass. Defaults to true. */
    enabled: schemas/* boolean */.zM().optional(),
}).strict();
// Skill trigger definition (nested under [[skills.triggers]])
const SkillTriggerSchema = schemas/* object */.Ik({
    /** Trigger type: pull_request (GitHub), local (CLI), or schedule (cron) */
    type: TriggerTypeSchema,
    /** Actions to trigger on (only for pull_request type) */
    actions: schemas/* array */.YO(schemas/* string */.Yj()).min(1).optional(),
    /** Match pull_request triggers by draft state. Set false to run only on non-draft PRs. */
    draft: schemas/* boolean */.zM().optional(),
    /** Match pull_request triggers when any listed label is present. */
    labels: schemas/* array */.YO(schemas/* string */.Yj()).min(1).optional(),
    // Per-trigger overrides (flattened output fields)
    failOn: types/* SeverityThresholdSchema */.q$.optional(),
    reportOn: types/* SeverityThresholdSchema */.q$.optional(),
    maxFindings: schemas/* number */.ai().int().positive().optional(),
    reportOnSuccess: schemas/* boolean */.zM().optional(),
    /** Use REQUEST_CHANGES review event when findings exceed failOn */
    requestChanges: schemas/* boolean */.zM().optional(),
    /** Fail the check run when findings exceed failOn */
    failCheck: schemas/* boolean */.zM().optional(),
    model: schemas/* string */.Yj().optional(),
    maxTurns: schemas/* number */.ai().int().positive().optional(),
    /** Minimum confidence level for findings. Findings below this are filtered from output. */
    minConfidence: types/* ConfidenceThresholdSchema */.HA.optional(),
    /** Schedule-specific configuration. Only used when type is 'schedule'. */
    schedule: ScheduleConfigSchema.optional(),
}).superRefine((data, ctx) => {
    if (data.type === 'pull_request' && (!data.actions || data.actions.length === 0)) {
        ctx.addIssue({
            code: compat/* ZodIssueCode */.eq.custom,
            message: "actions is required for pull_request triggers",
            path: ["actions"],
        });
    }
    if (data.type !== 'pull_request' && data.labels) {
        ctx.addIssue({
            code: compat/* ZodIssueCode */.eq.custom,
            message: "labels is only supported for pull_request triggers",
            path: ["labels"],
        });
    }
});
// Skill configuration (top-level [[skills]])
const SkillConfigSchema = schemas/* object */.Ik({
    name: schemas/* string */.Yj().min(1),
    /** Path patterns to include */
    paths: schemas/* array */.YO(schemas/* string */.Yj()).optional(),
    /** Path patterns to exclude */
    ignorePaths: schemas/* array */.YO(schemas/* string */.Yj()).optional(),
    /** Remote repository reference for the skill (e.g., "owner/repo" or "owner/repo@sha") */
    remote: schemas/* string */.Yj().optional(),
    // Flattened output fields (skill-level defaults)
    failOn: types/* SeverityThresholdSchema */.q$.optional(),
    reportOn: types/* SeverityThresholdSchema */.q$.optional(),
    maxFindings: schemas/* number */.ai().int().positive().optional(),
    reportOnSuccess: schemas/* boolean */.zM().optional(),
    /** Use REQUEST_CHANGES review event when findings exceed failOn */
    requestChanges: schemas/* boolean */.zM().optional(),
    /** Fail the check run when findings exceed failOn */
    failCheck: schemas/* boolean */.zM().optional(),
    /** Model to use for this skill (e.g., 'openai/gpt-5.5'). Uses SDK default if not specified. */
    model: schemas/* string */.Yj().optional(),
    /** Maximum agentic turns (API round-trips) per hunk analysis. Overrides defaults.maxTurns. */
    maxTurns: schemas/* number */.ai().int().positive().optional(),
    /** Minimum confidence level for findings. Findings below this are filtered from output. */
    minConfidence: types/* ConfidenceThresholdSchema */.HA.optional(),
    /** Triggers defining when/where this skill runs. Omit to run everywhere (wildcard). */
    triggers: schemas/* array */.YO(SkillTriggerSchema).optional(),
});
// Runner configuration
const RunnerConfigSchema = schemas/* object */.Ik({
    /** Max concurrent file analyses across all skills (default: 4) */
    concurrency: schemas/* number */.ai().int().positive().optional(),
});
// File pattern for chunking configuration
const FilePatternSchema = schemas/* object */.Ik({
    /** Glob pattern to match files (e.g., "**\/pnpm-lock.yaml") */
    pattern: schemas/* string */.Yj(),
    /** How to handle matching files: 'per-hunk' (default), 'whole-file', or 'skip' */
    mode: schemas/* enum */.k5(['per-hunk', 'whole-file', 'skip']).default('skip'),
});
// Coalescing configuration for merging nearby hunks
const CoalesceConfigSchema = schemas/* object */.Ik({
    /** Enable hunk coalescing (default: true) */
    enabled: schemas/* boolean */.zM().default(true),
    /** Max lines gap between hunks to merge (default: 30) */
    maxGapLines: schemas/* number */.ai().int().nonnegative().default(30),
    /** Target max size per chunk in characters (default: 8000) */
    maxChunkSize: schemas/* number */.ai().int().positive().default(8000),
});
// Chunking configuration for controlling how files are processed
const ChunkingConfigSchema = schemas/* object */.Ik({
    /** Patterns to control file processing mode */
    filePatterns: schemas/* array */.YO(FilePatternSchema).optional(),
    /** Coalescing options for merging nearby hunks */
    coalesce: CoalesceConfigSchema.optional(),
    /** Max number of "other files" to list in hunk prompts for PR context. 0 disables the section entirely. Default: 50 */
    maxContextFiles: schemas/* number */.ai().int().nonnegative().default(50),
});
// Default configuration that skills inherit from
const DefaultsSchema = schemas/* object */.Ik({
    /** Fail the build when findings meet this severity */
    failOn: types/* SeverityThresholdSchema */.q$.optional(),
    /** Only report findings at or above this severity */
    reportOn: types/* SeverityThresholdSchema */.q$.optional(),
    maxFindings: schemas/* number */.ai().int().positive().optional(),
    /** Report even when there are no findings (default: false) */
    reportOnSuccess: schemas/* boolean */.zM().optional(),
    /** Use REQUEST_CHANGES review event when findings exceed failOn. Default: false */
    requestChanges: schemas/* boolean */.zM().optional(),
    /** Fail the check run when findings exceed failOn. Default: false */
    failCheck: schemas/* boolean */.zM().optional(),
    /** Default model for all skills (e.g., 'openai/gpt-5.5') */
    model: schemas/* string */.Yj().optional(),
    /** Maximum agentic turns (API round-trips) per hunk analysis. Default: 50 */
    maxTurns: schemas/* number */.ai().int().positive().optional(),
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
    ignorePaths: schemas/* array */.YO(schemas/* string */.Yj()).optional(),
    /** Default branch for the repository (e.g., 'main', 'master', 'develop'). Auto-detected if not specified. */
    defaultBranch: schemas/* string */.Yj().optional(),
    /** Chunking configuration for controlling how files are processed */
    chunking: ChunkingConfigSchema.optional(),
    /** Delay in milliseconds between batch starts when processing files in parallel. Default: 0 */
    batchDelayMs: schemas/* number */.ai().int().nonnegative().optional(),
    /** Max retries for auxiliary structured model calls (extraction repair, merging, dedup, fix evaluation). Default: 5 */
    auxiliaryMaxRetries: schemas/* number */.ai().int().positive().optional(),
});
// Log cleanup mode
const LogCleanupModeSchema = schemas/* enum */.k5(['ask', 'auto', 'never']);
// Logs configuration
const LogsConfigSchema = schemas/* object */.Ik({
    /** How to handle expired log files: 'ask' (default, prompt in TTY), 'auto' (silently delete), 'never' (keep all) */
    cleanup: LogCleanupModeSchema.default('ask'),
    /** Number of days to retain log files before considering them expired. Default: 30 */
    retentionDays: schemas/* number */.ai().int().positive().default(30),
});
// Main warden.toml configuration
const WardenConfigSchema = schemas/* object */.Ik({
    version: schemas/* literal */.eu(1),
    defaults: DefaultsSchema.optional(),
    skills: schemas/* array */.YO(SkillConfigSchema).default([]),
    runner: RunnerConfigSchema.optional(),
    logs: LogsConfigSchema.optional(),
})
    .superRefine((config, ctx) => {
    const names = config.skills.map((s) => s.name);
    const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
    if (duplicates.length > 0) {
        ctx.addIssue({
            code: compat/* ZodIssueCode */.eq.custom,
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
                        code: compat/* ZodIssueCode */.eq.custom,
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
        const reasoningEffort = defaults?.agent?.reasoningEffort;
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
                reasoningEffort,
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
                    draft: trigger.draft,
                    labels: trigger.labels,
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
                    reasoningEffort,
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


/***/ }),

/***/ 63779:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   s: () => (/* binding */ applyDiffToContent)
/* harmony export */ });
/* harmony import */ var _parser_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(61100);

/**
 * Apply a unified diff to file content.
 * Returns the modified content.
 */
function applyDiffToContent(content, diff) {
    const hunks = (0,_parser_js__WEBPACK_IMPORTED_MODULE_0__/* .parsePatch */ .iz)(diff);
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


/***/ }),

/***/ 66325:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  TX: () => (/* reexport */ classifyFile),
  x$: () => (/* reexport */ coalesceHunks),
  ZC: () => (/* reexport */ expandDiffContext),
  xP: () => (/* reexport */ formatHunkForAnalysis),
  sK: () => (/* reexport */ parser/* getHunkLineRange */.sK),
  jx: () => (/* reexport */ parser/* parseFileDiff */.jx),
  PQ: () => (/* reexport */ splitLargeHunks)
});

// UNUSED EXPORTS: BUILTIN_SKIP_PATTERNS, DEFAULT_MAX_CHUNK_SIZE, DEFAULT_MAX_GAP_LINES, applyDiffToContent, clearFileCache, expandHunkContext, getExpandedLineRange, parsePatch, shouldSkipFile, wouldCoalesceReduce

// EXTERNAL MODULE: ./src/diff/parser.ts
var parser = __webpack_require__(61100);
// EXTERNAL MODULE: external "node:child_process"
var external_node_child_process_ = __webpack_require__(31421);
// EXTERNAL MODULE: external "node:fs"
var external_node_fs_ = __webpack_require__(73024);
// EXTERNAL MODULE: external "node:path"
var external_node_path_ = __webpack_require__(76760);
// EXTERNAL MODULE: ./src/utils/exec.ts
var exec = __webpack_require__(82224);
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
    const expandedRange = (0,parser/* getExpandedLineRange */.NA)(hunk, contextLines);
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

// EXTERNAL MODULE: ./src/triggers/matcher.ts
var matcher = __webpack_require__(49431);
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
        if ((0,matcher/* matchGlob */.sB)(pattern, filename)) {
            return mode;
        }
    }
    // Check built-in skip patterns
    for (const pattern of BUILTIN_SKIP_PATTERNS) {
        if ((0,matcher/* matchGlob */.sB)(pattern, filename)) {
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







/***/ }),

/***/ 61100:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NA: () => (/* binding */ getExpandedLineRange),
/* harmony export */   iz: () => (/* binding */ parsePatch),
/* harmony export */   jx: () => (/* binding */ parseFileDiff),
/* harmony export */   sK: () => (/* binding */ getHunkLineRange)
/* harmony export */ });
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


/***/ }),

/***/ 58147:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   e: () => (/* binding */ buildEventContext)
/* harmony export */ });
/* unused harmony export EventContextError */
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(53391);
/* harmony import */ var _types_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(78481);


// GitHub Action event payload schemas
const GitHubUserSchema = zod__WEBPACK_IMPORTED_MODULE_1__/* .object */ .Ik({
    login: zod__WEBPACK_IMPORTED_MODULE_1__/* .string */ .Yj(),
});
const GitHubLabelSchema = zod__WEBPACK_IMPORTED_MODULE_1__/* .object */ .Ik({
    name: zod__WEBPACK_IMPORTED_MODULE_1__/* .string */ .Yj(),
});
const GitHubRepoSchema = zod__WEBPACK_IMPORTED_MODULE_1__/* .object */ .Ik({
    name: zod__WEBPACK_IMPORTED_MODULE_1__/* .string */ .Yj(),
    full_name: zod__WEBPACK_IMPORTED_MODULE_1__/* .string */ .Yj(),
    default_branch: zod__WEBPACK_IMPORTED_MODULE_1__/* .string */ .Yj(),
    owner: GitHubUserSchema,
});
const GitHubPullRequestSchema = zod__WEBPACK_IMPORTED_MODULE_1__/* .object */ .Ik({
    number: zod__WEBPACK_IMPORTED_MODULE_1__/* .number */ .ai(),
    title: zod__WEBPACK_IMPORTED_MODULE_1__/* .string */ .Yj(),
    body: zod__WEBPACK_IMPORTED_MODULE_1__/* .string */ .Yj().nullable(),
    draft: zod__WEBPACK_IMPORTED_MODULE_1__/* .boolean */ .zM().optional(),
    labels: zod__WEBPACK_IMPORTED_MODULE_1__/* .array */ .YO(GitHubLabelSchema).optional(),
    user: GitHubUserSchema,
    base: zod__WEBPACK_IMPORTED_MODULE_1__/* .object */ .Ik({
        ref: zod__WEBPACK_IMPORTED_MODULE_1__/* .string */ .Yj(),
        sha: zod__WEBPACK_IMPORTED_MODULE_1__/* .string */ .Yj(),
    }),
    head: zod__WEBPACK_IMPORTED_MODULE_1__/* .object */ .Ik({
        ref: zod__WEBPACK_IMPORTED_MODULE_1__/* .string */ .Yj(),
        sha: zod__WEBPACK_IMPORTED_MODULE_1__/* .string */ .Yj(),
    }),
});
const GitHubEventPayloadSchema = zod__WEBPACK_IMPORTED_MODULE_1__/* .object */ .Ik({
    action: zod__WEBPACK_IMPORTED_MODULE_1__/* .string */ .Yj(),
    label: GitHubLabelSchema.optional(),
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
            draft: pr.draft ?? false,
            labels: pr.labels?.map((label) => label.name) ?? [],
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
        label: payload.label?.name,
        repository,
        pullRequest,
        diffContextSource: { type: 'working-tree' },
        repoPath,
    };
    // Validate the final context
    const result = _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .EventContextSchema */ .hA.safeParse(context);
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


/***/ }),

/***/ 65997:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   J: () => (/* binding */ buildScheduleEventContext)
/* harmony export */ });
/* unused harmony export filterFilesByPatterns */
/* harmony import */ var _cli_files_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(20453);
/* harmony import */ var _triggers_matcher_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(49431);


/**
 * Build an EventContext for scheduled runs.
 *
 * Creates a synthetic pullRequest context from file globs using real repo info.
 * The runner processes this normally because the files have patch data.
 */
async function buildScheduleEventContext(options) {
    const { patterns, ignorePatterns, repoPath, owner, name, defaultBranch, headSha, } = options;
    // Expand glob patterns and create FileChange objects with full content as patch
    let fileChanges = await (0,_cli_files_js__WEBPACK_IMPORTED_MODULE_0__/* .expandAndCreateFileChanges */ .Rq)(patterns, repoPath);
    // Filter out ignored patterns
    if (ignorePatterns && ignorePatterns.length > 0) {
        fileChanges = fileChanges.filter((file) => {
            const isIgnored = ignorePatterns.some((pattern) => (0,_triggers_matcher_js__WEBPACK_IMPORTED_MODULE_1__/* .matchGlob */ .sB)(pattern, file.filename));
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


/***/ }),

/***/ 3941:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   EF: () => (/* binding */ generateMarker),
/* harmony export */   G$: () => (/* binding */ processDuplicateActions),
/* harmony export */   LQ: () => (/* binding */ generateContentHash),
/* harmony export */   Op: () => (/* binding */ generateFindingMetadata),
/* harmony export */   Xi: () => (/* binding */ findingToExistingComment),
/* harmony export */   aw: () => (/* binding */ consolidateBatchFindings),
/* harmony export */   dh: () => (/* binding */ parseWardenSkills),
/* harmony export */   kX: () => (/* binding */ fetchExistingComments),
/* harmony export */   rW: () => (/* binding */ parseWardenFindingId),
/* harmony export */   v9: () => (/* binding */ deduplicateFindings)
/* harmony export */ });
/* unused harmony exports parseMarker, parseWardenFindingMetadata, parseWardenComment, isWardenComment, updateWardenCommentBody, fetchExistingWardenComments, updateWardenComment, addReactionToComment */
/* harmony import */ var node_crypto__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(77598);
/* harmony import */ var node_crypto__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_crypto__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(53391);
/* harmony import */ var _types_index_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(78481);
/* harmony import */ var _sdk_runtimes_index_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(23473);
/* harmony import */ var _sdk_extract_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(29709);
/* harmony import */ var _sdk_prompt_sections_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(49893);






/**
 * Generate a short content hash from title and description.
 * Used for exact-match deduplication.
 */
function generateContentHash(title, description) {
    const content = `${title}\n${description}`;
    return (0,node_crypto__WEBPACK_IMPORTED_MODULE_0__.createHash)('sha256').update(content).digest('hex').slice(0, 8);
}
/**
 * Generate the marker HTML comment to embed in comment body.
 * Format: <!-- warden:v1:{path}:{line}:{contentHash} -->
 */
function generateMarker(path, line, contentHash) {
    return `<!-- warden:v1:${path}:${line}:${contentHash} -->`;
}
function generateFindingMetadata(finding) {
    const metadata = {
        severity: finding.severity,
        confidence: finding.confidence,
    };
    return `<!-- warden:finding:v1:${Buffer.from(JSON.stringify(metadata), 'utf8').toString('base64url')} -->`;
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
function parseWardenFindingMetadata(body) {
    const match = body.match(/<!-- warden:finding:v1:([A-Za-z0-9_-]+) -->/);
    const encoded = match?.[1];
    if (!encoded)
        return null;
    try {
        const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
        const severity = parsed.severity;
        if (severity !== 'high' && severity !== 'medium' && severity !== 'low')
            return null;
        const confidence = parsed.confidence;
        if (confidence !== undefined &&
            confidence !== 'high' &&
            confidence !== 'medium' &&
            confidence !== 'low') {
            return null;
        }
        return { severity, confidence };
    }
    catch {
        return null;
    }
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
function sanitizeReviewCommentText(body) {
    return body
        .replaceAll(/<details[\s\S]*?<\/details>/gi, ' ')
        .replaceAll(/<!--[\s\S]*?-->/g, ' ')
        .replaceAll(/<[^>]+>/g, ' ')
        .replaceAll(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replaceAll(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replaceAll(/[*_`>#~-]+/g, ' ')
        .replaceAll(/\s+/g, ' ')
        .trim();
}
function truncateText(value, maxLength) {
    if (value.length <= maxLength) {
        return value;
    }
    return value.slice(0, maxLength - 3).trimEnd() + '...';
}
function fallbackCommentDescription(body) {
    return truncateText(sanitizeReviewCommentText(body), 500);
}
function fallbackCommentTitle(body, commentId) {
    const description = sanitizeReviewCommentText(body);
    if (!description) {
        return `Review comment ${commentId}`;
    }
    return truncateText(description, 80);
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
                author {
                  login
                }
                originalCommit {
                  oid
                }
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
            const parsed = isWarden ? parseWardenComment(firstComment.body) : null;
            const findingMetadata = isWarden ? parseWardenFindingMetadata(firstComment.body) : null;
            // For Warden comments, we need parsed title/description
            // For external comments, we extract what we can or use body as description
            const title = parsed?.title ?? fallbackCommentTitle(firstComment.body, firstComment.databaseId);
            const description = parsed?.description ?? fallbackCommentDescription(firstComment.body);
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
                severity: findingMetadata?.severity,
                confidence: findingMetadata?.confidence,
                body: firstComment.body,
                commentNodeId: firstComment.id,
                actor: firstComment.author?.login,
                originalCommitSha: firstComment.originalCommit?.oid,
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
const DuplicateMatchesSchema = zod__WEBPACK_IMPORTED_MODULE_5__/* .array */ .YO(zod__WEBPACK_IMPORTED_MODULE_5__/* .object */ .Ik({
    findingIndex: zod__WEBPACK_IMPORTED_MODULE_5__/* .number */ .ai().int(),
    existingIndex: zod__WEBPACK_IMPORTED_MODULE_5__/* .number */ .ai().int(),
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
    const findingsList = (0,_sdk_prompt_sections_js__WEBPACK_IMPORTED_MODULE_4__/* .formatIndexedFindingsForPrompt */ .kO)(findings);
    const prompt = (0,_sdk_prompt_sections_js__WEBPACK_IMPORTED_MODULE_4__/* .joinPromptSections */ .hZ)([
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
        (0,_sdk_prompt_sections_js__WEBPACK_IMPORTED_MODULE_4__/* .buildJsonOutputSection */ .j2)(`[{"findingIndex": 1, "existingIndex": 2}]
where findingIndex is the 1-based index of the new finding and existingIndex is the 1-based index of the matching existing comment.
Return [] if none are duplicates.`),
    ]);
    const result = await (0,_sdk_runtimes_index_js__WEBPACK_IMPORTED_MODULE_2__/* .getRuntime */ .fr)(options.runtime ?? 'claude').runAuxiliary({
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
        severity: finding.severity,
        ...(finding.confidence ? { confidence: finding.confidence } : {}),
    };
}
// -----------------------------------------------------------------------------
// Intra-batch consolidation
// -----------------------------------------------------------------------------
const PROXIMITY_THRESHOLD = 5;
/** Schema for LLM consolidation response: groups of finding indices that share a root cause. */
const ConsolidationGroupsSchema = zod__WEBPACK_IMPORTED_MODULE_5__/* .array */ .YO(zod__WEBPACK_IMPORTED_MODULE_5__/* .array */ .YO(zod__WEBPACK_IMPORTED_MODULE_5__/* .number */ .ai().int()));
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
        const sorted = [...group].sort((a, b) => (0,_types_index_js__WEBPACK_IMPORTED_MODULE_1__/* .findingLine */ .mC)(a) - (0,_types_index_js__WEBPACK_IMPORTED_MODULE_1__/* .findingLine */ .mC)(b));
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
            if ((0,_types_index_js__WEBPACK_IMPORTED_MODULE_1__/* .findingLine */ .mC)(curr) - (0,_types_index_js__WEBPACK_IMPORTED_MODULE_1__/* .findingLine */ .mC)(prev) <= PROXIMITY_THRESHOLD) {
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
        return { findings, removedCount: 0, removedFindings: [] };
    }
    // Phase 1: Hash dedup within batch
    const seen = new Set();
    const hashDeduped = [];
    const hashRemovedFindings = [];
    for (const f of findings) {
        const hash = generateContentHash(f.title, f.description);
        const line = (0,_types_index_js__WEBPACK_IMPORTED_MODULE_1__/* .findingLine */ .mC)(f);
        const path = f.location?.path ?? '';
        const key = `${path}:${line}:${hash}`;
        if (seen.has(key)) {
            hashRemovedFindings.push(f);
            continue;
        }
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
    if (clusters.length === 0 || options.hashOnly || !(0,_sdk_extract_js__WEBPACK_IMPORTED_MODULE_3__/* .canUseRuntimeAuth */ .ad)(options)) {
        return { findings: hashDeduped, removedCount: hashRemovedCount, removedFindings: hashRemovedFindings };
    }
    // Phase 3: LLM consolidation for proximity clusters
    // Only send clustered findings to the LLM (deduplicated across clusters)
    const clusteredList = [...new Set(clusters.flat())];
    const findingsList = (0,_sdk_prompt_sections_js__WEBPACK_IMPORTED_MODULE_4__/* .formatIndexedFindingsForPrompt */ .kO)(clusteredList, {
        includeSeverity: true,
    });
    const prompt = (0,_sdk_prompt_sections_js__WEBPACK_IMPORTED_MODULE_4__/* .joinPromptSections */ .hZ)([
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
        (0,_sdk_prompt_sections_js__WEBPACK_IMPORTED_MODULE_4__/* .buildJsonOutputSection */ .j2)('Return the JSON array. Return [] if no findings share a root cause.'),
    ]);
    const result = await (0,_sdk_runtimes_index_js__WEBPACK_IMPORTED_MODULE_2__/* .getRuntime */ .fr)(options.runtime ?? 'claude').runAuxiliary({
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
        return { findings: hashDeduped, removedCount: hashRemovedCount, removedFindings: hashRemovedFindings, usage: result.usage };
    }
    const { absorbed, replacements } = (0,_sdk_extract_js__WEBPACK_IMPORTED_MODULE_3__/* .applyMergeGroups */ .HN)(clusteredList, result.data);
    if (absorbed.size === 0) {
        return { findings: hashDeduped, removedCount: hashRemovedCount, removedFindings: hashRemovedFindings, usage: result.usage };
    }
    const consolidated = hashDeduped
        .filter((f) => !absorbed.has(f))
        .map((f) => replacements.get(f) ?? f);
    const totalRemoved = hashRemovedCount + absorbed.size;
    console.log(`Consolidate: ${absorbed.size} findings merged by LLM (same root cause)`);
    return { findings: consolidated, removedCount: totalRemoved, removedFindings: [...hashRemovedFindings, ...absorbed], usage: result.usage };
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
async function deduplicateFindings(findings, existingComments, options = {}) {
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
            const duplicateFinding = matchingComment.isWarden && matchingComment.findingId
                ? { ...finding, id: matchingComment.findingId }
                : finding;
            duplicateActions.push({
                type: matchingComment.isWarden ? 'update_warden' : 'react_external',
                originalFindingId: finding.id,
                finding: duplicateFinding,
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
    if (options.hashOnly || !(0,_sdk_extract_js__WEBPACK_IMPORTED_MODULE_3__/* .canUseRuntimeAuth */ .ad)(options) || hashDedupedFindings.length === 0) {
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
            const duplicateFinding = matchingComment.isWarden && matchingComment.findingId
                ? { ...finding, id: matchingComment.findingId }
                : finding;
            duplicateActions.push({
                type: matchingComment.isWarden ? 'update_warden' : 'react_external',
                originalFindingId: finding.id,
                finding: duplicateFinding,
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


/***/ }),

/***/ 138:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Hx: () => (/* binding */ determineConclusion),
/* harmony export */   OZ: () => (/* binding */ failSkillCheck),
/* harmony export */   R2: () => (/* binding */ updateCoreCheck),
/* harmony export */   Zv: () => (/* binding */ updateSkillCheck),
/* harmony export */   c: () => (/* binding */ createCoreCheck),
/* harmony export */   nO: () => (/* binding */ aggregateSeverityCounts),
/* harmony export */   uP: () => (/* binding */ createSkillCheck)
/* harmony export */ });
/* unused harmony exports severityToAnnotationLevel, findingsToAnnotations */
/* harmony import */ var _types_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(78481);
/* harmony import */ var _cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(43171);
/* harmony import */ var _utils_index_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(36137);



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
    const filtered = (0,_types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .filterFindings */ .Ni)(findings, reportOn, minConfidence);
    // Filter to findings with location using type predicate
    const withLocation = filtered.filter((f) => Boolean(f.location));
    // Sort by severity (most severe first)
    const sorted = [...withLocation].sort((a, b) => _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[a.severity] - _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[b.severity]);
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
            message: (0,_utils_index_js__WEBPACK_IMPORTED_MODULE_2__/* .escapeHtml */ .ZD)(finding.description),
            title: (0,_utils_index_js__WEBPACK_IMPORTED_MODULE_2__/* .escapeHtml */ .ZD)(finding.title),
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
                    message: (0,_utils_index_js__WEBPACK_IMPORTED_MODULE_2__/* .escapeHtml */ .ZD)(finding.description),
                    title: `[${finding.id}] ${(0,_utils_index_js__WEBPACK_IMPORTED_MODULE_2__/* .escapeHtml */ .ZD)(finding.title)} (additional location)`,
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
    const failOnOrder = _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[failOn];
    const hasFailingSeverity = findings.some((f) => _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[f.severity] <= failOnOrder);
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
    const filteredForConclusion = (0,_types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .filterFindings */ .Ni)(report.findings, undefined, options.minConfidence);
    const conclusion = options.conclusion ?? determineConclusion(filteredForConclusion, options.failOn, options.failCheck);
    // Annotations are filtered by reportOn threshold and confidence
    const annotations = findingsToAnnotations(report.findings, options.reportOn, options.minConfidence);
    const summary = buildSkillSummary(report);
    const filteredCount = filteredForConclusion.length;
    const title = options.title ?? (filteredCount === 0
        ? 'No issues'
        : `${filteredCount} issue${filteredCount === 1 ? '' : 's'}`);
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
    const title = summaryData.title ?? (summaryData.totalFindings === 0
        ? 'No issues'
        : `${summaryData.totalFindings} issue${summaryData.totalFindings === 1 ? '' : 's'}`);
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
function formatLocation(location) {
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
            const location = finding.location ? ` - ${formatLocation(finding.location)}` : '';
            lines.push('<details>');
            lines.push(`<summary><strong>${(0,_utils_index_js__WEBPACK_IMPORTED_MODULE_2__/* .escapeHtml */ .ZD)(finding.title)}</strong>${location}</summary>`, '');
            lines.push((0,_utils_index_js__WEBPACK_IMPORTED_MODULE_2__/* .escapeHtml */ .ZD)(finding.description), '');
            if (finding.additionalLocations?.length) {
                lines.push('Also found at:');
                for (const loc of finding.additionalLocations) {
                    lines.push(`- ${formatLocation(loc)}`);
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
    const cost = (0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_1__/* .totalUsageCost */ .lg)(usage, auxiliaryUsage);
    if (durationMs === undefined && !usage && cost === undefined)
        return [];
    const parts = [];
    if (durationMs !== undefined) {
        parts.push(`⏱ ${(0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_1__/* .formatDuration */ .a3)(durationMs)}`);
    }
    if (usage) {
        parts.push(`${(0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_1__/* .formatTokens */ ._y)(usage.inputTokens)} in / ${(0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_1__/* .formatTokens */ ._y)(usage.outputTokens)} out`);
    }
    if (cost !== undefined) {
        parts.push(`${(0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_1__/* .formatCost */ .BD)(cost)}`);
    }
    return ['---', `<sub>${parts.join(' · ')}</sub>`];
}
/**
 * Build the summary markdown for a skill check.
 */
function buildSkillSummary(report) {
    const lines = [(0,_utils_index_js__WEBPACK_IMPORTED_MODULE_2__/* .escapeHtml */ .ZD)(report.summary), ''];
    if (report.findings.length === 0) {
        lines.push('No issues found.');
    }
    else {
        const sortedFindings = [...report.findings].sort((a, b) => _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[a.severity] - _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[b.severity]);
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
    const sortedFindings = [...data.findings].sort((a, b) => _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[a.severity] - _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[b.severity]);
    const topFindings = sortedFindings.slice(0, MAX_SUMMARY_FINDINGS);
    if (topFindings.length > 0) {
        lines.push(...renderFindingsSections(topFindings));
        if (data.totalFindings > topFindings.length) {
            const remaining = data.totalFindings - topFindings.length;
            lines.push(`*...and ${remaining} more*`, '');
        }
    }
    else {
        lines.push(data.message ? (0,_utils_index_js__WEBPACK_IMPORTED_MODULE_2__/* .escapeHtml */ .ZD)(data.message) : 'No issues found.', '');
    }
    // Skills table in collapsible section
    const hasSkillStats = data.skillResults.some((s) => s.durationMs !== undefined || s.usage || s.auxiliaryUsage);
    const skillPlural = data.totalSkills === 1 ? '' : 's';
    lines.push('<details>');
    lines.push(`<summary>${data.totalSkills} skill${skillPlural} analyzed</summary>`, '');
    if (hasSkillStats) {
        lines.push('| Skill | Findings | Duration | Cost |', '|-------|----------|----------|------|');
        for (const skill of data.skillResults) {
            const duration = skill.durationMs !== undefined ? (0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_1__/* .formatDuration */ .a3)(skill.durationMs) : '-';
            const costUSD = (0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_1__/* .totalUsageCost */ .lg)(skill.usage, skill.auxiliaryUsage);
            const cost = costUSD !== undefined ? (0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_1__/* .formatCost */ .BD)(costUSD) : '-';
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


/***/ }),

/***/ 67034:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  y: () => (/* binding */ createFixPR),
  w: () => (/* binding */ createOrUpdateIssue)
});

// EXTERNAL MODULE: external "node:fs"
var external_node_fs_ = __webpack_require__(73024);
// EXTERNAL MODULE: external "node:path"
var external_node_path_ = __webpack_require__(76760);
// EXTERNAL MODULE: ./src/types/index.ts
var types = __webpack_require__(78481);
// EXTERNAL MODULE: ./src/cli/output/formatters.ts
var formatters = __webpack_require__(43171);
// EXTERNAL MODULE: ./src/utils/index.ts + 2 modules
var utils = __webpack_require__(36137);
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
    const counts = (0,formatters/* countBySeverity */.Ot)(allFindings);
    lines.push('### Summary');
    lines.push('');
    lines.push('| Severity | Count |');
    lines.push('|----------|-------|');
    for (const severity of ['high', 'medium', 'low']) {
        if (counts[severity] > 0) {
            lines.push(`| ${(0,formatters/* capitalize */.ZH)(severity)} | ${counts[severity]} |`);
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
    const byFile = groupFindingsByFile(sortedFindings);
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
            lines.push(renderFindingItem(finding, { commitSha, repoOwner, repoName }));
        }
        lines.push('');
    }
    // General findings (no location)
    const noLocation = sortedFindings.filter((f) => !f.location);
    if (noLocation.length > 0) {
        lines.push('#### General');
        lines.push('');
        for (const finding of noLocation) {
            lines.push(renderFindingItem(finding, { commitSha, repoOwner, repoName }));
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
function formatLineRange(loc) {
    if (loc.endLine && loc.endLine !== loc.startLine) {
        return `L${loc.startLine}-L${loc.endLine}`;
    }
    return `L${loc.startLine}`;
}
function renderFindingItem(finding, ctx) {
    const { commitSha, repoOwner, repoName } = ctx;
    const canLink = repoOwner && repoName && finding.location;
    let locationStr = '';
    if (finding.location) {
        const lineRange = formatLineRange(finding.location);
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

// EXTERNAL MODULE: ./src/diff/apply.ts
var apply = __webpack_require__(63779);
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
                    content = (0,apply/* applyDiffToContent */.s)(content, diff);
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


/***/ }),

/***/ 21242:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   D: () => (/* binding */ renderFindingsBody),
/* harmony export */   K: () => (/* binding */ renderSkillReport)
/* harmony export */ });
/* harmony import */ var _types_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(78481);
/* harmony import */ var _cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(43171);
/* harmony import */ var _dedup_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3941);
/* harmony import */ var _utils_index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(36137);




function renderSkillReport(report, options = {}) {
    const { includeSuggestions = true, maxFindings, groupByFile = true, reportOn, minConfidence, failOn, requestChanges, checkRunUrl, totalFindings, allFindings } = options;
    // Filter by reportOn threshold and confidence, then apply maxFindings limit
    const filteredFindings = (0,_types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .filterFindings */ .Ni)(report.findings, reportOn, minConfidence);
    const findings = maxFindings ? filteredFindings.slice(0, maxFindings) : filteredFindings;
    const sortedFindings = [...findings].sort((a, b) => _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[a.severity] - _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[b.severity]);
    // Calculate how many findings were filtered out
    const total = totalFindings ?? report.findings.length;
    const hiddenCount = total - sortedFindings.length;
    // Use allFindings for failOn evaluation if provided (e.g., when report.findings was modified for dedup)
    // Apply confidence filtering to failOn evaluation too
    const findingsForFailOn = (0,_types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .filterFindings */ .Ni)(allFindings ?? report.findings, undefined, minConfidence);
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
        let body = `**${(0,_utils_index_js__WEBPACK_IMPORTED_MODULE_3__/* .escapeHtml */ .ZD)(finding.title)}**\n\n${(0,_utils_index_js__WEBPACK_IMPORTED_MODULE_3__/* .escapeHtml */ .ZD)(finding.description)}`;
        if (finding.verification?.trim()) {
            body += `\n\n${renderVerification(finding.verification)}`;
        }
        if (includeSuggestions && finding.suggestedFix) {
            body += `\n\n${renderSuggestion(finding.suggestedFix.description, finding.suggestedFix.diff)}`;
        }
        // Additional locations section
        if (finding.additionalLocations?.length) {
            body += '\n\n<details><summary>Also found at ' +
                `${finding.additionalLocations.length} additional ` +
                (0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_1__/* .pluralize */ .td)(finding.additionalLocations.length, 'location') +
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
        const contentHash = (0,_dedup_js__WEBPACK_IMPORTED_MODULE_2__/* .generateContentHash */ .LQ)(finding.title, finding.description);
        const line = location.endLine ?? location.startLine;
        body += `\n${(0,_dedup_js__WEBPACK_IMPORTED_MODULE_2__/* .generateMarker */ .EF)(location.path, line, contentHash)}`;
        body += `\n${(0,_dedup_js__WEBPACK_IMPORTED_MODULE_2__/* .generateFindingMetadata */ .Op)(finding)}`;
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
        findings.some((f) => _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[f.severity] <= _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[failOn]);
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
        return `**Suggested fix:** ${(0,_utils_index_js__WEBPACK_IMPORTED_MODULE_3__/* .escapeHtml */ .ZD)(description)}`;
    }
    return `**Suggested fix:** ${(0,_utils_index_js__WEBPACK_IMPORTED_MODULE_3__/* .escapeHtml */ .ZD)(description)}\n\n\`\`\`suggestion\n${suggestionLines.join('\n')}\n\`\`\``;
}
function renderVerification(verification) {
    return `<details><summary>Evidence</summary>\n\n${(0,_utils_index_js__WEBPACK_IMPORTED_MODULE_3__/* .escapeHtml */ .ZD)(verification.trim())}\n\n</details>`;
}
function renderHiddenFindingsLink(hiddenCount, checkRunUrl) {
    return `[View ${hiddenCount} additional ${(0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_1__/* .pluralize */ .td)(hiddenCount, 'finding')} in Checks](${checkRunUrl})`;
}
function renderAttributionFooter(skill, findingId) {
    const idSuffix = findingId ? ` · ${(0,_utils_index_js__WEBPACK_IMPORTED_MODULE_3__/* .escapeHtml */ .ZD)(findingId)}` : '';
    return `<sub>Identified by Warden ${(0,_utils_index_js__WEBPACK_IMPORTED_MODULE_3__/* .escapeHtml */ .ZD)(skill)}${idSuffix}</sub>`;
}
function renderSummaryComment(report, findings, groupByFile, checkRunUrl, hiddenCount) {
    const lines = [];
    lines.push(`## ${report.skill}`);
    lines.push('');
    lines.push((0,_utils_index_js__WEBPACK_IMPORTED_MODULE_3__/* .escapeHtml */ .ZD)(report.summary));
    lines.push('');
    if (findings.length === 0) {
        lines.push('No findings to report.');
    }
    else {
        const counts = (0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_1__/* .countBySeverity */ .Ot)(findings);
        lines.push('### Summary');
        lines.push('');
        lines.push(`| Severity | Count |
|----------|-------|
${Object.entries(counts)
            .filter(([, count]) => count > 0)
            .sort(([a], [b]) => _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[a] - _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[b])
            .map(([severity, count]) => `| ${(0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_1__/* .capitalize */ .ZH)(severity)} | ${count} |`)
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
    const statsLine = (0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_1__/* .formatStatsCompact */ .Ac)(report.durationMs, report.usage, report.auxiliaryUsage);
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
        ? ` (+${finding.additionalLocations.length} more ${(0,_cli_output_formatters_js__WEBPACK_IMPORTED_MODULE_1__/* .pluralize */ .td)(finding.additionalLocations.length, 'location')})`
        : '';
    return `- \`${finding.id}\` **${(0,_utils_index_js__WEBPACK_IMPORTED_MODULE_3__/* .escapeHtml */ .ZD)(finding.title)}**${location}${extra} · ${finding.severity}: ${(0,_utils_index_js__WEBPACK_IMPORTED_MODULE_3__/* .escapeHtml */ .ZD)(finding.description)}`;
}
/** Render findings as markdown for inclusion in a review body. */
function renderFindingsBody(findings, skill) {
    const lines = [];
    for (const finding of findings) {
        const location = finding.location
            ? ` (\`${finding.location.path}:${finding.location.startLine}\`)`
            : '';
        lines.push(`**${(0,_utils_index_js__WEBPACK_IMPORTED_MODULE_3__/* .escapeHtml */ .ZD)(finding.title)}**${location}`);
        lines.push('');
        lines.push((0,_utils_index_js__WEBPACK_IMPORTED_MODULE_3__/* .escapeHtml */ .ZD)(finding.description));
        lines.push('');
        if (finding.verification?.trim()) {
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


/***/ }),

/***/ 95768:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AG: () => (/* binding */ resolveStaleComments),
/* harmony export */   B8: () => (/* binding */ buildAnalyzedScope),
/* harmony export */   i0: () => (/* binding */ findingMatchesComment),
/* harmony export */   t8: () => (/* binding */ findStaleComments)
/* harmony export */ });
/* unused harmony export isInAnalyzedScope */
/* harmony import */ var _dedup_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3941);

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
    const findingHash = (0,_dedup_js__WEBPACK_IMPORTED_MODULE_0__/* .generateContentHash */ .LQ)(finding.title, finding.description);
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


/***/ }),

/***/ 97712:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   pd: () => (/* binding */ runSkill),
/* harmony export */   ur: () => (/* binding */ generateSummary),
/* harmony export */   xy: () => (/* binding */ analyzeFile)
/* harmony export */ });
/* unused harmony exports filterOutOfRangeFindings, buildSourceSnippet */
/* harmony import */ var _diff_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(66325);
/* harmony import */ var _sentry_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(30340);
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(98229);
/* harmony import */ var _retry_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2022);
/* harmony import */ var _usage_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(44759);
/* harmony import */ var _prompt_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(12204);
/* harmony import */ var _extract_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(29709);
/* harmony import */ var _post_process_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(88802);
/* harmony import */ var _report_files_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(79418);
/* harmony import */ var _runtimes_index_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(23473);
/* harmony import */ var _types_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(88973);
/* harmony import */ var _prepare_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(15507);
/* harmony import */ var _utils_index_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(36137);













function notifyHunkFailed(callbacks, lineRange, message) {
    if (callbacks) {
        callbacks.onHunkFailed?.(lineRange, message);
        return;
    }
    console.error(`Hunk analysis failed for ${lineRange}.`);
}
function isAbortRequested(error, abortController) {
    return (abortController?.signal.aborted ?? false) || (0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .classifyError */ .fe)(error).code === 'aborted';
}
function isCircuitBreakerCode(code) {
    return code === 'auth_failed' || code === 'provider_unavailable' || code === 'invalid_model_selector';
}
function hunkFailureFromCircuit(reason, usage, attempts) {
    return {
        findings: [],
        usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_10__/* .aggregateUsage */ .Z$)(usage),
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
    const extracted = (0,_extract_js__WEBPACK_IMPORTED_MODULE_5__/* .extractFindingsJson */ .Kz)(result.text);
    if (extracted.success) {
        return { findings: (0,_extract_js__WEBPACK_IMPORTED_MODULE_5__/* .validateFindings */ .Fk)(extracted.findings, filename), extractionFailed: false, extractionMethod: 'regex' };
    }
    // Tier 2: Try LLM fallback for malformed output
    const fallback = await (0,_extract_js__WEBPACK_IMPORTED_MODULE_5__/* .extractFindingsWithLLM */ .l1)(result.text, {
        apiKey: options.apiKey,
        runtime: options.runtime,
        model: options.auxiliaryModel,
        maxRetries: options.auxiliaryMaxRetries,
        agentName: skillName,
    });
    if (fallback.success) {
        return { findings: (0,_extract_js__WEBPACK_IMPORTED_MODULE_5__/* .validateFindings */ .Fk)(fallback.findings, filename), extractionFailed: false, extractionMethod: 'llm', extractionUsage: fallback.usage };
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
function hunkSourceLines(hunkCtx) {
    const lines = [];
    for (const [index, content] of hunkCtx.contextBefore.entries()) {
        lines.push({ line: hunkCtx.contextStartLine + index, content });
    }
    let newLine = hunkCtx.hunk.newStart;
    for (const diffLine of hunkCtx.hunk.lines) {
        if (diffLine.startsWith('-'))
            continue;
        if (!diffLine.startsWith('+') && !diffLine.startsWith(' '))
            continue;
        const content = diffLine.slice(1);
        lines.push({ line: newLine, content });
        newLine += 1;
    }
    const afterStart = hunkCtx.hunk.newStart + hunkCtx.hunk.newCount;
    for (const [index, content] of hunkCtx.contextAfter.entries()) {
        lines.push({ line: afterStart + index, content });
    }
    return lines;
}
function buildSourceSnippet(finding, hunkCtx, contextLines = 3) {
    if (!finding.location)
        return undefined;
    const targetStartLine = finding.location.startLine;
    const targetEndLine = finding.location.endLine ?? targetStartLine;
    const startLine = Math.max(1, targetStartLine - contextLines);
    const endLine = targetEndLine + contextLines;
    const lines = hunkSourceLines(hunkCtx)
        .filter((line) => line.line >= startLine && line.line <= endLine)
        .map((line) => ({
        ...line,
        highlighted: line.line >= targetStartLine && line.line <= targetEndLine,
    }));
    if (lines.length === 0)
        return undefined;
    const firstLine = lines[0];
    const lastLine = lines.at(-1);
    if (!firstLine || !lastLine)
        return undefined;
    return {
        path: finding.location.path,
        language: hunkCtx.language,
        startLine: firstLine.line,
        endLine: lastLine.line,
        targetStartLine,
        targetEndLine,
        lines,
    };
}
function attachSourceSnippets(findings, hunkCtx) {
    return findings.map((finding) => {
        if (!finding.location)
            return finding;
        const sourceSnippet = buildSourceSnippet(finding, hunkCtx);
        return sourceSnippet ? { ...finding, sourceSnippet } : finding;
    });
}
/**
 * Analyze a single hunk with retry logic for transient failures.
 */
async function analyzeHunk(skill, hunkCtx, repoPath, options, callbacks, prContext) {
    const lineRange = callbacks?.lineRange ?? formatHunkLineRange(hunkCtx);
    return _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.startSpan */ .sQ.startSpan({
        op: 'skill.analyze_hunk',
        name: `analyze hunk ${hunkCtx.filename}:${lineRange}`,
        attributes: {
            'gen_ai.agent.name': skill.name,
            'code.file.path': hunkCtx.filename,
            'warden.hunk.line_range': lineRange,
        },
    }, async (span) => {
        const { abortController, retry } = options;
        const systemPrompt = (0,_prompt_js__WEBPACK_IMPORTED_MODULE_4__/* .buildHunkSystemPrompt */ .q)(skill);
        const userPrompt = (0,_prompt_js__WEBPACK_IMPORTED_MODULE_4__/* .buildHunkUserPrompt */ ._)(skill, hunkCtx, prContext);
        // Report prompt size information
        const systemChars = systemPrompt.length;
        const userChars = userPrompt.length;
        const totalChars = systemChars + userChars;
        const estimatedTokensCount = (0,_usage_js__WEBPACK_IMPORTED_MODULE_10__/* .estimateTokens */ .bP)(totalChars);
        // Always call onPromptSize if provided (for debug mode)
        callbacks?.onPromptSize?.(callbacks.lineRange, systemChars, userChars, totalChars, estimatedTokensCount);
        // Warn about large prompts
        if (totalChars > _types_js__WEBPACK_IMPORTED_MODULE_11__/* .LARGE_PROMPT_THRESHOLD_CHARS */ .j) {
            callbacks?.onLargePrompt?.(callbacks.lineRange, totalChars, estimatedTokensCount);
        }
        // Merge retry config with defaults
        const retryConfig = {
            ..._retry_js__WEBPACK_IMPORTED_MODULE_3__/* .DEFAULT_RETRY_CONFIG */ .cI,
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
                    usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_10__/* .aggregateUsage */ .Z$)(accumulatedUsage),
                    failed: true,
                    extractionFailed: false,
                    failureCode: 'aborted',
                    failureMessage: 'Analysis aborted',
                    attempts: attempt,
                };
            }
            try {
                const runtimeName = options.runtime ?? 'pi';
                const runtime = (0,_runtimes_index_js__WEBPACK_IMPORTED_MODULE_7__/* .getRuntime */ .fr)(runtimeName);
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
                        reasoningEffort: options.reasoningEffort,
                        abortController: options.abortController,
                    },
                    providerOptions: (0,_runtimes_index_js__WEBPACK_IMPORTED_MODULE_7__/* .getRuntimeProviderOptions */ .g_)(runtimeName, {
                        pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
                    }),
                });
                // Check for authentication errors from auth_status messages
                // auth_status errors are always auth-related - throw immediately
                if (authError) {
                    throw new _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .WardenAuthenticationError */ .Aq(authError, { runtime: runtimeName });
                }
                if (!resultMessage) {
                    notifyHunkFailed(callbacks, callbacks?.lineRange ?? lineRange, 'SDK returned no result');
                    return {
                        findings: [],
                        usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_10__/* .aggregateUsage */ .Z$)(accumulatedUsage),
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
                        if ((0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .isAuthenticationErrorMessage */ .Ip)(err)) {
                            throw new _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .WardenAuthenticationError */ .Aq(undefined, { runtime: runtimeName });
                        }
                    }
                    // SDK error - log and return failure with error details
                    const errorSummary = errorMessages.length > 0
                        ? (0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeErrorMessage */ .$w)(errorMessages.join('; '))
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
                        usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_10__/* .aggregateUsage */ .Z$)(accumulatedUsage),
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
                const hunkRange = (0,_diff_index_js__WEBPACK_IMPORTED_MODULE_0__/* .getHunkLineRange */ .sK)(hunkCtx.hunk);
                const { filtered, dropped } = filterOutOfRangeFindings(parseResult.findings, hunkRange);
                const filteredFindings = attachSourceSnippets(filtered, hunkCtx);
                if (dropped.length > 0) {
                    _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.addBreadcrumb */ .sQ.addBreadcrumb({
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
                (0,_sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .emitExtractionMetrics */ .yI)(skill.name, parseResult.extractionMethod, filteredFindings.length);
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
                    usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_10__/* .aggregateUsage */ .Z$)(accumulatedUsage),
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
                if (isAbortRequested(error, abortController)) {
                    callbacks?.onHunkFailed?.(callbacks.lineRange, 'Analysis aborted');
                    return {
                        findings: [],
                        usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_10__/* .aggregateUsage */ .Z$)(accumulatedUsage),
                        failed: true,
                        extractionFailed: false,
                        failureCode: 'aborted',
                        failureMessage: 'Analysis aborted',
                        attempts: attempt + 1,
                    };
                }
                // Re-throw authentication errors (they shouldn't be retried)
                if (error instanceof _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .WardenAuthenticationError */ .Aq) {
                    const message = (0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeErrorMessage */ .$w)(error.message);
                    options.circuitBreaker?.recordFailure('auth_failed', message);
                    throw error;
                }
                // Subprocess IPC failures (EPIPE, ECONNRESET, etc.) indicate the Claude CLI
                // can't communicate — surface as an auth error with actionable guidance
                if ((0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .isSubprocessError */ .mu)(error)) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    options.circuitBreaker?.recordFailure('auth_failed', (0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeErrorMessage */ .$w)(errorMessage));
                    throw new _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .WardenAuthenticationError */ .Aq(`Claude Code subprocess failed (${errorMessage}).\n` +
                        `This usually means the claude CLI cannot run in this environment.`, { cause: error });
                }
                // Authentication errors should surface immediately with helpful guidance
                if ((0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .isAuthenticationError */ .HD)(error)) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    options.circuitBreaker?.recordFailure('auth_failed', (0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeErrorMessage */ .$w)(errorMessage));
                    throw new _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .WardenAuthenticationError */ .Aq(undefined, { runtime: options.runtime ?? 'pi', cause: error });
                }
                // Don't retry if not a retryable error or we've exhausted retries
                const shouldRetry = (0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .isRetryableError */ .$d)(error) && attempt < retryConfig.maxRetries;
                if (!shouldRetry) {
                    break;
                }
                // Calculate delay and wait before retry
                const delayMs = (0,_retry_js__WEBPACK_IMPORTED_MODULE_3__/* .calculateRetryDelay */ .gE)(attempt, retryConfig);
                const errorMessage = (0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeErrorMessage */ .$w)(error instanceof Error ? error.message : String(error));
                _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.addBreadcrumb */ .sQ.addBreadcrumb({
                    category: 'retry',
                    message: `Retrying hunk analysis`,
                    data: { attempt: attempt + 1, error: errorMessage, delayMs },
                    level: 'warning',
                });
                (0,_sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .emitRetryMetric */ .m0)(skill.name, attempt + 1);
                // Notify about retry in verbose mode
                callbacks?.onRetry?.(callbacks.lineRange, attempt + 1, retryConfig.maxRetries, errorMessage, delayMs);
                try {
                    await (0,_retry_js__WEBPACK_IMPORTED_MODULE_3__/* .sleep */ .yy)(delayMs, abortController?.signal);
                }
                catch {
                    // Aborted during sleep
                    callbacks?.onHunkFailed?.(callbacks.lineRange, 'Analysis aborted during retry delay');
                    return {
                        findings: [],
                        usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_10__/* .aggregateUsage */ .Z$)(accumulatedUsage),
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
        const finalError = (0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeErrorMessage */ .$w)(lastError instanceof Error ? lastError.message : String(lastError));
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
        const { code: retryCode, message } = (0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .classifyError */ .fe)(lastError);
        const retryMsg = (0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .sanitizeErrorMessage */ .$w)(message);
        const openReason = recordCircuitFailure(options, retryCode, retryMsg);
        if (openReason) {
            return hunkFailureFromCircuit(openReason, accumulatedUsage, retryConfig.maxRetries + 1);
        }
        return {
            findings: [],
            usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_10__/* .aggregateUsage */ .Z$)(accumulatedUsage),
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
    return _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.startSpan */ .sQ.startSpan({
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
                    code: (0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .mapExtractionErrorCode */ .bk)(result.extractionError),
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
            usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_10__/* .aggregateUsage */ .Z$)(fileUsage),
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
    return _sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .Sentry.startSpan */ .sQ.startSpan({
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
            (0,_sentry_js__WEBPACK_IMPORTED_MODULE_1__/* .emitSkillMetrics */ .s7)(report);
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
        throw new _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .SkillRunnerError */ .cy('Pull request context required for skill execution');
    }
    const { files: fileHunks, skippedFiles } = (0,_prepare_js__WEBPACK_IMPORTED_MODULE_8__/* .prepareFiles */ .t)(context, {
        contextLines: options.contextLines,
        // Note: chunking config should come from the caller (e.g., from warden.toml defaults)
        // For now, we use built-in defaults. The caller can pass explicit chunking config.
    });
    if (fileHunks.length === 0) {
        const report = {
            skill: skill.name,
            summary: 'No code changes to analyze',
            findings: [],
            usage: (0,_usage_js__WEBPACK_IMPORTED_MODULE_10__/* .emptyUsage */ .ly)(),
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
        repository: context.repository.fullName,
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
        const fileConcurrency = options.concurrency ?? _types_js__WEBPACK_IMPORTED_MODULE_11__/* .DEFAULT_FILE_CONCURRENCY */ .f;
        const batchDelayMs = options.batchDelayMs ?? 0;
        fileResults.push(...await (0,_utils_index_js__WEBPACK_IMPORTED_MODULE_9__/* .runPool */ .kD)(fileHunks, fileConcurrency, async (fileHunkEntry, index) => {
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
        throw new _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .SkillRunnerError */ .cy(circuitReason.message, { code: circuitReason.code });
    }
    if (totalAttemptFailures > 0 && totalAttemptFailures === totalHunks && allFindings.length === 0) {
        const analysisFailures = allHunkFailures.filter((failure) => failure.type === 'analysis');
        if (analysisFailures.length > 0
            && analysisFailures.every((failure) => failure.code === 'invalid_model_selector')) {
            throw new _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .SkillRunnerError */ .cy(analysisFailures[0]?.message ?? 'Invalid Pi model selector.', { code: 'invalid_model_selector' });
        }
        if (analysisFailures.length > 0
            && analysisFailures.every((failure) => failure.code === 'provider_unavailable')) {
            throw new _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .SkillRunnerError */ .cy(`Provider unavailable: all ${totalHunks} chunk${totalHunks === 1 ? '' : 's'} failed to analyze. Warden stopped early.`, { code: 'provider_unavailable' });
        }
        throw new _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .SkillRunnerError */ .cy(`All ${totalHunks} chunk${totalHunks === 1 ? '' : 's'} failed to analyze. ` +
            `This usually indicates an authentication problem. ${allHunksFailedGuidance(options.runtime)}`, { code: 'all_hunks_failed' });
    }
    let finalFindings = allFindings;
    if (options.postProcessFindings !== false) {
        const processed = await (0,_post_process_js__WEBPACK_IMPORTED_MODULE_6__/* .postProcessFindings */ .y)(allFindings, {
            skill,
            repoPath: context.repoPath,
            apiKey: options.apiKey,
            runtime: options.runtime,
            auxiliaryModel: options.auxiliaryModel,
            synthesisModel: options.synthesisModel,
            auxiliaryMaxRetries: options.auxiliaryMaxRetries,
            verifyFindings: options.verifyFindings,
            maxTurns: options.maxTurns,
            reasoningEffort: options.reasoningEffort,
            abortController: options.abortController,
            pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
            prContext,
            onFindingProcessing: options.callbacks?.onFindingProcessing,
        });
        finalFindings = processed.findings;
        allAuxiliaryUsage.push(...processed.auxiliaryUsage);
    }
    // Generate summary
    const summary = generateSummary(skill.name, finalFindings);
    // Aggregate usage across all hunks
    const totalUsage = (0,_usage_js__WEBPACK_IMPORTED_MODULE_10__/* .aggregateUsage */ .Z$)(allUsage);
    const report = {
        skill: skill.name,
        summary,
        findings: finalFindings,
        usage: totalUsage,
        durationMs: Date.now() - startTime,
        model: options.model,
        files: (0,_report_files_js__WEBPACK_IMPORTED_MODULE_12__/* .buildFileReports */ .K)(fileResults.map((fr) => ({
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
    const auxUsage = (0,_usage_js__WEBPACK_IMPORTED_MODULE_10__/* .aggregateAuxiliaryUsage */ .RL)(allAuxiliaryUsage);
    if (auxUsage) {
        report.auxiliaryUsage = auxUsage;
    }
    return report;
}


/***/ }),

/***/ 30640:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* unused harmony export verifyAuth */
/* harmony import */ var _utils_exec_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(82224);
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(98229);


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


/***/ }),

/***/ 71794:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   j: () => (/* binding */ ProviderFailureCircuitBreaker)
/* harmony export */ });
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(98229);

const DEFAULT_MAX_CONSECUTIVE_PROVIDER_FAILURES = 5;
function providerUnavailableMessage(count, lastMessage) {
    const detail = (0,_errors_js__WEBPACK_IMPORTED_MODULE_0__/* .sanitizeErrorMessage */ .$w)(lastMessage).trim();
    const suffix = detail ? ` Last error: ${detail}` : '';
    return `Provider unavailable after ${count} consecutive failures. Warden stopped early.${suffix}`;
}
/**
 * Tracks unrecoverable provider failures across a Warden run.
 */
class ProviderFailureCircuitBreaker {
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


/***/ }),

/***/ 29709:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Fk: () => (/* binding */ validateFindings),
/* harmony export */   HN: () => (/* binding */ applyMergeGroups),
/* harmony export */   Kz: () => (/* binding */ extractFindingsJson),
/* harmony export */   YB: () => (/* binding */ extractBalancedJson),
/* harmony export */   ad: () => (/* binding */ canUseRuntimeAuth),
/* harmony export */   l1: () => (/* binding */ extractFindingsWithLLM),
/* harmony export */   of: () => (/* binding */ mergeCrossLocationFindings),
/* harmony export */   v9: () => (/* binding */ deduplicateFindings)
/* harmony export */ });
/* unused harmony exports FINDINGS_JSON_START, truncateForLLMFallback, SHORT_ID_LENGTH, generateShortId, mergeGroupLocations */
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(73024);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(76760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(node_path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(53391);
/* harmony import */ var nanoid__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(88564);
/* harmony import */ var _types_index_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(78481);
/* harmony import */ var _runtimes_index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(23473);
/* harmony import */ var _prompt_sections_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(49893);







const ExtractedFindingSchema = _types_index_js__WEBPACK_IMPORTED_MODULE_2__/* .FindingSchema */ .p_.omit({ sourceSnippet: true });
/** Pattern to match the start of findings JSON (allows whitespace after brace) */
const FINDINGS_JSON_START = /\{\s*"findings"/;
/** Return true when the selected runtime can authenticate outside a legacy Anthropic API key. */
function canUseRuntimeAuth(options) {
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
    if (!canUseRuntimeAuth(options)) {
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
    const userContent = (0,_prompt_sections_js__WEBPACK_IMPORTED_MODULE_4__/* .joinPromptSections */ .hZ)([
        `<task>
Extract the findings JSON from this model output.
</task>`,
        (0,_prompt_sections_js__WEBPACK_IMPORTED_MODULE_4__/* .buildJsonOutputSection */ .j2)(`Return this shape: {"findings": [...]}
If no findings exist, return: {"findings": []}`),
        (0,_prompt_sections_js__WEBPACK_IMPORTED_MODULE_4__/* .buildTaggedSection */ .sG)('model_output', truncatedText),
    ]);
    const result = await (0,_runtimes_index_js__WEBPACK_IMPORTED_MODULE_3__/* .getRuntime */ .fr)(runtimeName).runAuxiliary({
        task: 'extraction',
        agentName: options.agentName,
        apiKey,
        prompt: userContent,
        schema: zod__WEBPACK_IMPORTED_MODULE_5__/* .object */ .Ik({ findings: zod__WEBPACK_IMPORTED_MODULE_5__/* .array */ .YO(zod__WEBPACK_IMPORTED_MODULE_5__/* .unknown */ .L5()) }),
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
    const raw = (0,nanoid__WEBPACK_IMPORTED_MODULE_6__/* .customAlphabet */ .d_)(SHORT_ID_ALPHABET, SHORT_ID_LENGTH)();
    return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}
/**
 * Validate and normalize findings from extracted JSON.
 * Replaces the LLM-provided ID with a short ID for cross-referencing.
 */
function validateFindings(findings, filename) {
    const validated = [];
    for (const f of findings) {
        const candidate = typeof f === 'object' && f !== null
            ? { ...f }
            : f;
        // Normalize location path before validation
        if (typeof candidate === 'object' && candidate !== null && 'location' in candidate) {
            const loc = candidate['location'];
            if (loc && typeof loc === 'object') {
                candidate['location'] = {
                    ...loc,
                    path: filename,
                };
            }
        }
        const result = ExtractedFindingSchema.safeParse(candidate);
        if (result.success) {
            const location = result.data.location ? { ...result.data.location, path: filename } : undefined;
            validated.push({
                ...result.data,
                id: generateShortId(),
                location,
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
        const sorted = [...groupFindings].sort(_types_index_js__WEBPACK_IMPORTED_MODULE_2__/* .compareFindingPriority */ .Lx);
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
const MergeGroupsSchema = zod__WEBPACK_IMPORTED_MODULE_5__/* .array */ .YO(zod__WEBPACK_IMPORTED_MODULE_5__/* .array */ .YO(zod__WEBPACK_IMPORTED_MODULE_5__/* .number */ .ai().int()));
/**
 * Read a code snippet from disk around a given line.
 * Returns empty string on any I/O error.
 */
function readSnippet(repoPath, filePath, startLine, contextLines = 3) {
    try {
        const fullPath = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(repoPath, filePath);
        const content = (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.readFileSync)(fullPath, 'utf-8');
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
    if (withLocations.length < 2 || !canUseRuntimeAuth(options)) {
        return { findings, mergedCount: 0 };
    }
    const findingDescriptions = (0,_prompt_sections_js__WEBPACK_IMPORTED_MODULE_4__/* .formatIndexedFindingsForPrompt */ .kO)(withLocations, {
        locationStyle: 'range',
        snippet: (finding) => {
            const loc = finding.location;
            return loc ? readSnippet(repoPath, loc.path, loc.startLine) : undefined;
        },
    });
    const prompt = (0,_prompt_sections_js__WEBPACK_IMPORTED_MODULE_4__/* .joinPromptSections */ .hZ)([
        `<task>
Identify which of these code review findings describe the SAME underlying issue appearing at different locations. Group them by shared root cause.
</task>`,
        `<findings>
${findingDescriptions}
</findings>`,
        (0,_prompt_sections_js__WEBPACK_IMPORTED_MODULE_4__/* .buildJsonOutputSection */ .j2)(`Return a JSON array of arrays, where each inner array contains the 1-based indices of findings about the same issue.
Singletons should not appear. Return [] if no findings describe the same issue.`),
    ]);
    const result = await (0,_runtimes_index_js__WEBPACK_IMPORTED_MODULE_3__/* .getRuntime */ .fr)(options?.runtime ?? 'claude').runSynthesis({
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


/***/ }),

/***/ 81572:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* unused harmony export parseJsonFromOutput */
/* harmony import */ var _haiku_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(39026);
/* harmony import */ var _extract_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(29709);
/* harmony import */ var _prompt_sections_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(49893);
/* harmony import */ var _runtimes_index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(23473);




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


/***/ }),

/***/ 55623:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* unused harmony exports runLocalSkill, verifyLocalFindings */
/* harmony import */ var _cli_context_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4257);
/* harmony import */ var _skills_loader_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(34691);
/* harmony import */ var _utils_path_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(60702);
/* harmony import */ var _analyze_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(97712);
/* harmony import */ var _verify_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(69835);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_cli_context_js__WEBPACK_IMPORTED_MODULE_0__]);
_cli_context_js__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];





/** Run a skill against a local git diff using Warden's normal analysis pipeline. */
async function runLocalSkill(options) {
    const { skillPath, base, head, cwd, defaultBranch, staged, ...runnerOptions } = options;
    const context = buildLocalEventContext({
        base,
        head,
        cwd,
        defaultBranch,
        staged,
    });
    const skillRoot = isPathLike(skillPath) ? cwd ?? process.cwd() : context.repoPath;
    const skill = await resolveSkillAsync(skillPath, skillRoot);
    const report = await runSkill(skill, context, runnerOptions);
    return { skill, context, report };
}
/** Verify candidate findings against a local repository using Warden's verifier. */
async function verifyLocalFindings(options) {
    const { skillPath, findings, repoPath, ...verifyOptions } = options;
    const skill = await resolveSkillAsync(skillPath, repoPath);
    const result = await verifyFindings(findings, {
        ...verifyOptions,
        repoPath,
        skill,
    });
    return { skill, ...result };
}

__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 88802:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  y: () => (/* binding */ postProcessFindings)
});

// EXTERNAL MODULE: ./src/sentry.ts
var sentry = __webpack_require__(30340);
// EXTERNAL MODULE: ./src/sdk/extract.ts
var extract = __webpack_require__(29709);
// EXTERNAL MODULE: external "node:fs"
var external_node_fs_ = __webpack_require__(73024);
// EXTERNAL MODULE: external "node:path"
var external_node_path_ = __webpack_require__(76760);
// EXTERNAL MODULE: ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/schemas.js + 2 modules
var schemas = __webpack_require__(53391);
// EXTERNAL MODULE: ./src/diff/parser.ts
var parser = __webpack_require__(61100);
// EXTERNAL MODULE: ./src/diff/apply.ts
var apply = __webpack_require__(63779);
// EXTERNAL MODULE: ./src/sdk/runtimes/index.ts + 1 modules
var runtimes = __webpack_require__(23473);
// EXTERNAL MODULE: ./src/sdk/usage.ts
var sdk_usage = __webpack_require__(44759);
// EXTERNAL MODULE: ./src/sdk/prompt-sections.ts
var prompt_sections = __webpack_require__(49893);
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
    const hunks = (0,parser/* parsePatch */.iz)(diff);
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
    const hunks = (0,parser/* parsePatch */.iz)(diff);
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
        const patchedContent = (0,apply/* applyDiffToContent */.s)(fileContent, diff);
        return { pass: true, fileContent, patchedContent };
    }
    catch {
        return { pass: false };
    }
}
const SemanticFixVerdictSchema = schemas/* object */.Ik({
    verdict: schemas/* enum */.k5(['pass', 'fail']),
    reason: schemas/* string */.Yj().min(1),
});
async function runSemanticGate(finding, fileContent, patchedContent, options) {
    const { apiKey, runtime, model, maxRetries } = options;
    if (!(0,extract/* canUseRuntimeAuth */.ad)(options)) {
        return { verdict: 'unavailable' };
    }
    const originalForPrompt = fileContent.slice(0, SEMANTIC_PROMPT_MAX_CHARS);
    const patchedForPrompt = patchedContent.slice(0, SEMANTIC_PROMPT_MAX_CHARS);
    const prompt = (0,prompt_sections/* joinPromptSections */.hZ)([
        `<task>
Judge whether this suggested code fix is valid.
</task>`,
        `<fix_quality_rule>
Pass only if the diff clearly addresses the stated issue without obvious regressions in the shown code.
</fix_quality_rule>`,
        (0,prompt_sections/* buildTaggedSection */.sG)('issue', [
            `<title>${finding.title}</title>`,
            `<description>${finding.description}</description>`,
        ]),
        (0,prompt_sections/* buildTaggedSection */.sG)('original_file', originalForPrompt),
        (0,prompt_sections/* buildTaggedSection */.sG)('patched_file', patchedForPrompt),
        (0,prompt_sections/* buildTaggedSection */.sG)('suggested_diff', finding.suggestedFix?.diff ?? ''),
        (0,prompt_sections/* buildJsonOutputSection */.j2)('{"verdict":"pass|fail","reason":"..."}'),
    ]);
    const result = await (0,runtimes/* getRuntime */.fr)(runtime ?? 'claude').runAuxiliary({
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

// EXTERNAL MODULE: ./src/sdk/verify.ts
var verify = __webpack_require__(69835);
;// CONCATENATED MODULE: ./src/sdk/post-process.ts




/**
 * Run the shared post-analysis finding pipeline.
 */
async function postProcessFindings(findings, options) {
    const auxiliaryUsage = [];
    const uniqueFindings = (0,extract/* deduplicateFindings */.v9)(findings, options.onFindingProcessing);
    (0,sentry/* emitDedupMetrics */.Zn)(options.skill.name, findings.length, uniqueFindings.length);
    let currentFindings = uniqueFindings;
    if (options.verifyFindings !== false) {
        const verification = await (0,verify/* verifyFindings */.q)(currentFindings, {
            repoPath: options.repoPath,
            skill: options.skill,
            apiKey: options.apiKey,
            runtime: options.runtime,
            model: options.auxiliaryModel,
            maxTurns: options.maxTurns,
            reasoningEffort: options.reasoningEffort,
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
    const mergeResult = await (0,extract/* mergeCrossLocationFindings */.of)(currentFindings, {
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


/***/ }),

/***/ 15507:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   t: () => (/* binding */ prepareFiles)
/* harmony export */ });
/* unused harmony export groupHunksByFile */
/* harmony import */ var _diff_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(66325);

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
        const mode = (0,_diff_index_js__WEBPACK_IMPORTED_MODULE_0__/* .classifyFile */ .TX)(file.filename, chunking?.filePatterns);
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
        const diff = (0,_diff_index_js__WEBPACK_IMPORTED_MODULE_0__/* .parseFileDiff */ .jx)(file.filename, file.patch, status);
        // Skip files with no meaningful diff content (e.g., empty files)
        if (diff.hunks.length === 0 || diff.hunks.every((h) => h.newCount === 0 && h.oldCount === 0)) {
            skippedFiles.push({ filename: file.filename, reason: 'builtin' });
            continue;
        }
        // Split large hunks first (handles large files becoming single hunks)
        const splitHunks = (0,_diff_index_js__WEBPACK_IMPORTED_MODULE_0__/* .splitLargeHunks */ .PQ)(diff.hunks, {
            maxChunkSize: chunking?.coalesce?.maxChunkSize,
        });
        // Then coalesce nearby small ones if enabled (default: enabled)
        const coalesceEnabled = chunking?.coalesce?.enabled !== false;
        const hunks = coalesceEnabled
            ? (0,_diff_index_js__WEBPACK_IMPORTED_MODULE_0__/* .coalesceHunks */ .x$)(splitHunks, {
                maxGapLines: chunking?.coalesce?.maxGapLines,
                maxChunkSize: chunking?.coalesce?.maxChunkSize,
            })
            : splitHunks;
        const hunksWithContext = (0,_diff_index_js__WEBPACK_IMPORTED_MODULE_0__/* .expandDiffContext */ .ZC)(context.repoPath, { ...diff, hunks }, {
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


/***/ }),

/***/ 49893:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Dg: () => (/* binding */ buildPullRequestContextSection),
/* harmony export */   Oy: () => (/* binding */ buildFileListSection),
/* harmony export */   Pq: () => (/* binding */ buildChangedFilesSection),
/* harmony export */   hZ: () => (/* binding */ joinPromptSections),
/* harmony export */   j2: () => (/* binding */ buildJsonOutputSection),
/* harmony export */   kO: () => (/* binding */ formatIndexedFindingsForPrompt),
/* harmony export */   sG: () => (/* binding */ buildTaggedSection)
/* harmony export */ });
/* unused harmony export formatFindingForPrompt */
/* harmony import */ var _types_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(78481);

const MAX_BODY_LENGTH = 1000;
/**
 * Build a tagged prompt section, omitting empty content.
 */
function buildTaggedSection(tag, content) {
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
function joinPromptSections(sections) {
    return sections.filter((section) => Boolean(section)).join('\n\n');
}
/**
 * Build a tagged JSON-only output contract.
 */
function buildJsonOutputSection(instructions) {
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
    if (!prContext?.title && !prContext?.repository)
        return undefined;
    const lines = [];
    if (prContext.repository) {
        lines.push(`<repository>${prContext.repository}</repository>`);
    }
    if (prContext.title) {
        lines.push(`<title>${prContext.title}</title>`);
    }
    if (prContext.body) {
        const body = prContext.body.length > MAX_BODY_LENGTH
            ? `${prContext.body.slice(0, MAX_BODY_LENGTH)}...`
            : prContext.body;
        lines.push('<body>', body, '</body>');
    }
    return buildTaggedSection('pull_request_context', lines);
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
    return buildTaggedSection(tag, lines);
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
    return `${loc.path}:${(0,_types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .findingLine */ .mC)(finding)}`;
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


/***/ }),

/***/ 12204:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   _: () => (/* binding */ buildHunkUserPrompt),
/* harmony export */   q: () => (/* binding */ buildHunkSystemPrompt)
/* harmony export */ });
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(73024);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(76760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(node_path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _diff_index_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(66325);
/* harmony import */ var _prompt_sections_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(49893);




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
        `<evidence>
Before reporting a finding:
1. Read the relevant source code to understand the full context
2. Trace through the code path — follow imports, base classes, and indirect references, not just the immediate file
3. Verify your assumptions — confirm the issue exists, don't infer from incomplete information
4. Ensure the finding references lines within the hunk being analyzed
5. Document the evidence trace in the 'verification' field of each finding
</evidence>`,
        `<skill_instructions>
The following defines the ONLY criteria you should evaluate. Do not report findings outside this scope:

${skill.prompt}
</skill_instructions>`,
        (0,_prompt_sections_js__WEBPACK_IMPORTED_MODULE_3__/* .buildJsonOutputSection */ .j2)(`
Example response format:
{"findings": [{"id": "example-1", "severity": "medium", "confidence": "high", "title": "Issue title", "description": "Description", "location": {"path": "file.ts", "startLine": 10}, "verification": "- \`startRun()\` passes the changed value into \`finishRun()\`.\\n- The caller does not guard this case before calling \`startRun()\`."}]}

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
      "verification": "Required. Evidence for the public Evidence block. Write 2-5 short Markdown bullets tracing the concrete code path, guard, condition, or behavior that makes the finding real. Use function/file names when useful. Do not use checklist labels, generic reasoning, or restate the description.",
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
- Put the concrete evidence trace in "verification", not "description".
- Write "verification" as evidence, not reasoning: facts from the code path, guards, conditions, and observed behavior that make the finding believable.
- Do not format "verification" as any labeled checklist or template.
- Do not include severity, confidence, finding ID, skill name, or generic review framing in "description".
- Focus your analysis on the code changes in the hunk. Surrounding context and tool results are for understanding only -- all findings must reference lines within the hunk range.
`),
    ];
    const { rootDir } = skill;
    if (rootDir) {
        const resourceDirs = ['scripts', 'references', 'assets'].filter((dir) => (0,node_fs__WEBPACK_IMPORTED_MODULE_0__.existsSync)((0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(rootDir, dir)));
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
    return (0,_prompt_sections_js__WEBPACK_IMPORTED_MODULE_3__/* .joinPromptSections */ .hZ)([
        `<task>
Analyze this code change according to the "${skill.name}" skill criteria.
</task>`,
        (0,_prompt_sections_js__WEBPACK_IMPORTED_MODULE_3__/* .buildPullRequestContextSection */ .Dg)(prContext),
        (0,_prompt_sections_js__WEBPACK_IMPORTED_MODULE_3__/* .buildChangedFilesSection */ .Pq)(prContext, hunkCtx.filename),
        (0,_diff_index_js__WEBPACK_IMPORTED_MODULE_2__/* .formatHunkForAnalysis */ .xP)(hunkCtx),
        `<scope_reminder>
Only report findings that are explicitly covered by the skill instructions. Do not report general code quality issues, bugs, or improvements unless the skill specifically asks for them. Return an empty findings array if no issues match the skill's criteria.
</scope_reminder>`,
    ]);
}


/***/ }),

/***/ 79418:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   K: () => (/* binding */ buildFileReports)
/* harmony export */ });
/* unused harmony export findingAppliesToFile */
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


/***/ }),

/***/ 2022:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   cI: () => (/* binding */ DEFAULT_RETRY_CONFIG),
/* harmony export */   gE: () => (/* binding */ calculateRetryDelay),
/* harmony export */   yy: () => (/* binding */ sleep)
/* harmony export */ });
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


/***/ }),

/***/ 45452:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RL: () => (/* reexport safe */ _usage_js__WEBPACK_IMPORTED_MODULE_3__.RL),
/* harmony export */   Z$: () => (/* reexport safe */ _usage_js__WEBPACK_IMPORTED_MODULE_3__.Z$),
/* harmony export */   pd: () => (/* reexport safe */ _analyze_js__WEBPACK_IMPORTED_MODULE_11__.pd),
/* harmony export */   t9: () => (/* reexport safe */ _prepare_js__WEBPACK_IMPORTED_MODULE_8__.t),
/* harmony export */   ur: () => (/* reexport safe */ _analyze_js__WEBPACK_IMPORTED_MODULE_11__.ur),
/* harmony export */   xy: () => (/* reexport safe */ _analyze_js__WEBPACK_IMPORTED_MODULE_11__.xy),
/* harmony export */   yp: () => (/* reexport safe */ _post_process_js__WEBPACK_IMPORTED_MODULE_10__.y)
/* harmony export */ });
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(98229);
/* harmony import */ var _auth_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(30640);
/* harmony import */ var _retry_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2022);
/* harmony import */ var _usage_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(44759);
/* harmony import */ var _pricing_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(56260);
/* harmony import */ var _prompt_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(12204);
/* harmony import */ var _extract_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(29709);
/* harmony import */ var _json_output_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(81572);
/* harmony import */ var _prepare_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(15507);
/* harmony import */ var _verify_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(69835);
/* harmony import */ var _post_process_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(88802);
/* harmony import */ var _analyze_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(97712);
/* harmony import */ var _local_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(55623);
/* harmony import */ var _runtimes_index_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(23473);
var __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_local_js__WEBPACK_IMPORTED_MODULE_12__]);
_local_js__WEBPACK_IMPORTED_MODULE_12__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];
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


__webpack_async_result__();
} catch(e) { __webpack_async_result__(e); } });

/***/ }),

/***/ 23473:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  fr: () => (/* binding */ getRuntime),
  g_: () => (/* binding */ getRuntimeProviderOptions)
});

// UNUSED EXPORTS: claudeRuntime, piRuntime

// EXTERNAL MODULE: ../../node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.3.150_@anthropic-ai+sdk@0.98.0_zod@4.4.3__@modelcontex_bc53b174e3beaf638722df76729d2dd2/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs
var sdk = __webpack_require__(21056);
// EXTERNAL MODULE: ./src/sentry.ts
var sentry = __webpack_require__(30340);
// EXTERNAL MODULE: ./src/sdk/haiku.ts
var haiku = __webpack_require__(39026);
// EXTERNAL MODULE: ./src/sdk/otel.ts
var otel = __webpack_require__(85884);
// EXTERNAL MODULE: ./src/sdk/pricing.ts + 1 modules
var pricing = __webpack_require__(56260);
// EXTERNAL MODULE: ./src/sdk/usage.ts
var sdk_usage = __webpack_require__(44759);
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
function reasoningOptions(reasoningEffort) {
    if (!reasoningEffort) {
        return {};
    }
    if (reasoningEffort === 'off') {
        return { thinking: { type: 'disabled' } };
    }
    return { thinking: { type: 'adaptive' }, effort: reasoningEffort };
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
    return (0,pricing/* apiUsageToStats */.Y4)(turn.model, {
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
        (0,pricing/* apiUsageToStats */.Y4)(responseModel, {
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
        const { maxTurns = 50, model, reasoningEffort, abortController } = options;
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
                    ...reasoningOptions(reasoningEffort),
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
var pi = __webpack_require__(19113);
;// CONCATENATED MODULE: ./src/sdk/runtimes/index.ts


const RUNTIMES = {
    claude: claudeRuntime,
    pi: pi.piRuntime,
};


/** Return the runtime adapter for model-backed execution. */
function getRuntime(name = 'pi') {
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


/***/ }),

/***/ 88973:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   f: () => (/* binding */ DEFAULT_FILE_CONCURRENCY),
/* harmony export */   j: () => (/* binding */ LARGE_PROMPT_THRESHOLD_CHARS)
/* harmony export */ });
/** Default concurrency for file-level parallel processing (standalone SDK usage only) */
const DEFAULT_FILE_CONCURRENCY = 5;
/** Threshold in characters above which to warn about large prompts (~25k tokens) */
const LARGE_PROMPT_THRESHOLD_CHARS = 100000;


/***/ }),

/***/ 69835:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   q: () => (/* binding */ verifyFindings)
/* harmony export */ });
/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(53391);
/* harmony import */ var _types_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(78481);
/* harmony import */ var _usage_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(44759);
/* harmony import */ var _extract_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(29709);
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(98229);
/* harmony import */ var _runtimes_index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(23473);
/* harmony import */ var _utils_index_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(36137);
/* harmony import */ var _prompt_sections_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(49893);








const VerificationVerdictSchema = zod__WEBPACK_IMPORTED_MODULE_6__/* .object */ .Ik({
    verdict: zod__WEBPACK_IMPORTED_MODULE_6__/* ["enum"] */ .k5(['keep', 'revise', 'reject']),
    finding: _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .FindingSchema */ .p_.nullish(),
    reason: zod__WEBPACK_IMPORTED_MODULE_6__/* .string */ .Yj().optional(),
});
const JSON_OBJECT_START = /\{/g;
const VERIFICATION_CONCURRENCY = 4;
function isAbortRequested(error, abortController) {
    return (abortController?.signal.aborted ?? false) || (0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .classifyError */ .fe)(error).code === 'aborted';
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
- Revise findings when the issue is real but the severity, confidence, title, description, or evidence trace needs a narrower scope.
- Reject findings when the path is mitigated, unreachable, intentional, outside skill scope, or lacks a concrete code-level violation of the skill criteria.
- Do not reject solely because broader repository invariants or caller behavior are incomplete in the inspected context. If the changed code shows a concrete source, boundary, and sink with no verified mitigation, keep or revise the finding.
- When reachability or impact is plausible but not fully proven, keep the finding and revise severity, confidence, or scope instead of rejecting it.
</verification_stance>

<evidence>
For revised findings, write the "verification" field as evidence for the public Evidence block: 2-5 short Markdown bullets tracing the concrete code path, guard, condition, or behavior that makes the finding real. Use function/file names when useful. Do not use checklist labels, generic reasoning, or restate the description.
</evidence>

${(0,_prompt_sections_js__WEBPACK_IMPORTED_MODULE_5__/* .buildJsonOutputSection */ .j2)(`
{"verdict":"keep|revise|reject","finding":{...},"reason":"short reason"}

Use "finding" only for verdict "revise". For revised findings, return the complete Warden finding object and keep the original id.
`)}`;
}
function buildVerificationUserPrompt(finding, prContext) {
    return (0,_prompt_sections_js__WEBPACK_IMPORTED_MODULE_5__/* .joinPromptSections */ .hZ)([
        (0,_prompt_sections_js__WEBPACK_IMPORTED_MODULE_5__/* .buildPullRequestContextSection */ .Dg)(prContext),
        (0,_prompt_sections_js__WEBPACK_IMPORTED_MODULE_5__/* .buildChangedFilesSection */ .Pq)(prContext, finding.location?.path),
        (0,_prompt_sections_js__WEBPACK_IMPORTED_MODULE_5__/* .buildTaggedSection */ .sG)('candidate_finding', JSON.stringify(finding, null, 2)),
        `<task>
Verify this candidate. Return keep, revise, or reject.
</task>`,
    ]);
}
function parseVerificationVerdict(text) {
    for (const match of text.matchAll(JSON_OBJECT_START)) {
        if (match.index === undefined)
            continue;
        const json = (0,_extract_js__WEBPACK_IMPORTED_MODULE_1__/* .extractBalancedJson */ .YB)(text, match.index);
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
    const result = _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .FindingSchema */ .p_.safeParse(revised);
    return result.success ? result.data : finding;
}
function throwIfAuthenticationFailure(authError, result, runtime) {
    if (authError) {
        throw new _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .WardenAuthenticationError */ .Aq(authError, { runtime });
    }
    if (!result)
        return;
    const authMessage = result.errors.find(_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .isAuthenticationErrorMessage */ .Ip);
    if (result.status === 'auth_error') {
        throw new _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .WardenAuthenticationError */ .Aq(authMessage, { runtime });
    }
    if (authMessage) {
        throw new _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .WardenAuthenticationError */ .Aq(authMessage, { runtime });
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
    const runtime = (0,_runtimes_index_js__WEBPACK_IMPORTED_MODULE_3__/* .getRuntime */ .fr)(runtimeName);
    const systemPrompt = buildVerificationSystemPrompt(options.skill);
    const results = await (0,_utils_index_js__WEBPACK_IMPORTED_MODULE_4__/* .runPool */ .kD)(findings, VERIFICATION_CONCURRENCY, async (finding) => {
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
                    reasoningEffort: options.reasoningEffort,
                    abortController: options.abortController,
                },
                tools: options.skill.tools,
                providerOptions: (0,_runtimes_index_js__WEBPACK_IMPORTED_MODULE_3__/* .getRuntimeProviderOptions */ .g_)(runtimeName, {
                    pathToClaudeCodeExecutable: options.pathToClaudeCodeExecutable,
                }),
            });
            throwIfAuthenticationFailure(authError, result, runtimeName);
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
            if (error instanceof _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .WardenAuthenticationError */ .Aq) {
                throw error;
            }
            if ((0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .isSubprocessError */ .mu)(error)) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .WardenAuthenticationError */ .Aq(`Claude Code subprocess failed (${errorMessage}).\n` +
                    `This usually means the claude CLI cannot run in this environment.`, { cause: error });
            }
            if ((0,_errors_js__WEBPACK_IMPORTED_MODULE_2__/* .isAuthenticationError */ .HD)(error)) {
                throw new _errors_js__WEBPACK_IMPORTED_MODULE_2__/* .WardenAuthenticationError */ .Aq(undefined, { runtime: runtimeName, cause: error });
            }
            return { finding };
        }
    });
    const verified = results.flatMap((result) => result.finding ? [result.finding] : []);
    const usage = results.map((result) => result.usage).filter((u) => u !== undefined);
    return {
        findings: verified,
        usage: usage.length > 0 ? (0,_usage_js__WEBPACK_IMPORTED_MODULE_7__/* .aggregateUsage */ .Z$)(usage) : undefined,
    };
}


/***/ }),

/***/ 34691:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Cy: () => (/* binding */ resolveSkillAsync),
/* harmony export */   OB: () => (/* binding */ isBuiltinSkillName),
/* harmony export */   hl: () => (/* binding */ loadSkillFromMarkdown),
/* harmony export */   qA: () => (/* binding */ AGENT_MARKER_FILE),
/* harmony export */   vN: () => (/* binding */ SkillLoaderError)
/* harmony export */ });
/* unused harmony exports SKILL_DIRECTORIES, BUILTIN_SKILL_DIRECTORIES, BUILTIN_SKILL_NAMES, AGENT_DIRECTORIES, resolveSkillPath, resolvePackageRootCandidates, clearSkillsCache, loadSkillFromFile, loadSkillsFromDirectory, discoverAllSkills, discoverAllAgents, resolveAgentAsync */
/* harmony import */ var node_fs_promises__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(51455);
/* harmony import */ var node_fs_promises__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(node_fs_promises__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(76760);
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(node_path__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(73024);
/* harmony import */ var node_fs__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(node_fs__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var node_url__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(73136);
/* harmony import */ var node_url__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(node_url__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _sentry_dotagents_lib__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(9263);
/* harmony import */ var _utils_path_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(60702);






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
const BUILTIN_SKILL_NAMES = [
    'code-review',
    'security-review',
];
const BUILTIN_SKILL_NAME_SET = new Set(BUILTIN_SKILL_NAMES);
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
 * Resolve likely package roots from source, compiled package, or ncc action bundle locations.
 */
function resolvePackageRootCandidates() {
    const __filename = (0,node_url__WEBPACK_IMPORTED_MODULE_3__.fileURLToPath)(import.meta.url);
    const moduleRoot = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)((0,node_path__WEBPACK_IMPORTED_MODULE_1__.dirname)(__filename), '..', '..');
    const candidates = [
        moduleRoot,
        (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(moduleRoot, 'packages', 'warden'),
        process.env['GITHUB_ACTION_PATH'] ? (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(process.env['GITHUB_ACTION_PATH'], 'packages', 'warden') : undefined,
        (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(process.cwd(), 'packages', 'warden'),
    ].filter((candidate) => candidate !== undefined);
    return [...new Set(candidates)];
}
function builtinSkillPath(root, name, dir, markerFile = 'SKILL.md') {
    const dirPath = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(root, dir);
    const markerPath = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(dirPath, name, markerFile);
    if ((0,node_fs__WEBPACK_IMPORTED_MODULE_2__.existsSync)(markerPath)) {
        return markerPath;
    }
    const mdPath = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.join)(dirPath, `${name}.md`);
    if ((0,node_fs__WEBPACK_IMPORTED_MODULE_2__.existsSync)(mdPath)) {
        return mdPath;
    }
    return undefined;
}
/**
 * Return true when a skill name resolves to a package-native built-in skill.
 */
function isBuiltinSkillName(name) {
    if ((0,_utils_path_js__WEBPACK_IMPORTED_MODULE_5__/* .isPathLike */ .RA)(name) || !BUILTIN_SKILL_NAME_SET.has(name)) {
        return false;
    }
    for (const root of resolvePackageRootCandidates()) {
        for (const dir of BUILTIN_SKILL_DIRECTORIES) {
            if (builtinSkillPath(root, name, dir)) {
                return true;
            }
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
async function loadSkillFromFile(filePath, options) {
    const ext = (0,node_path__WEBPACK_IMPORTED_MODULE_1__.extname)(filePath).toLowerCase();
    if (ext === '.md') {
        return loadSkillFromMarkdown(filePath, options);
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
    const result = new Map();
    for (const root of resolvePackageRootCandidates()) {
        for (const dir of BUILTIN_SKILL_DIRECTORIES) {
            for (const name of BUILTIN_SKILL_NAMES) {
                if (result.has(name)) {
                    continue;
                }
                const path = builtinSkillPath(root, name, dir);
                if (path) {
                    result.set(name, {
                        skill: await loadSkillFromFile(path, options),
                        directory: 'built-in',
                        path,
                    });
                }
            }
        }
    }
    return result;
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
        const { resolveRemoteSkill, resolveRemoteAgent } = await __webpack_require__.e(/* import() */ 733).then(__webpack_require__.bind(__webpack_require__, 80114));
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
        if (!BUILTIN_SKILL_NAME_SET.has(nameOrPath)) {
            throw new SkillLoaderError(`${config.label} not found: ${nameOrPath}`);
        }
        for (const root of resolvePackageRootCandidates()) {
            for (const dir of config.builtinDirectories) {
                const skillPath = builtinSkillPath(root, nameOrPath, dir, config.markerFile);
                if (skillPath) {
                    return loadSkillFromMarkdown(skillPath);
                }
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


/***/ }),

/***/ 49431:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Lb: () => (/* binding */ filterContextByPaths),
/* harmony export */   QW: () => (/* binding */ matchTrigger),
/* harmony export */   W9: () => (/* binding */ shouldFail),
/* harmony export */   jC: () => (/* binding */ countSeverity),
/* harmony export */   sB: () => (/* binding */ matchGlob),
/* harmony export */   tH: () => (/* binding */ countFindingsAtOrAbove)
/* harmony export */ });
/* unused harmony exports clearGlobCache, getGlobCacheSize */
/* harmony import */ var _types_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(78481);

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
function matchGlob(pattern, path) {
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
        const hasMatch = filenames.some((file) => pathPatterns.some((pattern) => matchGlob(pattern, file)));
        if (!hasMatch) {
            return false;
        }
    }
    if (ignorePatterns && filenames) {
        const allIgnored = filenames.every((file) => ignorePatterns.some((pattern) => matchGlob(pattern, file)));
        if (allIgnored) {
            return false;
        }
    }
    return true;
}
function matchPullRequestState(trigger, context) {
    const labels = context.pullRequest?.labels ?? [];
    const labelMatches = trigger.labels !== undefined &&
        trigger.labels.some((label) => labels.includes(label));
    const eventLabelMatches = trigger.labels !== undefined &&
        context.label !== undefined &&
        trigger.labels.includes(context.label);
    if (context.action === 'labeled' && trigger.labels !== undefined && !eventLabelMatches) {
        return false;
    }
    if (trigger.draft === undefined) {
        return trigger.labels === undefined || labelMatches;
    }
    const draftMatches = (context.pullRequest?.draft ?? false) === trigger.draft;
    return draftMatches || labelMatches;
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
        files = files.filter((f) => pathPatterns.some((pattern) => matchGlob(pattern, f.filename)));
    }
    if (ignorePatterns) {
        files = files.filter((f) => !ignorePatterns.some((pattern) => matchGlob(pattern, f.filename)));
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
            if (!matchPullRequestState(trigger, context)) {
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
    const threshold = _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[failOn];
    return report.findings.some((f) => _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[f.severity] <= threshold);
}
/**
 * Count findings at or above the given severity threshold.
 * Returns 0 if failOn is 'off' (disabled).
 */
function countFindingsAtOrAbove(report, failOn) {
    if (failOn === 'off')
        return 0;
    const threshold = _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[failOn];
    return report.findings.filter((f) => _types_index_js__WEBPACK_IMPORTED_MODULE_0__/* .SEVERITY_ORDER */ .B[f.severity] <= threshold).length;
}
/**
 * Count findings of a specific severity across multiple reports.
 */
function countSeverity(reports, severity) {
    return reports.reduce((count, report) => count + report.findings.filter((f) => f.severity === severity).length, 0);
}


/***/ })

};
